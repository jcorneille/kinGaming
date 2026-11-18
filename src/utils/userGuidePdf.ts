import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomotiqueDevice, Station, SystemSettings } from '../types';
import { isStationShellyExempt } from '../services/shellyService';

async function loadImageAsDataUrl(src: string): Promise<string | null> {
  if (typeof window === 'undefined' || !src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1280;
        canvas.height = img.naturalHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function addPageFooters(doc: jsPDF, venueName: string): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${venueName} - Guide Complet Installation & Application Web (Starlink + MikroTik + Batterie 15-20 kWh)`,
      14,
      290
    );
    doc.text(`Page ${i} / ${pageCount}`, 196, 290, { align: 'right' });
  }
}

export interface FullGuidePdfParams {
  settings?: SystemSettings;
  stations?: Station[];
  devices?: DomotiqueDevice[];
  schemaImageSrc?: string;
}

export async function downloadFullWebAppGuidePdf({
  settings,
  stations = [],
  devices = [],
  schemaImageSrc,
}: FullGuidePdfParams): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const venueName = settings?.venueName || 'GOZA';
  const exchangeRate = settings?.exchangeRate || 2800;
  const dateLabel = new Date().toLocaleDateString('fr-FR');

  // =========================================================================
  // PAGE 1 : COUVERTURE & ARCHITECTURE GENERALE
  // =========================================================================
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 42, 'F');

  doc.setTextColor(34, 211, 238);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTATION OFFICIELLE SYSTEME & EXPLOITATION', 14, 13);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(`${venueName} - Guide Complet Installation & Application Web`, 14, 23);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Architecture Starlink + MikroTik + Batterie Lithium 15-20 kWh + Domotique Shelly   |   Edite le ${dateLabel}`,
    14,
    31
  );
  doc.text(
    `Adresse : ${settings?.venueAddress || 'Kinshasa, RDC'}   |   Taux actif : 1 USD = ${exchangeRate.toLocaleString()} CDF`,
    14,
    37
  );

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Vue d\'ensemble de l\'infrastructure materielle & energie', 14, 52);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const introText = doc.splitTextToSize(
    `Ce guide couvre l'ensemble de votre installation physique (alimentation SNEL 230V, onduleur hybride avec parc batterie Lithium 15 a 20 kWh, connexion Internet Starlink en mode Bypass, routeur MikroTik avec VLAN et Wi-Fi 2.4 GHz IoT, PC Caissier GOZA, imprimante thermique 80mm, tous les postes PS4 et PS5, eclairage LED/Neon, 2 climatiseurs Split avec contacteurs 25A, extracteur d'air) ainsi que le manuel complet de tous les menus et options de l'application web ${venueName}.`,
    182
  );
  doc.text(introText, 14, 58);

  // Tableau 1 : Strategie Energie & Batterie 15-20 kWh
  autoTable(doc, {
    startY: 76,
    head: [['Circuit / Equipement', 'Source & Protection', 'Comportement sur Batterie 15-20 kWh (Coupure SNEL)']],
    body: [
      [
        'Coeur Reseau & Caisse (Starlink, MikroTik, PC GOZA, Imprimante 80mm)',
        'Onduleur Hybride 8kW -> Disjoncteur 10A/16A',
        'PRIORITAIRE (Secours 100% permanent). Garantit zero perte de ticket, Wi-Fi IoT actif et envoi WhatsApp continu.',
      ],
      [
        'Postes PS4 (1-8) & Postes PS5 (9-10) + TVs',
        'Disjoncteurs 16A par zone + 8x Shelly Plus 1PM (2 postes exemptes)',
        'ALIMENTES SUR BATTERIE (~2.2 kW en pleine charge = 6h a 8h d\'autonomie sur batterie 15-20 kWh hors clim).',
      ],
      [
        'Eclairage Neon / LED & Extracteur d\'air',
        'Disjoncteur 10A + Relais Tasmota/Sonoff (.140 / .143)',
        'ALIMENTES SUR BATTERIE (~195W total). Maintien de l\'ambiance et ventilation a faible consommation.',
      ],
      [
        '2 Climatiseurs Split (Zone PS5 .141 & Zone PS4 .142)',
        'Disjoncteurs 20A/25A + Contacteur Puissance 25A + Shelly 1PM',
        'DELESTAGE INTELLIGENT : Coupes sur coupure SNEL prolongee (ou 1 seule clim activee) pour preserver la batterie 15-20 kWh.',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.3 },
  });

  // Tableau 2 : Parametrage Reseau Starlink + MikroTik
  const afterEnergyY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Configuration Reseau Starlink -> Routeur MikroTik -> Appareils', 14, afterEnergyY + 9);

  autoTable(doc, {
    startY: afterEnergyY + 13,
    head: [['Etape Reseau', 'Parametre exact sur Starlink / MikroTik', 'Pourquoi c\'est indispensable']],
    body: [
      [
        '1. Starlink -> MikroTik WAN',
        'Routeur Starlink en Mode Bypass -> RJ45 Cat6 sur port ether1 (WAN) du MikroTik (DHCP Client + NAT Masquerade).',
        'Evite le Double NAT et rend Starlink transparent : le MikroTik gere 100% du reseau et du pare-feu.',
      ],
      [
        '2. Bridge LAN & PC Caissier',
        'Bridge LAN 192.168.1.1/24 (ou 192.168.88.1/24). PC GOZA cable en RJ45 Gigabit sur ether2 avec IP fixe .100.',
        'Garantit une communication instantanee (0 ms) entre le serveur GOZA, l\'imprimante et tous les relais.',
      ],
      [
        '3. Wi-Fi 2.4 GHz IoT (GOZA-IoT)',
        'Radio 2.4 GHz uniquement (20 MHz, canal 1/6/11), meme Bridge LAN, Option Client Isolation DESACTIVEE.',
        'Les relais Shelly/Sonoff/Tasmota ne supportent que le 2.4 GHz et doivent repondre au PC Caissier.',
      ],
      [
        '4. Baux DHCP Statiques',
        'IP > DHCP Server > Leases > Make Static pour .100 (PC), .121-.130 (Postes), .140-.143 (Lumieres, Clim, Fan).',
        'Empeche qu\'un relais change d\'adresse IP apres une coupure et perde le pilotage automatique GOZA.',
      ],
      [
        '5. Wi-Fi Clients (GOZA-Guest)',
        'SSID separe sur VLAN / sous-reseau invite (ex. 192.168.50.0/24) + regle Firewall bloquant 192.168.1.0/24.',
        'Empeche les telephones des joueurs de scanner ou pirater les prises Shelly ou la caisse.',
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.2 },
  });

  // =========================================================================
  // PAGE 2 : SCHEMA VISUEL D'INSTALLATION
  // =========================================================================
  if (schemaImageSrc) {
    const imgDataUrl = await loadImageAsDataUrl(schemaImageSrc);
    if (imgDataUrl) {
      doc.addPage('a4', 'landscape');
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${venueName} - Schema d'Installation Complet (Batterie 15-20 kWh, Starlink, MikroTik, Postes, Lumieres & Clim)`, 12, 12.5);

      doc.addImage(imgDataUrl, 'JPEG', 10, 24, 277, 156);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        'Legende : Orange/Or = Alimentation 230V & Bus Batterie 15-20 kWh | Bleu = Ethernet RJ45 | Cyan = Wi-Fi 2.4 GHz IoT | Vert = Signal Auto GOZA | Violet = VLAN Invite / Cloud',
        12,
        187
      );
      doc.addPage('a4', 'portrait');
    } else {
      doc.addPage();
    }
  } else {
    doc.addPage();
  }

  // =========================================================================
  // PAGE 3 : INVENTAIRE COMPLET & ROLES DE TOUS LES APPAREILS DU SYSTEME
  // =========================================================================
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Inventaire, Importance & Role Exact de Chaque Appareil', 14, 16);

  const stationRows = (stations.length > 0
    ? stations
    : Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Poste ${i + 1} (${i + 1 > 8 ? 'PS5' : 'PS4'})`,
        type: i + 1 > 8 ? 'PS5' : 'PS4',
      }))
  ).map((st) => {
    const exempt = isStationShellyExempt(st.id, settings);
    const matchingDevice = devices.find((d) => d.stationId === st.id);
    const ip = matchingDevice?.ipAddress || `192.168.1.${120 + st.id}`;
    const topic = matchingDevice?.relayTopic || `gaminghub/station/${st.id}/power`;
    return [
      `${st.name} [${st.type}]`,
      exempt ? `Circuit direct / Manuel (Exemp. #${st.id})` : `Shelly Plus 1PM (${ip})`,
      topic,
      exempt
        ? 'IMPORTANT : Poste exempte de coupure auto. Sert aux tests manuels, tournois ou sessions VIP speciales sans arret sur fin ticket.'
        : 'Allumage auto ON a la creation du ticket et coupure auto OFF a la fin (+ grace). Mesure la conso en Watts/kWh en direct.',
    ];
  });

  const nonStationDevices = devices.filter((d) => !d.stationId);
  const ambientRows =
    nonStationDevices.length > 0
      ? nonStationDevices.map((d) => [
          d.name,
          `${d.hardwareType} (${d.ipAddress || 'IP locale'})`,
          d.relayTopic,
          d.type === 'AMBIENT_LIGHT'
            ? 'IMPORTANT : Ambiance visuelle & securite de la salle. S\'allume/eteint automatiquement selon les horaires (ex: 08h30-23h45).'
            : d.type === 'AIR_CONDITIONER'
            ? 'IMPORTANT : Confort thermique des joueurs (evite surchauffe PS4/PS5). Pilote via contacteur 25A + delestage sur batterie 15-20 kWh.'
            : 'IMPORTANT : Evacue la chaleur des consoles et renouvelle l\'air de la salle en continu (~110W sur batterie).',
        ])
      : [
          [
            'Eclairage Ambiance Neon & Salle',
            'TASMOTA / SHELLY (192.168.1.140)',
            'gaminghub/ambient/lighting',
            'IMPORTANT : Ambiance lumineuse LED/Neon (~85W). Programme automatiquement (08h30-23h45) depuis GOZA.',
          ],
          [
            'Climatiseur Principal (Zone PS5 & Accueil)',
            'SHELLY_1PM + Contacteur 25A (192.168.1.141)',
            'gaminghub/climate/ac1',
            'IMPORTANT : Refroidit l\'accueil & les PS5 (~1450W). Le contacteur 25A protege le Shelly du pic de demarrage ; deleste si batterie faible.',
          ],
          [
            'Climatiseur Zone PS4',
            'SHELLY_1PM + Contacteur 25A (192.168.1.142)',
            'gaminghub/climate/ac2',
            'IMPORTANT : Maintient la zone PS4 au frais (~1250W). Coupure auto a la fermeture ou en cas de coupure SNEL prolongee.',
          ],
          [
            'Extracteur d\'air & Ventilation',
            'SONOFF_S26 (192.168.1.143)',
            'gaminghub/climate/fan',
            'IMPORTANT : Extraction continue de l\'air chaud degage par les TV et consoles (~110W), surtout quand la clim est delestee.',
          ],
        ];

  autoTable(doc, {
    startY: 21,
    head: [['Equipement / Poste', 'Module / IP / Connexion', 'Topic MQTT / Bus', 'Importance & Role dans le systeme']],
    body: [
      [
        'Batterie Lithium 15-20 kWh + Onduleur Hybride 8kW',
        'Entree SNEL 40A + 30mA -> Bus 48V',
        'Tableau Rail DIN',
        'CRITIQUE : Garantit 6-8h d\'autonomie pour caisse, reseau, lumieres et 10 consoles lors des coupures SNEL a Kinshasa.',
      ],
      [
        'Parabole & Routeur Starlink (Mode Bypass)',
        'Sur Onduleur -> RJ45 ether1 MikroTik',
        'WAN Internet',
        'CRITIQUE : Connecte GOZA a l\'API Meta WhatsApp, au Portail QR Joueur et a la synchro cloud.',
      ],
      [
        'Routeur MikroTik (Coer Reseau)',
        '192.168.1.1/24 + Wi-Fi 2.4GHz IoT',
        'LAN / WLAN / VLAN',
        'CRITIQUE : Routeur principal, DHCP statique pour tous les appareils, pont PC <-> Shelly, isolation Wi-Fi clients.',
      ],
      [
        'PC Caissier / Serveur GOZA',
        'RJ45 Gigabit ether2 (192.168.1.100)',
        'Port 3000 / MQTT',
        'CRITIQUE : Cerveau logiciel : billetterie <15s, timers temps reel, caisse CDF/USD, fidelite et ordres Shelly.',
      ],
      [
        'Imprimante Thermique 80mm + Tiroir-Caisse',
        'USB / RJ45 sur PC GOZA (Secouru)',
        'Impression ESC/POS',
        'IMPORTANT : Edite les tickets joueurs avec QR Code anti-fraude et les recus snacks.',
      ],
      ...stationRows,
      ...ambientRows,
    ],
    theme: 'grid',
    headStyles: { fillColor: [8, 145, 178], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.2, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 42 },
      2: { cellWidth: 36 },
      3: { cellWidth: 62 },
    },
  });

  // =========================================================================
  // PAGE 3B : CABLAGE SECTEUR 230V (L / N / PE / O) & ROUTEUR MIKROTIK
  // =========================================================================
  doc.addPage('a4', 'portrait');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('3B. Cablage Secteur 230V (L / N / PE) & Branchement Routeur par Element', 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [['Element', 'Branchement Electrique 230V (Bornes L, N, PE, O)', 'Liaison Routeur MikroTik / Caisse']],
    body: [
      [
        'SNEL -> Onduleur Hybride 8kW + Batterie 15-20 kWh',
        'SNEL (L Rouge, N Bleu, PE Vert/Jaune) -> Disj. 40A + Diff. 30mA + Parafoudre -> AC IN Onduleur. Batterie 48V : + Rouge / - Noir sur bornes DC avec fusible 200A.',
        'AC OUT 1 (secouru) vers Coffret Rail DIN (10A Reseau/Lumieres + 16A PS4/PS5). AC OUT 2 ou SNEL direct vers 25A Clims.',
      ],
      [
        'Postes 2 a 8 (PS4) & Poste 10 (PS5) — Auto Shelly',
        'Disj. 16A : Phase L -> borne L du Shelly ; Neutre N -> borne N du Shelly + direct vers TV/Console ; Sortie O (Orange) -> Phase Prise Ecran TV ; PE -> TV & Console. (Console sur L/N/PE direct recommande pour proteger le disque).',
        'Chaque Shelly Plus 1PM connecte en Wi-Fi 2.4GHz (GOZA-IoT) avec IP statique .122-.128 & .130 pilote par PC GOZA (.100).',
      ],
      [
        'Poste 1 (PS4) & Poste 9 (PS5) — Exemptes',
        'Disj. 16A : Phase L, Neutre N et Terre PE branches directement sur la prise Ecran TV + Console (pas de coupure auto ticket).',
        'Aucun pilotage ticket automatique (utilisation manuelle / VIP / tournois).',
      ],
      [
        'Clim 1 (.141) & Clim 2 (.142) + Contacteur 25A',
        'Disj. 25A : Phase L -> Contacteur 1(L1)->2(T1)->Clim ; Neutre N -> Contacteur 3(L2)->4(T2)->Clim ; Terre PE -> Clim. Shelly 1PM : L & N en entree, Sortie O -> bobine A1 du contacteur, N -> bobine A2.',
        'Shelly commande en Wi-Fi 2.4GHz GOZA-IoT (.141 et .142) sur horaires 09h00-23h30 + delestage sur coupure SNEL.',
      ],
      [
        'Eclairage Neon/LED (.140) & Extracteur (.143)',
        'Disj. 10A (secouru batterie) : Phase L -> borne L relais ; Neutre N -> borne N + direct vers lampes/fan ; Sortie O -> Phase vers Neon/LED ou Extracteur ; PE -> Terre.',
        'Relais en Wi-Fi 2.4GHz GOZA-IoT (.140 et .143) pilotes selon planning ou bouton Domotique GOZA.',
      ],
      [
        'Starlink + MikroTik + PC GOZA + Imprimante 80mm',
        'Disj. 10A (Sortie secourue Onduleur) -> Multiprise parafoudre alimentant blocs alim Starlink, MikroTik, PC Caissier et Imprimante 80mm.',
        'Starlink RJ45 -> MikroTik ether1 (WAN) ; MikroTik ether2 -> RJ45 PC GOZA (.100) ; PC USB/LAN -> Imp. 80mm -> RJ11 Tiroir-caisse.',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.4, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 82 },
      2: { cellWidth: 58 },
    },
  });

  // =========================================================================
  // PAGE 4 : GUIDE COMPLET DE L'APPLICATION WEB (BARRE HAUT & 9 MENUS)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Guide d\'Utilisation Complet de l\'Application Web GOZA', 14, 16);

  doc.setFontSize(10);
  doc.text('4.1 Barre Superieure (Header) & Options Permanentes', 14, 24);

  autoTable(doc, {
    startY: 27,
    head: [['Bouton / Zone Header', 'Role & Options disponibles']],
    body: [
      [
        'Bascule Menu Lateral / Horizontal',
        'Deplace les 9 menus en barre laterale gauche (et affiche la banniere gaming animee SALLE DE JEUX GOZA en haut) ou les remet en barre horizontale.',
      ],
      [
        'Taux de change en direct',
        'Affiche la conversion active (ex: 1$ = 2 800 FC) utilisee sur tous les tickets, snacks et rapports.',
      ],
      [
        'Raccourcis Admin (3 icones)',
        'Acces directreserve Admin : Config WhatsApp Meta Cloud API, Seuils & Regles Fidelite/VIP, Gestion du Personnel (comptes/PIN).',
      ],
      [
        'Voix + Bouton H / F',
        'Teste l\'annonce vocale en francais et bascule entre Voix Feminine (F) et Voix Masculine (H) pour les alertes de fin de session.',
      ],
      [
        'Indicateur Reseau / Synchro',
        'Vert = Starlink connecte ; Ambre avec chiffre = operations en file hors-ligne pretes a synchroniser d\'un clic.',
      ],
      [
        'Menu Profil Utilisateur (Avatar rond)',
        'Ouvre 3 options : 1) Mon profil (changer nom, mot de passe, photo ronde multi-formats), 2) Verrouiller / Changer caissier (PIN 4 chiffres), 3) Deconnexion.',
      ],
      [
        'Bouton Installer (PWA)',
        'Installe GOZA comme logiciel bureau/tablette fonctionnant meme en cas de microcoupure Internet.',
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 7.8, cellPadding: 2 },
  });

  const afterHeaderY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 105;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('4.2 Les 9 Menus Principaux de Navigation & Leurs Sous-Options', 14, afterHeaderY + 8);

  autoTable(doc, {
    startY: afterHeaderY + 11,
    head: [['Menu', 'Acces (Roles)', 'Toutes les fonctionnalites, sous-onglets & boutons']],
    body: [
      [
        '1. Tableau de bord',
        'Tous',
        'Filtres periode (Aujourd\'hui, Semaine, Mois, Tout), KPIs recettes Jeux + Snacks (CDF/USD), graphique barres, postes actifs (+30m, Fin, Imprimer), file d\'attente et journal d\'activite.',
      ],
      [
        '2. Postes Live',
        'Tous',
        'Grille temps reel des consoles : Vert (Libre), Bleu (Occupe + chrono), Ambre/Rouge (Fin imminente/Grace), badge Exempte Shelly. Boutons : Ticket Express (<15s), Prolonger, Transferer de poste, Arreter / Annuler.',
      ],
      [
        '3. Billetterie',
        'Tous',
        'Historique pagine (10/page) des tickets. Recherche par N° ticket, client, telephone ou reference paiement ; filtres statut & poste ; Reimpression thermique 80mm QR, Transfert ou Remboursement.',
      ],
      [
        '4. File d\'attente',
        'Tous',
        'Ajout joueur (nom, +243, console PS4/PS5/Indifferent, duree, priorite Normal ou VIP), estimation attente automatique, boutons Appeler (voix + WhatsApp), Assigner au poste libre, No-Show / Annuler.',
      ],
      [
        '5. Fidelite & Statuts',
        'Tous (Config Admin)',
        '6 sous-onglets : Clients, Historique Statuts, Parrainage, Convertir Points en minutes, Classement, Journal Points. Regle : inscription exige ticket valide >= 3H (180 min), code parrain <= 5 caracteres, WhatsApp de bienvenue avec PIN.',
      ],
      [
        '6. Domotique IoT',
        'Gerant & Admin',
        'KPI Watts/kWh/Cout SNEL, Tout Allumer / Extinction Generale. 4 sous-onglets : Baie Virtuelle des Relais (Postes, Lumieres, 2 Clims, Extracteur), Automatisations & Economie, Sniffer/Logs MQTT, Config Broker & Shelly.',
      ],
      [
        '7. Caisse & Snacks',
        'Tous',
        '3 sous-onglets : Point de Vente Snacks (panier, Cash CDF/USD, Illico, Mobile Money, Mixte + recu thermique), Shift Actuel & Cloture (comptage caisse + rapprochement), Historique des Shifts.',
      ],
      [
        '8. Rapports',
        'Gerant & Admin',
        'Rentabilite par poste et caissier, repartition paiements & statuts fidelite, logs audit & connexions. Boutons d\'export : Excel (.xlsx), PDF, CSV et JSON.',
      ],
      [
        '9. Guide & Tests',
        'Tous',
        '8 onglets : Schema Detaille (Tous Appareils + Batterie 15-20 kWh), Roles des Appareils, Guide App Web, Materiel & Budget Kinshasa, Config MQTT/Shelly, Guide WhatsApp Meta, Manuel Caissier, Plan de Tests RBAC.',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.4, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 26 },
      2: { cellWidth: 124 },
    },
  });

  // =========================================================================
  // PAGE 5 : PARAMETRES ADMIN (12 RUBRIQUES), PORTAIL CLIENT & MATRICE RBAC
  // =========================================================================
  doc.addPage('a4', 'portrait');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Parametres Administrateur (12 Sections), Portail Client & RBAC', 14, 16);

  autoTable(doc, {
    startY: 21,
    head: [['Section Parametres (Admin)', 'Options configurables dans l\'interface']],
    body: [
      ['1. Apercu / Vue Globale', 'Etat sante systeme, resume configuration, modifications recentes et planifiees.'],
      ['2. Devises & Taux', 'Taux USD/CDF, alerte mise a jour taux, devise principale, regle d\'arrondi (100 FC), decimales USD.'],
      ['3. Tarifs & Postes', 'Prix horaires PS4/PS5, tarif depassement/min, majoration manette supp. (%), tranches horaires, ajout/suppression de nouveaux postes.'],
      ['4. Remises & Promotions', 'Plafond remise Gerant (%), creation et activation des codes promo (ex: HAPPY243, VIPWEEKEND).'],
      ['5. Fidelite & Parrainage', 'Taux de points/min, conversion points->minutes PS4/PS5, validite, bonus parrainage (inscription, 1er jeu, %).'],
      ['6. File d\'attente', 'Delai presentation (min), periode de grace (sec), relances max, priorite VIP, capacite max.'],
      ['7. Notifications WhatsApp', 'Activation globale, identifiants Meta Business Cloud API (Token permanent, Phone ID, WABA ID, Webhook).'],
      ['8. Modes de Paiement', 'Activation & numeros marchands : Cash CDF, Cash USD, Illico Cash, M-Pesa, Orange Money, Airtel Money, Points, Paiement Mixte.'],
      ['9. Domotique & Exemptions', 'Choix des 2 postes exemptes Shelly (1 PS4 + 1 PS5), mode coupure (Ecran seul vs Complet), delai inactivite, horaires Lumieres & Clim.'],
      ['10. Salle, Tickets & Design', 'Nom salle, logo, adresse, telephone, pied de ticket, format papier (58/80mm), fond d\'ecran global & opacite.'],
      ['11. Securite & Personnel', 'Deconnexion inactivite, tentatives PIN max (5 -> blocage 60s), politique mot de passe, gestion comptes Admin/Gerant/Caissier.'],
      ['12. Systeme & Sauvegardes', 'Export/Import JSON complet de la base locale, historique des changements, retention des logs.'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 7.7, cellPadding: 2 },
  });

  const afterSettingsY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 155;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('6. Portail Joueur QR, Verification Ticket & Matrice des Droits (RBAC)', 14, afterSettingsY + 9);

  autoTable(doc, {
    startY: afterSettingsY + 13,
    head: [['Espace / Role', 'URL ou Condition d\'acces', 'Capacites & Restrictions']],
    body: [
      [
        'Portail Client Joueur',
        '/?tab=client (Telephone + PIN)',
        'Consulter solde points & minutes gratuites, progression vers Fidele/VIP, code parrain 5 caracteres, historique sessions, photo ronde multi-formats.',
      ],
      [
        'Verification Ticket QR',
        '/t/:token (Scan QR du ticket)',
        'Page publique temps reel permettant au joueur ou controleur de verifier la validite et le chrono restant d\'un ticket.',
      ],
      [
        'Role CAISSIER',
        'Connexion par PIN / Mot de passe',
        'Tableau de bord, Postes Live, Billetterie, File d\'attente, Fidelite, Caisse & Snacks, Guide. Pas d\'acces Domotique, Rapports ni Parametres.',
      ],
      [
        'Role GERANT',
        'Connexion par PIN / Mot de passe',
        'Tous les droits Caissier + acces complet Domotique IoT et Rapports financiers & exports.',
      ],
      [
        'Role ADMIN (Proprietaire)',
        'PIN / Mot de passe (+ 2FA optionnelle)',
        'Controle absolu : toutes les vues + 12 rubriques Parametres, Gestion Personnel, Config WhatsApp Meta & Regles Fidelite.',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 7.8, cellPadding: 2.2 },
  });

  addPageFooters(doc, venueName);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Guide_Utilisation_Complet_${venueName.replace(/\s+/g, '_')}_${stamp}.pdf`);
}
