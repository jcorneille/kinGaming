import React, { useState } from 'react';
import { WhatsAppConfig, NotificationLog } from '../types';
import { OFFICIAL_TEMPLATES, normalizeE164, maskPhoneNumber, WhatsAppCloudProvider } from '../services/whatsappService';
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
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface WhatsAppConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatsAppConfig;
  onSaveConfig: (updated: WhatsAppConfig) => void;
  notificationLogs: NotificationLog[];
  onSimulateWebhookReply: (replyText: string, fromPhone: string) => void;
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
  onAddLog,
}) => {
  const [formData, setFormData] = useState<WhatsAppConfig>({ ...config });
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'test' | 'logs'>('settings');
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test send state
  const [testRecipient, setTestRecipient] = useState(config.testPhoneNumber || '+243895457097');
  const [selectedTemplate, setSelectedTemplate] = useState('poste_pret');
  const [testVars, setTestVars] = useState<Record<string, string>>({
    '1': 'Corneille',
    '2': '9',
    '3': 'PS5',
    '4': '3',
  });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Webhook reply simulator state
  const [simulatedReply, setSimulatedReply] = useState<'OUI' | 'ANNULER' | 'STOP'>('OUI');
  const [simulatedPhone, setSimulatedPhone] = useState(config.testPhoneNumber || '+243895457097');

  if (!isOpen) return null;

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
        message: 'Numéro invalide pour la RDC (+243 suivi de 9 chiffres).',
      });
      setIsSendingTest(false);
      return;
    }

    try {
      const result = await WhatsAppCloudProvider.sendTemplate(
        norm.e164,
        selectedTemplate,
        testVars,
        formData
      );

      if (result.success) {
        setTestResult({
          success: true,
          message: `Message envoyé avec succès ! (${result.mode === 'SIMULATION' ? 'Mode Simulation' : 'Meta Graph API'}) [${result.messageId}]`,
        });

        // Ajouter aux logs
        onAddLog({
          id: `notif-${Date.now()}`,
          timestamp: Date.now(),
          clientName: testVars['1'] || 'Destinataire Test',
          phone: norm.e164,
          templateName: selectedTemplate,
          variables: testVars,
          renderedMessage: `[Test] Template: ${selectedTemplate}`,
          status: 'DELIVERED',
          retryCount: 0,
          metaMessageId: result.messageId,
          deliveredAt: Date.now(),
        });
      } else {
        setTestResult({
          success: false,
          message: result.errorMessage || 'Échec de transmission Meta.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erreur inconnue.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSelectTemplateForTest = (templateKey: string) => {
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
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <div>
                    <h3 className="font-semibold text-white text-sm">Mode Test & Environnement</h3>
                    <p className="text-xs text-slate-400">
                      En mode test, les messages sont routés uniquement vers votre numéro de test vérifié Meta.
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
                      Numéro de Test Autorisé Meta (E.164)
                    </label>
                    <input
                      type="text"
                      value={formData.testPhoneNumber}
                      onChange={(e) => setFormData({ ...formData, testPhoneNumber: e.target.value })}
                      placeholder="+243 81 234 5678"
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Numéro enregistré dans la section "To" du tableau de bord Meta App pour vos tests sandbox.
                    </p>
                  </div>
                )}
              </div>

              {/* Meta Credentials */}
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
              </div>

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
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Émettre un message test (Meta Graph API)</h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Numéro destinataire (E.164 RDC)
                  </label>
                  <input
                    type="text"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="+243812345678"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Format: +243 suivi des 9 chiffres locaux.
                  </p>
                </div>

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
                        {t.name} - {t.description.substring(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variable inputs */}
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

                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={isSendingTest}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingTest ? 'Transmission en cours...' : 'Envoyer via Graph API'}
                </button>
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
                  onClick={() => {
                    const norm = normalizeE164(simulatedPhone);
                    onSimulateWebhookReply(simulatedReply, norm.e164 || simulatedPhone);
                    setTestResult({
                      success: true,
                      message: `Événement webhook "${simulatedReply}" traité pour ${norm.e164 || simulatedPhone}.`,
                    });
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Déclencher le Webhook
                </button>
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
