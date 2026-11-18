import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Share2,
  Calendar,
  LogOut,
  AlertCircle,
  Lock,
  TrendingUp,
  Camera,
  Trash2,
} from 'lucide-react';
import { Client, QueueEntry, TierRulesConfig } from '../types';
import { evaluateClientTier, DEFAULT_TIER_RULES } from '../services/tierEngine';
import { compressProfileImage, PROFILE_IMAGE_ACCEPT } from '../utils/imageResize';
import { Pagination } from './Pagination';

interface CustomerPortalViewProps {
  clients: Client[];
  queue: QueueEntry[];
  tierRules?: TierRulesConfig;
  initialClientId?: string | null;
  onLogout: () => void;
  onClientUpdateConsent?: (clientId: string, accepted: boolean) => void;
  onClientCreatePin?: (clientId: string, newPin: string) => void;
  onClientUpdateAvatar?: (clientId: string, avatarUrl?: string) => void;
}

const PAGE_SIZE = 10;

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  clients,
  queue,
  tierRules = DEFAULT_TIER_RULES,
  initialClientId,
  onLogout,
  onClientCreatePin,
  onClientUpdateAvatar,
}) => {
  const [loggedInClientId, setLoggedInClientId] = useState<string | null>(() => {
    if (!initialClientId) return null;
    const found = clients.find((c) => c.id === initialClientId);
    return found && !found.portalDisabled ? found.id : null;
  });
  const [isFirstTimeMode, setIsFirstTimeMode] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('+243 ');
  const [pinInput, setPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [dataConsent, setDataConsent] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [sessionsPage, setSessionsPage] = useState<number>(1);
  const [avatarError, setAvatarError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const liveClient = loggedInClientId ? clients.find((c) => c.id === loggedInClientId) || null : null;

  useEffect(() => {
    if (initialClientId) {
      const found = clients.find((c) => c.id === initialClientId);
      if (found && !found.portalDisabled) {
        setLoggedInClientId(found.id);
        setLoginError('');
      } else if (found?.portalDisabled) {
        setLoggedInClientId(null);
        setLoginError("Votre accès à l'Espace Client a été désactivé par l'administrateur.");
      }
    }
  }, [initialClientId]);

  useEffect(() => {
    if (liveClient?.portalDisabled) {
      setLoggedInClientId(null);
      setLoginError("Votre accès à l'Espace Client a été désactivé par l'administrateur.");
    }
  }, [liveClient?.portalDisabled]);

  // Vérifier si le client connecté est actuellement dans sa file d'attente (strictement ses infos)
  const activeQueueEntry = liveClient
    ? queue.find(
        (q) =>
          (q.clientId === liveClient.id || q.phone === liveClient.phone) &&
          (q.status === 'waiting' || q.status === 'called')
      )
    : null;

  const queuePosition = activeQueueEntry
    ? queue
        .filter((q) => q.status === 'waiting' || q.status === 'called')
        .findIndex((q) => q.id === activeQueueEntry.id) + 1
    : null;

  const tierEval = liveClient ? evaluateClientTier(liveClient, clients, tierRules) : null;

  const clientSessions = liveClient?.sessionsHistory || [];
  const paginatedSessions = clientSessions.slice((sessionsPage - 1) * PAGE_SIZE, sessionsPage * PAGE_SIZE);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!liveClient) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    try {
      const compressed = await compressProfileImage(file, 256, 0.82);
      onClientUpdateAvatar?.(liveClient.id, compressed);
    } catch (err: any) {
      setAvatarError(err?.message || 'Erreur lors du traitement de la photo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20';
      case 'FIDELE':
        return 'bg-slate-300 text-slate-900 font-bold border border-slate-200';
      case 'REGULIER':
        return 'bg-slate-700 text-slate-200 font-semibold';
      case 'NOUVEAU':
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  const handleLogoutClient = () => {
    setLoggedInClientId(null);
    setPinInput('');
    setConfirmPinInput('');
    setLoginError('');
    onLogout();
  };

  return (
    <div className="w-full space-y-5 animate-fade-in">
      {!liveClient ? (
        /* Écran de connexion client strict (aucun compte démo d'autres clients exposé) */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md mx-auto space-y-6 shadow-2xl">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-gaming font-black uppercase tracking-[0.1em] text-white">
              Espace Joueur GOZA
            </h2>
            <p className="text-xs text-slate-400">
              Consultez uniquement vos points, votre rang et votre position personnelle en file d&apos;attente.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Onglets Connexion / Première Connexion Guidée */}
          <div className="flex border-b border-slate-800 gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                setIsFirstTimeMode(false);
                setLoginError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                !isFirstTimeMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/40'
              }`}
            >
              Déjà un compte
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFirstTimeMode(true);
                setLoginError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                isFirstTimeMode
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white bg-slate-800/40'
              }`}
            >
              1ère Connexion (Nouveau)
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isLocked) return;

              const cleanInput = phoneInput.trim().replace(/[\s\-\.\(\)]/g, '');
              const client = clients.find((c) => {
                const cleanDB = c.phone.replace(/[\s\-\.\(\)]/g, '');
                return (
                  cleanDB === cleanInput ||
                  (cleanInput.length >= 9 && cleanDB.endsWith(cleanInput.slice(-9))) ||
                  (cleanDB.length >= 9 && cleanInput.endsWith(cleanDB.slice(-9)))
                );
              });

              if (client?.portalDisabled) {
                setLoginError("Votre accès à l'Espace Client a été désactivé par l'administrateur.");
                return;
              }

              if (isFirstTimeMode) {
                if (pinInput.trim().length !== 4) {
                  setLoginError('Le code PIN doit comporter exactement 4 chiffres.');
                  return;
                }
                if (pinInput.trim() !== confirmPinInput.trim()) {
                  setLoginError('Les deux codes PIN saisis ne correspondent pas.');
                  return;
                }

                if (client) {
                  if (onClientCreatePin) {
                    onClientCreatePin(client.id, pinInput.trim());
                  }
                  setLoggedInClientId(client.id);
                  setLoginError('');
                  setPinInput('');
                  setConfirmPinInput('');
                } else {
                  setLoginError(
                    "Numéro non trouvé. Veuillez vous inscrire d'abord auprès du caissier à l'accueil."
                  );
                }
                return;
              }

              // Connexion standard stricte (aucun contournement PIN)
              if (client) {
                const requiredPin = client.pin || '1234';
                if (pinInput.trim() === requiredPin) {
                  setLoggedInClientId(client.id);
                  setLoginError('');
                  setFailedAttempts(0);
                  setPinInput('');
                } else {
                  const nextFail = failedAttempts + 1;
                  setFailedAttempts(nextFail);
                  setPinInput('');
                  if (nextFail >= 5) {
                    setIsLocked(true);
                    setLoginError(
                      'Sécurité anti force-brute : 5 tentatives échouées. Accès temporairement verrouillé.'
                    );
                  } else {
                    setLoginError(`Code PIN incorrect (${nextFail}/5 tentatives).`);
                  }
                }
              } else {
                setLoginError(
                  'Numéro de téléphone introuvable. Utilisez "1ère Connexion" ou inscrivez-vous à l\'accueil.'
                );
              }
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Votre Numéro de Téléphone (RDC) :</label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+243 89 545 7097"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                {isFirstTimeMode ? 'Créer votre Code PIN Secret (4 chiffres) :' : 'Code PIN Personnel (4 chiffres) :'}
              </label>
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-sm tracking-widest text-center focus:outline-none focus:border-amber-500"
                required
              />
              {isFirstTimeMode && (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Choisissez 4 chiffres faciles à retenir.
                </span>
              )}
            </div>

            {isFirstTimeMode && (
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Confirmer le Code PIN (4 chiffres) :</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-sm tracking-widest text-center focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            )}

            {/* Consentement RGPD / Données personnelles */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="consent-check"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0 mt-0.5 cursor-pointer"
                required
              />
              <label htmlFor="consent-check" className="text-[11px] text-slate-400 leading-tight cursor-pointer">
                J&apos;accepte l&apos;utilisation de mon numéro de téléphone à des fins exclusives de gestion de mon compte de fidélité.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLocked || !dataConsent}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black disabled:opacity-30 rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isFirstTimeMode ? 'Créer mon PIN & Ouvrir mon Espace' : 'Accéder à mon Espace Joueur'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* Tableau de bord client connecté — STRICTEMENT ses propres informations */
        <div className="space-y-5">
          {/* Bannière Profil Joueur + Photo de profil */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="relative shrink-0">
                {liveClient.avatarUrl ? (
                  <img
                    src={liveClient.avatarUrl}
                    alt={liveClient.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/70 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
                    {liveClient.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white tracking-tight">{liveClient.fullName}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${getTierBadgeStyle(
                      liveClient.tier
                    )}`}
                  >
                    {liveClient.tier}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center justify-center sm:justify-start gap-2">
                  <span>Code : {liveClient.clientCode}</span>
                  <span>·</span>
                  <span>{liveClient.phone}</span>
                </div>
                {onClientUpdateAvatar && (
                  <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={PROFILE_IMAGE_ACCEPT}
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{liveClient.avatarUrl ? 'Changer photo' : 'Ajouter photo'}</span>
                    </button>
                    {liveClient.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => onClientUpdateAvatar(liveClient.id, undefined)}
                        className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-700/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <span className="text-[10px] text-slate-500">JPG, PNG, WebP, GIF, AVIF, BMP, SVG…</span>
                  </div>
                )}
                {avatarError && <div className="text-[11px] text-rose-400 mt-1">{avatarError}</div>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogoutClient}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-rose-500/40 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>

          {/* Bannière File d'Attente Personnelle (strictement sa position) */}
          {activeQueueEntry && (
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-base flex items-center justify-center font-mono shrink-0">
                  #{queuePosition}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200">Vous êtes en file d&apos;attente !</h3>
                  <p className="text-xs text-slate-300">
                    Console souhaitée : {activeQueueEntry.desiredStationType} · Durée :{' '}
                    {activeQueueEntry.desiredDurationMinutes} min
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-amber-300 block">Statut :</span>
                <span className="font-bold text-xs text-white">
                  {activeQueueEntry.status === 'called' ? "📢 APPELÉ À L'ACCUEIL !" : 'En attente au salon'}
                </span>
              </div>
            </div>
          )}

          {/* Période de grâce avant rétrogradation */}
          {tierEval?.inGracePeriod && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Période de grâce active :</strong> Il vous reste{' '}
                <strong>{tierEval.gracePeriodDaysRemaining} jours</strong> pour accomplir les sessions requises et conserver votre statut{' '}
                <strong>{liveClient.tier}</strong>.
              </span>
            </div>
          )}

          {/* Cartes KPI Soldes & Avantages (AUCUN temps de jeu total ni montant encaissé) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-400">Solde Points Fidélité</span>
              <div className="text-2xl font-bold font-mono text-amber-400">{liveClient.loyaltyPoints} pts</div>
              <p className="text-[11px] text-slate-500">
                Valable pour convertir en sessions gratuites à la caisse
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-400">Temps Gratuit Disponible</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">{liveClient.freeMinutesBalance} min</div>
              <p className="text-[11px] text-slate-500">Crédit de jeu offert cumulé</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-400">Avantages Rang {liveClient.tier}</span>
              <div className="text-sm font-bold text-cyan-400 mt-1">
                Multiplicateur x{tierRules.perks[liveClient.tier].pointMultiplier} · Remise{' '}
                {tierRules.perks[liveClient.tier].discountPercent}%
              </div>
              <p className="text-[11px] text-slate-500">{tierRules.perks[liveClient.tier].otherBenefits}</p>
            </div>
          </div>

          {/* Progression vers le Statut Suivant */}
          {tierEval && tierEval.nextTier && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Progression vers le statut {tierEval.nextTier}</span>
                </span>
                <span className="font-mono font-bold text-blue-400">{tierEval.progressPercent}%</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${tierEval.progressPercent}%` }}
                />
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 text-xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">
                  Objectifs à atteindre sur 90 jours :
                </span>
                {tierEval.missingCriteria.map((crit, idx) => (
                  <div key={idx} className="text-slate-300 flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{crit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parrainage */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Votre Code de Parrainage</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400">
                +{liveClient.totalReferralBonusPoints} pts gagnés
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block">Partagez ce code avec vos amis joueurs :</span>
                <span className="font-mono font-black text-xl text-cyan-400">{liveClient.referralCode}</span>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Rejoins-moi chez GOZA avec mon code parrain ${liveClient.referralCode} pour recevoir des points de fidélité !`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition whitespace-nowrap"
              >
                Partager sur WhatsApp
              </a>
            </div>
          </div>

          {/* Historique personnel des Sessions (sans totaux financiers ni temps cumulé) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-800 font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Vos Dernières Sessions ({clientSessions.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-800/80 text-slate-400 font-sans border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Console</th>
                    <th className="py-2.5 px-4">Durée</th>
                    <th className="py-2.5 px-4 text-right">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedSessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                        Aucune session enregistrée pour votre compte.
                      </td>
                    </tr>
                  ) : (
                    paginatedSessions.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-4 text-slate-400">
                          {new Date(s.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2 px-4 text-cyan-400 font-bold">{s.stationType}</td>
                        <td className="py-2 px-4 text-slate-200">{s.durationMinutes} min</td>
                        <td className="py-2 px-4 text-right font-sans text-slate-300">
                          {s.isPaidSession ? 'Session standard' : 'Points fidélité'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={sessionsPage}
              totalItems={clientSessions.length}
              pageSize={PAGE_SIZE}
              onPageChange={setSessionsPage}
              itemLabel="sessions"
            />
          </div>
        </div>
      )}
    </div>
  );
};
