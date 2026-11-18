import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Zap,
  Sparkles,
  Percent,
  Tag,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Station,
  PricingPlan,
  Client,
  PaymentMethod,
  Ticket,
  TierRulesConfig,
  SystemSettings,
  MixedPaymentBreakdown,
} from '../types';
import { DEFAULT_TIER_RULES } from '../services/tierEngine';
import { computeDynamicTicketPrice, isPromotionEligible } from '../services/pricingEngine';
import { getConsoleLabel, getFallbackBaseType, isHighTierConsole } from '../services/consoleCatalog';
import {
  MINIMUM_REGISTRATION_TICKET_MINUTES,
  normalizeReferralCodeInput,
  isValidReferralCodeFormat,
  phonesMatch,
  normalizePhoneDigits,
} from '../services/referralCode';

export interface NewClientTicketRegistration {
  fullName: string;
  phone: string;
  email?: string;
  sponsorCode?: string;
}

interface FastTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: Station | null;
  allStations: Station[];
  pricingPlans: PricingPlan[];
  clients: Client[];
  tierRules?: TierRulesConfig;
  settings?: SystemSettings;
  exchangeRate: number;
  cashierName: string;
  cashierId?: string;
  onConfirmTicket: (
    ticket: Ticket,
    selectedClient?: Client,
    payWithPoints?: boolean,
    newClientRegistration?: NewClientTicketRegistration
  ) => void;
}

type MixedElecChannel = 'NONE' | 'ILLICO_CASH' | 'MPESA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY';

export const FastTicketModal: React.FC<FastTicketModalProps> = ({
  isOpen,
  onClose,
  station,
  allStations,
  pricingPlans,
  clients,
  tierRules = DEFAULT_TIER_RULES,
  settings,
  exchangeRate,
  cashierName,
  cashierId,
  onConfirmTicket,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<number>(station?.id || 1);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [anonymousName, setAnonymousName] = useState<string>('Client de passage');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_CDF');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState<string>('+243 ');
  const [cashReceivedCDF, setCashReceivedCDF] = useState<string>('');
  const [cashReceivedUSD, setCashReceivedUSD] = useState<string>('');

  // Code Promo
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Paiement mixte multi-canaux (Espèces CDF + Espèces USD + Électronique)
  const [mixedCashCDF, setMixedCashCDF] = useState<string>('0');
  const [mixedCashUSD, setMixedCashUSD] = useState<string>('0');
  const [mixedElecChannel, setMixedElecChannel] = useState<MixedElecChannel>('ILLICO_CASH');
  const [mixedElecCDF, setMixedElecCDF] = useState<string>('0');

  const [validationError, setValidationError] = useState<string>('');

  // Inscription nouveau client directe (éligible uniquement pour ticket >= 3H / 180 min)
  const [registerNewClient, setRegisterNewClient] = useState<boolean>(false);
  const [regFullName, setRegFullName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('+243 ');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regSponsorCode, setRegSponsorCode] = useState<string>('');

  useEffect(() => {
    if (station) {
      setSelectedStationId(station.id);
    }
  }, [station]);

  useEffect(() => {
    if (isOpen) {
      setValidationError('');
      setPromoFeedback(null);
      setRegisterNewClient(false);
      setRegFullName('');
      setRegPhone('+243 ');
      setRegEmail('');
      setRegSponsorCode('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDuration < MINIMUM_REGISTRATION_TICKET_MINUTES || !isAnonymous) {
      setRegisterNewClient(false);
    }
  }, [selectedDuration, isAnonymous]);

  if (!isOpen) return null;

  const currentStation = allStations.find((s) => s.id === selectedStationId) || station || allStations[0];
  const stationType = currentStation.type;

  const exactPlans = pricingPlans.filter((p) => p.stationType === stationType && p.enabled !== false);
  const fallbackBase = getFallbackBaseType(stationType);
  const availablePlans =
    exactPlans.length > 0
      ? exactPlans
      : pricingPlans.filter((p) => p.stationType === fallbackBase && p.enabled !== false);
  const currentPlan = availablePlans.find((p) => p.durationMinutes === selectedDuration) || availablePlans[0];

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientTier = (!isAnonymous && selectedClient?.tier) || 'NOUVEAU';
  const tierPerk = tierRules.perks[clientTier];
  const tierDiscountPercent = !isAnonymous && selectedClient ? tierPerk.discountPercent : 0;

  const activePromos = (settings?.promotions || []).filter((p) => p.isActive);
  const activePromoObj = appliedPromoCode
    ? (settings?.promotions || []).find((p) => p.code.toUpperCase() === appliedPromoCode.toUpperCase()) || null
    : null;

  const promoEligibility = activePromoObj
    ? isPromotionEligible(activePromoObj, stationType, clientTier)
    : { valid: false };

  const validPromo = activePromoObj && promoEligibility.valid ? activePromoObj : null;

  const pricing = computeDynamicTicketPrice({
    plan: currentPlan,
    stationId: currentStation.id,
    stationType,
    settings,
    exchangeRate,
    tierDiscountPercent,
    promo: validPromo,
  });

  const baseAmountCDF = pricing.afterTimeSlotCDF;
  const discountAmountCDF = pricing.totalDiscountCDF;
  const finalAmountCDF = pricing.finalCDF;
  const finalAmountUSD = pricing.finalUSD;
  const discountAmountUSD = discountAmountCDF / (exchangeRate || 2800);
  const effectiveDiscountPercent =
    baseAmountCDF > 0 ? Math.round((discountAmountCDF / baseAmountCDF) * 100) : 0;

  const basePoints15m = isHighTierConsole(stationType)
    ? (settings?.pointsToMinutesPS5 ?? 150)
    : (settings?.pointsToMinutesPS4 ?? 100);
  const pointsCost = Math.round((selectedDuration / 15) * basePoints15m);

  // Rendu monnaie simple
  const cashRcvdCDFNum = parseFloat(cashReceivedCDF) || 0;
  const changeCDF = Math.max(0, cashRcvdCDFNum - finalAmountCDF);

  const cashRcvdUSDNum = parseFloat(cashReceivedUSD) || 0;
  const changeUSD = Math.max(0, cashRcvdUSDNum - finalAmountUSD);

  // Calculs Paiement Mixte Multi-Canaux
  const mCashCDFNum = Math.max(0, parseFloat(mixedCashCDF) || 0);
  const mCashUSDNum = Math.max(0, parseFloat(mixedCashUSD) || 0);
  const mElecCDFNum = mixedElecChannel === 'NONE' ? 0 : Math.max(0, parseFloat(mixedElecCDF) || 0);
  const mixedTotalEquivCDF = Math.round(mCashCDFNum + mCashUSDNum * exchangeRate + mElecCDFNum);
  const mixedBalanceCDF = finalAmountCDF - mixedTotalEquivCDF;

  const handleApplyPromoCode = (codeToApply?: string) => {
    const rawCode = (codeToApply ?? promoInput).trim().toUpperCase();
    if (!rawCode) {
      setAppliedPromoCode(null);
      setPromoFeedback(null);
      return;
    }

    const found = (settings?.promotions || []).find((p) => p.code.toUpperCase() === rawCode);
    if (!found) {
      setPromoFeedback({ type: 'err', msg: `Code promo "${rawCode}" introuvable.` });
      return;
    }
    const elig = isPromotionEligible(found, stationType, clientTier);
    if (!elig.valid) {
      setPromoFeedback({ type: 'err', msg: elig.reason || 'Code promo non éligible.' });
      return;
    }

    setPromoInput(found.code);
    setAppliedPromoCode(found.code);
    setPromoFeedback({
      type: 'ok',
      msg: `Promo ${found.code} appliquée (${found.discountValue}${found.discountType === 'PERCENT' ? '%' : found.discountType === 'FIXED_USD' ? '$' : ' FC'})`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (paymentMethod === 'ILLICO_CASH' && !paymentReference.trim()) {
      setValidationError('La référence de transaction Illico Cash est obligatoire pour valider le ticket.');
      return;
    }

    if (
      (paymentMethod === 'MPESA' || paymentMethod === 'ORANGE_MONEY' || paymentMethod === 'AIRTEL_MONEY') &&
      !paymentReference.trim()
    ) {
      setValidationError(`La référence de transaction ${paymentMethod} est obligatoire.`);
      return;
    }

    let mixedBreakdownPayload: MixedPaymentBreakdown | undefined;
    if (paymentMethod === 'MIXED') {
      if (mElecCDFNum > 0 && mixedElecChannel !== 'NONE' && !paymentReference.trim()) {
        setValidationError(`La référence de transaction (${mixedElecChannel}) est obligatoire dès qu'une part électronique est saisie.`);
        return;
      }
      if (mixedTotalEquivCDF < finalAmountCDF) {
        setValidationError(
          `Le total mixte (${mixedTotalEquivCDF.toLocaleString()} FC équiv.) est inférieur au montant dû (${finalAmountCDF.toLocaleString()} FC).`
        );
        return;
      }
      if (mCashCDFNum <= 0 && mCashUSDNum <= 0 && mElecCDFNum <= 0) {
        setValidationError('Saisissez au moins deux montants pour un paiement mixte.');
        return;
      }

      const cleanPhone = payerPhone.trim() !== '+243' ? payerPhone.trim() : undefined;
      mixedBreakdownPayload = {
        cashCDF: mCashCDFNum > 0 ? mCashCDFNum : undefined,
        cashUSD: mCashUSDNum > 0 ? mCashUSDNum : undefined,
      };
      if (mElecCDFNum > 0 && mixedElecChannel === 'ILLICO_CASH') {
        mixedBreakdownPayload.illicoCashCDF = mElecCDFNum;
        mixedBreakdownPayload.illicoCashUSD = Number((mElecCDFNum / (exchangeRate || 2800)).toFixed(2));
        mixedBreakdownPayload.illicoCashRef = paymentReference.trim();
        mixedBreakdownPayload.illicoCashPayerPhone = cleanPhone;
      } else if (
        mElecCDFNum > 0 &&
        (mixedElecChannel === 'MPESA' || mixedElecChannel === 'ORANGE_MONEY' || mixedElecChannel === 'AIRTEL_MONEY')
      ) {
        mixedBreakdownPayload.momoCDF = mElecCDFNum;
        mixedBreakdownPayload.momoUSD = Number((mElecCDFNum / (exchangeRate || 2800)).toFixed(2));
        mixedBreakdownPayload.momoProvider = mixedElecChannel;
        mixedBreakdownPayload.momoRef = paymentReference.trim();
      }
    }

    let newClientRegistration: NewClientTicketRegistration | undefined;
    if (isAnonymous && registerNewClient) {
      if (selectedDuration < MINIMUM_REGISTRATION_TICKET_MINUTES) {
        setValidationError(
          "L'inscription d'un nouveau client requiert obligatoirement un ticket de 3H (180 min) minimum."
        );
        return;
      }
      if (regFullName.trim().length < 2) {
        setValidationError('Veuillez saisir le nom complet du client à enregistrer.');
        return;
      }
      if (normalizePhoneDigits(regPhone).length < 8) {
        setValidationError('Veuillez saisir un numéro WhatsApp valide (minimum 8 chiffres) pour recevoir le message de bienvenue.');
        return;
      }
      if (clients.some((c) => phonesMatch(c.phone, regPhone))) {
        setValidationError('Ce numéro est déjà enregistré. Sélectionnez le client dans "Fidélisé".');
        return;
      }
      const cleanSponsor = regSponsorCode.trim().toUpperCase();
      if (cleanSponsor) {
        if (!isValidReferralCodeFormat(cleanSponsor)) {
          setValidationError('Le code parrain doit contenir maximum 5 caractères (lettres et chiffres uniquement).');
          return;
        }
        const sponsorExists = clients.some((c) => c.referralCode.toUpperCase() === cleanSponsor);
        if (!sponsorExists) {
          setValidationError(`Code parrain "${cleanSponsor}" introuvable dans la base.`);
          return;
        }
      }
      newClientRegistration = {
        fullName: regFullName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim() || undefined,
        sponsorCode: cleanSponsor || undefined,
      };
    }

    const clientName = newClientRegistration
      ? newClientRegistration.fullName
      : isAnonymous
      ? anonymousName || 'Client de passage'
      : selectedClient?.fullName || 'Joueur';
    const clientPhone = newClientRegistration
      ? newClientRegistration.phone
      : isAnonymous
      ? payerPhone.trim() !== '+243'
        ? payerPhone.trim()
        : undefined
      : selectedClient?.phone;

    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const signedToken = `kgh_${Date.now().toString(36)}_${randomHex}`;

    const newTicket: Ticket = {
      id: 'tick-' + Date.now().toString(36),
      ticketNumber: `TICK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      signedToken,
      stationId: currentStation.id,
      stationName: currentStation.name,
      stationType: currentStation.type,
      clientName,
      clientPhone,
      clientId: isAnonymous ? undefined : selectedClient?.id,
      durationMinutes: selectedDuration,
      startTime: Date.now(),
      endTime: Date.now() + selectedDuration * 60000,
      amountCDF: finalAmountCDF,
      amountUSD: finalAmountUSD,
      discountCDF: discountAmountCDF > 0 ? discountAmountCDF : undefined,
      discountUSD: discountAmountUSD > 0 ? discountAmountUSD : undefined,
      appliedDiscountPercent: effectiveDiscountPercent > 0 ? effectiveDiscountPercent : undefined,
      appliedTimeSlotLabel: pricing.timeSlot.rule ? pricing.timeSlot.label : undefined,
      appliedTimeSlotPercent: pricing.timeSlot.rule ? pricing.timeSlot.percentDelta : undefined,
      appliedPromoCode: validPromo ? validPromo.code : undefined,
      appliedPromoDiscountCDF: pricing.promoDiscountCDF > 0 ? pricing.promoDiscountCDF : undefined,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      payerPhone: newClientRegistration?.phone || (payerPhone.trim() && payerPhone.trim() !== '+243' ? payerPhone.trim() : undefined),
      mixedBreakdown: mixedBreakdownPayload,
      cashReceivedCDF: paymentMethod === 'CASH_CDF' ? cashRcvdCDFNum || finalAmountCDF : undefined,
      cashReceivedUSD: paymentMethod === 'CASH_USD' ? cashRcvdUSDNum || finalAmountUSD : undefined,
      changeGivenCDF: paymentMethod === 'CASH_CDF' ? changeCDF : undefined,
      changeGivenUSD: paymentMethod === 'CASH_USD' ? changeUSD : undefined,
      cashierName,
      cashierId,
      status: 'active',
      createdAt: Date.now(),
      extendedCount: 0,
      appliedExchangeRate: exchangeRate,
      pricingPlanSnapshot: {
        label: currentPlan?.label || `${selectedDuration} min`,
        priceUSD: Number((baseAmountCDF / exchangeRate).toFixed(2)),
        priceCDF: baseAmountCDF,
      },
    };

    onConfirmTicket(
      newTicket,
      isAnonymous ? undefined : selectedClient,
      paymentMethod === 'LOYALTY_POINTS',
      newClientRegistration
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* En-tête Modal */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Nouveau Ticket Express</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-semibold">
                  &lt; 15s
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {currentStation.name || `Poste ${currentStation.id}`} ({getConsoleLabel(currentStation.type)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badge Tranche Horaire Active + Remplissage Express */}
        <div className="bg-blue-950/40 border-b border-blue-900/50 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {pricing.timeSlot.rule ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                  pricing.timeSlot.percentDelta < 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>
                  {pricing.timeSlot.label} ({pricing.timeSlot.percentDelta > 0 ? `+${pricing.timeSlot.percentDelta}%` : `${pricing.timeSlot.percentDelta}%`})
                </span>
              </span>
            ) : (
              <span className="text-blue-300 flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Remplissage rapide :</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedDuration(60);
                setIsAnonymous(false);
                if (clients.length > 0) setSelectedClientId(clients[0].id);
                setPaymentMethod('CASH_CDF');
                setCashReceivedCDF('8000');
              }}
              className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-200 hover:text-white transition font-mono text-[10px]"
            >
              1h VIP
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDuration(30);
                setIsAnonymous(false);
                if (clients.length > 1) setSelectedClientId(clients[1].id);
                setPaymentMethod('CASH_USD');
                setCashReceivedUSD('2');
              }}
              className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white transition font-mono text-[10px]"
            >
              30m Fidèle
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDuration(60);
                setIsAnonymous(true);
                setAnonymousName('Client de passage');
                setPaymentMethod('CASH_CDF');
                setCashReceivedCDF('5000');
              }}
              className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white transition font-mono text-[10px]"
            >
              Anonyme 1h
            </button>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Étape 1 : Choix de la Durée */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>1. Durée achetée</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Tarif {currentStation.type} {pricing.timeSlot.rule ? `· ${pricing.timeSlot.label}` : ''}
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {availablePlans.map((plan) => {
                const isSelected = selectedDuration === plan.durationMinutes;
                const planPrice = computeDynamicTicketPrice({
                  plan,
                  stationId: currentStation.id,
                  stationType,
                  settings,
                  exchangeRate,
                  tierDiscountPercent: 0,
                });
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedDuration(plan.durationMinutes)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">
                      {plan.durationMinutes >= 60 ? `${plan.durationMinutes / 60}h` : `${plan.durationMinutes}m`}
                    </div>
                    <div className="text-[10px] font-mono font-semibold opacity-90 text-emerald-300">
                      {planPrice.afterTimeSlotCDF.toLocaleString()} FC
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Étape 2 : Type de Client & Code Promo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>2. Client & Promotions</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnonymous(true)}
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold transition ${
                    isAnonymous ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Anonyme
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnonymous(false)}
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold transition ${
                    !isAnonymous ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fidélisé (Points & Rang)
                </button>
              </div>
            </div>

            {isAnonymous ? (
              <div className="space-y-2.5">
                {!registerNewClient && (
                  <input
                    type="text"
                    value={anonymousName}
                    onChange={(e) => setAnonymousName(e.target.value)}
                    placeholder="Nom du joueur ou surnom (optionnel)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                )}

                {selectedDuration >= MINIMUM_REGISTRATION_TICKET_MINUTES ? (
                  <div className="bg-emerald-950/25 border border-emerald-500/40 rounded-xl p-3 space-y-2.5">
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-emerald-300 block">
                          Inscrire ce nouveau client dans le système (Ticket 3H+ éligible)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Génère un code parrain unique (5 car.) &amp; envoie ses coordonnées Espace Client sur WhatsApp
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={registerNewClient}
                        onChange={(e) => setRegisterNewClient(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                      />
                    </label>

                    {registerNewClient && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">Nom complet *</label>
                          <input
                            type="text"
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            placeholder="Ex: Corneille Vumongo"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">Téléphone WhatsApp * (RDC)</label>
                          <input
                            type="text"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="+243 89 000 0000"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">Email (optionnel)</label>
                          <input
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="joueur@gmail.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">Code Parrain (max 5 car.)</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={regSponsorCode}
                            onChange={(e) => setRegSponsorCode(normalizeReferralCodeInput(e.target.value))}
                            placeholder="Ex: GL243"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono uppercase text-xs focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/70 text-[11px] text-slate-400">
                    Condition d&apos;inscription : un nouveau joueur ne peut être enregistré qu&apos;à l&apos;achat d&apos;un ticket de <strong className="text-slate-200">3H (180 min)</strong> minimum.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  required={!isAnonymous}
                >
                  <option value="">-- Choisir un client régulier --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone}) — {c.tier} ({c.loyaltyPoints} pts)
                    </option>
                  ))}
                </select>

                {selectedClient && (
                  <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Statut :</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            selectedClient.tier === 'VIP'
                              ? 'bg-amber-400 text-slate-950'
                              : selectedClient.tier === 'FIDELE'
                              ? 'bg-slate-300 text-slate-900'
                              : selectedClient.tier === 'REGULIER'
                              ? 'bg-slate-600 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {selectedClient.tier}
                        </span>
                        {tierDiscountPercent > 0 && (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Percent className="w-3 h-3" />-{tierDiscountPercent}% rang
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-amber-400 font-bold">{selectedClient.loyaltyPoints} pts</div>
                    </div>

                    {selectedClient.loyaltyPoints >= pointsCost && (
                      <div className="pt-1 border-t border-slate-700/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Points suffisants pour gratuité :</span>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('LOYALTY_POINTS')}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-1 rounded border border-amber-500/40 hover:bg-amber-500/30 transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          Payer avec {pointsCost} pts
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Code Promo */}
            <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Code Promo :</span>
                </span>
                <div className="flex items-center gap-1.5 flex-1 max-w-[260px]">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Ex: HAPPY243"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white uppercase focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromoCode()}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[11px] shrink-0 cursor-pointer"
                  >
                    Appliquer
                  </button>
                  {appliedPromoCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setPromoInput('');
                        setAppliedPromoCode(null);
                        setPromoFeedback(null);
                      }}
                      className="px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {activePromos.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Promos actives :</span>
                  {activePromos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPromoCode(p.code)}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] border transition cursor-pointer ${
                        appliedPromoCode === p.code
                          ? 'bg-purple-600 border-purple-400 text-white font-bold'
                          : 'bg-slate-900 border-slate-700 text-purple-300 hover:border-purple-500'
                      }`}
                    >
                      {p.code} (-{p.discountValue}
                      {p.discountType === 'PERCENT' ? '%' : p.discountType === 'FIXED_USD' ? '$' : ' FC'})
                    </button>
                  ))}
                </div>
              )}

              {promoFeedback && (
                <div
                  className={`flex items-center gap-1.5 text-[11px] ${
                    promoFeedback.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {promoFeedback.type === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{promoFeedback.msg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Étape 3 : Montant & Mode de Paiement */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>3. Règlement</span>
              <div className="text-right">
                {discountAmountCDF > 0 && (
                  <span className="text-slate-500 line-through text-xs mr-2 font-mono">
                    {baseAmountCDF.toLocaleString()} FC
                  </span>
                )}
                <span className="text-base font-bold font-mono text-emerald-400">
                  {finalAmountCDF.toLocaleString()} FC
                </span>
                <span className="text-slate-400 font-mono text-xs ml-1.5">(${finalAmountUSD.toFixed(2)})</span>
              </div>
            </label>

            {validationError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium">
                {validationError}
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="fast-ticket-payment-method" className="text-[11px] text-slate-400 block mb-1">
                Choisir le moyen de paiement :
              </label>
              <select
                id="fast-ticket-payment-method"
                value={paymentMethod}
                onChange={(e) => {
                  const nextMethod = e.target.value as PaymentMethod;
                  setPaymentMethod(nextMethod);
                  setValidationError('');
                  if (nextMethod === 'MIXED') {
                    const half = Math.round(finalAmountCDF / 2);
                    setMixedCashCDF(String(half));
                    setMixedCashUSD('0');
                    setMixedElecChannel('ILLICO_CASH');
                    setMixedElecCDF(String(Math.max(0, finalAmountCDF - half)));
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm sm:text-xs font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="CASH_CDF">Espèces Francs (FC)</option>
                <option value="CASH_USD">Espèces Dollars (USD $)</option>
                <option value="MPESA">Mobile Money — M-Pesa (Vodacom)</option>
                <option value="ORANGE_MONEY">Mobile Money — Orange Money</option>
                <option value="AIRTEL_MONEY">Mobile Money — Airtel Money</option>
                <option value="ILLICO_CASH">Illico Cash (Rawbank)</option>
                <option value="MIXED">Paiement Mixte (Multi-canaux)</option>
                <option
                  value="LOYALTY_POINTS"
                  disabled={!selectedClient || selectedClient.loyaltyPoints < pointsCost}
                >
                  Points Fidélité ({pointsCost} pts requis{!selectedClient ? ' — choisir un client' : ''})
                </option>
              </select>
            </div>

            {paymentMethod === 'ILLICO_CASH' && (
              <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                  <span className="font-bold text-amber-300">Paiement Illico Cash (Rawbank)</span>
                  <span className="text-[10px] text-amber-400/80 font-mono">Validation par référence</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Référence transaction * <span className="text-rose-400">(obligatoire)</span>
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Ex: ILC-84910293"
                      className="w-full bg-slate-900 border border-amber-500/50 rounded px-2.5 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Numéro Payeur</label>
                    <input
                      type="text"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="+243 89 000 0000"
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Paiement Mixte Multi-Canaux (Cash CDF + Cash USD + Illico / Mobile Money) */}
            {paymentMethod === 'MIXED' && (
              <div className="bg-purple-950/20 border border-purple-500/40 p-3 rounded-xl space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-purple-500/20">
                  <span className="font-bold text-purple-300">Paiement Mixte Multi-Devises & Mobile</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(finalAmountCDF / 2);
                        setMixedCashCDF(String(half));
                        setMixedCashUSD('0');
                        if (mixedElecChannel === 'NONE') setMixedElecChannel('ILLICO_CASH');
                        setMixedElecCDF(String(Math.max(0, finalAmountCDF - half)));
                      }}
                      className="px-1.5 py-0.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 rounded text-[10px] font-mono"
                    >
                      50/50 Cash+Élec
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMixedCashUSD('1');
                        setMixedElecChannel('NONE');
                        setMixedElecCDF('0');
                        setMixedCashCDF(String(Math.max(0, finalAmountCDF - exchangeRate)));
                      }}
                      className="px-1.5 py-0.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 rounded text-[10px] font-mono"
                    >
                      $1 + Solde FC
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Espèces CDF (FC) :</label>
                    <input
                      type="number"
                      min="0"
                      value={mixedCashCDF}
                      onChange={(e) => setMixedCashCDF(e.target.value)}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Espèces USD ($) :</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={mixedCashUSD}
                      onChange={(e) => setMixedCashUSD(e.target.value)}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Complément Électronique :</label>
                    <select
                      value={mixedElecChannel}
                      onChange={(e) => setMixedElecChannel(e.target.value as MixedElecChannel)}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-400"
                    >
                      <option value="NONE">Aucun (Espèces FC + $ uniquement)</option>
                      <option value="ILLICO_CASH">Illico Cash (Rawbank)</option>
                      <option value="MPESA">M-Pesa (Vodacom)</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="AIRTEL_MONEY">Airtel Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Part Électronique (FC) :</label>
                    <input
                      type="number"
                      min="0"
                      disabled={mixedElecChannel === 'NONE'}
                      value={mixedElecChannel === 'NONE' ? '0' : mixedElecCDF}
                      onChange={(e) => setMixedElecCDF(e.target.value)}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1.5 text-white font-mono font-bold text-xs disabled:opacity-40 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                {mixedElecChannel !== 'NONE' && mElecCDFNum > 0 && (
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Référence {mixedElecChannel} * <span className="text-rose-400">(obligatoire)</span>
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Ex: ILC-99238411 / MP-88210"
                      className="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-purple-500/20 font-mono text-[11px]">
                  <span className="text-slate-300">
                    Total saisi : <strong className="text-white">{mixedTotalEquivCDF.toLocaleString()} FC</strong>
                  </span>
                  {mixedBalanceCDF > 0 ? (
                    <span className="text-rose-400 font-bold">Reste dû : {mixedBalanceCDF.toLocaleString()} FC</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">
                      Couvert {mixedBalanceCDF < 0 ? `(Surplus ${Math.abs(mixedBalanceCDF).toLocaleString()} FC)` : '✓'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'CASH_CDF' && (
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Montant reçu (FC) :</span>
                  <input
                    type="number"
                    value={cashReceivedCDF}
                    onChange={(e) => setCashReceivedCDF(e.target.value)}
                    placeholder={finalAmountCDF.toString()}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Monnaie à rendre :</span>
                  <div className="h-9 flex items-center font-mono font-bold text-base text-amber-400">
                    {changeCDF.toLocaleString()} FC
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'CASH_USD' && (
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Montant reçu ($) :</span>
                  <input
                    type="number"
                    step="0.5"
                    value={cashReceivedUSD}
                    onChange={(e) => setCashReceivedUSD(e.target.value)}
                    placeholder={finalAmountUSD.toFixed(2)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Monnaie à rendre ($) :</span>
                  <div className="h-9 flex items-center font-mono font-bold text-base text-amber-400">
                    ${changeUSD.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {(paymentMethod === 'MPESA' || paymentMethod === 'ORANGE_MONEY' || paymentMethod === 'AIRTEL_MONEY') && (
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400 block mb-1">Référence de transaction {paymentMethod} * :</span>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ex: MP-89241088 ou code SMS de transaction"
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {paymentMethod === 'LOYALTY_POINTS' && (
              <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Paiement en Points Fidélité</span>
                  </div>
                  <span className="font-mono font-black text-amber-300 text-sm">{pointsCost} pts</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Solde joueur actuel :</span>
                    <span className="font-bold font-mono text-white">{selectedClient?.loyaltyPoints || 0} pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Solde après session :</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {Math.max(0, (selectedClient?.loyaltyPoints || 0) - pointsCost)} pts
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-400/80 font-mono">
                  Règle appliquée : {stationType} · {basePoints15m} pts / 15 min (Durée : {selectedDuration} min = {pointsCost} pts).
                </p>
              </div>
            )}
          </div>

          {/* Bouton d'action principal */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Valider & Allumer le Poste {currentStation.id}</span>
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Le caissier connecté ({cashierName}) valide ce ticket. La prise connectée s&apos;enclenche immédiatement.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

