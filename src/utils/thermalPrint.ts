/**
 * Utilitaire d'impression thermique 58mm / 80mm compatible iframe (sans window.open ni alert)
 */
export function printThermalReceiptElement(
  element: HTMLElement | null,
  paperSize: '58mm' | '80mm' = '80mm',
  documentTitle = 'Reçu Thermique - Kin Gaming Hub'
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  if (!element) {
    window.print();
    return true;
  }

  const widthCss = paperSize === '58mm' ? '58mm' : '80mm';
  const fontSize = paperSize === '58mm' ? '10px' : '11px';

  // Construire un document HTML autonome avec styles thermiques complets pour conserver la mise en page
  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${documentTitle}</title>
  <style>
    @page {
      size: ${widthCss} auto;
      margin: 2mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      width: ${widthCss};
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.3;
    }
    .receipt-wrapper {
      width: 100%;
      padding: 2mm;
      background: #ffffff;
      color: #000000;
    }
    /* Utilitaires Tailwind utilisés dans les tickets thermiques */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .font-semibold { font-weight: 600; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .font-sans { font-family: system-ui, -apple-system, sans-serif; }
    .uppercase { text-transform: uppercase; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-tight { letter-spacing: -0.02em; }
    .leading-tight { line-height: 1.25; }
    .leading-none { line-height: 1; }
    .break-all { word-break: break-all; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-1 { gap: 4px; }
    .gap-2 { gap: 8px; }
    .space-y-1 > * + * { margin-top: 4px; }
    .space-y-0\\.5 > * + * { margin-top: 2px; }
    .p-1\\.5 { padding: 6px; }
    .p-3, .p-4 { padding: 6px; }
    .py-2 { padding-top: 6px; padding-bottom: 6px; }
    .py-3 { padding-top: 8px; padding-bottom: 8px; }
    .pb-2 { padding-bottom: 6px; }
    .pt-0\\.5 { padding-top: 2px; }
    .pt-1 { padding-top: 4px; }
    .pt-2 { padding-top: 6px; }
    .mt-1 { margin-top: 4px; }
    .mt-1\\.5 { margin-top: 6px; }
    .mb-1 { margin-bottom: 4px; }
    .border-b { border-bottom: 1px dashed #666; }
    .border-t { border-top: 1px dashed #666; }
    .border { border: 1px solid #999; }
    .border-dashed { border-style: dashed; }
    .rounded { border-radius: 4px; }
    .bg-neutral-100 { background: #f3f4f6; }
    .text-black { color: #000000; }
    .text-neutral-800 { color: #1f2937; }
    .text-neutral-700, .text-neutral-600 { color: #374151; }
    .text-neutral-500, .text-neutral-400 { color: #4b5563; }
    .text-sm { font-size: ${paperSize === '58mm' ? '12px' : '13px'}; }
    .text-xs { font-size: ${paperSize === '58mm' ? '10.5px' : '11.5px'}; }
    .text-\\[11px\\] { font-size: 11px; }
    .text-\\[10px\\] { font-size: 10px; }
    .text-\\[9px\\] { font-size: 9px; }
    .text-\\[8px\\] { font-size: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 2px 0; vertical-align: top; }
    svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="receipt-wrapper">${element.innerHTML}</div>
</body>
</html>`;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      window.print();
      return true;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }
    };

    // Laisser le navigateur effectuer le rendu (SVG QR / polices)
    setTimeout(triggerPrint, 120);
    return true;
  } catch {
    window.print();
    return true;
  }
}
