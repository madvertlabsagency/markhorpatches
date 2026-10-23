/**
 * Single-series bar chart (server-rendered SVG). Follows the dataviz rules: one validated hue
 * (--pm-chart), thin bars with rounded data-ends on a zero baseline, recessive grid, selective
 * direct labels (max value only), per-bar hover tooltip, and a table view for accessibility.
 * A single series needs no legend — the title names it.
 */
export function BarChart({ title, data, format = (n: number) => n.toLocaleString(), height = 180, emptyText = "No data yet" }: { title: string; data: { label: string; value: number }[]; format?: (n: number) => string; height?: number; emptyText?: string }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const W = 600;
  const H = height;
  const pad = { t: 18, r: 8, b: 26, l: 8 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const step = data.length ? innerW / data.length : innerW;
  const barW = Math.max(4, Math.min(36, step - 2 - step * 0.35));
  const maxIdx = data.findIndex((d) => d.value === max);
  const labelEvery = Math.ceil(data.length / 8);
  return (
    <figure className="w-full">
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      {max === 0 ? (
        <p className="grid h-32 place-items-center rounded-xl border border-dashed border-line text-sm text-muted">{emptyText}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${title}. Max ${format(max)}.`}>
          {[0.5, 1].map((f) => (
            <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + innerH * (1 - f)} y2={pad.t + innerH * (1 - f)} className="stroke-line" strokeWidth={1} strokeDasharray="2 4" />
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + innerH} y2={pad.t + innerH} className="stroke-line" strokeWidth={1} />
          {data.map((d, i) => {
            const h = max ? (d.value / max) * innerH : 0;
            const x = pad.l + i * step + (step - barW) / 2;
            const y = pad.t + innerH - h;
            const r = Math.min(4, barW / 2, h);
            return (
              <g key={d.label} className="group">
                <rect x={pad.l + i * step} y={pad.t} width={step} height={innerH} fill="transparent" />
                {h > 0 && <path d={`M${x},${pad.t + innerH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${pad.t + innerH} Z`} className="fill-chart transition-opacity group-hover:opacity-80" />}
                <title>{`${d.label}: ${format(d.value)}`}</title>
                {i === maxIdx && <text x={x + barW / 2} y={y - 5} textAnchor="middle" className="fill-fg text-[11px] font-semibold tabular-nums">{format(d.value)}</text>}
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" className="fill-fg text-[11px] font-semibold opacity-0 tabular-nums group-hover:opacity-100">{i === maxIdx ? "" : format(d.value)}</text>
                {i % labelEvery === 0 && <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-muted text-[10px]">{d.label}</text>}
              </g>
            );
          })}
        </svg>
      )}
      {max > 0 && (
        <details className="mt-1 text-xs text-muted">
          <summary className="cursor-pointer">View as table</summary>
          <table className="mt-2 w-full tabular-nums">
            <tbody>{data.map((d) => <tr key={d.label}><td className="py-0.5">{d.label}</td><td className="py-0.5 text-right text-fg">{format(d.value)}</td></tr>)}</tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
