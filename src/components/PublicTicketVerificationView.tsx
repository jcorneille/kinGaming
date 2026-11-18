import React, { useState, useEffect } from 'react';
import { Ticket, Station } from '../types';
import {
  Gamepad2,
  Clock,
  XCircle,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Tv,
  Calendar,
  ArrowLeft,
  RefreshCw,
  Wifi,
} from 'lucide-react';

interface PublicTicketVerificationViewProps {
  token: string;
  tickets: Ticket[];
  stations: Station[];
  onOpenCustomerPortal: (clientId?: string) => void;
  onOpenStaffTicketAction?: (ticket: Ticket) => void;
  onBack?: () => void;
  isStaffAuthenticated?: boolean;
}

export const PublicTicketVerificationView: React.FC<PublicTicketVerificationViewProps> = ({
  token,
  tickets,
  stations,
  onOpenCustomerPortal,
  onOpenStaffTicketAction,
  onBack,
  isStaffAuthenticated = false,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [remoteTicket, setRemoteTicket] = useState<Ticket | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState<boolean>(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Recherche locale + synchronisation serveur cross-device via /api/tickets/public/:token
  const localTicket = tickets.find(
    (t) => t.signedToken === token || t.id === token || t.ticketNumber === token
  );

  useEffect(() => {
    let active = true;
    const fetchPublicTicket = async (isInitial: boolean) => {
      if (isInitial) setIsLoadingRemote(true);
      try {
        const res = await fetch(`/api/tickets/public/${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data?.found && data.ticket) {
            setRemoteTicket(data.ticket as Ticket);
          }
        }
      } catch {
        // Fallback hors-ligne si serveur injoignable
      } finally {
        if (active && isInitial) setIsLoadingRemote(false);
      }
    };

    fetchPublicTicket(true);
    const pollInterval = setInterval(() => fetchPublicTicket(false), 10000);
    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [token]);

  const ticket = isStaffAuthenticated
    ? localTicket || remoteTicket
    : remoteTicket || localTicket;

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\s+/g, '');
    if (clean.length < 8) return '***';
    return `${clean.substring(0, 6)} *** **${clean.substring(clean.length - 2)}`;
  };

  if (!ticket && isLoadingRemote) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center space-y-3 shadow-2xl">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <h1 className="text-base font-bold text-white">Vérification du ticket en cours...</h1>
          <p className="text-xs text-slate-400">
            Consultation du registre officiel GOZA pour le jeton scanné.
          </p>
        </div>
      </div>
    );
  }

  // Cas 1 : Jeton Invalide ou Ticket Introuvable
  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Ticket Introuvable ou Invalide</h1>
            <p className="text-xs text-slate-400 mt-1">
              Ce jeton de vérification ne correspond à aucune session enregistrée chez GOZA.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 break-all">
            Jeton scanné : {token || 'Vide'}
          </div>
          <div className="pt-2 space-y-2">
            <button
              onClick={() => onOpenCustomerPortal()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Accéder à l'Espace Client</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour à l'application</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calcul du temps restant en direct
  const station = stations.find((s) => s.id === ticket.stationId);
  const isQueuedTicket = ticket.status === 'queued';
  const isRunningStatus = ticket.status === 'active' || ticket.status === 'extended';
  const remainingSeconds = isRunningStatus
    ? Math.max(0, Math.floor((ticket.endTime - currentTime) / 1000))
    : isQueuedTicket
    ? ticket.durationMinutes * 60
    : 0;

  const remainingMins = Math.floor(remainingSeconds / 60);
  const remainingSecs = remainingSeconds % 60;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Carte Centrale de Vérification */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header Marque */}
        <div className="p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-gaming font-black uppercase tracking-[0.14em] bg-gradient-to-r from-white via-cyan-200 to-amber-300 bg-clip-text text-transparent">
                  GOZA
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Vérifié
                </span>
              </div>
              <p className="text-xs text-slate-400">Page publique officielle de contrôle de session</p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
          )}
        </div>

        {/* Corps de la Fiche en Lecture Seule */}
        <div className="p-6 space-y-5 text-xs">
          {/* Bannière Temps Restant Direct */}
          <div
            className={`p-4 rounded-2xl border text-center space-y-1 ${
              isRunningStatus && remainingSeconds > 0
                ? remainingSeconds < 300
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {ticket.status === 'refunded'
                ? 'Ticket Remboursé / Annulé'
                : isQueuedTicket
                ? "Validé & En File d'Attente · Temps réservé intact"
                : isRunningStatus && remainingSeconds > 0
                ? 'Session en cours · Temps Restant Direct'
                : 'Session Terminée'}
            </span>
            <div className="text-3xl font-black font-mono tracking-tight">
              {(isRunningStatus && remainingSeconds > 0) || isQueuedTicket
                ? `${String(remainingMins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`
                : '00:00'}
            </div>
            {isRunningStatus && remainingSeconds <= 300 && remainingSeconds > 0 && (
              <p className="text-[10px] font-medium text-amber-400">
                Moins de 5 minutes restantes — Vous pouvez demander une prolongation au caissier.
              </p>
            )}
          </div>

          {ticket.wifiVoucher && (ticket.durationMinutes >= 60 || (ticket.originalDurationMinutes || 0) >= 60) && (
            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                ticket.wifiVoucher.status === 'ACTIVE' && (isRunningStatus || isQueuedTicket)
                  ? 'bg-cyan-950/35 border-cyan-500/40'
                  : 'bg-slate-800/50 border-slate-700 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Wifi className="w-4 h-4" />
                  <span>
                    Code Wi-Fi Client ({ticket.wifiVoucher.maxDevices}{' '}
                    {ticket.wifiVoucher.maxDevices > 1 ? 'Appareils Max' : 'Appareil Max'})
                  </span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    ticket.wifiVoucher.status === 'ACTIVE' && (isRunningStatus || isQueuedTicket)
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {ticket.wifiVoucher.status === 'ACTIVE' && (isRunningStatus || isQueuedTicket)
                    ? 'ACTIF'
                    : 'EXPIRÉ'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 rounded-xl px-3.5 py-2.5 border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400">SSID : <strong className="text-white">{ticket.wifiVoucher.ssid}</strong></div>
                  <div className="text-lg font-mono font-black tracking-widest text-cyan-300">
                    {ticket.wifiVoucher.code}
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-300">
                  <div className="font-bold text-amber-300">
                    {ticket.wifiVoucher.maxDevices}{' '}
                    {ticket.wifiVoucher.maxDevices > 1 ? 'appareils simultanés max' : 'appareil uniquement'}
                  </div>
                  <div>
                    {isQueuedTicket
                      ? "Actif en file d'attente — expirera à la fin de votre partie"
                      : `Expire à la fin de session (${formatTime(ticket.endTime)})`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grille des caractéristiques */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Numéro de Ticket :</span>
              <span className="font-mono font-bold text-white text-sm">
                {ticket.ticketNumber}
                {ticket.reservationCode && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {ticket.reservationCode}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>Poste attribué :</span>
              </span>
              <div className="text-right">
                <span className="font-bold text-cyan-300 font-mono text-sm">
                  {isQueuedTicket || ticket.stationId === 0
                    ? `En file d'attente (${ticket.stationType})`
                    : `${station?.name || ticket.stationName || `Poste ${ticket.stationId}`} (${ticket.stationType})`}
                </span>
                {ticket.transferredFromStationId && (
                  <div className="text-[10px] text-amber-300 font-mono">
                    Transféré depuis Poste {ticket.transferredFromStationId}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Joueur :</span>
              <span className="font-semibold text-slate-200">
                {ticket.clientName}
                {ticket.clientPhone && (
                  <span className="text-[11px] text-slate-400 font-mono ml-2">
                    ({maskPhone(ticket.clientPhone)})
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Durée & Horaires :</span>
              </span>
              <div className="text-right">
                <div className="font-bold text-white">{ticket.durationMinutes} Minutes</div>
                {ticket.lostLateMinutes && ticket.lostLateMinutes > 0 && (
                  <div className="text-[10px] font-mono text-amber-300">
                    ({ticket.originalDurationMinutes}m réservés · -{ticket.lostLateMinutes}m retard)
                  </div>
                )}
                <div className="text-[10px] font-mono text-slate-400">
                  {formatTime(ticket.startTime)} &rarr; {formatTime(ticket.endTime)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date de session :</span>
              </span>
              <span className="text-slate-200 font-mono">{formatDate(ticket.createdAt)}</span>
            </div>

            {(ticket.appliedTimeSlotLabel || ticket.appliedPromoCode || (ticket.discountCDF || 0) > 0) && (
              <div className="pb-2 border-b border-slate-800 space-y-1 text-[11px]">
                {ticket.appliedTimeSlotLabel && (
                  <div className="flex items-center justify-between text-cyan-300">
                    <span>Tranche horaire :</span>
                    <span className="font-semibold">{ticket.appliedTimeSlotLabel}</span>
                  </div>
                )}
                {ticket.appliedPromoCode && (
                  <div className="flex items-center justify-between text-purple-300">
                    <span>Code promo appliqué :</span>
                    <span className="font-mono font-bold">
                      {ticket.appliedPromoCode} (-{(ticket.appliedPromoDiscountCDF || ticket.discountCDF || 0).toLocaleString()} FC)
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Règlement :</span>
              <div className="text-right">
                <span className="font-mono font-bold text-emerald-400">
                  {ticket.amountCDF.toLocaleString()} FC
                </span>
                <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                  (${ticket.amountUSD.toFixed(2)})
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mode de Paiement :</span>
                <span className="font-semibold text-slate-200">
                  {ticket.paymentMethod === 'ILLICO_CASH'
                    ? 'Illico Cash (Rawbank)'
                    : ticket.paymentMethod === 'MIXED'
                    ? 'Paiement Mixte'
                    : ticket.paymentMethod}
                </span>
              </div>
              {ticket.mixedBreakdown && (
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] font-mono space-y-0.5 text-slate-300">
                  {(ticket.mixedBreakdown.cashCDF || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Espèces CDF :</span>
                      <span>{ticket.mixedBreakdown.cashCDF?.toLocaleString()} FC</span>
                    </div>
                  )}
                  {(ticket.mixedBreakdown.cashUSD || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Espèces USD :</span>
                      <span>${ticket.mixedBreakdown.cashUSD?.toFixed(2)}</span>
                    </div>
                  )}
                  {(ticket.mixedBreakdown.illicoCashCDF || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Illico Cash :</span>
                      <span>{ticket.mixedBreakdown.illicoCashCDF?.toLocaleString()} FC</span>
                    </div>
                  )}
                  {(ticket.mixedBreakdown.momoCDF || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>{ticket.mixedBreakdown.momoProvider || 'Mobile Money'} :</span>
                      <span>{ticket.mixedBreakdown.momoCDF?.toLocaleString()} FC</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Caissier (si scanné depuis l'application par le personnel) */}
          {isStaffAuthenticated && onOpenStaffTicketAction && (
            <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-300 font-semibold">
                <span>Contrôle Caissier Connecté :</span>
              </div>
              <button
                onClick={() => onOpenStaffTicketAction(ticket)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Gérer ce poste (Prolonger / Terminer / Transférer)
              </button>
            </div>
          )}

          {/* Bouton Accès Espace Client */}
          <div className="pt-1">
            <button
              onClick={() => onOpenCustomerPortal(ticket.clientId)}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Accéder à mon Espace Client (Points & Statut)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Consultez vos points fidélité, votre progression vers le statut VIP et votre rang dans la file d'attente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
