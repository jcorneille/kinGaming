import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Lock,
  Printer,
  Archive,
  Wallet,
  Smartphone
} from 'lucide-react';
import { CashShift, SnackItem, SnackSale, PaymentMethod, SystemSettings, Ticket } from '../types';
import { Pagination } from './Pagination';

const PAGE_SIZE = 10;

interface CashShiftViewProps {
  currentShift: CashShift;
  shiftHistory: CashShift[];
  snackItems: SnackItem[];
  snackSales: SnackSale[];
  settings: SystemSettings;
  cashierName: string;
  tickets?: Ticket[];
  onRecordSnackSale: (item: SnackItem, quantity: number, paymentMethod: PaymentMethod) => void;
  onRecordSnackCartSale?: (items: Array<{ item: SnackItem; qty: number }>, paymentMethod: PaymentMethod) => SnackSale;
  onPrintSnackSale?: (sale: SnackSale) => void;
  onCloseShift: (countedCDF: number, countedUSD: number, notes?: string) => void;
  onOpenNewShift: (openingFloatCDF: number, openingFloatUSD: number) => void;
}

export const CashShiftView: React.FC<CashShiftViewProps> = ({
  currentShift,
  shiftHistory,
  snackItems,
  snackSales,
  settings,
  cashierName,
  tickets = [],
  onRecordSnackSale,
  onRecordSnackCartSale,
  onPrintSnackSale,
  onCloseShift,
  onOpenNewShift,
}) => {
  const [subTab, setSubTab] = useState<'pos' | 'shift' | 'history'>('pos');

  // Vente de snacks (panier rapide)
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [snackPaymentMethod, setSnackPaymentMethod] = useState<PaymentMethod>('CASH_CDF');

  // Modal clôture de caisse
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedCDF, setCountedCDF] = useState<string>('');
  const [countedUSD, setCountedUSD] = useState<string>('');
  const [shiftNotes, setShiftNotes] = useState<string>('');

  // Modal ouverture nouveau shift
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [newFloatCDF, setNewFloatCDF] = useState<string>('50000');
  const [newFloatUSD, setNewFloatUSD] = useState<string>('20');

  // Pagination par 10 lignes
  const [salesPage, setSalesPage] = useState(1);
  const [reconcilPage, setReconcilPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const electronicTickets = tickets.filter(
    (t) => t.paymentReference || t.paymentMethod === 'ILLICO_CASH' || t.paymentMethod === 'MIXED'
  );
  const paginatedSnackSales = snackSales.slice((salesPage - 1) * PAGE_SIZE, salesPage * PAGE_SIZE);
  const paginatedElectronicTickets = electronicTickets.slice(
    (reconcilPage - 1) * PAGE_SIZE,
    reconcilPage * PAGE_SIZE
  );
  const paginatedShiftHistory = shiftHistory.slice(
    (historyPage - 1) * PAGE_SIZE,
    historyPage * PAGE_SIZE
  );

  // Gestion du panier
  const updateCart = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = snackItems.find(s => s.id === id)!;
    return { item, qty };
  });

  const cartTotalCDF = cartItems.reduce((sum, { item, qty }) => sum + item.priceCDF * qty, 0);
  const cartTotalUSD = cartItems.reduce((sum, { item, qty }) => sum + item.priceUSD * qty, 0);

  const [saleBanner, setSaleBanner] = useState<string | null>(null);

  const handleCheckoutCart = () => {
    if (cartItems.length === 0) return;
    if (onRecordSnackCartSale) {
      const createdSale = onRecordSnackCartSale(cartItems, snackPaymentMethod);
      setCart({});
      setSaleBanner(`Vente ${createdSale.receiptNumber || ''} enregistrée — Reçu prêt à imprimer.`);
      setTimeout(() => setSaleBanner(null), 4000);
      onPrintSnackSale?.(createdSale);
    } else {
      cartItems.forEach(({ item, qty }) => {
        onRecordSnackSale(item, qty, snackPaymentMethod);
      });
      setCart({});
      setSaleBanner('Vente enregistrée avec succès.');
      setTimeout(() => setSaleBanner(null), 4000);
    }
  };

  // Clôture
  const countedCDFNum = parseFloat(countedCDF) || 0;
  const countedUSDNum = parseFloat(countedUSD) || 0;
  const diffCDF = countedCDFNum - currentShift.expectedCashCDF;
  const diffUSD = countedUSDNum - currentShift.expectedCashUSD;

  const handleExecuteClose = (e: React.FormEvent) => {
    e.preventDefault();
    onCloseShift(countedCDFNum, countedUSDNum, shiftNotes);
    setShowCloseModal(false);
  };

  const handleExecuteOpen = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenNewShift(parseFloat(newFloatCDF) || 0, parseFloat(newFloatUSD) || 0);
    setShowOpenModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Barre de navigation interne */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab('pos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subTab === 'pos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ventes Boissons & Snacks
          </button>
          <button
            onClick={() => setSubTab('shift')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subTab === 'shift' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tiroir-Caisse & Clôture Journalière
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Historique des Clôtures ({shiftHistory.length})
          </button>
        </div>

        {currentShift.status === 'OPEN' ? (
          <button
            onClick={() => setShowCloseModal(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Clôturer la Caisse</span>
          </button>
        ) : (
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Ouvrir Nouveau Shift</span>
          </button>
        )}
      </div>

      {/* Onglet 1 : Caisse Snacks & Boissons */}
      {subTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Grille des articles */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Boissons Fraîches & Snacks
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {snackItems.map((item) => {
                const inCartQty = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 block">{item.category}</span>
                      <h4 className="font-bold text-xs text-white mt-0.5">{item.name}</h4>
                      <div className="mt-1 font-mono text-xs font-bold text-emerald-400">
                        {item.priceCDF.toLocaleString()} FC
                        <span className="text-[10px] text-slate-400 font-normal ml-1">(${item.priceUSD.toFixed(2)})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Stock : {item.stockQuantity}</div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => updateCart(item.id, -1)}
                        disabled={inCartQty === 0}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs text-white">{inCartQty}</span>
                      <button
                        onClick={() => updateCart(item.id, 1)}
                        className="w-7 h-7 bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panier d'encaissement */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-fit space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span>Panier d'Encaissement</span>
              </h3>

              {cartItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Le panier est vide. Cliquez sur un article pour l'ajouter.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 my-2 text-xs">
                  {cartItems.map(({ item, qty }) => (
                    <div key={item.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {qty} x {item.priceCDF.toLocaleString()} FC
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-400">
                        {(item.priceCDF * qty).toLocaleString()} FC
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">Total à payer :</span>
                  <div className="text-right">
                    <div className="font-mono font-bold text-base text-emerald-400">
                      {cartTotalCDF.toLocaleString()} FC
                    </div>
                    <div className="font-mono text-xs text-slate-400">(${cartTotalUSD.toFixed(2)})</div>
                  </div>
                </div>

                {/* Mode de règlement snack */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Règlement :</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'CASH_CDF', label: 'Espèces FC' },
                      { id: 'CASH_USD', label: 'Espèces USD' },
                      { id: 'ILLICO_CASH', label: 'Illico Cash' },
                      { id: 'MPESA', label: 'M-Pesa' },
                      { id: 'ORANGE_MONEY', label: 'Orange Money' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSnackPaymentMethod(m.id as PaymentMethod)}
                        className={`py-1.5 px-2 text-[11px] font-semibold rounded border ${
                          snackPaymentMethod === m.id
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCheckoutCart}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Encaisser la vente
                </button>
              </div>
            )}
          </div>

          {/* Historique des Ventes Boissons & Snacks (Réimpression Thermique) */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
            <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-800/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">
                  Historique des Ventes Boissons & Snacks ({snackSales.length})
                </span>
              </div>
              {saleBanner && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
                  {saleBanner}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Reçu</th>
                    <th className="py-2 px-3">Date / Heure</th>
                    <th className="py-2 px-3">Articles vendus</th>
                    <th className="py-2 px-3">Caissier</th>
                    <th className="py-2 px-3">Mode</th>
                    <th className="py-2 px-3 text-right">Montant</th>
                    <th className="py-2 px-3 text-right">Reçu Thermique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {paginatedSnackSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Aucune vente boissons / snacks enregistrée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    paginatedSnackSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                          {sale.receiptNumber || `SNK-${sale.id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono whitespace-nowrap">
                          {new Date(sale.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}{' '}
                          {new Date(sale.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-3 text-white font-medium">
                          {sale.items && sale.items.length > 0
                            ? sale.items.map((it) => `${it.quantity}× ${it.itemName}`).join(', ')
                            : `${sale.quantity}× ${sale.itemName}`}
                        </td>
                        <td className="py-2 px-3 text-slate-300">{sale.cashierName}</td>
                        <td className="py-2 px-3 font-mono text-slate-300">{sale.paymentMethod}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {sale.totalCDF.toLocaleString()} FC{' '}
                          <span className="text-[10px] text-slate-400 font-normal">(${sale.totalUSD.toFixed(2)})</span>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onPrintSnackSale?.(sale)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg font-semibold transition cursor-pointer"
                            title="Réimprimer le reçu de vente thermique"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimer</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={salesPage}
              totalItems={snackSales.length}
              pageSize={PAGE_SIZE}
              onPageChange={setSalesPage}
              itemLabel="ventes"
            />
          </div>
        </div>
      )}

      {/* Onglet 2 : Tiroir-Caisse & Clôture */}
      {subTab === 'shift' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400">Fond Initial</span>
              <div className="font-mono font-bold text-base text-white">
                {currentShift.openingFloatCDF.toLocaleString()} FC
              </div>
              <div className="font-mono text-[10px] text-slate-400">(${currentShift.openingFloatUSD})</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400">Espèces (Tiroir FC)</span>
              <div className="font-mono font-bold text-base text-emerald-400">
                {currentShift.expectedCashCDF.toLocaleString()} FC
              </div>
              <div className="text-[10px] text-slate-500">Tickets + Snacks</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400">Espèces (Tiroir USD)</span>
              <div className="font-mono font-bold text-base text-emerald-400">
                ${currentShift.expectedCashUSD.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">Billets physiques</div>
            </div>

            <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-3.5 space-y-1 bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 font-bold">Illico Cash (Rawbank)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">Banque</span>
              </div>
              <div className="font-mono font-bold text-base text-emerald-300">
                {(currentShift.totalIllicoCashCDF || 0).toLocaleString()} FC
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                (${(currentShift.totalIllicoCashUSD || 0).toFixed(2)})
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400">Mobile Money (M-Pesa/Orange)</span>
              <div className="font-mono font-bold text-base text-cyan-400">
                {currentShift.totalMomoCDF.toLocaleString()} FC
              </div>
              <div className="font-mono text-[10px] text-slate-400">(${currentShift.totalMomoUSD.toFixed(2)})</div>
            </div>
          </div>

          {/* Rapprochement des Références Mobile Money & Illico Cash */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
            <div className="p-3.5 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs">
                  Rapprochement des Références Électroniques (Illico Cash & Mobile Money)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {electronicTickets.length} transactions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-800/80 text-slate-400 font-sans border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Ticket</th>
                    <th className="py-2 px-3">Date/Heure</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">Mode</th>
                    <th className="py-2 px-3">Réf. Transaction</th>
                    <th className="py-2 px-3">N° Payeur</th>
                    <th className="py-2 px-3 text-right">Montant FC</th>
                    <th className="py-2 px-3 text-right">Montant USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {paginatedElectronicTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-850">
                        <td className="py-2 px-3 text-blue-400 font-bold font-mono">#{t.ticketNumber}</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">
                          {new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-3 text-white font-sans font-medium">{t.clientName}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.paymentMethod === 'ILLICO_CASH'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : t.paymentMethod === 'MIXED'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {t.paymentMethod === 'ILLICO_CASH'
                              ? 'Illico Cash'
                              : t.paymentMethod === 'MIXED'
                              ? 'Mixte'
                              : t.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-amber-300 font-mono font-bold tracking-wider">
                          {t.paymentReference || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-300">{t.payerPhone || t.clientPhone || '—'}</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                          {t.amountCDF.toLocaleString()} FC
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">
                          ${t.amountUSD.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  {electronicTickets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-slate-500 font-sans">
                        Aucun paiement électronique ou Illico Cash pour l'instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={reconcilPage}
              totalItems={electronicTickets.length}
              pageSize={PAGE_SIZE}
              onPageChange={setReconcilPage}
              itemLabel="paiements"
            />
          </div>
        </div>
      )}

      {/* Onglet 3 : Historique des Clôtures */}
      {subTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-800 font-bold text-white flex items-center justify-between">
            <span>Journal des Rapports de Clôture (Rapport Z)</span>
            <span className="text-slate-400 font-mono text-[11px]">{shiftHistory.length} clôtures</span>
          </div>
          {shiftHistory.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-sans">
              Les shifts clôturés s&apos;archiveront automatiquement ici avec le détail des écarts.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-slate-800/80 text-slate-400 font-sans border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date Clôture</th>
                      <th className="py-2.5 px-3">Caissier</th>
                      <th className="py-2.5 px-3 text-right">Attendu FC</th>
                      <th className="py-2.5 px-3 text-right">Compté FC</th>
                      <th className="py-2.5 px-3 text-right">Attendu USD</th>
                      <th className="py-2.5 px-3 text-right">Compté USD</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {paginatedShiftHistory.map((sh) => (
                      <tr key={sh.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(sh.closedAt || sh.openedAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-white font-sans font-semibold">{sh.cashierName}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{sh.expectedCashCDF.toLocaleString()} FC</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                          {(sh.closingCashCDF ?? sh.expectedCashCDF).toLocaleString()} FC
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">${sh.expectedCashUSD.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                          ${(sh.closingCashUSD ?? sh.expectedCashUSD).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans truncate max-w-[200px]">
                          {sh.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={historyPage}
                totalItems={shiftHistory.length}
                pageSize={PAGE_SIZE}
                onPageChange={setHistoryPage}
                itemLabel="clôtures"
              />
            </>
          )}
        </div>
      )}

      {/* Modal Clôture de Caisse avec Comptage Physique */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-500" />
              <span>Clôture Journalière de Caisse</span>
            </h3>

            <p className="text-xs text-slate-400">
              Comptez physiquement les billets présents dans votre tiroir-caisse pour calculer l'écart éventuel.
            </p>

            <form onSubmit={handleExecuteClose} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                  <label className="text-slate-400 block mb-1">Billets FC comptés :</label>
                  <input
                    type="number"
                    value={countedCDF}
                    onChange={(e) => setCountedCDF(e.target.value)}
                    placeholder={currentShift.expectedCashCDF.toString()}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-white font-mono font-bold text-sm"
                    required
                  />
                  <div className="mt-1 text-[10px] text-slate-400 font-mono">
                    Attendu: {currentShift.expectedCashCDF.toLocaleString()} FC
                  </div>
                  {countedCDF && (
                    <div className={`mt-1 font-mono font-bold text-xs ${diffCDF >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Écart: {diffCDF >= 0 ? `+${diffCDF.toLocaleString()}` : diffCDF.toLocaleString()} FC
                    </div>
                  )}
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                  <label className="text-slate-400 block mb-1">Billets USD comptés ($) :</label>
                  <input
                    type="number"
                    step="0.5"
                    value={countedUSD}
                    onChange={(e) => setCountedUSD(e.target.value)}
                    placeholder={currentShift.expectedCashUSD.toFixed(2)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-white font-mono font-bold text-sm"
                    required
                  />
                  <div className="mt-1 text-[10px] text-slate-400 font-mono">
                    Attendu: ${currentShift.expectedCashUSD.toFixed(2)}
                  </div>
                  {countedUSD && (
                    <div className={`mt-1 font-mono font-bold text-xs ${diffUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Écart: {diffUSD >= 0 ? `+$${diffUSD.toFixed(2)}` : `-$${Math.abs(diffUSD).toFixed(2)}`}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Notes / Explications du caissier :</label>
                <textarea
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Ex: Rendu monnaie client poste 2 avec billet abîmé..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white resize-none h-16 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30"
                >
                  Valider la Clôture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ouverture Nouveau Shift */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span>Ouverture de Shift</span>
            </h3>

            <form onSubmit={handleExecuteOpen} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Fond de caisse en Francs (CDF) :</label>
                <input
                  type="number"
                  value={newFloatCDF}
                  onChange={(e) => setNewFloatCDF(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Fond de caisse en Dollars (USD) :</label>
                <input
                  type="number"
                  value={newFloatUSD}
                  onChange={(e) => setNewFloatUSD(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl"
                >
                  Démarrer le Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
