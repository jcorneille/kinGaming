import React, { useState, useEffect } from 'react';
import { Ticket, Station } from '../types';
import { 
  Gamepad2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  Smartphone, 
  ArrowRight,
  ShieldCheck,
  Tv,
  Calendar,
  Lock
} from 'lucide-react';

interface PublicTicketVerificationViewProps {
  token: string;
  tickets: Ticket[];
  stations: Station[];
  onOpenCustomerPortal: (clientId?: string) => void;
  onOpenStaffTicketAction?: (ticket: Ticket) => void;
  isStaffAuthenticated?: boolean;
}

export const PublicTicketVerificationView: React.FC<PublicTicketVerificationViewProps> = ({
  token,
  tickets,
  stations,
  onOpenCustomerPortal,
  onOpenStaffTicketAction,
  isStaffAuthenticated = false,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Recherche du ticket correspondant au jeton
  const ticket = tickets.find(
    (t) => t.signedToken === token || t.id === token || t.ticketNumber === token
  );

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
              Ce jeton de vérification ne correspond à aucune session enregistrée chez Kin Gaming Hub.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 break-all">
            Jeton scanné : {token || 'Vide'}
          </div>
          <div className="pt-2">
            <button
              onClick={() => onOpenCustomerPortal()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Accéder à l'Espace Client</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calcul du temps restant en direct
  const station = stations.find((s) => s.id === ticket.stationId);
  const remainingSeconds = ticket.status === 'active'
    ? Math.max(0, Math.floor((ticket.endTime - currentTime) / 1000))
    : 0;

  const remainingMins = Math.floor(remainingSeconds / 60);
  const remainingSecs = remainingSeconds % 60;

  const isCompleted = ticket.status === 'completed' || remainingSeconds === 0;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Carte Centrale de Vérification */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header Marque */}
        <div className="p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Kin Gaming Hub</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Vérifié
                </span>
              </div>
              <p className="text-xs text-slate-400">Page publique officielle de contrôle de session</p>
            </div>
          </div>
        </div>

        {/* Corps de la Fiche en Lecture Seule */}
        <div className="p-6 space-y-5 text-xs">
          {/* Bannière Temps Restant Direct */}
          <div
            className={`p-4 rounded-2xl border text-center space-y-1 ${
              ticket.status === 'active' && remainingSeconds > 0
                ? remainingSeconds < 300
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {ticket.status === 'active' && remainingSeconds > 0
                ? 'Session en cours · Temps Restant Direct'
                : 'Session Terminée'}
            </span>
            <div className="text-3xl font-black font-mono tracking-tight">
              {ticket.status === 'active' && remainingSeconds > 0
                ? `${String(remainingMins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`
                : '00:00'}
            </div>
            {ticket.status === 'active' && remainingSeconds <= 300 && remainingSeconds > 0 && (
              <p className="text-[10px] font-medium text-amber-400">
                Moins de 5 minutes restantes — Vous pouvez demander une prolongation au caissier.
              </p>
            )}
          </div>

          {/* Grille des caractéristiques */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Numéro de Ticket :</span>
              <span className="font-mono font-bold text-white text-sm">{ticket.ticketNumber}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>Poste attribué :</span>
              </span>
              <span className="font-bold text-cyan-300 font-mono text-sm">
                Poste {ticket.stationId} ({ticket.stationType})
              </span>
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
          </div>

          {/* Action Caissier (si scanné depuis l'application par le personnel) */}
          {isStaffAuthenticated && onOpenStaffTicketAction && (
            <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-blue-300 font-semibold">
                <span>Contrôle Caissier Connecté :</span>
              </div>
              <button
                onClick={() => onOpenStaffTicketAction(ticket)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
              >
                Gérer ce poste (Prolonger / Terminer / Transférer)
              </button>
            </div>
          )}

          {/* Bouton Accès Espace Client (Modification 3) */}
          <div className="pt-1">
            <button
              onClick={() => onOpenCustomerPortal(ticket.clientId)}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition"
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
