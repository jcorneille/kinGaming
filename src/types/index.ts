export type StationType = string;

export type StationStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface Station {
  id: number;
  name: string;
  type: StationType;
  status: StationStatus;
  currentTicketId?: string;
  clientName?: string;
  clientPhone?: string;
  clientId?: string;
  startTime?: number; // timestamp
  endTime?: number;   // timestamp
  remainingSeconds: number;
  totalDurationMinutes: number;
  relayState: boolean; // Smart plug ON/OFF
  screenRelayState: boolean;
  currentWatts: number;
  totalKWh: number;
  relayTopic: string;
  lastUpdated: number;
}

export interface PricingPlan {
  id: string;
  stationType: StationType;
  durationMinutes: number;
  label: string;
  priceCDF: number;
  priceUSD: number;
  pointsCost: number;     // Points needed for free redemption
  pointsReward: number;   // Points earned by client playing this
  isNightWeekend?: boolean;
  isHappyHour?: boolean;
  playerCount?: number;
  enabled?: boolean;
}

export type PaymentMethod = 
  | 'CASH_CDF' 
  | 'CASH_USD' 
  | 'ILLICO_CASH'
  | 'MPESA' 
  | 'ORANGE_MONEY' 
  | 'AIRTEL_MONEY' 
  | 'LOYALTY_POINTS'
  | 'MIXED';

export type TicketStatus = 
  | 'active' 
  | 'completed' 
  | 'extended' 
  | 'cancelled' 
  | 'refunded';

export interface MixedPaymentBreakdown {
  cashCDF?: number;
  cashUSD?: number;
  illicoCashCDF?: number;
  illicoCashUSD?: number;
  illicoCashRef?: string;
  illicoCashPayerPhone?: string;
  momoCDF?: number;
  momoUSD?: number;
  momoProvider?: 'MPESA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY';
  momoRef?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  signedToken: string; // Jeton cryptographique / URL publique /t/[signedToken]
  stationId: number;
  stationName: string;
  stationType: StationType;
  clientName: string;
  clientPhone?: string;
  clientId?: string;
  durationMinutes: number;
  startTime: number;
  endTime: number;
  actualEndTime?: number; // Heure réelle de libération
  amountCDF: number;
  amountUSD: number;
  discountCDF?: number;
  discountUSD?: number;
  appliedDiscountPercent?: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string; // Référence de transaction (obligatoire pour Illico Cash et Mobile Money)
  payerPhone?: string; // Numéro payeur pour Illico Cash / Momo
  mixedBreakdown?: MixedPaymentBreakdown;
  cashReceivedCDF?: number;
  cashReceivedUSD?: number;
  changeGivenCDF?: number;
  changeGivenUSD?: number;
  cashierName: string;
  cashierId?: string;
  status: TicketStatus;
  createdAt: number;
  extendedCount: number;
  autoReleased?: boolean; // Indique si libéré automatiquement à 0m
  autoReleaseCancelledAt?: number;
  notes?: string;
  appliedExchangeRate?: number; // Taux USD/CDF figé à la création
  pricingPlanSnapshot?: { label: string; priceUSD: number; priceCDF: number }; // Grille figée
  appliedTimeSlotLabel?: string;
  appliedTimeSlotPercent?: number;
  appliedPromoCode?: string;
  appliedPromoDiscountCDF?: number;
  transferredFromStationId?: number;
}

// 2.14 Statuts Clients : Nouveau → Régulier → Fidèle → VIP
export type LoyaltyTier = 'NOUVEAU' | 'REGULIER' | 'FIDELE' | 'VIP';

export interface ClientSessionStat {
  ticketId: string;
  date: number;
  durationMinutes: number;
  amountPaidCDF: number;
  amountPaidUSD: number;
  isPaidSession: boolean; // false si payé en points de fidélité
  stationType: StationType;
  weekNumberYear: string; // e.g. "2026-W45" pour évaluer la présence sur des semaines différentes
}

export interface Client {
  id: string;
  clientCode: string;
  fullName: string;
  phone: string;
  email?: string;
  pin: string; // 4 chiffres pour portail client (défaut: '1234')
  loyaltyPoints: number;
  freeMinutesBalance: number;
  totalPlayMinutes: number;
  totalSpentCDF: number;
  totalSpentUSD: number;
  tier: LoyaltyTier;
  tierPromotedAt?: number;
  tierGracePeriodExpiresAt?: number; // période de grâce de 30 jours avant rétrogradation
  manualVIPReason?: string;
  isManualVIP?: boolean;
  sessionsHistory: ClientSessionStat[];
  referralCode: string;
  referredById?: string;
  referredByName?: string;
  referralCount: number;
  totalReferralBonusPoints: number;
  dataConsentAccepted: boolean;
  whatsappConsent: boolean;
  whatsappConsentDate?: number;
  failedLoginAttempts: number;
  lockedUntil?: number;
  avatarUrl?: string;
  portalDisabled?: boolean;
  portalDisabledReason?: string;
  portalDisabledAt?: number;
  createdAt: number;
}

export interface TierRulesConfig {
  regMinSessions: number; // 3 sessions payées
  fideleMinSessions: number; // 10 sessions payées
  fideleMinHours: number; // 15 heures de jeu sur 90j
  fideleMinWeeks: number; // 4 semaines différentes
  fideleMinDaysRegistered: number; // 30 jours d'ancienneté
  vipHoursThreshold: number; // 40 heures sur 90j
  vipSpendingThresholdUSD: number; // 100 USD (ou equiv CDF) sur 90j
  vipActiveReferralsThreshold: number; // 5 filleuls ayant payé >= 2 sessions
  rollingWindowDays: number; // 90 jours
  gracePeriodDays: number; // 30 jours
  minSessionMinutesForStats: number; // 10 minutes minimum
  perks: {
    [key in LoyaltyTier]: {
      label: string;
      pointMultiplier: number;
      discountPercent: number;
      queuePriority: QueuePriority;
      colorBadge: string;
      description: string;
      otherBenefits: string;
    };
  };
}

export interface TierHistoryEntry {
  id: string;
  clientId: string;
  clientName: string;
  date: number;
  oldTier: LoyaltyTier;
  newTier: LoyaltyTier;
  reason: string;
  performedBy: string; // 'SYSTEM_AUTO' ou nom de l'admin
}

export type LoyaltyTransactionType = 
  | 'EARN_PLAY' 
  | 'SPEND_FREE_TIME' 
  | 'REFERRAL_SIGNUP' 
  | 'REFERRAL_PLAY' 
  | 'ADMIN_ADJUST' 
  | 'EXPIRY';

export interface LoyaltyTransaction {
  id: string;
  clientId: string;
  clientName: string;
  type: LoyaltyTransactionType;
  points: number;
  description: string;
  createdAt: number;
}

export type QueuePriority = 'NORMAL' | 'LOYAL' | 'VIP';

export interface QueueEntry {
  id: string;
  clientName: string;
  phone: string;
  clientId?: string;
  clientTier?: LoyaltyTier;
  desiredStationType: StationType | 'ANY';
  desiredDurationMinutes: number;
  arrivalTime: number;
  priorityLevel: QueuePriority;
  status: 'waiting' | 'called' | 'seated' | 'no_show' | 'cancelled';
  calledAt?: number;
  gracePeriodSeconds: number; // e.g. 180s (3 min)
}

export interface DomotiqueDevice {
  id: string;
  stationId?: number;
  name: string;
  type: 'STATION_CONSOLE_TV' | 'AMBIENT_LIGHT' | 'AIR_CONDITIONER' | 'EXHAUST_FAN' | 'GENERAL_SWITCH';
  relayTopic: string;
  state: 'ON' | 'OFF';
  watts: number;
  totalKWh: number;
  isOnline: boolean;
  hardwareType: 'SONOFF_S26' | 'SHELLY_1PM' | 'ESP32_CUSTOM' | 'TASMOTA';
  ipAddress: string;
}

export interface CashShift {
  id: string;
  cashierName: string;
  cashierId?: string;
  openedAt: number;
  closedAt?: number;
  openingFloatCDF: number;
  openingFloatUSD: number;
  closingCashCDF?: number;
  closingCashUSD?: number;
  expectedCashCDF: number;
  expectedCashUSD: number;
  totalIllicoCashCDF: number;
  totalIllicoCashUSD: number;
  totalMomoCDF: number;
  totalMomoUSD: number;
  totalSnacksCDF: number;
  totalSnacksUSD: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
}

export interface SnackItem {
  id: string;
  name: string;
  category: 'DRINK' | 'SNACK';
  priceCDF: number;
  priceUSD: number;
  stockQuantity: number;
  unit: string;
}

export interface SnackSaleItemDetail {
  itemId?: string;
  itemName: string;
  quantity: number;
  unitPriceCDF: number;
  unitPriceUSD: number;
  totalCDF: number;
  totalUSD: number;
}

export interface SnackSale {
  id: string;
  receiptNumber?: string;
  shiftId: string;
  itemName: string;
  quantity: number;
  items?: SnackSaleItemDetail[];
  totalCDF: number;
  totalUSD: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  mixedBreakdown?: MixedPaymentBreakdown;
  timestamp: number;
  cashierName: string;
}

// 2.13 Espace Login (Personnel & Sécurité)
export type StaffRole = 'ADMIN' | 'GERANT' | 'CAISSIER';

export interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  role: StaffRole;
  pin: string; // 4-6 chiffres pour prise de poste rapide
  passwordHash: string; // haché ou marqueur scrypt côté serveur
  is2FAEnabled: boolean;
  twoFactorSecret?: string;
  failedAttempts: number;
  lockedUntil?: number;
  isBlocked?: boolean; // Bloqué après 5 échecs ou manuellement par l'admin
  blockReason?: string; // Motif du blocage
  blockedAt?: number; // Timestamp du blocage
  isActive: boolean;
  isArchived?: boolean; // Archivé (ne peut plus se connecter, mais reste sur ses tickets)
  mustChangePassword?: boolean; // Forcer le changement à la 1ère connexion
  passwordUpdatedAt?: number;
  avatarUrl?: string;
  lastLoginAt?: number;
  createdAt?: number;
}

export interface LoginLog {
  id: string;
  timestamp: number;
  username: string;
  role?: StaffRole;
  success: boolean;
  method: 'PIN' | 'PASSWORD' | '2FA';
  ipOrDevice: string;
  failureReason?: string;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userRole: StaffRole | 'CLIENT' | 'SYSTEM';
  cashierName: string;
  action: string;
  details: string;
  stationId?: number;
}

export interface PromotionRule {
  id: string;
  code: string;
  name: string;
  discountType: 'PERCENT' | 'FIXED_CDF' | 'FIXED_USD';
  discountValue: number;
  applicableStationTypes: StationType[];
  minTierRequired?: LoyaltyTier;
  validFrom?: number;
  validUntil?: number;
  isActive: boolean;
}

export interface TimeSlotPricingRule {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  daysOfWeek: number[]; // 0=Dim .. 6=Sam, vide = tous les jours
  modifierType: 'PERCENT_DISCOUNT' | 'PERCENT_SURCHARGE' | 'MULTIPLIER';
  modifierValue: number; // ex: 15 => -15% ou +15%, ou 1.2 => x1.2
  applicableStationTypes: StationType[];
  isActive: boolean;
}

export interface PaymentMethodConfig {
  enabled: boolean;
  requireReference: boolean;
  accountDisplayNumber: string;
  accountName?: string;
}

export interface LightingACSchedule {
  enabled: boolean;
  acOnTime: string;
  acOffTime: string;
  lightOnTime: string;
  lightOffTime: string;
}

export interface SettingsHistoryEntry {
  id: string;
  timestamp: number;
  section: string;
  settingKey: string;
  label: string;
  oldValue: any;
  newValue: any;
  modifiedBy: string;
  reason?: string;
  effectiveAt: number;
  scheduled?: boolean;
}

export interface ScheduledSettingChange {
  id: string;
  createdAt: number;
  scheduledFor: number;
  section: string;
  settingKey: string;
  label: string;
  newValue: any;
  oldValue: any;
  author: string;
  reason?: string;
  applied: boolean;
  appliedAt?: number;
}

// 2.18 Écran Réglages Administrateur (11 Sections Complètes)
export interface SystemSettings {
  // Section 1: Devises et taux de change
  exchangeRate: number; // e.g. 2800 CDF per USD
  rateLastUpdatedAt: number;
  rateUpdateAlertDays: number; // Alerte si taux > N jours (défaut: 7)
  primaryCurrency: 'CDF' | 'USD'; // Devise principale
  secondaryCurrency: 'CDF' | 'USD';
  cdfRoundingRule: number; // e.g. 50 ou 100 CDF
  usdDecimals: number; // 0 ou 2

  // Section 2: Tarifs du temps de jeu
  defaultHourlyPriceUSD?: { PS4: number; PS5: number };
  overtimeRatePerMinuteCDF: { PS4: number; PS5: number };
  minSessionMinutes: number; // e.g. 15 min
  toleranceMinutes: number; // e.g. 5 min de dépassement gratuit avant palier
  extraControllerSurchargePercent: number; // e.g. 25%
  stationSpecificOverrides: Record<number, { customName?: string; priceMultiplier?: number; disabled?: boolean }>;
  enableTimeSlotPricing?: boolean;
  timeSlotPricingRules?: TimeSlotPricingRule[];

  // Section 3: Remises et promotions
  managerMaxDiscountPercent: number; // e.g. 20% max sans admin
  promotions: PromotionRule[];

  // Section 4: Fidélité, points, parrainage et statuts
  pointEarnRateMinutes: number; // 1 point per X minutes (default 10)
  pointsToMinutesPS4: number; // 100 points = 15 min
  pointsToMinutesPS5: number; // 150 points = 15 min
  pointsValidityMonths: number; // e.g. 6 mois
  referralBonusSignup: number; // 50 points on friend registration
  referralBonusFirstPlay: number; // 100 points on friend's 1st paid session
  referralBonusPercentage: number; // 10% points on friend's ongoing sessions
  maxReferralBonusCap: number; // max 5000 points per sponsor

  // Section 5: File d'attente
  queueCallPresentationMinutes: number; // Délai présence après appel (défaut: 10 min)
  queueGraceSeconds: number; // Délai de grâce après appel (défaut: 180s)
  queueMaxReminders: number; // Nombre de relances avant no-show (défaut: 2)
  queueSoonThresholdMinutes: number; // Alerte bientôt votre tour (défaut: 15 min)
  queueVipPriorityEnabled: boolean; // Priorité VIP activée
  queueMaxCapacity: number; // Capacité max file (défaut: 25)

  // Section 6: Notifications WhatsApp (partagé avec WhatsAppConfig)
  whatsappEnabled: boolean;

  // Section 7: Modes de paiement
  paymentMethodsConfig: Record<PaymentMethod, PaymentMethodConfig>;
  paymentCollectionTiming: 'PRE_PAID' | 'POST_PAID' | 'CASHIER_CHOICE';

  // Section 8: Domotique
  idleAutoCutMinutes: number; // auto turn off plug if idle for X minutes
  warningBeforeCutMinutes: number; // sound chime X minutes before end
  soundAlertsEnabled: boolean;
  voiceAlertsEnabled?: boolean; // alertes parlantes (synthèse vocale FR)
  mqttBrokerHost: string;
  mqttBrokerPort: number;
  mqttUsername: string;
  mqttTopicPrefix: string;
  mqttConnected: boolean;
  autoPowerOnWithTicket: boolean;
  autoPowerOffAtSessionEnd: boolean;
  autoReleaseGraceSeconds: number; // Délai de grâce avant coupure domotique (défaut: 120s = 2 min)
  autoCutTarget: 'SCREEN_ONLY' | 'SCREEN_AND_CONSOLE'; // Couper écran seulement ou écran + console
  lightingACSchedule: LightingACSchedule;

  // Section 9: Salle et tickets
  venueName: string;
  venueLogoUrl?: string;
  pageBackgroundUrl?: string;
  pageBackgroundOpacity?: number;
  venueAddress: string;
  venuePhone: string;
  receiptFooterMessage: string;
  receiptLegalNotice: string;
  receiptPaperSize: '58mm' | '80mm';
  ticketPrefix: string;
  ticketNumberFormat: 'DAILY_RESET' | 'CONTINUOUS';
  publicVerificationBaseUrl: string; // Ex: https://kingaminghub.cd ou URL Cloud Run
  qrCodeFallbackMode: 'URL' | 'OFFLINE_TEXT'; // Bascule si pas de domaine public
  operatingHours: { open: string; close: string };
  timezone: string;
  language: string;

  // Section 10: Sécurité et utilisateurs
  autoLogoutInactivityMinutes: number; // déconnexion auto après inactivité (défaut: 10 min)
  maxLoginFailedAttempts: number; // verrouillage après 5 tentatives
  passwordMinLength: number; // Longueur min mot de passe (défaut: 8)
  passwordRequireSpecialChar: boolean;
  admin2FAEnforced: boolean;

  // Section 11: Sauvegardes et système
  backupFrequencyHours: number; // e.g. 24h
  lastBackupTimestamp?: number;
  logRetentionDays: number; // e.g. 90 jours
}


// 2.15 Notifications automatiques par WhatsApp (Meta WhatsApp Business Cloud API)
export type WhatsAppDeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface WhatsAppTemplate {
  name: string;
  category: 'UTILITY';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  description: string;
  bodyText: string;
  exampleVariables: string[];
}

export interface NotificationLog {
  id: string;
  timestamp: number;
  clientId?: string;
  clientName: string;
  phone: string;
  templateName: string;
  variables: Record<string, string>;
  renderedMessage: string;
  status: WhatsAppDeliveryStatus;
  errorMessage?: string;
  retryCount: number;
  metaMessageId?: string;
  deliveredAt?: number;
  readAt?: number;
  failedAt?: number;
  replies?: Array<{
    timestamp: number;
    text: string;
    fromPhone: string;
  }>;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  apiVersion: string;
  verifyToken: string;
  isTestMode: boolean;
  testPhoneNumber: string;
  optInRequired: boolean;
  autoNotifyQueueTurn: boolean;
  autoNotifyQueueApproaching: boolean;
  autoNotifyGraceReminder: boolean;
  autoNotifyPromotions: boolean;
}

