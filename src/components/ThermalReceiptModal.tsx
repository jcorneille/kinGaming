import React, { useRef, useState } from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { Ticket, SystemSettings } from '../types';
import { QRCodeSVG } from './QRCodeSVG';
import { printThermalReceiptElement } from '../utils/thermalPrint';

interface ThermalReceiptModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  publicBaseUrl?: string;
  qrCodeFallbackMode?: 'URL' | 'OFFLINE_TEXT';
  settings?: SystemSettings;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ 
  ticket, 
  onClose,
  publicBaseUrl,
  qrCodeFallbackMode = 'URL',
  settings
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(settings?.receiptPaperSize || '80mm');
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  if (!ticket) return null;

  const handlePrint = () => {
    const ok = printThermalReceiptElement(
      printAreaRef.current,
      paperSize,
      `Ticket ${ticket.ticketNumber} - ${settings?.venueName || 'Kin Gaming Hub'}`
    );
    if (ok) {
      setPrintFeedback(`Impression lancée (format thermique ${paperSize})`);
      setTimeout(() => setPrintFeedback(null), 3500);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const baseUrl = publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://kingaminghub.cd');
  const ticketToken = ticket.signedToken || `kgh_tok_${ticket.id}`;
  
  // URL publique de vérification en direct sans connexion
  const verificationUrl = `${baseUrl}/t/${ticketToken}`;

  // Texte offline de secours si pas de domaine public
  const offlineText = `KIN GAMING HUB - TICKET OFFICIEL
Ticket N°: ${ticket.ticketNumber}
Poste: ${ticket.stationId} (${ticket.stationType})
Début: ${formatTime(ticket.startTime)} | Fin: ${formatTime(ticket.endTime)}
Durée: ${ticket.durationMinutes}m | Total: ${ticket.amountCDF.toLocaleString()} FC
Statut: Actif / Validé`;

  const qrValue = qrCodeFallbackMode === 'OFFLINE_TEXT' ? offlineText : verificationUrl;

  const getPaymentLabel = (method: Ticket['paymentMethod']) => {
    switch (method) {
      case 'ILLICO_CASH':
        return 'Illico Cash (Rawbank)';
      case 'MIXED':
        return 'Paiement Mixte (Espèces + Illico)';
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
      case 'LOYALTY_POINTS':
        return 'Points Fidélité';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ticket Validé & Imprimable</span>
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

        {/* Aperçu du Ticket Thermique 58mm / 80mm */}
        <div className="p-4 bg-slate-950 flex justify-center overflow-y-auto max-h-[70vh]">
          <div
            id="thermal-receipt-print-area"
            ref={printAreaRef}
            className={`${
              paperSize === '58mm' ? 'w-[220px] thermal-58mm text-[10px]' : 'w-[290px] thermal-80mm text-[11px]'
            } bg-white text-black p-4 rounded shadow font-mono leading-tight select-all`}
          >
            {/* Logo / Header */}
            <div className="text-center pb-2 border-b border-dashed border-neutral-400">
              <h1 className="font-extrabold text-sm tracking-wider uppercase">
                {settings?.venueName || 'KIN GAMING HUB'}
              </h1>
              <p className="text-[10px] text-neutral-600">Salle de Jeux Vidéo & eSports</p>
              <p className="text-[9px] text-neutral-500">
                {settings?.venueAddress || 'Gombe, Kinshasa - RDC'}
              </p>
              <p className="text-[9px] text-neutral-500">
                Tél : {settings?.venuePhone || '+243 89 545 7097'}
              </p>
            </div>

            {/* Détails Ticket */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>TICKET :</span>
                <span>{ticket.ticketNumber}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Date : {formatDate(ticket.createdAt)}</span>
                <span>Heure : {formatTime(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Caissier :</span>
                <span>{ticket.cashierName}</span>
              </div>
            </div>

            {/* Infos Session */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span className="font-bold">POSTE ATTRIBUÉ :</span>
                <span className="font-bold text-xs">POSTE {ticket.stationId} ({ticket.stationType})</span>
              </div>
              <div className="flex justify-between">
                <span>Joueur :</span>
                <span className="font-semibold">{ticket.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Durée achetée :</span>
                <span className="font-bold">{ticket.durationMinutes} Minutes</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Période :</span>
                <span>{formatTime(ticket.startTime)} - {formatTime(ticket.endTime)}</span>
              </div>
            </div>

            {/* Montant & Règlement */}
            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL :</span>
                <span>{ticket.amountCDF.toLocaleString()} CDF</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600">
                <span>Équivalent USD :</span>
                <span>${ticket.amountUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Mode Paiement :</span>
                <span className="font-semibold">{getPaymentLabel(ticket.paymentMethod)}</span>
              </div>
              {ticket.paymentReference && (
                <div className="flex justify-between text-[9px] text-neutral-600">
                  <span>Réf Transaction :</span>
                  <span className="font-mono font-bold">{ticket.paymentReference}</span>
                </div>
              )}
              {ticket.payerPhone && (
                <div className="flex justify-between text-[9px] text-neutral-600">
                  <span>Payeur :</span>
                  <span className="font-mono">{ticket.payerPhone}</span>
                </div>
              )}
              {ticket.mixedBreakdown && (
                <div className="bg-neutral-100 p-1.5 rounded text-[9px] space-y-0.5 border border-neutral-300">
                  <div className="flex justify-between">
                    <span>Part Espèces :</span>
                    <span className="font-bold">{ticket.mixedBreakdown.cashCDF?.toLocaleString()} FC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Part Illico Cash :</span>
                    <span className="font-bold">{ticket.mixedBreakdown.illicoCashCDF?.toLocaleString()} FC</span>
                  </div>
                </div>
              )}
              {ticket.changeGivenCDF !== undefined && ticket.changeGivenCDF > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>Monnaie Rendue :</span>
                  <span>{ticket.changeGivenCDF.toLocaleString()} CDF</span>
                </div>
              )}
            </div>

            {/* QR Code de Vérification Publique & Suivi en Direct (Modification 2) */}
            <div className="py-3 text-center flex flex-col items-center">
              <QRCodeSVG
                value={qrValue}
                size={110}
                fgColor="#000000"
                bgColor="#ffffff"
              />
              <span className="text-[9px] font-bold text-neutral-800 mt-1.5 uppercase tracking-tight font-sans">
                Scannez pour vérifier & suivre en direct
              </span>
              <span className="text-[8px] text-neutral-500 font-mono break-all max-w-[240px]">
                {qrCodeFallbackMode === 'OFFLINE_TEXT' ? 'Mode hors-ligne direct' : `/t/${ticketToken}`}
              </span>
            </div>

            {/* Bas de ticket - Mention Espace Client (Modification 3) */}
            <div className="text-center pt-2 border-t border-dashed border-neutral-400 text-[9px] text-neutral-600 space-y-1">
              <div className="p-1.5 bg-neutral-100 rounded border border-neutral-300">
                <p className="font-bold text-black text-[10px]">ESPACE CLIENT : /client</p>
                <p className="text-[8px] text-neutral-700">Suivez vos points et votre place dans la file</p>
              </div>
              <p className="font-semibold pt-1">
                {settings?.receiptFooterMessage || 'Merci pour votre confiance !'}
              </p>
              {settings?.receiptLegalNotice && (
                <p className="text-[8px] text-neutral-500 font-mono pt-0.5 leading-none">
                  {settings.receiptLegalNotice}
                </p>
              )}
              <p className="text-[8px] text-neutral-400">Conservez ce ticket jusqu'à la fin de votre session.</p>
            </div>
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="p-3.5 bg-slate-800 border-t border-slate-700 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer le Ticket (Thermique {paperSize})</span>
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
