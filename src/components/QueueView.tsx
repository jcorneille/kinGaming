import React, { useState } from 'react';
import {
  Users,
  Clock,
  UserPlus,
  Bell,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronRight,
  Tv,
  CalendarClock,
  Wifi,
  Search,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import {
  Client,
  PricingPlan,
  QueueEntry,
  QueuePriority,
  Reservation,
  Station,
  StationType,
  SystemSettings,
} from '../types';
import { CONSOLE_CATALOG, getConsoleLabel } from '../services/consoleCatalog';
import {
  computeLateDeduction,
  evaluateReservationTimeWindow,
  getWifiMaxDevicesForDuration,
} from '../services/wifiHotspotService';

interface QueueViewProps {
  queue: QueueEntry[];
  stations: Station[];
  clients?: Client[];
  pricingPlans?: PricingPlan[];
  settings?: SystemSettings;
  reservations?: Reservation[];
  onAddToQueue: (entry: Omit<QueueEntry, 'id' | 'arrivalTime' | 'status' | 'gracePeriodSeconds'>) => void;
  onCallClient: (entryId: string) => void;
  onAssignToStation: (entry: QueueEntry, stationId: number) => void;
  onRemoveFromQueue: (entryId: string, reason: 'no_show' | 'cancelled') => void;
  onSendWhatsAppDirect?: (entry: QueueEntry) => void;
  onValidateReservation?: (reservationId: string, stationId?: number | null, overrideEarly?: boolean) => void;
  onCancelReservation?: (reservationId: string) => void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  queue,
  stations,
  reservations = [],
  onAddToQueue,
  onCallClient,
  onAssignToStation,
  onRemoveFromQueue,
  onSendWhatsAppDirect,
  onValidateReservation,
  onCancelReservation,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('+243 ');
  const [desiredStationType, setDesiredStationType] = useState<StationType | 'ANY'>('ANY');
  const [desiredDurationMinutes, setDesiredDurationMinutes] = useState(30);
  const [priorityLevel, setPriorityLevel] = useState<QueuePriority>('NORMAL');

  // Recherche & validation au guichet par code de réservation (RES-XXXX)
  const [resCodeSearch, setResCodeSearch] = useState('');
  const [earlyOverrideIds, setEarlyOverrideIds] = useState<Record<string, boolean>>({});
  const [resLookupFeedback, setResLookupFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [openStationMenuKey, setOpenStationMenuKey] = useState<string | null>(null);

  // Filtrer les entrées en attente
  const waitingEntries = queue.filter((q) => q.status === 'waiting' || q.status === 'called');

  // Réservations payées via Mobile Money depuis l'Espace Client en attente de validation à l'accueil
  const pendingReservations = reservations.filter(
    (r) => r.status === 'PAID_WAITING_CHECKIN'
  );

  const normalizedCodeQuery = resCodeSearch.trim().toUpperCase();
  const displayedReservations = normalizedCodeQuery
    ? pendingReservations.filter(
        (r) =>
          r.reservationCode.toUpperCase().includes(normalizedCodeQuery) ||
          r.clientName.toLowerCase().includes(normalizedCodeQuery.toLowerCase()) ||
          r.clientPhone.includes(resCodeSearch.trim())
      )
    : pendingReservations;

  const handleLookupCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = resCodeSearch.trim().toUpperCase();
    if (!code) {
      setResLookupFeedback(null);
      return;
    }
    const found = reservations.find((r) => r.reservationCode.toUpperCase() === code);
    if (!found) {
      setResLookupFeedback({
        type: 'err',
        text: `Aucun dossier trouvé pour le code "${code}". Vérifiez le SMS/Portail du client.`,
      });
      return;
    }
    if (found.status === 'CANCELLED' || found.status === 'EXPIRED') {
      setResLookupFeedback({
        type: 'err',
        text: `La réservation ${found.reservationCode} (${found.clientName}) est ${found.status === 'CANCELLED' ? 'annulée' : 'expirée'}.`,
      });
      return;
    }
    if (found.status === 'VALIDATED_IN_QUEUE' || found.status === 'VALIDATED_ON_STATION') {
      setResLookupFeedback({
        type: 'ok',
        text: `Réservation ${found.reservationCode} (${found.clientName}) déjà validée${found.ticketNumber ? ` (Ticket ${found.ticketNumber}${found.wifiVoucher ? ` · Wi-Fi ${found.wifiVoucher.code}` : ''})` : ''}.`,
      });
      return;
    }
    setResLookupFeedback({
      type: 'ok',
      text: `Réservation ${found.reservationCode} trouvée pour ${found.clientName} (${found.durationMinutes / 60}h ${getConsoleLabel(found.stationType)}).`,
    });
  };

  // Calcul du temps d'attente estimé
  const calculateEstimatedWait = (entryType: StationType | 'ANY', indexInQueue: number): number => {
    const targetStations = stations.filter((s) => {
      if (entryType === 'ANY') return true;
      return s.type === entryType;
    });

    const freeStation = targetStations.some((s) => s.status === 'available');
    if (freeStation && indexInQueue === 0) return 0;

    const remainingTimes = targetStations
      .filter((s) => s.status === 'occupied')
      .map((s) => Math.ceil(s.remainingSeconds / 60))
      .sort((a, b) => a - b);

    if (remainingTimes.length === 0) return 5;
    const targetIndex = Math.min(indexInQueue, remainingTimes.length - 1);
    return Math.max(2, remainingTimes[targetIndex]);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    onAddToQueue({
      clientName: clientName.trim(),
      phone: phone.trim(),
      desiredStationType,
      desiredDurationMinutes,
      priorityLevel,
    });

    setClientName('');
    setPhone('+243 ');
    setShowAddForm(false);
  };

  const handleCall = (entry: QueueEntry) => {
    onCallClient(entry.id);
  };

  const availableStations = stations.filter((s) => s.status === 'available');

  return (
    <div className="space-y-4">
      {/* SECTION 1 : FILE DES RÉSERVÉS (PORTAIL CLIENT MOBILE MONEY 3H+ +15% · VALIDATION GUICHET) */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4 space-y-3.5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
                <span>File des Réservés &amp; Validation Accueil</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300">
                  {pendingReservations.length} en attente de validation
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Réservations effectuées par le client sur l&apos;Espace Client (Mobile Money &ge; 3h + 15%, annulation max 1h avant). Validez <strong className="text-cyan-300">RES-XXXX</strong> à l&apos;accueil : tout retard est déduit automatiquement du temps jouable.
              </p>
            </div>
          </div>

          <form onSubmit={handleLookupCode} className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={resCodeSearch}
                onChange={(e) => {
                  setResCodeSearch(e.target.value);
                  if (!e.target.value.trim()) setResLookupFeedback(null);
                }}
                placeholder="Code RES-XXXX ou nom..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
            >
              Vérifier
            </button>
          </form>
        </div>

        {resLookupFeedback && (
          <div
            className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
              resLookupFeedback.type === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            }`}
          >
            {resLookupFeedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{resLookupFeedback.text}</span>
          </div>
        )}

        {displayedReservations.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-4 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {normalizedCodeQuery
                ? `Aucune réservation en attente ne correspond à "${resCodeSearch}".`
                : "Aucune réservation Mobile Money en attente de validation à l'accueil."}
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedReservations.map((res) => {
              const win = evaluateReservationTimeWindow(res.reservedForTime);
              const lateCheck = computeLateDeduction(res.reservedForTime, res.durationMinutes);
              const wifiDeviceQuota = getWifiMaxDevicesForDuration(res.durationMinutes);
              const matchingFreeStations = availableStations.filter((s) => s.type === res.stationType);
              const rawFreeStations = matchingFreeStations.length > 0 ? matchingFreeStations : availableStations;
              const fallbackFreeStations = res.preferredStationId
                ? [...rawFreeStations].sort((a, b) =>
                    a.id === res.preferredStationId ? -1 : b.id === res.preferredStationId ? 1 : 0
                  )
                : rawFreeStations;
              const allowEarlyOverride = Boolean(earlyOverrideIds[res.id]);
              const canValidateNow = !lateCheck.isFullyExpired && (win.status !== 'EARLY' || allowEarlyOverride);

              return (
                <div
                  key={res.id}
                  className={`bg-slate-950/80 border rounded-xl p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${
                    lateCheck.isFullyExpired
                      ? 'border-rose-500/60'
                      : win.status === 'ON_TIME'
                      ? 'border-emerald-500/40'
                      : win.status === 'LATE'
                      ? 'border-amber-500/40'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-black text-xs">
                        {res.reservationCode}
                      </span>
                      <span className="font-bold text-sm text-white">{res.clientName}</span>
                      <span className="text-xs font-mono text-slate-400">{res.clientPhone}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        PAYÉ MOBILE MONEY (+{res.reservationFeePercent}%) · {res.totalAmountCDF.toLocaleString()} FC
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                        Wi-Fi {wifiDeviceQuota} app.
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <span className="font-semibold text-blue-300">
                        {getConsoleLabel(res.stationType)} · {res.durationMinutes / 60}h ({res.durationMinutes} min)
                      </span>
                      {res.preferredStationName && (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 text-[10px] font-bold">
                          Poste demandé : {res.preferredStationName}
                        </span>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Prévu : {new Date(res.reservedForTime).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lateCheck.isFullyExpired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : win.status === 'ON_TIME'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : win.status === 'EARLY'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {lateCheck.isFullyExpired
                          ? `Expirée (-${lateCheck.lostLateMinutes} min retard >= ${res.durationMinutes} min)`
                          : win.label}
                      </span>
                      {res.paymentReference && (
                        <span className="text-[11px] font-mono text-slate-400">
                          Réf: {res.paymentMethod} ({res.paymentReference})
                        </span>
                      )}
                    </div>

                    {lateCheck.lostLateMinutes > 0 && !lateCheck.isFullyExpired && (
                      <div className="text-[11px] text-amber-300 font-semibold">
                        Déduction automatique : -{lateCheck.lostLateMinutes} min de retard →{' '}
                        <strong className="text-white">{lateCheck.playableDurationMinutes} min jouables</strong> sur les {res.durationMinutes} min réservées.
                      </div>
                    )}

                    {win.status === 'EARLY' && (
                      <label className="inline-flex items-center gap-2 text-[11px] text-amber-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={allowEarlyOverride}
                          onChange={(e) =>
                            setEarlyOverrideIds((prev) => ({ ...prev, [res.id]: e.target.checked }))
                          }
                          className="rounded border-amber-500/50 bg-slate-900 text-amber-500"
                        />
                        <span>
                          Arrivée en avance ({Math.abs(win.diffMinutes)} min avant le créneau) — Autoriser la validation anticipée
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Actions Guichet */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onValidateReservation && (
                      <>
                        {fallbackFreeStations.length > 0 && (
                          <div className="relative group flex items-center">
                            <button
                              type="button"
                              disabled={!canValidateNow}
                              onClick={() => onValidateReservation(res.id, fallbackFreeStations[0].id, allowEarlyOverride)}
                              className={`px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition ${
                                fallbackFreeStations.length > 1 ? 'rounded-l-lg' : 'rounded-lg'
                              }`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Valider &amp; Poste {fallbackFreeStations[0].id}</span>
                            </button>
                            {fallbackFreeStations.length > 1 && (
                              <button
                                type="button"
                                disabled={!canValidateNow}
                                onClick={() =>
                                  setOpenStationMenuKey((prev) => (prev === `res-${res.id}` ? null : `res-${res.id}`))
                                }
                                title="Choisir un autre poste libre"
                                className="px-2 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-r-lg border-l border-emerald-500/40 cursor-pointer transition"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openStationMenuKey === `res-${res.id}` ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                            {fallbackFreeStations.length > 1 && canValidateNow && (
                              <div
                                className={`${
                                  openStationMenuKey === `res-${res.id}` ? 'block' : 'hidden group-hover:block'
                                } absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-30 min-w-[175px] space-y-1`}
                              >
                                <div className="text-[10px] text-slate-400 px-2 py-0.5 font-bold">
                                  Choisir le poste libre :
                                </div>
                                {fallbackFreeStations.map((st) => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => {
                                      setOpenStationMenuKey(null);
                                      onValidateReservation(res.id, st.id, allowEarlyOverride);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded hover:bg-emerald-600 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer"
                                  >
                                    <span>Poste {st.id}</span>
                                    <span className="text-[10px] font-mono text-cyan-300">{st.type}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={!canValidateNow}
                          onClick={() => onValidateReservation(res.id, null, allowEarlyOverride)}
                          title="Imprime le ticket + active le code Wi-Fi dès maintenant et place le joueur en file d'attente"
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow cursor-pointer transition"
                        >
                          <Wifi className="w-3.5 h-3.5" />
                          <span>Valider, Ticket &amp; File d&apos;attente</span>
                        </button>
                      </>
                    )}

                    {onCancelReservation && (
                      <button
                        type="button"
                        onClick={() => onCancelReservation(res.id)}
                        title="Annuler la réservation"
                        className="p-2 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2 : FILE D'ATTENTE INTERACTIVE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>File d&apos;Attente Interactive</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300">
                {waitingEntries.length} en attente
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Estimation automatique selon les temps restants · Les joueurs prépayés en file profitent déjà de leur Wi-Fi (1 à 4 appareils selon la durée payée)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter un joueur en attente</span>
        </button>
      </div>

      {/* Formulaire d'ajout rapide */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Nouveau Joueur en Liste d&apos;Attente
            </h3>
            <button
              type="button"
              onClick={() => {
                setClientName('Corneille Vumongo');
                setPhone('+243 89 545 7097');
                setDesiredStationType('PS5');
                setDesiredDurationMinutes(60);
                setPriorityLevel('VIP');
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-semibold transition"
            >
              Remplir à ma place
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nom du client *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Michel Bombele"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Téléphone (WhatsApp)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+243 81 000 0000"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Console souhaitée</label>
              <select
                value={desiredStationType}
                onChange={(e) => setDesiredStationType(e.target.value as StationType | 'ANY')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ANY">Peu importe (Premier libre)</option>
                {Array.from(new Set([...CONSOLE_CATALOG.map((c) => c.code), ...stations.map((s) => s.type)])).map((tp) => (
                  <option key={tp} value={tp}>
                    {getConsoleLabel(tp)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Durée voulue</label>
              <select
                value={desiredDurationMinutes}
                onChange={(e) => setDesiredDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 Heure</option>
                <option value={120}>2 Heures</option>
                <option value={180}>3 Heures (Forfait)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Priorité</label>
              <select
                value={priorityLevel}
                onChange={(e) => setPriorityLevel(e.target.value as QueuePriority)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="NORMAL">Standard</option>
                <option value="LOYAL">Client Fidèle (Prioritaire)</option>
                <option value="VIP">VIP / Tournoi</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow"
            >
              Enregistrer dans la file
            </button>
          </div>
        </form>
      )}

      {/* Liste des entrées */}
      <div className="space-y-2">
        {waitingEntries.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Aucun joueur en file d&apos;attente</p>
            <p className="text-xs text-slate-500">
              Des postes sont actuellement libres ou tous les joueurs sont installés.
            </p>
          </div>
        ) : (
          waitingEntries.map((entry, idx) => {
            const estimatedMins = calculateEstimatedWait(entry.desiredStationType, idx);
            const isCalled = entry.status === 'called';

            const cleanPhone = entry.phone.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
              `Bonjour ${entry.clientName}, votre poste de jeu est prêt chez GOZA ! Veuillez vous présenter à l'accueil.`
            )}`;

            return (
              <div
                key={entry.id}
                className={`bg-slate-900/90 border rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition ${
                  isCalled
                    ? 'border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : entry.prepaidTicketNumber
                    ? 'border-cyan-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Position & Identité */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-sm flex items-center justify-center shrink-0 ${
                      entry.priorityLevel === 'VIP'
                        ? 'bg-amber-500 text-slate-950'
                        : entry.priorityLevel === 'LOYAL'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{entry.clientName}</span>
                      {entry.priorityLevel === 'VIP' && (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded">
                          VIP
                        </span>
                      )}
                      {entry.priorityLevel === 'LOYAL' && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold rounded">
                          Fidèle
                        </span>
                      )}
                      {entry.reservationCode && (
                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold rounded">
                          Rés. {entry.reservationCode}
                        </span>
                      )}
                      {entry.prepaidTicketNumber && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold rounded">
                          Déjà payé · {entry.prepaidTicketNumber}
                        </span>
                      )}
                      {entry.wifiVoucher && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-mono font-bold rounded inline-flex items-center gap-1">
                          <Wifi className="w-2.5 h-2.5" />
                          {entry.wifiVoucher.code} ({entry.wifiVoucher.maxDevices} app.)
                        </span>
                      )}
                      {isCalled && (
                        <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full animate-bounce">
                          Appelé · Délai 3 min
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>{entry.phone}</span>
                      <span>·</span>
                      <span className="text-blue-400 font-sans font-semibold">
                        {entry.desiredStationType === 'ANY' ? 'Indifférent' : getConsoleLabel(entry.desiredStationType)} ({entry.desiredDurationMinutes}m)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Temps d'attente estimé */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Attente estimée :</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        estimatedMins === 0 ? 'text-emerald-400 font-bold' : 'text-slate-200'
                      }`}
                    >
                      {estimatedMins === 0 ? 'Poste disponible !' : `~ ${estimatedMins} min`}
                    </span>
                  </div>

                  {/* Actions caissier */}
                  <div className="flex items-center gap-1.5">
                    {entry.phone.length > 8 && (
                      onSendWhatsAppDirect ? (
                        <button
                          type="button"
                          onClick={() => onSendWhatsAppDirect(entry)}
                          title="Envoyer notification WhatsApp (Meta API ou wa.me)"
                          className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg transition cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      ) : (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Envoyer via WhatsApp (wa.me)"
                          className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg transition inline-flex"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )
                    )}

                    <button
                      onClick={() => handleCall(entry)}
                      title="Faire sonner l'appel client et lancer le délai de grâce"
                      className={`p-2 rounded-lg transition cursor-pointer ${
                        isCalled
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-amber-400 hover:text-white hover:bg-amber-600'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </button>

                    {availableStations.length > 0 && (
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenStationMenuKey((prev) => (prev === `q-${entry.id}` ? null : `q-${entry.id}`))
                          }
                          className={`px-2.5 py-1.5 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow cursor-pointer ${
                            entry.prepaidTicketNumber
                              ? 'bg-cyan-600 hover:bg-cyan-500'
                              : 'bg-emerald-600 hover:bg-emerald-500'
                          }`}
                        >
                          <Tv className="w-3.5 h-3.5" />
                          <span>{entry.prepaidTicketNumber ? 'Installer (Payé)' : 'Installer'}</span>
                          <ChevronRight className={`w-3 h-3 transition-transform ${openStationMenuKey === `q-${entry.id}` ? 'rotate-90' : ''}`} />
                        </button>
                        <div
                          className={`${
                            openStationMenuKey === `q-${entry.id}` ? 'block' : 'hidden group-hover:block'
                          } absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-30 min-w-[165px] space-y-1`}
                        >
                          <div className="text-[10px] text-slate-400 px-2 py-0.5 font-bold">Postes Libres :</div>
                          {availableStations.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setOpenStationMenuKey(null);
                                onAssignToStation(entry, st.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer"
                            >
                              <span>Poste {st.id}</span>
                              <span className="text-[10px] font-mono text-cyan-400">{st.type}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => onRemoveFromQueue(entry.id, 'no_show')}
                      title="Marquer absent (No-show)"
                      className="p-2 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
