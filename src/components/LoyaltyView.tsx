import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Gift,
  PlusCircle,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Search,
  Sliders,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  Client,
  LoyaltyTransaction,
  LoyaltyTier,
  SystemSettings,
  TierRulesConfig,
  TierHistoryEntry,
  StaffRole,
  Ticket,
} from '../types';
import { evaluateClientTier, DEFAULT_TIER_RULES } from '../services/tierEngine';
import {
  MINIMUM_REGISTRATION_TICKET_MINUTES,
  normalizeReferralCodeInput,
  isValidReferralCodeFormat,
  findQualifying3HTicket,
} from '../services/referralCode';
import { QRCodeSVG } from './QRCodeSVG';
import { Pagination } from './Pagination';

interface LoyaltyViewProps {
  clients: Client[];
  tickets?: Ticket[];
  transactions: LoyaltyTransaction[];
  tierHistory: TierHistoryEntry[];
  settings: SystemSettings;
  tierRules?: TierRulesConfig;
  currentRole: StaffRole;
  onOpenTierSettings?: () => void;
  onAddClient: (
    newClient: Omit<
      Client,
      | 'id'
      | 'clientCode'
      | 'loyaltyPoints'
      | 'freeMinutesBalance'
      | 'totalPlayMinutes'
      | 'totalSpentCDF'
      | 'totalSpentUSD'
      | 'tier'
      | 'referralCode'
      | 'referralCount'
      | 'totalReferralBonusPoints'
      | 'createdAt'
      | 'sessionsHistory'
      | 'dataConsentAccepted'
      | 'failedLoginAttempts'
      | 'pin'
    >,
    sponsorCode?: string,
    qualifyingTicketNumber?: string
  ) => { success: boolean; message: string };
  onConvertPoints: (clientId: string, pointsSpent: number, freeMinutes: number, stationType: 'PS4' | 'PS5') => void;
  onToggleClientPortal?: (clientId: string, disabled: boolean, reason?: string) => void;
}

const PAGE_SIZE = 10;

export const LoyaltyView: React.FC<LoyaltyViewProps> = ({
  clients,
  tickets = [],
  transactions,
  tierHistory,
  settings,
  tierRules = DEFAULT_TIER_RULES,
  currentRole,
  onOpenTierSettings,
  onAddClient,
  onConvertPoints,
  onToggleClientPortal,
}) => {
  const [subTab, setSubTab] = useState<
    'clients' | 'tier_history' | 'referrals' | 'convert' | 'leaderboard' | 'points_history'
  >('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyNearPromotion, setOnlyNearPromotion] = useState<boolean>(false);
  const [selectedClientForCard, setSelectedClientForCard] = useState<Client | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination (10 éléments / lignes par page)
  const [clientsPage, setClientsPage] = useState(1);
  const [tierHistoryPage, setTierHistoryPage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [pointsPage, setPointsPage] = useState(1);

  // Modal d'inscription nouveau client
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+243 ');
  const [email, setEmail] = useState('');
  const [sponsorCode, setSponsorCode] = useState('');
  const [qualifyingTicketNumber, setQualifyingTicketNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Formulaire de conversion rapide
  const [convertClientId, setConvertClientId] = useState('');
  const [convertStationType, setConvertStationType] = useState<'PS4' | 'PS5'>('PS4');
  const [convertDuration, setConvertDuration] = useState<number>(15);

  const isAdmin = currentRole === 'ADMIN';

  // Évaluation de chaque client pour le filtrage
  const clientEvaluations = new Map(clients.map((c) => [c.id, evaluateClientTier(c, clients, tierRules)]));

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referralCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.tier === statusFilter;

    const evalResult = clientEvaluations.get(c.id);
    const matchesNearPromotion = !onlyNearPromotion || (evalResult?.isCloseToPromotion ?? false);

    return matchesSearch && matchesStatus && matchesNearPromotion;
  });

  useEffect(() => {
    setClientsPage(1);
  }, [searchTerm, statusFilter, onlyNearPromotion]);

  const paginatedClients = filteredClients.slice((clientsPage - 1) * PAGE_SIZE, clientsPage * PAGE_SIZE);
  const paginatedTierHistory = tierHistory.slice((tierHistoryPage - 1) * PAGE_SIZE, tierHistoryPage * PAGE_SIZE);
  const sortedLeaderboard = [...clients].sort((a, b) => b.totalPlayMinutes - a.totalPlayMinutes);
  const paginatedLeaderboard = sortedLeaderboard.slice(
    (leaderboardPage - 1) * PAGE_SIZE,
    leaderboardPage * PAGE_SIZE
  );
  const paginatedTransactions = transactions.slice((pointsPage - 1) * PAGE_SIZE, pointsPage * PAGE_SIZE);

  const getTierBadgeStyle = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'VIP':
        return 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20';
      case 'FIDELE':
        return 'bg-slate-300 text-slate-900 font-bold border border-slate-200';
      case 'REGULIER':
        return 'bg-slate-600 text-slate-100 font-semibold';
      case 'NOUVEAU':
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  const eligible3HTickets = tickets.filter(
    (t) =>
      t.durationMinutes >= MINIMUM_REGISTRATION_TICKET_MINUTES &&
      t.status !== 'refunded' &&
      t.status !== 'cancelled' &&
      !t.clientId
  );

  const handleRegisterClient = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || phone.trim().length < 8) {
      setErrorMessage('Veuillez renseigner un nom et un numéro de téléphone valide.');
      return;
    }

    const cleanSponsor = sponsorCode.trim().toUpperCase();
    if (cleanSponsor && !isValidReferralCodeFormat(cleanSponsor)) {
      setErrorMessage('Le code parrain doit comporter maximum 5 caractères (lettres et chiffres uniquement).');
      return;
    }

    const qualifying = findQualifying3HTicket(tickets, phone.trim(), qualifyingTicketNumber);
    if (!qualifying) {
      setErrorMessage(
        "Condition requise : un client ne peut être enregistré dans le système que s'il achète un ticket de 3H (180 min) minimum."
      );
      return;
    }

    const res = onAddClient(
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        whatsappConsent: true,
        whatsappConsentDate: Date.now(),
      },
      cleanSponsor || undefined,
      qualifying.ticketNumber
    );

    if (res.success) {
      setShowAddModal(false);
      setFullName('');
      setPhone('+243 ');
      setEmail('');
      setSponsorCode('');
      setQualifyingTicketNumber('');
      setFeedbackBanner({ type: 'success', text: res.message });
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleExecuteConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertClientId) return;

    const targetClient = clients.find((c) => c.id === convertClientId);
    if (!targetClient) return;

    const ratePer15Min = convertStationType === 'PS4' ? settings.pointsToMinutesPS4 : settings.pointsToMinutesPS5;
    const requiredPoints = (convertDuration / 15) * ratePer15Min;

    if (targetClient.loyaltyPoints < requiredPoints) {
      setFeedbackBanner({
        type: 'error',
        text: `Solde insuffisant : ${targetClient.loyaltyPoints} points disponibles, ${requiredPoints} requis.`,
      });
      return;
    }

    onConvertPoints(targetClient.id, requiredPoints, convertDuration, convertStationType);
    setFeedbackBanner({
      type: 'success',
      text: `Conversion réussie ! ${requiredPoints} points déduits pour ${targetClient.fullName}. ${convertDuration} minutes offertes sur ${convertStationType} créditées.`,
    });
  };

  return (
    <div className="space-y-4">
      {feedbackBanner && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sous-navigation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSubTab('clients')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              subTab === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Fichier Clients ({clients.length})
          </button>
          <button
            onClick={() => setSubTab('tier_history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              subTab === 'tier_history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Historique des Statuts ({tierHistory.length})
          </button>
          <button
            onClick={() => setSubTab('referrals')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              subTab === 'referrals' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Arbre de Parrainage
          </button>
          <button
            onClick={() => setSubTab('convert')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              subTab === 'convert' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Conversion Points
          </button>
          <button
            onClick={() => setSubTab('leaderboard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              subTab === 'leaderboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Classement
          </button>
          <button
            onClick={() => setSubTab('points_history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              subTab === 'points_history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Journal des Points
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTierSettings && isAdmin && (
            <button
              onClick={onOpenTierSettings}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Règles Statuts</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nouveau Joueur</span>
          </button>
        </div>
      </div>

      {/* Onglet 1 : Fichier Clients avec Temps de Jeu Total & Total Encaissé */}
      {subTab === 'clients' && (
        <div className="space-y-4">
          {/* Barre de recherche et filtres de statut */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, tél, code..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                {(['ALL', 'NOUVEAU', 'REGULIER', 'FIDELE', 'VIP'] as const).map((tierKey) => (
                  <button
                    key={tierKey}
                    onClick={() => setStatusFilter(tierKey)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      statusFilter === tierKey ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tierKey === 'ALL' ? 'Tous' : tierKey}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 text-amber-300 font-semibold cursor-pointer bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <input
                  type="checkbox"
                  checked={onlyNearPromotion}
                  onChange={(e) => setOnlyNearPromotion(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span>Proches de la promotion (&lt;10%)</span>
              </label>
            </div>
          </div>

          {/* Grille des cartes clients */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedClients.map((client) => {
              const evalRes = clientEvaluations.get(client.id);
              const hours = Math.floor(client.totalPlayMinutes / 60);
              const mins = client.totalPlayMinutes % 60;
              return (
                <div
                  key={client.id}
                  className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition space-y-3 ${
                    client.portalDisabled
                      ? 'border-rose-500/50 bg-rose-950/10'
                      : evalRes?.isCloseToPromotion
                      ? 'border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {client.avatarUrl ? (
                        <img
                          src={client.avatarUrl}
                          alt={client.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-cyan-400 shrink-0">
                          {client.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-sm truncate">{client.fullName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getTierBadgeStyle(
                              client.tier
                            )}`}
                          >
                            {client.tier}
                          </span>
                          {client.portalDisabled && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Espace Désactivé
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{client.phone}</div>
                        <div className="text-[10px] text-blue-400 font-mono mt-0.5">Code : {client.clientCode}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && onToggleClientPortal && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextDisabled = !client.portalDisabled;
                            onToggleClientPortal(
                              client.id,
                              nextDisabled,
                              nextDisabled ? "Désactivé manuellement par l'administrateur" : undefined
                            );
                            setFeedbackBanner({
                              type: 'success',
                              text: nextDisabled
                                ? `Espace client de ${client.fullName} désactivé.`
                                : `Espace client de ${client.fullName} réactivé.`,
                            });
                          }}
                          title={
                            client.portalDisabled
                              ? "Réactiver l'Espace Client de ce joueur"
                              : "Désactiver l'Espace Client de ce joueur"
                          }
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                            client.portalDisabled
                              ? 'bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40'
                              : 'bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-600/50'
                          }`}
                        >
                          {client.portalDisabled ? (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Activer Espace</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Désactiver Espace</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedClientForCard(client)}
                        title="Voir Carte & QR Code Client"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Jauge de progression vers statut suivant */}
                  {evalRes && evalRes.nextTier && (
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400 font-sans">Objectif {evalRes.nextTier} :</span>
                        <span className="font-bold text-cyan-400">{evalRes.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full rounded-full transition-all"
                          style={{ width: `${evalRes.progressPercent}%` }}
                        />
                      </div>
                      {evalRes.missingCriteria.length > 0 && (
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {evalRes.missingCriteria[0]}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Métriques Points, Temps de Jeu Total & Total Encaissé (visible par tout le personnel) */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-800/60 p-2.5 rounded-lg text-xs font-mono border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Points</span>
                      <span className="font-bold text-amber-400">{client.loyaltyPoints} pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Temps de jeu total</span>
                      <span className="font-bold text-cyan-300">
                        {hours}h {mins}m
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Total encaissé</span>
                      <span className="font-bold text-emerald-400 block">
                        {client.totalSpentCDF.toLocaleString()} FC
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        ${client.totalSpentUSD.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Filiation & Parrain */}
                  <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
                    <div>
                      <span>Parrainage : </span>
                      <span className="font-mono font-bold text-cyan-400">{client.referralCode}</span>
                    </div>
                    <span className="text-slate-500 font-mono">({client.referralCount} filleuls)</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
            <Pagination
              currentPage={clientsPage}
              totalItems={filteredClients.length}
              pageSize={PAGE_SIZE}
              onPageChange={setClientsPage}
              itemLabel="clients"
            />
          </div>
        </div>
      )}

      {/* Onglet 2 : Historique des Changements de Statut */}
      {subTab === 'tier_history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between font-bold text-white">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Historique d&apos;Évolution des Statuts Clients (Nouveau → Régulier → Fidèle → VIP)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-800/80 text-slate-400 font-sans border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Joueur</th>
                  <th className="py-2.5 px-4">Ancien Statut</th>
                  <th className="py-2.5 px-4">Nouveau Statut</th>
                  <th className="py-2.5 px-4">Motif / Déclencheur</th>
                  <th className="py-2.5 px-4">Attribué par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedTierHistory.map((th) => (
                  <tr key={th.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(th.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-bold text-white">{th.clientName}</td>
                    <td className="py-2.5 px-4 text-slate-400">{th.oldTier}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTierBadgeStyle(th.newTier)}`}>
                        {th.newTier}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">{th.reason}</td>
                    <td className="py-2.5 px-4 text-cyan-400 font-sans">{th.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={tierHistoryPage}
            totalItems={tierHistory.length}
            pageSize={PAGE_SIZE}
            onPageChange={setTierHistoryPage}
            itemLabel="évolutions"
          />
        </div>
      )}

      {/* Onglet 3 : Arbre de Parrainage */}
      {subTab === 'referrals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Réseau de Parrainage & Règles Anti-Fraude</span>
              </h3>
              <p className="text-xs text-slate-400">
                {settings.referralBonusSignup} pts à l&apos;inscription + {settings.referralBonusFirstPlay} pts 1re session +{' '}
                {settings.referralBonusPercentage}% récurrent.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Anti-Fraude Actif</span>
            </div>
          </div>

          <div className="space-y-3">
            {clients
              .filter((c) => c.referralCount > 0)
              .map((sponsor) => {
                const referrals = clients.filter((c) => c.referredById === sponsor.id);
                return (
                  <div
                    key={sponsor.id}
                    className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 font-bold text-xs flex items-center justify-center font-mono">
                          PAR
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm">{sponsor.fullName}</span>
                          <span className="text-xs text-cyan-400 font-mono ml-2">Code: {sponsor.referralCode}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-mono">
                        <span className="text-slate-400 font-sans">Gains parrainage : </span>
                        <span className="text-emerald-400 font-bold">+{sponsor.totalReferralBonusPoints} pts</span>
                      </div>
                    </div>

                    <div className="pl-6 border-l-2 border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Filleuls directs ({referrals.length}) :
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {referrals.map((child) => (
                          <div
                            key={child.id}
                            className="bg-slate-900 p-2.5 rounded-lg border border-slate-700/60 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-slate-200">{child.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{child.phone}</div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              {child.totalPlayMinutes}m jouées
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Onglet 4 : Conversion de Points */}
      {subTab === 'convert' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl mx-auto space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Convertir des Points en Temps de Jeu</h3>
            <p className="text-xs text-slate-400">
              Barème : {settings.pointsToMinutesPS4} pts = 15m sur PS4 · {settings.pointsToMinutesPS5} pts = 15m sur PS5
            </p>
          </div>

          <form onSubmit={handleExecuteConversion} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Sélectionner le joueur</label>
              <select
                value={convertClientId}
                onChange={(e) => setConvertClientId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Choisir un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.loyaltyPoints} points ({c.tier})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Type de Console</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertStationType('PS4')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      convertStationType === 'PS4'
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    PS4
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertStationType('PS5')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      convertStationType === 'PS5'
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    PS5 VIP
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Durée Gratuite</label>
                <select
                  value={convertDuration}
                  onChange={(e) => setConvertDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Heure</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>Valider la Conversion</span>
            </button>
          </form>
        </div>
      )}

      {/* Onglet 5 : Leaderboard */}
      {subTab === 'leaderboard' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span>Classement des Meilleurs Joueurs (Kinshasa)</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-800 font-mono text-xs px-5">
            {paginatedLeaderboard.map((c, idx) => {
              const globalRank = (leaderboardPage - 1) * PAGE_SIZE + idx + 1;
              return (
                <div key={c.id} className="py-3 flex items-center justify-between font-sans">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                        globalRank === 1
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : globalRank === 2
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : globalRank === 3
                          ? 'bg-amber-700 text-white font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{globalRank}
                    </span>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{c.fullName}</span>
                        <span className={`px-2 py-0.2 rounded text-[9px] uppercase font-bold ${getTierBadgeStyle(c.tier)}`}>
                          {c.tier}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.phone}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="font-bold text-slate-200">
                      {Math.floor(c.totalPlayMinutes / 60)}h {c.totalPlayMinutes % 60}m ·{' '}
                      <span className="text-emerald-400">{c.totalSpentCDF.toLocaleString()} FC</span>
                    </div>
                    <div className="text-[10px] text-amber-400 font-bold">{c.loyaltyPoints} points</div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={leaderboardPage}
            totalItems={sortedLeaderboard.length}
            pageSize={PAGE_SIZE}
            onPageChange={setLeaderboardPage}
            itemLabel="joueurs"
          />
        </div>
      )}

      {/* Onglet 6 : Journal des Points */}
      {subTab === 'points_history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Joueur</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-200">{tx.clientName}</td>
                    <td className="py-2.5 px-4 text-[10px] text-slate-400 uppercase">{tx.type}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">{tx.description}</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${tx.points >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.points >= 0 ? `+${tx.points}` : tx.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pointsPage}
            totalItems={transactions.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPointsPage}
            itemLabel="mouvements"
          />
        </div>
      )}

      {/* Modal QR Code Carte Client */}
      {selectedClientForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
            <div className="space-y-1">
              <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${getTierBadgeStyle(selectedClientForCard.tier)}`}>
                Membre {selectedClientForCard.tier}
              </span>
              <h3 className="text-lg font-bold text-white">{selectedClientForCard.fullName}</h3>
              <p className="text-xs text-slate-400 font-mono">{selectedClientForCard.phone}</p>
            </div>

            <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
              <QRCodeSVG
                value={`KINHUB-CLIENT:${selectedClientForCard.clientCode}:${selectedClientForCard.phone}`}
                size={160}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs font-mono grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 font-sans block text-[10px]">Solde Points</span>
                <span className="text-amber-400 font-bold text-sm">{selectedClientForCard.loyaltyPoints} pts</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block text-[10px]">Code Parrainage</span>
                <span className="text-cyan-400 font-bold text-sm">{selectedClientForCard.referralCode}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedClientForCard(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Inscription Nouveau Joueur */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Inscrire un Nouveau Joueur</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const firstTicket = eligible3HTickets[0];
                  setFullName(
                    firstTicket && firstTicket.clientName && firstTicket.clientName !== 'Client de passage'
                      ? firstTicket.clientName
                      : 'Corneille Vumongo'
                  );
                  setPhone(firstTicket?.clientPhone || firstTicket?.payerPhone || '+243 89 545 7097');
                  setEmail('corneillevumongo@gmail.com');
                  setSponsorCode('GL243');
                  if (firstTicket) {
                    setQualifyingTicketNumber(firstTicket.ticketNumber);
                  }
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 font-semibold transition"
              >
                Remplir à ma place
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
              <strong>Condition obligatoire :</strong> un client ne peut être enregistré dans la base que s&apos;il a acheté un ticket d&apos;au moins <strong>3H (180 min)</strong>. Un message WhatsApp de bienvenue avec ses avantages et accès Espace Client sera envoyé dès validation.
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegisterClient} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Ticket 3H justificatif *</label>
                <select
                  value={qualifyingTicketNumber}
                  onChange={(e) => {
                    const num = e.target.value;
                    setQualifyingTicketNumber(num);
                    const picked = eligible3HTickets.find((t) => t.ticketNumber === num);
                    if (picked) {
                      if (picked.clientName && picked.clientName !== 'Client de passage' && !fullName.trim()) {
                        setFullName(picked.clientName);
                      }
                      const ticketPhone = picked.clientPhone || picked.payerPhone;
                      if (ticketPhone && phone.trim() === '+243') {
                        setPhone(ticketPhone);
                      }
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Correspondance automatique par téléphone ({eligible3HTickets.length} ticket(s) 3H disponibles) --</option>
                  {eligible3HTickets.map((t) => (
                    <option key={t.id} value={t.ticketNumber}>
                      {t.ticketNumber} · {(t.durationMinutes / 60).toFixed(1).replace('.0', '')}h ({t.stationType}) — {t.clientName} {t.clientPhone ? `(${t.clientPhone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Nom Complet *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Joel Mpiana"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Numéro de Téléphone WhatsApp * (RDC)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243 81 000 0000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email (optionnel)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joel@gmail.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Code Parrain (optionnel · max 5 car.)</label>
                <input
                  type="text"
                  maxLength={5}
                  value={sponsorCode}
                  onChange={(e) => setSponsorCode(normalizeReferralCodeInput(e.target.value))}
                  placeholder="Ex: GL243 ou FA243"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setErrorMessage('');
                  }}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
