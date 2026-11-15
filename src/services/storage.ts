import {
  Station,
  PricingPlan,
  Ticket,
  Client,
  LoyaltyTransaction,
  QueueEntry,
  DomotiqueDevice,
  CashShift,
  SnackItem,
  SnackSale,
  AuditLog,
  SystemSettings,
  StaffUser,
  LoginLog,
  TierRulesConfig,
  TierHistoryEntry,
  ClientSessionStat,
  WhatsAppConfig,
  NotificationLog,
  PromotionRule,
  PaymentMethodConfig,
  LightingACSchedule,
  SettingsHistoryEntry,
  ScheduledSettingChange,
  PaymentMethod,
  TimeSlotPricingRule,
} from '../types';
import { DEFAULT_TIER_RULES, getISOWeekKey } from './tierEngine';

const STORAGE_KEY = 'kin_gaming_hub_v2';

export interface AppState {
  stations: Station[];
  pricingPlans: PricingPlan[];
  tickets: Ticket[];
  clients: Client[];
  loyaltyTransactions: LoyaltyTransaction[];
  queue: QueueEntry[];
  domotiqueDevices: DomotiqueDevice[];
  currentShift: CashShift;
  shiftHistory: CashShift[];
  snackItems: SnackItem[];
  snackSales: SnackSale[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  settingsHistory: SettingsHistoryEntry[];
  scheduledSettings: ScheduledSettingChange[];
  staffUsers: StaffUser[];
  currentStaffUser: StaffUser | null;
  isStaffAuthenticated: boolean;
  loginLogs: LoginLog[];
  tierRules: TierRulesConfig;
  tierHistory: TierHistoryEntry[];
  activeCustomerPortalClientId: string | null;
  whatsappConfig: WhatsAppConfig;
  notificationLogs: NotificationLog[];
  // Helpers
  currentRole: 'ADMIN' | 'GERANT' | 'CAISSIER';
  currentUser: string;
}

export const DEFAULT_PROMOTIONS: PromotionRule[] = [
  {
    id: 'promo-happy',
    code: 'HAPPY243',
    name: 'Happy Hour Après-Midi (14h-17h)',
    discountType: 'PERCENT',
    discountValue: 15,
    applicableStationTypes: ['PS4', 'PS5'],
    isActive: true,
  },
  {
    id: 'promo-vip-weekend',
    code: 'VIPWEEKEND',
    name: 'Bonus VIP Weekend',
    discountType: 'PERCENT',
    discountValue: 20,
    applicableStationTypes: ['PS5'],
    minTierRequired: 'VIP',
    isActive: true,
  },
];

export const DEFAULT_TIME_SLOT_RULES: TimeSlotPricingRule[] = [
  {
    id: 'slot-morning',
    name: 'Heures Creuses Matin (-15%)',
    startTime: '09:00',
    endTime: '12:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    modifierType: 'PERCENT_DISCOUNT',
    modifierValue: 15,
    applicableStationTypes: ['PS4', 'PS5'],
    isActive: true,
  },
  {
    id: 'slot-peak-evening',
    name: 'Heures de Pointe Soirée (+10%)',
    startTime: '18:00',
    endTime: '23:00',
    daysOfWeek: [],
    modifierType: 'PERCENT_SURCHARGE',
    modifierValue: 10,
    applicableStationTypes: ['PS4', 'PS5'],
    isActive: false,
  },
  {
    id: 'slot-weekend-vip',
    name: 'Week-end Prime (+15%)',
    startTime: '14:00',
    endTime: '22:00',
    daysOfWeek: [0, 6],
    modifierType: 'PERCENT_SURCHARGE',
    modifierValue: 15,
    applicableStationTypes: ['PS5'],
    isActive: false,
  },
];

export const DEFAULT_PAYMENT_METHODS_CONFIG: Record<PaymentMethod, PaymentMethodConfig> = {
  CASH_CDF: {
    enabled: true,
    requireReference: false,
    accountDisplayNumber: 'Tiroir Caisse CDF',
    accountName: 'Espèces Franc Congolais',
  },
  CASH_USD: {
    enabled: true,
    requireReference: false,
    accountDisplayNumber: 'Tiroir Caisse USD',
    accountName: 'Espèces Dollars US',
  },
  ILLICO_CASH: {
    enabled: true,
    requireReference: true,
    accountDisplayNumber: '1002345001 (Rawbank)',
    accountName: 'KIN GAMING HUB SARL',
  },
  MPESA: {
    enabled: true,
    requireReference: true,
    accountDisplayNumber: '+243 81 234 5678',
    accountName: 'Kin Gaming Hub Vodacom',
  },
  ORANGE_MONEY: {
    enabled: true,
    requireReference: true,
    accountDisplayNumber: '+243 89 545 7097',
    accountName: 'Kin Gaming Hub Orange',
  },
  AIRTEL_MONEY: {
    enabled: true,
    requireReference: true,
    accountDisplayNumber: '+243 97 123 4567',
    accountName: 'Kin Gaming Hub Airtel',
  },
  LOYALTY_POINTS: {
    enabled: true,
    requireReference: false,
    accountDisplayNumber: 'Points Fidélité Compte Joueur',
    accountName: 'Portefeuille Fidélité',
  },
  MIXED: {
    enabled: true,
    requireReference: false,
    accountDisplayNumber: 'Ventilation Multi-Mode',
    accountName: 'Paiement Mixte',
  },
};

export const DEFAULT_LIGHTING_SCHEDULE: LightingACSchedule = {
  enabled: true,
  acOnTime: '09:00',
  acOffTime: '23:30',
  lightOnTime: '08:30',
  lightOffTime: '23:45',
};

export const DEFAULT_PAGE_BACKGROUND_URL =
  '/assets/aistudio/Kin_Gaming_Hub___univers_ne_on_des_jeux_vide_o_220341d3.png';
export const DEFAULT_PAGE_BACKGROUND_OPACITY = 0.16;

export const DEFAULT_SETTINGS: SystemSettings = {
  // Section 1: Devises et taux de change
  exchangeRate: 2800, // 1 USD = 2800 CDF
  rateLastUpdatedAt: Date.now() - 2 * 86400000,
  rateUpdateAlertDays: 7, // Rappel après 7 jours sans mise à jour
  primaryCurrency: 'CDF',
  secondaryCurrency: 'USD',
  cdfRoundingRule: 100, // Arrondi aux 100 CDF les plus proches
  usdDecimals: 2,

  // Section 2: Tarifs du temps de jeu
  defaultHourlyPriceUSD: { PS4: 1.79, PS5: 2.86 },
  overtimeRatePerMinuteCDF: { PS4: 80, PS5: 140 },
  minSessionMinutes: 15,
  toleranceMinutes: 5, // 5 min de grâce avant prochain palier
  extraControllerSurchargePercent: 25,
  stationSpecificOverrides: {},
  enableTimeSlotPricing: true,
  timeSlotPricingRules: DEFAULT_TIME_SLOT_RULES,

  // Section 3: Remises et promotions
  managerMaxDiscountPercent: 20, // 20% max pour le gérant sans accord admin
  promotions: DEFAULT_PROMOTIONS,

  // Section 4: Fidélité, points, parrainage et statuts
  pointEarnRateMinutes: 10, // 1 point par 10 min
  pointsToMinutesPS4: 100, // 100 pts = 15 min PS4
  pointsToMinutesPS5: 150, // 150 pts = 15 min PS5
  pointsValidityMonths: 6, // Expiration après 6 mois
  referralBonusSignup: 50,
  referralBonusFirstPlay: 100,
  referralBonusPercentage: 10,
  maxReferralBonusCap: 5000,

  // Section 5: File d'attente
  queueCallPresentationMinutes: 10, // 10 min après appel
  queueGraceSeconds: 180, // 3 min de tolérance
  queueMaxReminders: 2, // 2 relances max
  queueSoonThresholdMinutes: 15, // Alerte 'bientôt votre tour' si <= 15m
  queueVipPriorityEnabled: true,
  queueMaxCapacity: 25,

  // Section 6: Notifications WhatsApp
  whatsappEnabled: true,

  // Section 7: Modes de paiement
  paymentMethodsConfig: DEFAULT_PAYMENT_METHODS_CONFIG,
  paymentCollectionTiming: 'CASHIER_CHOICE',

  // Section 8: Domotique
  idleAutoCutMinutes: 10,
  warningBeforeCutMinutes: 5,
  soundAlertsEnabled: true,
  voiceAlertsEnabled: true,
  mqttBrokerHost: '192.168.1.100',
  mqttBrokerPort: 1883,
  mqttUsername: 'gaminghub_operator',
  mqttTopicPrefix: 'gaminghub',
  mqttConnected: true,
  autoPowerOnWithTicket: true,
  autoPowerOffAtSessionEnd: true,
  autoReleaseGraceSeconds: 120, // 2 minutes de grâce avant extinction domotique
  autoCutTarget: 'SCREEN_ONLY', // Couper l'écran seulement par défaut (préserve console)
  lightingACSchedule: DEFAULT_LIGHTING_SCHEDULE,

  // Section 9: Salle et tickets
  venueName: 'Kin Gaming Hub',
  venueLogoUrl: '',
  pageBackgroundUrl: DEFAULT_PAGE_BACKGROUND_URL,
  pageBackgroundOpacity: DEFAULT_PAGE_BACKGROUND_OPACITY,
  venueAddress: '12, Boulevard du 30 Juin, Gombe, Kinshasa, RDC',
  venuePhone: '+243 89 545 7097',
  receiptFooterMessage: 'Merci de votre visite ! Suivez-nous sur Instagram @kingaminghub · Wi-Fi Client : KinGamingHub-Guest',
  receiptLegalNotice: 'RCCM : CD/KIN/RCCM/2026-B-1284 · Id.Nat : 01-93-N48201E · NIF : A2049182Z',
  receiptPaperSize: '58mm',
  ticketPrefix: 'KGH',
  ticketNumberFormat: 'DAILY_RESET',
  publicVerificationBaseUrl: typeof window !== 'undefined' ? window.location.origin : 'https://kingaminghub.cd',
  qrCodeFallbackMode: 'URL',
  operatingHours: { open: '09:00', close: '23:00' },
  timezone: 'Africa/Kinshasa',
  language: 'fr',

  // Section 10: Sécurité et utilisateurs
  autoLogoutInactivityMinutes: 10, // Déconnexion automatique après inactivité
  maxLoginFailedAttempts: 5, // Verrouillage après 5 tentatives échouées
  passwordMinLength: 8,
  passwordRequireSpecialChar: true,
  admin2FAEnforced: false, // Double authentification pour administrateur

  // Section 11: Sauvegardes et système
  backupFrequencyHours: 24,
  lastBackupTimestamp: Date.now() - 12 * 3600000,
  logRetentionDays: 90,
};

// Modèle de référence par section pour le bouton "Rétablir les valeurs par défaut"
export const DEFAULT_SETTINGS_BY_SECTION = {
  currency: {
    exchangeRate: 2800,
    rateLastUpdatedAt: Date.now(),
    rateUpdateAlertDays: 7,
    primaryCurrency: 'CDF' as const,
    secondaryCurrency: 'USD' as const,
    cdfRoundingRule: 100,
    usdDecimals: 2,
  },
  pricing: {
    defaultHourlyPriceUSD: { PS4: 1.79, PS5: 2.86 },
    overtimeRatePerMinuteCDF: { PS4: 80, PS5: 140 },
    minSessionMinutes: 15,
    toleranceMinutes: 5,
    extraControllerSurchargePercent: 25,
    stationSpecificOverrides: {},
    enableTimeSlotPricing: true,
    timeSlotPricingRules: DEFAULT_TIME_SLOT_RULES,
  },
  discounts: {
    managerMaxDiscountPercent: 20,
    promotions: DEFAULT_PROMOTIONS,
  },
  loyalty: {
    pointEarnRateMinutes: 10,
    pointsToMinutesPS4: 100,
    pointsToMinutesPS5: 150,
    pointsValidityMonths: 6,
    referralBonusSignup: 50,
    referralBonusFirstPlay: 100,
    referralBonusPercentage: 10,
    maxReferralBonusCap: 5000,
  },
  queue: {
    queueCallPresentationMinutes: 10,
    queueGraceSeconds: 180,
    queueMaxReminders: 2,
    queueSoonThresholdMinutes: 15,
    queueVipPriorityEnabled: true,
    queueMaxCapacity: 25,
  },
  whatsapp: {
    whatsappEnabled: true,
  },
  payments: {
    paymentMethodsConfig: DEFAULT_PAYMENT_METHODS_CONFIG,
    paymentCollectionTiming: 'CASHIER_CHOICE' as const,
  },
  domotique: {
    idleAutoCutMinutes: 10,
    warningBeforeCutMinutes: 5,
    soundAlertsEnabled: true,
    voiceAlertsEnabled: true,
    mqttBrokerHost: '192.168.1.100',
    mqttBrokerPort: 1883,
    mqttUsername: 'gaminghub_operator',
    mqttTopicPrefix: 'gaminghub',
    mqttConnected: true,
    autoPowerOnWithTicket: true,
    autoPowerOffAtSessionEnd: true,
    autoReleaseGraceSeconds: 120,
    autoCutTarget: 'SCREEN_ONLY' as const,
    lightingACSchedule: DEFAULT_LIGHTING_SCHEDULE,
  },
  venue: {
    venueName: 'Kin Gaming Hub',
    venueLogoUrl: '',
    pageBackgroundUrl: DEFAULT_PAGE_BACKGROUND_URL,
    pageBackgroundOpacity: DEFAULT_PAGE_BACKGROUND_OPACITY,
    venueAddress: '12, Boulevard du 30 Juin, Gombe, Kinshasa, RDC',
    venuePhone: '+243 89 545 7097',
    receiptFooterMessage: 'Merci de votre visite ! Suivez-nous sur Instagram @kingaminghub · Wi-Fi Client : KinGamingHub-Guest',
    receiptLegalNotice: 'RCCM : CD/KIN/RCCM/2026-B-1284 · Id.Nat : 01-93-N48201E · NIF : A2049182Z',
    receiptPaperSize: '58mm' as const,
    ticketPrefix: 'KGH',
    ticketNumberFormat: 'DAILY_RESET' as const,
    publicVerificationBaseUrl: typeof window !== 'undefined' ? window.location.origin : 'https://kingaminghub.cd',
    qrCodeFallbackMode: 'URL' as const,
    operatingHours: { open: '09:00', close: '23:00' },
    timezone: 'Africa/Kinshasa',
    language: 'fr',
  },
  security: {
    autoLogoutInactivityMinutes: 10,
    maxLoginFailedAttempts: 5,
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    admin2FAEnforced: false,
  },
  system: {
    backupFrequencyHours: 24,
    lastBackupTimestamp: Date.now(),
    logRetentionDays: 90,
  },
};

const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'staff-admin',
    username: 'admin',
    fullName: 'Aimé (Propriétaire / Admin)',
    role: 'ADMIN',
    pin: '9999',
    passwordHash: 'admin2026!',
    is2FAEnabled: true,
    twoFactorSecret: '123456',
    failedAttempts: 0,
    isActive: true,
    mustChangePassword: true,
    lastLoginAt: Date.now() - 3600000,
  },
  {
    id: 'staff-gerant',
    username: 'gerant',
    fullName: 'Christian (Gérant de Salle)',
    role: 'GERANT',
    pin: '5555',
    passwordHash: 'gerant2026',
    is2FAEnabled: false,
    failedAttempts: 0,
    isActive: true,
    mustChangePassword: true,
    lastLoginAt: Date.now() - 7200000,
  },
  {
    id: 'staff-erick',
    username: 'erick',
    fullName: 'Erick (Caissier Accueil)',
    role: 'CAISSIER',
    pin: '1234',
    passwordHash: 'caisse1234',
    is2FAEnabled: false,
    failedAttempts: 0,
    isActive: true,
    mustChangePassword: true,
    lastLoginAt: Date.now() - 1800000,
  },
  {
    id: 'staff-sarah',
    username: 'sarah',
    fullName: 'Sarah (Caissière Soir)',
    role: 'CAISSIER',
    pin: '4321',
    passwordHash: 'caisse4321',
    is2FAEnabled: false,
    failedAttempts: 0,
    isActive: true,
    mustChangePassword: true,
  },
];

const INITIAL_LOGIN_LOGS: LoginLog[] = [
  {
    id: 'log-1',
    timestamp: Date.now() - 4 * 3600000,
    username: 'erick',
    role: 'CAISSIER',
    success: true,
    method: 'PIN',
    ipOrDevice: 'Tablette Caisse Accueil (Chrome 128 / Android)',
  },
  {
    id: 'log-2',
    timestamp: Date.now() - 8 * 3600000,
    username: 'admin',
    role: 'ADMIN',
    success: true,
    method: '2FA',
    ipOrDevice: 'PC Bureau Direction (Windows 11 / Edge)',
  },
];

const INITIAL_PRICING: PricingPlan[] = [
  // PS4 Plans
  { id: 'ps4-15m', stationType: 'PS4', durationMinutes: 15, label: '15 Minutes', priceCDF: 1500, priceUSD: 0.54, pointsCost: 100, pointsReward: 2 },
  { id: 'ps4-30m', stationType: 'PS4', durationMinutes: 30, label: '30 Minutes', priceCDF: 3000, priceUSD: 1.07, pointsCost: 200, pointsReward: 3 },
  { id: 'ps4-1h', stationType: 'PS4', durationMinutes: 60, label: '1 Heure', priceCDF: 5000, priceUSD: 1.79, pointsCost: 350, pointsReward: 6 },
  { id: 'ps4-2h', stationType: 'PS4', durationMinutes: 120, label: '2 Heures', priceCDF: 9000, priceUSD: 3.21, pointsCost: 650, pointsReward: 12 },
  { id: 'ps4-3h', stationType: 'PS4', durationMinutes: 180, label: 'Forfait 3H', priceCDF: 12500, priceUSD: 4.46, pointsCost: 900, pointsReward: 20 },
  
  // PS5 Plans
  { id: 'ps5-15m', stationType: 'PS5', durationMinutes: 15, label: '15 Minutes', priceCDF: 2500, priceUSD: 0.89, pointsCost: 150, pointsReward: 3 },
  { id: 'ps5-30m', stationType: 'PS5', durationMinutes: 30, label: '30 Minutes', priceCDF: 4500, priceUSD: 1.61, pointsCost: 280, pointsReward: 5 },
  { id: 'ps5-1h', stationType: 'PS5', durationMinutes: 60, label: '1 Heure', priceCDF: 8000, priceUSD: 2.86, pointsCost: 500, pointsReward: 10 },
  { id: 'ps5-2h', stationType: 'PS5', durationMinutes: 120, label: '2 Heures', priceCDF: 15000, priceUSD: 5.36, pointsCost: 950, pointsReward: 22 },
  { id: 'ps5-3h', stationType: 'PS5', durationMinutes: 180, label: 'Forfait 3H VIP', priceCDF: 21000, priceUSD: 7.50, pointsCost: 1350, pointsReward: 35 },
];

// Génération de sessions réalistes pour les 90 jours
const now = Date.now();
const oneDay = 86400000;

const createGlodySessions = (): ClientSessionStat[] => {
  const sessions: ClientSessionStat[] = [];
  // 35 sessions réparties sur 8 semaines = ~45 heures -> Qualifie pour VIP !
  for (let i = 0; i < 35; i++) {
    const d = new Date(now - (i * 2.2) * oneDay);
    sessions.push({
      ticketId: `TICK-HIST-${100 + i}`,
      date: d.getTime(),
      durationMinutes: i % 3 === 0 ? 120 : 60,
      amountPaidCDF: i % 3 === 0 ? 15000 : 8000,
      amountPaidUSD: i % 3 === 0 ? 5.36 : 2.86,
      isPaidSession: true,
      stationType: i % 2 === 0 ? 'PS5' : 'PS4',
      weekNumberYear: getISOWeekKey(d),
    });
  }
  return sessions;
};

const createFallySessions = (): ClientSessionStat[] => {
  const sessions: ClientSessionStat[] = [];
  // 14 sessions sur 5 semaines différentes = 18 heures -> Qualifie pour Fidèle !
  for (let i = 0; i < 14; i++) {
    const d = new Date(now - (i * 5) * oneDay);
    sessions.push({
      ticketId: `TICK-HIST-${200 + i}`,
      date: d.getTime(),
      durationMinutes: 60,
      amountPaidCDF: 5000,
      amountPaidUSD: 1.79,
      isPaidSession: true,
      stationType: 'PS4',
      weekNumberYear: getISOWeekKey(d),
    });
  }
  return sessions;
};

const createJuniorSessions = (): ClientSessionStat[] => {
  const sessions: ClientSessionStat[] = [];
  // 5 sessions = Régulier
  for (let i = 0; i < 5; i++) {
    const d = new Date(now - (i * 8) * oneDay);
    sessions.push({
      ticketId: `TICK-HIST-${300 + i}`,
      date: d.getTime(),
      durationMinutes: 30,
      amountPaidCDF: 3000,
      amountPaidUSD: 1.07,
      isPaidSession: true,
      stationType: 'PS4',
      weekNumberYear: getISOWeekKey(d),
    });
  }
  return sessions;
};

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    clientCode: 'KIN-1001',
    fullName: 'Glody Tshisekedi',
    phone: '+243 82 567 8901',
    email: 'glody.t@gmail.com',
    pin: '1234',
    loyaltyPoints: 420,
    freeMinutesBalance: 30,
    totalPlayMinutes: 2700,
    totalSpentCDF: 385000,
    totalSpentUSD: 137.50,
    tier: 'VIP',
    tierPromotedAt: now - 15 * oneDay,
    sessionsHistory: createGlodySessions(),
    referralCode: 'GLODY243',
    referralCount: 4,
    totalReferralBonusPoints: 450,
    dataConsentAccepted: true,
    whatsappConsent: true,
    whatsappConsentDate: now - 75 * oneDay,
    failedLoginAttempts: 0,
    createdAt: now - 75 * oneDay,
  },
  {
    id: 'cli-2',
    clientCode: 'KIN-1002',
    fullName: 'Fally Mutombo',
    phone: '+243 81 234 5678',
    email: 'fally.m@yahoo.fr',
    pin: '1234',
    loyaltyPoints: 210,
    freeMinutesBalance: 15,
    totalPlayMinutes: 1080,
    totalSpentCDF: 70000,
    totalSpentUSD: 25.00,
    tier: 'FIDELE',
    tierPromotedAt: now - 8 * oneDay,
    sessionsHistory: createFallySessions(),
    referralCode: 'FALLY243',
    referralCount: 2,
    totalReferralBonusPoints: 200,
    dataConsentAccepted: true,
    whatsappConsent: true,
    whatsappConsentDate: now - 45 * oneDay,
    failedLoginAttempts: 0,
    createdAt: now - 45 * oneDay,
  },
  {
    id: 'cli-3',
    clientCode: 'KIN-1003',
    fullName: 'Junior Kalala',
    phone: '+243 89 345 6789',
    pin: '1234',
    loyaltyPoints: 95,
    freeMinutesBalance: 0,
    totalPlayMinutes: 280,
    totalSpentCDF: 15000,
    totalSpentUSD: 5.35,
    tier: 'REGULIER',
    tierPromotedAt: now - 2 * oneDay,
    sessionsHistory: createJuniorSessions(),
    referralCode: 'JUNIOR243',
    referredById: 'cli-2',
    referredByName: 'Fally Mutombo',
    referralCount: 1,
    totalReferralBonusPoints: 50,
    dataConsentAccepted: true,
    whatsappConsent: true,
    whatsappConsentDate: now - 25 * oneDay,
    failedLoginAttempts: 0,
    createdAt: now - 25 * oneDay,
  },
  {
    id: 'cli-4',
    clientCode: 'KIN-1004',
    fullName: 'Cedrick Mbemba',
    phone: '+243 99 456 7890',
    pin: '1234',
    loyaltyPoints: 30,
    freeMinutesBalance: 0,
    totalPlayMinutes: 90,
    totalSpentCDF: 5000,
    totalSpentUSD: 1.79,
    tier: 'NOUVEAU',
    sessionsHistory: [
      {
        ticketId: 'TICK-HIST-401',
        date: now - 4 * oneDay,
        durationMinutes: 60,
        amountPaidCDF: 5000,
        amountPaidUSD: 1.79,
        isPaidSession: true,
        stationType: 'PS4',
        weekNumberYear: getISOWeekKey(new Date(now - 4 * oneDay)),
      },
    ],
    referralCode: 'CEDRICK243',
    referredById: 'cli-1',
    referredByName: 'Glody Tshisekedi',
    referralCount: 0,
    totalReferralBonusPoints: 0,
    dataConsentAccepted: true,
    whatsappConsent: true,
    whatsappConsentDate: now - 5 * oneDay,
    failedLoginAttempts: 0,
    createdAt: now - 5 * oneDay,
  },
];

const INITIAL_STATIONS: Station[] = [
  // 8 PS4
  {
    id: 1,
    name: 'Poste 1 (PS4 Pro - FIFA / Tekken)',
    type: 'PS4',
    status: 'occupied',
    currentTicketId: 'TICK-2026-001',
    clientName: 'Glody Tshisekedi',
    clientPhone: '+243 82 567 8901',
    clientId: 'cli-1',
    startTime: now - 22 * 60000,
    endTime: now + 38 * 60000,
    remainingSeconds: 38 * 60,
    totalDurationMinutes: 60,
    relayState: true,
    screenRelayState: true,
    currentWatts: 142.5,
    totalKWh: 18.4,
    relayTopic: 'gaminghub/station/1/power',
    lastUpdated: now,
  },
  {
    id: 2,
    name: 'Poste 2 (PS4 Slim - GTA V / PES)',
    type: 'PS4',
    status: 'occupied',
    currentTicketId: 'TICK-2026-002',
    clientName: 'Junior Kalala',
    clientPhone: '+243 89 345 6789',
    clientId: 'cli-3',
    startTime: now - 25 * 60000,
    endTime: now + 5 * 60000,
    remainingSeconds: 5 * 60,
    totalDurationMinutes: 30,
    relayState: true,
    screenRelayState: true,
    currentWatts: 128.0,
    totalKWh: 14.2,
    relayTopic: 'gaminghub/station/2/power',
    lastUpdated: now,
  },
  {
    id: 3,
    name: 'Poste 3 (PS4 Pro - Mortal Kombat)',
    type: 'PS4',
    status: 'available',
    remainingSeconds: 0,
    totalDurationMinutes: 0,
    relayState: false,
    screenRelayState: false,
    currentWatts: 0,
    totalKWh: 12.8,
    relayTopic: 'gaminghub/station/3/power',
    lastUpdated: now,
  },
  {
    id: 4,
    name: 'Poste 4 (PS4 Slim - Naruto Storm)',
    type: 'PS4',
    status: 'available',
    remainingSeconds: 0,
    totalDurationMinutes: 0,
    relayState: false,
    screenRelayState: false,
    currentWatts: 0,
    totalKWh: 11.5,
    relayTopic: 'gaminghub/station/4/power',
    lastUpdated: now,
  },
  {
    id: 5,
    name: 'Poste 5 (PS4 Pro - Call of Duty)',
    type: 'PS4',
    status: 'available',
    remainingSeconds: 0,
    totalDurationMinutes: 0,
    relayState: false,
    screenRelayState: false,
    currentWatts: 0,
    totalKWh: 15.1,
    relayTopic: 'gaminghub/station/5/power',
    lastUpdated: now,
  },
  {
    id: 6,
    name: 'Poste 6 (PS4 Slim - Gran Turismo)',
    type: 'PS4',
    status: 'maintenance',
    remainingSeconds: 0,
    totalDurationMinutes: 0,
    relayState: false,
    screenRelayState: false,
    currentWatts: 0,
    totalKWh: 9.7,
    relayTopic: 'gaminghub/station/6/power',
    lastUpdated: now,
  },
  {
    id: 7,
    name: 'Poste 7 (PS4 Pro - Spider-Man)',
    type: 'PS4',
    status: 'available',
    remainingSeconds: 0,
    totalDurationMinutes: 0,
    relayState: false,
    screenRelayState: false,
    currentWatts: 0,
    totalKWh: 13.9,
    relayTopic: 'gaminghub/station/7/power',
    lastUpdated: now,
  },
  {
    id: 8,
    name: 'Poste 8 (PS4 Slim - Dragon Ball FighterZ)',
    type: 'PS4',
    status: 'available',
    remainingSeconds: 0,
    totalDurationMinutes: 0,
    relayState: false,
    screenRelayState: false,
    currentWatts: 0,
    totalKWh: 10.3,
    relayTopic: 'gaminghub/station/8/power',
    lastUpdated: now,
  },
  // 2 PS5
  {
    id: 9,
    name: 'Poste 9 (PS5 Ultra 120Hz - EA FC 25 / NBA 2K)',
    type: 'PS5',
    status: 'occupied',
    currentTicketId: 'TICK-2026-003',
    clientName: 'Fally Mutombo',
    clientPhone: '+243 81 234 5678',
    clientId: 'cli-2',
    startTime: now - 10 * 60000,
    endTime: now + 50 * 60000,
    remainingSeconds: 50 * 60,
    totalDurationMinutes: 60,
    relayState: true,
    screenRelayState: true,
    currentWatts: 215.4,
    totalKWh: 24.6,
    relayTopic: 'gaminghub/station/9/power',
    lastUpdated: now,
  },
  {
    id: 10,
    name: 'Poste 10 (PS5 Ultra 120Hz - God of War / Tekken 8)',
    type: 'PS5',
    status: 'available',
    remainingSeconds: 0,
    totalDurationMinutes: 0,
    relayState: false,
    screenRelayState: false,
    currentWatts: 0,
    totalKWh: 22.1,
    relayTopic: 'gaminghub/station/10/power',
    lastUpdated: now,
  },
];

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tick-1',
    ticketNumber: 'TICK-2026-001',
    signedToken: 'kgh_tok_f8a92b01c4e7_9921',
    stationId: 1,
    stationName: 'Poste 1 (PS4)',
    stationType: 'PS4',
    clientName: 'Glody Tshisekedi',
    clientPhone: '+243 82 567 8901',
    clientId: 'cli-1',
    durationMinutes: 60,
    startTime: now - 22 * 60000,
    endTime: now + 38 * 60000,
    amountCDF: 4500, // avec 10% remise VIP
    amountUSD: 1.61,
    appliedDiscountPercent: 10,
    paymentMethod: 'MPESA',
    paymentReference: 'MP-84920491',
    payerPhone: '+243825678901',
    cashierName: 'Erick (Caissier Accueil)',
    status: 'active',
    createdAt: now - 22 * 60000,
    extendedCount: 0,
  },
  {
    id: 'tick-2',
    ticketNumber: 'TICK-2026-002',
    signedToken: 'kgh_tok_3c71a9e4d28f_5514',
    stationId: 2,
    stationName: 'Poste 2 (PS4)',
    stationType: 'PS4',
    clientName: 'Junior Kalala',
    clientPhone: '+243 89 345 6789',
    clientId: 'cli-3',
    durationMinutes: 30,
    startTime: now - 25 * 60000,
    endTime: now + 5 * 60000,
    amountCDF: 3000,
    amountUSD: 1.07,
    paymentMethod: 'CASH_CDF',
    cashReceivedCDF: 5000,
    changeGivenCDF: 2000,
    cashierName: 'Erick (Caissier Accueil)',
    status: 'active',
    createdAt: now - 25 * 60000,
    extendedCount: 0,
  },
  {
    id: 'tick-3',
    ticketNumber: 'TICK-2026-003',
    signedToken: 'kgh_tok_8e10b7410f93_7732',
    stationId: 9,
    stationName: 'Poste 9 (PS5)',
    stationType: 'PS5',
    clientName: 'Fally Mutombo',
    clientPhone: '+243 81 234 5678',
    clientId: 'cli-2',
    durationMinutes: 60,
    startTime: now - 10 * 60000,
    endTime: now + 50 * 60000,
    amountCDF: 7600, // avec 5% remise Fidèle
    amountUSD: 2.71,
    appliedDiscountPercent: 5,
    paymentMethod: 'ILLICO_CASH',
    paymentReference: 'ILC-99238471',
    payerPhone: '+243812345678',
    cashierName: 'Erick (Caissier Accueil)',
    status: 'active',
    createdAt: now - 10 * 60000,
    extendedCount: 0,
  },
];

const INITIAL_QUEUE: QueueEntry[] = [
  {
    id: 'q-1',
    clientName: 'Cedrick Mbemba',
    phone: '+243 99 456 7890',
    clientId: 'cli-4',
    clientTier: 'NOUVEAU',
    desiredStationType: 'PS4',
    desiredDurationMinutes: 30,
    arrivalTime: now - 15 * 60000,
    priorityLevel: 'NORMAL',
    status: 'waiting',
    gracePeriodSeconds: 180,
  },
  {
    id: 'q-2',
    clientName: 'Michel Bombele',
    phone: '+243 84 998 8776',
    desiredStationType: 'PS5',
    desiredDurationMinutes: 60,
    arrivalTime: now - 8 * 60000,
    priorityLevel: 'VIP',
    status: 'waiting',
    gracePeriodSeconds: 180,
  },
];

const INITIAL_DOMOTIQUE: DomotiqueDevice[] = [
  ...Array.from({ length: 10 }, (_, i) => {
    const id = i + 1;
    const isPS5 = id > 8;
    const isStationActive = id === 1 || id === 2 || id === 9;
    return {
      id: `dev-station-${id}`,
      stationId: id,
      name: `Relais Poste ${id} (${isPS5 ? 'PS5' : 'PS4'} + Écran)`,
      type: 'STATION_CONSOLE_TV' as const,
      relayTopic: `gaminghub/station/${id}/power`,
      state: isStationActive ? ('ON' as const) : ('OFF' as const),
      watts: id === 1 ? 142.5 : id === 2 ? 128 : id === 9 ? 215.4 : 0,
      totalKWh: id === 1 ? 18.4 : id === 2 ? 14.2 : id === 9 ? 24.6 : 10.0 + id,
      isOnline: true,
      hardwareType: (id % 2 === 0 ? 'SHELLY_1PM' : 'SONOFF_S26') as ('SHELLY_1PM' | 'SONOFF_S26'),
      ipAddress: `192.168.1.${120 + id}`,
    };
  }),
  {
    id: 'dev-ambient-lights',
    name: 'Éclairage Ambiance Néon & Salle',
    type: 'AMBIENT_LIGHT',
    relayTopic: 'gaminghub/ambient/lighting',
    state: 'ON',
    watts: 85.0,
    totalKWh: 32.5,
    isOnline: true,
    hardwareType: 'TASMOTA',
    ipAddress: '192.168.1.140',
  },
  {
    id: 'dev-ac-main',
    name: 'Climatiseur Principal (Zone PS5 & Accueil)',
    type: 'AIR_CONDITIONER',
    relayTopic: 'gaminghub/climate/ac1',
    state: 'ON',
    watts: 1450.0,
    totalKWh: 184.2,
    isOnline: true,
    hardwareType: 'SHELLY_1PM',
    ipAddress: '192.168.1.141',
  },
  {
    id: 'dev-ac-ps4',
    name: 'Climatiseur Zone PS4',
    type: 'AIR_CONDITIONER',
    relayTopic: 'gaminghub/climate/ac2',
    state: 'ON',
    watts: 1250.0,
    totalKWh: 156.8,
    isOnline: true,
    hardwareType: 'SHELLY_1PM',
    ipAddress: '192.168.1.142',
  },
  {
    id: 'dev-fan-extract',
    name: 'Extracteur d\'air & Ventilation',
    type: 'EXHAUST_FAN',
    relayTopic: 'gaminghub/climate/fan',
    state: 'ON',
    watts: 110.0,
    totalKWh: 22.0,
    isOnline: true,
    hardwareType: 'SONOFF_S26',
    ipAddress: '192.168.1.143',
  },
];

const INITIAL_SNACKS: SnackItem[] = [
  { id: 'snk-1', name: 'Eau Vitalo 500ml', category: 'DRINK', priceCDF: 1000, priceUSD: 0.36, stockQuantity: 48, unit: 'Bouteille' },
  { id: 'snk-2', name: 'Canette Coca-Cola 33cl', category: 'DRINK', priceCDF: 2500, priceUSD: 0.89, stockQuantity: 32, unit: 'Canette' },
  { id: 'snk-3', name: 'Canette Fanta Orange 33cl', category: 'DRINK', priceCDF: 2500, priceUSD: 0.89, stockQuantity: 24, unit: 'Canette' },
  { id: 'snk-4', name: 'Maltina / Malta Guinness', category: 'DRINK', priceCDF: 3000, priceUSD: 1.07, stockQuantity: 20, unit: 'Bouteille' },
  { id: 'snk-5', name: 'Jus Simba Mangue / Ananas', category: 'DRINK', priceCDF: 2000, priceUSD: 0.71, stockQuantity: 30, unit: 'Brique' },
  { id: 'snk-6', name: 'Sachet Plantain Chips (Makemba)', category: 'SNACK', priceCDF: 1500, priceUSD: 0.54, stockQuantity: 25, unit: 'Sachet' },
  { id: 'snk-7', name: 'Biscuits Bourbon / Chocolat', category: 'SNACK', priceCDF: 1000, priceUSD: 0.36, stockQuantity: 40, unit: 'Paquet' },
  { id: 'snk-8', name: 'Arachides Grillées Salées', category: 'SNACK', priceCDF: 1000, priceUSD: 0.36, stockQuantity: 35, unit: 'Sachet' },
];

const INITIAL_SHIFT: CashShift = {
  id: 'shift-today',
  cashierName: 'Erick (Caissier Accueil)',
  cashierId: 'staff-erick',
  openedAt: now - 4 * 3600000,
  openingFloatCDF: 50000,
  openingFloatUSD: 20,
  expectedCashCDF: 53000,
  expectedCashUSD: 22.71,
  totalIllicoCashCDF: 7600,
  totalIllicoCashUSD: 2.71,
  totalMomoCDF: 4500,
  totalMomoUSD: 1.61,
  totalSnacksCDF: 3500,
  totalSnacksUSD: 1.25,
  status: 'OPEN',
};

const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: now - 4 * 3600000,
    userRole: 'CAISSIER',
    cashierName: 'Erick (Caissier Accueil)',
    action: 'OUVERTURE_CAISSE',
    details: 'Prise de service avec fond de 50 000 CDF et 20 USD',
  },
  {
    id: 'aud-2',
    timestamp: now - 22 * 60000,
    userRole: 'CAISSIER',
    cashierName: 'Erick (Caissier Accueil)',
    action: 'CREATION_TICKET',
    details: 'Ticket TICK-2026-001 (Poste 1 - 60m - 4 500 CDF via M-Pesa)',
    stationId: 1,
  },
  {
    id: 'aud-3',
    timestamp: now - 15 * oneDay,
    userRole: 'SYSTEM',
    cashierName: 'Automate Statuts',
    action: 'PROMOTION_STATUT',
    details: 'Glody Tshisekedi est promu VIP (Voie heures >= 40h franchie)',
  },
];

const INITIAL_TIER_HISTORY: TierHistoryEntry[] = [
  {
    id: 'th-1',
    clientId: 'cli-1',
    clientName: 'Glody Tshisekedi',
    date: now - 15 * oneDay,
    oldTier: 'FIDELE',
    newTier: 'VIP',
    reason: 'Seuil de 40 heures de jeu payées sur 90 jours atteint (45.5h)',
    performedBy: 'SYSTEM_AUTO',
  },
  {
    id: 'th-2',
    clientId: 'cli-2',
    clientName: 'Fally Mutombo',
    date: now - 8 * oneDay,
    oldTier: 'REGULIER',
    newTier: 'FIDELE',
    reason: '14 sessions payées et 18h de jeu réparties sur 5 semaines',
    performedBy: 'SYSTEM_AUTO',
  },
  {
    id: 'th-3',
    clientId: 'cli-3',
    clientName: 'Junior Kalala',
    date: now - 2 * oneDay,
    oldTier: 'NOUVEAU',
    newTier: 'REGULIER',
    reason: '3 sessions payées accomplies',
    performedBy: 'SYSTEM_AUTO',
  },
];

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return createInitialState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      saveAppState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.stations) || parsed.stations.length === 0 || !parsed.staffUsers) {
      const initial = createInitialState();
      saveAppState(initial);
      return initial;
    }
    const initial = createInitialState();
    if (!parsed.whatsappConfig) {
      parsed.whatsappConfig = initial.whatsappConfig;
    } else if (!parsed.whatsappConfig.testPhoneNumber || parsed.whatsappConfig.testPhoneNumber === '+243812345678') {
      parsed.whatsappConfig.testPhoneNumber = '+243895457097';
    }
    if (!parsed.notificationLogs) {
      parsed.notificationLogs = initial.notificationLogs;
    }
    if (!Array.isArray(parsed.settingsHistory)) {
      parsed.settingsHistory = [];
    }
    if (!Array.isArray(parsed.scheduledSettings)) {
      parsed.scheduledSettings = [];
    }
    if (parsed.settings && parsed.settings.voiceAlertsEnabled === undefined) {
      parsed.settings.voiceAlertsEnabled = true;
    }
    // Migration: s'assurer que les tickets existants ont un signedToken
    if (parsed.tickets) {
      parsed.tickets = parsed.tickets.map(t => ({
        ...t,
        signedToken: t.signedToken || `kgh_tok_${Math.random().toString(36).substring(2, 12)}_${t.stationId}`,
      }));
    }
    // Migration: s'assurer que les utilisateurs existants sans changement de mot de passe ont mustChangePassword: true
    if (parsed.staffUsers) {
      parsed.staffUsers = parsed.staffUsers.map(u => ({
        ...u,
        mustChangePassword: u.mustChangePassword !== undefined ? u.mustChangePassword : !u.passwordUpdatedAt,
      }));
    }
    // Migration: s'assurer que les ventes snacks existantes ont un numéro de reçu
    if (parsed.snackSales) {
      parsed.snackSales = parsed.snackSales.map((s, idx) => ({
        ...s,
        receiptNumber: s.receiptNumber || `SNK-2026-${String(idx + 1).padStart(3, '0')}`,
      }));
    }
    // Migration: s'assurer que currentShift a totalIllicoCash
    if (parsed.currentShift) {
      if (typeof parsed.currentShift.totalIllicoCashCDF !== 'number') {
        parsed.currentShift.totalIllicoCashCDF = 0;
        parsed.currentShift.totalIllicoCashUSD = 0;
      }
    }
    // Migration: synchroniser et fusionner avec DEFAULT_SETTINGS pour garantir tous les champs des 11 sections
    if (parsed.settings) {
      parsed.settings = {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        paymentMethodsConfig: {
          ...DEFAULT_SETTINGS.paymentMethodsConfig,
          ...(parsed.settings.paymentMethodsConfig || {}),
        },
        overtimeRatePerMinuteCDF: {
          ...DEFAULT_SETTINGS.overtimeRatePerMinuteCDF,
          ...(parsed.settings.overtimeRatePerMinuteCDF || {}),
        },
        lightingACSchedule: {
          ...DEFAULT_SETTINGS.lightingACSchedule,
          ...(parsed.settings.lightingACSchedule || {}),
        },
        operatingHours: {
          ...DEFAULT_SETTINGS.operatingHours,
          ...(parsed.settings.operatingHours || {}),
        },
        timeSlotPricingRules: Array.isArray(parsed.settings.timeSlotPricingRules)
          ? parsed.settings.timeSlotPricingRules
          : DEFAULT_TIME_SLOT_RULES,
      };
    } else {
      parsed.settings = DEFAULT_SETTINGS;
    }
    return parsed;
  } catch {
    const initial = createInitialState();
    saveAppState(initial);
    return initial;
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Erreur sauvegarde état local:', err);
  }
}

function createInitialState(): AppState {
  const currentStaff = INITIAL_STAFF[2]; // Erick par défaut
  return {
    stations: INITIAL_STATIONS,
    pricingPlans: INITIAL_PRICING,
    tickets: INITIAL_TICKETS,
    clients: INITIAL_CLIENTS,
    loyaltyTransactions: [
      {
        id: 'lt-1',
        clientId: 'cli-1',
        clientName: 'Glody Tshisekedi',
        type: 'EARN_PLAY',
        points: 6,
        description: 'Session 1h sur Poste 1 (PS4)',
        createdAt: now - 22 * 60000,
      },
      {
        id: 'lt-2',
        clientId: 'cli-1',
        clientName: 'Glody Tshisekedi',
        type: 'REFERRAL_SIGNUP',
        points: 50,
        description: 'Parrainage nouveau joueur: Cedrick Mbemba',
        createdAt: now - 5 * oneDay,
      },
    ],
    queue: INITIAL_QUEUE,
    domotiqueDevices: INITIAL_DOMOTIQUE,
    currentShift: INITIAL_SHIFT,
    shiftHistory: [],
    snackItems: INITIAL_SNACKS,
    snackSales: [
      {
        id: 'sale-1',
        receiptNumber: 'SNK-2026-001',
        shiftId: 'shift-today',
        itemName: 'Canette Coca-Cola 33cl',
        quantity: 1,
        items: [
          {
            itemId: 'snk-2',
            itemName: 'Canette Coca-Cola 33cl',
            quantity: 1,
            unitPriceCDF: 2500,
            unitPriceUSD: 0.89,
            totalCDF: 2500,
            totalUSD: 0.89,
          },
        ],
        totalCDF: 2500,
        totalUSD: 0.89,
        paymentMethod: 'CASH_CDF',
        timestamp: now - 90 * 60000,
        cashierName: 'Erick (Caissier Accueil)',
      },
      {
        id: 'sale-2',
        receiptNumber: 'SNK-2026-002',
        shiftId: 'shift-today',
        itemName: 'Biscuits Bourbon / Chocolat',
        quantity: 1,
        items: [
          {
            itemId: 'snk-7',
            itemName: 'Biscuits Bourbon / Chocolat',
            quantity: 1,
            unitPriceCDF: 1000,
            unitPriceUSD: 0.36,
            totalCDF: 1000,
            totalUSD: 0.36,
          },
        ],
        totalCDF: 1000,
        totalUSD: 0.36,
        paymentMethod: 'CASH_CDF',
        timestamp: now - 75 * 60000,
        cashierName: 'Erick (Caissier Accueil)',
      },
    ],
    auditLogs: INITIAL_AUDIT,
    settings: DEFAULT_SETTINGS,
    settingsHistory: [
      {
        id: 'set-hist-1',
        timestamp: now - 14 * oneDay,
        section: 'Devises',
        settingKey: 'exchangeRate',
        label: 'Taux de change USD/CDF',
        oldValue: 2750,
        newValue: 2800,
        modifiedBy: 'Aimé (Propriétaire / Admin)',
        reason: 'Ajustement cours du marché parallèle Gombe',
        effectiveAt: now - 14 * oneDay,
      },
      {
        id: 'set-hist-2',
        timestamp: now - 30 * oneDay,
        section: 'Tarifs',
        settingKey: 'pricingPlans',
        label: 'Grille Forfait 3H PS5',
        oldValue: 20000,
        newValue: 21000,
        modifiedBy: 'Aimé (Propriétaire / Admin)',
        reason: 'Nouvelle politique tarifaire soirée & week-end',
        effectiveAt: now - 30 * oneDay,
      },
    ],
    scheduledSettings: [],
    staffUsers: INITIAL_STAFF,
    currentStaffUser: currentStaff,
    isStaffAuthenticated: false,
    loginLogs: INITIAL_LOGIN_LOGS,
    tierRules: DEFAULT_TIER_RULES,
    tierHistory: INITIAL_TIER_HISTORY,
    activeCustomerPortalClientId: null,
    whatsappConfig: {
      phoneNumberId: '109876543210987',
      businessAccountId: '234567890123456',
      accessToken: 'EAAG...',
      apiVersion: 'v21.0',
      verifyToken: 'kin_gaming_hub_secure_token_2026',
      isTestMode: true,
      testPhoneNumber: '+243895457097',
      optInRequired: true,
      autoNotifyQueueTurn: true,
      autoNotifyQueueApproaching: true,
      autoNotifyGraceReminder: true,
      autoNotifyPromotions: true,
    },
    notificationLogs: [
      {
        id: 'notif-1',
        timestamp: now - 35 * 60000,
        clientId: 'cli-2',
        clientName: 'Fally Mutombo',
        phone: '+243812345678',
        templateName: 'bientot_votre_tour',
        variables: { '1': 'Fally', '2': '10' },
        renderedMessage: "Bonjour Fally, vous êtes bientôt appelé(e). Il reste environ 10 minutes d'attente.",
        status: 'DELIVERED',
        retryCount: 0,
        metaMessageId: 'wamid.HBgLMjQzODEyMzQ1Njc4FQIAERgSQ0ZBMjEyNTY3ODkx',
        deliveredAt: now - 34 * 60000,
      },
      {
        id: 'notif-2',
        timestamp: now - 10 * 60000,
        clientId: 'cli-2',
        clientName: 'Fally Mutombo',
        phone: '+243812345678',
        templateName: 'poste_pret',
        variables: { '1': 'Fally', '2': '9', '3': 'PS5', '4': '3' },
        renderedMessage: 'Bonjour Fally, le poste 9 (PS5) est prêt pour vous. Merci de vous présenter dans les 3 minutes.',
        status: 'READ',
        retryCount: 0,
        metaMessageId: 'wamid.HBgLMjQzODEyMzQ1Njc4FQIAERgSQ0ZBMjEyNTY3ODky',
        deliveredAt: now - 9 * 60000,
        readAt: now - 8 * 60000,
        replies: [
          {
            timestamp: now - 7 * 60000,
            text: "OUI, j'arrive !",
            fromPhone: '+243812345678',
          },
        ],
      },
    ],
    currentRole: currentStaff.role,
    currentUser: currentStaff.fullName,
  };
}
