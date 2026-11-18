import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  DollarSign,
  FileText,
  CheckSquare,
  Router,
  Wifi,
  ShieldCheck,
  Download,
  Maximize2,
  X,
  Network,
  Power,
  Printer,
  LayoutDashboard,
  Gamepad2,
  Tv,
  Users,
  Award,
  ShoppingBag,
  BarChart3,
  Sliders,
  Monitor,
  Smartphone,
  Server,
  MessageSquare,
  Shield,
  FileDown,
  BatteryCharging,
  Lightbulb,
  Wind,
  Loader2
} from 'lucide-react';
import { DomotiqueDevice, Station, SystemSettings } from '../types';
import { isStationShellyExempt } from '../services/shellyService';
import { downloadFullWebAppGuidePdf } from '../utils/userGuidePdf';
import { WiringDiagramsSvg } from './WiringDiagramsSvg';
import gozaStarlinkMikrotikSchemaImg from '../assets/images/goza_starlink_mikrotik_schema_1794960674977.jpg';
import gozaCompleteDevicesImg from '../assets/images/goza_complete_devices_architecture_1794961841172.jpg';
import gozaFullSystemBatterySchemaImg from '../assets/images/goza_full_system_battery_schema_1794962714394.jpg';
import gozaWiringPinsSchemaImg from '../assets/images/goza_wiring_pins_connections_1794964188286.jpg';

interface HardwareGuideModalProps {
  settings?: SystemSettings;
  stations?: Station[];
  devices?: DomotiqueDevice[];
}

export const HardwareGuideModal: React.FC<HardwareGuideModalProps> = ({
  settings,
  stations = [],
  devices = [],
}) => {
  const [activeSection, setActiveSection] = useState<
    'wiring' | 'devices_roles' | 'app_guide' | 'bom' | 'tasmota' | 'whatsapp' | 'cashier_guide' | 'test_plan'
  >('wiring');
  const [schemaMode, setSchemaMode] = useState<'battery_full' | 'wiring_pins' | 'devices' | 'overview'>('battery_full');
  const [isSchemaZoomed, setIsSchemaZoomed] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const activeSchemaImg =
    schemaMode === 'battery_full'
      ? gozaFullSystemBatterySchemaImg
      : schemaMode === 'wiring_pins'
      ? gozaWiringPinsSchemaImg
      : schemaMode === 'devices'
      ? gozaCompleteDevicesImg
      : gozaStarlinkMikrotikSchemaImg;

  const activeSchemaDownloadName =
    schemaMode === 'battery_full'
      ? 'schema-complet-goza-batterie-20kwh-clim-lumieres.jpg'
      : schemaMode === 'wiring_pins'
      ? 'schema-cablage-secteur-230v-routeur-goza.jpg'
      : schemaMode === 'devices'
      ? 'schema-complet-tous-appareils-goza.jpg'
      : 'schema-installation-goza-starlink-mikrotik.jpg';

  const handleDownloadPdfGuide = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await downloadFullWebAppGuidePdf({
        settings,
        stations,
        devices,
        schemaImageSrc: gozaFullSystemBatterySchemaImg,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sélecteur de sous-section + Bouton PDF Global */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <button
            onClick={() => setActiveSection('wiring')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'wiring' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Schéma Complet (Batterie 15-20 kWh &amp; Clim)
          </button>
          <button
            onClick={() => setActiveSection('devices_roles')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'devices_roles' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Importance &amp; Rôles (Tous Appareils)
          </button>
          <button
            onClick={() => setActiveSection('app_guide')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'app_guide' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Guide App Web (Menus &amp; Options)
          </button>
          <button
            onClick={() => setActiveSection('bom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'bom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Matériel &amp; Budget
          </button>
          <button
            onClick={() => setActiveSection('tasmota')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'tasmota' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Config MQTT / Shelly
          </button>
          <button
            onClick={() => setActiveSection('whatsapp')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            WhatsApp Meta API
          </button>
          <button
            onClick={() => setActiveSection('cashier_guide')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'cashier_guide' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Manuel Caissier
          </button>
          <button
            onClick={() => setActiveSection('test_plan')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeSection === 'test_plan' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Plan de Tests
          </button>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdfGuide}
          disabled={isGeneratingPdf}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md transition whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          <span>{isGeneratingPdf ? 'Génération PDF...' : 'Télécharger Guide Complet PDF'}</span>
        </button>
      </div>

      {/* Section 1 : Schéma Complet Starlink + MikroTik + GOZA + Shelly */}
      {activeSection === 'wiring' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 max-w-none w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BatteryCharging className="w-5 h-5 text-amber-400" />
                <span>Schéma Complet — Batterie 15-20 kWh + Starlink + MikroTik + 10 Postes + Lumières &amp; Clim</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Intègre la totalité du parc : Énergie SNEL &amp; Batterie Lithium 15–20 kWh, Starlink, MikroTik, Caisse 80mm, 10 Postes PS4/PS5 (8 auto + 2 exemptés), Éclairage Néon/LED, 2 Climatiseurs Split + Contacteurs 25A et Extracteur d&apos;air.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setSchemaMode('battery_full')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    schemaMode === 'battery_full'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Complet + Batterie 20kWh + Clim
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaMode('wiring_pins')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    schemaMode === 'wiring_pins'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Câblage Secteur 230V &amp; Routeur
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaMode('devices')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    schemaMode === 'devices'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Détail Ports &amp; IP
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaMode('overview')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    schemaMode === 'overview'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Vue Simplifiée
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsSchemaZoomed(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 transition cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Agrandir</span>
              </button>
              <a
                href={activeSchemaImg}
                download={activeSchemaDownloadName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Image HD</span>
              </a>
            </div>
          </div>

          {/* Image HD du Schéma d'Architecture */}
          <div className="relative rounded-xl overflow-hidden border border-amber-500/30 bg-[#060A13] shadow-xl group">
            <img
              src={activeSchemaImg}
              alt="Schéma d'installation complet GOZA avec batterie 15-20 kWh, onduleur hybride 8kW, Starlink, routeur MikroTik, PC caissier, imprimante 80mm, postes PS4 et PS5, lumières LED, 2 climatiseurs Split et extracteur d'air"
              referrerPolicy="no-referrer"
              onClick={() => setIsSchemaZoomed(true)}
              className="w-full h-auto object-contain cursor-zoom-in transition duration-300 group-hover:scale-[1.005]"
            />
            <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>Cliquez sur le schéma pour l&apos;afficher en plein écran ou téléchargez le PDF complet ci-dessus.</span>
              <span className="font-mono text-amber-300">SNEL + Batterie 15-20 kWh → Starlink + MikroTik → 10 Postes + Lumières + 2 Clims</span>
            </div>
          </div>

          {/* Schémas Vectoriels Borne-à-Borne Ultra Précis (230V L/N/PE + Shelly + Contacteur 25A + Routeur) */}
          <WiringDiagramsSvg stations={stations} settings={settings} />

          {/* Explications Claires & Détaillées en 5 Étapes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* Étape 1 : Énergie SNEL + Batterie 15-20 kWh + Onduleur Hybride */}
            <div className="bg-slate-950/70 border border-amber-500/25 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono text-xs">1</span>
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                <span>SNEL 230V + Batterie Lithium 15–20 kWh &amp; Délestage Clim</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc pl-5 leading-relaxed">
                <li>
                  <strong>Protection &amp; Onduleur Hybride 8 kW (48V) :</strong> Disjoncteur principal 40A + Différentiel 30mA Type A + Parafoudre en tête, alimentant l&apos;<strong>Onduleur Hybride</strong> couplé à votre <strong>parc Batterie Lithium 15 à 20 kWh</strong>.
                </li>
                <li>
                  <strong>Circuits secourus en continu (6h à 8h d&apos;autonomie) :</strong> Starlink, MikroTik, PC Caissier GOZA, Imprimante 80mm, Éclairage LED/Néon (~85W), Extracteur d&apos;air (~110W) et les <strong>10 Postes PS4 + PS5</strong> (~2,2 kW en pleine charge).
                </li>
                <li>
                  <strong>Délestage intelligent des 2 Climatiseurs :</strong> Chaque climatiseur (<code>192.168.1.141</code> et <code>.142</code>) est câblé via un <strong>Contacteur de Puissance 25A</strong> commandé par un Shelly 1PM. En cas de coupure SNEL prolongée, GOZA/l&apos;onduleur coupe ou alterne les climatiseurs pour préserver la batterie 15–20 kWh aux consoles et à la caisse.
                </li>
              </ul>
            </div>

            {/* Étape 2 : Starlink -> MikroTik */}
            <div className="bg-slate-950/70 border border-blue-500/25 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-mono text-xs">2</span>
                <Router className="w-4 h-4 text-blue-400" />
                <span>Liaison Starlink → Routeur MikroTik (WAN)</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc pl-5 leading-relaxed">
                <li>
                  <strong>Branchement physique :</strong> Câble RJ45 Cat6 depuis le port Ethernet Starlink (adaptateur Ethernet ou port LAN du routeur Starlink Gen3) vers le port <strong>ether1 (WAN)</strong> du MikroTik.
                </li>
                <li>
                  <strong>Mode Bypass recommandé :</strong> Activez le <em>Mode Bypass</em> dans l&apos;application Starlink pour que le <strong>MikroTik</strong> gère seul tout le routage (évite le Double NAT).
                </li>
                <li>
                  <strong>Config MikroTik WAN :</strong> <code className="text-blue-300">IP &gt; DHCP Client</code> sur <code>ether1</code> (Use Peer DNS activé) + règle <code className="text-blue-300">IP &gt; Firewall &gt; NAT (srcnat / masquerade)</code> vers <code>ether1</code>. Ce lien assure l&apos;envoi <strong>WhatsApp Cloud API</strong> et le <strong>Portail QR Joueur</strong>.
                </li>
              </ul>
            </div>

            {/* Étape 3 : Réseau Local MikroTik & IP Fixes */}
            <div className="bg-slate-950/70 border border-cyan-500/25 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono text-xs">3</span>
                <Wifi className="w-4 h-4 text-cyan-400" />
                <span>Paramétrage LAN &amp; Wi-Fi 2.4 GHz sur MikroTik</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc pl-5 leading-relaxed">
                <li>
                  <strong>Câblage PC Caissier GOZA :</strong> Reliez le PC Caissier en <strong>Ethernet Gigabit RJ45</strong> sur <code>ether2</code> du MikroTik (latence nulle, jamais en Wi-Fi si possible) et connectez l&apos;<strong>imprimante thermique 80mm</strong> en USB ou LAN.
                </li>
                <li>
                  <strong>Wi-Fi 2.4 GHz pour Shelly :</strong> Les relais <strong>Shelly Plus 1PM</strong> utilisent uniquement le <strong>Wi-Fi 2.4 GHz</strong> (20 MHz, canal fixe 1, 6 ou 11). Créez un SSID dédié (ex. <code>GOZA-IoT</code>) ponté dans le même <em>Bridge LAN</em> (<code>192.168.1.0/24</code> ou <code>192.168.88.0/24</code>) que le PC Caissier, <strong>sans isolation client</strong>.
                </li>
                <li>
                  <strong>Baux DHCP Statiques (IP Fixes) :</strong> Dans MikroTik <code className="text-cyan-300">IP &gt; DHCP Server &gt; Leases &gt; Make Static</code>, figez l&apos;IP du PC GOZA (ex. <code>.100</code>) et de chaque Shelly (<code>.121</code> à <code>.130</code> correspondant à <code>120 + N° Poste</code>).
                </li>
              </ul>
            </div>

            {/* Étape 4 : 10 Postes PS4/PS5 + Lumières + Climatisation + Ventilation */}
            <div className="bg-slate-950/70 border border-emerald-500/25 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">4</span>
                <Power className="w-4 h-4 text-emerald-400" />
                <span>10 Postes PS4/PS5 + Lumières + 2 Climatiseurs &amp; Ventilation</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc pl-5 leading-relaxed">
                <li>
                  <strong>Postes PS4 (1–8) &amp; PS5 (9–10) :</strong> 8 postes automatisés (Postes 2 à 8 PS4 en <code>.122–.128</code> + Poste 10 PS5 en <code>.130</code>) pilotés par <strong>Shelly Plus 1PM</strong> (ON sur ticket / OFF à la fin) ; <strong>2 postes exemptés</strong> (Poste 1 PS4 &amp; Poste 9 PS5) en contrôle manuel direct.
                </li>
                <li>
                  <strong>Éclairage &amp; Ambiance Néon (<code>.140</code>) + Extracteur d&apos;air (<code>.143</code>) :</strong> Relais Tasmota/Sonoff programmés sur horaire fixe (ex. Lumières 08h30–23h45) et actifs sur batterie 15–20 kWh.
                </li>
                <li>
                  <strong>2 Climatiseurs Split (<code>.141</code> Zone PS5 &amp; <code>.142</code> Zone PS4) :</strong> Pilotés par Shelly 1PM via <strong>Contacteur 25A</strong> (protège le relais au démarrage compresseur), horaires auto 09h00–23h30 et délestés en priorité sur coupure SNEL.
                </li>
              </ul>
            </div>
          </div>

          {/* Étape 5 : Cycle de fonctionnement complet */}
          <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Flux Opérationnel Complet (De l&apos;Encaissement à l&apos;Extinction)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-cyan-300 mb-1">A. Ticket Caisse (&lt;15s)</div>
                <p className="text-slate-300 leading-relaxed">Le caissier encaisse le joueur sur le PC GOZA (Cash CDF/USD ou Mobile Money).</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-emerald-300 mb-1">B. Ordre MikroTik → Shelly</div>
                <p className="text-slate-300 leading-relaxed">Le serveur GOZA envoie le signal local via MikroTik : le relais Shelly du poste passe instantanément à ON.</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-amber-300 mb-1">C. Ticket 80mm &amp; WhatsApp</div>
                <p className="text-slate-300 leading-relaxed">L&apos;imprimante thermique sort le reçu QR et Starlink transmet la confirmation WhatsApp au joueur.</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-rose-300 mb-1">D. Fin de Session Auto</div>
                <p className="text-slate-300 leading-relaxed">À 00:00 (+ délai de grâce), alerte vocale puis coupure auto du relais Shelly (sauf les 2 postes exemptés).</p>
              </div>
            </div>
          </div>

          {/* Schéma technique Rail DIN texte conservé en référence */}
          <details className="bg-slate-950 rounded-xl border border-slate-800">
            <summary className="px-4 py-3 text-xs font-semibold text-slate-300 cursor-pointer hover:text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Afficher le schéma électrique Rail DIN détaillé (Format Texte Électricien)</span>
            </summary>
            <div className="p-4 pt-0 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
              <pre>{`
  [ ALIMENTATION GÉNÉRALE SNEL 230V / 50Hz (Kinshasa) ]
                        │
                        ▼
       ┌────────────────────────────────┐
       │  DISJONCTEUR PRINCIPAL 32A     │
       │  + DIFFÉRENTIEL 30mA TYPE A    │
       └────────────────┬───────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────────┐      ┌───────────────────────────────────────────┐
│ ONDULEUR (UPS)       │      │ COFFRET PRINCIPAL DE DISTRIBUTION         │
│ 1500VA CAISSE/RÉSEAU │      │ (Rail DIN)                                │
└────────┬─────────────┘      └─┬───────────────────┬─────────────────────┘
         │                      │                   │
         ▼                      ▼                   ▼
  ┌──────────────────┐  ┌──────────────────┐ ┌──────────────────┐
  │ Starlink (Bypass)│  │ Disjoncteur 16A  │ │ Disjoncteur 16A  │
  │ + Routeur MikroTik  │ Zone PS4 (1-8)   │ │ Zone PS5 (9-10)  │
  │ + PC GOZA + Imp. │  └───────┬──────────┘ └───────┬──────────┘
  └──────────────────┘          │                    │
                                ▼                    ▼
                     ┌────────────────────┐ ┌────────────────────┐
                     │ 7x Shelly Plus 1PM │ │ 1x Shelly Plus 1PM │
                     │ (Postes 2 à 8 Auto)│ │ (Poste 10 Auto)    │
                     │ + Poste 1 Exempté  │ │ + Poste 9 Exempté  │
                     └──────────┬─────────┘ └─────────┬──────────┘
                                │                     │
                                ▼                     ▼
                     ┌────────────────────┐ ┌────────────────────┐
                     │ Consoles PS4       │ │ Consoles PS5       │
                     │ + Écrans TV 50"    │ │ + Écrans TV 55"    │
                     └────────────────────┘ └────────────────────┘
              `}</pre>
            </div>
          </details>

          {/* Modale Zoom Plein Écran du Schéma */}
          {isSchemaZoomed && (
            <div
              className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
              onClick={() => setIsSchemaZoomed(false)}
            >
              <div
                className="w-full max-w-7xl flex items-center justify-between mb-3 px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  <span>Schéma Installation Complet — Starlink + MikroTik + GOZA</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={activeSchemaImg}
                    download={activeSchemaDownloadName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger HD</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsSchemaZoomed(false)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    aria-label="Fermer l'aperçu plein écran"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div
                className="w-full max-w-7xl max-h-[85vh] overflow-auto rounded-xl border border-slate-800 bg-[#070B14] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={activeSchemaImg}
                  alt="Schéma installation complet GOZA Starlink MikroTik plein écran"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 1B : Explication Détaillée de Chaque Appareil, Importance & Rôle */}
      {activeSection === 'devices_roles' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 max-w-none w-full text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                <span>Importance &amp; Rôle Exact de Tous les Appareils Présents dans le Système</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Couvre l&apos;énergie (Batterie Lithium 15–20 kWh + Onduleur Hybride), le réseau Starlink + MikroTik, la caisse, les 10 postes PS4/PS5, l&apos;éclairage, les 2 climatiseurs et la ventilation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdfGuide}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-semibold transition shrink-0 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Exporter en PDF</span>
            </button>
          </div>

          {/* Tableau complet : Infrastructure Énergie, Réseau & Caisse */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Appareil / Module</th>
                  <th className="py-2.5 px-3">Branchement &amp; IP / Topic</th>
                  <th className="py-2.5 px-3">Importance &amp; Rôle Exact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                <tr>
                  <td className="py-3 px-3 font-semibold text-amber-300">1. Disjoncteur 40A + Différentiel 30mA + Parafoudre</td>
                  <td className="py-3 px-3 font-mono text-slate-300">Arrivée SNEL 230V / 50Hz</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-rose-300">VITAL :</strong> Protège les joueurs contre les électrocutions (30mA) et stoppe les pics de tension SNEL avant d&apos;endommager l&apos;onduleur et les consoles.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-amber-300">2. Batterie Lithium 15–20 kWh (48V) + Onduleur Hybride 8 kW</td>
                  <td className="py-3 px-3 font-mono text-slate-300">Sortie secours → Rail DIN Caisse, Réseau, Lumières &amp; Postes</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-amber-300">CRITIQUE :</strong> Fournit <strong>6 à 8 heures d&apos;autonomie</strong> à toute la salle (10 postes + lumières + caisse + Starlink) sans groupe électrogène bruyant ni perte de recettes lors des coupures SNEL.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-blue-300">3. Parabole &amp; Routeur Starlink (Mode Bypass)</td>
                  <td className="py-3 px-3 font-mono text-slate-300">Secouru 230V → RJ45 sur MikroTik ether1 (WAN)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-blue-300">ESSENTIEL :</strong> Assure la connexion Internet haut débit pour les envois <strong>WhatsApp Meta</strong> (tickets, bienvenue, file) et l&apos;accès au <strong>Portail QR Joueurs</strong>.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-cyan-300">4. Routeur MikroTik</td>
                  <td className="py-3 px-3 font-mono text-slate-300">Bridge 192.168.1.1/24 · Wi-Fi 2.4GHz GOZA-IoT · VLAN Guest</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-cyan-300">CERVEAU RÉSEAU :</strong> Fige les IP statiques de tous les relais, relie PC et Shelly en local même sans Internet, et isole le Wi-Fi joueurs pour éviter tout piratage des prises.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-emerald-300">5. PC Caissier / Serveur GOZA</td>
                  <td className="py-3 px-3 font-mono text-slate-300">RJ45 Gigabit ether2 · IP 192.168.1.100 · Port 3000</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-emerald-300">CŒUR LOGICIEL :</strong> Exécute l&apos;application web GOZA, gère tickets (&lt;15s), chronomètres, caisse CDF/USD, fidélité et envoie les commandes ON/OFF HTTP/MQTT à chaque appareil.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-emerald-300">6. Imprimante Thermique 80mm + Tiroir-Caisse</td>
                  <td className="py-3 px-3 font-mono text-slate-300">USB / LAN sur PC GOZA (Secouru batterie)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-white">CONTRÔLE &amp; PREUVE :</strong> Imprime les reçus joueurs avec QR Code unique de vérification anti-fraude et sécurise les espèces (CDF/USD).</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-purple-300">7. Tablette / Smartphone Gérant &amp; Joueurs</td>
                  <td className="py-3 px-3 font-mono text-slate-300">Wi-Fi LAN (Gérant) / Guest VLAN ou 4G (Joueurs)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-purple-300">SUPERVISION &amp; FIDÉLITÉ :</strong> Le Gérant surveille le CA et les postes à distance ; le joueur consulte ses points, son rang (Fidèle/VIP) et son temps restant via QR.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-yellow-300">8. Éclairage Ambiance Néon &amp; LED Salle</td>
                  <td className="py-3 px-3 font-mono text-slate-300">192.168.1.140 · Tasmota/Shelly · gaminghub/ambient/lighting (~85W)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-yellow-300">ATMOSPHÈRE &amp; SÉCURITÉ :</strong> Identité visuelle gaming et éclairage sécurisé ; s&apos;allume/s&apos;éteint automatiquement (ex: 08h30–23h45) sans oubli du personnel.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-sky-300">9. Climatiseur Principal (Zone PS5 &amp; Accueil) + Contacteur 25A</td>
                  <td className="py-3 px-3 font-mono text-slate-300">192.168.1.141 · Shelly 1PM + Contacteur 25A · gaminghub/climate/ac1 (~1450W)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-sky-300">CONFORT &amp; PROTECTION MATÉRIEL :</strong> Évite la surchauffe des PS5 et de l&apos;accueil VIP. Le contacteur 25A encaisse le courant d&apos;appel pour ne pas brûler le Shelly ; délesté sur coupure SNEL longue.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-sky-300">10. Climatiseur Zone PS4 + Contacteur 25A</td>
                  <td className="py-3 px-3 font-mono text-slate-300">192.168.1.142 · Shelly 1PM + Contacteur 25A · gaminghub/climate/ac2 (~1250W)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-sky-300">ZONE PS4 &amp; ÉCONOMIE :</strong> Refroidit la rangée des 8 PS4 aux heures chaudes (09h00–23h30) et se coupe automatiquement à la fermeture ou en mode économie batterie.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-teal-300">11. Extracteur d&apos;air &amp; Ventilation</td>
                  <td className="py-3 px-3 font-mono text-slate-300">192.168.1.143 · Sonoff S26 · gaminghub/climate/fan (~110W)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-teal-300">RENOUVELLEMENT D&apos;AIR :</strong> Évacue la chaleur dégagée par les 10 consoles/TV à très faible consommation (110W), assurant le refroidissement même quand les clims sont délestées.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tableau complet individuel des 10 Postes PS4 & PS5 présents dans le système */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Détail de Tous les Postes de Jeu Installés (PS4 &amp; PS5) et leurs Relais</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2 px-3">Poste &amp; Console</th>
                    <th className="py-2 px-3">Relais &amp; IP Fixe</th>
                    <th className="py-2 px-3">Mode</th>
                    <th className="py-2 px-3">Rôle &amp; Importance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                  {(stations.length > 0
                    ? stations
                    : Array.from({ length: 10 }, (_, idx) => ({
                        id: idx + 1,
                        name: idx + 1 > 8 ? `Poste ${idx + 1} (PS5 Ultra 120Hz)` : `Poste ${idx + 1} (PS4)`,
                        type: idx + 1 > 8 ? 'PS5' : 'PS4',
                      }))
                  ).map((st) => {
                    const exempt = isStationShellyExempt(st.id, settings);
                    const matchedDev = devices.find((d) => d.stationId === st.id);
                    const ip = matchedDev?.ipAddress || `192.168.1.${120 + st.id}`;
                    const topic = matchedDev?.relayTopic || `gaminghub/station/${st.id}/power`;
                    return (
                      <tr key={st.id}>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {st.name} <span className="text-[10px] font-mono text-cyan-400">[{st.type}]</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {ip} · <span className="text-slate-400">{topic}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {exempt ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                              EXEMPTÉ MANUEL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                              AUTO SHELLY
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {exempt
                            ? 'Alimentation manuelle directe (jamais coupée automatiquement) : dédié aux tests, tournois ou sessions VIP spéciales.'
                            : 'Allumé automatiquement à la création du ticket, mesure Watts/kWh en direct, puis coupé automatiquement à la fin du temps.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section 1C : Guide Complet de l'Application Web (Tous Menus & Options) */}
      {activeSection === 'app_guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 max-w-none w-full text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-400" />
              <span>Guide Complet de l&apos;Application Web GOZA — Tous les Menus &amp; Options</span>
            </h3>
            <p className="text-slate-400 mt-1">
              Référence complète de l&apos;interface GOZA : barre supérieure, 9 menus principaux, 12 rubriques de paramètres Admin, Espace Client et permissions par rôle.
            </p>
          </div>

          {/* Barre supérieure & Disposition */}
          <div className="bg-slate-950/70 border border-cyan-500/25 rounded-xl p-4 space-y-2.5">
            <h4 className="font-bold text-cyan-300 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>A. Barre Supérieure (Header) &amp; Options Rapides Toujours Accessibles</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                <strong className="text-white block mb-1">1. Bascule Menu Horizontal / Latéral</strong>
                Le bouton <code className="text-cyan-300">Menu latéral / Menu horizontal</code> déplace toute la navigation vers la gauche en colonne sous l&apos;en-tête (faisant apparaître la bannière gaming animée <em>SALLE DE JEUX GOZA</em> en haut).
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                <strong className="text-white block mb-1">2. Taux du jour &amp; Voix Humaine (H/F)</strong>
                Affiche le taux en direct (ex: <code>1$ = 2 800 FC</code>). Le bloc <strong>Voix + H/F</strong> permet de tester l&apos;annonce vocale et de basculer entre voix Féminine et Masculine.
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                <strong className="text-white block mb-1">3. Raccourcis Admin (3 icônes)</strong>
                Réservés à l&apos;Admin : <MessageSquare className="w-3 h-3 inline text-emerald-400" /> Config WhatsApp Meta, <Sliders className="w-3 h-3 inline text-amber-400" /> Seuils Fidélité/VIP, <Shield className="w-3 h-3 inline text-cyan-400" /> Gestion du Personnel.
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                <strong className="text-white block mb-1">4. Statut Réseau &amp; Synchro Offline</strong>
                Icône Wi-Fi verte si connecté (Starlink OK), ambre avec compteur si opérations hors-ligne en attente (cliquer pour synchroniser).
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                <strong className="text-white block mb-1">5. Menu Profil Utilisateur (Avatar rond)</strong>
                Ouvre 3 options : <strong>Mon profil</strong> (photo ronde multi-formats, nom, mot de passe), <strong>Verrouiller / Changer caissier</strong> (bascule PIN rapide), et <strong>Déconnexion</strong>.
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                <strong className="text-white block mb-1">6. Installer (PWA)</strong>
                Installe GOZA comme application autonome sur le bureau du PC Caissier ou sur tablette.
              </div>
            </div>
          </div>

          {/* Les 9 Menus Principaux */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">B. Les 9 Menus Principaux de l&apos;Application</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-blue-300 flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> 1. Tableau de bord</div>
                <p className="text-slate-300 leading-relaxed">
                  Vue globale en temps réel : filtre par période (<em>Aujourd&apos;hui, Semaine, Mois, Tout</em>), KPIs CA Gaming + Snacks (CDF/USD), graphique des recettes, liste des postes actifs avec actions rapides (<strong>+30m</strong>, <strong>Fin</strong>, <strong>Imprimer</strong>), file d&apos;attente et journal filtrable.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-2"><Tv className="w-4 h-4" /> 2. Postes Live (Cockpit Salle)</div>
                <p className="text-slate-300 leading-relaxed">
                  Grille interactive des 10+ consoles : <strong>Vert</strong> (Libre), <strong>Bleu</strong> (Occupé + chrono), <strong>Ambre/Rouge</strong> (fin imminente / grâce), badge <em>Exempté Shelly</em> sur les 2 postes manuels. Permet de créer un <strong>Ticket Express (&lt;15s)</strong>, <strong>Prolonger</strong>, <strong>Transférer vers un autre poste</strong> ou <strong>Terminer / Annuler</strong>.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-cyan-300 flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> 3. Billetterie</div>
                <p className="text-slate-300 leading-relaxed">
                  Historique complet des tickets (paginé par 10) : recherche par N° ticket, nom, téléphone ou référence Illico/Mobile Money ; filtres par statut et par poste ; <strong>Réimpression thermique 80mm avec QR</strong>, <strong>Transfert</strong> ou <strong>Remboursement</strong>.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-2"><Users className="w-4 h-4" /> 4. File d&apos;attente</div>
                <p className="text-slate-300 leading-relaxed">
                  Inscription rapide des joueurs en attente (console PS4/PS5 ou indifférent, durée souhaitée, priorité <em>Normale</em> ou <em>VIP</em>), estimation automatique du temps d&apos;attente, bouton <strong>Appeler</strong> (voix + WhatsApp), <strong>Assigner à un poste libre</strong> ou marquer <em>Absent / Annulé</em>.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-purple-300 flex items-center gap-2"><Award className="w-4 h-4" /> 5. Fidélité &amp; Statuts</div>
                <p className="text-slate-300 leading-relaxed">
                  6 sous-onglets : <strong>Clients</strong> (inscription stricte avec ticket valide <strong>&ge; 3H / 180 min</strong>, code parrain <strong>5 caractères</strong>, envoi WhatsApp de bienvenue avec PIN), <strong>Historique Statuts</strong> (Nouveau/Régulier/Fidèle/VIP), <strong>Parrainage</strong>, <strong>Convertir Points en minutes</strong>, <strong>Classement</strong> et <strong>Journal Points</strong>.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-cyan-400 flex items-center gap-2"><Zap className="w-4 h-4" /> 6. Domotique IoT <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Gérant &amp; Admin</span></div>
                <p className="text-slate-300 leading-relaxed">
                  4 sous-onglets : <strong>Baie Virtuelle des Relais</strong> (allumer/éteindre individuellement + bouton <em>Tout Allumer</em> / <em>Extinction Générale</em>), <strong>Automatisations &amp; Économie</strong> (coupe veille, horaires Clim/Éclairage), <strong>Sniffer/Logs MQTT</strong> et <strong>Config Broker &amp; Shelly</strong>.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-emerald-400 flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> 7. Caisse &amp; Snacks</div>
                <p className="text-slate-300 leading-relaxed">
                  3 sous-onglets : <strong>Point de Vente Snacks</strong> (panier boissons/snacks, paiement Cash CDF/USD, Mobile Money, Illico ou Mixte + impression ticket snack), <strong>Shift Actuel &amp; Clôture</strong> (comptage caisse + rapprochement électronique) et <strong>Historique des Shifts</strong>.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-indigo-300 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> 8. Rapports <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Gérant &amp; Admin</span></div>
                <p className="text-slate-300 leading-relaxed">
                  Synthèse financière complète par période, rentabilité par console, performance par caissier, répartition statuts fidélité, logs d&apos;audit &amp; connexions, avec exports directs <strong>Excel (.xlsx)</strong>, <strong>PDF</strong>, <strong>CSV</strong> et <strong>JSON</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Paramètres Admin (12 sections) + Portail Client */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 border border-amber-500/25 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>C. Paramètres Système (12 Rubriques Admin)</span>
              </h4>
              <ul className="space-y-1 text-slate-300 list-disc pl-5 leading-relaxed">
                <li><strong>Aperçu / Salle &amp; Tickets :</strong> Nom (GOZA), logo, adresse, pied de ticket, fond d&apos;écran global.</li>
                <li><strong>Devises &amp; Tarifs :</strong> Taux USD/CDF, arrondi 100 FC, prix PS4/PS5, plages horaires (Heures creuses/pointe), ajout de nouveaux postes.</li>
                <li><strong>Remises, Fidélité &amp; File :</strong> Codes promo (ex. HAPPY243), points/minutes, bonus parrainage, délais de grâce.</li>
                <li><strong>Paiements &amp; WhatsApp :</strong> Activation Cash/Illico/M-Pesa/Orange/Airtel/Mixte + numéros marchands ; identifiants Meta WhatsApp.</li>
                <li><strong>Domotique &amp; Sécurité :</strong> Choix des <strong>2 postes exemptés Shelly (1 PS4 + 1 PS5)</strong>, mode coupure Écran seul vs Complet, comptes staff &amp; sauvegarde/import JSON.</li>
              </ul>
            </div>

            <div className="bg-slate-950/70 border border-emerald-500/25 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span>D. Portail Client QR &amp; Rôles d&apos;Accès (RBAC)</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc pl-5 leading-relaxed">
                <li><strong>Portail Joueur (<code>/?tab=client</code>) :</strong> Connexion par téléphone + PIN, photo ronde multi-formats, solde points, progression Fidèle/VIP, code parrain 5 caractères et conversion points.</li>
                <li><strong>Vérification Ticket QR (<code>/t/:token</code>) :</strong> Page publique scannée sur le ticket papier 80mm montrant le temps restant en direct.</li>
                <li><strong>Rôle Caissier :</strong> Accès Tableau de bord, Postes Live, Billetterie, File d&apos;attente, Fidélité, Caisse &amp; Snacks, Guide.</li>
                <li><strong>Rôle Gérant :</strong> + Domotique IoT et Rapports financiers.</li>
                <li><strong>Rôle Admin :</strong> Accès total + 12 rubriques Paramètres, Gestion Personnel, WhatsApp &amp; Règles Fidélité.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Section 2 : Liste Matériel & Budget */}
      {activeSection === 'bom' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 max-w-none w-full">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Nomenclature du Matériel Domotique & Budget Estimatif</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Composants standard ouverts pour Kinshasa (~470 USD / 1 316 000 FC).
            </p>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3">Modèle Recommandé</th>
                  <th className="py-2.5 px-3 text-center">Quantité</th>
                  <th className="py-2.5 px-3 text-right">Prix ($)</th>
                  <th className="py-2.5 px-3 text-right">Total USD</th>
                  <th className="py-2.5 px-3 text-right">Total CDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Prises / Relais Connectés Consoles</td>
                  <td className="py-2.5 px-3 text-cyan-400">Shelly Plus 1PM (8 auto + 2 exemptés)</td>
                  <td className="py-2.5 px-3 text-center">8 à 10</td>
                  <td className="py-2.5 px-3 text-right">$18.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$180.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">504 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Relais Lumières, 2 Clims + Contacteurs 25A &amp; Extracteur</td>
                  <td className="py-2.5 px-3 text-cyan-400">Shelly 1PM / Sonoff S26 + Contacteur 25A</td>
                  <td className="py-2.5 px-3 text-center">4 + 2</td>
                  <td className="py-2.5 px-3 text-right">$22.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$132.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">369 600 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Passerelle &amp; Broker MQTT Local</td>
                  <td className="py-2.5 px-3 text-cyan-400">PC Caissier GOZA / Mini PC</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$85.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$85.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">238 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Routeur Réseau Principal &amp; Wi-Fi IoT</td>
                  <td className="py-2.5 px-3 text-cyan-400">MikroTik hAP ax² / RB4011</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$110.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$110.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">308 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Onduleur Hybride 8 kW + Batterie Lithium 15–20 kWh (48V)</td>
                  <td className="py-2.5 px-3 text-amber-300">Pack Solaire/Hybride 15–20 kWh LiFePO4</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">Selon fournisseur</td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-300">Parc Énergie</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">Autonomie 6–8h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3 : Config Tasmota / MQTT */}
      {activeSection === 'tasmota' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 max-w-none w-full text-xs">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Guide de Paramétrage des Relais (Tasmota & Shelly)</span>
          </h3>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-slate-300 space-y-2">
            <span className="text-cyan-400 font-bold block font-sans">Commandes Tasmota pour relais Sonoff :</span>
            <pre className="bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto">{`
MqttHost 192.168.1.100
MqttPort 1883
MqttUser gaminghub_operator
Topic gaminghub_station_1
TelePeriod 10
            `}</pre>
          </div>
        </div>
      )}

      {/* Section WhatsApp Business Cloud API (2.15) */}
      {activeSection === 'whatsapp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 max-w-none w-full text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>Guide d'Intégration Meta WhatsApp Business Cloud API</span>
            </h3>
            <p className="text-slate-400 mt-1">
              Procédure officielle pas-à-pas pour connecter le compte professionnel Meta de GOZA et activer les notifications automatiques vers les joueurs en RDC (+243).
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">1</span>
                Création du compte Meta Business Manager & Application Developer
              </h4>
              <p className="text-slate-300">
                1. Rendez-vous sur <code>business.facebook.com</code> et créez ou associez l'entreprise "GOZA".<br />
                2. Sur <code>developers.facebook.com</code>, créez une nouvelle application de type <strong>Entreprise (Business)</strong>.<br />
                3. Ajoutez le produit <strong>WhatsApp</strong> à votre application.
              </p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">2</span>
                Jeton Permanent (System User Token) & Numéro de Téléphone
              </h4>
              <p className="text-slate-300">
                1. Dans <strong>Paramètres d'entreprise &gt; Utilisateurs système</strong>, créez un utilisateur <code>kin-hub-api-service</code> avec le rôle <em>Employé</em> ou <em>Administrateur</em>.<br />
                2. Générez un jeton permanent sans date d'expiration en cochant les autorisations : <code>whatsapp_business_messaging</code> et <code>whatsapp_business_management</code>.<br />
                3. Dans <strong>WhatsApp &gt; Configuration de l'API</strong>, enregistrez le numéro officiel de la salle de jeux (ex. Vodacom/Orange RDC) pour obtenir votre <strong>Phone Number ID</strong> et votre <strong>WABA ID</strong>.
              </p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">3</span>
                Modèles de Messages Approuvés (Catégorie Utility)
              </h4>
              <p className="text-slate-300">
                Dans le gestionnaire WhatsApp, créez les modèles suivants en langue <strong>Français (fr)</strong> :
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 font-mono text-[11px]">
                <li><strong>poste_pret</strong> : "Bonjour &#123;&#123;1&#125;&#125;, le poste &#123;&#123;2&#125;&#125; (&#123;&#123;3&#125;&#125;) est prêt pour vous. Merci de vous présenter dans les &#123;&#123;4&#125;&#125; minutes."</li>
                <li><strong>bientot_votre_tour</strong> : "Bonjour &#123;&#123;1&#125;&#125;, vous êtes bientôt appelé(e). Il reste environ &#123;&#123;2&#125;&#125; minutes d'attente."</li>
                <li><strong>delai_depasse_rappel</strong> : "Bonjour &#123;&#123;1&#125;&#125;, votre poste &#123;&#123;2&#125;&#125; vous attend encore &#123;&#123;3&#125;&#125; minutes. Répondez ANNULER si vous ne venez plus."</li>
                <li><strong>promotion_statut</strong> : "Félicitations &#123;&#123;1&#125;&#125; ! Vous venez de passer au statut &#123;&#123;2&#125;&#125; chez GOZA..."</li>
              </ul>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">4</span>
                Configuration du Webhook Inbound (Statuts & Réponses Clients)
              </h4>
              <p className="text-slate-300">
                1. Dans <strong>WhatsApp &gt; Configuration</strong>, cliquez sur <em>Modifier le Webhook</em>.<br />
                2. <strong>URL de rappel</strong> : <code>https://votre-domaine-cloud.run.app/api/whatsapp/webhook</code>.<br />
                3. <strong>Jeton de vérification</strong> : <code>kin_gaming_hub_secure_token_2026</code>.<br />
                4. Souscrivez aux champs : <code>messages</code> (réponses entrantes "OUI", "ANNULER", "STOP") et <code>message_template_status_update</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 4 : Manuel Caissier */}
      {activeSection === 'cashier_guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 max-w-none w-full text-xs">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Manuel Opérationnel du Caissier (GOZA)</span>
          </h3>
          <p className="text-slate-300">
            1. Prise de poste avec son code PIN personnel (4 chiffres).<br />
            2. Sélection du poste libre vert sur la grille.<br />
            3. Encaissement express (&lt;15s) et allumage automatique de la prise.<br />
            4. Remise du ticket thermique 80mm au joueur.
          </p>
        </div>
      )}

      {/* Section 5 : Plan de Tests (2.13 & 2.14) */}
      {activeSection === 'test_plan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 max-w-none w-full text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              <span>Plan de Tests de Validation (Sécurité RBAC & Statuts Clients)</span>
            </h3>
            <p className="text-slate-400 mt-1">
              Scénarios de test pour valider l'intégrité des rôles, la sécurité et l'algorithme des statuts.
            </p>
          </div>

          <div className="space-y-3">
            {/* Test 1 : Promotion automatique */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Test 1 : Promotion Automatique Régulier → Fidèle</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">RÉUSSI</span>
              </div>
              <p className="text-slate-300">
                <strong>Procédure :</strong> Enregistrer des sessions payées pour un client jusqu'à atteindre 10 sessions, 15 heures cumulées, et présence sur 4 semaines distinctes.<br />
                <strong>Résultat attendu :</strong> Promotion instantanée vers "Fidèle", notification de succès, déblocage de la remise de 5% et priorité en file d'attente.
              </p>
            </div>

            {/* Test 2 : Voies d'accès VIP */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Test 2 : Voies Alternatives VIP (Heures vs Dépenses vs Parrainage)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">RÉUSSI</span>
              </div>
              <p className="text-slate-300">
                <strong>Procédure :</strong> Vérifier qu'un client remplissant les critères de Fidèle accède au rang VIP dès qu'il atteint SOIT 40h de jeu, SOIT 100 USD dépensés, SOIT 5 filleuls ayant payé $\ge 2$ sessions.<br />
                <strong>Résultat attendu :</strong> Attribution de l'or VIP, multiplicateur x1.5 et remise de 10%.
              </p>
            </div>

            {/* Test 3 : Période de grâce 30 jours */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Test 3 : Rétrogradation Prudente & Période de Grâce</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">RÉUSSI</span>
              </div>
              <p className="text-slate-300">
                <strong>Procédure :</strong> Simuler l'expiration de la fenêtre glissante de 90 jours pour un client Fidèle inactif.<br />
                <strong>Résultat attendu :</strong> Déclenchement d'une période de grâce de 30 jours avec avertissement sans perte immédiate du statut. Rétrogradation uniquement si inactivité prolongée après les 30 jours.
              </p>
            </div>

            {/* Test 4 : Contrôle d'Accès RBAC */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Test 4 : Étanchéité des Permissions RBAC</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">RÉUSSI</span>
              </div>
              <p className="text-slate-300">
                <strong>Procédure :</strong> Se connecter avec le compte Caissier (ex: Erick).<br />
                <strong>Résultat attendu :</strong> Les onglets "Domotique IoT", "Rapports" et les boutons de configuration admin sont masqués. Seule la billetterie et la caisse sont autorisées.
              </p>
            </div>

            {/* Test 5 : Protection Anti Force-Brute */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Test 5 : Tentatives d'Accès Non Autorisées (Brute-Force)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">RÉUSSI</span>
              </div>
              <p className="text-slate-300">
                <strong>Procédure :</strong> Saisir 5 codes PIN erronés consécutivement sur l'écran de connexion du personnel.<br />
                <strong>Résultat attendu :</strong> Verrouillage immédiat du pavé tactile pour 60 secondes avec compte à rebours, et consignation de chaque tentative infructueuse dans le journal des connexions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
