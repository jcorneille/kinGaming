import React from 'react';
import { Zap, Router, Tv, Fan, BatteryCharging, Cable } from 'lucide-react';
import { Station, SystemSettings } from '../types';
import { isStationShellyExempt } from '../services/shellyService';

interface WiringDiagramsSvgProps {
  stations?: Station[];
  settings?: SystemSettings;
}

export const WiringDiagramsSvg: React.FC<WiringDiagramsSvgProps> = ({
  stations = [],
  settings,
}) => {
  const effectiveStations =
    stations.length > 0
      ? stations
      : Array.from({ length: 10 }, (_, idx) => ({
          id: idx + 1,
          name: idx + 1 > 8 ? `Poste ${idx + 1} (PS5 Ultra 120Hz)` : `Poste ${idx + 1} (PS4)`,
          type: idx + 1 > 8 ? ('PS5' as const) : ('PS4' as const),
        }));

  return (
    <div className="space-y-6">
      {/* En-tête Légende des Couleurs de Fils */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Cable className="w-4 h-4 text-cyan-400" />
            <span>Schémas de Câblage Électrique Borne-à-Borne (Secteur 230V L / N / PE &amp; Réseau Routeur)</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-400">Norme couleurs 230V / 50Hz RDC</span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-rose-500" /> Phase Permanente (L - Rouge/Marron)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-amber-400" /> Phase Commandée (O - Orange, sortie Shelly)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-blue-500" /> Neutre (N - Bleu)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-emerald-400" /> Terre de Protection (PE - Vert/Jaune)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-cyan-400" /> Câble RJ45 / Wi-Fi 2.4GHz
          </span>
        </div>
      </div>

      {/* Grille 2x2 des 4 Schémas Techniques SVG Précis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* SCHÉMA 1 : Poste de Jeu (Écran TV + Console PS4/PS5 + Shelly Plus 1PM) */}
        <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Tv className="w-4 h-4" />
              <span>1. Câblage Secteur d&apos;un Poste (Shelly Plus 1PM + Écran TV + PS4/PS5)</span>
            </h5>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Postes 2–8 (PS4) &amp; 10 (PS5)
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox="0 0 660 320" className="w-full min-w-[540px] h-auto rounded-lg bg-[#050811] border border-slate-800">
              {/* Bus Disjoncteur 16A */}
              <rect x="16" y="24" width="120" height="86" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <text x="76" y="44" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Disjoncteur 16A</text>
              <text x="76" y="59" textAnchor="middle" fill="#94a3b8" fontSize="9.5">(Zone PS4 ou PS5)</text>
              <text x="36" y="80" fill="#fb7185" fontSize="10" fontWeight="bold">L (Phase)</text>
              <text x="36" y="96" fill="#60a5fa" fontSize="10" fontWeight="bold">N (Neutre)</text>
              <text x="148" y="138" fill="#4ade80" fontSize="10" fontWeight="bold">PE (Terre)</text>

              {/* Ligne Phase L Rouge */}
              <path d="M136 76 H240 V120" fill="none" stroke="#f43f5e" strokeWidth="2.8" />
              <path d="M190 76 V246 H472" fill="none" stroke="#f43f5e" strokeWidth="2.4" />
              <circle cx="190" cy="76" r="3.5" fill="#f43f5e" />

              {/* Ligne Neutre N Bleue */}
              <path d="M136 94 H280 V120" fill="none" stroke="#3b82f6" strokeWidth="2.8" />
              <path d="M210 94 V266 H472" fill="none" stroke="#3b82f6" strokeWidth="2.4" />
              <path d="M280 94 H425 V148 H472" fill="none" stroke="#3b82f6" strokeWidth="2.4" />
              <circle cx="210" cy="94" r="3.5" fill="#3b82f6" />
              <circle cx="280" cy="94" r="3.5" fill="#3b82f6" />

              {/* Ligne Terre PE Verte */}
              <path d="M136 142 H440 V168 H472" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 3" />
              <path d="M440 168 V286 H472" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 3" />
              <circle cx="440" cy="168" r="3.2" fill="#22c55e" />

              {/* Boîtier Shelly Plus 1PM */}
              <rect x="215" y="120" width="165" height="96" rx="12" fill="#0c192c" stroke="#22d3ee" strokeWidth="2" />
              <text x="297" y="142" textAnchor="middle" fill="#22d3ee" fontSize="11.5" fontWeight="bold">Shelly Plus 1PM</text>
              <text x="297" y="156" textAnchor="middle" fill="#94a3b8" fontSize="9">Wi-Fi 2.4GHz (.122-.130)</text>

              {/* Bornes Shelly */}
              <rect x="228" y="168" width="26" height="22" rx="4" fill="#1e293b" stroke="#f43f5e" />
              <text x="241" y="183" textAnchor="middle" fill="#fda4af" fontSize="10.5" fontWeight="bold">L</text>

              <rect x="266" y="168" width="26" height="22" rx="4" fill="#1e293b" stroke="#3b82f6" />
              <text x="279" y="183" textAnchor="middle" fill="#93c5fd" fontSize="10.5" fontWeight="bold">N</text>

              <rect x="304" y="168" width="26" height="22" rx="4" fill="#1e293b" stroke="#f59e0b" />
              <text x="317" y="183" textAnchor="middle" fill="#fcd34d" fontSize="10.5" fontWeight="bold">O</text>

              <rect x="342" y="168" width="26" height="22" rx="4" fill="#1e293b" stroke="#64748b" />
              <text x="355" y="183" textAnchor="middle" fill="#cbd5e1" fontSize="9.5" fontWeight="bold">SW</text>

              <text x="297" y="207" textAnchor="middle" fill="#67e8f9" fontSize="8.5">Coupure interne L → O sur ticket</text>

              {/* Sortie Commandée O (Orange) vers Écran TV */}
              <path d="M317 168 V128 H472" fill="none" stroke="#f59e0b" strokeWidth="2.8" />
              <text x="396" y="119" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontWeight="bold">Sortie O (Coupée auto)</text>

              {/* Prise Écran TV */}
              <rect x="472" y="102" width="168" height="84" rx="10" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.8" />
              <text x="556" y="122" textAnchor="middle" fill="#fcd34d" fontSize="11" fontWeight="bold">Prise Écran TV 50&quot;/55&quot;</text>
              <text x="484" y="138" fill="#fbbf24" fontSize="9.5">• Phase : Sortie O Shelly</text>
              <text x="484" y="153" fill="#60a5fa" fontSize="9.5">• Neutre : Bleu direct (N)</text>
              <text x="484" y="168" fill="#4ade80" fontSize="9.5">• Terre : Vert/Jaune (PE)</text>
              <text x="556" y="181" textAnchor="middle" fill="#94a3b8" fontSize="8">ON sur ticket / OFF à 00:00</text>

              {/* Prise Console PS4 / PS5 */}
              <rect x="472" y="216" width="168" height="86" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
              <text x="556" y="236" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="bold">Prise Console PS4 / PS5</text>
              <text x="484" y="252" fill="#fda4af" fontSize="9.5">• Phase : L direct (recommandé)</text>
              <text x="484" y="267" fill="#60a5fa" fontSize="9.5">• Neutre : Bleu direct (N)</text>
              <text x="484" y="282" fill="#4ade80" fontSize="9.5">• Terre : Vert/Jaune (PE)</text>
              <text x="556" y="295" textAnchor="middle" fill="#94a3b8" fontSize="8">Préserve le disque SSD/HDD PS4-PS5</text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-emerald-300">Note :</strong> Dans GOZA, le mode par défaut (<em>Écran seul</em>) coupe uniquement la TV via la borne <code className="text-amber-300">O</code> pour protéger le disque dur de la PS4/PS5. Si vous voulez couper console + TV ensemble, branchez aussi la multiprise de la console sur la borne <code className="text-amber-300">O</code>. Les <strong>Postes 1 et 9 (exemptés)</strong> sont branchés en direct sans coupure automatique.
          </p>
        </div>

        {/* SCHÉMA 2 : Climatiseurs (Contacteur 25A + Shelly) & Lumières / Extracteur */}
        <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Fan className="w-4 h-4" />
              <span>2. Câblage Secteur Climatiseurs (Contacteur 25A) + Lumières &amp; Extracteur</span>
            </h5>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
              .140 / .141 / .142 / .143
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox="0 0 660 320" className="w-full min-w-[540px] h-auto rounded-lg bg-[#050811] border border-slate-800">
              {/* PARTIE HAUTE : CLIMATISEUR AVEC CONTACTEUR 25A */}
              <rect x="14" y="14" width="632" height="176" rx="10" fill="#071120" stroke="#1e3a5f" strokeWidth="1.2" />
              <text x="26" y="32" fill="#7dd3fc" fontSize="10.5" fontWeight="bold">A. Chaque Climatiseur Split (.141 Zone PS5 / .142 Zone PS4) — Obligatoire avec Contacteur 25A</text>

              {/* Disjoncteur 25A Clim */}
              <rect x="24" y="48" width="96" height="68" rx="7" fill="#0f172a" stroke="#64748b" />
              <text x="72" y="66" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">Disj. 25A Clim</text>
              <text x="34" y="86" fill="#fb7185" fontSize="9.5" fontWeight="bold">L (Phase)</text>
              <text x="34" y="102" fill="#60a5fa" fontSize="9.5" fontWeight="bold">N (Neutre)</text>

              {/* Fils Puissance L/N vers Contacteur */}
              <path d="M120 82 H292" fill="none" stroke="#f43f5e" strokeWidth="2.8" />
              <path d="M120 98 H292" fill="none" stroke="#3b82f6" strokeWidth="2.8" />

              {/* Dérivation Commande vers Shelly */}
              <path d="M150 82 V146 H178" fill="none" stroke="#f43f5e" strokeWidth="2" />
              <path d="M162 98 V164 H178" fill="none" stroke="#3b82f6" strokeWidth="2" />
              <circle cx="150" cy="82" r="3" fill="#f43f5e" />
              <circle cx="162" cy="98" r="3" fill="#3b82f6" />

              {/* Shelly Commande Bobine */}
              <rect x="178" y="124" width="98" height="54" rx="8" fill="#0c192c" stroke="#22d3ee" strokeWidth="1.6" />
              <text x="227" y="140" textAnchor="middle" fill="#22d3ee" fontSize="9.5" fontWeight="bold">Shelly 1PM</text>
              <text x="188" y="155" fill="#fda4af" fontSize="8.5">L</text>
              <text x="206" y="155" fill="#93c5fd" fontSize="8.5">N</text>
              <text x="248" y="155" fill="#fcd34d" fontSize="8.5">O → A1</text>
              <text x="227" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8">Commande bobine</text>

              {/* Sortie O vers A1 du Contacteur */}
              <path d="M276 151 H315 V128" fill="none" stroke="#f59e0b" strokeWidth="2.4" />
              {/* Neutre vers A2 du Contacteur */}
              <path d="M245 98 V116 H356 V128" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="4 2" />

              {/* Contacteur de Puissance 25A */}
              <rect x="292" y="54" width="136" height="76" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.8" />
              <text x="360" y="71" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold">Contacteur 25A</text>
              <text x="302" y="88" fill="#fb7185" fontSize="9">1 (L1) ──▶ 2 (T1)</text>
              <text x="302" y="103" fill="#60a5fa" fontSize="9">3 (L2) ──▶ 4 (T2)</text>
              <text x="310" y="122" fill="#fbbf24" fontSize="8.5" fontWeight="bold">A1 (O)</text>
              <text x="358" y="122" fill="#60a5fa" fontSize="8.5" fontWeight="bold">A2 (N)</text>

              {/* Sortie Puissance vers Split AC */}
              <path d="M428 84 H486" fill="none" stroke="#f43f5e" strokeWidth="3" />
              <path d="M428 100 H486" fill="none" stroke="#3b82f6" strokeWidth="3" />
              <path d="M452 116 H486" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2" />
              <text x="444" y="119" fill="#4ade80" fontSize="8.5">PE</text>

              <rect x="486" y="60" width="144" height="76" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.6" />
              <text x="558" y="82" textAnchor="middle" fill="#e0f2fe" fontSize="10.5" fontWeight="bold">Climatiseur Split</text>
              <text x="558" y="98" textAnchor="middle" fill="#7dd3fc" fontSize="9">1250W - 1450W</text>
              <text x="558" y="114" textAnchor="middle" fill="#94a3b8" fontSize="8">L (2/T1) · N (4/T2) · PE</text>
              <text x="558" y="127" textAnchor="middle" fill="#fbbf24" fontSize="8">Délesté si SNEL coupé</text>

              {/* PARTIE BASSE : LUMIERES & EXTRACTEUR */}
              <rect x="14" y="200" width="632" height="106" rx="10" fill="#09111e" stroke="#334155" strokeWidth="1.2" />
              <text x="26" y="218" fill="#fde047" fontSize="10.5" fontWeight="bold">B. Éclairage Néon/LED (.140 - 85W) &amp; Extracteur d&apos;air (.143 - 110W)</text>

              <rect x="24" y="232" width="96" height="58" rx="7" fill="#0f172a" stroke="#64748b" />
              <text x="72" y="250" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontWeight="bold">Disj. 10A (Secouru)</text>
              <text x="34" y="268" fill="#fb7185" fontSize="9">L (Phase)</text>
              <text x="34" y="282" fill="#60a5fa" fontSize="9">N (Neutre)</text>

              <path d="M120 264 H192" fill="none" stroke="#f43f5e" strokeWidth="2.4" />
              <path d="M120 278 H192" fill="none" stroke="#3b82f6" strokeWidth="2.4" />
              <path d="M158 278 V296 H486 V278" fill="none" stroke="#3b82f6" strokeWidth="2" />
              <circle cx="158" cy="278" r="3" fill="#3b82f6" />

              <rect x="192" y="232" width="144" height="58" rx="8" fill="#0c192c" stroke="#eab308" strokeWidth="1.6" />
              <text x="264" y="249" textAnchor="middle" fill="#fde047" fontSize="9.5" fontWeight="bold">Relais Tasmota / Sonoff</text>
              <text x="264" y="264" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">L (in) · N (in) · SW (Inter. mural)</text>
              <text x="264" y="279" textAnchor="middle" fill="#fbbf24" fontSize="8.5">Sortie O → Phase Lampes/Fan</text>

              <path d="M336 264 H450" fill="none" stroke="#f59e0b" strokeWidth="2.6" />
              <text x="393" y="256" textAnchor="middle" fill="#fbbf24" fontSize="8.5" fontWeight="bold">Sortie O</text>

              <rect x="450" y="232" width="180" height="58" rx="8" fill="#0f172a" stroke="#facc15" strokeWidth="1.4" />
              <text x="540" y="251" textAnchor="middle" fill="#fef08a" fontSize="10" fontWeight="bold">Néon LED Salle + Extracteur</text>
              <text x="540" y="267" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Phase via O · Neutre N · Terre PE</text>
              <text x="540" y="281" textAnchor="middle" fill="#4ade80" fontSize="8">Actifs sur Batterie 15-20 kWh</text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-sky-300">Pourquoi le Contacteur 25A :</strong> Un compresseur de climatiseur tire jusqu&apos;à 15–20A au démarrage, ce qui collerait les contacts d&apos;un petit Shelly. Le Shelly pilote uniquement la bobine <code className="text-amber-300">A1/A2</code> (quelques milliampères), et le Contacteur 25A commute la puissance réelle vers le climatiseur.
          </p>
        </div>

        {/* SCHÉMA 3 : Branchement Secteur SNEL + Batterie 15-20 kWh + Onduleur Hybride */}
        <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4" />
              <span>3. Câblage Secteur SNEL + Batterie 15–20 kWh + Onduleur Hybride 8 kW</span>
            </h5>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Autonomie 6–8h
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox="0 0 660 280" className="w-full min-w-[540px] h-auto rounded-lg bg-[#050811] border border-slate-800">
              {/* SNEL */}
              <rect x="14" y="34" width="84" height="90" rx="8" fill="#0f172a" stroke="#64748b" />
              <text x="56" y="54" textAnchor="middle" fill="#e2e8f0" fontSize="10.5" fontWeight="bold">SNEL 230V</text>
              <text x="24" y="76" fill="#fb7185" fontSize="9.5">L (Phase)</text>
              <text x="24" y="94" fill="#60a5fa" fontSize="9.5">N (Neutre)</text>
              <text x="24" y="112" fill="#4ade80" fontSize="9.5">PE (Terre)</text>

              {/* Différentiel 30mA + Parafoudre */}
              <path d="M98 72 H132" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
              <path d="M98 90 H132" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
              <path d="M98 108 H132" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2" />

              <rect x="132" y="34" width="112" height="90" rx="8" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.6" />
              <text x="188" y="54" textAnchor="middle" fill="#fda4af" fontSize="10" fontWeight="bold">Disj. 40A + 30mA</text>
              <text x="188" y="70" textAnchor="middle" fill="#cbd5e1" fontSize="9">+ Parafoudre AC</text>
              <text x="188" y="92" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Protection joueurs</text>
              <text x="188" y="106" textAnchor="middle" fill="#94a3b8" fontSize="8.5">&amp; anti-surtension</text>

              {/* Vers Onduleur Hybride */}
              <path d="M244 72 H286" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
              <path d="M244 90 H286" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
              <text x="265" y="65" textAnchor="middle" fill="#94a3b8" fontSize="8">AC IN</text>

              {/* Onduleur Hybride 8 kW */}
              <rect x="286" y="22" width="144" height="114" rx="10" fill="#171207" stroke="#f59e0b" strokeWidth="2" />
              <text x="358" y="44" textAnchor="middle" fill="#fcd34d" fontSize="11" fontWeight="bold">Onduleur Hybride 8kW</text>
              <text x="358" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">Convertisseur 48V ↔ 230V</text>
              <text x="358" y="80" textAnchor="middle" fill="#4ade80" fontSize="8.5">AC OUT 1 : Secouru Batterie</text>
              <text x="358" y="96" textAnchor="middle" fill="#fbbf24" fontSize="8.5">AC OUT 2 : Délesté (Clims)</text>
              <text x="358" y="122" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Bornes DC : + Rouge / - Noir</text>

              {/* Bus Batterie 15-20 kWh */}
              <path d="M340 136 V182" fill="none" stroke="#ef4444" strokeWidth="4" />
              <path d="M376 136 V182" fill="none" stroke="#94a3b8" strokeWidth="4" />
              <text x="326" y="164" fill="#fca5a5" fontSize="9" fontWeight="bold">+48V</text>
              <text x="394" y="164" fill="#cbd5e1" fontSize="9" fontWeight="bold">-48V</text>

              <rect x="256" y="182" width="204" height="76" rx="10" fill="#0f172a" stroke="#eab308" strokeWidth="1.8" />
              <text x="358" y="206" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="bold">Batterie Lithium 15–20 kWh</text>
              <text x="358" y="224" textAnchor="middle" fill="#cbd5e1" fontSize="9">48V / 51.2V LiFePO4 + BMS + Fusible 200A</text>
              <text x="358" y="242" textAnchor="middle" fill="#4ade80" fontSize="8.5">Secourt Réseau, Caisse, Lumières &amp; 10 Postes</text>

              {/* Sorties Tableau Divisionnaire */}
              <path d="M430 64 H476" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
              <path d="M430 78 H476" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
              <path d="M430 100 H476" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeDasharray="4 2" />

              <rect x="476" y="20" width="170" height="238" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <text x="561" y="40" textAnchor="middle" fill="#e2e8f0" fontSize="10.5" fontWeight="bold">Coffret Rail DIN (Départs)</text>

              <rect x="488" y="52" width="146" height="44" rx="6" fill="#082f49" stroke="#38bdf8" />
              <text x="561" y="70" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontWeight="bold">Disj. 10A Réseau &amp; Caisse</text>
              <text x="561" y="84" textAnchor="middle" fill="#cbd5e1" fontSize="8">Starlink, MikroTik, PC, Imp. 80mm</text>

              <rect x="488" y="104" width="146" height="44" rx="6" fill="#052e16" stroke="#22c55e" />
              <text x="561" y="122" textAnchor="middle" fill="#86efac" fontSize="9.5" fontWeight="bold">Disj. 16A Postes PS4 &amp; PS5</text>
              <text x="561" y="136" textAnchor="middle" fill="#cbd5e1" fontSize="8">Postes 1–8 (PS4) &amp; 9–10 (PS5)</text>

              <rect x="488" y="156" width="146" height="40" rx="6" fill="#2e2405" stroke="#eab308" />
              <text x="561" y="173" textAnchor="middle" fill="#fde047" fontSize="9.5" fontWeight="bold">Disj. 10A Lumières &amp; Fan</text>
              <text x="561" y="187" textAnchor="middle" fill="#cbd5e1" fontSize="8">Néon/LED (.140) &amp; Extracteur (.143)</text>

              <rect x="488" y="204" width="146" height="42" rx="6" fill="#2b0f12" stroke="#f59e0b" />
              <text x="561" y="221" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontWeight="bold">Disj. 25A Clims (Délestées)</text>
              <text x="561" y="235" textAnchor="middle" fill="#cbd5e1" fontSize="8">Clim 1 (.141) &amp; Clim 2 (.142)</text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-amber-300">Gestion batterie 15–20 kWh :</strong> La sortie <code className="text-emerald-300">AC OUT 1</code> secourt tout ce qui rapporte (Starlink, MikroTik, PC, Imprimante, 10 Consoles, Lumières, Extracteur), tandis que la sortie <code className="text-amber-300">AC OUT 2 (ou SNEL direct)</code> alimente les 2 gros climatiseurs pour éviter de vider la batterie pendant les coupures.
          </p>
        </div>

        {/* SCHÉMA 4 : Branchements Routeur MikroTik vers Tous les Appareils */}
        <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Router className="w-4 h-4" />
              <span>4. Branchements Complets du Routeur MikroTik vers Tous les Appareils</span>
            </h5>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              RJ45 + Wi-Fi 2.4GHz + VLAN
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox="0 0 660 280" className="w-full min-w-[540px] h-auto rounded-lg bg-[#050811] border border-slate-800">
              {/* Alimentation Secourue */}
              <rect x="14" y="16" width="136" height="74" rx="8" fill="#171207" stroke="#f59e0b" />
              <text x="82" y="36" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold">Multiprise Onduleur</text>
              <text x="82" y="51" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">(Disj. 10A Secouru 230V)</text>
              <text x="82" y="67" textAnchor="middle" fill="#94a3b8" fontSize="8">Alimente : Starlink, MikroTik,</text>
              <text x="82" y="79" textAnchor="middle" fill="#94a3b8" fontSize="8">PC GOZA &amp; Imprimante 80mm</text>

              {/* Flèches alim 230V vers Starlink & MikroTik */}
              <path d="M150 40 H200" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <path d="M150 68 H180 V128 H200" fill="none" stroke="#f59e0b" strokeWidth="2" />

              {/* Starlink */}
              <rect x="200" y="16" width="176" height="62" rx="8" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.6" />
              <text x="288" y="37" textAnchor="middle" fill="#93c5fd" fontSize="10.5" fontWeight="bold">Routeur Starlink (Bypass)</text>
              <text x="288" y="53" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Parabole extérieure → Mode Pont</text>
              <text x="288" y="67" textAnchor="middle" fill="#38bdf8" fontSize="8">Sortie RJ45 → Port ether1 (WAN)</text>

              {/* RJ45 Starlink -> MikroTik ether1 */}
              <path d="M288 78 V112" fill="none" stroke="#3b82f6" strokeWidth="2.8" />
              <text x="330" y="99" fill="#60a5fa" fontSize="8.5" fontWeight="bold">RJ45 Cat6 (WAN)</text>

              {/* Routeur MikroTik Central */}
              <rect x="176" y="112" width="234" height="96" rx="10" fill="#081c2e" stroke="#22d3ee" strokeWidth="2" />
              <text x="293" y="132" textAnchor="middle" fill="#22d3ee" fontSize="11.5" fontWeight="bold">Routeur MikroTik (192.168.1.1)</text>
              <text x="190" y="150" fill="#93c5fd" fontSize="9">• ether1 (WAN) : Reçoit Internet Starlink</text>
              <text x="190" y="165" fill="#86efac" fontSize="9">• ether2 (LAN) : Câble RJ45 → PC GOZA (.100)</text>
              <text x="190" y="180" fill="#67e8f9" fontSize="9">• Wi-Fi 2.4GHz GOZA-IoT : Sans isolation</text>
              <text x="190" y="195" fill="#d8b4fe" fontSize="9">• Wi-Fi GOZA-Guest : VLAN isolé Clients</text>

              {/* Connexion ether2 vers PC GOZA & Imprimante */}
              <path d="M240 208 V224 H136 V232" fill="none" stroke="#22c55e" strokeWidth="2.5" />
              <rect x="14" y="216" width="234" height="52" rx="8" fill="#0f172a" stroke="#22c55e" strokeWidth="1.5" />
              <text x="131" y="234" textAnchor="middle" fill="#86efac" fontSize="10" fontWeight="bold">PC GOZA (.100) → Imprimante 80mm → Tiroir</text>
              <text x="131" y="249" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">PC sur ether2 (RJ45) | Imprimante en USB/LAN | Tiroir RJ11</text>

              {/* Wi-Fi 2.4GHz vers tous les Shelly */}
              <path d="M410 144 H466" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="5 3" />
              <rect x="466" y="86" width="180" height="114" rx="8" fill="#0c192c" stroke="#22d3ee" strokeWidth="1.5" />
              <text x="556" y="106" textAnchor="middle" fill="#67e8f9" fontSize="10" fontWeight="bold">Wi-Fi 2.4GHz GOZA-IoT</text>
              <text x="476" y="124" fill="#cbd5e1" fontSize="8.5">• 8× Shelly Postes (.122–.128, .130)</text>
              <text x="476" y="140" fill="#fde047" fontSize="8.5">• Relais Lumières (.140)</text>
              <text x="476" y="156" fill="#7dd3fc" fontSize="8.5">• Relais Clim 1 (.141) &amp; Clim 2 (.142)</text>
              <text x="476" y="172" fill="#5eead4" fontSize="8.5">• Relais Extracteur (.143)</text>
              <text x="476" y="188" fill="#d8b4fe" fontSize="8.5">• Tablette Gérant (Supervision LAN)</text>

              {/* VLAN Guest & Cloud */}
              <path d="M410 186 H466 V236" fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="4 3" />
              <rect x="466" y="212" width="180" height="56" rx="8" fill="#1b102c" stroke="#a855f7" strokeWidth="1.4" />
              <text x="556" y="232" textAnchor="middle" fill="#e9d5ff" fontSize="9.5" fontWeight="bold">VLAN Guest + Cloud Starlink</text>
              <text x="556" y="247" textAnchor="middle" fill="#cbd5e1" fontSize="8">Joueurs (Portail QR) + WhatsApp Meta</text>
              <text x="556" y="259" textAnchor="middle" fill="#fda4af" fontSize="8">Pare-feu : bloqué vers IP .100 à .150</text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-cyan-300">Règle d&apos;or MikroTik :</strong> Le PC Caissier GOZA (<code>ether2</code>) et le Wi-Fi <code>GOZA-IoT</code> doivent être dans le <strong>même Bridge LAN</strong> (sans isolation client) avec <strong>DHCP Statique</strong> pour que chaque ordre ticket atteigne les Shelly instantanément, même si Starlink est coupé.
          </p>
        </div>
      </div>

      {/* Tableau Récapitulatif de Câblage Poste par Poste (1 à 10) + Clim + Lumières */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <h5 className="text-xs font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Tableau de Câblage Précis — Élément par Élément (Secteur 230V + Routeur MikroTik)</span>
        </h5>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-2 px-3">Appareil</th>
                <th className="py-2 px-3">Branchement Secteur 230V (L / N / PE)</th>
                <th className="py-2 px-3">Branchement Routeur MikroTik / Caisse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              {effectiveStations.map((st) => {
                const exempt = isStationShellyExempt(st.id, settings);
                const ip = `192.168.1.${120 + st.id}`;
                return (
                  <tr key={st.id}>
                    <td className="py-2 px-3 font-semibold text-white">
                      {st.name}{' '}
                      <span className="text-[10px] font-mono text-cyan-400">[{st.type}]</span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {exempt ? (
                        <span className="text-amber-300 font-medium">
                          Disj. 16A → Prise directe Écran TV + Console (Phase L, Neutre N, Terre PE) — <strong>Exempté</strong>
                        </span>
                      ) : (
                        <span>
                          Disj. 16A → Shelly (<code>L</code>, <code>N</code>) → Sortie <code className="text-amber-300">O</code> vers Phase TV · Console sur <code>L/N/PE</code> protégé
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300">
                      {exempt
                        ? 'Pas de pilotage auto ticket (contrôle manuel)'
                        : `Wi-Fi 2.4GHz GOZA-IoT (IP fixe ${ip}) ↔ PC .100`}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-2 px-3 font-semibold text-yellow-300">Éclairage Néon &amp; LED Salle</td>
                <td className="py-2 px-3 text-slate-300">
                  Disj. 10A (Batterie) → Relais (<code>L</code>, <code>N</code>) → Sortie <code className="text-amber-300">O</code> vers Phase Lampes/Néon · Neutre direct
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">Wi-Fi 2.4GHz GOZA-IoT (IP fixe 192.168.1.140)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-sky-300">Climatiseur 1 (Zone PS5) &amp; Climatiseur 2 (Zone PS4)</td>
                <td className="py-2 px-3 text-slate-300">
                  Disj. 25A → Contacteur 25A (<code>L1/L2</code> → <code>T1/T2</code> → Clim) · Shelly <code className="text-amber-300">O</code> → bobine <code>A1</code>, <code>N</code> → <code>A2</code>
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">Wi-Fi 2.4GHz GOZA-IoT (IP fixes .141 &amp; .142)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-teal-300">Extracteur d&apos;air &amp; Ventilation</td>
                <td className="py-2 px-3 text-slate-300">
                  Disj. 10A (Batterie) → Relais (<code>L</code>, <code>N</code>) → Sortie <code className="text-amber-300">O</code> vers Phase Extracteur · Neutre &amp; Terre directs
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">Wi-Fi 2.4GHz GOZA-IoT (IP fixe 192.168.1.143)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-300">Starlink + MikroTik + PC GOZA + Imprimante 80mm</td>
                <td className="py-2 px-3 text-slate-300">
                  Disj. 10A (Sortie Onduleur Hybride + Batterie 15–20 kWh) → Multiprise parafoudre secourue
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">
                  Starlink→ether1 · ether2→PC (.100) · USB/LAN→Imp. 80mm→RJ11 Tiroir
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
