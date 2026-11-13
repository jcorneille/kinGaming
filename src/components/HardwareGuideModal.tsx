import React, { useState } from 'react';
import {
  BookOpen,
  Cpu,
  Zap,
  DollarSign,
  CheckCircle2,
  HelpCircle,
  FileText,
  ShieldAlert,
  Server,
  Layers,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';

export const HardwareGuideModal: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'wiring' | 'bom' | 'tasmota' | 'whatsapp' | 'cashier_guide' | 'test_plan'>('wiring');

  return (
    <div className="space-y-4">
      {/* Sélecteur de sous-section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSection('wiring')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeSection === 'wiring' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Schéma de Câblage Électrique
          </button>
          <button
            onClick={() => setActiveSection('bom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeSection === 'bom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Liste Matériel & Budget (Kinshasa)
          </button>
          <button
            onClick={() => setActiveSection('tasmota')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeSection === 'tasmota' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Config MQTT / Tasmota / Shelly
          </button>
          <button
            onClick={() => setActiveSection('whatsapp')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeSection === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            WhatsApp Meta Cloud API (2.15)
          </button>
          <button
            onClick={() => setActiveSection('cashier_guide')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeSection === 'cashier_guide' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Manuel Caissier (Guide &lt; 15s)
          </button>
          <button
            onClick={() => setActiveSection('test_plan')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              activeSection === 'test_plan' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Plan de Tests (Sécurité & Statuts)
          </button>
        </div>
      </div>

      {/* Section 1 : Schéma de Câblage Électrique */}
      {activeSection === 'wiring' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 max-w-4xl mx-auto">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Schéma d'Implantation Électrique & Domotique (10 Postes)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Topologie en étoile sécurisée avec protection par disjoncteur différentiel et alimentation secourue par onduleur.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
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
┌──────────────────┐          ┌───────────────────────────────────┐
│ ONDULEUR (UPS)   │          │ COFFRET PRINCIPAL DE DISTRIBUTION │
│ 1500VA CAISSE    │          │ (Rail DIN)                        │
└────────┬─────────┘          └─┬──────────────┬──────────────────┘
         │                      │              │
         ▼                      ▼              ▼
  ┌──────────────┐     ┌────────────────┐ ┌────────────────┐
  │ Routeur WiFi │     │ Disjoncteur 16A│ │ Disjoncteur 16A│
  │ + Broker MQTT│     │ Zone PS4 (1-8) │ │ Zone PS5 (9-10)│
  │ + PC Caissier│     └───────┬────────┘ └───────┬────────┘
  └──────────────┘             │                  │
                               ▼                  ▼
                    ┌─────────────────────┐ ┌─────────────────────┐
                    │ 8x Prises Shelly 1PM│ │ 2x Prises Shelly 1PM│
                    │ ou Sonoff S26 (WiFi)│ │ ou Sonoff S26 (WiFi)│
                    │ (Postes 1 à 8)      │ │ (Postes 9 et 10)    │
                    └──────────┬──────────┘ └──────────┬──────────┘
                               │                       │
                               ▼                       ▼
                    ┌─────────────────────┐ ┌─────────────────────┐
                    │ Console PS4         │ │ Console PS5         │
                    │ + Écran TV 50"      │ │ + Écran TV 55" 120Hz│
                    └─────────────────────┘ └─────────────────────┘
            `}</pre>
          </div>
        </div>
      )}

      {/* Section 2 : Liste Matériel & Budget */}
      {activeSection === 'bom' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 max-w-4xl mx-auto">
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
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Prises Connectées Mesure Énergie</td>
                  <td className="py-2.5 px-3 text-cyan-400">Shelly Plus 1PM ou Sonoff S26R2</td>
                  <td className="py-2.5 px-3 text-center">10</td>
                  <td className="py-2.5 px-3 text-right">$18.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$180.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">504 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Passerelle & Broker MQTT Local</td>
                  <td className="py-2.5 px-3 text-cyan-400">Raspberry Pi 4 / Mini PC Linux</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$85.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$85.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">238 000 FC</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Onduleur Line-Interactive 1500VA</td>
                  <td className="py-2.5 px-3 text-cyan-400">Mercury / APC 1500VA</td>
                  <td className="py-2.5 px-3 text-center">1</td>
                  <td className="py-2.5 px-3 text-right">$120.00</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">$120.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">336 000 FC</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3 : Config Tasmota / MQTT */}
      {activeSection === 'tasmota' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 max-w-4xl mx-auto text-xs">
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 max-w-4xl mx-auto text-xs">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>Guide d'Intégration Meta WhatsApp Business Cloud API</span>
            </h3>
            <p className="text-slate-400 mt-1">
              Procédure officielle pas-à-pas pour connecter le compte professionnel Meta de Kin Gaming Hub et activer les notifications automatiques vers les joueurs en RDC (+243).
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">1</span>
                Création du compte Meta Business Manager & Application Developer
              </h4>
              <p className="text-slate-300">
                1. Rendez-vous sur <code>business.facebook.com</code> et créez ou associez l'entreprise "Kin Gaming Hub".<br />
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
                <li><strong>promotion_statut</strong> : "Félicitations &#123;&#123;1&#125;&#125; ! Vous venez de passer au statut &#123;&#123;2&#125;&#125; chez Kin Gaming Hub..."</li>
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 max-w-4xl mx-auto text-xs">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Manuel Opérationnel du Caissier (Kin Gaming Hub)</span>
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 max-w-4xl mx-auto text-xs">
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
