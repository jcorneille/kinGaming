import React, { useState, useEffect } from 'react';
import { WhatsAppConfig, NotificationLog } from '../types';
import {
  OFFICIAL_TEMPLATES,
  normalizeE164,
  maskPhoneNumber,
  WhatsAppCloudProvider,
  hasRealMetaCredentials,
  renderTemplateText,
  buildWaMeUrl,
} from '../services/whatsappService';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Key,
  Hash,
  Globe,
  Activity,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface WhatsAppConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatsAppConfig;
  onSaveConfig: (updated: WhatsAppConfig) => void;
  notificationLogs: NotificationLog[];
  onSimulateWebhookReply: (replyText: string, fromPhone: string) => void;
  onWebhookEventDispatched?: () => void;
  onClearLogs?: () => void;
  onAddLog: (log: NotificationLog) => void;
}

export const WhatsAppConfigModal: React.FC<WhatsAppConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  notificationLogs,
  onSimulateWebhookReply,
  onWebhookEventDispatched,
  onAddLog,
}) => {
  const [formData, setFormData] = useState<WhatsAppConfig>({ ...config });
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'test' | 'logs'>('settings');
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test send state
  const [testRecipient, setTestRecipient] = useState(config.testPhoneNumber || '+243895457097');
  const [testMessageMode, setTestMessageMode] = useState<'template' | 'text'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState('poste_pret');
  const [testVars, setTestVars] = useState<Record<string, string>>({
    '1': 'Corneille',
    '2': '9',
    '3': 'PS5',
    '4': '3',
  });
  const [customTestText, setCustomTestText] = useState(
    'Bonjour ! Test de notification GOZA : votre poste PS5 est prêt.'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    mode?: 'LIVE_META' | 'SIMULATION';
    message: string;
    waMeFallbackUrl?: string;
  } | null>(null);

  // Webhook reply & status simulator state
  const [simulatedReply, setSimulatedReply] = useState<'OUI' | 'ANNULER' | 'STOP'>('OUI');
  const [simulatedPhone, setSimulatedPhone] = useState(config.testPhoneNumber || '+243895457097');
  const [selectedDeliveryLogId, setSelectedDeliveryLogId] = useState<string>('');
  const [simulatedDeliveryStatus, setSimulatedDeliveryStatus] = useState<'delivered' | 'read' | 'failed'>('delivered');

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...config });
      setTestRecipient(config.testPhoneNumber || '+243895457097');
      setSimulatedPhone(config.testPhoneNumber || '+243895457097');
      setTestResult(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const isLiveMetaConfigured = hasRealMetaCredentials(formData);
  const renderedTestMessage =
    testMessageMode === 'text'
      ? customTestText
      : renderTemplateText(selectedTemplate, testVars) || `Modèle ${selectedTemplate}`;
  const effectiveRecipient =
    formData.isTestMode && formData.testPhoneNumber && normalizeE164(formData.testPhoneNumber).isValid
      ? formData.testPhoneNumber
      : testRecipient;
  const directWaMeUrl = buildWaMeUrl(effectiveRecipient, renderedTestMessage);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendTestMessage = async () => {
    setIsSendingTest(true);
    setTestResult(null);

    const norm = normalizeE164(testRecipient);
    if (!norm.isValid) {
      setTestResult({
        success: false,
        message: 'Numéro invalide. Utilisez le format +243XXXXXXXXX ou E.164 international.',
      });
      setIsSendingTest(false);
      return;
    }

    // Sauvegarder automatiquement si des identifiants ont été modifiés dans l'onglet Configuration
    if (
      formData.provider !== config.provider ||
      formData.accessToken !== config.accessToken ||
      formData.phoneNumberId !== config.phoneNumberId ||
      formData.callmebotApiKey !== config.callmebotApiKey ||
      formData.customWebhookUrl !== config.customWebhookUrl ||
      formData.isTestMode !== config.isTestMode ||
      formData.testPhoneNumber !== config.testPhoneNumber
    ) {
      onSaveConfig(formData);
    }

    try {
      const result = await WhatsAppCloudProvider.sendTemplate(
        norm.e164,
        selectedTemplate,
        testVars,
        formData,
        {
          messageType: testMessageMode,
          customText: testMessageMode === 'text' ? customTestText : undefined,
        }
      );

      if (result.success) {
        const isSim = result.mode === 'SIMULATION';
        setTestResult({
          success: true,
          mode: result.mode,
          message: isSim
            ? `Simulation locale effectuée [${result.messageId}]. Attention : aucun vrai message WhatsApp n'a été envoyé sur votre téléphone car votre Jeton d'Accès Meta Graph API n'est pas configuré. Utilisez « Envoyer via WhatsApp (wa.me) » ci-dessous pour un envoi réel immédiat !`
            : `Message réellement envoyé via Meta Graph API vers ${effectiveRecipient} ! [ID: ${result.messageId}]`,
          waMeFallbackUrl: isSim ? directWaMeUrl : undefined,
        });

        onAddLog({
          id: `notif-${Date.now()}`,
          timestamp: Date.now(),
          clientName: testVars['1'] || 'Destinataire Test',
          phone: norm.e164,
          templateName: testMessageMode === 'text' ? 'texte_libre' : selectedTemplate,
          variables: testMessageMode === 'text' ? { '1': customTestText } : testVars,
          renderedMessage: renderedTestMessage,
          status: 'SENT',
          retryCount: 0,
          metaMessageId: result.messageId,
        });
      } else {
        setTestResult({
          success: false,
          mode: result.mode,
          message: `${result.errorMessage || 'Échec de transmission Meta.'} Vous pouvez aussi envoyer ce message directement via WhatsApp Web/App (bouton ci-dessous).`,
          waMeFallbackUrl: directWaMeUrl,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erreur inconnue.',
        waMeFallbackUrl: directWaMeUrl,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSelectTemplateForTest = (templateKey: string) => {
    setTestMessageMode('template');
    setSelectedTemplate(templateKey);
    const tmpl = OFFICIAL_TEMPLATES[templateKey];
    if (tmpl) {
      const newVars: Record<string, string> = {};
      tmpl.exampleVariables.forEach((val, idx) => {
        newVars[String(idx + 1)] = val;
      });
      setTestVars(newVars);
    }
  };

  const getStatusBadge = (status: NotificationLog['status']) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Délivré</span>;
      case 'READ':
        return <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Lu</span>;
      case 'SENT':
        return <span className="text-xs px-2 py-0.5 rounded bg-slate-500/10 text-slate-300 border border-slate-500/20">Envoyé</span>;
      case 'FAILED':
        return <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Échec</span>;
      case 'PENDING':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">En cours</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                WhatsApp Business Cloud API (Meta)
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${formData.isTestMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {formData.isTestMode ? 'Mode Bac à Sable / Test' : 'Mode Production'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Notifications automatiques officielles pour la file d'attente et libération des postes (RDC +243)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Configuration API & Clés
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Modèles Meta Approuvés ({Object.keys(OFFICIAL_TEMPLATES).length})
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'test'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            Test d'envoi & Simulateur Webhook
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Journal des Envois ({notificationLogs.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-300">
          {savedSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Configuration WhatsApp sauvegardée avec succès.
            </div>
          )}

          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Sélecteur de passerelle d'envoi réel */}
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">Passerelle d'Envoi Automatique WhatsApp</h3>
                  <p className="text-xs text-slate-400">
                    Choisissez comment GOZA envoie les messages WhatsApp automatiques.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      {
                        id: 'META_CLOUD',
                        title: 'Meta Cloud API (Officiel)',
                        desc: 'API WhatsApp Business v21.0',
                      },
                      {
                        id: 'CALLMEBOT',
                        title: 'CallMeBot (Gratuit & Rapide)',
                        desc: 'Sans compte Meta Business',
                      },
                      {
                        id: 'CUSTOM_WEBHOOK',
                        title: 'Webhook HTTP / UltraMsg',
                        desc: 'Green-API / Evolution API',
                      },
                    ] as const
                  ).map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, provider: prov.id })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        (formData.provider || 'META_CLOUD') === prov.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-white'
                          : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{prov.title}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{prov.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Test & Numéro Sandbox */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <div>
                    <h3 className="font-semibold text-white text-sm">Mode Test & Environnement</h3>
                    <p className="text-xs text-slate-400">
                      En mode test, les messages sont routés uniquement vers votre numéro de test vérifié.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTestMode}
                      onChange={(e) => setFormData({ ...formData, isTestMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {formData.isTestMode && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                      Numéro de Test Autorisé (E.164)
                    </label>
                    <input
                      type="text"
                      value={formData.testPhoneNumber}
                      onChange={(e) => setFormData({ ...formData, testPhoneNumber: e.target.value })}
                      placeholder="+243 89 545 7097"
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Numéro vérifié pour recevoir vos tests en mode Bac à Sable.
                    </p>
                  </div>
                )}
              </div>

              {(formData.provider || 'META_CLOUD') === 'CALLMEBOT' && (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-3 text-xs">
                  <div className="font-bold text-emerald-300 text-sm">
                    Configuration CallMeBot (Envoi WhatsApp réel gratuit en 30 secondes)
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Enregistrez le contact <span className="font-mono text-white font-bold">+34 644 71 98 38</span> dans votre téléphone.</li>
                    <li>Envoyez-lui sur WhatsApp le message exact : <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300">I allow callmebot to send me messages</code></li>
                    <li>Collez ci-dessous la clé <strong>apikey</strong> reçue en réponse :</li>
                  </ol>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      CallMeBot API Key
                    </label>
                    <input
                      type="text"
                      value={formData.callmebotApiKey || ''}
                      onChange={(e) => setFormData({ ...formData, callmebotApiKey: e.target.value })}
                      placeholder="ex. 1234567"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {(formData.provider || 'META_CLOUD') === 'CUSTOM_WEBHOOK' && (
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3 text-xs">
                  <div className="font-bold text-cyan-300 text-sm">
                    Passerelle HTTP Personnalisée (UltraMsg, Green-API, Evolution API, Zapier…)
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      URL Endpoint POST (Webhook d'envoi)
                    </label>
                    <input
                      type="url"
                      value={formData.customWebhookUrl || ''}
                      onChange={(e) => setFormData({ ...formData, customWebhookUrl: e.target.value })}
                      placeholder="https://api.ultramsg.com/instanceXXXX/messages/chat"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Jeton Bearer / Token (Optionnel)
                    </label>
                    <input
                      type="password"
                      value={formData.customWebhookToken || ''}
                      onChange={(e) => setFormData({ ...formData, customWebhookToken: e.target.value })}
                      placeholder="Token d'autorisation..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Meta Credentials */}
              {(formData.provider || 'META_CLOUD') === 'META_CLOUD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    Phone Number ID (ID Numéro WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={formData.phoneNumberId}
                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                    placeholder="ex. 109876543210987"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Fourni dans WhatsApp &gt; Configuration de l'API dans Meta Developers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <input
                    type="text"
                    value={formData.businessAccountId}
                    onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                    placeholder="ex. 234567890123456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Identifiant de votre compte WhatsApp Business professionnel.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      Jeton d'Accès Permanent (System User Token)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      {showToken ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    placeholder="EAAG..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Généré dans Business Manager &gt; Utilisateurs système &gt; Token permanent (portée: <code>whatsapp_business_messaging</code>).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Version Graph API Meta
                  </label>
                  <input
                    type="text"
                    value={formData.apiVersion}
                    onChange={(e) => setFormData({ ...formData, apiVersion: e.target.value })}
                    placeholder="v21.0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Jeton de Vérification Webhook (Verify Token)
                  </label>
                  <input
                    type="text"
                    value={formData.verifyToken}
                    onChange={(e) => setFormData({ ...formData, verifyToken: e.target.value })}
                    placeholder="kin_gaming_hub_secure_token_2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2 p-3 bg-slate-950/70 border border-cyan-500/30 rounded-lg space-y-1 text-xs">
                  <div className="font-semibold text-cyan-300">URL de Callback Webhook Meta (Confirmations de livraison & Réponses)</div>
                  <div className="font-mono text-white break-all select-all bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '/api/whatsapp/webhook'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Configurez cette URL + le Verify Token ci-dessus dans Meta App &gt; WhatsApp &gt; Configuration &gt; Webhook (champs <code className="text-cyan-300">messages</code> et <code className="text-cyan-300">message_template_status_update</code>).
                  </p>
                </div>
              </div>
              )}

              {/* Automatic Triggers */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm">Déclencheurs Automatiques (Triggers)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoNotifyQueueTurn}
                      onChange={(e) => setFormData({ ...formData, autoNotifyQueueTurn: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-0"
                    />
                    <span>Poste libéré &rarr; Notification du prochain client</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoNotifyQueueApproaching}
                      onChange={(e) => setFormData({ ...formData, autoNotifyQueueApproaching: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-0"
                    />
                    <span>Bientôt votre tour (position 2/3 ou &le;10 min)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoNotifyGraceReminder}
                      onChange={(e) => setFormData({ ...formData, autoNotifyGraceReminder: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-0"
                    />
                    <span>Rappel délai de grâce (à 1m30 de la fin)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoNotifyPromotions}
                      onChange={(e) => setFormData({ ...formData, autoNotifyPromotions: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-0"
                    />
                    <span>Promotion statut (Fidèle / VIP)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-emerald-950/40"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Conformément aux règles de Meta, les messages initiés par l'entreprise doivent impérativement utiliser des <strong>modèles pré-approuvés</strong> dans la catégorie <strong>Utility</strong>. Les variables dynamiques sont remplacées automatiquement par le système.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.values(OFFICIAL_TEMPLATES).map((tmpl) => (
                  <div key={tmpl.name} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-white">{tmpl.name}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {tmpl.status}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {tmpl.category} (FR)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          handleSelectTemplateForTest(tmpl.name);
                          setActiveTab('test');
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Tester ce modèle
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">{tmpl.description}</p>

                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 font-mono text-xs text-slate-200">
                      "{tmpl.bodyText}"
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-medium text-slate-300">Variables d'exemple:</span>
                      {tmpl.exampleVariables.map((v, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {`{{${i + 1}}}`}: "{v}"
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TEST DISPATCHER & WEBHOOK SIMULATOR */}
          {activeTab === 'test' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Test Sender */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Émettre un message test WhatsApp</h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isLiveMetaConfigured
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isLiveMetaConfigured ? 'Meta API Réelle' : 'Simulation Locale'}
                  </span>
                </div>

                {!isLiveMetaConfigured && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Jeton Meta Graph API non configuré</span>
                    </div>
                    <p className="text-amber-200/80">
                      Sans vrai Jeton Meta dans « Configuration API & Clés », l'API automatique reste en simulation locale. Pour tester un <strong>vrai envoi immédiat sur votre téléphone</strong>, utilisez le bouton vert <strong>« Ouvrir & Envoyer dans WhatsApp (wa.me) »</strong> ci-dessous !
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Numéro destinataire (RDC +243 ou E.164)
                  </label>
                  <input
                    type="text"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="+243895457097"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  {formData.isTestMode && formData.testPhoneNumber && (
                    <p className="text-[11px] text-amber-300 mt-1">
                      Mode Bac à Sable actif : l'API Meta routera vers {formData.testPhoneNumber}.
                    </p>
                  )}
                </div>

                {/* Type de message : Modèle Meta ou Texte libre */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestMessageMode('template')}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      testMessageMode === 'template'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Modèle Meta
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestMessageMode('text')}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      testMessageMode === 'text'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Message Texte Libre
                  </button>
                </div>

                {testMessageMode === 'template' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Modèle de message
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleSelectTemplateForTest(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        {Object.values(OFFICIAL_TEMPLATES).map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.language}) - {t.description.substring(0, 40)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    {Object.keys(testVars).length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Paramètres des variables
                        </label>
                        {Object.keys(testVars).map((varKey) => (
                          <div key={varKey} className="flex items-center gap-2">
                            <span className="w-10 text-xs font-mono text-emerald-400 bg-slate-900 px-2 py-1.5 rounded text-center border border-slate-800">
                              {`{{${varKey}}}`}
                            </span>
                            <input
                              type="text"
                              value={testVars[varKey] || ''}
                              onChange={(e) => setTestVars({ ...testVars, [varKey]: e.target.value })}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Contenu du message WhatsApp
                    </label>
                    <textarea
                      rows={3}
                      value={customTestText}
                      onChange={(e) => setCustomTestText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Aperçu du message */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                  <span className="text-slate-400 font-semibold block mb-1">Aperçu du message :</span>
                  "{renderedTestMessage}"
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs space-y-2 ${
                      !testResult.success
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                        : testResult.mode === 'SIMULATION'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!testResult.success ? (
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                      ) : testResult.mode === 'SIMULATION' ? (
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={isSendingTest}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingTest
                      ? 'Transmission en cours...'
                      : isLiveMetaConfigured
                      ? 'Envoyer via Meta Cloud API (Automatique)'
                      : 'Tester Proxy Serveur (Mode Simulation)'}
                  </button>

                  <a
                    href={directWaMeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      const norm = normalizeE164(effectiveRecipient);
                      onAddLog({
                        id: `notif-wame-${Date.now()}`,
                        timestamp: Date.now(),
                        clientName: testVars['1'] || 'Test WhatsApp Direct',
                        phone: norm.e164 || effectiveRecipient,
                        templateName: testMessageMode === 'text' ? 'texte_libre_wa_me' : `${selectedTemplate}_wa_me`,
                        variables: testVars,
                        renderedMessage: renderedTestMessage,
                        status: 'SENT',
                        retryCount: 0,
                        metaMessageId: `wame.${Date.now()}`,
                      });
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ouvrir & Envoyer dans WhatsApp (Réel · wa.me)
                  </a>
                </div>
              </div>

              {/* Webhook Simulator */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Simulateur d'événement Webhook Inbound</h3>
                </div>

                <p className="text-xs text-slate-400">
                  Simule une réponse client reçue via le Webhook Meta pour tester la réactivité de la file d'attente.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Numéro du client expéditeur
                  </label>
                  <input
                    type="text"
                    value={simulatedPhone}
                    onChange={(e) => setSimulatedPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Réponse du client
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulatedReply('OUI')}
                      className={`py-2 px-3 text-xs rounded-lg font-medium border transition-colors ${
                        simulatedReply === 'OUI'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      "OUI, j'arrive"
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedReply('ANNULER')}
                      className={`py-2 px-3 text-xs rounded-lg font-medium border transition-colors ${
                        simulatedReply === 'ANNULER'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      "ANNULER"
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedReply('STOP')}
                      className={`py-2 px-3 text-xs rounded-lg font-medium border transition-colors ${
                        simulatedReply === 'STOP'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      "STOP" (Opt-out)
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                  {simulatedReply === 'OUI' && (
                    <span>Confirme la présence du client et marque le ticket comme en cours de validation.</span>
                  )}
                  {simulatedReply === 'ANNULER' && (
                    <span className="text-rose-400 font-medium">
                      Retire automatiquement le client de la file d'attente et appelle le suivant immédiatement.
                    </span>
                  )}
                  {simulatedReply === 'STOP' && (
                    <span className="text-amber-400 font-medium">
                      Désactive le consentement WhatsApp du client pour respecter la vie privée.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const norm = normalizeE164(simulatedPhone);
                    const finalPhone = norm.e164 || simulatedPhone;
                    try {
                      await fetch('/api/whatsapp/webhook', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          object: 'whatsapp_business_account',
                          entry: [
                            {
                              changes: [
                                {
                                  field: 'messages',
                                  value: {
                                    messages: [
                                      {
                                        from: finalPhone.replace(/^\+/, ''),
                                        text: { body: simulatedReply },
                                        timestamp: String(Math.floor(Date.now() / 1000)),
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          ],
                        }),
                      });
                    } catch {
                      // Fallback local
                    }
                    onSimulateWebhookReply(simulatedReply, finalPhone);
                    onWebhookEventDispatched?.();
                    setTestResult({
                      success: true,
                      message: `Événement webhook "${simulatedReply}" traité via /api/whatsapp/webhook pour ${finalPhone}.`,
                    });
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Déclencher Webhook Réponse Client
                </button>

                {/* Simulateur Webhook Accusé de Livraison (Meta statuses) */}
                <div className="pt-3 border-t border-slate-700/60 space-y-2.5">
                  <div className="text-xs font-semibold text-cyan-300">
                    Confirmation de livraison Webhook Meta (Statuses)
                  </div>
                  <select
                    value={selectedDeliveryLogId}
                    onChange={(e) => setSelectedDeliveryLogId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">Dernière notification envoyée</option>
                    {notificationLogs.slice(0, 15).map((lg) => (
                      <option key={lg.id} value={lg.id}>
                        {lg.clientName} ({lg.templateName}) — {lg.status}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['delivered', 'read', 'failed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSimulatedDeliveryStatus(st)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold border uppercase cursor-pointer ${
                          simulatedDeliveryStatus === st
                            ? st === 'failed'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {st === 'delivered' ? 'Délivré' : st === 'read' ? 'Lu' : 'Échec'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const targetLog =
                        notificationLogs.find((l) => l.id === selectedDeliveryLogId) || notificationLogs[0];
                      const messageId = targetLog?.metaMessageId || `wamid.sim.${Date.now()}`;
                      const recipientPhone = (targetLog?.phone || simulatedPhone).replace(/^\+/, '');
                      try {
                        await fetch('/api/whatsapp/webhook', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            object: 'whatsapp_business_account',
                            entry: [
                              {
                                changes: [
                                  {
                                    field: 'messages',
                                    value: {
                                      statuses: [
                                        {
                                          id: messageId,
                                          status: simulatedDeliveryStatus,
                                          recipient_id: recipientPhone,
                                          timestamp: String(Math.floor(Date.now() / 1000)),
                                          errors:
                                            simulatedDeliveryStatus === 'failed'
                                              ? [{ message: 'Numéro injoignable (Simulation Webhook)' }]
                                              : undefined,
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            ],
                          }),
                        });
                        onWebhookEventDispatched?.();
                        setTestResult({
                          success: true,
                          message: `Accusé Webhook "${simulatedDeliveryStatus.toUpperCase()}" reçu pour ${messageId}.`,
                        });
                      } catch (err: any) {
                        setTestResult({
                          success: false,
                          message: err?.message || 'Erreur lors de l’appel webhook',
                        });
                      }
                    }}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Simuler Accusé de Livraison Meta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LOGS & AUDIT */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>
                  {notificationLogs.length} notifications enregistrées (numéros masqués conformément aux normes de confidentialité)
                </span>
              </div>

              {notificationLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Aucune notification WhatsApp envoyée pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {notificationLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{log.clientName}</span>
                          <span className="font-mono text-slate-400">{maskPhoneNumber(log.phone)}</span>
                          <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {log.templateName}
                          </span>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-slate-300 font-sans">{log.renderedMessage}</p>
                        {log.replies && log.replies.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-slate-700/40 text-blue-400 flex items-center gap-1.5">
                            <span className="font-semibold">Réponse reçue :</span>
                            <span>"{log.replies[log.replies.length - 1].text}"</span>
                          </div>
                        )}
                        {log.errorMessage && (
                          <p className="text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {log.errorMessage}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-slate-400 space-y-0.5 flex-shrink-0">
                        <div className="flex items-center md:justify-end gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        {log.metaMessageId && (
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                            ID: {log.metaMessageId.substring(0, 16)}...
                          </div>
                        )}
                        {log.deliveredAt && (
                          <div className="text-[10px] font-mono text-blue-400">
                            Délivré : {new Date(log.deliveredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        )}
                        {log.readAt && (
                          <div className="text-[10px] font-mono text-emerald-400">
                            Lu : {new Date(log.readAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
