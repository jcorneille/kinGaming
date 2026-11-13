/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { StationCard } from './components/StationCard';
import { FastTicketModal } from './components/FastTicketModal';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { TicketsView } from './components/TicketsView';
import { QueueView } from './components/QueueView';
import { LoyaltyView } from './components/LoyaltyView';
import { DomotiqueView } from './components/DomotiqueView';
import { CashShiftView } from './components/CashShiftView';
import { ReportsView } from './components/ReportsView';
import { HardwareGuideModal } from './components/HardwareGuideModal';
import { StaffLoginModal } from './components/StaffLoginModal';
import { CustomerPortalView } from './components/CustomerPortalView';
import { TierSettingsModal } from './components/TierSettingsModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { WhatsAppConfigModal } from './components/WhatsAppConfigModal';
import { PublicTicketVerificationView } from './components/PublicTicketVerificationView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { LoginLandingView } from './components/LoginLandingView';
import { MyProfileModal } from './components/MyProfileModal';
import { FirstLoginPasswordModal } from './components/FirstLoginPasswordModal';
import { SnackReceiptModal } from './components/SnackReceiptModal';
import { NotificationService, normalizeE164 } from './services/whatsappService';
import { WhatsAppConfig, NotificationLog } from './types';

import {
  Station,
  Ticket,
  Client,
  QueueEntry,
  DomotiqueDevice,
  CashShift,
  SnackItem,
  SnackSale,
  SnackSaleItemDetail,
  PaymentMethod,
  AuditLog,
  StaffUser,
  StaffRole,
  TierRulesConfig,
  TierHistoryEntry,
  ClientSessionStat,
  SettingsHistoryEntry,
  ScheduledSettingChange,
  SystemSettings,
} from './types';
import {
  loadAppState,
  saveAppState,
  AppState,
  DEFAULT_PAGE_BACKGROUND_URL,
  DEFAULT_PAGE_BACKGROUND_OPACITY,
} from './services/storage';
import { soundService } from './services/soundService';
import { mqttGateway } from './services/mqttService';
import { evaluateClientTier, getISOWeekKey } from './services/tierEngine';
import {
  Users,
  Tv,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  X,
  Crown,
  Sparkles,
  RotateCcw,
  Clock,
  Lock,
  Smartphone,
  LogIn,
  LogOut,
  Gamepad2,
  Sliders
} from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/client' || search.includes('tab=client')) {
        return 'customer_portal';
      }
      if (path.startsWith('/t/') || search.includes('t=')) {
        return 'stations';
      }
    }
    const saved = loadAppState();
    return saved.isStaffAuthenticated ? 'stations' : 'login';
  });

  // Routage direct pour QR Code & Espace Client (Modifications 2 & 3)
  const [verificationToken, setVerificationToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (path.startsWith('/t/')) {
      return decodeURIComponent(path.replace('/t/', '').split('/')[0]);
    }
    if (search.get('t')) return search.get('t');
    if (hash.startsWith('#t=')) return hash.replace('#t=', '');
    return null;
  });

  // Détection accès direct /client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/client' || window.location.search.includes('tab=client')) {
        setActiveTab('customer_portal');
      }
    }
  }, []);

  // Modals & sélection
  const [selectedStationForTicket, setSelectedStationForTicket] = useState<Station | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);
  const [currentPrintingTicket, setCurrentPrintingTicket] = useState<Ticket | null>(null);
  const [transferModalStation, setTransferModalStation] = useState<Station | null>(null);

  // Modals Admin & Staff
  const [isTierSettingsOpen, setIsTierSettingsOpen] = useState<boolean>(false);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState<boolean>(false);
  const [isWhatsAppConfigOpen, setIsWhatsAppConfigOpen] = useState<boolean>(false);
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [firstLoginPromptUser, setFirstLoginPromptUser] = useState<StaffUser | null>(null);
  const [postponedFirstLoginUserIds, setPostponedFirstLoginUserIds] = useState<string[]>([]);
  const [currentPrintingSnackSale, setCurrentPrintingSnackSale] = useState<SnackSale | null>(null);

  // Libération automatique & Annulation (Modification 4)
  const [undoAutoRelease, setUndoAutoRelease] = useState<{
    stationId: number;
    ticket: Ticket;
    expiresAt: number;
  } | null>(null);
  const [oneMinuteWarnings, setOneMinuteWarnings] = useState<{ stationId: number; clientName: string }[]>([]);

  // Alerte visuelle caissier (ex: échec d'envoi WhatsApp)
  const [cashierAlertBanner, setCashierAlertBanner] = useState<string | null>(null);

  // Notification de promotion statut
  const [promotionCelebration, setPromotionCelebration] = useState<{ clientName: string; newTier: string } | null>(null);

  // État PWA & Hors-Ligne
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // Inactivité pour déconnexion automatique (défaut: 10 min)
  const lastActivityTime = useRef<number>(Date.now());

  // Récupération automatique des sessions expirées pendant un arrêt ou coupure de courant (Modification 4)
  useEffect(() => {
    const now = Date.now();
    let hasRecovered = false;

    setAppState((prev) => {
      const recoveredStations = prev.stations.map((st) => {
        if (st.status === 'occupied' && st.endTime && st.endTime <= now) {
          hasRecovered = true;
          return {
            ...st,
            status: 'available' as const,
            currentTicketId: undefined,
            clientName: undefined,
            clientPhone: undefined,
            remainingSeconds: 0,
            relayState: false,
            screenRelayState: false,
            currentWatts: 0,
          };
        }
        return st;
      });

      if (!hasRecovered) return prev;

      const recoveredTickets = prev.tickets.map((t) => {
        if (t.status === 'active' && t.endTime && t.endTime <= now) {
          return {
            ...t,
            status: 'completed' as const,
            actualEndTime: t.endTime,
            autoReleased: true,
          };
        }
        return t;
      });

      const audit: AuditLog = {
        id: 'aud-' + Date.now(),
        timestamp: Date.now(),
        userRole: 'SYSTEM',
        cashierName: 'Reprise Automate Déconnexion',
        action: 'RECUPERATION_SESSION_EXPIREE',
        details: 'Sessions terminées pendant délestage ou arrêt clôturées automatiquement',
      };

      return {
        ...prev,
        stations: recoveredStations,
        tickets: recoveredTickets,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  }, []);

  // Enregistrement de l'alerte caissier pour NotificationService
  useEffect(() => {
    NotificationService.setCashierAlertHandler((message) => {
      soundService.playAlertWarning();
      setCashierAlertBanner(message);
    });
  }, []);

  // Sauvegarde automatique lors des modifications d'état
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Écouteur d'activité pour déconnexion automatique
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTime.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    const inactivityCheckInterval = setInterval(() => {
      if (appState.isStaffAuthenticated && appState.settings.autoLogoutInactivityMinutes > 0) {
        const inactiveMs = Date.now() - lastActivityTime.current;
        if (inactiveMs >= appState.settings.autoLogoutInactivityMinutes * 60000) {
          // Verrouiller la session par inactivité
          setAppState(prev => ({
            ...prev,
            isStaffAuthenticated: false,
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: prev.currentRole,
                cashierName: prev.currentUser,
                action: 'DECONNEXION_INACTIVITE',
                details: `Verrouillage automatique après ${prev.settings.autoLogoutInactivityMinutes} min d'inactivité`,
              },
              ...prev.auditLogs,
            ],
          }));
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearInterval(inactivityCheckInterval);
    };
  }, [appState.isStaffAuthenticated, appState.settings.autoLogoutInactivityMinutes, appState.currentRole, appState.currentUser]);

  // Écouteur de connectivité réseau & PWA
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Moteur de temps réel (Tick 1 seconde précis avec libération automatique - Section 2.17)
  useEffect(() => {
    const interval = setInterval(() => {
      setAppState((prev) => {
        let stateChanged = false;
        const autoReleasedTickets: Ticket[] = [];
        const freedStations: Station[] = [];
        const newWarnings: { stationId: number; clientName: string }[] = [];

        const newStations = prev.stations.map((st) => {
          if (st.status === 'occupied' && st.remainingSeconds > 0) {
            stateChanged = true;
            const nextSecs = st.remainingSeconds - 1;

            // Alerte 5 minutes (carillon doux)
            if (nextSecs === 300 && prev.settings.soundAlertsEnabled) {
              soundService.playSessionEndAlert(false);
            }

            // Alerte 1 minute (alerte sonore + bannière amber)
            if (nextSecs === 60) {
              if (prev.settings.soundAlertsEnabled) {
                soundService.playSessionEndAlert(true);
              }
              newWarnings.push({ stationId: st.id, clientName: st.clientName || 'Joueur' });
            } else if (nextSecs < 60 && nextSecs > 0) {
              newWarnings.push({ stationId: st.id, clientName: st.clientName || 'Joueur' });
            }

            // At 0m : Libération automatique du poste (Section 2.17)
            if (nextSecs === 0) {
              if (prev.settings.soundAlertsEnabled) {
                soundService.playSessionEndAlert(true);
              }

              // Chercher le ticket associé
              const associatedTicket = prev.tickets.find((t) => t.ticketNumber === st.currentTicketId);
              if (associatedTicket) {
                autoReleasedTickets.push({
                  ...associatedTicket,
                  status: 'completed',
                  actualEndTime: Date.now(),
                  autoReleased: true,
                });
              }

              // Programmer la coupure domotique après le délai de grâce (default 120s pour sauvegarder)
              const graceMs = (prev.settings.autoReleaseGraceSeconds || 120) * 1000;
              const target = prev.settings.autoCutTarget || 'SCREEN_ONLY';

              setTimeout(() => {
                if (target === 'SCREEN_ONLY') {
                  mqttGateway.publish(`gaminghub/station/${st.id}/screen/set`, 'OFF');
                } else {
                  mqttGateway.publish(`gaminghub/station/${st.id}/power/set`, 'OFF');
                  mqttGateway.publish(`gaminghub/station/${st.id}/screen/set`, 'OFF');
                }
              }, graceMs);

              freedStations.push(st);

              // Retourner le poste à l'état disponible
              return {
                ...st,
                status: 'available' as const,
                currentTicketId: undefined,
                clientName: undefined,
                clientPhone: undefined,
                remainingSeconds: 0,
                totalDurationMinutes: 0,
                relayState: target === 'SCREEN_ONLY' ? true : false,
                screenRelayState: false,
                currentWatts: 0,
                lastUpdated: Date.now(),
              };
            }

            return {
              ...st,
              remainingSeconds: nextSecs,
              lastUpdated: Date.now(),
            };
          }
          return st;
        });

        // Mise à jour de la liste des avertissements 1 min
        setOneMinuteWarnings(newWarnings);

        // Si un poste a été libéré automatiquement
        let updatedTickets = prev.tickets;
        let updatedQueue = prev.queue;
        let newAuditLogs = prev.auditLogs;

        if (autoReleasedTickets.length > 0) {
          const releasedMap = new Map(autoReleasedTickets.map((t) => [t.id, t]));
          updatedTickets = prev.tickets.map((t) => releasedMap.get(t.id) || t);

          // Activation de la bannière d'annulation pour le caissier (2 minutes)
          const lastReleased = autoReleasedTickets[0];
          const stNum = freedStations[0]?.id || 1;
          setUndoAutoRelease({
            stationId: stNum,
            ticket: lastReleased,
            expiresAt: Date.now() + 120000,
          });

          // Appel automatique du prochain client dans la file d'attente
          freedStations.forEach((freedSt) => {
            const nextClientIdx = updatedQueue.findIndex(
              (q) => q.status === 'waiting' && (q.desiredStationType === 'ANY' || q.desiredStationType === freedSt.type)
            );

            if (nextClientIdx !== -1) {
              const nextClient = updatedQueue[nextClientIdx];
              updatedQueue = [...updatedQueue];
              updatedQueue[nextClientIdx] = {
                ...nextClient,
                status: 'called',
                calledAt: Date.now(),
                gracePeriodSeconds: 180,
              };

              // Notification WhatsApp Business Cloud
              if (nextClient.phone && prev.whatsappConfig.autoNotifyQueueTurn) {
                NotificationService.sendWithRetry(
                  nextClient.phone,
                  nextClient.clientName,
                  'poste_pret',
                  {
                    '1': nextClient.clientName.split(' ')[0],
                    '2': String(freedSt.id),
                    '3': freedSt.type,
                    '4': '3',
                  },
                  prev.whatsappConfig,
                  nextClient.clientId,
                  (newLog) => {
                    setAppState((curr) => ({
                      ...curr,
                      notificationLogs: [newLog, ...curr.notificationLogs.filter((l) => l.id !== newLog.id)],
                    }));
                  }
                );
              }
            }

            // Journal d'audit pour la libération automatique
            newAuditLogs = [
              {
                id: 'aud-' + Date.now() + '-' + freedSt.id,
                timestamp: Date.now(),
                userRole: 'SYSTEM',
                cashierName: 'Automate Libération',
                action: 'LIBERATION_AUTO_POSTE',
                details: `Session Poste ${freedSt.id} (${lastReleased.clientName}) libérée automatiquement à 0 min. Extinction prévue dans ${prev.settings.autoReleaseGraceSeconds}s.`,
                stationId: freedSt.id,
              },
              ...newAuditLogs,
            ];
          });
        }

        const newQueue = updatedQueue.map((q) => {
          if (q.status === 'called' && q.gracePeriodSeconds > 0) {
            stateChanged = true;
            const nextGrace = q.gracePeriodSeconds - 1;
            if (nextGrace === 0) {
              return { ...q, status: 'no_show' as const, gracePeriodSeconds: 0 };
            }
            return { ...q, gracePeriodSeconds: nextGrace };
          }
          return q;
        });

        // 3. Vérification des réglages programmés (Section 2.18)
        let updatedSettings = prev.settings;
        let updatedScheduled = prev.scheduledSettings || [];
        const nowMs = Date.now();

        if (Array.isArray(updatedScheduled) && updatedScheduled.some((s) => !s.applied && s.scheduledFor <= nowMs)) {
          stateChanged = true;
          updatedScheduled = updatedScheduled.map((s) => {
            if (!s.applied && s.scheduledFor <= nowMs) {
              updatedSettings = { ...updatedSettings, ...s.newValue };
              newAuditLogs = [
                {
                  id: 'aud-sched-' + Date.now(),
                  timestamp: Date.now(),
                  userRole: 'SYSTEM',
                  cashierName: 'Automate Réglages',
                  action: 'APPLICATION_REGLAGE_PROGRAMME',
                  details: `Application programmée réussie pour la section ${s.section} (${s.label}) prévue à ${new Date(s.scheduledFor).toLocaleTimeString('fr-FR')}`,
                },
                ...newAuditLogs,
              ];
              return { ...s, applied: true, appliedAt: nowMs };
            }
            return s;
          });
        }

        if (!stateChanged && autoReleasedTickets.length === 0) return prev;
        return {
          ...prev,
          stations: newStations,
          tickets: updatedTickets,
          queue: newQueue,
          auditLogs: newAuditLogs,
          settings: updatedSettings,
          scheduledSettings: updatedScheduled,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Déclencher l'installation PWA
  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
  };

  // 1. Démarrer un Ticket
  const handleOpenTicket = (station: Station) => {
    setSelectedStationForTicket(station);
    setIsTicketModalOpen(true);
  };

  const handleConfirmTicket = (ticket: Ticket, selectedClient?: Client, payWithPoints?: boolean) => {
    soundService.playTicketSuccess();

    mqttGateway.publish(`gaminghub/station/${ticket.stationId}/power/set`, 'ON');

    setAppState((prev) => {
      // 1. Mettre à jour le poste
      const updatedStations = prev.stations.map((st) => {
        if (st.id === ticket.stationId) {
          const isPS5 = st.type === 'PS5';
          return {
            ...st,
            status: 'occupied' as const,
            currentTicketId: ticket.ticketNumber,
            clientName: ticket.clientName,
            clientPhone: ticket.clientPhone,
            clientId: ticket.clientId,
            startTime: ticket.startTime,
            endTime: ticket.endTime,
            remainingSeconds: ticket.durationMinutes * 60,
            totalDurationMinutes: ticket.durationMinutes,
            relayState: true,
            screenRelayState: true,
            currentWatts: isPS5 ? 210 : 135,
            lastUpdated: Date.now(),
          };
        }
        return st;
      });

      // 2. Mettre à jour l'équipement domotique
      const updatedDevices = prev.domotiqueDevices.map((d) => {
        if (d.stationId === ticket.stationId) {
          return { ...d, state: 'ON' as const, watts: ticket.stationType === 'PS5' ? 210 : 135 };
        }
        return d;
      });

      // 3. Traiter les points de fidélité et parrainage
      let updatedClients = [...prev.clients];
      const newTransactions = [...prev.loyaltyTransactions];
      const newTierHistory = [...prev.tierHistory];

      if (selectedClient) {
        const perk = prev.tierRules.perks[selectedClient.tier];
        const pointsMultiplier = perk.pointMultiplier || 1.0;
        const baseEarned = Math.floor(ticket.durationMinutes / prev.settings.pointEarnRateMinutes);
        const pointsEarned = Math.round(baseEarned * pointsMultiplier * (ticket.stationType === 'PS5' ? 2 : 1));
        const pointsSpent = payWithPoints ? Math.round(ticket.amountCDF / 15) : 0;

        // Nouvelle session pour historique 90j
        const newSessionRecord: ClientSessionStat = {
          ticketId: ticket.ticketNumber,
          date: ticket.createdAt,
          durationMinutes: ticket.durationMinutes,
          amountPaidCDF: ticket.amountCDF,
          amountPaidUSD: ticket.amountUSD,
          isPaidSession: !payWithPoints,
          stationType: ticket.stationType,
          weekNumberYear: getISOWeekKey(new Date(ticket.createdAt)),
        };

        updatedClients = updatedClients.map((c) => {
          if (c.id === selectedClient.id) {
            const nextPoints = Math.max(0, c.loyaltyPoints - pointsSpent + (payWithPoints ? 0 : pointsEarned));
            const nextPlayTime = c.totalPlayMinutes + ticket.durationMinutes;
            const updatedSessions = [newSessionRecord, ...(c.sessionsHistory || [])];

            const updatedClientObj: Client = {
              ...c,
              loyaltyPoints: nextPoints,
              totalPlayMinutes: nextPlayTime,
              totalSpentCDF: c.totalSpentCDF + (payWithPoints ? 0 : ticket.amountCDF),
              totalSpentUSD: c.totalSpentUSD + (payWithPoints ? 0 : ticket.amountUSD),
              sessionsHistory: updatedSessions,
            };

            // Évaluation automatique du statut (Nouveau → Régulier → Fidèle → VIP)
            const evaluation = evaluateClientTier(updatedClientObj, prev.clients, prev.tierRules);

            if (evaluation.isPromoted && evaluation.calculatedTier !== c.tier) {
              setPromotionCelebration({
                clientName: c.fullName,
                newTier: evaluation.calculatedTier,
              });

              newTierHistory.unshift({
                id: 'th-' + Date.now(),
                clientId: c.id,
                clientName: c.fullName,
                date: Date.now(),
                oldTier: c.tier,
                newTier: evaluation.calculatedTier,
                reason: `Promotion automatique suite à session ${ticket.ticketNumber}`,
                performedBy: 'SYSTEM_AUTO',
              });

              return {
                ...updatedClientObj,
                tier: evaluation.calculatedTier,
                tierPromotedAt: Date.now(),
              };
            }

            return updatedClientObj;
          }
          return c;
        });

        if (payWithPoints) {
          newTransactions.unshift({
            id: 'lt-' + Date.now(),
            clientId: selectedClient.id,
            clientName: selectedClient.fullName,
            type: 'SPEND_FREE_TIME',
            points: -pointsSpent,
            description: `Session ${ticket.durationMinutes}m payée en points (Poste ${ticket.stationId})`,
            createdAt: Date.now(),
          });
        } else if (pointsEarned > 0) {
          newTransactions.unshift({
            id: 'lt-' + Date.now(),
            clientId: selectedClient.id,
            clientName: selectedClient.fullName,
            type: 'EARN_PLAY',
            points: pointsEarned,
            description: `Points session (${perk.label} x${perk.pointMultiplier}) ${ticket.durationMinutes}m (Poste ${ticket.stationId})`,
            createdAt: Date.now(),
          });
        }

        // Bonus parrainage
        if (selectedClient.referredById && !payWithPoints) {
          const sponsorBonus = Math.floor((pointsEarned * prev.settings.referralBonusPercentage) / 100);
          if (sponsorBonus > 0) {
            updatedClients = updatedClients.map((sc) => {
              if (sc.id === selectedClient.referredById && sc.totalReferralBonusPoints < prev.settings.maxReferralBonusCap) {
                return {
                  ...sc,
                  loyaltyPoints: sc.loyaltyPoints + sponsorBonus,
                  totalReferralBonusPoints: sc.totalReferralBonusPoints + sponsorBonus,
                };
              }
              return sc;
            });

            newTransactions.unshift({
              id: 'lt-ref-' + Date.now(),
              clientId: selectedClient.referredById,
              clientName: selectedClient.referredByName || 'Parrain',
              type: 'REFERRAL_PLAY',
              points: sponsorBonus,
              description: `Bonus 10% parrainage sur session de ${selectedClient.fullName}`,
              createdAt: Date.now(),
            });
          }
        }
      }

      // 4. Mettre à jour la caisse
      const updatedShift: CashShift = {
        ...prev.currentShift,
        expectedCashCDF: prev.currentShift.expectedCashCDF + (ticket.paymentMethod === 'CASH_CDF' ? ticket.amountCDF : 0),
        expectedCashUSD: prev.currentShift.expectedCashUSD + (ticket.paymentMethod === 'CASH_USD' ? ticket.amountUSD : 0),
        totalMomoCDF: prev.currentShift.totalMomoCDF + (['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY'].includes(ticket.paymentMethod) ? ticket.amountCDF : 0),
        totalMomoUSD: prev.currentShift.totalMomoUSD + (['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY'].includes(ticket.paymentMethod) ? ticket.amountUSD : 0),
      };

      // 5. Journal d'audit avec liaison caissier
      const newAudit: AuditLog = {
        id: 'aud-' + Date.now(),
        timestamp: Date.now(),
        userRole: prev.currentRole,
        cashierName: prev.currentUser,
        action: 'CREATION_TICKET',
        details: `Ticket ${ticket.ticketNumber} créé par ${prev.currentUser} pour ${ticket.clientName} (Poste ${ticket.stationId} - ${ticket.amountCDF.toLocaleString()} FC)`,
        stationId: ticket.stationId,
      };

      return {
        ...prev,
        stations: updatedStations,
        domotiqueDevices: updatedDevices,
        tickets: [ticket, ...prev.tickets],
        clients: updatedClients,
        loyaltyTransactions: newTransactions,
        tierHistory: newTierHistory,
        currentShift: updatedShift,
        auditLogs: [newAudit, ...prev.auditLogs],
      };
    });

    setIsTicketModalOpen(false);
    setCurrentPrintingTicket(ticket);
  };

  // 2. Prolonger une session
  const handleExtend = (station: Station, minutes: number) => {
    soundService.playTicketSuccess();

    setAppState((prev) => {
      const plan = prev.pricingPlans.find(p => p.stationType === station.type && p.durationMinutes === minutes);
      const extraCDF = plan?.priceCDF || (minutes === 15 ? 1500 : minutes === 30 ? 3000 : 5000);
      const extraUSD = plan?.priceUSD || (extraCDF / prev.settings.exchangeRate);

      const updatedStations = prev.stations.map((st) => {
        if (st.id === station.id) {
          return {
            ...st,
            remainingSeconds: st.remainingSeconds + minutes * 60,
            totalDurationMinutes: st.totalDurationMinutes + minutes,
            endTime: (st.endTime || Date.now()) + minutes * 60000,
            lastUpdated: Date.now(),
          };
        }
        return st;
      });

      const updatedTickets = prev.tickets.map((tk) => {
        if (tk.ticketNumber === station.currentTicketId) {
          return {
            ...tk,
            durationMinutes: tk.durationMinutes + minutes,
            amountCDF: tk.amountCDF + extraCDF,
            amountUSD: tk.amountUSD + extraUSD,
            status: 'extended' as const,
            extendedCount: (tk.extendedCount || 0) + 1,
          };
        }
        return tk;
      });

      const updatedShift: CashShift = {
        ...prev.currentShift,
        expectedCashCDF: prev.currentShift.expectedCashCDF + extraCDF,
        expectedCashUSD: prev.currentShift.expectedCashUSD + extraUSD,
      };

      const newAudit: AuditLog = {
        id: 'aud-' + Date.now(),
        timestamp: Date.now(),
        userRole: prev.currentRole,
        cashierName: prev.currentUser,
        action: 'PROLONGATION_SESSION',
        details: `Prolongation de +${minutes}m sur Poste ${station.id} (+${extraCDF.toLocaleString()} FC) par ${prev.currentUser}`,
        stationId: station.id,
      };

      return {
        ...prev,
        stations: updatedStations,
        tickets: updatedTickets,
        currentShift: updatedShift,
        auditLogs: [newAudit, ...prev.auditLogs],
      };
    });
  };

  // 3. Transférer vers un autre poste
  const handleTransfer = (sourceStation: Station) => {
    setTransferModalStation(sourceStation);
  };

  const executeTransfer = (targetStationId: number) => {
    if (!transferModalStation) return;
    const source = transferModalStation;

    mqttGateway.publish(`gaminghub/station/${source.id}/power/set`, 'OFF');
    mqttGateway.publish(`gaminghub/station/${targetStationId}/power/set`, 'ON');

    setAppState((prev) => {
      const updatedStations = prev.stations.map((st) => {
        if (st.id === source.id) {
          return {
            ...st,
            status: 'available' as const,
            currentTicketId: undefined,
            clientName: undefined,
            clientPhone: undefined,
            remainingSeconds: 0,
            totalDurationMinutes: 0,
            relayState: false,
            screenRelayState: false,
            currentWatts: 0,
          };
        }
        if (st.id === targetStationId) {
          return {
            ...st,
            status: 'occupied' as const,
            currentTicketId: source.currentTicketId,
            clientName: source.clientName,
            clientPhone: source.clientPhone,
            clientId: source.clientId,
            startTime: source.startTime,
            endTime: source.endTime,
            remainingSeconds: source.remainingSeconds,
            totalDurationMinutes: source.totalDurationMinutes,
            relayState: true,
            screenRelayState: true,
            currentWatts: st.type === 'PS5' ? 210 : 135,
          };
        }
        return st;
      });

      const newAudit: AuditLog = {
        id: 'aud-' + Date.now(),
        timestamp: Date.now(),
        userRole: prev.currentRole,
        cashierName: prev.currentUser,
        action: 'TRANSFERT_POSTE',
        details: `Client ${source.clientName} transféré du Poste ${source.id} vers Poste ${targetStationId} par ${prev.currentUser}`,
      };

      return {
        ...prev,
        stations: updatedStations,
        auditLogs: [newAudit, ...prev.auditLogs],
      };
    });

    setTransferModalStation(null);
  };

  // 4. Terminer la session plus tôt
  const handleEndSession = (station: Station) => {
    if (!confirm(`Terminer la session en cours sur le Poste ${station.id} (${station.clientName}) ?`)) return;

    mqttGateway.publish(`gaminghub/station/${station.id}/power/set`, 'OFF');

    setAppState((prev) => {
      const updatedStations = prev.stations.map((st) => {
        if (st.id === station.id) {
          return {
            ...st,
            status: 'available' as const,
            currentTicketId: undefined,
            clientName: undefined,
            clientPhone: undefined,
            remainingSeconds: 0,
            totalDurationMinutes: 0,
            relayState: false,
            screenRelayState: false,
            currentWatts: 0,
          };
        }
        return st;
      });

      const updatedTickets = prev.tickets.map((t) => {
        if (t.ticketNumber === station.currentTicketId) {
          return { ...t, status: 'completed' as const };
        }
        return t;
      });

      const newAudit: AuditLog = {
        id: 'aud-' + Date.now(),
        timestamp: Date.now(),
        userRole: prev.currentRole,
        cashierName: prev.currentUser,
        action: 'FIN_ANTICIPEE_SESSION',
        details: `Fin anticipée de session sur Poste ${station.id} par ${prev.currentUser}`,
        stationId: station.id,
      };

      // Si un client attend ce type de poste ou 'ANY' dans la file d'attente
      let updatedQueue = [...prev.queue];
      const nextClientIndex = updatedQueue.findIndex(
        (q) => (q.status === 'waiting') && (q.desiredStationType === 'ANY' || q.desiredStationType === station.type)
      );

      if (nextClientIndex !== -1 && prev.whatsappConfig.autoNotifyQueueTurn) {
        const nextClient = updatedQueue[nextClientIndex];
        updatedQueue[nextClientIndex] = {
          ...nextClient,
          status: 'called',
          calledAt: Date.now(),
          gracePeriodSeconds: 180,
        };

        // Envoi asynchrone WhatsApp Business Cloud API
        if (nextClient.phone) {
          NotificationService.sendWithRetry(
            nextClient.phone,
            nextClient.clientName,
            'poste_pret',
            {
              '1': nextClient.clientName.split(' ')[0],
              '2': String(station.id),
              '3': station.type,
              '4': '3',
            },
            prev.whatsappConfig,
            nextClient.clientId,
            (newLog) => {
              setAppState((curr) => ({
                ...curr,
                notificationLogs: [newLog, ...curr.notificationLogs.filter((l) => l.id !== newLog.id)],
              }));
            }
          );
        }
      }

      return {
        ...prev,
        stations: updatedStations,
        tickets: updatedTickets,
        queue: updatedQueue,
        auditLogs: [newAudit, ...prev.auditLogs],
      };
    });
  };

  // 5. Maintenance
  const handleToggleMaintenance = (station: Station) => {
    const isMaint = station.status === 'maintenance';
    setAppState((prev) => {
      const updatedStations = prev.stations.map((st) => {
        if (st.id === station.id) {
          return {
            ...st,
            status: isMaint ? ('available' as const) : ('maintenance' as const),
            relayState: false,
            currentWatts: 0,
          };
        }
        return st;
      });

      return {
        ...prev,
        stations: updatedStations,
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: isMaint ? 'FIN_MAINTENANCE' : 'MISE_EN_MAINTENANCE',
            details: `Poste ${station.id} ${isMaint ? 'remis en service' : 'placé en maintenance'} par ${prev.currentUser}`,
            stationId: station.id,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  // 6. Commuter Prise Domotique Manuellement
  const handleTogglePower = (station: Station) => {
    const nextState = !station.relayState;
    mqttGateway.publish(`gaminghub/station/${station.id}/power/set`, nextState ? 'ON' : 'OFF');

    setAppState((prev) => {
      const updatedStations = prev.stations.map((st) => {
        if (st.id === station.id) {
          return {
            ...st,
            relayState: nextState,
            screenRelayState: nextState,
            currentWatts: nextState ? (st.type === 'PS5' ? 200 : 130) : 0,
          };
        }
        return st;
      });

      const updatedDevices = prev.domotiqueDevices.map((d) => {
        if (d.stationId === station.id) {
          return {
            ...d,
            state: nextState ? ('ON' as const) : ('OFF' as const),
            watts: nextState ? (station.type === 'PS5' ? 200 : 130) : 0,
          };
        }
        return d;
      });

      return {
        ...prev,
        stations: updatedStations,
        domotiqueDevices: updatedDevices,
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'COMMUTATION_MANUELLE_PRISE',
            details: `Poste ${station.id} commuté manuellement vers ${nextState ? 'ALLUMÉ' : 'ÉTEINT'} par ${prev.currentUser}`,
            stationId: station.id,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  // 7. Master Power Controls
  const handleMasterPowerOff = () => {
    if (!confirm('ATTENTION : Déclencher l\'extinction générale de tous les postes et éclairages (fermeture de salle) ?')) return;

    mqttGateway.publish('gaminghub/global/all_off', 'TRIGGER');

    setAppState((prev) => ({
      ...prev,
      stations: prev.stations.map(s => ({
        ...s,
        status: 'available' as const,
        remainingSeconds: 0,
        relayState: false,
        screenRelayState: false,
        currentWatts: 0,
      })),
      domotiqueDevices: prev.domotiqueDevices.map(d => ({
        ...d,
        state: 'OFF' as const,
        watts: 0,
      })),
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'EXTINCTION_GENERALE',
          details: `Extinction générale de fermeture déclenchée par ${prev.currentUser}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleMasterPowerOn = () => {
    mqttGateway.publish('gaminghub/global/all_on', 'TRIGGER');

    setAppState((prev) => ({
      ...prev,
      domotiqueDevices: prev.domotiqueDevices.map(d => ({
        ...d,
        state: 'ON' as const,
        watts: d.type === 'AMBIENT_LIGHT' ? 85 : d.type === 'AIR_CONDITIONER' ? 1350 : 110,
      })),
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'ALLUMAGE_GENERAL',
          details: `Allumage général des équipements déclenché par ${prev.currentUser}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  // 8. File d'attente
  const handleAddToQueue = (entry: Omit<QueueEntry, 'id' | 'arrivalTime' | 'status' | 'gracePeriodSeconds'>) => {
    const newEntry: QueueEntry = {
      ...entry,
      id: 'q-' + Date.now(),
      arrivalTime: Date.now(),
      status: 'waiting',
      gracePeriodSeconds: 180,
    };
    setAppState((prev) => ({
      ...prev,
      queue: [...prev.queue, newEntry],
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'AJOUT_FILE_ATTENTE',
          details: `Client ${entry.clientName} ajouté à la file d'attente (${entry.desiredStationType}) par ${prev.currentUser}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleCallQueueClient = (entryId: string) => {
    soundService.playQueueCall();

    const entry = appState.queue.find(q => q.id === entryId);
    if (entry && entry.phone && appState.whatsappConfig.autoNotifyQueueTurn) {
      // Rechercher un poste libre disponible pour la variable {{2}}
      const freeStation = appState.stations.find(s => s.status === 'available' && (entry.desiredStationType === 'ANY' || s.type === entry.desiredStationType));
      const stationNum = freeStation ? String(freeStation.id) : '1';
      const stationType = freeStation ? freeStation.type : (entry.desiredStationType === 'ANY' ? 'PS4' : entry.desiredStationType);

      NotificationService.sendWithRetry(
        entry.phone,
        entry.clientName,
        'poste_pret',
        {
          '1': entry.clientName.split(' ')[0],
          '2': stationNum,
          '3': stationType,
          '4': '3',
        },
        appState.whatsappConfig,
        entry.clientId,
        (newLog) => {
          setAppState((curr) => ({
            ...curr,
            notificationLogs: [newLog, ...curr.notificationLogs.filter((l) => l.id !== newLog.id)],
          }));
        }
      );
    }

    setAppState((prev) => ({
      ...prev,
      queue: prev.queue.map(q => q.id === entryId ? { ...q, status: 'called' as const, calledAt: Date.now(), gracePeriodSeconds: 180 } : q),
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'APPEL_CLIENT_FILE',
          details: `Appel et notification WhatsApp pour ${entry?.clientName || entryId}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleSendWhatsAppDirect = (entry: QueueEntry) => {
    if (!entry.phone) return;
    const freeStation = appState.stations.find(s => s.status === 'available');
    const stationNum = freeStation ? String(freeStation.id) : 'Disponible';
    const stationType = freeStation ? freeStation.type : 'PS4/PS5';

    NotificationService.sendWithRetry(
      entry.phone,
      entry.clientName,
      'poste_pret',
      {
        '1': entry.clientName.split(' ')[0],
        '2': stationNum,
        '3': stationType,
        '4': '3',
      },
      appState.whatsappConfig,
      entry.clientId,
      (newLog) => {
        setAppState((curr) => ({
          ...curr,
          notificationLogs: [newLog, ...curr.notificationLogs.filter((l) => l.id !== newLog.id)],
        }));
      }
    );
  };

  const handleAssignToStation = (entry: QueueEntry, stationId: number) => {
    const targetStation = appState.stations.find(s => s.id === stationId);
    if (!targetStation) return;

    setAppState((prev) => ({
      ...prev,
      queue: prev.queue.filter(q => q.id !== entry.id),
    }));

    setSelectedStationForTicket(targetStation);
    setIsTicketModalOpen(true);
  };

  const handleRemoveFromQueue = (entryId: string, reason: 'no_show' | 'cancelled') => {
    setAppState((prev) => ({
      ...prev,
      queue: prev.queue.filter(q => q.id !== entryId),
    }));
  };

  // 9. Inscription Client & Parrainage Anti-Fraude
  const handleAddClient = (
    clientData: Omit<Client, 'id' | 'clientCode' | 'loyaltyPoints' | 'freeMinutesBalance' | 'totalPlayMinutes' | 'totalSpentCDF' | 'totalSpentUSD' | 'tier' | 'referralCode' | 'referralCount' | 'totalReferralBonusPoints' | 'createdAt' | 'sessionsHistory' | 'dataConsentAccepted' | 'failedLoginAttempts' | 'pin'>,
    sponsorCode?: string
  ): { success: boolean; message: string } => {
    const phoneExists = appState.clients.some(c => c.phone.trim() === clientData.phone.trim());
    if (phoneExists) {
      return { success: false, message: 'Ce numéro de téléphone est déjà enregistré dans le fichier client.' };
    }

    let sponsor: Client | undefined = undefined;
    if (sponsorCode) {
      sponsor = appState.clients.find(c => c.referralCode.toUpperCase() === sponsorCode.toUpperCase());
      if (!sponsor) {
        return { success: false, message: `Code parrain "${sponsorCode}" introuvable.` };
      }
    }

    const uniqueCode = 'KIN-' + Math.floor(1000 + Math.random() * 9000);
    const referralCode = clientData.fullName.split(' ')[0].toUpperCase() + '243';

    const newClient: Client = {
      ...clientData,
      id: 'cli-' + Date.now(),
      clientCode: uniqueCode,
      pin: '1234',
      loyaltyPoints: 20, // 20 points de bienvenue
      freeMinutesBalance: 0,
      totalPlayMinutes: 0,
      totalSpentCDF: 0,
      totalSpentUSD: 0,
      tier: 'NOUVEAU',
      sessionsHistory: [],
      referralCode,
      referredById: sponsor?.id,
      referredByName: sponsor?.fullName,
      referralCount: 0,
      totalReferralBonusPoints: 0,
      dataConsentAccepted: true,
      failedLoginAttempts: 0,
      createdAt: Date.now(),
    };

    setAppState((prev) => {
      let updatedClients = [newClient, ...prev.clients];
      const newTransactions = [...prev.loyaltyTransactions];

      if (sponsor) {
        const bonus = prev.settings.referralBonusSignup;
        updatedClients = updatedClients.map((c) => {
          if (c.id === sponsor!.id) {
            return {
              ...c,
              loyaltyPoints: c.loyaltyPoints + bonus,
              referralCount: c.referralCount + 1,
              totalReferralBonusPoints: c.totalReferralBonusPoints + bonus,
            };
          }
          return c;
        });

        newTransactions.unshift({
          id: 'lt-' + Date.now(),
          clientId: sponsor.id,
          clientName: sponsor.fullName,
          type: 'REFERRAL_SIGNUP',
          points: bonus,
          description: `Parrainage nouveau joueur : ${newClient.fullName}`,
          createdAt: Date.now(),
        });
      }

      return {
        ...prev,
        clients: updatedClients,
        loyaltyTransactions: newTransactions,
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'INSCRIPTION_CLIENT',
            details: `Nouveau joueur ${newClient.fullName} (${newClient.phone}) inscrit par ${prev.currentUser}${sponsor ? ` (Parrainé par ${sponsor.fullName})` : ''}`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    return { success: true, message: 'Client enregistré avec succès !' };
  };

  // 10. Conversion Points
  const handleConvertPoints = (clientId: string, pointsSpent: number, freeMinutes: number, stationType: 'PS4' | 'PS5') => {
    setAppState((prev) => {
      const client = prev.clients.find(c => c.id === clientId)!;
      const updatedClients = prev.clients.map((c) => {
        if (c.id === clientId) {
          return {
            ...c,
            loyaltyPoints: c.loyaltyPoints - pointsSpent,
            freeMinutesBalance: c.freeMinutesBalance + freeMinutes,
          };
        }
        return c;
      });

      return {
        ...prev,
        clients: updatedClients,
        loyaltyTransactions: [
          {
            id: 'lt-' + Date.now(),
            clientId,
            clientName: client.fullName,
            type: 'SPEND_FREE_TIME',
            points: -pointsSpent,
            description: `Conversion de ${pointsSpent} points en ${freeMinutes}m gratuites (${stationType})`,
            createdAt: Date.now(),
          },
          ...prev.loyaltyTransactions,
        ],
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'CONVERSION_POINTS',
            details: `${pointsSpent} pts convertis en ${freeMinutes}m offertes pour ${client.fullName} par ${prev.currentUser}`,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  // 11. Attribution Manuelle du VIP par l'Administrateur (2.14)
  const handleManualPromoteVIP = (clientId: string, reason: string) => {
    setAppState((prev) => {
      const client = prev.clients.find(c => c.id === clientId);
      if (!client) return prev;

      const updatedClients = prev.clients.map((c) => {
        if (c.id === clientId) {
          return {
            ...c,
            tier: 'VIP' as const,
            isManualVIP: true,
            manualVIPReason: reason,
            tierPromotedAt: Date.now(),
          };
        }
        return c;
      });

      const newHistory: TierHistoryEntry = {
        id: 'th-man-' + Date.now(),
        clientId: client.id,
        clientName: client.fullName,
        date: Date.now(),
        oldTier: client.tier,
        newTier: 'VIP',
        reason: `Attribution manuelle Admin : ${reason}`,
        performedBy: prev.currentUser,
      };

      const newAudit: AuditLog = {
        id: 'aud-' + Date.now(),
        timestamp: Date.now(),
        userRole: prev.currentRole,
        cashierName: prev.currentUser,
        action: 'PROMOTION_MANUELLE_VIP',
        details: `Statut VIP attribué manuellement à ${client.fullName} par ${prev.currentUser}. Motif obligatoire: ${reason}`,
      };

      return {
        ...prev,
        clients: updatedClients,
        tierHistory: [newHistory, ...prev.tierHistory],
        auditLogs: [newAudit, ...prev.auditLogs],
      };
    });
  };

  // 12. Authentification Personnel & Gestion des Utilisateurs
  const handleLoginSuccess = (user: StaffUser, method: 'PIN' | 'PASSWORD' | '2FA') => {
    setAppState((prev) => ({
      ...prev,
      currentStaffUser: user,
      currentUser: user.fullName,
      currentRole: user.role,
      isStaffAuthenticated: true,
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: user.role,
          cashierName: user.fullName,
          action: 'CONNEXION_PERSONNEL',
          details: `Prise de poste de ${user.fullName} via ${method}`,
        },
        ...prev.auditLogs,
      ],
    }));

    if (user.mustChangePassword && !postponedFirstLoginUserIds.includes(user.id)) {
      setFirstLoginPromptUser(user);
    }
  };

  const handleRecordLoginAttempt = (username: string, success: boolean, method: 'PIN' | 'PASSWORD' | '2FA', reason?: string) => {
    const user = appState.staffUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    setAppState((prev) => ({
      ...prev,
      loginLogs: [
        {
          id: 'log-' + Date.now(),
          timestamp: Date.now(),
          username,
          role: user?.role,
          success,
          method,
          ipOrDevice: navigator.userAgent.includes('Mobile') ? 'Tablette / Smartphone Accueil' : 'PC Station Accueil Kinshasa',
          failureReason: reason,
        },
        ...prev.loginLogs,
      ],
    }));
  };

  // Annulation de libération automatique (Fenêtre de 2 minutes - Modification 4)
  const handleUndoAutoRelease = () => {
    if (!undoAutoRelease) return;
    const { stationId, ticket } = undoAutoRelease;

    setAppState((prev) => {
      const updatedStations = prev.stations.map((st) => {
        if (st.id === stationId) {
          return {
            ...st,
            status: 'occupied' as const,
            currentTicketId: ticket.ticketNumber,
            clientName: ticket.clientName,
            clientPhone: ticket.clientPhone,
            remainingSeconds: 300, // 5 minutes de prolongation de secours
            endTime: Date.now() + 300000,
            relayState: true,
            screenRelayState: true,
            currentWatts: st.type === 'PS5' ? 200 : 130,
          };
        }
        return st;
      });

      const updatedTickets = prev.tickets.map((t) => {
        if (t.id === ticket.id) {
          return {
            ...t,
            status: 'active' as const,
            actualEndTime: undefined,
            autoReleaseCancelledAt: Date.now(),
          };
        }
        return t;
      });

      // Rallumer écran et console via MQTT
      mqttGateway.publish(`gaminghub/station/${stationId}/power/set`, 'ON');
      mqttGateway.publish(`gaminghub/station/${stationId}/screen/set`, 'ON');

      return {
        ...prev,
        stations: updatedStations,
        tickets: updatedTickets,
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'ANNULATION_LIBERATION_AUTO',
            details: `Annulation de la libération automatique du Poste ${stationId} (${ticket.clientName}) par le caissier`,
            stationId,
          },
          ...prev.auditLogs,
        ],
      };
    });

    setUndoAutoRelease(null);
  };

  // Gestion du Personnel avec Protections de Suppression & Audit (Modification 5 / Section 2.16)
  const handleDeleteStaff = async (userId: string, adminPasswordConfirm: string): Promise<{ success: boolean; message: string }> => {
    // 1. Vérification mot de passe admin (côté serveur scrypt ou PIN)
    const currentAdmin = appState.currentStaffUser;
    let isServerValid = false;
    try {
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentAdmin?.username || 'admin',
          password: adminPasswordConfirm,
        }),
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData.hasRecord) {
          isServerValid = Boolean(verifyData.valid);
        }
      }
    } catch {
      // Fallback local hors-ligne
    }

    const isPinOrLocalMatch =
      currentAdmin &&
      (currentAdmin.pin === adminPasswordConfirm ||
        (!currentAdmin.passwordHash.startsWith('scrypt$') && currentAdmin.passwordHash === adminPasswordConfirm));

    if (!isServerValid && !isPinOrLocalMatch) {
      return { success: false, message: 'Mot de passe administrateur incorrect.' };
    }

    // 2. Protection : Ne peut pas se supprimer soi-même
    if (currentAdmin && currentAdmin.id === userId) {
      return { success: false, message: 'Protection : vous ne pouvez pas supprimer votre propre compte administrateur actuellement connecté.' };
    }

    const userToDelete = appState.staffUsers.find((u) => u.id === userId);
    if (!userToDelete) {
      return { success: false, message: 'Utilisateur introuvable.' };
    }

    // 3. Protection : Ne peut pas supprimer le dernier administrateur actif
    if (userToDelete.role === 'ADMIN' && userToDelete.isActive && !userToDelete.isArchived) {
      const activeAdminsCount = appState.staffUsers.filter((u) => u.role === 'ADMIN' && u.isActive && !u.isArchived).length;
      if (activeAdminsCount <= 1) {
        return { success: false, message: 'Protection système : impossible de supprimer ou d\'archiver le dernier administrateur actif de la salle.' };
      }
    }

    // 4. Protection : Ne peut pas supprimer un utilisateur avec une caisse ouverte
    if (appState.currentShift.status === 'OPEN' && appState.currentShift.cashierId === userId) {
      return { success: false, message: 'Impossible de supprimer cet utilisateur : il a un shift de caisse actuellement ouvert. Clôturez sa caisse d\'abord.' };
    }

    // 5. Protection d'Audit : Si l'utilisateur a émis des tickets, ARCHIVAGE sans suppression
    const hasIssuedTickets = appState.tickets.some(
      (t) =>
        t.cashierId === userId ||
        (t.cashierName &&
          (t.cashierName.toLowerCase().includes(userToDelete.username.toLowerCase()) ||
            t.cashierName.toLowerCase().includes(userToDelete.fullName.toLowerCase())))
    );

    if (hasIssuedTickets) {
      // ARCHIVAGE
      setAppState((prev) => ({
        ...prev,
        staffUsers: prev.staffUsers.map((u) => (u.id === userId ? { ...u, isArchived: true, isActive: false } : u)),
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'ARCHIVAGE_COMPTE_PERSONNEL',
            details: `Utilisateur @${userToDelete.username} (${userToDelete.fullName}) archivé et révoqué pour préserver l'audit comptable.`,
          },
          ...prev.auditLogs,
        ],
      }));
      return {
        success: true,
        message: `L'utilisateur @${userToDelete.username} a émis des tickets historiques. Son compte a été ARCHIVÉ et révoqué immédiatement, préservant la traçabilité comptable.`,
      };
    } else {
      // SUPPRESSION DÉFINITIVE (0 ticket)
      setAppState((prev) => ({
        ...prev,
        staffUsers: prev.staffUsers.filter((u) => u.id !== userId),
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'SUPPRESSION_COMPTE_PERSONNEL',
            details: `Utilisateur @${userToDelete.username} (${userToDelete.fullName}) définitivement supprimé (0 ticket émis).`,
          },
          ...prev.auditLogs,
        ],
      }));
      return {
        success: true,
        message: `L'utilisateur @${userToDelete.username} a été définitivement supprimé.`,
      };
    }
  };

  const handleUpdateStaffRole = (userId: string, newRole: StaffRole) => {
    const userToEdit = appState.staffUsers.find((u) => u.id === userId);
    if (!userToEdit) return;

    if (userToEdit.role === 'ADMIN' && newRole !== 'ADMIN') {
      const activeAdminsCount = appState.staffUsers.filter((u) => u.role === 'ADMIN' && u.isActive && !u.isArchived).length;
      if (activeAdminsCount <= 1) {
        alert('Protection système : impossible de rétrograder le dernier administrateur actif.');
        return;
      }
    }

    setAppState((prev) => ({
      ...prev,
      staffUsers: prev.staffUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'MODIFICATION_ROLE_PERSONNEL',
          details: `Rôle de @${userToEdit.username} modifié de ${userToEdit.role} vers ${newRole} par ${prev.currentUser}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleClientCreatePin = (clientId: string, newPin: string) => {
    setAppState((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === clientId ? { ...c, pin: newPin } : c)),
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: 'CLIENT',
          cashierName: 'Espace Client',
          action: 'CREATION_CODE_PIN_CLIENT',
          details: `Code PIN créé par le client ID ${clientId}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleClientUpdateAvatar = (clientId: string, avatarUrl?: string) => {
    setAppState((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === clientId ? { ...c, avatarUrl } : c)),
    }));
  };

  const handleToggleClientPortal = (clientId: string, disabled: boolean, reason?: string) => {
    setAppState((prev) => {
      const target = prev.clients.find((c) => c.id === clientId);
      return {
        ...prev,
        clients: prev.clients.map((c) =>
          c.id === clientId
            ? {
                ...c,
                portalDisabled: disabled,
                portalDisabledReason: disabled ? reason : undefined,
                portalDisabledAt: disabled ? Date.now() : undefined,
              }
            : c
        ),
        activeCustomerPortalClientId:
          disabled && prev.activeCustomerPortalClientId === clientId
            ? null
            : prev.activeCustomerPortalClientId,
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: disabled ? 'DESACTIVATION_ESPACE_CLIENT' : 'REACTIVATION_ESPACE_CLIENT',
            details: `Espace client de ${target?.fullName || clientId} ${
              disabled ? 'désactivé' : 'réactivé'
            } par ${prev.currentUser}`,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleAddStation = (stationConfig: {
    name: string;
    type: 'PS4' | 'PS5';
    hardwareType: DomotiqueDevice['hardwareType'];
    ipAddress: string;
  }) => {
    setAppState((prev) => {
      const nextId = Math.max(0, ...prev.stations.map((s) => s.id)) + 1;
      const nowTs = Date.now();
      const relayTopic = `gaminghub/station/${nextId}/power`;
      const finalName = stationConfig.name.trim() || `Poste ${nextId}`;

      const newStation: Station = {
        id: nextId,
        name: finalName,
        type: stationConfig.type,
        status: 'available',
        remainingSeconds: 0,
        totalDurationMinutes: 0,
        relayState: false,
        screenRelayState: false,
        currentWatts: 0,
        totalKWh: 0,
        relayTopic,
        lastUpdated: nowTs,
      };

      const newDevice: DomotiqueDevice = {
        id: `dev-st-${nextId}-${nowTs}`,
        stationId: nextId,
        name: `Console + TV (${finalName})`,
        type: 'STATION_CONSOLE_TV',
        relayTopic,
        state: 'OFF',
        watts: 0,
        totalKWh: 0,
        isOnline: true,
        hardwareType: stationConfig.hardwareType,
        ipAddress: stationConfig.ipAddress.trim() || `192.168.1.${100 + nextId}`,
      };

      return {
        ...prev,
        stations: [...prev.stations, newStation],
        domotiqueDevices: [...prev.domotiqueDevices, newDevice],
        auditLogs: [
          {
            id: 'aud-' + nowTs,
            timestamp: nowTs,
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'AJOUT_STATION',
            details: `Nouvelle station "${finalName}" (${stationConfig.type}, ${stationConfig.hardwareType}, IP ${newDevice.ipAddress}) ajoutée par ${prev.currentUser}`,
            stationId: nextId,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleRemoveCustomStation = (stationId: number) => {
    if (stationId <= 10) return;
    setAppState((prev) => {
      const target = prev.stations.find((s) => s.id === stationId);
      if (!target || target.status !== 'available') return prev;
      return {
        ...prev,
        stations: prev.stations.filter((s) => s.id !== stationId),
        domotiqueDevices: prev.domotiqueDevices.filter((d) => d.stationId !== stationId),
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'SUPPRESSION_STATION',
            details: `Station personnalisée "${target.name}" (P${stationId}) supprimée par ${prev.currentUser}`,
            stationId,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  // 13. Ventes Snacks & Boissons (avec reçu thermique imprimable)
  const handleRecordSnackSale = (item: SnackItem, quantity: number, paymentMethod: PaymentMethod) => {
    setAppState((prev) => {
      const totalCDF = item.priceCDF * quantity;
      const totalUSD = item.priceUSD * quantity;
      const receiptNumber = `SNK-${new Date().getFullYear()}-${String((prev.snackSales?.length || 0) + 1).padStart(3, '0')}`;

      const sale: SnackSale = {
        id: 'sale-' + Date.now(),
        receiptNumber,
        shiftId: prev.currentShift.id,
        itemName: item.name,
        quantity,
        items: [
          {
            itemId: item.id,
            itemName: item.name,
            quantity,
            unitPriceCDF: item.priceCDF,
            unitPriceUSD: item.priceUSD,
            totalCDF,
            totalUSD,
          },
        ],
        totalCDF,
        totalUSD,
        paymentMethod,
        timestamp: Date.now(),
        cashierName: prev.currentUser,
      };

      const updatedSnackItems = prev.snackItems.map((s) => {
        if (s.id === item.id) {
          return { ...s, stockQuantity: Math.max(0, s.stockQuantity - quantity) };
        }
        return s;
      });

      const updatedShift: CashShift = {
        ...prev.currentShift,
        expectedCashCDF: prev.currentShift.expectedCashCDF + (paymentMethod === 'CASH_CDF' ? totalCDF : 0),
        expectedCashUSD: prev.currentShift.expectedCashUSD + (paymentMethod === 'CASH_USD' ? totalUSD : 0),
        totalIllicoCashCDF: (prev.currentShift.totalIllicoCashCDF || 0) + (paymentMethod === 'ILLICO_CASH' ? totalCDF : 0),
        totalIllicoCashUSD: (prev.currentShift.totalIllicoCashUSD || 0) + (paymentMethod === 'ILLICO_CASH' ? totalUSD : 0),
        totalMomoCDF: prev.currentShift.totalMomoCDF + (['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY'].includes(paymentMethod) ? totalCDF : 0),
        totalMomoUSD: prev.currentShift.totalMomoUSD + (['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY'].includes(paymentMethod) ? totalUSD : 0),
        totalSnacksCDF: prev.currentShift.totalSnacksCDF + totalCDF,
        totalSnacksUSD: prev.currentShift.totalSnacksUSD + totalUSD,
      };

      return {
        ...prev,
        snackItems: updatedSnackItems,
        snackSales: [sale, ...prev.snackSales],
        currentShift: updatedShift,
      };
    });
  };

  const handleRecordSnackCartSale = (
    cartItems: Array<{ item: SnackItem; qty: number }>,
    paymentMethod: PaymentMethod
  ): SnackSale => {
    const detailedItems: SnackSaleItemDetail[] = cartItems.map(({ item, qty }) => ({
      itemId: item.id,
      itemName: item.name,
      quantity: qty,
      unitPriceCDF: item.priceCDF,
      unitPriceUSD: item.priceUSD,
      totalCDF: item.priceCDF * qty,
      totalUSD: item.priceUSD * qty,
    }));

    const totalCDF = detailedItems.reduce((sum, it) => sum + it.totalCDF, 0);
    const totalUSD = detailedItems.reduce((sum, it) => sum + it.totalUSD, 0);
    const totalQty = detailedItems.reduce((sum, it) => sum + it.quantity, 0);
    const receiptNumber = `SNK-${new Date().getFullYear()}-${String((appState.snackSales?.length || 0) + 1).padStart(3, '0')}`;
    const summaryLabel =
      detailedItems.length === 1
        ? detailedItems[0].itemName
        : `${detailedItems[0].itemName} + ${detailedItems.length - 1} autre(s)`;

    const createdSale: SnackSale = {
      id: 'sale-' + Date.now(),
      receiptNumber,
      shiftId: appState.currentShift.id,
      itemName: summaryLabel,
      quantity: totalQty,
      items: detailedItems,
      totalCDF,
      totalUSD,
      paymentMethod,
      timestamp: Date.now(),
      cashierName: appState.currentUser,
    };

    setAppState((prev) => {
      const qtyById = new Map<string, number>();
      cartItems.forEach(({ item, qty }) => qtyById.set(item.id, qty));

      const updatedSnackItems = prev.snackItems.map((s) => {
        const sold = qtyById.get(s.id) || 0;
        if (sold > 0) {
          return { ...s, stockQuantity: Math.max(0, s.stockQuantity - sold) };
        }
        return s;
      });

      const updatedShift: CashShift = {
        ...prev.currentShift,
        expectedCashCDF: prev.currentShift.expectedCashCDF + (paymentMethod === 'CASH_CDF' ? totalCDF : 0),
        expectedCashUSD: prev.currentShift.expectedCashUSD + (paymentMethod === 'CASH_USD' ? totalUSD : 0),
        totalIllicoCashCDF: (prev.currentShift.totalIllicoCashCDF || 0) + (paymentMethod === 'ILLICO_CASH' ? totalCDF : 0),
        totalIllicoCashUSD: (prev.currentShift.totalIllicoCashUSD || 0) + (paymentMethod === 'ILLICO_CASH' ? totalUSD : 0),
        totalMomoCDF: prev.currentShift.totalMomoCDF + (['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY'].includes(paymentMethod) ? totalCDF : 0),
        totalMomoUSD: prev.currentShift.totalMomoUSD + (['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY'].includes(paymentMethod) ? totalUSD : 0),
        totalSnacksCDF: prev.currentShift.totalSnacksCDF + totalCDF,
        totalSnacksUSD: prev.currentShift.totalSnacksUSD + totalUSD,
      };

      const audit: AuditLog = {
        id: 'aud-' + Date.now(),
        timestamp: Date.now(),
        userRole: prev.currentRole,
        cashierName: prev.currentUser,
        action: 'VENTE_BOISSON_SNACK',
        details: `Reçu ${receiptNumber} (${totalQty} article(s) · ${totalCDF.toLocaleString()} FC via ${paymentMethod}) par ${prev.currentUser}`,
      };

      return {
        ...prev,
        snackItems: updatedSnackItems,
        snackSales: [createdSale, ...prev.snackSales],
        currentShift: updatedShift,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });

    return createdSale;
  };

  // 14. Clôture & Ouverture Shift (2.13)
  const handleCloseShift = (countedCDF: number, countedUSD: number, notes?: string) => {
    setAppState((prev) => {
      const closedShift: CashShift = {
        ...prev.currentShift,
        closedAt: Date.now(),
        closingCashCDF: countedCDF,
        closingCashUSD: countedUSD,
        notes,
        status: 'CLOSED',
      };

      return {
        ...prev,
        currentShift: closedShift,
        shiftHistory: [closedShift, ...prev.shiftHistory],
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'CLOTURE_CAISSE',
            details: `Clôture de caisse par ${prev.currentUser} : Compté ${countedCDF.toLocaleString()} FC (Attendu ${prev.currentShift.expectedCashCDF.toLocaleString()} FC)`,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleOpenNewShift = (openingFloatCDF: number, openingFloatUSD: number) => {
    setAppState((prev) => ({
      ...prev,
      currentShift: {
        id: 'shift-' + Date.now(),
        cashierName: prev.currentUser,
        cashierId: prev.currentStaffUser?.id,
        openedAt: Date.now(),
        openingFloatCDF,
        openingFloatUSD,
        expectedCashCDF: openingFloatCDF,
        expectedCashUSD: openingFloatUSD,
        totalIllicoCashCDF: 0,
        totalIllicoCashUSD: 0,
        totalMomoCDF: 0,
        totalMomoUSD: 0,
        totalSnacksCDF: 0,
        totalSnacksUSD: 0,
        status: 'OPEN',
      },
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'OUVERTURE_NOUVEAU_SHIFT',
          details: `Prise de service par ${prev.currentUser} avec fond ${openingFloatCDF.toLocaleString()} FC et $${openingFloatUSD}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  // 15. Export JSON & CSV
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kin_gaming_hub_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = 'ID,Ticket,Poste,Type,Client,Telephone,Duree_Min,Montant_CDF,Montant_USD,Paiement,Caissier,Statut,Date\n';
    const rows = appState.tickets
      .map(t => `${t.id},${t.ticketNumber},Poste ${t.stationId},${t.stationType},"${t.clientName}","${t.clientPhone || ''}",${t.durationMinutes},${t.amountCDF},${t.amountUSD},${t.paymentMethod},"${t.cashierName}",${t.status},${new Date(t.createdAt).toISOString()}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kin_gaming_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // 16. Réglages Administrateur (Section 2.18)
  const handleSaveAdminSettings = async (
    updatedSettings: SystemSettings,
    historyEntry: Omit<SettingsHistoryEntry, 'id' | 'timestamp'>,
    scheduledFor?: number
  ) => {
    // Vérification côté serveur de l'autorisation RBAC
    try {
      const res = await fetch('/api/settings/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': appState.currentStaffUser?.role || 'CAISSIER',
        },
        body: JSON.stringify({
          settings: updatedSettings,
          section: historyEntry.section,
          reason: historyEntry.reason,
        }),
      });

      if (!res.ok && res.status === 403) {
        alert('Erreur serveur HTTP 403 : Accès interdit. Seul l\'administrateur peut modifier les réglages.');
        return;
      }
    } catch {
      // Résilience hors-ligne
    }

    const newHistEntry: SettingsHistoryEntry = {
      ...historyEntry,
      id: 'set-hist-' + Date.now(),
      timestamp: Date.now(),
    };

    if (scheduledFor && scheduledFor > Date.now()) {
      const newSched: ScheduledSettingChange = {
        id: 'sched-' + Date.now(),
        createdAt: Date.now(),
        scheduledFor,
        section: historyEntry.section,
        settingKey: historyEntry.settingKey,
        label: historyEntry.label,
        newValue: historyEntry.newValue,
        oldValue: historyEntry.oldValue,
        author: historyEntry.modifiedBy,
        reason: historyEntry.reason,
        applied: false,
      };

      setAppState((prev) => ({
        ...prev,
        scheduledSettings: [newSched, ...(prev.scheduledSettings || [])],
        settingsHistory: [newHistEntry, ...(prev.settingsHistory || [])],
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'PROGRAMMATION_REGLAGE',
            details: `Modification programmée pour le ${new Date(scheduledFor).toLocaleString('fr-FR')} : ${historyEntry.label}`,
          },
          ...prev.auditLogs,
        ],
      }));
    } else {
      setAppState((prev) => {
        const rounding = updatedSettings.cdfRoundingRule || 100;
        const rateChanged = updatedSettings.exchangeRate !== prev.settings.exchangeRate;
        const updatedPlans = rateChanged
          ? prev.pricingPlans.map((plan) => ({
              ...plan,
              priceCDF: Math.max(100, Math.round((plan.priceUSD * updatedSettings.exchangeRate) / rounding) * rounding),
            }))
          : prev.pricingPlans;

        const overrides = updatedSettings.stationSpecificOverrides || {};
        const updatedStations = prev.stations.map((st) => {
          const ov = overrides[st.id];
          if (!ov) return st;
          return {
            ...st,
            name: ov.customName?.trim() ? ov.customName.trim() : st.name,
            status: ov.disabled ? 'maintenance' : (st.status === 'maintenance' && !ov.disabled ? 'available' : st.status),
          };
        });

        return {
          ...prev,
          stations: updatedStations,
          pricingPlans: updatedPlans,
          settings: {
            ...updatedSettings,
            rateLastUpdatedAt: rateChanged ? Date.now() : prev.settings.rateLastUpdatedAt,
          },
          settingsHistory: [newHistEntry, ...(prev.settingsHistory || [])],
          auditLogs: [
            {
              id: 'aud-' + Date.now(),
              timestamp: Date.now(),
              userRole: prev.currentRole,
              cashierName: prev.currentUser,
              action: 'MODIFICATION_REGLAGES',
              details: `Section ${historyEntry.section} modifiée par ${prev.currentUser} ${historyEntry.reason ? `(Motif: ${historyEntry.reason})` : ''}`,
            },
            ...prev.auditLogs,
          ],
        };
      });
    }
  };

  const handleCancelScheduledSetting = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      scheduledSettings: (prev.scheduledSettings || []).filter((s) => s.id !== id),
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'ANNULATION_REGLAGE_PROGRAMME',
          details: `Modification programmée ID ${id} annulée par ${prev.currentUser}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleExportConfigJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState.settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kin_gaming_hub_config_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportConfigJSON = (importedSettings: SystemSettings) => {
    setAppState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...importedSettings },
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'IMPORT_CONFIGURATION',
          details: `Restauration de configuration système depuis JSON par ${prev.currentUser}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  // Section F : Blocage des comptes après 5 échecs ou manuellement par l'admin
  const handleBlockUser = (userId: string, reason?: string) => {
    setAppState((prev) => {
      const targetUser = prev.staffUsers.find((u) => u.id === userId);
      const isCurrentSessionUser = prev.currentStaffUser?.id === userId;
      const blockDetails = reason || "Bloqué manuellement par l'administrateur";

      const updatedUsers = prev.staffUsers.map((u) =>
        u.id === userId
          ? {
              ...u,
              isBlocked: true,
              blockReason: blockDetails,
              blockedAt: Date.now(),
            }
          : u
      );

      const newAuditLogs: AuditLog[] = [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'BLOCAGE_COMPTE',
          details: `Compte @${targetUser?.username || userId} bloqué (${blockDetails}) par ${prev.currentUser}`,
        },
        ...(isCurrentSessionUser
          ? [
              {
                id: 'aud-' + (Date.now() + 1),
                timestamp: Date.now() + 1,
                userRole: prev.currentRole,
                cashierName: prev.currentUser,
                action: 'DECONNEXION_FORCEE_BLOCAGE',
                details: `Déconnexion forcée immédiate : compte @${targetUser?.username || userId} bloqué en cours de session`,
              },
            ]
          : []),
        ...prev.auditLogs,
      ];

      return {
        ...prev,
        staffUsers: updatedUsers,
        currentStaffUser: isCurrentSessionUser ? null : prev.currentStaffUser,
        isStaffAuthenticated: isCurrentSessionUser ? false : prev.isStaffAuthenticated,
        auditLogs: newAuditLogs,
      };
    });

    if (appState.currentStaffUser?.id === userId) {
      setActiveTab('login');
    }
  };

  const handleUnblockUser = (userId: string) => {
    setAppState((prev) => {
      const targetUser = prev.staffUsers.find((u) => u.id === userId);
      return {
        ...prev,
        staffUsers: prev.staffUsers.map((u) =>
          u.id === userId
            ? {
                ...u,
                isBlocked: false,
                failedAttempts: 0,
                lockedUntil: undefined,
                blockReason: undefined,
                blockedAt: undefined,
              }
            : u
        ),
        auditLogs: [
          {
            id: 'aud-' + Date.now(),
            timestamp: Date.now(),
            userRole: prev.currentRole,
            cashierName: prev.currentUser,
            action: 'DEBLOCAGE_COMPTE',
            details: `Compte @${targetUser?.username || userId} débloqué par l'administrateur (${prev.currentUser})`,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  const handleUpdateUserAttempts = (userId: string, count: number, lockedUntil?: number) => {
    setAppState((prev) => ({
      ...prev,
      staffUsers: prev.staffUsers.map((u) =>
        u.id === userId ? { ...u, failedAttempts: count, lockedUntil } : u
      ),
    }));
  };

  // Postes occupés vs libres
  const occupiedCount = appState.stations.filter(s => s.status === 'occupied').length;
  const availableCount = appState.stations.filter(s => s.status === 'available').length;
  const ps4TotalCount = appState.stations.filter(s => s.type === 'PS4').length;
  const ps5TotalCount = appState.stations.filter(s => s.type === 'PS5').length;
  const waitingCount = appState.queue.filter(q => q.status === 'waiting' || q.status === 'called').length;

  const handleStaffLogout = () => {
    setAppState((prev) => ({
      ...prev,
      isStaffAuthenticated: false,
      currentStaffUser: null,
      activeCustomerPortalClientId: null,
      auditLogs: [
        {
          id: 'aud-' + Date.now(),
          timestamp: Date.now(),
          userRole: prev.currentRole,
          cashierName: prev.currentUser,
          action: 'DECONNEXION_SESSION',
          details: `Déconnexion manuelle de ${prev.currentUser} (${prev.currentRole})`,
        },
        ...prev.auditLogs,
      ],
    }));
    setActiveTab('login');
  };

  const handleUpdatePageBackground = (backgroundUrl: string, opacity: number) => {
    setAppState((prev) => {
      const urlChanged = prev.settings.pageBackgroundUrl !== backgroundUrl;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          pageBackgroundUrl: backgroundUrl,
          pageBackgroundOpacity: opacity,
        },
        auditLogs: urlChanged
          ? [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: prev.currentRole,
                cashierName: prev.currentUser,
                action: 'MODIFICATION_ARRIERE_PLAN',
                details:
                  backgroundUrl === DEFAULT_PAGE_BACKGROUND_URL
                    ? `Image d'arrière-plan par défaut rétablie par ${prev.currentUser}`
                    : `Nouvelle image d'arrière-plan globale appliquée par ${prev.currentUser} (opacité ${Math.round(opacity * 100)}%)`,
              },
              ...prev.auditLogs,
            ]
          : prev.auditLogs,
      };
    });
  };

  const resolvedBackgroundUrl = appState.settings.pageBackgroundUrl ?? DEFAULT_PAGE_BACKGROUND_URL;
  const resolvedBackgroundOpacity =
    typeof appState.settings.pageBackgroundOpacity === 'number'
      ? appState.settings.pageBackgroundOpacity
      : DEFAULT_PAGE_BACKGROUND_OPACITY;

  const renderGlobalBackground = () => {
    if (!resolvedBackgroundUrl || resolvedBackgroundOpacity <= 0) return null;
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {resolvedBackgroundUrl === DEFAULT_PAGE_BACKGROUND_URL ? (
          <picture>
            <source srcSet="/assets/aistudio/kin_gaming_hub_bg_opt.webp" type="image/webp" />
            <img
              src={DEFAULT_PAGE_BACKGROUND_URL}
              alt=""
              style={{ opacity: resolvedBackgroundOpacity }}
              className="w-full h-full object-cover object-center select-none"
            />
          </picture>
        ) : (
          <img
            src={resolvedBackgroundUrl}
            alt=""
            style={{ opacity: resolvedBackgroundOpacity }}
            className="w-full h-full object-cover object-center select-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090D16]/40 via-transparent to-[#090D16]/60" />
      </div>
    );
  };

  // Vue isolée Espace Client (le joueur ne voit strictement que ses informations et rien d'autre)
  if (activeTab === 'customer_portal' && !verificationToken) {
    return (
      <div className="relative min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans overflow-x-hidden">
        {renderGlobalBackground()}
        <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Gamepad2 className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white">Kin Gaming Hub</span>
                <div className="text-[10px] text-amber-400 font-mono font-bold tracking-wider">
                  ESPACE CLIENT PERSONNEL
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setAppState((prev) => ({ ...prev, activeCustomerPortalClientId: null }));
                setActiveTab('login');
              }}
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto p-4 lg:p-6">
          <CustomerPortalView
            clients={appState.clients}
            queue={appState.queue}
            tierRules={appState.tierRules}
            initialClientId={appState.activeCustomerPortalClientId}
            onLogout={() => {
              setAppState((prev) => ({ ...prev, activeCustomerPortalClientId: null }));
              setActiveTab('login');
            }}
            onClientCreatePin={handleClientCreatePin}
            onClientUpdateAvatar={handleClientUpdateAvatar}
          />
        </main>
      </div>
    );
  }

  // Vue d'accueil & Connexion dédiée selon la maquette (et garde-fou pour sessions staff)
  if (activeTab === 'login' || (!appState.isStaffAuthenticated && !verificationToken)) {
    return (
      <LoginLandingView
        staffUsers={appState.staffUsers}
        clients={appState.clients}
        admin2FAEnforced={appState.settings.admin2FAEnforced ?? false}
        backgroundImageUrl={appState.settings.pageBackgroundUrl}
        onBlockUserAccount={handleBlockUser}
        onUpdateUserAttempts={handleUpdateUserAttempts}
        onRecordLoginAttempt={(username, success, method, reason) => {
          const userObj = appState.staffUsers.find((u) => u.username === username);
          const newLog = {
            id: 'log-' + Date.now(),
            timestamp: Date.now(),
            username,
            role: userObj?.role,
            success,
            method,
            ipOrDevice: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')
              ? 'Navigateur Mobile (Gombe)'
              : 'Poste Caisse Principal (Chrome Desktop)',
            failureReason: reason,
          };
          setAppState((prev) => ({
            ...prev,
            loginLogs: [newLog, ...(prev.loginLogs || [])],
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: (userObj?.role || 'CAISSIER') as any,
                cashierName: username,
                action: success ? 'CONNEXION_STAFF_REUSSIE' : 'CONNEXION_STAFF_ECHOUEE',
                details: `${success ? 'Connexion validée' : 'Échec de connexion'} via ${method} ${reason ? `· ${reason}` : ''}`,
              },
              ...prev.auditLogs,
            ],
          }));
        }}
        onStaffLogin={(user, method) => {
          setAppState((prev) => ({
            ...prev,
            currentStaffUser: user,
            currentUser: user.fullName,
            currentRole: user.role,
            isStaffAuthenticated: true,
            staffUsers: prev.staffUsers.map((u) =>
              u.id === user.id
                ? {
                    ...u,
                    lastLoginAt: Date.now(),
                    failedAttempts: 0,
                    avatarUrl: user.avatarUrl || u.avatarUrl,
                  }
                : u
            ),
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: user.role,
                cashierName: user.fullName,
                action: 'PRISE_DE_POSTE',
                details: `Prise de poste / ouverture de session par ${user.fullName} (${user.role}) via ${method}`,
              },
              ...prev.auditLogs,
            ],
          }));
          if (user.mustChangePassword && !postponedFirstLoginUserIds.includes(user.id)) {
            setFirstLoginPromptUser(user);
          }
          setActiveTab('stations');
        }}
        onClientLogin={(client) => {
          setAppState((prev) => ({
            ...prev,
            activeCustomerPortalClientId: client.id,
          }));
          setActiveTab('customer_portal');
        }}
        onExploreCockpit={() => setActiveTab('stations')}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {renderGlobalBackground()}
      {/* En-tête Global Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={appState.settings}
        setSettings={(val: any) => {
          setAppState(prev => ({
            ...prev,
            settings: typeof val === 'function' ? val(prev.settings) : val,
          }));
        }}
        stations={appState.stations}
        currentStaffUser={appState.currentStaffUser}
        onLockSession={() => {
          setAppState(prev => ({ ...prev, isStaffAuthenticated: false }));
          setActiveTab('login');
        }}
        onLogout={handleStaffLogout}
        onOpenTierSettings={() => setIsTierSettingsOpen(true)}
        onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
        onOpenWhatsAppConfig={() => setIsWhatsAppConfigOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isOnline={isOnline}
        isInstallable={isInstallable}
        onInstall={handleInstallApp}
        waitingCount={waitingCount}
      />

      {/* Bannière d'Annulation de Libération Automatique (2 minutes - Modification 4) */}
      {undoAutoRelease && undoAutoRelease.expiresAt > Date.now() && (
        <div className="bg-amber-500/25 border-b border-amber-500/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold text-white text-sm">
                Session Poste {undoAutoRelease.stationId} libérée automatiquement (0 min atteinte).
              </span>
              <p className="text-[11px] text-amber-300">
                Client : <strong>{undoAutoRelease.ticket.clientName}</strong> · Extinction dans {appState.settings.autoReleaseGraceSeconds}s. Vous pouvez annuler cette libération pour redonner la main au joueur.
              </p>
            </div>
          </div>
          <button
            onClick={handleUndoAutoRelease}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center gap-2 shadow-lg transition transform hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Annuler la libération (Restaurer la session)</span>
          </button>
        </div>
      )}

      {/* Bannière Alerte 1 Minute Restante */}
      {oneMinuteWarnings.length > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              Alerte Fin Imminente (&lt; 1 min) : {oneMinuteWarnings.map(w => `Poste ${w.stationId} (${w.clientName})`).join(' · ')}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Libération automatique à 0m</span>
        </div>
      )}

      {/* Alerte Caissier Notification WhatsApp Échouée */}
      {cashierAlertBanner && (
        <div className="bg-rose-500/25 border-b border-rose-500/50 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-semibold">{cashierAlertBanner}</span>
          </div>
          <button
            onClick={() => setCashierAlertBanner(null)}
            className="text-slate-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bannière Hors-Ligne Résilience */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-200 font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>
            Mode Hors-Ligne Actif — Enregistrement local résilient aux délestages et synchronisation en arrière-plan.
          </span>
        </div>
      )}

      {/* Notification de Célébration Promotion Statut */}
      {promotionCelebration && (
        <div className="bg-gradient-to-r from-amber-500/30 via-amber-500/20 to-transparent border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between text-xs animate-bounce">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Félicitations ! {promotionCelebration.clientName} vient de passer au rang {promotionCelebration.newTier} !</span>
          </div>
          <button
            onClick={() => setPromotionCelebration(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Contenu Principal */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Vue Publique Vérification de Ticket (Modification 2) */}
        {verificationToken ? (
          <PublicTicketVerificationView
            token={verificationToken}
            tickets={appState.tickets}
            stations={appState.stations}
            isStaffAuthenticated={appState.isStaffAuthenticated}
            onOpenCustomerPortal={(clientId) => {
              setVerificationToken(null);
              setActiveTab('customer_portal');
            }}
            onOpenStaffTicketAction={(ticket) => {
              setVerificationToken(null);
              setCurrentPrintingTicket(ticket);
            }}
          />
        ) : (
          <>
            {/* Onglet 1 : Tableau de bord 10 Postes Live */}
            {activeTab === 'stations' && (
              <div className="space-y-4">
                {/* Bannière Dual-Entry Accueil (Modification 3) */}
                <div className="bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-mono">
                      <span>Salle de Jeux Vidéo Kinshasa</span>
                      <span>·</span>
                      <span>{ps4TotalCount} PS4 &amp; {ps5TotalCount} PS5</span>
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Kin Gaming Hub — Système Intégré &amp; Domotique
                    </h1>
                    <p className="text-xs text-slate-400">
                      Choisissez votre accès : Espace Joueur (points, temps, file) ou Espace Personnel (caisse &amp; postes).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      onClick={() => setActiveTab('customer_portal')}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/30 transition transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-slate-950" />
                      <div className="text-left">
                        <div className="leading-tight font-black">Espace Client</div>
                        <div className="text-[10px] text-slate-900 font-semibold">Points, Rang &amp; File d&apos;attente</div>
                      </div>
                    </button>

                    {appState.currentStaffUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
                      >
                        <Sliders className="w-4 h-4 text-white" />
                        <div className="text-left">
                          <div className="leading-tight font-black">Configuration Admin</div>
                          <div className="text-[10px] text-rose-100 font-semibold">Tarifs PS4/PS5, Taux $, Règles</div>
                        </div>
                      </button>
                    )}

                    {!appState.isStaffAuthenticated && (
                      <button
                        onClick={() => setActiveTab('login')}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-700 shadow transition transform hover:-translate-y-0.5 cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-blue-400" />
                        <div className="text-left">
                          <div className="leading-tight font-black">Connexion Personnel</div>
                          <div className="text-[10px] text-slate-400 font-normal">Caissier, Gérant &amp; Admin</div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-300">Libres :</span>
                      <span className="font-mono font-bold text-emerald-400">{availableCount} / {appState.stations.length}</span>
                    </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-slate-300">En jeu :</span>
                  <span className="font-mono font-bold text-blue-400">{occupiedCount} / {appState.stations.length}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-slate-300">File d'attente :</span>
                  <span className="font-mono font-bold text-amber-400">{waitingCount}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Caissier en service : <strong className="text-white">{appState.currentUser}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {appState.stations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  onOpenTicket={handleOpenTicket}
                  onExtend={handleExtend}
                  onTransfer={handleTransfer}
                  onEndSession={handleEndSession}
                  onToggleMaintenance={handleToggleMaintenance}
                  onTogglePower={handleTogglePower}
                />
              ))}
            </div>
          </div>
        )}

        {/* Onglet 2 : Billetterie & Tickets */}
        {activeTab === 'tickets' && (
          <TicketsView
            tickets={appState.tickets}
            stations={appState.stations}
            onPrintTicket={(ticket) => setCurrentPrintingTicket(ticket)}
            onRefundTicket={(ticketId) => {
              if (confirm('Voulez-vous annuler et rembourser ce ticket ?')) {
                setAppState(prev => ({
                  ...prev,
                  tickets: prev.tickets.map(t => t.id === ticketId ? { ...t, status: 'refunded' as const } : t),
                  auditLogs: [
                    {
                      id: 'aud-' + Date.now(),
                      timestamp: Date.now(),
                      userRole: prev.currentRole,
                      cashierName: prev.currentUser,
                      action: 'REMBOURSEMENT_TICKET',
                      details: `Ticket ${ticketId} annulé et remboursé par ${prev.currentUser}`,
                    },
                    ...prev.auditLogs,
                  ],
                }));
              }
            }}
          />
        )}

        {/* Onglet 3 : File d'attente */}
        {activeTab === 'queue' && (
          <QueueView
            queue={appState.queue}
            stations={appState.stations}
            onAddToQueue={handleAddToQueue}
            onCallClient={handleCallQueueClient}
            onAssignToStation={handleAssignToStation}
            onRemoveFromQueue={handleRemoveFromQueue}
            onSendWhatsAppDirect={handleSendWhatsAppDirect}
          />
        )}

        {/* Onglet 4 : Fidélité, Statuts & Parrainage */}
        {activeTab === 'loyalty' && (
          <LoyaltyView
            clients={appState.clients}
            transactions={appState.loyaltyTransactions}
            tierHistory={appState.tierHistory}
            settings={appState.settings}
            tierRules={appState.tierRules}
            currentRole={appState.currentRole}
            onOpenTierSettings={() => setIsTierSettingsOpen(true)}
            onAddClient={handleAddClient}
            onConvertPoints={handleConvertPoints}
            onToggleClientPortal={handleToggleClientPortal}
          />
        )}

        {/* Onglet 5 : Domotique IoT (Gérant & Admin) */}
        {activeTab === 'domotique' && (
          <DomotiqueView
            devices={appState.domotiqueDevices}
            stations={appState.stations}
            settings={appState.settings}
            onToggleDevice={(deviceId) => {
              const dev = appState.domotiqueDevices.find(d => d.id === deviceId);
              if (!dev) return;
              const nextState = dev.state === 'ON' ? 'OFF' : 'ON';
              mqttGateway.publish(dev.relayTopic + '/set', nextState);

              setAppState(prev => ({
                ...prev,
                domotiqueDevices: prev.domotiqueDevices.map(d =>
                  d.id === deviceId ? { ...d, state: nextState, watts: nextState === 'ON' ? (d.stationId ? (d.stationId > 8 ? 200 : 130) : 80) : 0 } : d
                ),
              }));
            }}
            onMasterPowerOff={handleMasterPowerOff}
            onMasterPowerOn={handleMasterPowerOn}
            onUpdateSettings={(newSettings) => {
              setAppState(prev => ({
                ...prev,
                settings: { ...prev.settings, ...newSettings },
              }));
            }}
          />
        )}

        {/* Onglet 6 : Caisse & Snacks */}
        {activeTab === 'cash' && (
          <CashShiftView
            currentShift={appState.currentShift}
            shiftHistory={appState.shiftHistory}
            snackItems={appState.snackItems}
            snackSales={appState.snackSales}
            settings={appState.settings}
            cashierName={appState.currentUser}
            tickets={appState.tickets}
            onRecordSnackSale={handleRecordSnackSale}
            onRecordSnackCartSale={handleRecordSnackCartSale}
            onPrintSnackSale={(sale) => setCurrentPrintingSnackSale(sale)}
            onCloseShift={handleCloseShift}
            onOpenNewShift={handleOpenNewShift}
          />
        )}

        {/* Onglet 7 : Rapports & Audit (Gérant & Admin) */}
        {activeTab === 'reports' && (
          <ReportsView
            tickets={appState.tickets}
            stations={appState.stations}
            clients={appState.clients}
            auditLogs={appState.auditLogs}
            loginLogs={appState.loginLogs}
            devices={appState.domotiqueDevices}
            settings={appState.settings}
            tierRules={appState.tierRules}
            onExportJSON={handleExportJSON}
            onExportCSV={handleExportCSV}
          />
        )}

        {/* Onglet 8 : Guide Matériel & Plan de Tests */}
        {activeTab === 'guide' && <HardwareGuideModal />}

        {/* Onglet 9 : Portail Client Dédié (2.13 b) */}
        {activeTab === 'customer_portal' && (
          <CustomerPortalView
            clients={appState.clients}
            queue={appState.queue}
            tierRules={appState.tierRules}
            onLogout={() => setActiveTab('stations')}
            onClientCreatePin={handleClientCreatePin}
          />
        )}

        {/* Onglet 10 : Réglages Administrateur (Section 2.18) avec vérification RBAC */}
        {activeTab === 'settings' && (
          appState.currentStaffUser?.role === 'ADMIN' ? (
            <AdminSettingsView
              settings={appState.settings}
              pricingPlans={appState.pricingPlans}
              stations={appState.stations}
              onAddStation={handleAddStation}
              onRemoveCustomStation={handleRemoveCustomStation}
              onSaveSettings={handleSaveAdminSettings}
              onUpdatePricingPlans={(newPlans) => {
                setAppState((prev) => ({
                  ...prev,
                  pricingPlans: newPlans,
                  auditLogs: [
                    {
                      id: 'aud-' + Date.now(),
                      timestamp: Date.now(),
                      userRole: prev.currentRole,
                      cashierName: prev.currentUser,
                      action: 'MISE_A_JOUR_TARIFS',
                      details: `Grille tarifaire mise à jour par ${prev.currentUser}`,
                    },
                    ...prev.auditLogs,
                  ],
                }));
              }}
              settingsHistory={appState.settingsHistory || []}
              scheduledSettings={appState.scheduledSettings || []}
              onCancelScheduledChange={handleCancelScheduledSetting}
              currentStaffUser={appState.currentStaffUser}
              onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
              onExportConfig={handleExportConfigJSON}
              onImportConfig={handleImportConfigJSON}
            />
          ) : (
            /* Blocage strict HTTP 403 Forbidden pour non-administrateur */
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-2xl my-12">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                  Accès Refusé · Erreur HTTP 403 Forbidden
                </span>
                <h2 className="text-xl font-black text-white">Zone Réservée à l'Administrateur</h2>
                <p className="text-xs text-slate-300">
                  Votre rôle actuel ({appState.currentStaffUser?.role || 'CAISSIER'}) ne dispose pas des privilèges requis pour accéder ou modifier les réglages de la salle.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('stations')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition cursor-pointer"
                >
                  Retour aux Postes de Jeu
                </button>
              </div>
            </div>
          )
        )}
          </>
        )}
      </main>

      {/* Modal Express Ticket (< 15s) avec remises automatiques selon statut */}
      <FastTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        station={selectedStationForTicket}
        allStations={appState.stations}
        pricingPlans={appState.pricingPlans}
        clients={appState.clients}
        tierRules={appState.tierRules}
        settings={appState.settings}
        exchangeRate={appState.settings.exchangeRate}
        cashierName={appState.currentUser}
        cashierId={appState.currentStaffUser?.id}
        onConfirmTicket={handleConfirmTicket}
      />

      {/* Modal Impression Ticket Thermique 80mm */}
      <ThermalReceiptModal
        ticket={currentPrintingTicket}
        onClose={() => setCurrentPrintingTicket(null)}
        settings={appState.settings}
      />

      {/* Modal Transfert Client vers Poste Libre */}
      {transferModalStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                <span>Transférer le Joueur</span>
              </h3>
              <button onClick={() => setTransferModalStation(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Transférer <strong className="text-white">{transferModalStation.clientName}</strong> (Poste {transferModalStation.id}) vers un poste disponible :
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {appState.stations.filter(s => s.status === 'available').length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  Aucun autre poste libre actuellement.
                </div>
              ) : (
                appState.stations
                  .filter(s => s.status === 'available')
                  .map((freeSt) => (
                    <button
                      key={freeSt.id}
                      onClick={() => executeTransfer(freeSt.id)}
                      className="w-full text-left px-3 py-2 bg-slate-800 hover:bg-blue-600 rounded-xl text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-between transition"
                    >
                      <span className="font-bold">Poste {freeSt.id}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900/60 text-cyan-300">
                        {freeSt.type}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Connexion Sécurisée Personnel (2.13 a) */}
      <StaffLoginModal
        isOpen={isStaffLoginOpen}
        staffUsers={appState.staffUsers}
        onLoginSuccess={(user, method) => {
          handleLoginSuccess(user, method);
          setIsStaffLoginOpen(false);
        }}
        onRecordLoginAttempt={handleRecordLoginAttempt}
        admin2FAEnforced={appState.settings.admin2FAEnforced}
        onClose={() => setIsStaffLoginOpen(false)}
        onSwitchToCustomerPortal={() => {
          setIsStaffLoginOpen(false);
          setActiveTab('customer_portal');
        }}
      />

      {/* Modal Configuration des Seuils de Statut Fidèle/VIP (2.14) */}
      <TierSettingsModal
        isOpen={isTierSettingsOpen}
        onClose={() => setIsTierSettingsOpen(false)}
        tierRules={appState.tierRules}
        clients={appState.clients}
        onSaveRules={(rules) => {
          setAppState(prev => ({
            ...prev,
            tierRules: rules,
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: prev.currentRole,
                cashierName: prev.currentUser,
                action: 'MODIFICATION_REGLES_STATUTS',
                details: `Seuils Fidèle/VIP modifiés par ${prev.currentUser}`,
              },
              ...prev.auditLogs,
            ],
          }));
          setIsTierSettingsOpen(false);
        }}
        onManualPromoteVIP={handleManualPromoteVIP}
      />

      {/* Modal Gestion Personnel & Sécurité RBAC (Modification 5 / Section 2.16) */}
      <StaffManagementModal
        isOpen={isStaffManagementOpen}
        onClose={() => setIsStaffManagementOpen(false)}
        staffUsers={appState.staffUsers}
        loginLogs={appState.loginLogs}
        currentStaffUser={appState.currentStaffUser}
        tickets={appState.tickets}
        isCurrentShiftOpen={appState.currentShift.status === 'OPEN'}
        currentShiftCashierId={appState.currentShift.cashierId}
        onBlockUser={handleBlockUser}
        onUnblockUser={handleUnblockUser}
        onAddStaff={(newStaff) => {
          setAppState(prev => ({
            ...prev,
            staffUsers: [
              ...prev.staffUsers,
              {
                ...newStaff,
                id: 'staff-' + Date.now(),
                failedAttempts: 0,
                isActive: true,
                mustChangePassword: newStaff.mustChangePassword ?? true,
              },
            ],
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: prev.currentRole,
                cashierName: prev.currentUser,
                action: 'CREATION_COMPTE_PERSONNEL',
                details: `Création du compte @${newStaff.username} (${newStaff.role}) par ${prev.currentUser}`,
              },
              ...prev.auditLogs,
            ],
          }));
        }}
        onResetStaffPassword={(userId, newPin, newPassword) => {
          setAppState(prev => ({
            ...prev,
            staffUsers: prev.staffUsers.map(u =>
              u.id === userId
                ? {
                    ...u,
                    pin: newPin,
                    passwordHash: newPassword || u.passwordHash,
                    mustChangePassword: newPassword ? true : u.mustChangePassword,
                    failedAttempts: 0,
                    lockedUntil: undefined,
                  }
                : u
            ),
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: prev.currentRole,
                cashierName: prev.currentUser,
                action: 'REINITIALISATION_MOT_DE_PASSE',
                details: `Réinitialisation de code PIN/mot de passe pour l'utilisateur ID ${userId} par ${prev.currentUser}`,
              },
              ...prev.auditLogs,
            ],
          }));
        }}
        onToggleUserActive={(userId) => {
          setAppState(prev => ({
            ...prev,
            staffUsers: prev.staffUsers.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u),
          }));
        }}
        onDeleteStaff={handleDeleteStaff}
        onUpdateStaffRole={handleUpdateStaffRole}
      />

      {/* Modal WhatsApp Business Cloud API & Modèles Meta (Module 2.15) */}
      <WhatsAppConfigModal
        isOpen={isWhatsAppConfigOpen}
        onClose={() => setIsWhatsAppConfigOpen(false)}
        config={appState.whatsappConfig}
        onSaveConfig={(updatedConfig) => {
          setAppState(prev => ({
            ...prev,
            whatsappConfig: updatedConfig,
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: prev.currentRole,
                cashierName: prev.currentUser,
                action: 'MODIF_CONFIG_WHATSAPP',
                details: `Configuration WhatsApp Business mise à jour par ${prev.currentUser} (${updatedConfig.isTestMode ? 'Mode Test' : 'Mode Prod'})`,
              },
              ...prev.auditLogs,
            ],
          }));
        }}
        notificationLogs={appState.notificationLogs}
        onAddLog={(newLog) => {
          setAppState(prev => ({
            ...prev,
            notificationLogs: [newLog, ...prev.notificationLogs],
          }));
        }}
        onSimulateWebhookReply={(replyText, fromPhone) => {
          const norm = normalizeE164(fromPhone).e164 || fromPhone;
          setAppState(prev => {
            let updatedQueue = [...prev.queue];
            let updatedClients = [...prev.clients];

            if (replyText === 'ANNULER') {
              // Retirer de la file d'attente
              updatedQueue = updatedQueue.filter(q => normalizeE164(q.phone).e164 !== norm);
            } else if (replyText === 'STOP') {
              // Révoquer le consentement WhatsApp
              updatedClients = updatedClients.map(c =>
                normalizeE164(c.phone).e164 === norm ? { ...c, whatsappConsent: false } : c
              );
            }

            // Mettre à jour la réponse dans le dernier log correspondant
            const updatedLogs = prev.notificationLogs.map(l => {
              if (normalizeE164(l.phone).e164 === norm) {
                return {
                  ...l,
                  readAt: Date.now(),
                  status: 'READ' as const,
                  replies: [
                    ...(l.replies || []),
                    {
                      timestamp: Date.now(),
                      text: replyText,
                      fromPhone: norm,
                    },
                  ],
                };
              }
              return l;
            });

            return {
              ...prev,
              queue: updatedQueue,
              clients: updatedClients,
              notificationLogs: updatedLogs,
              auditLogs: [
                {
                  id: 'aud-' + Date.now(),
                  timestamp: Date.now(),
                  userRole: 'CLIENT',
                  cashierName: 'Webhook Meta WhatsApp',
                  action: 'REPONSE_WHATSAPP_CLIENT',
                  details: `Réponse "${replyText}" reçue depuis le numéro ${norm}`,
                },
                ...prev.auditLogs,
              ],
            };
          });
        }}
      />

      {/* Modal Reçu Thermique Boissons & Snacks (58mm / 80mm) */}
      <SnackReceiptModal
        sale={currentPrintingSnackSale}
        onClose={() => setCurrentPrintingSnackSale(null)}
        settings={appState.settings}
      />

      {/* Modal « Mon profil » (Modification session, photo de profil & mot de passe avec vérification mot de passe actuel) */}
      <MyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentStaffUser={appState.currentStaffUser}
        settings={appState.settings}
        onUpdatePageBackground={handleUpdatePageBackground}
        onProfileUpdated={({ userId, fullName, avatarUrl, passwordChanged, hashMarker, passwordUpdatedAt }) => {
          setAppState((prev) => {
            const targetUser = prev.staffUsers.find((u) => u.id === userId);
            const updatedUsers = prev.staffUsers.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    fullName,
                    avatarUrl,
                    passwordHash: passwordChanged && hashMarker ? hashMarker : u.passwordHash,
                    mustChangePassword: passwordChanged ? false : u.mustChangePassword,
                    passwordUpdatedAt: passwordUpdatedAt || u.passwordUpdatedAt,
                  }
                : u
            );
            const updatedCurrent =
              prev.currentStaffUser && prev.currentStaffUser.id === userId
                ? {
                    ...prev.currentStaffUser,
                    fullName,
                    avatarUrl,
                    passwordHash: passwordChanged && hashMarker ? hashMarker : prev.currentStaffUser.passwordHash,
                    mustChangePassword: passwordChanged ? false : prev.currentStaffUser.mustChangePassword,
                    passwordUpdatedAt: passwordUpdatedAt || prev.currentStaffUser.passwordUpdatedAt,
                  }
                : prev.currentStaffUser;

            return {
              ...prev,
              staffUsers: updatedUsers,
              currentStaffUser: updatedCurrent,
              currentUser: prev.currentStaffUser?.id === userId ? fullName : prev.currentUser,
              auditLogs: [
                {
                  id: 'aud-' + Date.now(),
                  timestamp: Date.now(),
                  userRole: prev.currentRole,
                  cashierName: fullName,
                  action: passwordChanged ? 'MODIFICATION_PROFIL_ET_MDP' : 'MODIFICATION_PROFIL_SESSION',
                  details: passwordChanged
                    ? `Profil (@${targetUser?.username}), photo et mot de passe mis à jour par ${fullName}`
                    : `Profil/photo de @${targetUser?.username} mis à jour ("${fullName}") depuis Mon profil`,
                },
                ...prev.auditLogs,
              ],
            };
          });
        }}
      />

      {/* Modal Première Connexion : proposition de changement de mot de passe (reportable) */}
      <FirstLoginPasswordModal
        isOpen={Boolean(firstLoginPromptUser)}
        user={firstLoginPromptUser}
        settings={appState.settings}
        onPasswordChanged={({ userId, hashMarker, passwordUpdatedAt }) => {
          setAppState((prev) => {
            const targetUser = prev.staffUsers.find((u) => u.id === userId);
            const updatedUsers = prev.staffUsers.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    mustChangePassword: false,
                    passwordHash: hashMarker || u.passwordHash,
                    passwordUpdatedAt: passwordUpdatedAt || Date.now(),
                  }
                : u
            );
            const updatedCurrent =
              prev.currentStaffUser && prev.currentStaffUser.id === userId
                ? {
                    ...prev.currentStaffUser,
                    mustChangePassword: false,
                    passwordHash: hashMarker || prev.currentStaffUser.passwordHash,
                    passwordUpdatedAt: passwordUpdatedAt || Date.now(),
                  }
                : prev.currentStaffUser;

            return {
              ...prev,
              staffUsers: updatedUsers,
              currentStaffUser: updatedCurrent,
              auditLogs: [
                {
                  id: 'aud-' + Date.now(),
                  timestamp: Date.now(),
                  userRole: targetUser?.role || prev.currentRole,
                  cashierName: targetUser?.fullName || prev.currentUser,
                  action: 'CHANGEMENT_MDP_PREMIERE_CONNEXION',
                  details: `Mot de passe initial remplacé à la première connexion par @${targetUser?.username || userId} (stocké haché scrypt côté serveur)`,
                },
                ...prev.auditLogs,
              ],
            };
          });
          setFirstLoginPromptUser(null);
        }}
        onPostpone={(user) => {
          setPostponedFirstLoginUserIds((prev) => [...prev, user.id]);
          setAppState((prev) => ({
            ...prev,
            auditLogs: [
              {
                id: 'aud-' + Date.now(),
                timestamp: Date.now(),
                userRole: user.role,
                cashierName: user.fullName,
                action: 'REPORT_CHANGEMENT_MDP_PREMIERE_CONNEXION',
                details: `@${user.username} a reporté le changement de mot de passe de première connexion`,
              },
              ...prev.auditLogs,
            ],
          }));
          setFirstLoginPromptUser(null);
        }}
      />
    </div>
  );
}
