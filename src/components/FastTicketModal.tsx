import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Zap,
  Sparkles,
  Award,
  Crown,
  Percent
} from 'lucide-react';
import { Station, PricingPlan, Client, PaymentMethod, Ticket, TierRulesConfig, SystemSettings } from '../types';
import { DEFAULT_TIER_RULES } from '../services/tierEngine';

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
  onConfirmTicket: (ticket: Ticket, selectedClient?: Client, payWithPoints?: boolean) => void;
}

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
  const [selectedDuration, setSelectedDuration] = useState<number>(30); // 30 min par défaut
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [anonymousName, setAnonymousName] = useState<string>('Client de passage');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_CDF');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState<string>('+243 ');
  const [cashReceivedCDF, setCashReceivedCDF] = useState<string>('');
  const [cashReceivedUSD, setCashReceivedUSD] = useState<string>('');

  // Paiement mixte (ex. une partie Espèces, une partie Illico Cash)
  const [mixedCashCDF, setMixedCashCDF] = useState<string>('');
  const [mixedIllicoCDF, setMixedIllicoCDF] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (station) {
      setSelectedStationId(station.id);
    }
  }, [station]);

  if (!isOpen) return null;

  const currentStation = allStations.find(s => s.id === selectedStationId) || station || allStations[0];
  const stationType = currentStation.type;

  // Filtrer les tarifs par type de console (PS4 ou PS5) et respecter les activations
  const availablePlans = pricingPlans.filter(p => p.stationType === stationType && p.enabled !== false);
  const currentPlan = availablePlans.find(p => p.durationMinutes === selectedDuration) || availablePlans[0];
  const roundingRule = settings?.cdfRoundingRule || 100;
  const stationOverride = settings?.stationSpecificOverrides?.[currentStation.id];
  const stationMultiplier = stationOverride?.priceMultiplier && stationOverride.priceMultiplier > 0 ? stationOverride.priceMultiplier : 1;

  const computePlanCDF = (plan?: PricingPlan) => {
    if (!plan) return 3000;
    const rawCDF = plan.priceUSD > 0 ? plan.priceUSD * exchangeRate : plan.priceCDF;
    const multiplied = rawCDF * stationMultiplier;
    return Math.max(100, Math.round(multiplied / roundingRule) * roundingRule);
  };

  const baseAmountCDF = computePlanCDF(currentPlan);
  // Section G : Équivalence des points en temps de jeu, distincte pour PS4 et PS5 (X points = 15 minutes)
  const basePoints15m = stationType === 'PS5'
    ? (settings?.pointsToMinutesPS5 ?? 150)
    : (settings?.pointsToMinutesPS4 ?? 100);
  const pointsCost = Math.round((selectedDuration / 15) * basePoints15m);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Remise selon statut client
  const clientTier = selectedClient?.tier || 'NOUVEAU';
  const tierPerk = tierRules.perks[clientTier];
  const discountPercent = !isAnonymous && selectedClient ? tierPerk.discountPercent : 0;

  const discountAmountCDF = Math.round((baseAmountCDF * discountPercent) / 100);
  const finalAmountCDF = baseAmountCDF - discountAmountCDF;
  const finalAmountUSD = finalAmountCDF / exchangeRate;
  const discountAmountUSD = discountAmountCDF / exchangeRate;

  // Rendu monnaie calculé
  const cashRcvdCDFNum = parseFloat(cashReceivedCDF) || 0;
  const changeCDF = Math.max(0, cashRcvdCDFNum - finalAmountCDF);

  const cashRcvdUSDNum = parseFloat(cashReceivedUSD) || 0;
  const changeUSD = Math.max(0, cashRcvdUSDNum - finalAmountUSD);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Règle Illico Cash : Référence obligatoire
    if (paymentMethod === 'ILLICO_CASH' && !paymentReference.trim()) {
      setValidationError('La référence de transaction Illico Cash est obligatoire pour valider le ticket.');
      return;
    }

    // Règle Mobile Money : Référence obligatoire
    if ((paymentMethod === 'MPESA' || paymentMethod === 'ORANGE_MONEY' || paymentMethod === 'AIRTEL_MONEY') && !paymentReference.trim()) {
      setValidationError(`La référence de transaction ${paymentMethod} est obligatoire.`);
      return;
    }

    // Règle Paiement Mixte
    const mCash = parseFloat(mixedCashCDF) || 0;
    const mIllico = parseFloat(mixedIllicoCDF) || 0;
    if (paymentMethod === 'MIXED') {
      if (!paymentReference.trim()) {
        setValidationError('La référence de transaction Illico Cash est obligatoire pour le paiement mixte.');
        return;
      }
      if (mCash + mIllico < finalAmountCDF) {
        setValidationError(`Le total mixte (${(mCash + mIllico).toLocaleString()} FC) est inférieur au montant dû (${finalAmountCDF.toLocaleString()} FC).`);
        return;
      }
    }

    const clientName = isAnonymous ? (anonymousName || 'Client de passage') : (selectedClient?.fullName || 'Joueur');
    const clientPhone = isAnonymous ? (payerPhone.trim() !== '+243' ? payerPhone.trim() : undefined) : selectedClient?.phone;

    // Jeton cryptographique aléatoire sécurisé (long et unique)
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, '0'))
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
      appliedDiscountPercent: discountPercent > 0 ? discountPercent : undefined,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      payerPhone: payerPhone.trim() && payerPhone.trim() !== '+243' ? payerPhone.trim() : undefined,
      mixedBreakdown: paymentMethod === 'MIXED' ? {
        cashCDF: mCash,
        illicoCashCDF: mIllico,
        illicoCashRef: paymentReference.trim(),
        illicoCashPayerPhone: payerPhone.trim(),
      } : undefined,
      cashReceivedCDF: paymentMethod === 'CASH_CDF' ? cashRcvdCDFNum || finalAmountCDF : undefined,
      cashReceivedUSD: paymentMethod === 'CASH_USD' ? cashRcvdUSDNum || finalAmountUSD : undefined,
      changeGivenCDF: paymentMethod === 'CASH_CDF' ? changeCDF : undefined,
      changeGivenUSD: paymentMethod === 'CASH_USD' ? changeUSD : undefined,
      cashierName,
      cashierId,
      status: 'active',
      createdAt: Date.now(),
      extendedCount: 0,
      // Section G : Prix et taux figés sur chaque ticket à sa création
      appliedExchangeRate: exchangeRate,
      pricingPlanSnapshot: {
        label: currentPlan?.label || `${selectedDuration} min`,
        priceUSD: Number((baseAmountCDF / exchangeRate).toFixed(2)),
        priceCDF: baseAmountCDF,
      },
    };

    onConfirmTicket(newTicket, isAnonymous ? undefined : selectedClient, paymentMethod === 'LOYALTY_POINTS');
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
              <p className="text-xs text-slate-400">Poste {currentStation.id} ({currentStation.type})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bouton Remplissage Express Automatique (Remplir à ma place) */}
        <div className="bg-blue-950/40 border-b border-blue-900/50 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-blue-300 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Remplissage automatique :</span>
          </span>
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
              1h VIP (Glody)
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
              30m Fidèle (Fally)
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
              <span className="text-[11px] text-slate-400 font-mono">Tarif {currentStation.type}</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {availablePlans.map((plan) => {
                const isSelected = selectedDuration === plan.durationMinutes;
                const planCDF = computePlanCDF(plan);
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
                      {planCDF.toLocaleString()} FC
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Étape 2 : Type de Client & Statut */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>2. Client</span>
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
              <input
                type="text"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                placeholder="Nom du joueur ou surnom (optionnel)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
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
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          selectedClient.tier === 'VIP' ? 'bg-amber-400 text-slate-950' :
                          selectedClient.tier === 'FIDELE' ? 'bg-slate-300 text-slate-900' :
                          selectedClient.tier === 'REGULIER' ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {selectedClient.tier}
                        </span>
                        {discountPercent > 0 && (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Percent className="w-3 h-3" />
                            -{discountPercent}% remise
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-amber-400 font-bold">
                        {selectedClient.loyaltyPoints} pts
                      </div>
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
                <span className="text-base font-bold font-mono text-emerald-400">{finalAmountCDF.toLocaleString()} FC</span>
                <span className="text-slate-400 font-mono text-xs ml-1.5">(${finalAmountUSD.toFixed(2)})</span>
              </div>
            </label>

            {/* Message d'erreur de validation */}
            {validationError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium">
                {validationError}
              </div>
            )}

            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[
                { id: 'CASH_CDF', label: 'Espèces FC' },
                { id: 'CASH_USD', label: 'Espèces USD ($)' },
                { id: 'ILLICO_CASH', label: 'Illico Cash' },
                { id: 'MIXED', label: 'Paiement Mixte' },
                { id: 'MPESA', label: 'M-Pesa' },
                { id: 'ORANGE_MONEY', label: 'Orange Money' },
                { id: 'AIRTEL_MONEY', label: 'Airtel Money' },
                { id: 'LOYALTY_POINTS', label: 'Points Fidélité' },
              ].map((pm) => {
                const isSelected = paymentMethod === pm.id;
                const isDisabled = pm.id === 'LOYALTY_POINTS' && (!selectedClient || selectedClient.loyaltyPoints < pointsCost);
                return (
                  <button
                    key={pm.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setPaymentMethod(pm.id as PaymentMethod);
                      setValidationError('');
                      if (pm.id === 'MIXED') {
                        setMixedCashCDF(Math.round(finalAmountCDF / 2).toString());
                        setMixedIllicoCDF(Math.round(finalAmountCDF / 2).toString());
                      }
                    }}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition ${
                      isDisabled
                        ? 'opacity-30 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500'
                        : isSelected
                        ? pm.id === 'ILLICO_CASH'
                          ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                          : pm.id === 'MIXED'
                          ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                          : 'bg-blue-600 border-blue-400 text-white shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {pm.label}
                  </button>
                );
              })}
            </div>

            {/* Illico Cash : Référence obligatoire & Numéro payeur */}
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
                <div className="text-[11px] text-amber-300/80 bg-amber-950/40 p-2 rounded border border-amber-500/20">
                  Architecture extensible prête pour passerelle webhook API Illico Cash en temps réel.
                </div>
              </div>
            )}

            {/* Paiement Mixte : Espèces + Illico Cash */}
            {paymentMethod === 'MIXED' && (
              <div className="bg-purple-950/20 border border-purple-500/40 p-3 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20">
                  <span className="font-bold text-purple-300">Paiement Mixte (Espèces + Illico Cash)</span>
                  <span className="text-[10px] text-purple-400 font-mono">Total dû: {finalAmountCDF.toLocaleString()} FC</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Part Espèces (FC) :</label>
                    <input
                      type="number"
                      value={mixedCashCDF}
                      onChange={(e) => setMixedCashCDF(e.target.value)}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Part Illico Cash (FC) :</label>
                    <input
                      type="number"
                      value={mixedIllicoCDF}
                      onChange={(e) => setMixedIllicoCDF(e.target.value)}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Référence Illico Cash * <span className="text-rose-400">(obligatoire)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ex: ILC-99238411"
                    className="w-full bg-slate-900 border border-purple-500/40 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>
              </div>
            )}

            {/* Calcul rendu monnaie */}
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

            {/* Section G : Paiement par points fidélité (équivalence PS4/PS5 paramétrée) */}
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
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Valider & Allumer le Poste {currentStation.id}</span>
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Le caissier connecté ({cashierName}) valide ce ticket. La prise connectée s'enclenche immédiatement.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
