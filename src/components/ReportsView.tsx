import React, { useState } from 'react';
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
  Crown,
  Award,
  KeyRound,
  Smartphone,
  Wallet,
  CreditCard
} from 'lucide-react';
import { Ticket, Station, Client, AuditLog, DomotiqueDevice, SystemSettings, LoginLog, TierRulesConfig } from '../types';
import { DEFAULT_TIER_RULES } from '../services/tierEngine';
import { Pagination } from './Pagination';

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
  onExportJSON: () => void;
  onExportCSV: () => void;
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
  onExportJSON,
  onExportCSV,
}) => {
  const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [auditPage, setAuditPage] = useState(1);
  const [loginPage, setLoginPage] = useState(1);

  const paginatedAuditLogs = auditLogs.slice((auditPage - 1) * PAGE_SIZE, auditPage * PAGE_SIZE);
  const paginatedLoginLogs = loginLogs.slice((loginPage - 1) * PAGE_SIZE, loginPage * PAGE_SIZE);

  // Chiffres clés recettes
  const validTickets = tickets.filter(t => t.status !== 'cancelled' && t.status !== 'refunded');
  const totalRevenueCDF = validTickets.reduce((sum, t) => sum + t.amountCDF, 0);
  const totalRevenueUSD = validTickets.reduce((sum, t) => sum + t.amountUSD, 0);

  // Recettes PS4 vs PS5
  const ps4Tickets = validTickets.filter(t => t.stationType === 'PS4');
  const ps5Tickets = validTickets.filter(t => t.stationType === 'PS5');
  const ps4RevenueCDF = ps4Tickets.reduce((sum, t) => sum + t.amountCDF, 0);
  const ps5RevenueCDF = ps5Tickets.reduce((sum, t) => sum + t.amountCDF, 0);

  // Recettes générées par Statuts Clients (Fidèle & VIP vs Autres)
  const clientMap = new Map(clients.map(c => [c.id, c]));

  let vipRevenueCDF = 0;
  let fideleRevenueCDF = 0;
  let regularOrNewRevenueCDF = 0;

  validTickets.forEach(t => {
    if (t.clientId) {
      const client = clientMap.get(t.clientId);
      if (client?.tier === 'VIP') vipRevenueCDF += t.amountCDF;
      else if (client?.tier === 'FIDELE') fideleRevenueCDF += t.amountCDF;
      else regularOrNewRevenueCDF += t.amountCDF;
    } else {
      regularOrNewRevenueCDF += t.amountCDF;
    }
  });

  // Décompte par mode de paiement
  let cashCDFRevenue = 0;
  let cashUSDRevenue = 0;
  let illicoCashRevenueCDF = 0;
  let illicoCashRevenueUSD = 0;
  let momoRevenueCDF = 0;
  let pointsRevenueCDF = 0;
  let mixedRevenueCDF = 0;

  validTickets.forEach((t) => {
    if (t.paymentMethod === 'CASH_CDF') cashCDFRevenue += t.amountCDF;
    else if (t.paymentMethod === 'CASH_USD') cashUSDRevenue += t.amountUSD;
    else if (t.paymentMethod === 'ILLICO_CASH') {
      illicoCashRevenueCDF += t.amountCDF;
      illicoCashRevenueUSD += t.amountUSD;
    } else if (t.paymentMethod === 'MPESA' || t.paymentMethod === 'ORANGE_MONEY' || t.paymentMethod === 'AIRTEL_MONEY') {
      momoRevenueCDF += t.amountCDF;
    } else if (t.paymentMethod === 'LOYALTY_POINTS') {
      pointsRevenueCDF += t.amountCDF;
    } else if (t.paymentMethod === 'MIXED') {
      mixedRevenueCDF += t.amountCDF;
      if (t.mixedBreakdown) {
        cashCDFRevenue += t.mixedBreakdown.cashCDF || 0;
        illicoCashRevenueCDF += t.mixedBreakdown.illicoCashCDF || 0;
      }
    }
  });

  // Décompte clients par statut
  const vipCount = clients.filter(c => c.tier === 'VIP').length;
  const fideleCount = clients.filter(c => c.tier === 'FIDELE').length;
  const regulierCount = clients.filter(c => c.tier === 'REGULIER').length;
  const nouveauCount = clients.filter(c => c.tier === 'NOUVEAU').length;

  // Énergie
  const totalEnergyKWh = devices.reduce((sum, d) => sum + d.totalKWh, 0);
  const savedKWh = totalEnergyKWh * 0.25;
  const savedUSD = savedKWh * 0.12;
  const savedCDF = savedUSD * settings.exchangeRate;

  return (
    <div className="space-y-5">
      {/* Barre d'actions d'export */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white">Période d'Analyse :</span>
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  reportPeriod === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Cette Semaine' : 'Ce Mois'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onExportJSON}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sauvegarde Base (JSON)</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Recettes Totales (CDF)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {totalRevenueCDF.toLocaleString()} FC
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Bidevise : ${totalRevenueUSD.toFixed(2)}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>CA Clients Fidèles & VIP</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {(vipRevenueCDF + fideleRevenueCDF).toLocaleString()} FC
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {Math.round(((vipRevenueCDF + fideleRevenueCDF) / (totalRevenueCDF || 1)) * 100)}% du chiffre d'affaires
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>PlayStation 4 vs 5</span>
            <Tv className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xs font-mono flex items-center justify-between pt-1">
            <span className="text-blue-400 font-bold">PS4: {ps4RevenueCDF.toLocaleString()} FC</span>
            <span className="text-cyan-400 font-bold">PS5: {ps5RevenueCDF.toLocaleString()} FC</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
            <div
              className="bg-cyan-400 h-full"
              style={{ width: `${(ps5RevenueCDF / (totalRevenueCDF || 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Économies Domotique</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            ~{Math.round(savedCDF).toLocaleString()} FC
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {savedKWh.toFixed(1)} kWh évités (${savedUSD.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Répartition des Joueurs par Statut (2.14) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Répartition de la Communauté par Rang & Poids Financier</span>
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
            <div className="text-[10px] text-slate-400 font-mono">≥ 3 sessions payées</div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Nouveaux</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-300">{nouveauCount} Joueurs</div>
            <div className="text-[10px] text-slate-400 font-mono">0-2 sessions</div>
          </div>
        </div>
      </div>

      {/* Répartition par Mode de Paiement (2.10 & Modification 1) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Répartition du Chiffre d'Affaires par Mode de Règlement</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Bidevise CDF / USD</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-850 border border-slate-700/80 p-3 rounded-xl space-y-1">
            <span className="text-slate-400 font-bold block">Espèces Francs (CDF)</span>
            <div className="text-base font-bold font-mono text-emerald-400">
              {cashCDFRevenue.toLocaleString()} FC
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Tiroir physique</div>
          </div>

          <div className="bg-slate-850 border border-slate-700/80 p-3 rounded-xl space-y-1">
            <span className="text-slate-400 font-bold block">Espèces Dollars (USD)</span>
            <div className="text-base font-bold font-mono text-emerald-400">
              ${cashUSDRevenue.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Billets verts</div>
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
            <div className="text-[10px] text-slate-400 font-mono">M-Pesa / Orange</div>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/30 p-3 rounded-xl space-y-1">
            <span className="text-purple-300 font-bold block">Paiements Mixtes</span>
            <div className="text-base font-bold font-mono text-purple-300">
              {mixedRevenueCDF.toLocaleString()} FC
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Espèces + Électronique</div>
          </div>
        </div>
      </div>

      {/* Journal d'Audit & Journal des Connexions Personnel (2.13) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Journal d'Audit des Actions Sensibles */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="p-3.5 border-b border-slate-800 font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Actions Sensibles (Audit Sécurité)</span>
            </div>
            <span className="text-slate-500 font-mono text-[10px]">{auditLogs.length} entrées</span>
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
            totalItems={auditLogs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setAuditPage}
            itemLabel="entrées"
          />
        </div>

        {/* Journal des Connexions Personnel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="p-3.5 border-b border-slate-800 font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Connexions Personnel (Date, Heure, Appareil)</span>
            </div>
            <span className="text-slate-500 font-mono text-[10px]">{loginLogs.length} logs</span>
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
            totalItems={loginLogs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setLoginPage}
            itemLabel="connexions"
          />
        </div>
      </div>
    </div>
  );
};
