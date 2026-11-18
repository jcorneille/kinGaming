import { WhatsAppTemplate, WhatsAppConfig, NotificationLog } from '../types';

/**
 * Modèles WhatsApp Business Cloud (Meta)
 * Inclut `hello_world` (pré-approuvé par défaut sur tout compte Sandbox Meta) + les modèles Utility FR.
 */
export const OFFICIAL_TEMPLATES: Record<string, WhatsAppTemplate> = {
  poste_pret: {
    name: 'poste_pret',
    category: 'UTILITY',
    language: 'fr',
    status: 'APPROVED',
    description: "Envoyé quand un poste se libère et que c'est le tour du client dans la file.",
    bodyText: 'Bonjour {{1}}, le poste {{2}} ({{3}}) est prêt pour vous. Merci de vous présenter dans les {{4}} minutes.',
    exampleVariables: ['Fally', '9', 'PS5', '3'],
  },
  bientot_votre_tour: {
    name: 'bientot_votre_tour',
    category: 'UTILITY',
    language: 'fr',
    status: 'APPROVED',
    description: "Envoyé préventivement quand la position dans la file est <= 3 ou temps d'attente estimé <= 10 min.",
    bodyText: "Bonjour {{1}}, vous êtes bientôt appelé(e). Il reste environ {{2}} minutes d'attente.",
    exampleVariables: ['Michel', '10'],
  },
  delai_depasse_rappel: {
    name: 'delai_depasse_rappel',
    category: 'UTILITY',
    language: 'fr',
    status: 'APPROVED',
    description: "Rappel à mi-parcours de la période de grâce de 3 minutes si le client ne s'est pas présenté.",
    bodyText: 'Bonjour {{1}}, votre poste {{2}} vous attend encore {{3}} minutes. Répondez ANNULER si vous ne venez plus.',
    exampleVariables: ['Michel', '9', '1'],
  },
  promotion_statut: {
    name: 'promotion_statut',
    category: 'UTILITY',
    language: 'fr',
    status: 'APPROVED',
    description: 'Notification de passage au statut Fidèle ou VIP avec avantages exclusifs.',
    bodyText: 'Félicitations {{1}} ! Vous venez de passer au statut {{2}} chez GOZA. Profitez dès maintenant de vos avantages exclusifs.',
    exampleVariables: ['Junior', 'Fidèle (-5% et priorité)'],
  },
  hello_world: {
    name: 'hello_world',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    description: 'Modèle standard pré-approuvé par défaut sur chaque nouveau compte Meta Developers (idéal pour premier test API).',
    bodyText: 'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API.',
    exampleVariables: [],
  },
  bienvenue_goza: {
    name: 'bienvenue_goza',
    category: 'UTILITY',
    language: 'fr',
    status: 'APPROVED',
    description: "Message de bienvenue envoyé lors de la première inscription d'un client avec ses avantages et coordonnées Espace Client.",
    bodyText:
      'Bienvenue chez GOZA, {{1}} ! Code Client: {{2}} | Code Parrain: {{3}} | Espace Client: {{4}} | Code PIN: {{5}}.',
    exampleVariables: ['Corneille', 'KIN-4821', 'CO243', 'https://goza.cd/?tab=client', '1234'],
  },
};

/**
 * Construit le message de bienvenue WhatsApp complet avec explication des avantages et coordonnées Espace Client.
 */
export function buildClientWelcomeMessage(params: {
  fullName: string;
  clientCode: string;
  referralCode: string;
  pin: string;
  portalUrl: string;
}): string {
  const firstName = (params.fullName || 'Joueur').trim().split(' ')[0];
  return [
    `Bienvenue dans la salle de jeux GOZA, ${firstName} !`,
    ``,
    `Votre inscription est confirmée (+20 points de bienvenue offerts).`,
    ``,
    `Vos avantages GOZA :`,
    `- Gagnez des points à chaque session (convertibles en minutes de jeu gratuites PS4 & PS5).`,
    `- Montez de rang (Régulier -> Fidèle -5% & priorité file -> VIP -10% & priorité maximale).`,
    `- Parrainez vos amis avec votre code parrain : gagnez 50 pts dès leur inscription + 10% des points de toutes leurs parties !`,
    ``,
    `Vos coordonnées Espace Client :`,
    `- Code Client : ${params.clientCode}`,
    `- Code Parrain : ${params.referralCode}`,
    `- Lien Espace Client : ${params.portalUrl}`,
    `- Code PIN : ${params.pin} (modifiable dès votre 1ère connexion)`,
  ].join('\n');
}

/**
 * Vérifie si la configuration WhatsApp contient un fournisseur réel (Meta Cloud, CallMeBot ou Webhook)
 */
export function hasRealMetaCredentials(config: WhatsAppConfig): boolean {
  const provider = config.provider || 'META_CLOUD';
  if (provider === 'CALLMEBOT') {
    return Boolean((config.callmebotApiKey || '').trim());
  }
  if (provider === 'CUSTOM_WEBHOOK') {
    return Boolean((config.customWebhookUrl || '').trim());
  }
  const token = (config.accessToken || '').trim();
  const phoneId = (config.phoneNumberId || '').trim();
  if (!token || !phoneId) return false;
  if (token === 'EAAG...' || token === 'EAA...' || token.length < 25 || token.includes('xxxx')) return false;
  return true;
}

/**
 * Normalise un numéro au format international E.164 (RDC +243 par défaut, + support international)
 * Supporte formats: "0812345678", "812345678", "+243 81 234 5678", "+33612345678"
 */
export function normalizeE164(phone: string): { e164: string; isValid: boolean; displayFormatted: string } {
  if (!phone) {
    return { e164: '', isValid: false, displayFormatted: '' };
  }

  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Préfixe RDC local débutant par 0 (ex. 0812345678 -> 9 chiffres après 0)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '243' + cleaned.substring(1);
  } else if (!cleaned.startsWith('243') && cleaned.length === 9 && /^[89]/.test(cleaned)) {
    // Ex: 812345678 -> 243812345678
    cleaned = '243' + cleaned;
  }

  const isRdcValid = /^243\d{9}$/.test(cleaned);
  const isIntlValid = /^[1-9]\d{7,14}$/.test(cleaned);
  const isValid = isRdcValid || isIntlValid;
  const e164 = isValid ? `+${cleaned}` : cleaned ? `+${cleaned}` : '';

  let displayFormatted = e164;
  if (isRdcValid) {
    displayFormatted = `+243 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
  }

  return { e164, isValid, displayFormatted };
}

/**
 * Construit un lien direct WhatsApp (https://api.whatsapp.com/send...) compatible Web & Mobile sans API Meta
 */
export function buildWaMeUrl(phone: string, text: string): string {
  const norm = normalizeE164(phone);
  const digits = (norm.e164 || phone).replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text || '');
  return digits
    ? `https://api.whatsapp.com/send?phone=${digits}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
}

/**
 * Masquage conforme vie privée pour logs et affichage public (+243 81 *** **78)
 */
export function maskPhoneNumber(phone: string): string {
  const norm = normalizeE164(phone);
  if (!norm.isValid || norm.e164.length < 9) return phone || 'Non renseigné';
  const clean = norm.e164;
  return `${clean.substring(0, 7)} *** **${clean.substring(clean.length - 2)}`;
}

/**
 * Rendu du texte de template en remplaçant {{1}}, {{2}}, etc.
 */
export function renderTemplateText(templateName: string, variables: Record<string, string>): string {
  const tmpl = OFFICIAL_TEMPLATES[templateName];
  if (!tmpl) return '';
  let text = tmpl.bodyText;
  Object.keys(variables).forEach((key) => {
    text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), variables[key]);
  });
  return text;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  errorMessage?: string;
  mode: 'LIVE_META' | 'SIMULATION';
  reason?: string;
}

/**
 * Provider WhatsApp Business Cloud (Graph API)
 */
export class WhatsAppCloudProvider {
  /**
   * Envoi d'un message template officiel ou texte libre via l'endpoint /api/whatsapp/send (proxy backend)
   */
  static async sendTemplate(
    toPhone: string,
    templateName: string,
    variables: Record<string, string>,
    config: WhatsAppConfig,
    options?: {
      messageType?: 'template' | 'text';
      customText?: string;
      languageCode?: string;
    }
  ): Promise<SendResult> {
    const { e164, isValid } = normalizeE164(toPhone);
    if (!isValid) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: `Numéro invalide: "${toPhone}". Utilisez le format +243XXXXXXXXX ou E.164 international.`,
        mode: 'SIMULATION',
      };
    }

    const recipientPhone =
      config.isTestMode && config.testPhoneNumber && normalizeE164(config.testPhoneNumber).isValid
        ? normalizeE164(config.testPhoneNumber).e164
        : e164;

    const tmpl = OFFICIAL_TEMPLATES[templateName];
    const resolvedLanguage = options?.languageCode || tmpl?.language || (templateName === 'hello_world' ? 'en_US' : 'fr');
    const renderedText = options?.customText || renderTemplateText(templateName, variables) || `GOZA (${templateName})`;

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          templateName,
          variables,
          languageCode: resolvedLanguage,
          messageType: options?.messageType || 'template',
          customText: options?.customText,
          renderedText,
          configOverride: {
            provider: config.provider || 'META_CLOUD',
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken,
            apiVersion: config.apiVersion,
            isTestMode: config.isTestMode,
            callmebotApiKey: config.callmebotApiKey,
            customWebhookUrl: config.customWebhookUrl,
            customWebhookToken: config.customWebhookToken,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        const mode: 'LIVE_META' | 'SIMULATION' =
          data.mode === 'LIVE_META' ? 'LIVE_META' : 'SIMULATION';
        return {
          success: true,
          messageId: data.messageId || `wamid.${Math.random().toString(36).substring(2, 15)}`,
          status: 'SENT',
          mode,
          reason: data.reason,
        };
      } else {
        return {
          success: false,
          status: 'FAILED',
          errorMessage: data.error || `Erreur serveur HTTP ${response.status}`,
          mode: hasRealMetaCredentials(config) ? 'LIVE_META' : 'SIMULATION',
        };
      }
    } catch (err: any) {
      console.warn('WhatsApp API proxy fetch error, simulating offline:', err);
      return {
        success: false,
        status: 'FAILED',
        errorMessage: err?.message || 'Serveur WhatsApp injoignable (mode hors-ligne)',
        mode: 'SIMULATION',
      };
    }
  }
}

export type CashierAlertCallback = (message: string, clientName: string, phone: string) => void;

/**
 * Service de notifications métier avec gestion de file, 3 retries exponentiels,
 * et alerte caissier en cas d'échec définitif.
 */
export class NotificationService {
  private static cashierAlertHandler: CashierAlertCallback | null = null;

  public static setCashierAlertHandler(handler: CashierAlertCallback) {
    this.cashierAlertHandler = handler;
  }

  /**
   * Envoi avec 3 tentatives en backoff exponentiel
   */
  public static async sendWithRetry(
    toPhone: string,
    clientName: string,
    templateName: string,
    variables: Record<string, string>,
    config: WhatsAppConfig,
    clientId?: string,
    onLogUpdate?: (log: NotificationLog) => void,
    options?: {
      messageType?: 'template' | 'text';
      customText?: string;
      languageCode?: string;
    }
  ): Promise<NotificationLog & { sendMode?: 'LIVE_META' | 'SIMULATION' }> {
    const renderedMessage = options?.customText || renderTemplateText(templateName, variables);
    const { e164 } = normalizeE164(toPhone);

    const log: NotificationLog & { sendMode?: 'LIVE_META' | 'SIMULATION' } = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      clientId,
      clientName,
      phone: e164 || toPhone,
      templateName,
      variables,
      renderedMessage,
      status: 'PENDING',
      retryCount: 0,
    };

    if (onLogUpdate) onLogUpdate({ ...log });

    let attempts = 0;
    const maxRetries = 3;
    let lastError = '';

    while (attempts < maxRetries) {
      attempts++;
      log.retryCount = attempts;

      const result = await WhatsAppCloudProvider.sendTemplate(toPhone, templateName, variables, config, options);

      if (result.success) {
        log.status = result.status;
        log.metaMessageId = result.messageId;
        log.sendMode = result.mode;
        if (result.status === 'DELIVERED') {
          log.deliveredAt = Date.now();
        }
        if (onLogUpdate) onLogUpdate({ ...log });
        return log;
      } else {
        lastError = result.errorMessage || 'Erreur inconnue';
        log.errorMessage = lastError;

        if (attempts < maxRetries) {
          const delayMs = Math.pow(2, attempts - 1) * 1000;
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }

    log.status = 'FAILED';
    log.failedAt = Date.now();
    log.errorMessage = `Échec après 3 tentatives: ${lastError}`;
    if (onLogUpdate) onLogUpdate({ ...log });

    if (this.cashierAlertHandler) {
      this.cashierAlertHandler(
        `Échec de la notification WhatsApp pour ${clientName} (${maskPhoneNumber(toPhone)}). Veuillez l'appeler à voix haute à l'accueil !`,
        clientName,
        toPhone
      );
    }

    return log;
  }
}
