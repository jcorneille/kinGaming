import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Printer,
  RotateCcw,
  Tv,
} from 'lucide-react';
import { Ticket, TicketStatus, Station } from '../types';
import { Pagination } from './Pagination';

interface TicketsViewProps {
  tickets: Ticket[];
  stations?: Station[];
  onPrintTicket: (ticket: Ticket) => void;
  onRefundTicket: (ticketId: string) => void;
}

const PAGE_SIZE = 10;

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  stations = [],
  onPrintTicket,
  onRefundTicket,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrage combiné
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.clientPhone && t.clientPhone.includes(searchTerm)) ||
      (t.paymentReference && t.paymentReference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesStation = stationFilter === 'ALL' || t.stationId.toString() === stationFilter;

    return matchesSearch && matchesStatus && matchesStation;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, stationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = filteredTickets.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const stationOptions =
    stations.length > 0
      ? stations.map((s) => ({ id: s.id, label: `${s.name} (${s.type})` }))
      : Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          label: `Poste ${i + 1} (${i + 1 > 8 ? 'PS5' : 'PS4'})`,
        }));

  const formatDateTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">En cours</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Terminé</span>;
      case 'extended':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">Prolongé</span>;
      case 'refunded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Remboursé</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Annulé</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par n° ticket, joueur, tél, réf Mobile Money..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Filtre Statut */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 border-none focus:ring-0 cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Tous les statuts</option>
              <option value="active" className="bg-slate-900">En cours</option>
              <option value="completed" className="bg-slate-900">Terminés</option>
              <option value="extended" className="bg-slate-900">Prolongés</option>
              <option value="refunded" className="bg-slate-900">Remboursés</option>
            </select>
          </div>

          {/* Filtre Poste */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
            <Tv className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 border-none focus:ring-0 cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Tous les {stationOptions.length} postes</option>
              {stationOptions.map((st) => (
                <option key={st.id} value={st.id.toString()} className="bg-slate-900">
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des tickets */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Poste</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Durée</th>
                <th className="py-3 px-4">Période</th>
                <th className="py-3 px-4 text-right">Montant (FC / $)</th>
                <th className="py-3 px-4">Règlement</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    Aucun ticket ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-sans font-bold text-slate-200">{t.stationName || `Poste ${t.stationId}`}</span>
                      <span className={`ml-1.5 text-[10px] px-1 py-0.2 rounded font-bold ${t.stationType === 'PS5' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                        {t.stationType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{t.clientName}</div>
                      {t.clientPhone && <div className="text-[10px] text-slate-400">{t.clientPhone}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {t.durationMinutes} min
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDateTime(t.startTime)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-bold text-emerald-400">{t.amountCDF.toLocaleString()} FC</div>
                      <div className="text-[10px] text-slate-400">${t.amountUSD.toFixed(2)}</div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-300 whitespace-nowrap font-sans">
                      <span className="font-medium">{t.paymentMethod}</span>
                      {t.paymentReference && (
                        <div className="text-[10px] font-mono text-slate-400">{t.paymentReference}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => onPrintTicket(t)}
                          title="Réimprimer le ticket thermique"
                          className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {t.status === 'active' && (
                          <button
                            onClick={() => onRefundTicket(t.id)}
                            title="Annuler et rembourser le ticket"
                            className="p-1.5 text-amber-400 hover:text-white hover:bg-amber-600 rounded-lg transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safePage}
          totalItems={filteredTickets.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="tickets"
        />
      </div>
    </div>
  );
};
