"use client";

import { useId, useState } from "react";
import { formatDate, formatShort } from "../lib/dates";

type Point = { date: string; value: number };

const W = 720, H = 240, PAD = { l: 52, r: 16, t: 16, b: 28 };

export default function LineChart({ points, unit, digits }: { points: Point[]; unit: string; digits: number }) {
  const gradId = `grad-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) return <div className="empty-state">Not enough data in this period to draw a trend.</div>;

  const values = points.map(p => p.value);
  let min = Math.min(...values), max = Math.max(...values);
  const span = max - min || Math.abs(max) * 0.1 || 1;
  min -= span * 0.12; max += span * 0.12;
  const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * pw;
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * ph;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD.t + ph} L${PAD.l},${PAD.t + ph} Z`;
  const yTicks = [0, 1, 2, 3].map(i => min + ((max - min) * i) / 3);
  const xTicks = [...new Set([0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * (points.length - 1))))];
  const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="line-chart">
      <div className="chart-readout">
        {active ? <><strong>{fmt(active.value)} {unit}</strong><span>{formatDate(active.date)}</span></> : <span>Hover the chart to read a value</span>}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Trend chart in ${unit}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - PAD.l) / pw) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3987cf" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3987cf" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#edf0f4" />
            <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#a5afba">{fmt(t)}</text>
          </g>
        ))}
        {xTicks.map(i => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="#98a4b2">{formatShort(points[i].date)}</text>
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="#2f7fcb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ph} stroke="#c3cdd8" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r="4.5" fill="#fff" stroke="#2f7fcb" strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
}
