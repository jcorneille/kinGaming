import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Zap,
  Tv,
  Users,
  Shield,
  FileSpreadsheet,
  FileText,
  Crown,
  Award,
  KeyRound,
  Wallet,
  Clock,
  Coffee,
  UserCheck,
} from 'lucide-react';
import {
  Ticket,
  Station,
  Client,
  AuditLog,
  DomotiqueDevice,
  SystemSettings,
  LoginLog,
  TierRulesConfig,
  SnackSale,
  CashShift,
} from '../types';
import { DEFAULT_TIER_RULES } from '../services/tierEngine';
import { Pagination } from './Pagination';
import {
  exportReportToExcel,
  exportReportToPDF,
  StationPerformanceRow,
  CashierPerformanceRow,
} from '../utils/reportExports';

const PAGE_SIZE = 10;

interface ReportsViewProps {
  tickets: Ticket[];
  stations: Station[];
  clients: Client[];
  auditLogs: AuditLog[];
  loginLogs: LoginLog[];
  devices: DomotiqueDevice[];
  settings: SystemSettings;
  tierRules?: TierRulesConfig;
  snackSales?: SnackSale[];
  shiftHistory?: CashShift[];
  onExportJSON: () => void;
  onExportCSV: () => void;
}

type ReportPeriod = 'today' | 'week' | 'month' | 'all';

function getPeriodStartTimestamp(period: ReportPeriod): number {
  if (period === 'all') return 0;
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  }
  if (period === 'week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
    return monday.getTime();
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
}

function getPeriodLabel(period: ReportPeriod): string {
  switch (period) {
    case 'today':
      return "Aujourd'hui";
    case 'week':
      return 'Cette Semaine';
    case 'month':
      return 'Ce Mois';
    case 'all':
      return 'Tout l’historique';
  }
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  tickets,
  stations,
  clients,
  auditLogs,
  loginLogs,
  devices,
  settings,
  tierRules = DEFAULT_TIER_RULES,
  snackSales = [],
  shiftHistory = [],
  onExportJSON,
  onExportCSV,
}) => {
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('today');
  const [auditPage, setAuditPage] = useState(1);
  const [loginPage, setLoginPage] = useState(1);

  const periodStart = useMemo(() => getPeriodStartTimestamp(reportPeriod), [reportPeriod]);

  const filteredTickets = useMemo(
    () => tickets.filter((t) => t.createdAt >= periodStart),
    [tickets, periodStart]
  );

  const filteredSnacks = useMemo(
    () => snackSales.filter((s) => s.timestamp >= periodStart),
    [snackSales, periodStart]
  );

  const filteredAuditLogs = useMemo(
    () => auditLogs.filter((l) => l.timestamp >= periodStart),
    [auditLogs, periodStart]
  );

  const filteredLoginLogs = useMemo(
    () => loginLogs.filter((l) => l.timestamp >= periodStart),
    [loginLogs, periodStart]
  );

  const paginatedAuditLogs = filteredAuditLogs.slice((auditPage - 1) * PAGE_SIZE, auditPage * PAGE_SIZE);
  const paginatedLoginLogs = filteredLoginLogs.slice((loginPage - 1) * PAGE_SIZE, loginPage * PAGE_SIZE);

  // Chiffres clés recettes Gaming + Snacks
  const validTickets = filteredTickets.filter((t) => t.status !== 'cancelled' && t.status !== 'refunded');
  const gamingRevenueCDF = validTickets.reduce((sum, t) => sum + t.amountCDF, 0);
  const gamingRevenueUSD = validTickets.reduce((sum, t) => sum + t.amountUSD, 0);

  const snackRevenueCDF = filteredSnacks.reduce((sum, s) => sum + s.totalCDF, 0);
  const snackRevenueUSD = filteredSnacks.reduce((sum, s) => sum + s.totalUSD, 0);
  const snackItemsSoldCount = filteredSnacks.reduce((sum, s) => sum + s.quantity, 0);

  const combinedRevenueCDF = gamingRevenueCDF + snackRevenueCDF;
  const combinedRevenueUSD = gamingRevenueUSD + snackRevenueUSD;

  const totalPlayMinutes = validTickets.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
  const totalPlayHours = totalPlayMinutes / 60;
  const averageTicketCDF = validTickets.length > 0 ? gamingRevenueCDF / validTickets.length : 0;
  const averageDurationMin = validTickets.length > 0 ? totalPlayMinutes / validTickets.length : 0;

  // Recettes PS4 vs PS5
  const ps4Tickets = validTickets.filter((t) => t.stationType === 'PS4');
  const ps5Tickets = validTickets.filter((t) => t.stationType === 'PS5');
  const ps4RevenueCDF = ps4Tickets.reduce((sum, t) => sum + t.amountCDF, 0);
  const ps5RevenueCDF = ps5Tickets.reduce((sum, t) => sum + t.amountUSD * (t.appliedExchangeRate || settings.exchangeRate), 0);
  const ps5RevenueCDFExact = ps5Tickets.reduce((sum, t) => sum + t.amountCDF, 0);

  // Recettes générées par Statuts Clients
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  let vipRevenueCDF = 0;
  let fideleRevenueCDF = 0;

  validTickets.forEach((t) => {
    if (t.clientId) {
      const client = clientMap.get(t.clientId);
      if (client?.tier === 'VIP') vipRevenueCDF += t.amountCDF;
      else if (client?.tier === 'FIDELE') fideleRevenueCDF += t.amountCDF;
    }
  });

  // Décompte complet par mode de paiement (Tickets + Snacks + Mixte détaillé)
  let cashCDFRevenue = 0;
  let cashUSDRevenue = 0;
  let illicoCashRevenueCDF = 0;
  let illicoCashRevenueUSD = 0;
  let momoRevenueCDF = 0;
  let momoRevenueUSD = 0;
  let pointsRevenueCDF = 0;
  let mixedRevenueCDF = 0;

  const accumulatePayment = (
    method: Ticket['paymentMethod'],
    amountCDF: number,
    amountUSD: number,
    mixed?: Ticket['mixedBreakdown'],
    rate: number = settings.exchangeRate
  ) => {
    const safeRate = rate || 2800;
    if (method === 'CASH_CDF') {
      cashCDFRevenue += amountCDF;
    } else if (method === 'CASH_USD') {
      cashUSDRevenue += amountUSD;
    } else if (method === 'ILLICO_CASH') {
      illicoCashRevenueCDF += amountCDF;
      illicoCashRevenueUSD += amountUSD;
    } else if (method === 'MPESA' || method === 'ORANGE_MONEY' || method === 'AIRTEL_MONEY') {
      momoRevenueCDF += amountCDF;
      momoRevenueUSD += amountUSD;
    } else if (method === 'LOYALTY_POINTS') {
      pointsRevenueCDF += amountCDF;
    } else if (method === 'MIXED') {
      mixedRevenueCDF += amountCDF;
      if (mixed) {
        cashCDFRevenue += mixed.cashCDF || 0;
        cashUSDRevenue += mixed.cashUSD || 0;
        illicoCashRevenueCDF += mixed.illicoCashCDF || 0;
        illicoCashRevenueUSD += mixed.illicoCashUSD || (mixed.illicoCashCDF ? mixed.illicoCashCDF / safeRate : 0);
        momoRevenueCDF += mixed.momoCDF || 0;
        momoRevenueUSD += mixed.momoUSD || (mixed.momoCDF ? mixed.momoCDF / safeRate : 0);
      }
    }
  };

  validTickets.forEach((t) => {
    accumulatePayment(
      t.paymentMethod,
      t.amountCDF,
      t.amountUSD,
      t.mixedBreakdown,
      t.appliedExchangeRate || settings.exchangeRate
    );
  });

  filteredSnacks.forEach((s) => {
    accumulatePayment(s.paymentMethod, s.totalCDF, s.totalUSD, s.mixedBreakdown, settings.exchangeRate);
  });

  // Décompte clients par statut
  const vipCount = clients.filter((c) => c.tier === 'VIP').length;
  const fideleCount = clients.filter((c) => c.tier === 'FIDELE').length;
  const regulierCount = clients.filter((c) => c.tier === 'REGULIER').length;
  const nouveauCount = clients.filter((c) => c.tier === 'NOUVEAU').length;

  // Performance détaillée par Poste
  const periodDays = reportPeriod === 'today' ? 1 : reportPeriod === 'week' ? 7 : reportPeriod === 'month' ? 30 : 30;
  const theoreticalDailyHours = 13; // ex: 10h -> 23h
  const theoreticalMinutesPerStation = periodDays * theoreticalDailyHours * 60;

  const stationPerformance: StationPerformanceRow[] = useMemo(() => {
    return stations.map((st) => {
      const stTickets = validTickets.filter((t) => t.stationId === st.id);
      const mins = stTickets.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
      const revCDF = stTickets.reduce((sum, t) => sum + t.amountCDF, 0);
      const revUSD = stTickets.reduce((sum, t) => sum + t.amountUSD, 0);
      const occ = Math.min(100, (mins / (theoreticalMinutesPerStation || 780)) * 100);
      return {
        stationId: st.id,
        stationName: st.name || `Poste ${st.id}`,
        stationType: st.type,
        sessionsCount: stTickets.length,
        totalMinutes: mins,
        revenueCDF: revCDF,
        revenueUSD: revUSD,
        occupancyPercent: occ,
      };
    });
  }, [stations, validTickets, theoreticalMinutesPerStation]);

  // Heures de pointe (09h -> 23h)
  const hourlyBreakdown = useMemo(() => {
    const hours = Array.from({ length: 15 }, (_, idx) => ({
      hour: idx + 9,
      label: `${String(idx + 9).padStart(2, '0')}h`,
      count: 0,
      revenueCDF: 0,
    }));
    validTickets.forEach((t) => {
      const h = new Date(t.createdAt).getHours();
      const slot = hours.find((x) => x.hour === h);
      if (slot) {
        slot.count += 1;
        slot.revenueCDF += t.amountCDF;
      }
    });
    return hours;
  }, [validTickets]);
  const maxHourlyCount = Math.max(1, ...hourlyBreakdown.map((h) => h.count));

  // Performance par Caissier
  const cashierPerformance: CashierPerformanceRow[] = useMemo(() => {
    const map = new Map<string, CashierPerformanceRow>();
    const ensure = (name: string) => {
      const key = name || 'Caissier';
      if (!map.has(key)) {
        map.set(key, { cashierName: key, ticketsCount: 0, snacksCount: 0, totalCDF: 0, totalUSD: 0 });
      }
      return map.get(key)!;
    };
    validTickets.forEach((t) => {
      const row = ensure(t.cashierName);
      row.ticketsCount += 1;
      row.totalCDF += t.amountCDF;
      row.totalUSD += t.amountUSD;
    });
    filteredSnacks.forEach((s) => {
      const row = ensure(s.cashierName);
      row.snacksCount += 1;
      row.totalCDF += s.totalCDF;
      row.totalUSD += s.totalUSD;
    });
    return Array.from(map.values()).sort((a, b) => b.totalCDF - a.totalCDF);
  }, [validTickets, filteredSnacks]);

  // Top Boissons & Snacks
  const topSnacks = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; totalCDF: number }>();
    filteredSnacks.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((it) => {
          const cur = map.get(it.itemName) || { name: it.itemName, qty: 0, totalCDF: 0 };
          cur.qty += it.quantity;
          cur.totalCDF += it.totalCDF;
          map.set(it.itemName, cur);
        });
      } else {
        const cur = map.get(sale.itemName) || { name: sale.itemName, qty: 0, totalCDF: 0 };
        cur.qty += sale.quantity;
        cur.totalCDF += sale.totalCDF;
        map.set(sale.itemName, cur);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [filteredSnacks]);

  // Énergie
  const totalEnergyKWh = devices.reduce((sum, d) => sum + d.totalKWh, 0);
  const savedKWh = totalEnergyKWh * 0.25;
  const savedUSD = savedKWh * 0.12;
  const savedCDF = savedUSD * settings.exchangeRate;

  const buildExportPayload = () => ({
    periodLabel: getPeriodLabel(reportPeriod),
    settings,
    tickets: validTickets,
    snackSales: filteredSnacks,
    stations,
    clients,
    shiftHistory,
    auditLogs: filteredAuditLogs,
    devices,
    stationPerformance,
    cashierPerformance,
    kpis: {
      gamingRevenueCDF,
      gamingRevenueUSD,
      snackRevenueCDF,
      snackRevenueUSD,
      combinedRevenueCDF,
      combinedRevenueUSD,
      vipAndFideleCDF: vipRevenueCDF + fideleRevenueCDF,
      ps4RevenueCDF,
      ps5RevenueCDF: ps5RevenueCDFExact || ps5RevenueCDF,
      cashCDF: cashCDFRevenue,
      cashUSD: cashUSDRevenue,
      illicoCashCDF: illicoCashRevenueCDF,
      illicoCashUSD: illicoCashRevenueUSD,
      momoCDF: momoRevenueCDF,
      momoUSD: momoRevenueUSD,
      mixedCDF: mixedRevenueCDF,
      pointsCDF: pointsRevenueCDF,
      averageTicketCDF,
      averageDurationMin,
      totalPlayHours,
      savedKWh,
      savedCDF,
    },
  });

  return (
    <div className="space-y-5">
      {/* Barre d'actions période & exports (Excel, PDF, CSV, JSON) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white">Période d'Analyse :</span>
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setReportPeriod(p);
                  setAuditPage(1);
                  setLoginPage(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  reportPeriod === p ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {getPeriodLabel(p)}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400 ml-1">
            ({validTickets.length} ticket{validTickets.length > 1 ? 's' : ''} · {filteredSnacks.length} snack{filteredSnacks.length > 1 ? 's' : ''})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportReportToExcel(buildExportPayload())}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => exportReportToPDF(buildExportPayload())}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF (.pdf)</span>
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportJSON}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup JSON</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>CA Global Combiné (Jeux + Bar)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {combinedRevenueCDF.toLocaleString()} FC
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Jeux : {gamingRevenueCDF.toLocaleString()} FC</span>
            <span>Bidevise : ${combinedRevenueUSD.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Panier Moyen & Volume Temps</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {Math.round(averageTicketCDF).toLocaleString()} FC
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Moy: {averageDurationMin.toFixed(0)} min/session</span>
            <span>Total: {totalPlayHours.toFixed(1)}h</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>PlayStation 4 vs 5 ({ps4Tickets.length} / {ps5Tickets.length})</span>
            <Tv className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xs font-mono flex items-center justify-between pt-1">
            <span className="text-blue-400 font-bold">PS4: {ps4RevenueCDF.toLocaleString()} FC</span>
            <span className="text-cyan-400 font-bold">PS5: {ps5RevenueCDFExact.toLocaleString()} FC</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
            <div
              className="bg-cyan-400 h-full transition-all"
              style={{ width: `${(ps5RevenueCDFExact / (gamingRevenueCDF || 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bar/Snacks & Économies IoT</span>
            <Coffee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {snackRevenueCDF.toLocaleString()} FC
          </div>
          <span className="text-[11px] text-slate-400 font-mono block">
            {snackItemsSoldCount} article(s) · IoT: ~{Math.round(savedCDF).toLocaleString()} FC ({savedKWh.toFixed(1)} kWh)
          </span>
        </div>
      </div>

      {/* Statistiques Détaillées : Performance par Poste & Heures de Pointe */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tableau Performance par Poste */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Performance & Occupation par Poste</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{getPeriodLabel(reportPeriod)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Poste</th>
                  <th className="py-2.5 px-3">Console</th>
                  <th className="py-2.5 px-3 text-right">Sessions</th>
                  <th className="py-2.5 px-3 text-right">Heures</th>
                  <th className="py-2.5 px-3 text-right">CA (FC)</th>
                  <th className="py-2.5 px-3">Occupation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono">
                {stationPerformance.map((row) => (
                  <tr key={row.stationId} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-sans font-semibold text-white">{row.stationName}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.stationType === 'PS5'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {row.stationType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200">{row.sessionsCount}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{(row.totalMinutes / 60).toFixed(1)}h</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                      {row.revenueCDF.toLocaleString()} FC
                    </td>
                    <td className="py-2 px-3 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full"
                            style={{ width: `${Math.min(100, row.occupancyPercent)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-10 text-right">
                          {row.occupancyPercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heures de Pointe & Performance Caissiers / Top Snacks */}
        <div className="space-y-4">
          {/* Graphique Heures de Pointe */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Heures de Pointe (09h – 23h)</span>
            </h3>
            <div className="flex items-end gap-1 h-28 pt-2 border-b border-slate-800 pb-1">
              {hourlyBreakdown.map((h) => {
                const heightPct = h.count > 0 ? Math.max(12, Math.round((h.count / maxHourlyCount) * 100)) : 4;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div
                      title={`${h.label} : ${h.count} session(s) · ${h.revenueCDF.toLocaleString()} FC`}
                      className={`w-full rounded-t transition-all ${
                        h.count > 0 ? 'bg-gradient-to-t from-blue-600 to-cyan-400' : 'bg-slate-800'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] font-mono text-slate-500 mt-1">{h.hour}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              Survolez une barre pour voir le volume de sessions et le chiffre d&apos;affaires horaire.
            </p>
          </div>

          {/* Caissiers & Top Boissons */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Encaissements par Caissier</span>
            </h3>
            {cashierPerformance.length === 0 ? (
              <p className="text-slate-500 text-[11px]">Aucune opération sur la période.</p>
            ) : (
              <div className="space-y-1.5">
                {cashierPerformance.map((cp) => (
                  <div key={cp.cashierName} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                    <div>
                      <span className="font-semibold text-white block">{cp.cashierName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cp.ticketsCount} ticket(s) · {cp.snacksCount} snack(s)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">{cp.totalCDF.toLocaleString()} FC</span>
                  </div>
                ))}
              </div>
            )}

            {topSnacks.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Top Boissons & Snacks</span>
                </span>
                {topSnacks.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">{item.qty}× {item.name}</span>
                    <span className="font-mono text-amber-400 font-semibold">{item.totalCDF.toLocaleString()} FC</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Répartition des Joueurs par Statut (2.14) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Répartition de la Communauté par Rang & Poids Financier ({tierRules.rollingWindowDays}j)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">VIP</span>
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">{vipCount} Joueurs</div>
            <div className="text-[10px] text-slate-400 font-mono">CA: {vipRevenueCDF.toLocaleString()} FC</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">Fidèles</span>
              <Award className="w-4 h-4 text-slate-200" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-200">{fideleCount} Joueurs</div>
            <div className="text-[10px] text-slate-400 font-mono">CA: {fideleRevenueCDF.toLocaleString()} FC</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Réguliers</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-400">{regulierCount} Joueurs</div>
            <div className="text-[10px] text-slate-400 font-mono">&ge; {tierRules.regMinSessions} sessions payées</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Nouveaux</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-300">{nouveauCount} Joueurs</div>
            <div className="text-[10px] text-slate-400 font-mono">0-{Math.max(1, tierRules.regMinSessions - 1)} sessions</div>
          </div>
        </div>
      </div>

      {/* Répartition par Mode de Paiement (incluant ventilation MIXTE complète) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Répartition du Chiffre d&apos;Affaires par Mode de Règlement (Ventilation Mixte Incluse)</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Bidevise CDF / USD</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-850 border border-slate-700/80 p-3 rounded-xl space-y-1">
            <span className="text-slate-400 font-bold block">Espèces Francs (CDF)</span>
            <div className="text-base font-bold font-mono text-emerald-400">
              {cashCDFRevenue.toLocaleString()} FC
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Tiroir physique (+ part mixte)</div>
          </div>

          <div className="bg-slate-850 border border-slate-700/80 p-3 rounded-xl space-y-1">
            <span className="text-slate-400 font-bold block">Espèces Dollars (USD)</span>
            <div className="text-base font-bold font-mono text-emerald-400">
              ${cashUSDRevenue.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Billets verts (+ part mixte)</div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 font-bold">Illico Cash</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">Rawbank</span>
            </div>
            <div className="text-base font-bold font-mono text-emerald-300">
              {illicoCashRevenueCDF.toLocaleString()} FC
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              (${illicoCashRevenueUSD.toFixed(2)})
            </div>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 p-3 rounded-xl space-y-1">
            <span className="text-cyan-300 font-bold block">Mobile Money</span>
            <div className="text-base font-bold font-mono text-cyan-300">
              {momoRevenueCDF.toLocaleString()} FC
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              M-Pesa / Orange / Airtel (${momoRevenueUSD.toFixed(2)})
            </div>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/30 p-3 rounded-xl space-y-1">
            <span className="text-purple-300 font-bold block">Transactions Mixtes</span>
            <div className="text-base font-bold font-mono text-purple-300">
              {mixedRevenueCDF.toLocaleString()} FC
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Ventilées dans colonnes ci-contre</div>
          </div>
        </div>
      </div>

      {/* Journal d'Audit & Journal des Connexions Personnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="p-3.5 border-b border-slate-800 font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Actions Sensibles (Audit Sécurité)</span>
            </div>
            <span className="text-slate-500 font-mono text-[10px]">{filteredAuditLogs.length} entrées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <tbody className="divide-y divide-slate-800">
                {paginatedAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 text-cyan-400 font-bold text-[10px] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 text-slate-300 font-sans text-[11px]">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={auditPage}
            totalItems={filteredAuditLogs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setAuditPage}
            itemLabel="entrées"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="p-3.5 border-b border-slate-800 font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Connexions Personnel (Date, Heure, Appareil)</span>
            </div>
            <span className="text-slate-500 font-mono text-[10px]">{filteredLoginLogs.length} logs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <tbody className="divide-y divide-slate-800">
                {paginatedLoginLogs.map((ll) => (
                  <tr key={ll.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[10px]">
                      {new Date(ll.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 font-bold text-white whitespace-nowrap font-sans text-[11px]">
                      @{ll.username}
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[10px]">{ll.method}</td>
                    <td className="py-2 px-3 text-[10px]">
                      <span className={`px-1 rounded ${ll.success ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
                        {ll.success ? 'Succès' : 'Échec'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={loginPage}
            totalItems={filteredLoginLogs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setLoginPage}
            itemLabel="connexions"
          />
        </div>
      </div>
    </div>
  );
};

