import React, { useState } from 'react';
import {
  Users,
  Clock,
  Phone,
  UserPlus,
  Bell,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Tv
} from 'lucide-react';
import { QueueEntry, Station, QueuePriority } from '../types';
import { soundService } from '../services/soundService';

interface QueueViewProps {
  queue: QueueEntry[];
  stations: Station[];
  onAddToQueue: (entry: Omit<QueueEntry, 'id' | 'arrivalTime' | 'status' | 'gracePeriodSeconds'>) => void;
  onCallClient: (entryId: string) => void;
  onAssignToStation: (entry: QueueEntry, stationId: number) => void;
  onRemoveFromQueue: (entryId: string, reason: 'no_show' | 'cancelled') => void;
  onSendWhatsAppDirect?: (entry: QueueEntry) => void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  queue,
  stations,
  onAddToQueue,
  onCallClient,
  onAssignToStation,
  onRemoveFromQueue,
  onSendWhatsAppDirect,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('+243 ');
  const [desiredStationType, setDesiredStationType] = useState<'PS4' | 'PS5' | 'ANY'>('ANY');
  const [desiredDurationMinutes, setDesiredDurationMinutes] = useState(30);
  const [priorityLevel, setPriorityLevel] = useState<QueuePriority>('NORMAL');

  // Filtrer les entrées en attente
  const waitingEntries = queue.filter(q => q.status === 'waiting' || q.status === 'called');

  // Calcul du temps d'attente estimé
  const calculateEstimatedWait = (entryType: 'PS4' | 'PS5' | 'ANY', indexInQueue: number): number => {
    // Postes ciblés
    const targetStations = stations.filter(s => {
      if (entryType === 'ANY') return true;
      return s.type === entryType;
    });

    // S'il y a un poste libre tout de suite
    const freeStation = targetStations.some(s => s.status === 'available');
    if (freeStation && indexInQueue === 0) return 0;

    // Trier les temps restants des postes occupés
    const remainingTimes = targetStations
      .filter(s => s.status === 'occupied')
      .map(s => Math.ceil(s.remainingSeconds / 60))
      .sort((a, b) => a - b);

    if (remainingTimes.length === 0) return 5;
    // Estimation basée sur la position dans la file
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
    soundService.playQueueCallChime();
    onCallClient(entry.id);
  };

  // Liste des postes libres disponibles pour assignation
  const availableStations = stations.filter(s => s.status === 'available');

  return (
    <div className="space-y-4">
      {/* En-tête de la file */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>File d'Attente Interactive</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300">
                {waitingEntries.length} en attente
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Estimation automatique selon les temps restants des 10 postes
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition"
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
              Nouveau Joueur en Liste d'Attente
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                onChange={(e) => setDesiredStationType(e.target.value as 'PS4' | 'PS5' | 'ANY')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ANY">Peu importe (Premier libre)</option>
                <option value="PS4">PlayStation 4</option>
                <option value="PS5">PlayStation 5 (VIP)</option>
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
            <p className="text-sm font-semibold text-slate-300">Aucun joueur en file d'attente</p>
            <p className="text-xs text-slate-500">
              Des postes sont actuellement libres ou tous les joueurs sont installés.
            </p>
          </div>
        ) : (
          waitingEntries.map((entry, idx) => {
            const estimatedMins = calculateEstimatedWait(entry.desiredStationType, idx);
            const isCalled = entry.status === 'called';

            // Lien WhatsApp prêt
            const cleanPhone = entry.phone.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
              `Bonjour ${entry.clientName}, votre poste de jeu est prêt à Kin Gaming Hub ! Veuillez vous présenter à l'accueil.`
            )}`;

            return (
              <div
                key={entry.id}
                className={`bg-slate-900/90 border rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition ${
                  isCalled
                    ? 'border-amber-500/80 shadow-lg shadow-amber-500/10'
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{entry.clientName}</span>
                      {entry.priorityLevel === 'VIP' && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded">
                          VIP
                        </span>
                      )}
                      {entry.priorityLevel === 'LOYAL' && (
                        <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold rounded">
                          Fidèle
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
                        {entry.desiredStationType === 'ANY' ? 'PS4 ou PS5' : entry.desiredStationType} ({entry.desiredDurationMinutes}m)
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
                    {/* Notification WhatsApp Officielle Meta Cloud API */}
                    {entry.phone.length > 8 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSendWhatsAppDirect) {
                            onSendWhatsAppDirect(entry);
                          } else {
                            window.open(whatsappUrl, '_blank');
                          }
                        }}
                        title="Envoyer notification WhatsApp Business Cloud (Graph API)"
                        className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}

                    {/* Alerte Sonore & Appel */}
                    <button
                      onClick={() => handleCall(entry)}
                      title="Faire sonner l'appel client et lancer le délai de grâce"
                      className={`p-2 rounded-lg transition ${
                        isCalled
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-amber-400 hover:text-white hover:bg-amber-600'
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                    </button>

                    {/* Menu d'attribution rapide vers un poste libre */}
                    {availableStations.length > 0 && (
                      <div className="relative group">
                        <button
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow"
                        >
                          <Tv className="w-3.5 h-3.5" />
                          <span>Installer</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-30 min-w-[140px] space-y-1">
                          <div className="text-[10px] text-slate-400 px-2 py-0.5 font-bold">Postes Libres :</div>
                          {availableStations.map((st) => (
                            <button
                              key={st.id}
                              onClick={() => onAssignToStation(entry, st.id)}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded hover:bg-blue-600 text-slate-200 hover:text-white flex items-center justify-between"
                            >
                              <span>Poste {st.id}</span>
                              <span className="text-[10px] font-mono text-cyan-400">{st.type}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Supprimer / Absent */}
                    <button
                      onClick={() => onRemoveFromQueue(entry.id, 'no_show')}
                      title="Marquer absent (No-show)"
                      className="p-2 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition"
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
