import {
  LoyaltyTier,
  PricingPlan,
  PromotionRule,
  StationType,
  SystemSettings,
  TimeSlotPricingRule,
} from '../types';
import { getFallbackBaseType } from './consoleCatalog';

export interface ActiveTimeSlotEvaluation {
  rule: TimeSlotPricingRule | null;
  percentDelta: number; // négatif = remise, positif = majoration
  multiplier: number;
  label: string;
}

const TIER_ORDER: Record<LoyaltyTier, number> = {
  NOUVEAU: 0,
  REGULIER: 1,
  FIDELE: 2,
  VIP: 3,
};

function parseMinutesFromHHMM(hhmm: string): number {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return Math.max(0, Math.min(23, h)) * 60 + Math.max(0, Math.min(59, m));
}

export function isTimeWithinSlot(nowMinutes: number, startHHMM: string, endHHMM: string): boolean {
  const start = parseMinutesFromHHMM(startHHMM);
  const end = parseMinutesFromHHMM(endHHMM);
  if (start === end) return true;
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }
  // Tranche nocturne traversant minuit (ex: 22:00 -> 06:00)
  return nowMinutes >= start || nowMinutes < end;
}

export function getActiveTimeSlotForStation(
  settings: SystemSettings | undefined,
  stationType: StationType,
  timestamp: number = Date.now()
): ActiveTimeSlotEvaluation {
  if (!settings || settings.enableTimeSlotPricing === false || !Array.isArray(settings.timeSlotPricingRules)) {
    return { rule: null, percentDelta: 0, multiplier: 1, label: 'Tarif Standard' };
  }

  const d = new Date(timestamp);
  const day = d.getDay(); // 0=Dimanche .. 6=Samedi
  const nowMinutes = d.getHours() * 60 + d.getMinutes();

  const fallbackType = getFallbackBaseType(stationType);
  const matching = settings.timeSlotPricingRules.filter((rule) => {
    if (!rule.isActive) return false;
    const typeMatches =
      rule.applicableStationTypes.includes(stationType) ||
      (stationType !== 'PS4' && stationType !== 'PS5' && rule.applicableStationTypes.includes(fallbackType));
    if (!typeMatches) return false;
    if (Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(day)) {
      return false;
    }
    return isTimeWithinSlot(nowMinutes, rule.startTime, rule.endTime);
  });

  if (matching.length === 0) {
    return { rule: null, percentDelta: 0, multiplier: 1, label: 'Tarif Standard' };
  }

  // Priorité aux tranches spécifiques aux jours (ex: Week-end) sinon première tranche active
  const chosen =
    matching.find((r) => Array.isArray(r.daysOfWeek) && r.daysOfWeek.length > 0) || matching[0];

  let multiplier = 1;
  let percentDelta = 0;

  if (chosen.modifierType === 'PERCENT_DISCOUNT') {
    const pct = Math.max(0, Math.min(90, chosen.modifierValue));
    multiplier = 1 - pct / 100;
    percentDelta = -pct;
  } else if (chosen.modifierType === 'PERCENT_SURCHARGE') {
    const pct = Math.max(0, Math.min(200, chosen.modifierValue));
    multiplier = 1 + pct / 100;
    percentDelta = pct;
  } else {
    multiplier = Math.max(0.1, chosen.modifierValue || 1);
    percentDelta = Math.round((multiplier - 1) * 100);
  }

  return {
    rule: chosen,
    percentDelta,
    multiplier,
    label: chosen.name,
  };
}

export function isPromotionEligible(
  promo: PromotionRule,
  stationType: StationType,
  clientTier: LoyaltyTier,
  now: number = Date.now()
): { valid: boolean; reason?: string } {
  if (!promo.isActive) {
    return { valid: false, reason: 'Ce code promo est désactivé.' };
  }
  const fallbackType = getFallbackBaseType(stationType);
  const promoTypeMatches =
    promo.applicableStationTypes.includes(stationType) ||
    (stationType !== 'PS4' && stationType !== 'PS5' && promo.applicableStationTypes.includes(fallbackType));
  if (!promoTypeMatches) {
    return { valid: false, reason: `Code réservé aux postes ${promo.applicableStationTypes.join(' / ')}.` };
  }
  if (promo.validFrom && now < promo.validFrom) {
    return { valid: false, reason: 'Cette promotion n’a pas encore commencé.' };
  }
  if (promo.validUntil && now > promo.validUntil) {
    return { valid: false, reason: 'Ce code promo est expiré.' };
  }
  if (promo.minTierRequired && TIER_ORDER[clientTier] < TIER_ORDER[promo.minTierRequired]) {
    return {
      valid: false,
      reason: `Réservé aux clients de statut minimum ${promo.minTierRequired}.`,
    };
  }
  return { valid: true };
}

export function computeDynamicTicketPrice(params: {
  plan?: PricingPlan;
  stationId: number;
  stationType: StationType;
  settings?: SystemSettings;
  exchangeRate: number;
  tierDiscountPercent: number;
  promo?: PromotionRule | null;
  now?: number;
}) {
  const {
    plan,
    stationId,
    stationType,
    settings,
    exchangeRate,
    tierDiscountPercent,
    promo,
    now = Date.now(),
  } = params;

  const roundingRule = settings?.cdfRoundingRule || 100;
  const stationOverride = settings?.stationSpecificOverrides?.[stationId];
  const stationMultiplier =
    stationOverride?.priceMultiplier && stationOverride.priceMultiplier > 0
      ? stationOverride.priceMultiplier
      : 1;

  const rawCDF = plan
    ? settings?.primaryCurrency === 'USD' && plan.priceUSD > 0
      ? plan.priceUSD * exchangeRate
      : plan.priceCDF > 0
        ? plan.priceCDF
        : plan.priceUSD * exchangeRate
    : 3000;
  const baseStationCDF = Math.max(
    100,
    Math.round((rawCDF * stationMultiplier) / roundingRule) * roundingRule
  );

  const timeSlot = getActiveTimeSlotForStation(settings, stationType, now);
  const afterTimeSlotCDF = Math.max(
    100,
    Math.round((baseStationCDF * timeSlot.multiplier) / roundingRule) * roundingRule
  );

  const tierDiscountCDF = Math.round((afterTimeSlotCDF * tierDiscountPercent) / 100);
  const afterTierCDF = Math.max(0, afterTimeSlotCDF - tierDiscountCDF);

  let promoDiscountCDF = 0;
  if (promo) {
    if (promo.discountType === 'PERCENT') {
      promoDiscountCDF = Math.round((afterTierCDF * Math.max(0, Math.min(100, promo.discountValue))) / 100);
    } else if (promo.discountType === 'FIXED_CDF') {
      promoDiscountCDF = Math.min(afterTierCDF, Math.max(0, promo.discountValue));
    } else if (promo.discountType === 'FIXED_USD') {
      promoDiscountCDF = Math.min(afterTierCDF, Math.round(Math.max(0, promo.discountValue) * exchangeRate));
    }
  }

  const finalCDF = Math.max(0, afterTierCDF - promoDiscountCDF);
  const finalUSD = finalCDF / (exchangeRate || 2800);
  const totalDiscountCDF = Math.max(0, afterTimeSlotCDF - finalCDF);

  return {
    baseStationCDF,
    afterTimeSlotCDF,
    timeSlot,
    tierDiscountCDF,
    promoDiscountCDF,
    totalDiscountCDF,
    finalCDF,
    finalUSD,
  };
}
