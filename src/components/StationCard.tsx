import React from 'react';
import {
  Tv,
  Clock,
  User,
  Zap,
  PlusCircle,
  ArrowRightLeft,
  Square,
  Wrench,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Station } from '../types';

interface StationCardProps {
  station: Station;
  onOpenTicket: (station: Station) => void;
  onExtend: (station: Station, minutes: number) => void;
  onTransfer: (station: Station) => void;
  onEndSession: (station: Station) => void;
  onToggleMaintenance: (station: Station) => void;
  onTogglePower: (station: Station) => void;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onOpenTicket,
  onExtend,
  onTransfer,
  onEndSession,
  onToggleMaintenance,
  onTogglePower,
}) => {
  const isOccupied = station.status === 'occupied';
  const isMaintenance = station.status === 'maintenance';
  const isAvailable = station.status === 'available';
  const isPS5 = station.type === 'PS5';

  // Alerte fin de session imminente (< 5 minutes)
  const isEndingSoon = isOccupied && station.remainingSeconds <= 300 && station.remainingSeconds > 0;
  const isOvertime = isOccupied && station.remainingSeconds <= 0;

  // Calcul du pourcentage écoulé
  const totalSeconds = (station.totalDurationMinutes || 1) * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - station.remainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

  // Formattage du compte à rebours
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '00:00 - TERMINÉ';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        isMaintenance
          ? 'bg-slate-900/60 border-rose-900/50 text-slate-400'
          : isEndingSoon
          ? 'bg-slate-900/90 border-amber-500/80 shadow-lg shadow-amber-500/10'
          : isOvertime
          ? 'bg-slate-900/95 border-rose-500/80 shadow-lg shadow-rose-500/20'
          : isOccupied
          ? isPS5
            ? 'bg-slate-900/90 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
            : 'bg-slate-900/90 border-blue-500/60 shadow-md shadow-blue-500/10'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Barre supérieure : Numéro, Type & Statut */}
      <div className="p-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg font-mono font-bold text-sm flex items-center justify-center shrink-0 ${
                isPS5
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black'
                  : 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
              }`}
            >
              {station.id}
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Poste {station.id}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                    isPS5 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {station.type}
                </span>
              </h3>
            </div>
          </div>

          {/* Badge état */}
          <div className="flex items-center gap-1.5">
            {isAvailable && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Libre
              </span>
            )}
            {isOccupied && !isEndingSoon && !isOvertime && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                <Clock className="w-3 h-3" />
                En jeu
              </span>
            )}
            {isEndingSoon && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                &lt; 5 min !
              </span>
            )}
            {isOvertime && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                Temps écoulé
              </span>
            )}
            {isMaintenance && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                <Wrench className="w-3 h-3" />
                Maintenance
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Corps de la carte */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        {isOccupied ? (
          <div className="space-y-3">
            {/* Infos Joueur */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-200">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold truncate max-w-[150px]">{station.clientName || 'Client anonyme'}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{station.totalDurationMinutes} min</span>
            </div>

            {/* Compteur & Barre de progression */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 text-[11px]">Temps restant :</span>
                <span
                  className={`font-mono text-base font-bold tabular-nums ${
                    isEndingSoon ? 'text-amber-400' : isOvertime ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {formatCountdown(station.remainingSeconds)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isOvertime
                      ? 'bg-rose-500'
                      : isEndingSoon
                      ? 'bg-amber-400'
                      : isPS5
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Actions rapides de prolongation */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                <span>Prolonger la session</span>
                <PlusCircle className="w-3 h-3 text-slate-500" />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onExtend(station, 15)}
                  className="px-2 py-1 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  +15m
                </button>
                <button
                  onClick={() => onExtend(station, 30)}
                  className="px-2 py-1 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  +30m
                </button>
                <button
                  onClick={() => onExtend(station, 60)}
                  className="px-2 py-1 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  +1h
                </button>
              </div>
            </div>
          </div>
        ) : isMaintenance ? (
          <div className="py-6 text-center space-y-2">
            <Wrench className="w-8 h-8 text-rose-500/60 mx-auto" />
            <p className="text-xs text-slate-400">Poste en cours d'intervention ou manette défectueuse.</p>
            <button
              onClick={() => onToggleMaintenance(station)}
              className="mt-2 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
            >
              Remettre en service
            </button>
          </div>
        ) : (
          <div className="py-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">Écran & Console prêts</p>
              <p className="text-[11px] text-slate-400">Prise connectée en veille</p>
            </div>
            <button
              onClick={() => onOpenTicket(station)}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 ${
                isPS5
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Nouveau Ticket (&lt; 15s)</span>
            </button>
          </div>
        )}

        {/* Pied de carte : Télémétrie Domotique & Contrôles Relais */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {/* Relais & Puissance */}
          <button
            onClick={() => onTogglePower(station)}
            title={`Prise ${station.relayState ? 'ALLUMÉE' : 'ÉTEINTE'} — Cliquer pour commuter`}
            className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-[11px] font-semibold transition ${
              station.relayState
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Zap className={`w-3 h-3 ${station.relayState ? 'text-emerald-400 fill-emerald-400' : 'text-slate-500'}`} />
            <span>{station.relayState ? `${station.currentWatts.toFixed(0)}W` : 'OFF'}</span>
          </button>

          {/* Actions secondaires */}
          <div className="flex items-center gap-1">
            {isOccupied && (
              <>
                <button
                  onClick={() => onTransfer(station)}
                  title="Transférer le client vers un autre poste libre"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onEndSession(station)}
                  title="Terminer la session plus tôt"
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {!isOccupied && !isMaintenance && (
              <button
                onClick={() => onToggleMaintenance(station)}
                title="Mettre en maintenance"
                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition text-[11px]"
              >
                <Wrench className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
