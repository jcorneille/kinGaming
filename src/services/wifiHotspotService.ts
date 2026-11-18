import {
  LoyaltyTier,
  PricingPlan,
  Reservation,
  Station,
  StationType,
  SystemSettings,
  WifiVoucher,
} from '../types';
import { getConsoleLabel, getFallbackBaseType } from './consoleCatalog';
import { getActiveTimeSlotForStation } from './pricingEngine';

export const WIFI_MIN_TICKET_MINUTES = 60;
export const RESERVATION_MIN_MINUTES = 180;
export const RESERVATION_FEE_PERCENT = 15;
export const RESERVATION_CANCEL_MIN_BEFORE_MINUTES = 60;
export const DEFAULT_HOTSPOT_SSID = 'GOZA-WiFi';

const VOUCHER_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Règle multi-appareils Wi-Fi selon la durée achetée :
 * - < 1h (60 min) : 0 (pas de Wi-Fi)
 * - 1h à < 3h : 1 appareil
 * - 3h (180–239 min) : 2 appareils
 * - 4h (240–299 min) : 3 appareils
 * - 5h et plus (>= 300 min) : 4 appareils
 */
export function getWifiMaxDevicesForDuration(durationMinutes: number): number {
  if (durationMinutes < WIFI_MIN_TICKET_MINUTES) return 0;
  if (durationMinutes >= 300) return 4;
  if (durationMinutes >= 240) return 3;
  if (durationMinutes >= 180) return 2;
  return 1;
}

export function generateWifiCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += VOUCHER_CHARSET.charAt(Math.floor(Math.random() * VOUCHER_CHARSET.length));
  }
  return `GZ-${suffix}`;
}

export function generateReservationCode(existingCodes: string[] = []): string {
  const existing = new Set(existingCodes.map((c) => c.toUpperCase()));
  for (let attempt = 0; attempt < 25; attempt++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `RES-${num}`;
    if (!existing.has(code)) return code;
  }
  return `RES-${Date.now().toString().slice(-4)}`;
}

export function createWifiVoucherForTicket(params: {
  durationMinutes: number;
  validFrom: number;
  expiresAt: number;
  ticketNumber: string;
  settings?: SystemSettings;
  inQueueWaiting?: boolean;
  existingCode?: string;
  maxDevicesOverride?: number;
}): WifiVoucher | undefined {
  const minMins = params.settings?.wifiMinTicketMinutes ?? WIFI_MIN_TICKET_MINUTES;
  if (params.durationMinutes < minMins && !params.maxDevicesOverride) return undefined;

  const computedMax =
    params.maxDevicesOverride ?? getWifiMaxDevicesForDuration(params.durationMinutes);
  const maxDevices = Math.max(1, computedMax);

  return {
    code: params.existingCode || generateWifiCode(),
    ssid: params.settings?.hotspotSsid || DEFAULT_HOTSPOT_SSID,
    validFrom: params.validFrom,
    expiresAt: Math.max(params.validFrom + 60000, params.expiresAt),
    maxDevices,
    singleUseDeviceBound: maxDevices === 1,
    status: 'ACTIVE',
    inQueueWaiting: Boolean(params.inQueueWaiting),
    ticketNumber: params.ticketNumber,
    mikrotikSynced: true,
  };
}

export interface LateDeductionResult {
  lostLateMinutes: number;
  playableDurationMinutes: number;
  isFullyExpired: boolean;
}

export function computeLateDeduction(
  reservedForTime: number,
  paidDurationMinutes: number,
  now: number = Date.now()
): LateDeductionResult {
  const lostLateMinutes =
    now > reservedForTime ? Math.max(0, Math.floor((now - reservedForTime) / 60000)) : 0;
  const playableDurationMinutes = Math.max(0, paidDurationMinutes - lostLateMinutes);
  return {
    lostLateMinutes,
    playableDurationMinutes,
    isFullyExpired: playableDurationMinutes <= 0,
  };
}

export interface ClientCancelCheck {
  canCancel: boolean;
  minutesRemainingBeforeStart: number;
  deadlineTime: number;
}

export function canCancelReservationClient(
  reservedForTime: number,
  now: number = Date.now()
): ClientCancelCheck {
  const diffMs = reservedForTime - now;
  const minutesRemainingBeforeStart = Math.floor(diffMs / 60000);
  const deadlineTime = reservedForTime - RESERVATION_CANCEL_MIN_BEFORE_MINUTES * 60000;
  return {
    canCancel: diffMs >= RESERVATION_CANCEL_MIN_BEFORE_MINUTES * 60000,
    minutesRemainingBeforeStart,
    deadlineTime,
  };
}

export interface TimeWindowCheck {
  status: 'ON_TIME' | 'EARLY' | 'LATE';
  diffMinutes: number;
  lostLateMinutes: number;
  isRespected: boolean;
  label: string;
}

export function evaluateReservationTimeWindow(
  reservedForTime: number,
  now: number = Date.now()
): TimeWindowCheck {
  const diffMs = now - reservedForTime;
  const diffMinutes = Math.round(diffMs / 60000);
  const lostLateMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;

  if (diffMinutes < -20) {
    return {
      status: 'EARLY',
      diffMinutes,
      lostLateMinutes: 0,
      isRespected: false,
      label: `En avance de ${Math.abs(diffMinutes)} min`,
    };
  }
  if (lostLateMinutes > 0) {
    return {
      status: 'LATE',
      diffMinutes: lostLateMinutes,
      lostLateMinutes,
      isRespected: true,
      label: `Retard de +${lostLateMinutes} min (déduit automatiquement)`,
    };
  }
  return {
    status: 'ON_TIME',
    diffMinutes,
    lostLateMinutes: 0,
    isRespected: true,
    label:
      diffMinutes === 0
        ? "À l'heure exacte"
        : `À l'heure (${Math.abs(diffMinutes)} min avant)`,
  };
}

export interface ReservationAvailabilityResult {
  available: boolean;
  reason?: string;
  conflictingUntil?: number;
  matchingStationsCount: number;
  busyStationsCount: number;
  overlappingReservationsCount: number;
}

function formatShortDateTime(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Vérifie si la date, l'heure, la durée et le poste choisis sont disponibles
 * (tient compte de l'occupation en cours des postes, de la maintenance et des réservations existantes).
 */
export function checkReservationAvailability(params: {
  stationType: StationType;
  preferredStationId?: number;
  reservedForTime: number;
  durationMinutes: number;
  stations?: Station[];
  reservations?: Reservation[];
}): ReservationAvailabilityResult {
  const {
    stationType,
    preferredStationId,
    reservedForTime,
    durationMinutes,
    stations = [],
    reservations = [],
  } = params;

  if (!reservedForTime || Number.isNaN(reservedForTime)) {
    return {
      available: false,
      reason: "Ce n'est pas disponible : veuillez sélectionner une date et une heure valides.",
      matchingStationsCount: 0,
      busyStationsCount: 0,
      overlappingReservationsCount: 0,
    };
  }

  const now = Date.now();
  const reqStart = reservedForTime;
  const reqEnd = reservedForTime + Math.max(60, durationMinutes) * 60000;
  const matchingStations = stations.filter((st) => st.type === stationType);

  if (stations.length > 0 && matchingStations.length === 0) {
    return {
      available: false,
      reason: `Ce n'est pas disponible : aucun poste ${getConsoleLabel(stationType)} n'est configuré dans la salle actuellement.`,
      matchingStationsCount: 0,
      busyStationsCount: 0,
      overlappingReservationsCount: 0,
    };
  }

  const activeReservations = reservations.filter(
    (r) =>
      r.status === 'PAID_WAITING_CHECKIN' ||
      r.status === 'VALIDATED_IN_QUEUE' ||
      r.status === 'VALIDATED_ON_STATION'
  );

  // 1. Vérification spécifique si le joueur a choisi un poste précis
  if (preferredStationId && preferredStationId > 0) {
    const targetStation = stations.find((st) => st.id === preferredStationId);
    if (!targetStation) {
      return {
        available: false,
        reason: "Ce n'est pas disponible : le poste choisi n'existe pas.",
        matchingStationsCount: matchingStations.length,
        busyStationsCount: 0,
        overlappingReservationsCount: 0,
      };
    }
    if (targetStation.status === 'maintenance') {
      return {
        available: false,
        reason: `Ce n'est pas disponible : ${targetStation.name} est actuellement en maintenance.`,
        matchingStationsCount: matchingStations.length,
        busyStationsCount: 1,
        overlappingReservationsCount: 0,
      };
    }

    if (targetStation.status === 'occupied' || targetStation.status === 'reserved') {
      const stStart = targetStation.startTime || now;
      const stEnd = targetStation.endTime || now + Math.max(0, targetStation.remainingSeconds) * 1000;
      if (stStart < reqEnd && stEnd > reqStart) {
        return {
          available: false,
          conflictingUntil: stEnd,
          reason: `Ce n'est pas disponible : ${targetStation.name} est occupé jusqu'à ${formatShortDateTime(stEnd)} sur ce créneau.`,
          matchingStationsCount: matchingStations.length,
          busyStationsCount: 1,
          overlappingReservationsCount: 0,
        };
      }
    }

    const directResConflict = activeReservations.find((r) => {
      if (r.preferredStationId !== targetStation.id && r.stationId !== targetStation.id) return false;
      const rStart = r.reservedForTime;
      const rEnd = rStart + (r.playableDurationMinutes ?? r.durationMinutes) * 60000;
      return reqStart < rEnd && reqEnd > rStart;
    });

    if (directResConflict) {
      const rStart = directResConflict.reservedForTime;
      const rEnd = rStart + (directResConflict.playableDurationMinutes ?? directResConflict.durationMinutes) * 60000;
      return {
        available: false,
        conflictingUntil: rEnd,
        reason: `Ce n'est pas disponible : ${targetStation.name} est déjà réservé le ${formatShortDateTime(rStart)} jusqu'à ${formatShortTime(rEnd)}.`,
        matchingStationsCount: matchingStations.length,
        busyStationsCount: 0,
        overlappingReservationsCount: 1,
      };
    }
  }

  // 2. Vérification globale de capacité pour le type de console choisi sur [reqStart, reqEnd]
  const busyStationIds = new Set<number>();
  let earliestFreeTs: number | undefined;

  for (const st of matchingStations) {
    if (st.status === 'maintenance') {
      busyStationIds.add(st.id);
      continue;
    }
    if (st.status === 'occupied' || st.status === 'reserved') {
      const stStart = st.startTime || now;
      const stEnd = st.endTime || now + Math.max(0, st.remainingSeconds) * 1000;
      if (stStart < reqEnd && stEnd > reqStart) {
        busyStationIds.add(st.id);
        if (!earliestFreeTs || stEnd < earliestFreeTs) {
          earliestFreeTs = stEnd;
        }
      }
    }
  }

  const overlappingReservations = activeReservations.filter((r) => {
    if (r.stationType !== stationType) return false;
    if (r.status === 'VALIDATED_ON_STATION' && r.stationId && busyStationIds.has(r.stationId)) {
      return false;
    }
    const rStart = r.reservedForTime;
    const rEnd = rStart + (r.playableDurationMinutes ?? r.durationMinutes) * 60000;
    const overlaps = reqStart < rEnd && reqEnd > rStart;
    if (overlaps && (!earliestFreeTs || rEnd < earliestFreeTs)) {
      earliestFreeTs = rEnd;
    }
    return overlaps;
  });

  if (matchingStations.length > 0 && busyStationIds.size + overlappingReservations.length >= matchingStations.length) {
    const hint = earliestFreeTs ? ` Prochaine disponibilité estimée vers ${formatShortDateTime(earliestFreeTs)}.` : '';
    return {
      available: false,
      conflictingUntil: earliestFreeTs,
      reason: `Ce n'est pas disponible : tous les postes ${getConsoleLabel(stationType)} sont occupés ou déjà réservés entre ${formatShortDateTime(reqStart)} et ${formatShortTime(reqEnd)}.${hint}`,
      matchingStationsCount: matchingStations.length,
      busyStationsCount: busyStationIds.size,
      overlappingReservationsCount: overlappingReservations.length,
    };
  }

  return {
    available: true,
    matchingStationsCount: matchingStations.length,
    busyStationsCount: busyStationIds.size,
    overlappingReservationsCount: overlappingReservations.length,
  };
}

export function computeReservationQuote(params: {
  stationType: StationType;
  durationMinutes: number;
  pricingPlans: PricingPlan[];
  settings?: SystemSettings;
  clientTier?: LoyaltyTier;
  paymentMode: 'MOBILE_MONEY' | 'CASH' | 'PAY_ON_SITE';
  reservedForTime?: number;
}) {
  const {
    stationType,
    durationMinutes,
    pricingPlans,
    settings,
    paymentMode,
    reservedForTime = Date.now(),
  } = params;
  const exchangeRate = settings?.exchangeRate || 2800;
  const roundingRule = settings?.cdfRoundingRule || 100;
  const fallbackBase = getFallbackBaseType(stationType);

  // Chercher tarif exact ou calculer au prorata horaire du catalogue console
  const exactPlan =
    pricingPlans.find((p) => p.stationType === stationType && p.durationMinutes === durationMinutes) ||
    pricingPlans.find((p) => p.stationType === fallbackBase && p.durationMinutes === durationMinutes);

  let rawBaseCDF = 0;
  if (exactPlan) {
    rawBaseCDF = exactPlan.priceCDF;
  } else {
    const hourlyPlan =
      pricingPlans.find((p) => p.stationType === stationType && p.durationMinutes === 60) ||
      pricingPlans.find((p) => p.stationType === fallbackBase && p.durationMinutes === 60);
    const hourlyRateCDF = hourlyPlan
      ? hourlyPlan.priceCDF
      : fallbackBase === 'PS5'
      ? 8000
      : 5000;
    rawBaseCDF = Math.round((hourlyRateCDF * durationMinutes) / 60);
  }

  // Appliquer éventuellement le modificateur de tranche horaire prévu à l'heure réservée
  const slotEval = getActiveTimeSlotForStation(settings, stationType, reservedForTime);
  const baseAmountCDF = Math.max(
    100,
    Math.round((rawBaseCDF * slotEval.multiplier) / roundingRule) * roundingRule
  );
  const baseAmountUSD = Number((baseAmountCDF / exchangeRate).toFixed(2));

  const feePercent =
    paymentMode === 'PAY_ON_SITE' ? 0 : settings?.reservationFeePercent ?? RESERVATION_FEE_PERCENT;
  const reservationFeeCDF =
    feePercent > 0
      ? Math.max(100, Math.round(((baseAmountCDF * feePercent) / 100) / roundingRule) * roundingRule)
      : 0;
  const reservationFeeUSD = Number((reservationFeeCDF / exchangeRate).toFixed(2));

  const totalAmountCDF = baseAmountCDF + reservationFeeCDF;
  const totalAmountUSD = Number((totalAmountCDF / exchangeRate).toFixed(2));

  return {
    baseAmountCDF,
    baseAmountUSD,
    feePercent,
    reservationFeeCDF,
    reservationFeeUSD,
    totalAmountCDF,
    totalAmountUSD,
    timeSlotLabel: slotEval.rule ? slotEval.label : undefined,
  };
}

export async function syncWifiVoucherToMikrotik(
  voucher: WifiVoucher,
  action: 'CREATE' | 'UPDATE' | 'REVOKE' = 'CREATE',
  settings?: SystemSettings
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const endpoint = action === 'REVOKE' ? '/api/wifi/voucher/revoke' : '/api/wifi/voucher';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucher,
        action,
        mikrotikHost: settings?.mikrotikHotspotHost || '192.168.1.1',
        mikrotikUser: settings?.mikrotikHotspotUser || 'goza-api',
      }),
    });
  } catch {
    // Tolérance hors-ligne
  }
}

export async function syncReservationToServer(reservation: Reservation): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation }),
    });
  } catch {
    // Tolérance hors-ligne
  }
}
