import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Coffee,
  Gamepad2,
  Layers,
  Play,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Tv,
  Users,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  AuditLog,
  CashShift,
  Client,
  DomotiqueDevice,
  QueueEntry,
  SnackSale,
  StaffRole,
  Station,
  SystemSettings,
  Ticket,
} from '../types';
import { ActiveTab } from './Header';
import { isStationShellyExempt } from '../services/shellyService';

type DashboardPeriod = 'today' | 'week' | 'month' | 'all';

interface DashboardViewProps {
  stations: Station[];
  tickets: Ticket[];
  snackSales: SnackSale[];
  clients: Client[];
  queue: QueueEntry[];
  devices: DomotiqueDevice[];
  currentShift: CashShift;
  auditLogs: AuditLog[];
  settings: SystemSettings;
  currentRole: StaffRole;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenTicket: (station: Station) => void;
  onPrintTicket: (ticket: Ticket) => void;
  onExtendStation: (station: Station, minutes: number) => void;
  onEndSession: (station: Station) => void;
}

function getPeriodStart(period: DashboardPeriod): number {
  if (period === 'all') return 0;
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  }
  if (period === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    return start.getTime();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
}

function formatDurationClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}h${String(mins).padStart(2, '0')}m`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatPaymentLabel(method: string): string {
  switch (method) {
    case 'CASH_CDF':
      return 'Cash CDF';
    case 'CASH_USD':
      return 'Cash USD';
    case 'ILLICO_CASH':
      return 'Illico Cash';
    case 'MPESA':
      return 'M-Pesa';
    case 'ORANGE_MONEY':
      return 'Orange Money';
    case 'AIRTEL_MONEY':
      return 'Airtel Money';
    case 'LOYALTY_POINTS':
      return 'Points Fidélité';
    case 'MIXED':
      return 'Paiement Mixte';
    default:
      return method;
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stations,
  tickets,
  snackSales,
  clients,
  queue,
  devices,
  currentShift,
  settings,
  currentRole,
  onNavigateTab,
  onOpenTicket,
  onPrintTicket,
  onExtendStation,
  onEndSession,
}) => {
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [livePanelTab, setLivePanelTab] = useState<'stations' | 'queue'>('stations');
  const [activityFilter, setActivityFilter] = useState<'all' | 'tickets' | 'snacks'>('all');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  const exchangeRate = settings.exchangeRate || 2800;
  const isGerantOrAdmin = currentRole === 'GERANT' || currentRole === 'ADMIN';
  const periodStart = useMemo(() => getPeriodStart(period), [period]);

  const periodTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.createdAt >= periodStart &&
          t.status !== 'refunded' &&
          t.status !== 'cancelled'
      ),
    [tickets, periodStart]
  );

  const periodSnacks = useMemo(
    () => snackSales.filter((s) => s.timestamp >= periodStart),
    [snackSales, periodStart]
  );

  // KPI Financiers
  const kpis = useMemo(() => {
    const gamingCDF = periodTickets.reduce((sum, t) => sum + (t.amountCDF || 0), 0);
    const gamingUSD = periodTickets.reduce((sum, t) => sum + (t.amountUSD || 0), 0);
    const snacksCDF = periodSnacks.reduce((sum, s) => sum + (s.totalCDF || 0), 0);
    const snacksUSD = periodSnacks.reduce((sum, s) => sum + (s.totalUSD || 0), 0);

    const totalCDF = gamingCDF + snacksCDF;
    const totalUSD =
      gamingUSD + snacksUSD > 0
        ? gamingUSD + snacksUSD
        : totalCDF / exchangeRate;

    const ticketCount = periodTickets.length;
    const avgTicketCDF = ticketCount > 0 ? Math.round(gamingCDF / ticketCount) : 0;
    const totalPlayMinutes = periodTickets.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    const avgMinutes = ticketCount > 0 ? Math.round(totalPlayMinutes / ticketCount) : 0;

    return {
      gamingCDF,
      snacksCDF,
      totalCDF,
      totalUSD,
      ticketCount,
      snackCount: periodSnacks.length,
      avgTicketCDF,
      avgMinutes,
      totalPlayMinutes,
    };
  }, [periodTickets, periodSnacks, exchangeRate]);

  // Occupation Live & Domotique
  const liveStats = useMemo(() => {
    const totalStations = stations.length;
    const occupied = stations.filter((s) => s.status === 'occupied');
    const available = stations.filter((s) => s.status === 'available');
    const maintenance = stations.filter((s) => s.status === 'maintenance');
    const occupancyRate =
      totalStations > 0 ? Math.round((occupied.length / totalStations) * 100) : 0;

    const ps4Stations = stations.filter((s) => s.type === 'PS4');
    const ps4Occupied = ps4Stations.filter((s) => s.status === 'occupied').length;
    const ps5Stations = stations.filter((s) => s.type === 'PS5');
    const ps5Occupied = ps5Stations.filter((s) => s.status === 'occupied').length;

    const stationWatts = stations.reduce((sum, s) => sum + (s.currentWatts || 0), 0);
    const extraDevicesWatts = devices
      .filter((d) => !d.stationId && d.state === 'ON')
      .reduce((sum, d) => sum + (d.watts || 0), 0);
    const totalWatts = stationWatts + extraDevicesWatts;

    const activeRelaysCount =
      stations.filter((s) => s.relayState || s.screenRelayState).length +
      devices.filter((d) => !d.stationId && d.state === 'ON').length;

    const endingSoon = occupied.filter(
      (s) => s.remainingSeconds > 0 && s.remainingSeconds <= 300
    );

    const activeQueue = queue.filter(
      (q) => q.status === 'waiting' || q.status === 'called'
    );

    return {
      totalStations,
      occupiedCount: occupied.length,
      availableCount: available.length,
      maintenanceCount: maintenance.length,
      firstAvailable: available[0] || null,
      occupancyRate,
      ps4Occupied,
      ps4Total: ps4Stations.length,
      ps5Occupied,
      ps5Total: ps5Stations.length,
      totalWatts,
      activeRelaysCount,
      endingSoon,
      activeQueue,
    };
  }, [stations, devices, queue]);

  // Données Graphique Revenus (Horaire pour Aujourd'hui, Journalier pour Semaine/Mois/Tout)
  const chartSeries = useMemo(() => {
    if (period === 'today') {
      const hours = Array.from({ length: 16 }, (_, idx) => idx + 8); // 08h -> 23h
      const buckets = hours.map((h) => ({
        key: `${String(h).padStart(2, '0')}h`,
        label: `${String(h).padStart(2, '0')}h`,
        gamingCDF: 0,
        snacksCDF: 0,
        ticketsCount: 0,
      }));

      for (const t of periodTickets) {
        const h = new Date(t.createdAt).getHours();
        const idx = h - 8;
        if (idx >= 0 && idx < buckets.length) {
          buckets[idx].gamingCDF += t.amountCDF || 0;
          buckets[idx].ticketsCount += 1;
        }
      }
      for (const s of periodSnacks) {
        const h = new Date(s.timestamp).getHours();
        const idx = h - 8;
        if (idx >= 0 && idx < buckets.length) {
          buckets[idx].snacksCDF += s.totalCDF || 0;
        }
      }
      return buckets;
    }

    // Regroupement par jour
    const daysCount = period === 'week' ? 7 : period === 'month' ? 14 : 10;
    const now = new Date();
    const dayMap = new Map<
      string,
      { key: string; label: string; gamingCDF: number; snacksCDF: number; ticketsCount: number }
    >();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      dayMap.set(key, { key, label, gamingCDF: 0, snacksCDF: 0, ticketsCount: 0 });
    }

    for (const t of periodTickets) {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const bucket = dayMap.get(key);
      if (bucket) {
        bucket.gamingCDF += t.amountCDF || 0;
        bucket.ticketsCount += 1;
      }
    }

    for (const s of periodSnacks) {
      const d = new Date(s.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const bucket = dayMap.get(key);
      if (bucket) {
        bucket.snacksCDF += s.totalCDF || 0;
      }
    }

    return Array.from(dayMap.values());
  }, [period, periodTickets, periodSnacks]);

  const maxChartTotal = useMemo(() => {
    const highest = Math.max(
      ...chartSeries.map((b) => b.gamingCDF + b.snacksCDF),
      0
    );
    return highest > 0 ? highest : 10000;
  }, [chartSeries]);

  // Répartition Modes de paiement (incluant paiement mixte)
  const paymentBreakdown = useMemo(() => {
    const totals: Record<string, number> = {
      CASH_CDF: 0,
      CASH_USD: 0,
      ILLICO_CASH: 0,
      MPESA: 0,
      ORANGE_MONEY: 0,
      AIRTEL_MONEY: 0,
      LOYALTY_POINTS: 0,
    };

    const accumulate = (
      method: string,
      amountCDF: number,
      mixed?: Ticket['mixedBreakdown']
    ) => {
      if (method === 'MIXED' && mixed) {
        totals.CASH_CDF += (mixed.cashCDF || 0) + (mixed.cashUSD || 0) * 0;
        totals.CASH_USD += (mixed.cashUSD || 0) * exchangeRate;
        totals.ILLICO_CASH +=
          (mixed.illicoCashCDF || 0) + (mixed.illicoCashUSD || 0) * exchangeRate;
        const momoKey = mixed.momoProvider || 'MPESA';
        totals[momoKey] =
          (totals[momoKey] || 0) +
          (mixed.momoCDF || 0) +
          (mixed.momoUSD || 0) * exchangeRate;
        return;
      }
      totals[method] = (totals[method] || 0) + amountCDF;
    };

    for (const t of periodTickets) {
      accumulate(t.paymentMethod, t.amountCDF || 0, t.mixedBreakdown);
    }
    for (const s of periodSnacks) {
      accumulate(s.paymentMethod, s.totalCDF || 0, s.mixedBreakdown);
    }

    const totalAmount = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([method, amountCDF]) => ({
        method,
        label: formatPaymentLabel(method),
        amountCDF: Math.round(amountCDF),
        amountUSD: amountCDF / exchangeRate,
        percent: totalAmount > 0 ? Math.round((amountCDF / totalAmount) * 100) : 0,
      }));
  }, [periodTickets, periodSnacks, exchangeRate]);

  // Performance par Console
  const consoleBreakdown = useMemo(() => {
    const map = new Map<string, { type: string; sessions: number; minutes: number; revenueCDF: number }>();
    for (const t of periodTickets) {
      const existing = map.get(t.stationType) || {
        type: t.stationType,
        sessions: 0,
        minutes: 0,
        revenueCDF: 0,
      };
      existing.sessions += 1;
      existing.minutes += t.durationMinutes || 0;
      existing.revenueCDF += t.amountCDF || 0;
      map.set(t.stationType, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.revenueCDF - a.revenueCDF);
  }, [periodTickets]);

  // Flux d'activité récent unifié (Tickets + Snacks)
  const recentActivity = useMemo(() => {
    type ActivityRow =
      | {
          kind: 'ticket';
          id: string;
          timestamp: number;
          title: string;
          subtitle: string;
          amountCDF: number;
          amountUSD: number;
          paymentLabel: string;
          ticket: Ticket;
        }
      | {
          kind: 'snack';
          id: string;
          timestamp: number;
          title: string;
          subtitle: string;
          amountCDF: number;
          amountUSD: number;
          paymentLabel: string;
        };

    const rows: ActivityRow[] = [];

    if (activityFilter === 'all' || activityFilter === 'tickets') {
      for (const t of periodTickets) {
        rows.push({
          kind: 'ticket',
          id: t.id,
          timestamp: t.createdAt,
          title: `${t.ticketNumber} · ${t.clientName}`,
          subtitle: `${t.stationName} (${t.stationType}) · ${t.durationMinutes} min · ${t.cashierName}`,
          amountCDF: t.amountCDF || 0,
          amountUSD: t.amountUSD || 0,
          paymentLabel: formatPaymentLabel(t.paymentMethod),
          ticket: t,
        });
      }
    }

    if (activityFilter === 'all' || activityFilter === 'snacks') {
      for (const s of periodSnacks) {
        rows.push({
          kind: 'snack',
          id: s.id,
          timestamp: s.timestamp,
          title: s.receiptNumber ? `${s.receiptNumber} · ${s.itemName}` : s.itemName,
          subtitle: `Qté ${s.quantity} · ${s.cashierName}`,
          amountCDF: s.totalCDF || 0,
          amountUSD: s.totalUSD || 0,
          paymentLabel: formatPaymentLabel(s.paymentMethod),
        });
      }
    }

    const q = activitySearch.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q) ||
          r.paymentLabel.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12);
  }, [periodTickets, periodSnacks, activityFilter, activitySearch]);

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="w-full space-y-6">
      {/* ================= EN-TÊTE TABLEAU DE BORD & FILTRE PÉRIODE ================= */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Tableau de bord
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="capitalize">{todayFormatted}</span>
            <span aria-hidden="true">·</span>
            <span>
              Caisse {currentShift.status === 'OPEN' ? 'ouverte' : 'fermée'} ({currentShift.cashierName})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-400">
              1 $ = {exchangeRate.toLocaleString('fr-FR')} FC
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {clients.length} joueurs enregistrés
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de période fonctionnel */}
          <div
            role="group"
            aria-label="Période d'analyse"
            className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs"
          >
            {(
              [
                { id: 'today', label: "Aujourd'hui" },
                { id: 'week', label: '7 jours' },
                { id: 'month', label: 'Ce mois' },
                { id: 'all', label: 'Tout' },
              ] as { id: DashboardPeriod; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  period === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (liveStats.firstAvailable) {
                onOpenTicket(liveStats.firstAvailable);
              } else {
                onNavigateTab('stations');
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {liveStats.firstAvailable
                ? `Nouveau ticket (${liveStats.firstAvailable.name})`
                : 'Voir les postes'}
            </span>
          </button>
        </div>
      </section>

      {/* ================= LIGNE 1 : 4 KPI PRINCIPAUX (TABULAR NUMS, SINGLE ELEVATION) ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 : Recettes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Recettes totales</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
              {kpis.totalCDF.toLocaleString('fr-FR')} FC
            </div>
            <div className="text-xs font-mono tabular-nums text-emerald-400 mt-0.5">
              ≈ ${kpis.totalUSD.toFixed(2)} USD
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
            <span>Jeux : {kpis.gamingCDF.toLocaleString('fr-FR')} FC</span>
            <span>Snacks : {kpis.snacksCDF.toLocaleString('fr-FR')} FC</span>
          </div>
        </div>

        {/* KPI 2 : Occupation Live */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Occupation des postes</span>
            <Tv className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
                {liveStats.occupancyRate}%
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                ({liveStats.occupiedCount} / {liveStats.totalStations} en jeu)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${liveStats.occupancyRate}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
            <span>PS4 : {liveStats.ps4Occupied}/{liveStats.ps4Total}</span>
            <span>PS5 : {liveStats.ps5Occupied}/{liveStats.ps5Total}</span>
            <span className="text-emerald-400">{liveStats.availableCount} libres</span>
          </div>
        </div>

        {/* KPI 3 : Tickets & Temps moyen */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Tickets &amp; Sessions</span>
            <Gamepad2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
                {kpis.ticketCount}
              </span>
              <span className="text-xs text-slate-400">
                ticket{kpis.ticketCount > 1 ? 's' : ''} · {kpis.snackCount} vente{kpis.snackCount > 1 ? 's' : ''} bar
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums text-blue-300 mt-0.5">
              Panier moyen : {kpis.avgTicketCDF.toLocaleString('fr-FR')} FC
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
            <span>Durée moy. : {kpis.avgMinutes} min</span>
            <span>Total : {Math.round(kpis.totalPlayMinutes / 60)}h {kpis.totalPlayMinutes % 60}m</span>
          </div>
        </div>

        {/* KPI 4 : Domotique Shelly & File d'attente */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Énergie IoT &amp; Attente</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
                {liveStats.totalWatts.toLocaleString('fr-FR')} W
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                ({liveStats.activeRelaysCount} relais actifs)
              </span>
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-1.5">
              {liveStats.endingSoon.length > 0 ? (
                <span className="text-amber-300 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {liveStats.endingSoon.length} fin imminente (&lt;5m)
                </span>
              ) : (
                <span className="text-slate-400">Aucune session critique &lt; 5 min</span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
            <span>File d&apos;attente : {liveStats.activeQueue.length}</span>
            <button
              type="button"
              onClick={() => onNavigateTab('queue')}
              className="text-cyan-400 hover:text-cyan-300 font-sans font-semibold cursor-pointer"
            >
              Gérer la file
            </button>
          </div>
        </div>
      </section>

      {/* ================= LIGNE 2 : ANALYTIQUE REVENUS + MONITEUR LIVE POSTES ================= */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Graphique d'évolution des recettes (7 cols) */}
        <div className="xl:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span>
                  {period === 'today'
                    ? 'Courbe horaire des recettes (08h – 23h)'
                    : 'Évolution journalière des recettes'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ventilation entre sessions de jeu et ventes bar/snacks en Francs Congolais
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                <span>Jeux PS4/PS5</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                <span>Bar &amp; Snacks</span>
              </span>
            </div>
          </div>

          {kpis.totalCDF === 0 ? (
            <div className="flex-1 min-h-[240px] flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl p-6 space-y-3">
              <Activity className="w-8 h-8 text-slate-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-300">
                  Aucune recette enregistrée sur cette période
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Dès qu&apos;un ticket de jeu ou une vente snack est validé, la répartition graphique s&apos;affiche automatiquement ici.
                </p>
              </div>
              {liveStats.firstAvailable && (
                <button
                  type="button"
                  onClick={() => onOpenTicket(liveStats.firstAvailable!)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Créer le premier ticket
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Zone d'inspection au survol */}
              <div className="h-8 flex items-center justify-between px-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs font-mono tabular-nums">
                {hoveredBarIdx !== null && chartSeries[hoveredBarIdx] ? (
                  <>
                    <span className="text-white font-bold">
                      {chartSeries[hoveredBarIdx].label}
                    </span>
                    <span className="text-blue-300">
                      Jeux : {chartSeries[hoveredBarIdx].gamingCDF.toLocaleString('fr-FR')} FC ({chartSeries[hoveredBarIdx].ticketsCount} tkt)
                    </span>
                    <span className="text-amber-300">
                      Snacks : {chartSeries[hoveredBarIdx].snacksCDF.toLocaleString('fr-FR')} FC
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Total : {(chartSeries[hoveredBarIdx].gamingCDF + chartSeries[hoveredBarIdx].snacksCDF).toLocaleString('fr-FR')} FC
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-400 font-sans">
                      Survolez une barre pour voir le détail exact
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Cumul : {kpis.totalCDF.toLocaleString('fr-FR')} FC
                    </span>
                  </>
                )}
              </div>

              {/* Graphique en barres empilées propre sans dépendance externe */}
              <div className="h-56 flex items-end gap-1.5 sm:gap-2 pt-4 pb-1 px-1 border-b border-slate-800">
                {chartSeries.map((bucket, idx) => {
                  const total = bucket.gamingCDF + bucket.snacksCDF;
                  const totalHeightPct = Math.max(
                    total > 0 ? 4 : 0,
                    Math.round((total / maxChartTotal) * 100)
                  );
                  const gamingSharePct =
                    total > 0 ? Math.round((bucket.gamingCDF / total) * 100) : 0;
                  const snackSharePct = total > 0 ? 100 - gamingSharePct : 0;
                  const isHovered = hoveredBarIdx === idx;

                  return (
                    <div
                      key={bucket.key}
                      onMouseEnter={() => setHoveredBarIdx(idx)}
                      onMouseLeave={() => setHoveredBarIdx(null)}
                      className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                    >
                      <div
                        className={`w-full max-w-[34px] rounded-t-md overflow-hidden flex flex-col justify-end transition-opacity ${
                          isHovered ? 'opacity-100 ring-1 ring-white/40' : 'opacity-90'
                        }`}
                        style={{ height: `${totalHeightPct}%` }}
                      >
                        {snackSharePct > 0 && (
                          <div
                            className="w-full bg-amber-400"
                            style={{ height: `${snackSharePct}%` }}
                          />
                        )}
                        {gamingSharePct > 0 && (
                          <div
                            className="w-full bg-blue-500"
                            style={{ height: `${gamingSharePct}%` }}
                          />
                        )}
                        {total === 0 && <div className="w-full h-[2px] bg-slate-800" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Labels X */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-1">
                {chartSeries.map((bucket) => (
                  <div
                    key={bucket.key}
                    className="flex-1 text-center text-[10px] font-mono tabular-nums text-slate-400 truncate"
                  >
                    {bucket.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pied du bloc graphique : liens rapides vers analyses */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">
              {consoleBreakdown.length > 0
                ? `Top console : ${consoleBreakdown[0].type} (${consoleBreakdown[0].revenueCDF.toLocaleString('fr-FR')} FC)`
                : 'Aucune session console enregistrée sur la période'}
            </span>
            {isGerantOrAdmin && (
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Rapports détaillés &amp; Exports</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Moniteur Live des Postes & File d'attente (5 cols) */}
        <div className="xl:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setLivePanelTab('stations')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  livePanelTab === 'stations'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Postes ({stations.length})
              </button>
              <button
                type="button"
                onClick={() => setLivePanelTab('queue')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  livePanelTab === 'queue'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                File ({liveStats.activeQueue.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab(livePanelTab === 'stations' ? 'stations' : 'queue')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Vue complète</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {livePanelTab === 'stations' ? (
            <div className="divide-y divide-slate-800/80 max-h-[320px] overflow-y-auto pr-1">
              {stations.map((station) => {
                const exempt = isStationShellyExempt(station.id, settings);
                const isOccupied = station.status === 'occupied';
                const isMaint = station.status === 'maintenance';
                const isLowTime = isOccupied && station.remainingSeconds <= 300;

                return (
                  <div
                    key={station.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-800/30 px-1.5 rounded transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          isOccupied
                            ? isLowTime
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                            : isMaint
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {isOccupied ? (
                          <Play className="w-3.5 h-3.5" />
                        ) : isMaint ? (
                          <Wrench className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {station.name}{' '}
                          <span className="text-[11px] font-mono text-slate-400 font-normal">
                            ({station.type})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {isOccupied
                            ? `${station.clientName || 'Joueur'} · ${
                                exempt
                                  ? 'Shelly exempté'
                                  : station.relayState
                                  ? `${station.currentWatts} W`
                                  : 'Relais coupé'
                              }`
                            : isMaint
                            ? 'En maintenance'
                            : exempt
                            ? 'Libre · Shelly exempté'
                            : 'Libre · Prêt'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOccupied ? (
                        <>
                          <span
                            className={`font-mono tabular-nums font-bold ${
                              isLowTime ? 'text-amber-300' : 'text-blue-300'
                            }`}
                          >
                            {formatDurationClock(station.remainingSeconds)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onExtendStation(station, 30)}
                            title="Prolonger la session de 30 minutes"
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-semibold transition cursor-pointer"
                          >
                            +30m
                          </button>
                          <button
                            type="button"
                            onClick={() => onEndSession(station)}
                            title="Clôturer la session"
                            className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 rounded-md font-semibold transition cursor-pointer"
                          >
                            Fin
                          </button>
                        </>
                      ) : !isMaint ? (
                        <button
                          type="button"
                          onClick={() => onOpenTicket(station)}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-md font-semibold transition cursor-pointer"
                        >
                          Ticket
                        </button>
                      ) : (
                        <span className="text-[11px] text-rose-300 font-medium">Indispo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : liveStats.activeQueue.length === 0 ? (
            <div className="flex-1 min-h-[240px] flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl p-6 space-y-2">
              <Users className="w-7 h-7 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucun joueur en attente</p>
              <p className="text-xs text-slate-500">
                La file d&apos;attente est actuellement vide.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('queue')}
                className="mt-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Ajouter un joueur
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-[320px] overflow-y-auto pr-1">
              {liveStats.activeQueue.map((entry, i) => (
                <div
                  key={entry.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      {i + 1}. {entry.clientName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {entry.desiredStationType} · {entry.desiredDurationMinutes} min · Priorité {entry.priorityLevel}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      entry.status === 'called'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {entry.status === 'called' ? 'Appelé' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Actualisation temps réel active</span>
            </span>
            {isGerantOrAdmin && (
              <button
                type="button"
                onClick={() => onNavigateTab('domotique')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
              >
                Contrôle Shelly IoT
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ================= LIGNE 3 : MODES DE PAIEMENT & CONSOLES + JOURNAL ACTIVITÉ ================= */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Ventilation Paiements & Consoles (5 cols) */}
        <div className="xl:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Encaissements &amp; Consoles</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('cash')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              Ouvrir la caisse
            </button>
          </div>

          {/* Modes de paiement */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-400">
              Par mode de paiement
            </div>
            {paymentBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                Aucun encaissement enregistré sur cette période.
              </p>
            ) : (
              <div className="space-y-2.5">
                {paymentBreakdown.map((item) => (
                  <div key={item.method} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-medium">{item.label}</span>
                      <span className="font-mono tabular-nums text-white font-semibold">
                        {item.amountCDF.toLocaleString('fr-FR')} FC{' '}
                        <span className="text-slate-400 font-normal">({item.percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Par console */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="text-xs font-semibold text-slate-400">
              Performance par type de console
            </div>
            {consoleBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500">Aucune session sur cette période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="py-2 text-left font-semibold">Console</th>
                      <th className="py-2 text-right font-semibold">Sessions</th>
                      <th className="py-2 text-right font-semibold">Temps</th>
                      <th className="py-2 text-right font-semibold">Recettes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                    {consoleBreakdown.map((row) => (
                      <tr key={row.type} className="hover:bg-slate-800/30">
                        <td className="py-2 font-sans font-semibold text-white">{row.type}</td>
                        <td className="py-2 text-right text-slate-300">{row.sessions}</td>
                        <td className="py-2 text-right text-slate-300">
                          {Math.floor(row.minutes / 60)}h{String(row.minutes % 60).padStart(2, '0')}
                        </td>
                        <td className="py-2 text-right font-bold text-emerald-400">
                          {row.revenueCDF.toLocaleString('fr-FR')} FC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Activité récente Tickets & Snacks (7 cols) */}
        <div className="xl:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Dernières opérations (Tickets &amp; Bar)</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Filtrer client, ticket..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500 outline-none w-44"
                />
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px]">
                {(
                  [
                    { id: 'all', label: 'Tout' },
                    { id: 'tickets', label: 'Tickets' },
                    { id: 'snacks', label: 'Snacks' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivityFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      activityFilter === tab.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl p-6 space-y-2">
              <Coffee className="w-7 h-7 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">
                Aucune transaction correspondante
              </p>
              <p className="text-xs text-slate-500">
                Ajustez le filtre ou enregistrez une nouvelle opération.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 text-left font-semibold">Heure</th>
                    <th className="py-2 text-left font-semibold">Opération</th>
                    <th className="py-2 text-left font-semibold">Paiement</th>
                    <th className="py-2 text-right font-semibold">Montant</th>
                    <th className="py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {recentActivity.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {new Date(row.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 pr-3 min-w-[180px]">
                        <div className="font-semibold text-white truncate max-w-[260px]">
                          {row.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[280px]">
                          {row.subtitle}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-300 whitespace-nowrap">
                        {row.paymentLabel}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-emerald-400">
                          {row.amountCDF.toLocaleString('fr-FR')} FC
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ${row.amountUSD.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                        {row.kind === 'ticket' ? (
                          <button
                            type="button"
                            onClick={() => onPrintTicket(row.ticket)}
                            title="Voir / Imprimer le ticket"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-semibold transition cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Ticket</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('cash')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-semibold transition cursor-pointer"
                          >
                            <span>Caisse</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Résumé shift en cours */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums text-slate-300">
            <span>
              Cash attendu en caisse :{' '}
              <strong className="text-white">
                {currentShift.expectedCashCDF.toLocaleString('fr-FR')} FC
              </strong>{' '}
              ·{' '}
              <strong className="text-emerald-400">
                ${currentShift.expectedCashUSD.toFixed(2)} USD
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('tickets')}
              className="font-sans text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              Historique complet des tickets →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
