import { useEffect, useMemo, useRef, useState } from 'react';
import type { CurrencyCode, DailyMetricPoint } from '../../types/merchant';
import { formatCurrency, formatNumber } from '../../utils/format';

type ChartMode = 'revenue' | 'orders';

interface RevenueChartProps {
  points: DailyMetricPoint[];
  currency: CurrencyCode;
}

export function RevenueChart({ points, currency }: RevenueChartProps) {
  const [mode, setMode] = useState<ChartMode>('revenue');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const next = el.clientWidth;
      if (next > 0) setWidth(next);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 256;
  const pad = { top: 16, right: 16, bottom: 30, left: 60 };
  const plotW = Math.max(120, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const { coords, yTicks, linePath, areaPath } = useMemo(() => {
    if (points.length === 0) {
      return { coords: [], yTicks: [0], linePath: '', areaPath: '' };
    }
    const rawValues = points.map((p) => (mode === 'revenue' ? p.revenue : p.orders));
    const rawMax = Math.max(...rawValues, 1);

    // Compute clean round ceiling
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const normalized = rawMax / magnitude;
    const niceFactor =
      normalized <= 1.2
        ? 1.2
        : normalized <= 1.5
          ? 1.5
          : normalized <= 2
            ? 2
            : normalized <= 3
              ? 3
              : normalized <= 5
                ? 5
                : normalized <= 8
                  ? 8
                  : 10;
    const maxVal = niceFactor * magnitude;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxVal * t);

    const stepX = points.length > 1 ? plotW / (points.length - 1) : plotW / 2;
    const mapped = points.map((pt, i) => {
      const val = mode === 'revenue' ? pt.revenue : pt.orders;
      const x = points.length > 1 ? pad.left + i * stepX : pad.left + plotW / 2;
      const y = pad.top + plotH - (val / maxVal) * plotH;
      return { x, y, val, point: pt };
    });

    const line = mapped
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const baseline = (pad.top + plotH).toFixed(1);
    const area =
      mapped.length > 0
        ? `${line} L ${mapped[mapped.length - 1].x.toFixed(1)} ${baseline} L ${mapped[0].x.toFixed(1)} ${baseline} Z`
        : '';

    return { coords: mapped, yTicks: ticks, linePath: line, areaPath: area };
  }, [points, mode, plotW, plotH, pad.left, pad.top]);

  // Pick evenly spaced X axis labels to prevent crowding
  const labelStride = useMemo(() => {
    const maxLabels = width < 460 ? 4 : 7;
    return Math.max(1, Math.ceil(points.length / maxLabels));
  }, [points.length, width]);

  const active = hoverIdx !== null && coords[hoverIdx] ? coords[hoverIdx] : null;
  const barWidth = Math.max(
    6,
    Math.min(28, (plotW / Math.max(points.length, 1)) * 0.58)
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Revenue &amp; Order Performance</h2>
          <p className="text-xs text-slate-500">
            Gross merchandise volume and completed checkouts across channels
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('revenue')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              mode === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setMode('orders')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              mode === 'orders'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full select-none"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block overflow-visible"
          onMouseMove={(e) => {
            if (coords.length === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            let closest = 0;
            let minDist = Infinity;
            for (let i = 0; i < coords.length; i++) {
              const dist = Math.abs(coords[i].x - mouseX);
              if (dist < minDist) {
                minDist = dist;
                closest = i;
              }
            }
            setHoverIdx(closest);
          }}
        >
          <defs>
            <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines & Y axis labels */}
          {yTicks.map((tick, idx) => {
            const maxVal = yTicks[yTicks.length - 1] || 1;
            const y = pad.top + plotH - (tick / maxVal) * plotH;
            const formatted =
              mode === 'revenue'
                ? tick === 0
                  ? formatCurrency(0, currency, { compact: true }).replace('.00', '')
                  : formatCurrency(tick, currency, { compact: true })
                : formatNumber(Math.round(tick));
            return (
              <g key={idx}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke={idx === 0 ? '#E2E8F0' : '#F1F5F9'}
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                />
                <text
                  x={pad.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] tabular-nums"
                >
                  {formatted}
                </text>
              </g>
            );
          })}

          {mode === 'revenue' ? (
            <>
              <path d={areaPath} fill="url(#revenueAreaFill)" />
              <path
                d={linePath}
                fill="none"
                stroke="#0F766E"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : (
            coords.map((c, idx) => {
              const barH = Math.max(2, pad.top + plotH - c.y);
              const isHovered = hoverIdx === idx;
              return (
                <rect
                  key={c.point.date + idx}
                  x={c.x - barWidth / 2}
                  y={c.y}
                  width={barWidth}
                  height={barH}
                  rx={4}
                  fill={isHovered ? '#0F766E' : '#0D9488'}
                  fillOpacity={isHovered ? 1 : 0.72}
                />
              );
            })
          )}

          {/* Hover vertical crosshair & focus point */}
          {active && (
            <g>
              <line
                x1={active.x}
                x2={active.x}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              {mode === 'revenue' && (
                <circle
                  cx={active.x}
                  cy={active.y}
                  r={4.5}
                  fill="#0F766E"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              )}
            </g>
          )}

          {/* X axis labels */}
          {coords.map((c, idx) => {
            const isLast = idx === coords.length - 1;
            const show = idx % labelStride === 0 || (isLast && idx % labelStride > labelStride / 2);
            if (!show) return null;
            return (
              <text
                key={c.point.date + idx}
                x={c.x}
                y={height - 6}
                textAnchor={idx === 0 ? 'start' : isLast ? 'end' : 'middle'}
                className="fill-slate-400 text-[11px] tabular-nums"
              >
                {c.point.label}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {active && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-48 rounded-lg border border-slate-200 bg-white/98 p-3 shadow-lg"
            style={{
              left:
                active.x + 210 > width
                  ? Math.max(pad.left, active.x - 202)
                  : Math.min(width - 196, active.x + 12),
            }}
          >
            <div className="mb-1.5 text-xs font-semibold text-slate-800">{active.point.label}</div>
            <div className="space-y-1 text-xs tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Gross sales</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(active.point.revenue, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Net revenue</span>
                <span className="font-medium text-emerald-700">
                  {formatCurrency(
                    Math.max(0, active.point.revenue - active.point.refunds),
                    currency
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Orders</span>
                <span className="font-medium text-slate-800">
                  {formatNumber(active.point.orders)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
