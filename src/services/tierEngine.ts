import { Client, LoyaltyTier, TierRulesConfig, TierHistoryEntry } from '../types';

export const DEFAULT_TIER_RULES: TierRulesConfig = {
  regMinSessions: 3,
  fideleMinSessions: 10,
  fideleMinHours: 15,
  fideleMinWeeks: 4,
  fideleMinDaysRegistered: 30,
  vipHoursThreshold: 40,
  vipSpendingThresholdUSD: 100,
  vipActiveReferralsThreshold: 5,
  rollingWindowDays: 90,
  gracePeriodDays: 30,
  minSessionMinutesForStats: 10,
  perks: {
    NOUVEAU: {
      label: 'Nouveau',
      pointMultiplier: 1.0,
      discountPercent: 0,
      queuePriority: 'NORMAL',
      colorBadge: 'bg-slate-700 text-slate-300 border-slate-600',
      description: 'Joueur nouvellement inscrit à GOZA.',
      otherBenefits: 'Bonus de bienvenue (5 min offertes sur 1re session)',
    },
    REGULIER: {
      label: 'Régulier',
      pointMultiplier: 1.0,
      discountPercent: 0,
      queuePriority: 'NORMAL',
      colorBadge: 'bg-slate-500/30 text-slate-200 border-slate-400/50',
      description: 'Client habituel ayant au moins 3 sessions payées.',
      otherBenefits: 'Accès portail client & historique',
    },
    FIDELE: {
      label: 'Fidèle',
      pointMultiplier: 1.25,
      discountPercent: 5,
      queuePriority: 'LOYAL',
      colorBadge: 'bg-slate-300/30 text-slate-100 border-slate-300 shadow-sm font-semibold',
      description: 'Joueur fidèle récurrent (≥10 sessions, ≥15h sur 4 semaines).',
      otherBenefits: 'Priorité en file d\'attente & minutes offertes à l\'anniversaire',
    },
    VIP: {
      label: 'VIP',
      pointMultiplier: 1.5,
      discountPercent: 10,
      queuePriority: 'VIP',
      colorBadge: 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/20',
      description: 'Client d\'élite (≥40h ou ≥$100 dépensés ou ≥5 filleuls actifs).',
      otherBenefits: 'Priorité maximale, réservation PS5 VIP & invitations tournois',
    },
  },
};

export interface TierEvaluationResult {
  currentTier: LoyaltyTier;
  calculatedTier: LoyaltyTier;
  isPromoted: boolean;
  isDemoted: boolean;
  inGracePeriod: boolean;
  gracePeriodDaysRemaining?: number;
  progressPercent: number; // 0 à 100% vers le rang supérieur
  nextTier?: LoyaltyTier;
  missingCriteria: string[];
  isCloseToPromotion: boolean; // >= 90%
  stats: {
    paidSessions90d: number;
    hoursPlayed90d: number;
    uniqueWeeks90d: number;
    daysRegistered: number;
    spendingUSD90d: number;
    activeReferralsCount: number;
  };
}

/**
 * Calcul déterministe du statut selon les règles paramétrables et les sessions réelles des 90 derniers jours.
 */
export function evaluateClientTier(
  client: Client,
  allClients: Client[],
  rules: TierRulesConfig = DEFAULT_TIER_RULES,
  now: number = Date.now()
): TierEvaluationResult {
  // Respect du VIP manuel attribué par l'admin
  if (client.isManualVIP) {
    return {
      currentTier: 'VIP',
      calculatedTier: 'VIP',
      isPromoted: false,
      isDemoted: false,
      inGracePeriod: false,
      progressPercent: 100,
      missingCriteria: ['Statut VIP attribué manuellement par la direction.'],
      isCloseToPromotion: false,
      stats: {
        paidSessions90d: 0,
        hoursPlayed90d: 0,
        uniqueWeeks90d: 0,
        daysRegistered: Math.floor((now - client.createdAt) / 86400000),
        spendingUSD90d: 0,
        activeReferralsCount: 0,
      },
    };
  }

  const windowStart = now - rules.rollingWindowDays * 86400000;

  // Filtrer les sessions payées des 90 derniers jours de durée >= 10 min
  const validSessions = (client.sessionsHistory || []).filter(
    (s) => s.isPaidSession && s.date >= windowStart && s.durationMinutes >= rules.minSessionMinutesForStats
  );

  const paidSessions90d = validSessions.length;
  const hoursPlayed90d = validSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
  const uniqueWeeks90d = new Set(validSessions.map((s) => s.weekNumberYear)).size;
  const daysRegistered = Math.floor((now - client.createdAt) / 86400000);
  const spendingUSD90d = validSessions.reduce((acc, s) => acc + s.amountPaidUSD, 0);

  // Filleuls actifs : filleuls ayant payé >= 2 sessions
  const activeReferrals = allClients.filter(
    (other) => other.referredById === client.id && (other.sessionsHistory || []).filter(s => s.isPaidSession).length >= 2
  );
  const activeReferralsCount = activeReferrals.length;

  // 1. Évaluation condition Fidèle
  const meetsFidele =
    paidSessions90d >= rules.fideleMinSessions &&
    hoursPlayed90d >= rules.fideleMinHours &&
    uniqueWeeks90d >= rules.fideleMinWeeks &&
    daysRegistered >= rules.fideleMinDaysRegistered;

  // 2. Évaluation condition VIP (Fidèle + au moins 1 voie)
  const meetsVIPPaths =
    hoursPlayed90d >= rules.vipHoursThreshold ||
    spendingUSD90d >= rules.vipSpendingThresholdUSD ||
    activeReferralsCount >= rules.vipActiveReferralsThreshold;

  const meetsVIP = meetsFidele && meetsVIPPaths;

  // 3. Évaluation Régulier
  const meetsRegulier = paidSessions90d >= rules.regMinSessions;

  // Déterminer le rang théorique calculé
  let calculatedTier: LoyaltyTier = 'NOUVEAU';
  if (meetsVIP) {
    calculatedTier = 'VIP';
  } else if (meetsFidele) {
    calculatedTier = 'FIDELE';
  } else if (meetsRegulier) {
    calculatedTier = 'REGULIER';
  }

  // Détection Promotion / Rétrogradation & Période de grâce
  const tierOrder: Record<LoyaltyTier, number> = {
    NOUVEAU: 0,
    REGULIER: 1,
    FIDELE: 2,
    VIP: 3,
  };

  const currentOrder = tierOrder[client.tier];
  const calculatedOrder = tierOrder[calculatedTier];

  let isPromoted = false;
  let isDemoted = false;
  let inGracePeriod = false;
  let gracePeriodDaysRemaining: number | undefined = undefined;

  if (calculatedOrder > currentOrder) {
    isPromoted = true;
  } else if (calculatedOrder < currentOrder) {
    // Si le client avait un statut élevé (Fidèle ou VIP), appliquer la période de grâce de 30 jours
    if (client.tier === 'VIP' || client.tier === 'FIDELE') {
      const graceEnd = client.tierGracePeriodExpiresAt || (now + rules.gracePeriodDays * 86400000);
      if (now < graceEnd) {
        inGracePeriod = true;
        gracePeriodDaysRemaining = Math.max(0, Math.ceil((graceEnd - now) / 86400000));
      } else {
        isDemoted = true;
      }
    } else {
      isDemoted = true;
    }
  }

  // 4. Calcul de progression vers le palier supérieur & critères manquants
  let nextTier: LoyaltyTier | undefined = undefined;
  const missingCriteria: string[] = [];
  let progressPercent = 100;

  if (client.tier === 'NOUVEAU') {
    nextTier = 'REGULIER';
    const sessionProgress = Math.min(1, paidSessions90d / rules.regMinSessions);
    progressPercent = Math.round(sessionProgress * 100);
    if (paidSessions90d < rules.regMinSessions) {
      missingCriteria.push(`Encore ${rules.regMinSessions - paidSessions90d} session(s) payée(s)`);
    }
  } else if (client.tier === 'REGULIER') {
    nextTier = 'FIDELE';
    const pSessions = Math.min(1, paidSessions90d / rules.fideleMinSessions);
    const pHours = Math.min(1, hoursPlayed90d / rules.fideleMinHours);
    const pWeeks = Math.min(1, uniqueWeeks90d / rules.fideleMinWeeks);
    const pDays = Math.min(1, daysRegistered / rules.fideleMinDaysRegistered);

    progressPercent = Math.round(((pSessions + pHours + pWeeks + pDays) / 4) * 100);

    if (paidSessions90d < rules.fideleMinSessions) {
      missingCriteria.push(`Encore ${rules.fideleMinSessions - paidSessions90d} session(s) payée(s)`);
    }
    if (hoursPlayed90d < rules.fideleMinHours) {
      missingCriteria.push(`Encore ${(rules.fideleMinHours - hoursPlayed90d).toFixed(1)}h de jeu sur 90j`);
    }
    if (uniqueWeeks90d < rules.fideleMinWeeks) {
      missingCriteria.push(`Présence requise sur ${rules.fideleMinWeeks - uniqueWeeks90d} semaine(s) distincte(s)`);
    }
    if (daysRegistered < rules.fideleMinDaysRegistered) {
      missingCriteria.push(`Ancienneté requise : ${rules.fideleMinDaysRegistered - daysRegistered} jour(s) restants`);
    }
  } else if (client.tier === 'FIDELE') {
    nextTier = 'VIP';
    // 3 voies alternatives pour le VIP
    const pVoieHours = Math.min(1, hoursPlayed90d / rules.vipHoursThreshold);
    const pVoieSpend = Math.min(1, spendingUSD90d / rules.vipSpendingThresholdUSD);
    const pVoieReferrals = Math.min(1, activeReferralsCount / rules.vipActiveReferralsThreshold);

    const bestVoieProgress = Math.max(pVoieHours, pVoieSpend, pVoieReferrals);
    progressPercent = Math.round(bestVoieProgress * 100);

    missingCriteria.push(
      `Pour devenir VIP, complétez au choix :`
    );
    missingCriteria.push(
      `• Voie Temps : ${(rules.vipHoursThreshold - hoursPlayed90d).toFixed(1)}h de jeu restantes (Actuel: ${hoursPlayed90d.toFixed(1)}h / ${rules.vipHoursThreshold}h)`
    );
    missingCriteria.push(
      `• Voie Dépenses : $${Math.max(0, rules.vipSpendingThresholdUSD - spendingUSD90d).toFixed(2)} restants (Actuel: $${spendingUSD90d.toFixed(2)} / $${rules.vipSpendingThresholdUSD})`
    );
    missingCriteria.push(
      `• Voie Parrainage : ${Math.max(0, rules.vipActiveReferralsThreshold - activeReferralsCount)} filleul(s) actif(s) supplémentaire(s) (Actuel: ${activeReferralsCount} / ${rules.vipActiveReferralsThreshold})`
    );
  }

  const isCloseToPromotion = progressPercent >= 90 && progressPercent < 100;

  return {
    currentTier: inGracePeriod ? client.tier : isDemoted ? calculatedTier : isPromoted ? calculatedTier : client.tier,
    calculatedTier,
    isPromoted,
    isDemoted,
    inGracePeriod,
    gracePeriodDaysRemaining,
    progressPercent: Math.min(100, progressPercent),
    nextTier,
    missingCriteria,
    isCloseToPromotion,
    stats: {
      paidSessions90d,
      hoursPlayed90d,
      uniqueWeeks90d,
      daysRegistered,
      spendingUSD90d,
      activeReferralsCount,
    },
  };
}

/**
 * Utilitaire pour formater la clé de semaine ISO d'une date (ex: "2026-W45")
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}
