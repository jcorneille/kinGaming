import React, { useState } from 'react';
import {
  X,
  Sliders,
  Award,
  Crown,
  ShieldCheck,
  Save,
  UserCheck,
  AlertTriangle,
  History
} from 'lucide-react';
import { TierRulesConfig, Client, LoyaltyTier } from '../types';

interface TierSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierRules: TierRulesConfig;
  clients: Client[];
  onSaveRules: (rules: TierRulesConfig) => void;
  onManualPromoteVIP: (clientId: string, reason: string) => void;
}

export const TierSettingsModal: React.FC<TierSettingsModalProps> = ({
  isOpen,
  onClose,
  tierRules,
  clients,
  onSaveRules,
  onManualPromoteVIP,
}) => {
  const [localRules, setLocalRules] = useState<TierRulesConfig>(tierRules);
  const [manualClientId, setManualClientId] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRules(localRules);
    setSuccessMsg('Règles des statuts mises à jour avec succès !');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleExecuteManualVIP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientId || !manualReason.trim()) {
      alert('Veuillez sélectionner un joueur et fournir un motif obligatoire.');
      return;
    }
    onManualPromoteVIP(manualClientId, manualReason.trim());
    setManualClientId('');
    setManualReason('');
    alert('Statut VIP attribué manuellement et consigné dans le journal d\'audit.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Configuration des Statuts (Nouveau → Régulier → Fidèle → VIP)
              </h2>
              <p className="text-xs text-slate-400">Règles métier automatiques modifiables sans toucher au code</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold">
              {successMsg}
            </div>
          )}

          {/* Formulaire Règles */}
          <form onSubmit={handleSave} className="space-y-5">
            {/* 1. Conditions Palier Fidèle */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-300" />
                <span>Conditions du Statut Fidèle (Cumulatives sur 90 jours)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Le client doit remplir TOUTES ces conditions simultanément pour être promu.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Sessions payées min :</label>
                  <input
                    type="number"
                    value={localRules.fideleMinSessions}
                    onChange={(e) => setLocalRules({ ...localRules, fideleMinSessions: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Heures cumulées min :</label>
                  <input
                    type="number"
                    value={localRules.fideleMinHours}
                    onChange={(e) => setLocalRules({ ...localRules, fideleMinHours: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Semaines distinctes :</label>
                  <input
                    type="number"
                    value={localRules.fideleMinWeeks}
                    onChange={(e) => setLocalRules({ ...localRules, fideleMinWeeks: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Ancienneté (jours) :</label>
                  <input
                    type="number"
                    value={localRules.fideleMinDaysRegistered}
                    onChange={(e) => setLocalRules({ ...localRules, fideleMinDaysRegistered: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 2. Conditions Palier VIP */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Conditions du Statut VIP (Conditions Fidèle + au moins 1 voie)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                L'une de ces 3 voies d'excellence valide le passage au rang VIP.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Voie Heures (sur 90j) :</label>
                  <input
                    type="number"
                    value={localRules.vipHoursThreshold}
                    onChange={(e) => setLocalRules({ ...localRules, vipHoursThreshold: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Voie Dépenses USD (sur 90j) :</label>
                  <input
                    type="number"
                    value={localRules.vipSpendingThresholdUSD}
                    onChange={(e) => setLocalRules({ ...localRules, vipSpendingThresholdUSD: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Voie Filleuls Actifs (≥2 sessions) :</label>
                  <input
                    type="number"
                    value={localRules.vipActiveReferralsThreshold}
                    onChange={(e) => setLocalRules({ ...localRules, vipActiveReferralsThreshold: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Période Glissante & Période de Grâce */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <label className="text-slate-300 block mb-1 font-semibold">Fenêtre Glissante (Jours) :</label>
                <input
                  type="number"
                  value={localRules.rollingWindowDays}
                  onChange={(e) => setLocalRules({ ...localRules, rollingWindowDays: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <label className="text-slate-300 block mb-1 font-semibold">Période de Grâce avant Rétrogradation :</label>
                <input
                  type="number"
                  value={localRules.gracePeriodDays}
                  onChange={(e) => setLocalRules({ ...localRules, gracePeriodDays: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Seuils Paramétrables</span>
            </button>
          </form>

          {/* Attribution Manuelle du VIP par l'Administrateur */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Attribution Manuelle Exceptionnelle du Statut VIP</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Réservé à l'administrateur (partenaires, champions eSports). Un motif obligatoire est exigé et audité.
            </p>

            <form onSubmit={handleExecuteManualVIP} className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Sélectionner le joueur :</label>
                <select
                  value={manualClientId}
                  onChange={(e) => setManualClientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                >
                  <option value="">-- Choisir un client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone}) — Actuel: {c.tier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Motif obligatoire (journal d'audit) :</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Ex: Vainqueur du tournoi EA FC 25 Kinshasa ou Partenaire officiel"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow"
              >
                Promouvoir Manuellement en VIP
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
