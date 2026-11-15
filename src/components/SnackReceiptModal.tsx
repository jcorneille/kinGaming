import React, { useRef, useState } from 'react';
import { X, Printer, CheckCircle2, ShoppingBag } from 'lucide-react';
import { SnackSale, SystemSettings } from '../types';
import { printThermalReceiptElement } from '../utils/thermalPrint';

interface SnackReceiptModalProps {
  sale: SnackSale | null;
  onClose: () => void;
  settings?: SystemSettings;
}

export const SnackReceiptModal: React.FC<SnackReceiptModalProps> = ({
  sale,
  onClose,
  settings,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(settings?.receiptPaperSize || '80mm');
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  if (!sale) return null;

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPaymentLabel = (method: SnackSale['paymentMethod']) => {
    switch (method) {
      case 'ILLICO_CASH':
        return 'Illico Cash (Rawbank)';
      case 'CASH_CDF':
        return 'Espèces CDF';
      case 'CASH_USD':
        return 'Espèces USD ($)';
      case 'MPESA':
        return 'M-Pesa (Vodacom)';
      case 'ORANGE_MONEY':
        return 'Orange Money';
      case 'AIRTEL_MONEY':
        return 'Airtel Money';
      case 'MIXED':
        return 'Paiement Mixte';
      case 'LOYALTY_POINTS':
        return 'Points Fidélité';
      default:
        return method;
    }
  };

  const itemsList =
    sale.items && sale.items.length > 0
      ? sale.items
      : [
          {
            itemName: sale.itemName,
            quantity: sale.quantity,
            unitPriceCDF: Math.round(sale.totalCDF / Math.max(1, sale.quantity)),
            unitPriceUSD: sale.totalUSD / Math.max(1, sale.quantity),
            totalCDF: sale.totalCDF,
            totalUSD: sale.totalUSD,
          },
        ];

  const receiptNo = sale.receiptNumber || `SNK-${sale.id.slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    const ok = printThermalReceiptElement(
      printAreaRef.current,
      paperSize,
      `Reçu Boissons & Snacks ${receiptNo}`
    );
    if (ok) {
      setPrintFeedback(`Impression lancée (format thermique ${paperSize})`);
      setTimeout(() => setPrintFeedback(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <ShoppingBag className="w-4 h-4" />
            <span>Reçu Vente Boissons / Snacks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  paperSize === '58mm' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  paperSize === '80mm' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                80mm
              </button>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {printFeedback && (
          <div className="px-3.5 py-2 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{printFeedback}</span>
          </div>
        )}

        {/* Aperçu Reçu Thermique */}
        <div className="p-4 bg-slate-950 flex justify-center overflow-y-auto max-h-[70vh]">
          <div
            id="snack-receipt-print-area"
            ref={printAreaRef}
            className={`${
              paperSize === '58mm' ? 'w-[220px] thermal-58mm text-[10px]' : 'w-[290px] thermal-80mm text-[11px]'
            } bg-white text-black p-4 rounded shadow font-mono leading-tight select-all`}
          >
            {/* En-tête Salle */}
            <div className="text-center pb-2 border-b border-dashed border-neutral-400">
              <h1 className="font-extrabold text-sm tracking-wider uppercase">
                {settings?.venueName || 'KIN GAMING HUB'}
              </h1>
              <p className="text-[10px] text-neutral-600">Snack-Bar & Boissons</p>
              <p className="text-[9px] text-neutral-500">
                {settings?.venueAddress || '12, Boulevard du 30 Juin, Gombe, Kinshasa'}
              </p>
              <p className="text-[9px] text-neutral-500">
                Tél : {settings?.venuePhone || '+243 89 545 7097'}
              </p>
            </div>

            {/* Détails Reçu */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>REÇU N° :</span>
                <span>{receiptNo}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Date : {formatDate(sale.timestamp)}</span>
                <span>Heure : {formatTime(sale.timestamp)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Caissier :</span>
                <span>{sale.cashierName}</span>
              </div>
            </div>

            {/* Articles vendus */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1.5">
              <div className="flex justify-between font-bold text-[10px] uppercase border-b border-neutral-300 pb-1">
                <span>Article</span>
                <span>Qté × Total</span>
              </div>
              {itemsList.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span>{it.itemName}</span>
                    <span className="font-bold">{it.totalCDF.toLocaleString()} FC</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-600">
                    <span>
                      {it.quantity} × {it.unitPriceCDF.toLocaleString()} FC
                    </span>
                    <span>(${it.totalUSD.toFixed(2)})</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Montant & Mode de paiement */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL PAYÉ :</span>
                <span>{sale.totalCDF.toLocaleString()} CDF</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600">
                <span>Équivalent USD :</span>
                <span>${sale.totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Mode Paiement :</span>
                <span className="font-semibold">{getPaymentLabel(sale.paymentMethod)}</span>
              </div>
              {sale.paymentReference && (
                <div className="flex justify-between text-[9px] text-neutral-600">
                  <span>Réf. Transaction :</span>
                  <span className="font-mono font-bold">{sale.paymentReference}</span>
                </div>
              )}
              {sale.mixedBreakdown && (
                <div className="bg-neutral-100 p-1.5 rounded text-[9px] space-y-0.5 border border-neutral-300 mt-1">
                  {(sale.mixedBreakdown.cashCDF || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Part Espèces CDF :</span>
                      <span className="font-bold">{sale.mixedBreakdown.cashCDF?.toLocaleString()} FC</span>
                    </div>
                  )}
                  {(sale.mixedBreakdown.cashUSD || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Part Espèces USD :</span>
                      <span className="font-bold">${sale.mixedBreakdown.cashUSD?.toFixed(2)}</span>
                    </div>
                  )}
                  {(sale.mixedBreakdown.illicoCashCDF || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Part Illico Cash :</span>
                      <span className="font-bold">{sale.mixedBreakdown.illicoCashCDF?.toLocaleString()} FC</span>
                    </div>
                  )}
                  {(sale.mixedBreakdown.momoCDF || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Part {sale.mixedBreakdown.momoProvider || 'Mobile Money'} :</span>
                      <span className="font-bold">{sale.mixedBreakdown.momoCDF?.toLocaleString()} FC</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pied de reçu */}
            <div className="text-center pt-2 text-[9px] text-neutral-600 space-y-1">
              <p className="font-semibold">
                {settings?.receiptFooterMessage || 'Merci pour votre visite à Kin Gaming Hub !'}
              </p>
              {settings?.receiptLegalNotice && (
                <p className="text-[8px] text-neutral-500 font-mono leading-none">
                  {settings.receiptLegalNotice}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="p-3.5 bg-slate-800 border-t border-slate-700 flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer le Reçu ({paperSize})</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
