// src/components/TicketQR.jsx
//
// Draws a QR code as crisp square modules (pixel-art by nature). Always dark
// modules on a white background with a quiet zone, whatever the theme:
// scanners need that contrast, so it is deliberately NOT theme-coloured.

import React, { useMemo } from 'react';
import QRCode from 'qrcode';

export default function TicketQR({ value, size = 176, className = '' }) {
  const { count, modules } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    return { count: qr.modules.size, modules: qr.modules.data };
  }, [value]);

  const quiet = 3;
  const total = count + quiet * 2;
  const rects = [];
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (modules[y * count + x]) rects.push(<rect key={`${x}-${y}`} x={x + quiet} y={y + quiet} width="1" height="1" />);
    }
  }

  return (
    <svg
      role="img"
      aria-label="Ticket QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={total} height={total} fill="#ffffff" />
      <g fill="#04060F">{rects}</g>
    </svg>
  );
}
