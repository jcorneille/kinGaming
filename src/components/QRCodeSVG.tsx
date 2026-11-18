import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QRCodeSVGProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}

/**
 * Générateur SVG de QR Code ISO 18004 réel et scannable (bibliothèque `qrcode`).
 * Rendu synchrone haute précision avec marge silencieuse (quiet zone) adaptée aux imprimantes thermiques 58/80mm.
 */
export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({
  value,
  size = 120,
  fgColor = '#000000',
  bgColor = '#ffffff',
}) => {
  const { moduleCount, pathData } = useMemo(() => {
    const safeValue = value && value.trim().length > 0 ? value : 'https://goza.cd';
    try {
      const qr = QRCode.create(safeValue, { errorCorrectionLevel: 'M' });
      const count = qr.modules.size;
      const data = qr.modules.data;
      let path = '';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (data[r * count + c]) {
            path += `M${c} ${r}h1v1h-1z`;
          }
        }
      }
      return { moduleCount: count, pathData: path };
    } catch {
      return { moduleCount: 21, pathData: '' };
    }
  }, [value]);

  const margin = 2;
  const viewBoxSize = moduleCount + margin * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-${margin} -${margin} ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="QR Code de vérification du ticket"
      className="inline-block"
    >
      <rect
        x={-margin}
        y={-margin}
        width={viewBoxSize}
        height={viewBoxSize}
        fill={bgColor}
      />
      {pathData && <path d={pathData} fill={fgColor} />}
    </svg>
  );
};
