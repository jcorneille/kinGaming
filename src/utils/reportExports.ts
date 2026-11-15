import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AuditLog,
  CashShift,
  Client,
  DomotiqueDevice,
  SnackSale,
  Station,
  SystemSettings,
  Ticket,
} from '../types';

export interface StationPerformanceRow {
  stationId: number;
  stationName: string;
  stationType: string;
  sessionsCount: number;
  totalMinutes: number;
  revenueCDF: number;
  revenueUSD: number;
  occupancyPercent: number;
}

export interface CashierPerformanceRow {
  cashierName: string;
  ticketsCount: number;
  snacksCount: number;
  totalCDF: number;
  totalUSD: number;
}

export interface ReportExportPayload {
  periodLabel: string;
  settings: SystemSettings;
  tickets: Ticket[];
  snackSales: SnackSale[];
  stations: Station[];
  clients: Client[];
  shiftHistory: CashShift[];
  auditLogs: AuditLog[];
  devices: DomotiqueDevice[];
  stationPerformance: StationPerformanceRow[];
  cashierPerformance: CashierPerformanceRow[];
  kpis: {
    gamingRevenueCDF: number;
    gamingRevenueUSD: number;
    snackRevenueCDF: number;
    snackRevenueUSD: number;
    combinedRevenueCDF: number;
    combinedRevenueUSD: number;
    vipAndFideleCDF: number;
    ps4RevenueCDF: number;
    ps5RevenueCDF: number;
    cashCDF: number;
    cashUSD: number;
    illicoCashCDF: number;
    illicoCashUSD: number;
    momoCDF: number;
    momoUSD: number;
    mixedCDF: number;
    pointsCDF: number;
    averageTicketCDF: number;
    averageDurationMin: number;
    totalPlayHours: number;
    savedKWh: number;
    savedCDF: number;
  };
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportReportToExcel(data: ReportExportPayload): void {
  const wb = XLSX.utils.book_new();
  const { kpis, settings } = data;

  // Feuille 1 : Synthèse KPIs
  const summaryRows = [
    ['Rapport Analytique Kin Gaming Hub', data.settings.venueName || 'Kin Gaming Hub'],
    ['Période analysée', data.periodLabel],
    ['Date de génération', new Date().toLocaleString('fr-FR')],
    ['Taux appliqué', `1 USD = ${settings.exchangeRate.toLocaleString()} CDF`],
    [],
    ['INDICATEUR', 'VALEUR CDF (FC)', 'VALEUR USD ($)', 'DÉTAILS'],
    ['CA Jeux Vidéo (Tickets)', kpis.gamingRevenueCDF, Number(kpis.gamingRevenueUSD.toFixed(2)), `${data.tickets.length} ticket(s)`],
    ['CA Boissons & Snacks', kpis.snackRevenueCDF, Number(kpis.snackRevenueUSD.toFixed(2)), `${data.snackSales.length} vente(s)`],
    ['CA Global Combiné', kpis.combinedRevenueCDF, Number(kpis.combinedRevenueUSD.toFixed(2)), 'Jeux + Boissons'],
    ['CA Clients Fidèles & VIP', kpis.vipAndFideleCDF, Number((kpis.vipAndFideleCDF / (settings.exchangeRate || 2800)).toFixed(2)), ''],
    ['CA PlayStation 4', kpis.ps4RevenueCDF, Number((kpis.ps4RevenueCDF / (settings.exchangeRate || 2800)).toFixed(2)), ''],
    ['CA PlayStation 5', kpis.ps5RevenueCDF, Number((kpis.ps5RevenueCDF / (settings.exchangeRate || 2800)).toFixed(2)), ''],
    ['Panier Moyen Ticket', Math.round(kpis.averageTicketCDF), Number((kpis.averageTicketCDF / (settings.exchangeRate || 2800)).toFixed(2)), `Durée moy: ${kpis.averageDurationMin.toFixed(0)} min`],
    ['Temps Total Vendu', kpis.totalPlayHours, 0, `${kpis.totalPlayHours.toFixed(1)} heures`],
    [],
    ['VENTILATION PAR MODE DE PAIEMENT', 'CDF', 'USD', ''],
    ['Espèces CDF', kpis.cashCDF, 0, 'Tiroir physique FC'],
    ['Espèces USD', 0, Number(kpis.cashUSD.toFixed(2)), 'Billets USD'],
    ['Illico Cash (Rawbank)', kpis.illicoCashCDF, Number(kpis.illicoCashUSD.toFixed(2)), 'Banque'],
    ['Mobile Money (M-Pesa/Orange/Airtel)', kpis.momoCDF, Number(kpis.momoUSD.toFixed(2)), 'Opérateurs GSM'],
    ['Paiements Mixtes (Total)', kpis.mixedCDF, Number((kpis.mixedCDF / (settings.exchangeRate || 2800)).toFixed(2)), 'Détails ventilés ci-dessus'],
    ['Gratuité Points Fidélité', kpis.pointsCDF, 0, ''],
    ['Économies Énergie Domotique', Math.round(kpis.savedCDF), Number((kpis.savedKWh * 0.12).toFixed(2)), `${kpis.savedKWh.toFixed(2)} kWh évités`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 16 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse KPIs');

  // Feuille 2 : Tickets
  const ticketRows = data.tickets.map((t) => ({
    'N° Ticket': t.ticketNumber,
    'Date': new Date(t.createdAt).toLocaleString('fr-FR'),
    'Poste': `${t.stationName || `Poste ${t.stationId}`} (${t.stationType})`,
    'Client': t.clientName,
    'Téléphone': t.clientPhone || '',
    'Durée (min)': t.durationMinutes,
    'Tranche Horaire': t.appliedTimeSlotLabel || 'Standard',
    'Code Promo': t.appliedPromoCode || '',
    'Remise (FC)': t.discountCDF || 0,
    'Montant (FC)': t.amountCDF,
    'Montant ($)': Number(t.amountUSD.toFixed(2)),
    'Mode Paiement': t.paymentMethod,
    'Réf Transaction': t.paymentReference || '',
    'Caissier': t.cashierName,
    'Statut': t.status,
  }));
  const wsTickets = XLSX.utils.json_to_sheet(
    ticketRows.length > 0 ? ticketRows : [{ Info: 'Aucun ticket sur cette période' }]
  );
  wsTickets['!cols'] = [
    { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 16 },
    { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets');

  // Feuille 3 : Boissons & Snacks
  const snackRows = data.snackSales.map((s) => ({
    'N° Reçu': s.receiptNumber || s.id,
    'Date': new Date(s.timestamp).toLocaleString('fr-FR'),
    'Articles': s.items && s.items.length > 0
      ? s.items.map((it) => `${it.quantity}x ${it.itemName}`).join(', ')
      : `${s.quantity}x ${s.itemName}`,
    'Quantité Totale': s.quantity,
    'Montant (FC)': s.totalCDF,
    'Montant ($)': Number(s.totalUSD.toFixed(2)),
    'Mode Paiement': s.paymentMethod,
    'Référence': s.paymentReference || '',
    'Caissier': s.cashierName,
  }));
  const wsSnacks = XLSX.utils.json_to_sheet(
    snackRows.length > 0 ? snackRows : [{ Info: 'Aucune vente boisson/snack sur cette période' }]
  );
  XLSX.utils.book_append_sheet(wb, wsSnacks, 'Boissons & Snacks');

  // Feuille 4 : Performance Postes & Caissiers
  const perfRows = data.stationPerformance.map((p) => ({
    'Poste': p.stationName,
    'Console': p.stationType,
    'Sessions': p.sessionsCount,
    'Heures de jeu': Number((p.totalMinutes / 60).toFixed(2)),
    'Chiffre Affaires (FC)': p.revenueCDF,
    'Chiffre Affaires ($)': Number(p.revenueUSD.toFixed(2)),
    'Taux Occupation (%)': Number(p.occupancyPercent.toFixed(1)),
  }));
  const wsPerf = XLSX.utils.json_to_sheet(
    perfRows.length > 0 ? perfRows : [{ Info: 'Aucune donnée poste' }]
  );
  XLSX.utils.book_append_sheet(wb, wsPerf, 'Performance Postes');

  // Feuille 5 : Clients Fidélité
  const clientRows = data.clients.map((c) => ({
    'Code Client': c.clientCode,
    'Nom Complet': c.fullName,
    'Téléphone': c.phone,
    'Statut': c.tier,
    'Points': c.loyaltyPoints,
    'Temps Jeu (min)': c.totalPlayMinutes,
    'Total Encaissé (FC)': c.totalSpentCDF,
    'Total Encaissé ($)': Number(c.totalSpentUSD.toFixed(2)),
    'Filleuls': c.referralCount,
    'Portail': c.portalDisabled ? 'Désactivé' : 'Actif',
  }));
  const wsClients = XLSX.utils.json_to_sheet(
    clientRows.length > 0 ? clientRows : [{ Info: 'Aucun client enregistré' }]
  );
  XLSX.utils.book_append_sheet(wb, wsClients, 'Clients Fidélité');

  // Feuille 6 : Clôtures Caisse & Audit
  const shiftRows = data.shiftHistory.map((sh) => ({
    'Ouverture': new Date(sh.openedAt).toLocaleString('fr-FR'),
    'Clôture': sh.closedAt ? new Date(sh.closedAt).toLocaleString('fr-FR') : 'En cours',
    'Caissier': sh.cashierName,
    'Attendu FC': sh.expectedCashCDF,
    'Compté FC': sh.closingCashCDF ?? sh.expectedCashCDF,
    'Attendu USD': sh.expectedCashUSD,
    'Compté USD': sh.closingCashUSD ?? sh.expectedCashUSD,
    'Illico Cash FC': sh.totalIllicoCashCDF || 0,
    'Mobile Money FC': sh.totalMomoCDF,
    'Notes': sh.notes || '',
  }));
  const wsShifts = XLSX.utils.json_to_sheet(
    shiftRows.length > 0 ? shiftRows : [{ Info: 'Aucune clôture archivée' }]
  );
  XLSX.utils.book_append_sheet(wb, wsShifts, 'Clôtures Caisse');

  const auditRows = data.auditLogs.slice(0, 500).map((a) => ({
    'Horodatage': new Date(a.timestamp).toLocaleString('fr-FR'),
    'Rôle': a.userRole,
    'Auteur': a.cashierName,
    'Action': a.action,
    'Détails': a.details,
  }));
  const wsAudit = XLSX.utils.json_to_sheet(
    auditRows.length > 0 ? auditRows : [{ Info: 'Aucune entrée audit' }]
  );
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit Sécurité');

  XLSX.writeFile(wb, `kin_gaming_hub_rapport_${getDateStamp()}.xlsx`);
}

export function exportReportToPDF(data: ReportExportPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { kpis, settings } = data;
  const venueName = settings.venueName || 'KIN GAMING HUB';

  // En-tête stylisé
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${venueName} — Rapport Financier & Opérationnel`, 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Période : ${data.periodLabel}   |   Taux : 1$ = ${settings.exchangeRate.toLocaleString()} FC`, 14, 20);
  doc.text(`Édité le ${new Date().toLocaleString('fr-FR')}   |   ${settings.venueAddress || 'Kinshasa'}`, 14, 25);

  // Tableau 1 : Synthèse KPIs
  autoTable(doc, {
    startY: 36,
    head: [['Indicateur Clé', 'Montant (CDF)', 'Équivalent (USD)', 'Information']],
    body: [
      ['CA Jeux Vidéo (Tickets)', `${kpis.gamingRevenueCDF.toLocaleString()} FC`, `$${kpis.gamingRevenueUSD.toFixed(2)}`, `${data.tickets.length} session(s)`],
      ['CA Boissons & Snacks', `${kpis.snackRevenueCDF.toLocaleString()} FC`, `$${kpis.snackRevenueUSD.toFixed(2)}`, `${data.snackSales.length} vente(s)`],
      ['CA GLOBAL COMBINÉ', `${kpis.combinedRevenueCDF.toLocaleString()} FC`, `$${kpis.combinedRevenueUSD.toFixed(2)}`, 'Jeux + Bar'],
      ['PlayStation 4 / PlayStation 5', `PS4: ${kpis.ps4RevenueCDF.toLocaleString()} FC`, `PS5: ${kpis.ps5RevenueCDF.toLocaleString()} FC`, `${kpis.totalPlayHours.toFixed(1)}h jouées`],
      ['Panier Moyen & Durée Moy.', `${Math.round(kpis.averageTicketCDF).toLocaleString()} FC`, '-', `${kpis.averageDurationMin.toFixed(0)} min / ticket`],
      ['Économies Domotique', `~${Math.round(kpis.savedCDF).toLocaleString()} FC`, `$${(kpis.savedKWh * 0.12).toFixed(2)}`, `${kpis.savedKWh.toFixed(1)} kWh évités`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.2 },
  });

  // Tableau 2 : Répartition par mode de paiement
  const afterKpiY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 7 : 100;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ventilation par Mode de Règlement', 14, afterKpiY);

  autoTable(doc, {
    startY: afterKpiY + 2,
    head: [['Mode de Règlement', 'Total CDF', 'Total USD']],
    body: [
      ['Espèces Francs Congolais (CDF)', `${kpis.cashCDF.toLocaleString()} FC`, '-'],
      ['Espèces Dollars Américains (USD)', '-', `$${kpis.cashUSD.toFixed(2)}`],
      ['Illico Cash (Rawbank)', `${kpis.illicoCashCDF.toLocaleString()} FC`, `$${kpis.illicoCashUSD.toFixed(2)}`],
      ['Mobile Money (M-Pesa / Orange / Airtel)', `${kpis.momoCDF.toLocaleString()} FC`, `$${kpis.momoUSD.toFixed(2)}`],
      ['Paiements Mixtes (Total brut)', `${kpis.mixedCDF.toLocaleString()} FC`, '-'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Tableau 3 : Performance par Poste
  const afterPayY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 7 : 165;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance par Poste de Jeu', 14, afterPayY);

  autoTable(doc, {
    startY: afterPayY + 2,
    head: [['Poste', 'Console', 'Sessions', 'Heures', 'CA (FC)', 'CA ($)', 'Occupation']],
    body: data.stationPerformance.map((p) => [
      p.stationName,
      p.stationType,
      String(p.sessionsCount),
      `${(p.totalMinutes / 60).toFixed(1)}h`,
      `${p.revenueCDF.toLocaleString()} FC`,
      `$${p.revenueUSD.toFixed(2)}`,
      `${p.occupancyPercent.toFixed(1)}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
  });

  // Tableau 4 : Derniers Tickets (sur nouvelle page si nécessaire)
  if (data.tickets.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Détail des Tickets — ${data.periodLabel} (${data.tickets.length})`, 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [['Ticket', 'Date', 'Poste', 'Client', 'Durée', 'Montant', 'Mode', 'Caissier']],
      body: data.tickets.slice(0, 80).map((t) => [
        t.ticketNumber,
        new Date(t.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        `P${t.stationId} (${t.stationType})`,
        t.clientName,
        `${t.durationMinutes}m`,
        `${t.amountCDF.toLocaleString()} FC`,
        t.paymentMethod,
        t.cashierName,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
    });
  }

  doc.save(`kin_gaming_hub_rapport_${getDateStamp()}.pdf`);
}
