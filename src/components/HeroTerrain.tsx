import React, { useEffect, useRef, useState } from 'react';

export const HeroTerrain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [positionText, setPositionText] = useState('31.1048° N  77.1734° E');
  const [elevationText, setElevationText] = useState('2,050 m');
  const [blockText, setBlockText] = useState('Block 05');

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number = 0;
    let width = 0;
    let height = 0;
    let scale = 1;

    const PEAKS = [
      [0.80, 0.28, 0.20, 0.28, 1.0],
      [0.58, 0.80, 0.28, 0.17, 0.8],
      [0.95, 0.82, 0.18, 0.20, 0.7],
      [0.32, 0.18, 0.24, 0.18, 0.6],
      [0.08, 0.72, 0.28, 0.24, 0.5],
    ];

    const LOCAL = [
      [[0.05, 0.14], [0.37, 0.06], [0.43, 0.38], [0.09, 0.46]],
      [[0.37, 0.06], [0.73, 0.13], [0.67, 0.41], [0.43, 0.38]],
      [[0.73, 0.13], [0.97, 0.23], [0.93, 0.52], [0.67, 0.41]],
      [[0.09, 0.46], [0.43, 0.38], [0.47, 0.71], [0.13, 0.79]],
      [[0.43, 0.38], [0.67, 0.41], [0.71, 0.73], [0.47, 0.71]],
      [[0.67, 0.41], [0.93, 0.52], [0.89, 0.84], [0.71, 0.73]],
    ];
    const NAMES = ['01', '02', '03', '04', '05', '06'];

    let polys: [number, number][][] = [];

    const getH = (x: number, y: number) => {
      let h = 0;
      for (let i = 0; i < PEAKS.length; i++) {
        const p = PEAKS[i];
        const dx = (x - p[0] * width) / scale;
        const dy = (y - p[1] * height) / scale;
        h += p[4] * Math.exp(-(dx * dx / (2 * p[2] * p[2]) + dy * dy / (2 * p[3] * p[3])));
      }
      return h + 0.07 * Math.sin(x / scale * 5.1 + 1.3) * Math.cos(y / scale * 4.3);
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height || 360);
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      scale = Math.max(width, height * 1.15);

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      polys = LOCAL.map(p =>
        p.map(q => [q[0] * width, q[1] * height] as [number, number])
      );

      draw();
    };

    const draw = (pinX?: number, pinY?: number) => {
      ctx.clearRect(0, 0, width, height);

      // Gradient background
      const bgGrad = ctx.createRadialGradient(
        width * 0.65, height * 0.45, 10,
        width * 0.65, height * 0.45, width * 0.8
      );
      bgGrad.addColorStop(0, 'rgba(23, 70, 65, 0.6)');
      bgGrad.addColorStop(0.6, 'rgba(12, 38, 36, 0.9)');
      bgGrad.addColorStop(1, 'rgba(8, 26, 25, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw elevation contours
      const step = width < 600 ? 12 : 8;
      const nx = Math.ceil(width / step) + 1;
      const ny = Math.ceil(height / step) + 1;

      // Draw subtle contour loops
      for (let lv = 0.15; lv < 1.3; lv += 0.12) {
        ctx.beginPath();
        ctx.strokeStyle = lv > 0.6 ? 'rgba(165,225,200,0.22)' : 'rgba(150,210,188,0.11)';
        ctx.lineWidth = lv > 0.6 ? 1.2 : 0.8;

        for (let x = 0; x < width; x += step * 2) {
          for (let y = 0; y < height; y += step * 2) {
            const h = getH(x, y);
            if (Math.abs(h - lv) < 0.06) {
              ctx.moveTo(x - 2, y);
              ctx.lineTo(x + 2, y);
            }
          }
        }
        ctx.stroke();
      }

      // Draw survey block boundaries
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(232,246,239,0.55)';
      ctx.fillStyle = 'rgba(232,246,239,0.75)';
      ctx.font = '600 12px "Public Sans",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      polys.forEach((p, i) => {
        ctx.beginPath();
        p.forEach((q, j) => {
          if (j === 0) ctx.moveTo(q[0], q[1]);
          else ctx.lineTo(q[0], q[1]);
        });
        ctx.closePath();
        ctx.stroke();

        // Label centroid
        let cx = 0, cy = 0;
        p.forEach(pt => { cx += pt[0]; cy += pt[1]; });
        cx /= p.length;
        cy /= p.length;
        ctx.fillText(`Block ${NAMES[i]}`, cx, cy);
      });

      ctx.setLineDash([]);

      // Draw interactive pin
      const px = pinX ?? width * 0.62;
      const py = pinY ?? height * 0.48;

      // Pulse ring
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214, 163, 75, 0.2)';
      ctx.fill();

      // Pin core
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#d6a34b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    };

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        const lat = 31.05 + (1 - y / height) * 0.12;
        const lng = 77.10 + (x / width) * 0.16;
        const elev = Math.round((1400 + getH(x, y) * 950) / 10) * 10;

        let foundBlock = 'Block 05';
        polys.forEach((p, idx) => {
          let inside = false;
          for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
            if ((p[i][1] > y) !== (p[j][1] > y) &&
                x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) {
              inside = !inside;
            }
          }
          if (inside) foundBlock = `Block ${NAMES[idx]}`;
        });

        setPositionText(`${lat.toFixed(4)}° N  ${lng.toFixed(4)}° E`);
        setElevationText(`${elev.toLocaleString()} m`);
        setBlockText(foundBlock);

        draw(x, y);
      }
    };

    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handlePointer);
    canvas.addEventListener('touchmove', handlePointer);

    resize();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handlePointer);
      canvas.removeEventListener('touchmove', handlePointer);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[340px] md:h-[400px] rounded-2xl overflow-hidden border border-[#23534d] shadow-2xl bg-[#091a19]">
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* Floating Spatial Readout Box */}
      <div className="absolute top-4 right-4 bg-[#0a1f1e]/90 backdrop-blur-md border border-[#22504a] text-white p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 pointer-events-none min-w-[210px]">
        <div className="flex items-center justify-between text-[#9fc7c1]">
          <span>Spatial Coordinate:</span>
          <b className="text-white font-mono">{positionText}</b>
        </div>
        <div className="flex items-center justify-between text-[#9fc7c1]">
          <span>Surface Elevation:</span>
          <b className="text-[#f7dfae] font-mono">{elevationText}</b>
        </div>
        <div className="flex items-center justify-between text-[#9fc7c1]">
          <span>Survey Frame:</span>
          <b className="text-[#20b5a6] font-semibold">{blockText}</b>
        </div>
        <div className="pt-1.5 border-t border-[#1b3d39] text-[10.5px] text-[#7ea19b] leading-tight">
          Illustrative HP terrain. Move pointer or tap to sample geo-coordinates.
        </div>
      </div>

      <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm text-[11px] text-[#9fc7c1] px-2.5 py-1 rounded-md border border-white/10 font-mono">
        Datum: WGS84 · Topo Contours · Shimla Region
      </div>
    </div>
  );
};
