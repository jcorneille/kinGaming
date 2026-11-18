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
  Thermometer,
  Globe,
  Cable,
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
import gozaInstallationCompleteV2Img from '../assets/images/goza_installation_complete_v2_1795024312483.jpg';

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
  const [schemaMode, setSchemaMode] = useState<
    'hardware_cables' | 'battery_full' | 'wiring_pins' | 'devices' | 'overview'
  >('hardware_cables');
  const [isSchemaZoomed, setIsSchemaZoomed] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const activeSchemaImg =
    schemaMode === 'hardware_cables'
      ? gozaInstallationCompleteV2Img
      : schemaMode === 'battery_full'
      ? gozaFullSystemBatterySchemaImg
      : schemaMode === 'wiring_pins'
      ? gozaWiringPinsSchemaImg
      : schemaMode === 'devices'
      ? gozaCompleteDevicesImg
      : gozaStarlinkMikrotikSchemaImg;

  const activeSchemaDownloadName =
    schemaMode === 'hardware_cables'
      ? 'schema-complet-architecture-cablage-goza.jpg'
      : schemaMode === 'battery_full'
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
        schemaImageSrc: gozaInstallationCompleteV2Img,
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
              <div className="inline-flex flex-wrap bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setSchemaMode('hardware_cables')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    schemaMode === 'hardware_cables'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Matériel &amp; Câbles Différenciés
                </button>
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
                  <strong>Wi-Fi 2.4 GHz Privé (<code>GOZA-IoT</code>) + VLAN Invités (<code>GOZA-WiFi</code>) :</strong> Créez <strong>deux réseaux Wi-Fi séparés</strong> : 1) <code>GOZA-IoT</code> (2.4 GHz, ponté LAN, sans isolation) réservé aux relais Shelly ; 2) <strong><code>GOZA-WiFi</code> (VLAN 50 + Portail Captif MikroTik Hotspot)</strong> pour les smartphones clients, avec profils progressifs <code>shared-users=1..4</code> (<strong>1h : 1 app.</strong> | <strong>3h : 2 app.</strong> | <strong>4h : 3 app.</strong> | <strong>5h+ : 4 app.</strong>).
                </li>
                <li>
                  <strong>Baux DHCP Statiques &amp; REST API Hotspot :</strong> Dans MikroTik <code className="text-cyan-300">IP &gt; DHCP Server &gt; Leases &gt; Make Static</code>, figez l&apos;IP du PC GOZA (<code>.100</code>) et de chaque Shelly (<code>.121–.144</code>), puis activez l&apos;API RouterOS (REST/HTTPS ou WinBox) afin que GOZA crée et expire les codes Wi-Fi <code>GZ-XXXXXX</code> en direct.
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

          {/* Étape 5 : Réponses Clés d'Ingénierie (Thermostat Clim, Switch vs Wi-Fi, Pile Logicielle & Local/Distance) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="bg-sky-950/25 border border-sky-500/30 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-sky-300 text-sm flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-sky-400" />
                <span>Thermostat Auto Clim (Détecteur de Température)</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                <strong>Oui, 100% possible :</strong> Ajoutez un <strong>Shelly Plus H&amp;T</strong> (ou un <strong>Shelly Plus Add-On + sonde DS18B20</strong> sur le Shelly de la Clim 1 à <code>192.168.1.144</code>).
                Dans <em>Domotique IoT &gt; Automatisations</em>, réglez par exemple : <strong>Allumer les Clims dès 27°C</strong> et <strong>Couper automatiquement à 23.5°C</strong> (hystérésis anti-claquement). Plus besoin d&apos;allumer manuellement !
              </p>
            </div>

            <div className="bg-blue-950/25 border border-blue-500/30 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-blue-300 text-sm flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                <span>Switch Gigabit 16 Ports vs Wi-Fi pour les Consoles</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                <strong>Switch RJ45 Cat6 vivement conseillé :</strong> Reliez un <strong>Switch Gigabit 16 Ports</strong> sur le port <code>ether3</code> du MikroTik pour câbler les 8 PS4 + 2 PS5 en Ethernet Cat6. Pourquoi ? Zéro latence en jeu en ligne, téléchargements rapides sans jamais saturer le <strong>Wi-Fi 2.4 GHz</strong> réservé aux relais Shelly.
              </p>
            </div>

            <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Raspberry Pi 5, Mosquitto, Node-RED, PostgreSQL, Grafana : Indispensables ?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                <strong>NON, on peut SAUTER Node-RED, Grafana et Mosquitto séparé !</strong> L&apos;application <strong>GOZA (Node.js)</strong> intègre déjà le pilotage direct des Shelly par HTTP local, le thermostat, les horaires automatiques et les rapports Excel/PDF. Le <strong>Raspberry Pi 5</strong> reste optionnel (uniquement si vous voulez piloter les relais quand le PC Caisse est éteint).
              </p>
            </div>

            <div className="bg-purple-950/25 border border-purple-500/30 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Gestion Locale/Distance + Portail Captif Wi-Fi &amp; Réservations 3h+</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                <strong>Local + Distance :</strong> PC (<code>.100</code>) ↔ Shelly en local sans Internet ; accès gérant à distance via Cloud GOZA / VPN WireGuard. <strong>Wi-Fi Captif Multi-Appareils :</strong> Le serveur <strong>Hotspot intégré à MikroTik</strong> génère un code unique <code>GZ-XXXXXX</code> dès <strong>&ge; 1h</strong> (<strong>1h–2h : 1 app.</strong> · <strong>3h : 2 app.</strong> · <strong>4h : 3 app.</strong> · <strong>5h+ : 4 app.</strong>, actif dès l&apos;impression en file jusqu&apos;à la fin). <strong>Matériel conseillé :</strong> <strong>1× Borne AP PoE Haute Densité + Injecteur 48V</strong> sur <code>ether4</code>, <strong>1× Lecteur QR 2D USB</strong> en caisse et <strong>Baie Réseau 6U + Mini-UPS &lt;10ms</strong>.
              </p>
            </div>
          </div>

          {/* Étape 6 : Cycle de fonctionnement complet */}
          <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Flux Opérationnel Complet (Espace Client 3h+ / Guichet → Retard Auto-Déduit → Wi-Fi Multi-Appareils)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-cyan-300 mb-1">A. Caisse Directe ou Espace Client 3h+</div>
                <p className="text-slate-300 leading-relaxed">Pas de réservation sur place à l&apos;accueil : les réservations se font <strong>uniquement dans l&apos;Espace Client</strong> via Mobile Money + OTP (<strong>&ge; 3h + 15%</strong>), annulables au plus tard <strong>1h avant</strong> l&apos;heure réservée.</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-emerald-300 mb-1">B. Validation &amp; Retard Auto-Déduit</div>
                <p className="text-slate-300 leading-relaxed">Au guichet, le caissier scanne <code>RES-XXXX</code> (Lecteur QR 2D USB). Tout retard après l&apos;heure prévue est <strong>déduit automatiquement</strong> du temps jouable ; le client est placé sur poste libre ou file prépayée.</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-amber-300 mb-1">C. Ticket 80mm &amp; Wi-Fi (&ge; 1h)</div>
                <p className="text-slate-300 leading-relaxed">Dès l&apos;impression (même en file), tout ticket payé <strong>&ge; 1h</strong> active son code <code>GZ-XXXXXX</code> : <strong>1h=1 app.</strong>, <strong>3h=2 app.</strong>, <strong>4h=3 app.</strong>, <strong>5h+=4 app.</strong></p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-bold text-rose-300 mb-1">D. Fin Session &amp; Expiration Wi-Fi</div>
                <p className="text-slate-300 leading-relaxed">À la fin du temps jouable restant, le poste coupe (sauf 2 exemptés) et le code Wi-Fi expire automatiquement sur le Hotspot MikroTik.</p>
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
                <tr>
                  <td className="py-3 px-3 font-semibold text-sky-300">12. Capteur Température &amp; Humidité (Shelly Plus H&amp;T / DS18B20)</td>
                  <td className="py-3 px-3 font-mono text-slate-300">192.168.1.144 · Wi-Fi 2.4GHz · gaminghub/climate/temperature (~1.5W)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-sky-300">THERMOSTAT AUTOMATIQUE :</strong> Mesure la température ambiante en continu : allume les 2 climatiseurs dès qu&apos;il fait chaud (&ge; 27°C) et les coupe dès qu&apos;il fait frais (&le; 23.5°C).</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-blue-300">13. Switch Gigabit 16 Ports RJ45</td>
                  <td className="py-3 px-3 font-mono text-slate-300">Port ether3 MikroTik → Câbles RJ45 Cat6 vers Consoles (PS4/PS5/Xbox)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-blue-300">RÉSEAU FILAIRE CONSOLES :</strong> Distribue Internet/LAN en gigabit aux consoles sans saturer le Wi-Fi 2.4 GHz utilisé par les relais Shelly.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-purple-300">14. Portail Captif MikroTik + Borne Wi-Fi AP PoE Haute Densité + Injecteur 48V</td>
                  <td className="py-3 px-3 font-mono text-slate-300">ether4 (VLAN 50 · GOZA-WiFi) · REST API /rest/ip/hotspot</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-purple-300">WI-FI MULTI-APPAREILS :</strong> Supporte de nombreux smartphones simultanément. Attribue automatiquement : <strong>1h–2h : 1 app.</strong>, <strong>3h : 2 app.</strong>, <strong>4h : 3 app.</strong>, <strong>5h+ : 4 app.</strong> dès l&apos;impression du ticket jusqu&apos;à la fin du jeu.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-amber-300">15. Lecteur QR / Code-Barres 2D USB (Accueil &amp; Validation)</td>
                  <td className="py-3 px-3 font-mono text-slate-300">USB sur PC Caissier GOZA (.100) — Mode clavier HID</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-amber-300">CHECK-IN INSTANTANÉ :</strong> Scanne en 1 seconde le code <code>RES-XXXX</code> ou le QR d&apos;un ticket 80mm pour valider la réservation (avec calcul automatique du retard) sans erreur de saisie.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-emerald-300">16. Baie Réseau 6U Ventilée + Bandeau PDU + Mini-UPS &lt;10ms</td>
                  <td className="py-3 px-3 font-mono text-slate-300">Coffret mural sécurisé (Starlink, MikroTik, Switch 16p, PoE)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-emerald-300">FIABILITÉ 24/7 :</strong> Protège le cœur réseau contre la poussière, les débranchements accidentels et les microcoupures (&lt;10ms) lors des bascules SNEL ↔ Onduleur.</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-rose-300">17. Parafoudre Type 2 + Régulateur/Stabilisateur AVR (Clims)</td>
                  <td className="py-3 px-3 font-mono text-slate-300">En amont des Disjoncteurs 25A Clim 1 (.141) &amp; Clim 2 (.142)</td>
                  <td className="py-3 px-3 text-slate-300"><strong className="text-rose-300">ANTI-SURTENSION CLIMS :</strong> Protège les compresseurs des 2 climatiseurs (délestés hors batterie) contre les chutes et pointes de tension du réseau SNEL.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tableau Différenciation des 4 Types de Câbles */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Cable className="w-4 h-4 text-amber-400" />
              <span>Différenciation Exacte des Câbles dans l&apos;Installation (Ne Pas Confondre)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-950/70 border border-rose-500/30 rounded-xl p-3 space-y-1">
                <div className="font-bold text-rose-300">1. Câble Courant 230V (Électrique)</div>
                <p className="text-slate-300">Section <strong>2.5mm²</strong> (prises postes/TV/caisse) &amp; <strong>4mm²</strong> (clims/onduleur). Fils Rouge/Marron (Phase L), Bleu (Neutre N), Vert/Jaune (Terre PE).</p>
              </div>
              <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-3 space-y-1">
                <div className="font-bold text-blue-300">2. Câble Réseau RJ45 Cat6 (Ethernet)</div>
                <p className="text-slate-300">Transport des données IP uniquement (pas de 230V) : Starlink → MikroTik <code>ether1</code> ; <code>ether2</code> → PC GOZA ; <code>ether3</code> → Switch 16p → 10 Consoles.</p>
              </div>
              <div className="bg-slate-950/70 border border-purple-500/30 rounded-xl p-3 space-y-1">
                <div className="font-bold text-purple-300">3. Câble Imprimante USB/LAN + Tiroir RJ11</div>
                <p className="text-slate-300"><strong>USB Type-B (ou RJ45 LAN)</strong> entre le PC Caisse et l&apos;imprimante thermique 80mm ; cordon <strong>RJ11</strong> (prise téléphone) de l&apos;imprimante vers le tiroir-caisse.</p>
              </div>
              <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-3 space-y-1">
                <div className="font-bold text-cyan-300">4. Sans-Fil Wi-Fi 2.4 GHz IoT</div>
                <p className="text-slate-300">Aucun câble réseau jusqu&apos;aux Shelly : les relais (<code>.122–.143</code>) et le Capteur Température (<code>.144</code>) communiquent en Wi-Fi 2.4 GHz sur le SSID <code>GOZA-IoT</code>.</p>
              </div>
            </div>
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
                <div className="font-bold text-amber-300 flex items-center gap-2"><Users className="w-4 h-4" /> 4. File d&apos;attente &amp; File des Réservés</div>
                <p className="text-slate-300 leading-relaxed">
                  <strong>File des Réservés (<code>RES-XXXX</code>) :</strong> Réservations créées exclusivement via l&apos;Espace Client en Mobile Money + OTP (<strong>&ge; 3h + 15%</strong>, annulables par le client au moins <strong>1h avant</strong> l&apos;heure prévue — aucune réservation sur place). À l&apos;accueil, les minutes de retard éventuelles sont <strong>déduites automatiquement</strong> du temps jouable ; imprimez le ticket + code Wi-Fi multi-appareils puis placez en file prépayée ou sur poste libre.
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
                <span>D. Portail Client (Réservations 3h+ &amp; Wi-Fi) &amp; Rôles (RBAC)</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc pl-5 leading-relaxed">
                <li><strong>Portail Joueur (<code>/?tab=client</code>) :</strong> Réservation 100% mobile en <strong>Mobile Money + validation OTP (&ge; 3h min, +15% frais)</strong> avec choix de l&apos;heure d&apos;arrivée, code <code>RES-XXXX</code> et <strong>annulation autorisée jusqu&apos;à 1h avant</strong> (pas de paiement sur place). Affiche le <strong>code Wi-Fi multi-appareils</strong> (1h=1, 3h=2, 4h=3, 5h+=4 app.), points &amp; parrainage.</li>
                <li><strong>Vérification Ticket QR (<code>/t/:token</code>) :</strong> Page publique scannée sur le ticket 80mm montrant le temps jouable restant (retard éventuel indiqué) et le code Wi-Fi actif/expiré.</li>
                <li><strong>Rôle Caissier :</strong> Accès Tableau de bord, Postes Live, Billetterie, File d&apos;attente/Réservés, Fidélité, Caisse &amp; Snacks, Guide.</li>
                <li><strong>Rôle Gérant / Admin :</strong> + Domotique IoT (avec seuils °C Clim), Rapports, 12 rubriques Paramètres &amp; Gestion Personnel.</li>
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
              Matériel complet recommandé pour Kinshasa (~920 USD / 2 576 000 FC hors parc Batterie 15–20 kWh + Onduleur 8 kW).
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
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Détecteur Température &amp; Humidité (Thermostat Clim)</td>
                  <td className="py-2.5 px-3 text-sky-400">Shelly Plus H&amp;T (ou Shelly Add-On + sonde DS18B20)</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$28.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$28.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">78 400 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Switch Réseau Gigabit 16 Ports (Consoles PS4/PS5)</td>
                  <td className="py-2.5 px-3 text-blue-400">TP-Link TL-SG1016D / MikroTik CSS326 (16 ports RJ45)</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$65.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$65.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">182 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Câblage Différencié (Courant 230V, RJ45 Cat6, USB/RJ11)</td>
                  <td className="py-2.5 px-3 text-amber-300">Bobine Cat6 + Câble 2.5/4mm² + Cordons USB/RJ11</td>
                  <td className="py-2.5 px-3 text-center">Lot complet</td>
                  <td className="py-2.5 px-3 text-right">$75.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$75.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">210 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Passerelle Serveur Local (PC Caissier GOZA)</td>
                  <td className="py-2.5 px-3 text-cyan-400">PC Caissier GOZA (RPi5/Node-RED/Grafana non requis)</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">Déjà inclus</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$0.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">0 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Routeur Réseau Principal &amp; Portail Captif Hotspot</td>
                  <td className="py-2.5 px-3 text-cyan-400">MikroTik hAP ax² / hEX (Hotspot + WireGuard inclus)</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$110.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$110.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">308 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Borne Wi-Fi AP PoE Haute Densité + Injecteur 48V</td>
                  <td className="py-2.5 px-3 text-purple-400">MikroTik cAP ax / UniFi U6+ (Multi-appareils 1–4 app.)</td>
                  <td className="py-2.5 px-3 text-center">1 (Recommandé)</td>
                  <td className="py-2.5 px-3 text-right">$110.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$110.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">308 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Lecteur QR / Code-Barres 2D USB (Check-in Réservations)</td>
                  <td className="py-2.5 px-3 text-amber-300">Scanner 2D Filaire USB Plug &amp; Play (RES-XXXX / QR)</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$35.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$35.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">98 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Baie Réseau Murale 6U Ventilée + PDU + Mini-UPS &lt;10ms</td>
                  <td className="py-2.5 px-3 text-emerald-300">Coffret 6U + Bandeau PDU + Mini-UPS Caisse/Routeur</td>
                  <td className="py-2.5 px-3 text-center">1 pack</td>
                  <td className="py-2.5 px-3 text-right">$95.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$95.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">266 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Parafoudre Type 2 + Régulateur/Stabilisateur AVR (Clims)</td>
                  <td className="py-2.5 px-3 text-rose-300">Protection surtension SNEL pour 2 Climatiseurs Split</td>
                  <td className="py-2.5 px-3 text-center">1 pack</td>
                  <td className="py-2.5 px-3 text-right">$90.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$90.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">252 000 FC</td>
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
            <span>Manuel Opérationnel du Caissier &amp; Accueil (GOZA)</span>
          </h3>
          <div className="space-y-2 text-slate-300 leading-relaxed">
            <p>1. Prise de poste avec votre code PIN personnel (4 chiffres).</p>
            <p>2. <strong>Client direct sans réservation :</strong> Sélectionnez un poste libre vert → Encaissement express via le menu déroulant de paiement (&lt;15s) → Allumage Shelly auto + Impression ticket 80mm. <em>Note : aucune réservation sur place n&apos;est effectuée à l&apos;accueil.</em></p>
            <p>3. <strong>Client avec Réservation Mobile Money OTP (<code>RES-XXXX</code>) :</strong> Dans <em>File d&apos;attente &gt; File des Réservés</em>, scannez (Lecteur QR 2D) ou saisissez <code>RES-XXXX</code>. Les minutes de retard éventuelles par rapport à l&apos;heure réservée sont <strong>déduites automatiquement</strong> par le système, puis cliquez sur <strong>Valider &amp; Poste</strong> (si libre) ou <strong>Valider, Ticket &amp; File d&apos;attente</strong> (si complet).</p>
            <p>4. <strong>Code Wi-Fi Multi-Appareils (&ge; 1h) :</strong> Pour tout ticket payé &ge; 1h (direct, file ou réservation), remettez le code <code>GZ-XXXXXX</code> actif de l&apos;impression à la fin du jeu : <strong>1h–2h : 1 app.</strong> · <strong>3h : 2 app.</strong> · <strong>4h : 3 app.</strong> · <strong>5h+ : 4 app.</strong></p>
          </div>
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
