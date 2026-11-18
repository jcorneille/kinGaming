import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Share2,
  Calendar,
  LogOut,
  AlertCircle,
  Lock,
  TrendingUp,
  Camera,
  Trash2,
  Wifi,
  Clock,
  CheckCircle2,
  CreditCard,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Ticket as TicketIcon,
  XCircle,
} from 'lucide-react';
import {
  Client,
  PaymentMethod,
  PricingPlan,
  QueueEntry,
  Reservation,
  Station,
  StationType,
  SystemSettings,
  Ticket,
  TierRulesConfig,
} from '../types';
import { evaluateClientTier, DEFAULT_TIER_RULES } from '../services/tierEngine';
import { compressProfileImage, PROFILE_IMAGE_ACCEPT } from '../utils/imageResize';
import { Pagination } from './Pagination';
import { CONSOLE_CATALOG, getConsoleLabel } from '../services/consoleCatalog';
import {
  canCancelReservationClient,
  checkReservationAvailability,
  computeLateDeduction,
  computeReservationQuote,
  evaluateReservationTimeWindow,
  getWifiMaxDevicesForDuration,
  RESERVATION_MIN_MINUTES,
} from '../services/wifiHotspotService';

export interface CreateReservationPayload {
  client?: Client;
  guestName?: string;
  guestPhone?: string;
  stationType: StationType;
  preferredStationId?: number;
  preferredStationName?: string;
  durationMinutes: number;
  reservedForTime: number;
  paymentMode: 'MOBILE_MONEY' | 'CASH' | 'PAY_ON_SITE';
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  payerPhone?: string;
  otpVerified?: boolean;
  source?: 'PORTAL' | 'GUICHET';
}

interface CustomerPortalViewProps {
  clients: Client[];
  queue: QueueEntry[];
  stations?: Station[];
  reservations?: Reservation[];
  tickets?: Ticket[];
  pricingPlans?: PricingPlan[];
  settings?: SystemSettings;
  tierRules?: TierRulesConfig;
  initialClientId?: string | null;
  onLogout: () => void;
  onClientUpdateConsent?: (clientId: string, accepted: boolean) => void;
  onClientCreatePin?: (clientId: string, newPin: string) => void;
  onClientUpdateAvatar?: (clientId: string, avatarUrl?: string) => void;
  onCreateReservation?: (payload: CreateReservationPayload) => { success: boolean; reservation?: Reservation; message?: string };
  onCancelReservation?: (reservationId: string) => { success: boolean; message: string };
}

const PAGE_SIZE = 10;

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  clients,
  queue,
  stations = [],
  reservations = [],
  tickets = [],
  pricingPlans = [],
  settings,
  tierRules = DEFAULT_TIER_RULES,
  initialClientId,
  onLogout,
  onClientCreatePin,
  onClientUpdateAvatar,
  onCreateReservation,
  onCancelReservation,
}) => {
  const [loggedInClientId, setLoggedInClientId] = useState<string | null>(() => {
    if (!initialClientId) return null;
    const found = clients.find((c) => c.id === initialClientId);
    return found && !found.portalDisabled ? found.id : null;
  });
  const [isFirstTimeMode, setIsFirstTimeMode] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('+243 ');
  const [pinInput, setPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [dataConsent, setDataConsent] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [sessionsPage, setSessionsPage] = useState<number>(1);
  const [avatarError, setAvatarError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États Réservation Mobile Money (>= 3h + 15%) avec génération & validation OTP téléphone
  const [resStationType, setResStationType] = useState<StationType>('PS5');
  const [resPreferredStationId, setResPreferredStationId] = useState<number | 'AUTO'>('AUTO');
  const [resDurationMinutes, setResDurationMinutes] = useState<number>(180);
  const [resDateTimeInput, setResDateTimeInput] = useState<string>(() => {
    const d = new Date(Date.now() + 30 * 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [resMomoMethod, setResMomoMethod] = useState<PaymentMethod>('MPESA');
  const [resMomoPhone, setResMomoPhone] = useState<string>('');
  const [otpChallenge, setOtpChallenge] = useState<{
    otpCode: string;
    phone: string;
    network: PaymentMethod;
    expiresAt: number;
    amountCDF: number;
    amountUSD: number;
  } | null>(null);
  const [otpInput, setOtpInput] = useState<string>('');
  const [isGeneratingOtp, setIsGeneratingOtp] = useState<boolean>(false);
  const [otpCountdownSec, setOtpCountdownSec] = useState<number>(0);
  const [resFeedback, setResFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmCancelResId, setConfirmCancelResId] = useState<string | null>(null);

  const liveClient = loggedInClientId ? clients.find((c) => c.id === loggedInClientId) || null : null;

  useEffect(() => {
    if (initialClientId) {
      const found = clients.find((c) => c.id === initialClientId);
      if (found && !found.portalDisabled) {
        setLoggedInClientId(found.id);
        setLoginError('');
      } else if (found?.portalDisabled) {
        setLoggedInClientId(null);
        setLoginError("Votre accès à l'Espace Client a été désactivé par l'administrateur.");
      }
    }
  }, [initialClientId]);

  useEffect(() => {
    if (liveClient?.portalDisabled) {
      setLoggedInClientId(null);
      setLoginError("Votre accès à l'Espace Client a été désactivé par l'administrateur.");
    }
  }, [liveClient?.portalDisabled]);

  useEffect(() => {
    if (!otpChallenge) {
      setOtpCountdownSec(0);
      return;
    }
    const updateRemaining = () => {
      const rem = Math.max(0, Math.ceil((otpChallenge.expiresAt - Date.now()) / 1000));
      setOtpCountdownSec(rem);
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [otpChallenge]);

  // Vérifier si le client connecté est actuellement dans sa file d'attente (strictement ses infos)
  const activeQueueEntry = liveClient
    ? queue.find(
        (q) =>
          (q.clientId === liveClient.id || q.phone === liveClient.phone) &&
          (q.status === 'waiting' || q.status === 'called')
      )
    : null;

  const queuePosition = activeQueueEntry
    ? queue
        .filter((q) => q.status === 'waiting' || q.status === 'called')
        .findIndex((q) => q.id === activeQueueEntry.id) + 1
    : null;

  const tierEval = liveClient ? evaluateClientTier(liveClient, clients, tierRules) : null;

  const clientSessions = liveClient?.sessionsHistory || [];
  const paginatedSessions = clientSessions.slice((sessionsPage - 1) * PAGE_SIZE, sessionsPage * PAGE_SIZE);

  // Réservations personnelles & Code Wi-Fi actif (ticket >= 1h imprimé/validé)
  const clientReservations = liveClient
    ? reservations.filter((r) => r.clientId === liveClient.id || r.clientPhone === liveClient.phone)
    : [];

  const activeClientWifiTicket = liveClient
    ? tickets.find(
        (t) =>
          (t.clientId === liveClient.id || t.clientPhone === liveClient.phone) &&
          (t.status === 'active' || t.status === 'extended' || t.status === 'queued') &&
          t.wifiVoucher &&
          t.wifiVoucher.status === 'ACTIVE' &&
          (t.durationMinutes >= 60 || (t.originalDurationMinutes || 0) >= 60)
      )
    : undefined;

  const reservedForTs = new Date(resDateTimeInput).getTime() || Date.now() + 30 * 60000;
  const effectiveDuration = Math.max(RESERVATION_MIN_MINUTES, resDurationMinutes);
  const matchingStations = stations.filter((s) => s.type === resStationType);
  const selectedPreferredStation =
    resPreferredStationId === 'AUTO'
      ? undefined
      : matchingStations.find((s) => s.id === resPreferredStationId);
  const availability = checkReservationAvailability({
    stationType: resStationType,
    preferredStationId: selectedPreferredStation?.id,
    reservedForTime: reservedForTs,
    durationMinutes: effectiveDuration,
    stations,
    reservations,
  });
  const isPastReservationTime = reservedForTs < Date.now() - 5 * 60000;

  const quote = computeReservationQuote({
    stationType: resStationType,
    durationMinutes: effectiveDuration,
    pricingPlans,
    settings,
    clientTier: liveClient?.tier,
    paymentMode: 'MOBILE_MONEY',
    reservedForTime: reservedForTs,
  });

  const getNetworkLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'MPESA':
        return 'M-Pesa (Vodacom)';
      case 'ORANGE_MONEY':
        return 'Orange Money';
      case 'AIRTEL_MONEY':
        return 'Airtel Money';
      case 'ILLICO_CASH':
        return 'Illico Cash (Rawbank)';
      default:
        return method;
    }
  };

  const handleGenerateMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!liveClient || !onCreateReservation) return;
    setResFeedback(null);

    if (effectiveDuration < RESERVATION_MIN_MINUTES) {
      setResFeedback({
        type: 'error',
        text: 'Depuis l’Espace Client, la réservation Mobile Money est autorisée uniquement à partir de 3h (180 min) minimum.',
      });
      return;
    }

    if (isPastReservationTime) {
      setResFeedback({
        type: 'error',
        text: "Veuillez choisir une heure de réservation future (l'heure de réservation doit être respectée).",
      });
      return;
    }

    if (!availability.available) {
      setResFeedback({
        type: 'error',
        text:
          availability.reason ||
          "Ce n'est pas disponible : la date, l'heure ou le poste choisi est déjà occupé.",
      });
      return;
    }

    const targetPhone = (resMomoPhone.trim() || liveClient.phone || '').trim();
    if (targetPhone.replace(/\D/g, '').length < 9) {
      setResFeedback({
        type: 'error',
        text: 'Veuillez saisir un numéro de téléphone valide pour recevoir votre code OTP.',
      });
      return;
    }

    setIsGeneratingOtp(true);
    let generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    let expiresAt = Date.now() + 5 * 60 * 1000;

    try {
      const resp = await fetch('/api/reservations/momo-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientPhone: targetPhone,
          network: resMomoMethod,
          amountCDF: quote.totalAmountCDF,
          amountUSD: quote.totalAmountUSD,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.otpCode) {
          generatedCode = String(data.otpCode);
          expiresAt = Number(data.expiresAt || expiresAt);
        }
      }
    } catch {
      // Fallback hors-ligne local
    } finally {
      setIsGeneratingOtp(false);
    }

    setOtpChallenge({
      otpCode: generatedCode,
      phone: targetPhone,
      network: resMomoMethod,
      expiresAt,
      amountCDF: quote.totalAmountCDF,
      amountUSD: quote.totalAmountUSD,
    });
    setOtpInput('');
  };

  const handleConfirmOtpAndReserve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveClient || !onCreateReservation || !otpChallenge) return;
    setResFeedback(null);

    if (Date.now() > otpChallenge.expiresAt) {
      setResFeedback({
        type: 'error',
        text: 'Votre code OTP a expiré. Cliquez sur « Renvoyer un OTP » pour recevoir un nouveau code.',
      });
      return;
    }

    const cleanEntered = otpInput.replace(/\D/g, '').trim();
    if (cleanEntered.length !== 6) {
      setResFeedback({
        type: 'error',
        text: 'Saisissez le code OTP à 6 chiffres reçu sur votre téléphone.',
      });
      return;
    }

    if (cleanEntered !== otpChallenge.otpCode) {
      setResFeedback({
        type: 'error',
        text: 'Code OTP incorrect. Vérifiez le code reçu sur votre téléphone et réessayez.',
      });
      return;
    }

    const netPrefix =
      otpChallenge.network === 'MPESA'
        ? 'MP'
        : otpChallenge.network === 'ORANGE_MONEY'
        ? 'OM'
        : otpChallenge.network === 'AIRTEL_MONEY'
        ? 'AM'
        : 'IL';

    if (!availability.available) {
      setResFeedback({
        type: 'error',
        text:
          availability.reason ||
          "Ce n'est pas disponible : ce créneau ou ce poste vient d'être occupé.",
      });
      return;
    }

    const result = onCreateReservation({
      client: liveClient,
      stationType: resStationType,
      preferredStationId: selectedPreferredStation?.id,
      preferredStationName: selectedPreferredStation?.name,
      durationMinutes: effectiveDuration,
      reservedForTime: reservedForTs,
      paymentMode: 'MOBILE_MONEY',
      paymentMethod: otpChallenge.network,
      paymentReference: `${netPrefix}-OTP-${cleanEntered}`,
      payerPhone: otpChallenge.phone,
      otpVerified: true,
      source: 'PORTAL',
    });

    if (!result.success) {
      setResFeedback({ type: 'error', text: result.message || 'Impossible de valider la réservation.' });
      return;
    }

    setOtpChallenge(null);
    setOtpInput('');
    setResFeedback({
      type: 'success',
      text: `Paiement ${getNetworkLabel(otpChallenge.network)} confirmé par OTP ! Code de réservation ${result.reservation?.reservationCode} enregistré dans la File des Réservés. Présentez ce code au guichet à l'heure prévue.`,
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!liveClient) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    try {
      const compressed = await compressProfileImage(file, 256, 0.82);
      onClientUpdateAvatar?.(liveClient.id, compressed);
    } catch (err: any) {
      setAvatarError(err?.message || 'Erreur lors du traitement de la photo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20';
      case 'FIDELE':
        return 'bg-slate-300 text-slate-900 font-bold border border-slate-200';
      case 'REGULIER':
        return 'bg-slate-700 text-slate-200 font-semibold';
      case 'NOUVEAU':
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  const handleLogoutClient = () => {
    setLoggedInClientId(null);
    setPinInput('');
    setConfirmPinInput('');
    setLoginError('');
    onLogout();
  };

  return (
    <div className="w-full max-w-5xl 2xl:max-w-7xl mx-auto space-y-4 sm:space-y-5 animate-fade-in overflow-x-hidden">
      {!liveClient ? (
        /* Écran de connexion client strict (aucun compte démo d'autres clients exposé) */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 max-w-md 2xl:max-w-lg mx-auto space-y-5 sm:space-y-6 shadow-2xl">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-gaming font-black uppercase tracking-[0.1em] text-white">
              Espace Joueur GOZA
            </h2>
            <p className="text-xs text-slate-400">
              Consultez uniquement vos points, votre rang, vos réservations Mobile Money et votre position en file.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Onglets Connexion / Première Connexion Guidée */}
          <div className="flex border-b border-slate-800 gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                setIsFirstTimeMode(false);
                setLoginError('');
              }}
              className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition cursor-pointer ${
                !isFirstTimeMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/40'
              }`}
            >
              Déjà un compte
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFirstTimeMode(true);
                setLoginError('');
              }}
              className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition cursor-pointer ${
                isFirstTimeMode
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white bg-slate-800/40'
              }`}
            >
              1ère Connexion (Nouveau)
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isLocked) return;

              const cleanInput = phoneInput.trim().replace(/[\s\-\.\(\)]/g, '');
              const client = clients.find((c) => {
                const cleanDB = c.phone.replace(/[\s\-\.\(\)]/g, '');
                return (
                  cleanDB === cleanInput ||
                  (cleanInput.length >= 9 && cleanDB.endsWith(cleanInput.slice(-9))) ||
                  (cleanDB.length >= 9 && cleanInput.endsWith(cleanDB.slice(-9)))
                );
              });

              if (client?.portalDisabled) {
                setLoginError("Votre accès à l'Espace Client a été désactivé par l'administrateur.");
                return;
              }

              if (isFirstTimeMode) {
                if (pinInput.trim().length !== 4) {
                  setLoginError('Le code PIN doit comporter exactement 4 chiffres.');
                  return;
                }
                if (pinInput.trim() !== confirmPinInput.trim()) {
                  setLoginError('Les deux codes PIN saisis ne correspondent pas.');
                  return;
                }

                if (client) {
                  if (onClientCreatePin) {
                    onClientCreatePin(client.id, pinInput.trim());
                  }
                  setLoggedInClientId(client.id);
                  setLoginError('');
                  setPinInput('');
                  setConfirmPinInput('');
                } else {
                  setLoginError(
                    "Numéro non trouvé. Veuillez vous inscrire d'abord auprès du caissier à l'accueil."
                  );
                }
                return;
              }

              // Connexion standard stricte (aucun contournement PIN)
              if (client) {
                const requiredPin = client.pin || '1234';
                if (pinInput.trim() === requiredPin) {
                  setLoggedInClientId(client.id);
                  setLoginError('');
                  setFailedAttempts(0);
                  setPinInput('');
                } else {
                  const nextFail = failedAttempts + 1;
                  setFailedAttempts(nextFail);
                  setPinInput('');
                  if (nextFail >= 5) {
                    setIsLocked(true);
                    setLoginError(
                      'Sécurité anti force-brute : 5 tentatives échouées. Accès temporairement verrouillé.'
                    );
                  } else {
                    setLoginError(`Code PIN incorrect (${nextFail}/5 tentatives).`);
                  }
                }
              } else {
                setLoginError(
                  'Numéro de téléphone introuvable. Utilisez "1ère Connexion" ou inscrivez-vous à l\'accueil.'
                );
              }
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Votre Numéro de Téléphone (RDC) :</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+243 89 545 7097"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-white font-mono text-base sm:text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                {isFirstTimeMode ? 'Créer votre Code PIN Secret (4 chiffres) :' : 'Code PIN Personnel (4 chiffres) :'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-white font-mono text-base sm:text-sm tracking-widest text-center focus:outline-none focus:border-amber-500"
                required
              />
              {isFirstTimeMode && (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Choisissez 4 chiffres faciles à retenir.
                </span>
              )}
            </div>

            {isFirstTimeMode && (
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Confirmer le Code PIN (4 chiffres) :</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-white font-mono text-base sm:text-sm tracking-widest text-center focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            )}

            {/* Consentement RGPD / Données personnelles */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="consent-check"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0 mt-0.5 cursor-pointer shrink-0"
                required
              />
              <label htmlFor="consent-check" className="text-[11px] text-slate-400 leading-tight cursor-pointer">
                J&apos;accepte l&apos;utilisation de mon numéro de téléphone à des fins exclusives de gestion de mon compte de fidélité.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLocked || !dataConsent}
              className="w-full py-3 min-h-[46px] bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black disabled:opacity-30 rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isFirstTimeMode ? 'Créer mon PIN & Ouvrir mon Espace' : 'Accéder à mon Espace Joueur'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* Tableau de bord client connecté — STRICTEMENT ses propres informations */
        <div className="space-y-4 sm:space-y-5">
          {/* Bannière Profil Joueur + Photo de profil */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left w-full sm:w-auto min-w-0">
              <div className="relative shrink-0">
                {liveClient.avatarUrl ? (
                  <img
                    src={liveClient.avatarUrl}
                    alt={liveClient.fullName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/70 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
                    {liveClient.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight break-words">
                    {liveClient.fullName}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${getTierBadgeStyle(
                      liveClient.tier
                    )}`}
                  >
                    {liveClient.tier}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5">
                  <span>Code : {liveClient.clientCode}</span>
                  <span>·</span>
                  <span>{liveClient.phone}</span>
                </div>
                {onClientUpdateAvatar && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={PROFILE_IMAGE_ACCEPT}
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{liveClient.avatarUrl ? 'Changer photo' : 'Ajouter photo'}</span>
                    </button>
                    {liveClient.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => onClientUpdateAvatar(liveClient.id, undefined)}
                        className="px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-700/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-[10px] text-slate-500">JPG, PNG, WebP…</span>
                  </div>
                )}
                {avatarError && <div className="text-[11px] text-rose-400 mt-1">{avatarError}</div>}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleLogoutClient}
                className="w-full sm:w-auto justify-center px-4 py-2.5 min-h-[42px] bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-rose-500/40 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>

          {/* Bannière Code Wi-Fi Actif (1 à 4 appareils selon durée achetée — De l'impression jusqu'à la fin du jeu) */}
          {activeClientWifiTicket?.wifiVoucher && (
            <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/60 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0">
                  <Wifi className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Votre Code Wi-Fi GOZA</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      ACTIF · {activeClientWifiTicket.wifiVoucher.maxDevices}{' '}
                      {activeClientWifiTicket.wifiVoucher.maxDevices > 1 ? 'APPAREILS MAX' : 'APPAREIL UNIQUEMENT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 break-words">
                    Réseau : <strong className="text-cyan-300">{activeClientWifiTicket.wifiVoucher.ssid}</strong> · Ticket{' '}
                    <span className="font-mono text-white">{activeClientWifiTicket.ticketNumber}</span>
                  </p>
                  <p className="text-[11px] text-amber-300">
                    {activeClientWifiTicket.status === 'queued'
                      ? `Valide pendant votre attente en file puis expirera automatiquement à la fin de votre partie (${activeClientWifiTicket.wifiVoucher.maxDevices} appareil${activeClientWifiTicket.wifiVoucher.maxDevices > 1 ? 's' : ''} max).`
                      : `Valide jusqu'à ${new Date(activeClientWifiTicket.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (fin de session) · ${activeClientWifiTicket.wifiVoucher.maxDevices} appareil${activeClientWifiTicket.wifiVoucher.maxDevices > 1 ? 's' : ''} simultané${activeClientWifiTicket.wifiVoucher.maxDevices > 1 ? 's' : ''}.`}
                  </p>
                </div>
              </div>
              <div className="bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-2.5 text-center w-full sm:w-auto shrink-0">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Code Connexion</div>
                <div className="text-xl font-mono font-black tracking-widest text-cyan-300">
                  {activeClientWifiTicket.wifiVoucher.code}
                </div>
              </div>
            </div>
          )}

          {/* Bannière File d'Attente Personnelle (strictement sa position) */}
          {activeQueueEntry && (
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-base flex items-center justify-center font-mono shrink-0">
                  #{queuePosition}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-amber-200">Vous êtes en file d&apos;attente !</h3>
                  <p className="text-xs text-slate-300 break-words">
                    Console souhaitée : {getConsoleLabel(activeQueueEntry.desiredStationType)} · Durée :{' '}
                    {activeQueueEntry.desiredDurationMinutes} min
                    {activeQueueEntry.reservationCode ? ` · Rés. ${activeQueueEntry.reservationCode}` : ''}
                  </p>
                </div>
              </div>
              <div className="sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-amber-500/20 pt-2 sm:pt-0">
                <span className="text-[10px] text-amber-300 block">Statut :</span>
                <span className="font-bold text-xs text-white">
                  {activeQueueEntry.status === 'called' ? "APPELÉ À L'ACCUEIL !" : 'En attente au salon'}
                </span>
              </div>
            </div>
          )}

          {/* Module Réservation Paiement Mobile (>= 3h + 15%) avec Menu Déroulant Réseau & Validation OTP Téléphone */}
          {onCreateReservation && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <TicketIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Réserver par Paiement Mobile (3h+)</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    1) Choisissez votre temps de jeu · 2) Choisissez votre réseau mobile · 3) Générez et validez le code OTP depuis votre téléphone.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 shrink-0">
                  +15% frais réservation · OTP requis
                </span>
              </div>

              {resFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    resFeedback.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {resFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words">{resFeedback.text}</span>
                </div>
              )}

              {!otpChallenge ? (
                <form onSubmit={handleGenerateMobileOtp} className="space-y-4 text-xs">
                  {/* Étape 1 : Console, Poste, Temps de jeux & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        1. Console souhaitée
                      </label>
                      <select
                        value={resStationType}
                        onChange={(e) => {
                          setResStationType(e.target.value as StationType);
                          setResPreferredStationId('AUTO');
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {CONSOLE_CATALOG.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        2. Poste choisi
                      </label>
                      <select
                        value={resPreferredStationId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setResPreferredStationId(v === 'AUTO' ? 'AUTO' : Number(v));
                        }}
                        className={`w-full bg-slate-800 border rounded-xl px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-white focus:outline-none cursor-pointer ${
                          !availability.available
                            ? 'border-rose-500 text-rose-200 focus:border-rose-400'
                            : 'border-slate-700 focus:border-cyan-500'
                        }`}
                      >
                        <option value="AUTO">
                          Auto ({matchingStations.length} poste{matchingStations.length > 1 ? 's' : ''} {getConsoleLabel(resStationType)})
                        </option>
                        {matchingStations.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}{' '}
                            {st.status === 'occupied'
                              ? '(Occupé en ce moment)'
                              : st.status === 'maintenance'
                              ? '(Maintenance)'
                              : '(Libre)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        3. Temps de jeux (Min 3h = 180 min)
                      </label>
                      <select
                        value={effectiveDuration}
                        onChange={(e) => setResDurationMinutes(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value={180}>3 Heures (+ Code Wi-Fi 2 appareils)</option>
                        <option value={240}>4 Heures (+ Code Wi-Fi 3 appareils)</option>
                        <option value={300}>5 Heures (+ Code Wi-Fi 4 appareils)</option>
                        <option value={360}>6 Heures (+ Code Wi-Fi 4 appareils)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        4. Date &amp; Heure d&apos;arrivée
                      </label>
                      <input
                        type="datetime-local"
                        value={resDateTimeInput}
                        onChange={(e) => setResDateTimeInput(e.target.value)}
                        className={`w-full bg-slate-800 border rounded-xl px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-white font-mono focus:outline-none ${
                          !availability.available || isPastReservationTime
                            ? 'border-rose-500 text-rose-200 focus:border-rose-400'
                            : 'border-slate-700 focus:border-cyan-500'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Alerte Rouge Instantanée si la date, l'heure ou le poste choisi est occupé / indisponible */}
                  {(!availability.available || isPastReservationTime) && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-rose-950/75 border-2 border-rose-500 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg shadow-rose-950/40"
                    >
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-black text-rose-300 uppercase tracking-wide text-[11px]">
                          Non disponible
                        </div>
                        <p className="text-rose-100 leading-relaxed font-medium">
                          {isPastReservationTime
                            ? "Ce n'est pas disponible : veuillez choisir une date et une heure futures."
                            : availability.reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Étape 2 : Choix du Moyen de paiement (Menu Déroulant Réseau Mobile) + Numéro Payeur */}
                  <div className="bg-slate-950/70 border border-cyan-500/25 rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span>Paiement Mobile — Choix du Réseau &amp; Envoi OTP</span>
                      </span>
                      <span className="text-[10px] text-amber-300 font-semibold">
                        Annulation max 1h avant · Tout retard sera déduit de votre temps de jeu
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="portal-payment-network"
                          className="text-[11px] font-semibold text-slate-300 block mb-1"
                        >
                          Moyen de paiement — Par quel réseau voulez-vous payer ? *
                        </label>
                        <select
                          id="portal-payment-network"
                          value={resMomoMethod}
                          onChange={(e) => setResMomoMethod(e.target.value as PaymentMethod)}
                          className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2.5 min-h-[44px] text-base sm:text-sm font-semibold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          <option value="MPESA">M-Pesa (Vodacom)</option>
                          <option value="ORANGE_MONEY">Orange Money</option>
                          <option value="AIRTEL_MONEY">Airtel Money</option>
                          <option value="ILLICO_CASH">Illico Cash (Rawbank)</option>
                        </select>
                        <div className="mt-1 text-[11px] font-mono text-cyan-300/90">
                          Compte récepteur GOZA :{' '}
                          {settings?.paymentMethodsConfig?.[resMomoMethod]?.accountDisplayNumber || '+243 ...'}
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="portal-payer-phone"
                          className="text-[11px] font-semibold text-slate-300 block mb-1"
                        >
                          Numéro de téléphone pour recevoir le code OTP *
                        </label>
                        <input
                          id="portal-payer-phone"
                          type="tel"
                          value={resMomoPhone}
                          onChange={(e) => setResMomoPhone(e.target.value)}
                          placeholder={liveClient.phone || '+243 89 000 0000'}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <div className="mt-1 text-[10px] text-slate-400">
                          Un code OTP à 6 chiffres sera généré sur ce numéro pour valider le paiement.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif Financier Transparent */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-300">
                        <span>Temps de jeu ({effectiveDuration / 60}h) :</span>
                        <span className="font-mono font-bold text-white">
                          {quote.baseAmountCDF.toLocaleString()} FC (${quote.baseAmountUSD.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-amber-300">
                        <span>Frais de réservation (+{quote.feePercent}%) :</span>
                        <span className="font-mono font-bold">
                          +{quote.reservationFeeCDF.toLocaleString()} FC (${quote.reservationFeeUSD.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 text-[11px] text-cyan-300">
                        <Wifi className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          Code Wi-Fi multi-appareils ({getWifiMaxDevicesForDuration(effectiveDuration)} appareils max pour {effectiveDuration / 60}h) activé dès validation du ticket.
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        • Annulation possible jusqu&apos;à 1h avant l&apos;heure réservée · Tout retard à l&apos;arrivée est déduit automatiquement du temps de jeu.
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                      <div className="flex sm:block items-center justify-between sm:text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Total à payer ({getNetworkLabel(resMomoMethod)})
                        </span>
                        <span className="text-lg font-mono font-black text-emerald-400">
                          {quote.totalAmountCDF.toLocaleString()} FC{' '}
                          <span className="text-xs text-slate-400">(${quote.totalAmountUSD.toFixed(2)})</span>
                        </span>
                      </div>
                      <button
                        type="submit"
                        disabled={isGeneratingOtp || !availability.available || isPastReservationTime}
                        className="w-full sm:w-auto px-4 py-3 min-h-[46px] bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-rose-900/60 disabled:to-rose-900/60 disabled:border disabled:border-rose-500/40 disabled:text-rose-200 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 shrink-0" />
                        <span>
                          {!availability.available || isPastReservationTime
                            ? 'Créneau non disponible'
                            : isGeneratingOtp
                            ? 'Génération OTP en cours...'
                            : 'Valider & Générer OTP sur mon téléphone'}
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Étape 3 : Notification Téléphone & Validation par Code OTP */
                <form onSubmit={handleConfirmOtpAndReserve} className="space-y-4 text-xs">
                  <div className="bg-gradient-to-br from-cyan-950/60 via-slate-950 to-emerald-950/40 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
                      <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>Confirmation OTP sur votre Téléphone</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 self-start sm:self-auto">
                        Expire dans {Math.floor(otpCountdownSec / 60)}:
                        {String(otpCountdownSec % 60).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Simulation SMS / Push reçu sur le téléphone du client */}
                    <div className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-3.5 space-y-2 shadow-inner">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>SMS / Push reçu sur {otpChallenge.phone}</span>
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {getNetworkLabel(otpChallenge.network)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Paiement GOZA de{' '}
                        <strong className="text-white">
                          {otpChallenge.amountCDF.toLocaleString()} FC (${otpChallenge.amountUSD.toFixed(2)})
                        </strong>{' '}
                        ({getConsoleLabel(resStationType)} · {effectiveDuration / 60}h). Votre code OTP de validation est :
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                        <span className="font-mono font-black text-xl sm:text-2xl tracking-[0.35em] text-amber-300">
                          {otpChallenge.otpCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOtpInput(otpChallenge.otpCode)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600/25 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-200 hover:text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          Copier ce code
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="portal-otp-input" className="text-xs font-bold text-slate-200 block">
                        Saisissez votre code OTP à 6 chiffres pour valider le paiement :
                      </label>
                      <input
                        id="portal-otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-4 py-3 min-h-[48px] text-white font-mono font-black text-xl tracking-[0.45em] text-center focus:outline-none focus:border-emerald-400"
                        required
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleGenerateMobileOtp()}
                          disabled={isGeneratingOtp}
                          className="flex-1 sm:flex-initial px-3 py-2.5 min-h-[42px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingOtp ? 'animate-spin' : ''}`} />
                          <span>Renvoyer OTP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpChallenge(null);
                            setOtpInput('');
                            setResFeedback(null);
                          }}
                          className="flex-1 sm:flex-initial px-3 py-2.5 min-h-[42px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-semibold cursor-pointer transition"
                        >
                          Modifier
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="w-full sm:w-auto px-5 py-3 min-h-[46px] bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Valider le Code OTP &amp; Confirmer</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Liste des réservations du client */}
              {clientReservations.length > 0 && (
                <div className="pt-2 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Mes Réservations &amp; Pass Accueil ({clientReservations.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {clientReservations.slice(0, 6).map((res) => {
                      const timeCheck = evaluateReservationTimeWindow(res.reservedForTime);
                      const cancelCheck = canCancelReservationClient(res.reservedForTime);
                      const lateCheck = computeLateDeduction(res.reservedForTime, res.durationMinutes);
                      const isPendingCheckin = res.status === 'PAID_WAITING_CHECKIN';
                      const wifiCount = getWifiMaxDevicesForDuration(res.originalDurationMinutes || res.durationMinutes);

                      return (
                        <div
                          key={res.id}
                          className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-black text-sm text-purple-300">
                                  {res.reservationCode}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold text-[10px]">
                                  {getConsoleLabel(res.stationType)} · {(res.originalDurationMinutes || res.durationMinutes) / 60}h
                                </span>
                                {res.preferredStationName && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 font-semibold text-[10px]">
                                    {res.preferredStationName}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono text-[10px]">
                                  Wi-Fi {wifiCount} app.
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 break-words">
                                Prévu :{' '}
                                <strong className="text-slate-200">
                                  {new Date(res.reservedForTime).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </strong>{' '}
                                {isPendingCheckin && (
                                  <>
                                    ·{' '}
                                    <span className={timeCheck.status === 'LATE' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                      {timeCheck.label}
                                    </span>
                                  </>
                                )}
                              </div>
                              {isPendingCheckin && lateCheck.lostLateMinutes > 0 && (
                                <div className="text-[11px] text-rose-300 font-semibold">
                                  {lateCheck.isFullyExpired
                                    ? `Créneau expiré : -${lateCheck.lostLateMinutes} min de retard ont consommé les ${res.durationMinutes} min réservées.`
                                    : `Retard en cours (-${lateCheck.lostLateMinutes} min) → ${lateCheck.playableDurationMinutes} min jouables restantes si validé maintenant.`}
                                </div>
                              )}
                              {typeof res.lostLateMinutes === 'number' && res.lostLateMinutes > 0 && !isPendingCheckin && (
                                <div className="text-[11px] text-amber-300 font-mono">
                                  Retard déduit : -{res.lostLateMinutes} min → {res.playableDurationMinutes ?? 0} min jouables
                                </div>
                              )}
                              {res.ticketNumber && (
                                <div className="text-[10px] font-mono text-emerald-300 break-all">
                                  Ticket : {res.ticketNumber}{' '}
                                  {res.wifiVoucher
                                    ? `· Wi-Fi : ${res.wifiVoucher.code} (${res.wifiVoucher.maxDevices} app.)`
                                    : ''}
                                </div>
                              )}
                            </div>

                            <div className="flex sm:block items-center justify-between sm:text-right shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  res.status === 'PAID_WAITING_CHECKIN'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : res.status === 'VALIDATED_ON_STATION' || res.status === 'VALIDATED_IN_QUEUE'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : res.status === 'CANCELLED'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : res.status === 'EXPIRED'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {res.status === 'PAID_WAITING_CHECKIN'
                                  ? 'File des Réservés'
                                  : res.status === 'VALIDATED_IN_QUEUE'
                                  ? "En file d'attente"
                                  : res.status === 'VALIDATED_ON_STATION'
                                  ? `Poste ${res.stationId}`
                                  : res.status === 'CANCELLED'
                                  ? 'Annulée'
                                  : res.status === 'EXPIRED'
                                  ? 'Expirée'
                                  : res.status}
                              </span>
                              <div className="text-[10px] font-mono text-slate-400 sm:mt-1">
                                {res.totalAmountCDF.toLocaleString()} FC
                              </div>
                            </div>
                          </div>

                          {/* Annulation Client possible uniquement >= 1h avant l'heure réservée */}
                          {isPendingCheckin && onCancelReservation && (
                            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                              {cancelCheck.canCancel ? (
                                confirmCancelResId === res.id ? (
                                  <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-rose-950/30 border border-rose-500/30 rounded-lg px-2.5 py-2">
                                    <span className="text-[11px] text-rose-200 font-semibold">
                                      Confirmer l&apos;annulation de {res.reservationCode} ?
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmCancelResId(null)}
                                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] cursor-pointer"
                                      >
                                        Non
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const out = onCancelReservation(res.id);
                                          setConfirmCancelResId(null);
                                          setResFeedback({
                                            type: out.success ? 'success' : 'error',
                                            text: out.message,
                                          });
                                        }}
                                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                                      >
                                        Oui, annuler
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-[10px] text-slate-400">
                                      Annulable jusqu&apos;à{' '}
                                      {new Date(cancelCheck.deadlineTime).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}{' '}
                                      (1h avant)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmCancelResId(res.id)}
                                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Annuler la réservation</span>
                                    </button>
                                  </>
                                )
                              ) : (
                                <span className="text-[10px] text-amber-300 font-medium">
                                  Annulation fermée (moins d&apos;1h avant l&apos;heure réservée).
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Période de grâce avant rétrogradation */}
          {tierEval?.inGracePeriod && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Période de grâce active :</strong> Il vous reste{' '}
                <strong>{tierEval.gracePeriodDaysRemaining} jours</strong> pour accomplir les sessions requises et conserver votre statut{' '}
                <strong>{liveClient.tier}</strong>.
              </span>
            </div>
          )}

          {/* Cartes KPI Soldes & Avantages (AUCUN temps de jeu total ni montant encaissé) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-400">Solde Points Fidélité</span>
              <div className="text-2xl font-bold font-mono text-amber-400">{liveClient.loyaltyPoints} pts</div>
              <p className="text-[11px] text-slate-500">
                Valable pour convertir en sessions gratuites à la caisse
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-400">Temps Gratuit Disponible</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">{liveClient.freeMinutesBalance} min</div>
              <p className="text-[11px] text-slate-500">Crédit de jeu offert cumulé</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-xs text-slate-400">Avantages Rang {liveClient.tier}</span>
              <div className="text-sm font-bold text-cyan-400 mt-1">
                Multiplicateur x{tierRules.perks[liveClient.tier].pointMultiplier} · Remise{' '}
                {tierRules.perks[liveClient.tier].discountPercent}%
              </div>
              <p className="text-[11px] text-slate-500">{tierRules.perks[liveClient.tier].otherBenefits}</p>
            </div>
          </div>

          {/* Progression vers le Statut Suivant */}
          {tierEval && tierEval.nextTier && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Progression vers le statut {tierEval.nextTier}</span>
                </span>
                <span className="font-mono font-bold text-blue-400">{tierEval.progressPercent}%</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${tierEval.progressPercent}%` }}
                />
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 text-xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">
                  Objectifs à atteindre sur 90 jours :
                </span>
                {tierEval.missingCriteria.map((crit, idx) => (
                  <div key={idx} className="text-slate-300 flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{crit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parrainage */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Votre Code de Parrainage</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400">
                +{liveClient.totalReferralBonusPoints} pts gagnés
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="text-[10px] text-slate-400 block">Partagez ce code avec vos amis joueurs :</span>
                <span className="font-mono font-black text-xl text-cyan-400">{liveClient.referralCode}</span>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Rejoins-moi chez GOZA avec mon code parrain ${liveClient.referralCode} pour recevoir des points de fidélité !`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition whitespace-nowrap"
              >
                Partager sur WhatsApp
              </a>
            </div>
          </div>

          {/* Historique personnel des Sessions (sans totaux financiers ni temps cumulé) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-800 font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Vos Dernières Sessions ({clientSessions.length})</span>
            </div>

            {/* Vue mobile compacte en cartes */}
            <div className="sm:hidden divide-y divide-slate-800">
              {paginatedSessions.length === 0 ? (
                <div className="py-6 px-4 text-center text-slate-500">
                  Aucune session enregistrée pour votre compte.
                </div>
              ) : (
                paginatedSessions.map((s, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-cyan-400 font-mono">{s.stationType}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(s.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-200">{s.durationMinutes} min</div>
                      <div className="text-[11px] text-slate-400">
                        {s.isPaidSession ? 'Session standard' : 'Points fidélité'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Vue tablette & desktop en tableau */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-800/80 text-slate-400 font-sans border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Console</th>
                    <th className="py-2.5 px-4">Durée</th>
                    <th className="py-2.5 px-4 text-right">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedSessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                        Aucune session enregistrée pour votre compte.
                      </td>
                    </tr>
                  ) : (
                    paginatedSessions.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-4 text-slate-400">
                          {new Date(s.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2 px-4 text-cyan-400 font-bold">{s.stationType}</td>
                        <td className="py-2 px-4 text-slate-200">{s.durationMinutes} min</td>
                        <td className="py-2 px-4 text-right font-sans text-slate-300">
                          {s.isPaidSession ? 'Session standard' : 'Points fidélité'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={sessionsPage}
              totalItems={clientSessions.length}
              pageSize={PAGE_SIZE}
              onPageChange={setSessionsPage}
              itemLabel="sessions"
            />
          </div>
        </div>
      )}
    </div>
  );
};
