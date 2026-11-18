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
        <div className="flex flex-wrap gap-2.5 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-rose-500" /> Câble Courant 230V (Phase L Rouge / Neutre N Bleu / Terre PE Vert-Jaune)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-amber-400" /> Phase Commandée (O - Orange, sortie Shelly)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-blue-500" /> Câble Réseau RJ45 Cat6 (Starlink → MikroTik → Switch 16p → PC &amp; Consoles)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-purple-400" /> Câble Imprimante USB/LAN + Lecteur QR 2D USB + Tiroir RJ11
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
            <span className="w-3 h-1.5 rounded-full bg-cyan-400" /> Wi-Fi 2.4 GHz IoT (Relais Shelly &amp; Capteur Température .144)
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

              {/* Capteur Température Auto Thermostat */}
              <path d="M558 136 V164 H227 V178" fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeDasharray="4 2" />
              <rect x="442" y="144" width="188" height="38" rx="6" fill="#082f49" stroke="#38bdf8" strokeWidth="1.4" />
              <text x="536" y="160" textAnchor="middle" fill="#67e8f9" fontSize="9" fontWeight="bold">Capteur Temp. Shelly H&amp;T / DS18B20 (.144)</text>
              <text x="536" y="174" textAnchor="middle" fill="#cbd5e1" fontSize="8">Auto ON &ge;27°C / OFF &le;23.5°C (Thermostat GOZA)</text>

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
            <strong className="text-sky-300">Thermostat Auto + Contacteur 25A + Protection AVR :</strong> La sonde <code className="text-cyan-300">Shelly Plus H&amp;T / Add-On DS18B20 (.144)</code> mesure la chaleur réelle selon vos seuils configurés (ex. ON &ge;27°C / OFF &le;23.5°C). Ajoutez un <strong>Parafoudre Type 2 / Régulateur AVR</strong> en amont des disjoncteurs 25A pour protéger les compresseurs contre les variations SNEL.
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

        {/* SCHÉMA 4 : Branchements Routeur MikroTik + Switch 16p + Hotspot Wi-Fi Captif + Borne AP PoE */}
        <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Router className="w-4 h-4" />
              <span>4. Réseau MikroTik + Switch 16p + Hotspot Captif GOZA-WiFi (ether4 AP PoE)</span>
            </h5>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              RJ45 Cat6 + VLAN Guest + USB/RJ11
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox="0 0 660 320" className="w-full min-w-[540px] h-auto rounded-lg bg-[#050811] border border-slate-800">
              {/* Alimentation Secourue (Courant 230V Orange/Rouge) */}
              <rect x="14" y="14" width="136" height="72" rx="8" fill="#171207" stroke="#f59e0b" />
              <text x="82" y="33" textAnchor="middle" fill="#fcd34d" fontSize="9.5" fontWeight="bold">Baie 6U + Mini-UPS &lt;10ms</text>
              <text x="82" y="47" textAnchor="middle" fill="#cbd5e1" fontSize="8">Courant 230V Secouru (10A)</text>
              <text x="82" y="61" textAnchor="middle" fill="#94a3b8" fontSize="7.6">Starlink, MikroTik, Switch 16p,</text>
              <text x="82" y="73" textAnchor="middle" fill="#94a3b8" fontSize="7.6">PoE 48V, PC, Imp. 80mm &amp; QR 2D</text>

              {/* Câbles courant 230V */}
              <path d="M150 38 H194" fill="none" stroke="#f97316" strokeWidth="2.4" />
              <path d="M150 64 H172 V128 H194" fill="none" stroke="#f97316" strokeWidth="2.4" />

              {/* Starlink */}
              <rect x="194" y="14" width="218" height="62" rx="8" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.6" />
              <text x="303" y="32" textAnchor="middle" fill="#93c5fd" fontSize="9.8" fontWeight="bold">Starlink (Bypass) ↔ Cloud &amp; Espace Client</text>
              <text x="303" y="47" textAnchor="middle" fill="#cbd5e1" fontSize="7.6">Résa Mobile Money OTP (&ge;3h, annulation 1h avant)</text>
              <text x="303" y="62" textAnchor="middle" fill="#38bdf8" fontSize="8">Câble RJ45 Cat6 → ether1 (WAN MikroTik)</text>

              {/* RJ45 Cat6 Bleu Starlink -> MikroTik */}
              <path d="M303 76 V100" fill="none" stroke="#3b82f6" strokeWidth="3" />
              <text x="356" y="91" fill="#60a5fa" fontSize="8" fontWeight="bold">RJ45 Cat6 (WAN)</text>

              {/* Routeur MikroTik Central */}
              <rect x="164" y="100" width="268" height="106" rx="10" fill="#081c2e" stroke="#22d3ee" strokeWidth="2" />
              <text x="298" y="118" textAnchor="middle" fill="#22d3ee" fontSize="10.3" fontWeight="bold">Routeur MikroTik + Portail Captif Hotspot</text>
              <text x="176" y="134" fill="#93c5fd" fontSize="8.2">• ether1 : WAN Starlink (+ WireGuard VPN)</text>
              <text x="176" y="148" fill="#60a5fa" fontSize="8.2">• ether2 : RJ45 Cat6 → PC GOZA (.100) + API Hotspot</text>
              <text x="176" y="162" fill="#38bdf8" fontSize="8.2">• ether3 : RJ45 Cat6 → Switch 16p → 10 Consoles</text>
              <text x="176" y="176" fill="#c084fc" fontSize="8.1">• ether4 (PoE 48V/VLAN50) : AP → GOZA-WiFi (1–4 app.)</text>
              <text x="176" y="190" fill="#67e8f9" fontSize="8.1">• WLAN 2.4GHz : GOZA-IoT isolé (Relais Shelly .122–.144)</text>

              {/* RJ45 ether2 -> PC GOZA & Imprimante USB/Tiroir RJ11 + Lecteur QR 2D */}
              <path d="M210 206 V226 H125 V234" fill="none" stroke="#3b82f6" strokeWidth="2.8" />
              <rect x="12" y="234" width="226" height="72" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="1.6" />
              <text x="125" y="251" textAnchor="middle" fill="#86efac" fontSize="9.1" fontWeight="bold">PC Caisse (.100) + Imp. 80mm + Scan QR 2D</text>
              <text x="125" y="266" textAnchor="middle" fill="#60a5fa" fontSize="7.7">RJ45 ether2 · Scan RES-XXXX (retard auto-déduit)</text>
              <text x="125" y="280" textAnchor="middle" fill="#d8b4fe" fontSize="7.7">USB Lecteur QR 2D + Câble Imp. USB/LAN (Wi-Fi GZ)</text>
              <text x="125" y="294" textAnchor="middle" fill="#94a3b8" fontSize="7.6">Câble Tiroir-Caisse RJ11 · Zéro résa sur place</text>

              {/* RJ45 ether3 -> Switch Gigabit 16 Ports -> 10 Consoles */}
              <path d="M298 206 V234" fill="none" stroke="#3b82f6" strokeWidth="2.8" />
              <rect x="248" y="234" width="194" height="72" rx="8" fill="#091a32" stroke="#3b82f6" strokeWidth="1.6" />
              <text x="345" y="251" textAnchor="middle" fill="#93c5fd" fontSize="9.3" fontWeight="bold">Switch Gigabit 16 Ports (RJ45)</text>
              <text x="345" y="266" textAnchor="middle" fill="#cbd5e1" fontSize="7.9">Câbles RJ45 Cat6 → Consoles PS4 / PS5 / Xbox</text>
              <text x="345" y="280" textAnchor="middle" fill="#4ade80" fontSize="7.9">Latence zéro · Zéro saturation Wi-Fi Shelly</text>
              <text x="345" y="294" textAnchor="middle" fill="#67e8f9" fontSize="7.7">Port 16 : Réserve extension consoles</text>

              {/* Wi-Fi 2.4GHz vers Shelly & Capteur Temp */}
              <path d="M432 132 H466" fill="none" stroke="#22d3ee" strokeWidth="2.4" strokeDasharray="5 3" />
              <rect x="466" y="74" width="182" height="114" rx="8" fill="#0c192c" stroke="#22d3ee" strokeWidth="1.5" />
              <text x="557" y="92" textAnchor="middle" fill="#67e8f9" fontSize="9.3" fontWeight="bold">Wi-Fi 2.4GHz GOZA-IoT (Privé)</text>
              <text x="476" y="108" fill="#cbd5e1" fontSize="7.9">• 8× Shelly Postes (.122–.128, .130)</text>
              <text x="476" y="123" fill="#fde047" fontSize="7.9">• Relais Lumières (.140)</text>
              <text x="476" y="138" fill="#7dd3fc" fontSize="7.9">• Clims (.141/.142) + Fan (.143)</text>
              <text x="476" y="153" fill="#38bdf8" fontSize="7.9" fontWeight="bold">• Capteur Temp. H&amp;T/DS18B20 (.144)</text>
              <text x="476" y="168" fill="#4ade80" fontSize="7.9">• Pilotage local 100% isolé clients</text>

              {/* Borne Wi-Fi PoE Guest Hotspot GOZA-WiFi */}
              <path d="M396 206 V218 H554 V234" fill="none" stroke="#c084fc" strokeWidth="2.6" />
              <text x="474" y="214" textAnchor="middle" fill="#d8b4fe" fontSize="7.8" fontWeight="bold">ether4 RJ45 PoE 48V (VLAN 50)</text>
              <rect x="454" y="234" width="194" height="72" rx="8" fill="#1b0e2e" stroke="#a855f7" strokeWidth="1.6" />
              <text x="551" y="251" textAnchor="middle" fill="#e9d5ff" fontSize="9.1" fontWeight="bold">Borne AP Haute Densité &quot;GOZA-WiFi&quot;</text>
              <text x="551" y="266" textAnchor="middle" fill="#d8b4fe" fontSize="7.7">Hotspot MikroTik · Code GZ-XXXXXX (&ge;1h)</text>
              <text x="551" y="280" textAnchor="middle" fill="#fbbf24" fontSize="7.7" fontWeight="bold">1h:1 · 3h:2 · 4h:3 · 5h+:4 app. (shared-users)</text>
              <text x="551" y="294" textAnchor="middle" fill="#94a3b8" fontSize="7.5">Actif File d&apos;attente → Fin (Retard déduit)</text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-cyan-300">Hotspot Captif Multi-Appareils &amp; Réservations Client Exclusives :</strong> Le MikroTik gère le Portail Captif <code>GOZA-WiFi</code> (VLAN 50 sur <code>ether4</code> via <strong>Injecteur PoE 48V + Borne AP Haute Densité</strong>, isolée des Shelly). Selon la durée payée, GOZA assigne automatiquement le profil MikroTik adapté : <strong>1h–2h : 1 appareil</strong>, <strong>3h : 2 appareils</strong>, <strong>4h : 3 appareils</strong>, <strong>5h+ : 4 appareils</strong>. Les réservations se font <strong>uniquement depuis l&apos;Espace Client</strong> (Mobile Money + OTP &ge; 3h + 15%, annulable &ge; 1h avant) avec scan rapide par <strong>Lecteur QR 2D USB</strong> au guichet et déduction automatique des minutes de retard.
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
                  Disj. 25A + Parafoudre/AVR → Contacteur 25A (<code>L1/L2</code> → <code>T1/T2</code> → Clim) · Shelly <code className="text-amber-300">O</code> → bobine <code>A1</code>, <code>N</code> → <code>A2</code>
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
                <td className="py-2 px-3 font-semibold text-sky-300">Capteur Température &amp; Humidité (Thermostat Clim)</td>
                <td className="py-2 px-3 text-slate-300">
                  USB-C 5V permanent (ou piles) pour Shelly Plus H&amp;T · ou sur bornier Shelly Plus Add-On + sonde DS18B20
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">Wi-Fi 2.4GHz GOZA-IoT (IP fixe 192.168.1.144) → Clims .141/.142</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-blue-300">Switch Gigabit 16 Ports (Consoles)</td>
                <td className="py-2 px-3 text-slate-300">
                  Câble Courant 230V sur PDU Baie 6U + Mini-UPS &lt;10ms (Disj. 10A secouru Batterie 15–20 kWh)
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">
                  Câble Réseau RJ45 Cat6 : MikroTik ether3 → Switch → Consoles PS4 / PS5 / Xbox
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-purple-300">Borne Wi-Fi AP Haute Densité + Injecteur PoE 48V</td>
                <td className="py-2 px-3 text-slate-300">
                  Injecteur PoE 48V branché sur PDU Baie 6U secouru (Disj. 10A Batterie 15–20 kWh)
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">
                  RJ45 Cat6 MikroTik ether4 → Injecteur PoE → AP (VLAN 50 · 1h:1, 3h:2, 4h:3, 5h+:4 app.)
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-300">Starlink + MikroTik + Baie 6U + Mini-UPS Caisse</td>
                <td className="py-2 px-3 text-slate-300">
                  Câble Courant 230V (Disj. 10A Onduleur + Batterie 15–20 kWh) → Mini-UPS &lt;10ms → Bandeau PDU Rack 6U
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">
                  RJ45 Cat6 : Starlink→ether1, ether2→PC (.100) | Baie murale 6U ventilée anti-poussière
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-amber-300">Imprimante 80mm + Lecteur QR 2D USB + Tiroir-Caisse</td>
                <td className="py-2 px-3 text-slate-300">
                  Alimentation 24V/230V Imprimante sur Mini-UPS &lt;10ms · Lecteur QR 2D alimenté par port USB PC
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">
                  Câble USB/LAN Imp. 80mm + Câble USB Lecteur QR (scan RES-XXXX / /t/:token) + RJ11 Tiroir
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
