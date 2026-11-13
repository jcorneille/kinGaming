import React, { useState } from 'react';
import {
  Zap,
  Power,
  Sliders,
  Radio,
  Server,
  AlertTriangle,
  RotateCcw,
  Gauge,
  Thermometer,
  Wind,
  Lightbulb,
  CheckCircle2,
  Terminal,
  Settings2
} from 'lucide-react';
import { DomotiqueDevice, Station, SystemSettings } from '../types';
import { mqttGateway, MqttPacketLog } from '../services/mqttService';

interface DomotiqueViewProps {
  devices: DomotiqueDevice[];
  stations: Station[];
  settings: SystemSettings;
  onToggleDevice: (deviceId: string) => void;
  onMasterPowerOff: () => void;
  onMasterPowerOn: () => void;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
}

export const DomotiqueView: React.FC<DomotiqueViewProps> = ({
  devices,
  stations,
  settings,
  onToggleDevice,
  onMasterPowerOff,
  onMasterPowerOn,
  onUpdateSettings,
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'rack' | 'automations' | 'mqtt_logs' | 'config'>('rack');
  const [packetLogs, setPacketLogs] = useState<MqttPacketLog[]>(mqttGateway.getLogs());
  const [showConfirmModal, setShowConfirmModal] = useState<{ open: boolean; device: DomotiqueDevice | null }>({
    open: false,
    device: null,
  });

  // Abonnement aux logs MQTT en temps réel
  React.useEffect(() => {
    const unsubscribe = mqttGateway.onPacket(() => {
      setPacketLogs([...mqttGateway.getLogs()]);
    });
    return unsubscribe;
  }, []);

  // Calcul de la puissance instantanée totale
  const totalWatts = devices
    .filter(d => d.state === 'ON')
    .reduce((sum, d) => sum + d.watts, 0);

  const totalKWh = devices.reduce((sum, d) => sum + d.totalKWh, 0);

  // Estimation du coût énergétique en CDF et USD (hypothèse SNEL Kinshasa : ~0.12 USD / kWh = ~336 CDF / kWh)
  const estimatedCostUSD = totalKWh * 0.12;
  const estimatedCostCDF = estimatedCostUSD * settings.exchangeRate;

  const handleDeviceClick = (device: DomotiqueDevice) => {
    // Vérifier si c'est un poste actuellement en jeu pour exiger une confirmation de sécurité
    if (device.stationId && device.state === 'ON') {
      const station = stations.find(s => s.id === device.stationId);
      if (station && station.status === 'occupied') {
        setShowConfirmModal({ open: true, device });
        return;
      }
    }
    onToggleDevice(device.id);
  };

  const confirmDangerousCut = () => {
    if (showConfirmModal.device) {
      onToggleDevice(showConfirmModal.device.id);
    }
    setShowConfirmModal({ open: false, device: null });
  };

  return (
    <div className="space-y-4">
      {/* En-tête KPI Énergétique & Master Switch */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Métriques Live */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-sans block">Puissance Instantanée</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-cyan-400">{(totalWatts / 1000).toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-mono">kW</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-sans block">Consommation Cumulée</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-emerald-400">{totalKWh.toFixed(1)}</span>
              <span className="text-xs text-slate-400 font-mono">kWh</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-sans block">Coût Électrique Estimé</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-amber-400">${estimatedCostUSD.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-mono">({Math.round(estimatedCostCDF).toLocaleString()} FC)</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-[10px] text-slate-400 font-sans block">Passerelle MQTT</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-emerald-400">CONNECTÉ</span>
            </div>
          </div>
        </div>

        {/* Boutons Master Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={onMasterPowerOn}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
          >
            <Power className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tout Allumer</span>
          </button>

          <button
            onClick={onMasterPowerOff}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Extinction Générale (Fermeture)</span>
          </button>
        </div>
      </div>

      {/* Sous-navigation Domotique */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setSelectedSubTab('rack')}
          className={`px-3 py-1.5 rounded-lg transition ${
            selectedSubTab === 'rack' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Baie Virtuelle des 10 Relais & Prises
        </button>
        <button
          onClick={() => setSelectedSubTab('automations')}
          className={`px-3 py-1.5 rounded-lg transition ${
            selectedSubTab === 'automations' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Automatisations & Économie
        </button>
        <button
          onClick={() => setSelectedSubTab('mqtt_logs')}
          className={`px-3 py-1.5 rounded-lg transition ${
            selectedSubTab === 'mqtt_logs' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Sniffer / Logs MQTT ({packetLogs.length})
        </button>
        <button
          onClick={() => setSelectedSubTab('config')}
          className={`px-3 py-1.5 rounded-lg transition ${
            selectedSubTab === 'config' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Configuration Broker & Matériel
        </button>
      </div>

      {/* Onglet 1 : Baie Virtuelle des Relais */}
      {selectedSubTab === 'rack' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Cliquez sur un relais pour basculer son alimentation. La sécurité bloque la coupure impromptue des postes en jeu.</span>
            <span className="font-mono text-cyan-400">10 Prises Postes + 4 Lignes Auxiliaires</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices.map((device) => {
              const isON = device.state === 'ON';
              const station = device.stationId ? stations.find(s => s.id === device.stationId) : null;
              const isGaming = station && station.status === 'occupied';

              return (
                <div
                  key={device.id}
                  className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between transition-all ${
                    isON
                      ? 'border-cyan-500/50 shadow-md shadow-cyan-500/10'
                      : 'border-slate-800 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{device.name}</span>
                        {isGaming && (
                          <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold rounded">
                            Partie en cours
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Topic : {device.relayTopic}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {device.hardwareType} · IP: {device.ipAddress}
                      </div>
                    </div>

                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        isON ? 'bg-cyan-400 shadow-md shadow-cyan-400/50 animate-pulse' : 'bg-slate-700'
                      }`}
                    />
                  </div>

                  {/* Consommation Live & Bouton Commutateur */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="font-mono text-xs">
                      <span className="text-slate-400 font-sans block text-[10px]">Puissance :</span>
                      <span className={`font-bold text-sm ${isON ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {isON ? `${device.watts.toFixed(1)} W` : '0 W'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeviceClick(device)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 shadow ${
                        isON
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isON ? 'COMMUTER (OFF)' : 'ALLUMER (ON)'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Onglet 2 : Automatisations & Économies d'Énergie */}
      {selectedSubTab === 'automations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>Règles d'Automatisation Domotique</span>
            </h3>
            <p className="text-xs text-slate-400">
              Paramètres permettant d'automatiser l'extinction et de réduire la facture d'électricité.
            </p>
          </div>

          <div className="space-y-4">
            {/* Règle 1 : Allumage auto au ticket */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700">
              <div>
                <span className="text-sm font-bold text-white block">Allumage automatique à l'ouverture de ticket</span>
                <span className="text-xs text-slate-400">
                  Dès qu'un caissier valide un ticket, le relais de la prise console + TV s'enclenche instantanément.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPowerOnWithTicket}
                onChange={(e) => onUpdateSettings({ autoPowerOnWithTicket: e.target.checked })}
                className="w-5 h-5 rounded text-cyan-600 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Règle 2 : Coupure auto fin de temps */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700">
              <div>
                <span className="text-sm font-bold text-white block">Extinction automatique à la fin du temps de jeu</span>
                <span className="text-xs text-slate-400">
                  Une alerte sonore retentit à 5 min, puis le relais coupe l'écran pour inviter le joueur à prolonger.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPowerOffAtSessionEnd}
                onChange={(e) => onUpdateSettings({ autoPowerOffAtSessionEnd: e.target.checked })}
                className="w-5 h-5 rounded text-cyan-600 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Règle 3 : Délai d'extinction poste libre */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700">
              <div>
                <span className="text-sm font-bold text-white block">Extinction de veille après inactivité</span>
                <span className="text-xs text-slate-400">
                  Si un poste reste libre pendant ce délai, la prise est automatiquement coupée.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.idleAutoCutMinutes}
                  onChange={(e) => onUpdateSettings({ idleAutoCutMinutes: Number(e.target.value) })}
                  className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white font-mono text-center"
                />
                <span className="text-xs text-slate-400">minutes</span>
              </div>
            </div>

            {/* Règle 4 : Pré-alerte sonore */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700">
              <div>
                <span className="text-sm font-bold text-white block">Pré-alerte sonore avant coupure</span>
                <span className="text-xs text-slate-400">
                  Bip d'avertissement pour laisser le temps au joueur de sauvegarder sa partie ou prolonger à la caisse.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.warningBeforeCutMinutes}
                  onChange={(e) => onUpdateSettings({ warningBeforeCutMinutes: Number(e.target.value) })}
                  className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white font-mono text-center"
                />
                <span className="text-xs text-slate-400">minutes</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet 3 : Sniffer / Logs MQTT */}
      {selectedSubTab === 'mqtt_logs' && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between font-sans">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Moniteur de Paquets MQTT (Broker Local / Simulateur)</span>
            </span>
            <span className="text-[11px] text-slate-400">Port 1883 / WebSockets</span>
          </div>

          <div className="p-4 space-y-1.5 max-h-[400px] overflow-y-auto">
            {packetLogs.map((pkt) => (
              <div key={pkt.id} className="flex items-center gap-3 text-[11px] hover:bg-slate-900/60 p-1 rounded">
                <span className="text-slate-500 whitespace-nowrap">
                  {new Date(pkt.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    pkt.direction === 'PUBLISH_OUT' ? 'bg-blue-600/30 text-blue-400' : 'bg-emerald-600/30 text-emerald-400'
                  }`}
                >
                  {pkt.direction}
                </span>
                <span className="text-cyan-300 font-semibold">{pkt.topic}</span>
                <span className="text-slate-400">→</span>
                <span className="text-amber-300 truncate">{pkt.payload}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglet 4 : Configuration Broker */}
      {selectedSubTab === 'config' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <span>Paramètres de Connexion MQTT</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Adresse IP du Broker (ex: Raspberry Pi / PC Local)</label>
              <input
                type="text"
                value={settings.mqttBrokerHost}
                onChange={(e) => onUpdateSettings({ mqttBrokerHost: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Port MQTT</label>
                <input
                  type="number"
                  value={settings.mqttBrokerPort}
                  onChange={(e) => onUpdateSettings({ mqttBrokerPort: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Préfixe de Topic</label>
                <input
                  type="text"
                  value={settings.mqttTopicPrefix}
                  onChange={(e) => onUpdateSettings({ mqttTopicPrefix: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Identifiant Utilisateur MQTT</label>
              <input
                type="text"
                value={settings.mqttUsername}
                onChange={(e) => onUpdateSettings({ mqttUsername: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmation de Sécurité pour coupure en cours de jeu */}
      {showConfirmModal.open && showConfirmModal.device && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-600/80 rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Attention : Session en cours !</h3>
              <p className="text-xs text-slate-300 mt-1">
                Le poste relié à <span className="font-bold text-rose-400">{showConfirmModal.device.name}</span> est actuellement occupé par un client.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Une coupure brutale interrompra sa partie et peut corrompre les données de jeu.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal({ open: false, device: null })}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={confirmDangerousCut}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30"
              >
                Couper quand même
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
