import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { ArrowUpRight, ArrowDownRight, Waves } from "lucide-react";
import { loadDatasets } from "./data/dataLoader.jsx";

/* =========================================================================
   PACIFIC SEA CHANGE — climate dashboard
   -------------------------------------------------------------------------
   NOTE ON DATA: no source files were supplied with the brief, so every
   number below is a seeded, deterministic SAMPLE dataset built to match the
   exact fields and headline conclusions described in the brief (0.3 cm/yr
   -> 7.7 cm by 2025 for global; 0.4 cm/yr -> 10.5 cm by 2023 for the
   Pacific local composite). Swap `buildDatasets()` for real CSV/JSON and
   everything downstream (scales, cards, bars, radial plot) recomputes
   automatically. A few underspecified geometry choices are documented
   inline where they occur, with the closest reasonable reading of the brief.
   ========================================================================= */

/* ---------------------------- design tokens ---------------------------- */
const TOKENS = {
  bg: "#FFFFFF",
  ink: "#0A2540",
  body: "#4A6178",
  faint: "#8CA3B5",
  hair: "#DCE6EE",
  tint: "#F4F8FB",
  tint2: "#EAF2FA",
  blue900: "#0B3C5D",
  blue700: "#1B5C94",
  blue500: "#2E75B6",
  blue300: "#7FB0DE",
  blue100: "#CFE4F4",
  warm: "#B8783A",
  font: {
    display: "'Space Grotesk', 'Segoe UI', sans-serif",
    body: "'Inter', 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  },
};

const BREAKPOINT = 900; // ~ 50% of a 1440–1600px desktop viewport, applied to container width

/* ------------------------------ utilities ------------------------------ */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fmt1 = d3.format("+.1f");
const fmtInt = d3.format(",.0f");
const fmtPct = d3.format("+.1f");
const fmtShort = d3.format(".2s");


/* ------------------------------ hooks ------------------------------ */
function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Toggles a boolean to true one animation frame after `key` changes,
 *  so CSS transitions have a false->true edge to animate across. */
function useReveal(key) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (key == null) {
      setRevealed(false);
      return;
    }
    setRevealed(false);
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return revealed;
}

/* ------------------------------ small pieces ------------------------------ */
function Delta({
  value,
  suffix = "",
  showArrow = true
}) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        color: up ? TOKENS.blue700 : TOKENS.warm,
        fontFamily: TOKENS.font.mono,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {showArrow && (
        <Icon size={13} strokeWidth={2.5} />
      )}

      {showArrow
  ? fmt1(value)
  : d3.format(".1f")(value)}
{suffix}

    </span>
  );
}

function MiniSpark({ data, width = 84, height = 26, color = TOKENS.blue500 }) {
  const cleanData = data.filter(Number.isFinite);
  if (cleanData.length < 2) {return null;}
  
  const x = d3.scaleLinear().domain([0, cleanData.length - 1]).range([2, width - 2]);
  const y = d3.scaleLinear().domain(d3.extent(cleanData)).range([height - 4, 4]);
  const line = d3.line().x((_, i) => x(i)).y((d) => y(d)).curve(d3.curveMonotoneX);
  const lastIndex = cleanData.length - 1;
  const lastValue = cleanData[lastIndex];
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={line(cleanData)} fill="none" stroke={color} strokeWidth={1.6} />
      <circle cx={x(lastIndex)} cy={y(lastValue)} r={5.5} fill="none" stroke={color} strokeWidth={2.2}/>
    </svg>
  );
}

const Card = React.memo(function Card({ id, eyebrow, headline, blurb, statLabel, statValue, delta, spark, active, dimmed, onEnter, onLeave }) {
  return (
    <div
      onMouseEnter={() => onEnter(id)}
      onMouseLeave={onLeave}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        boxSizing: "border-box",
        padding: "12px 14px",
        borderRadius: 10,
        background: active ? TOKENS.tint2 : TOKENS.tint,
        border: `1px solid ${active ? TOKENS.blue300 : TOKENS.hair}`,
        opacity: dimmed ? 0.42 : 1,
        transition: "opacity 320ms ease, background 320ms ease, border-color 320ms ease",
        cursor: "default",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: TOKENS.font.mono,
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: TOKENS.faint,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: TOKENS.font.display,
            fontSize: 15.5,
            fontWeight: 600,
            color: TOKENS.ink,
            lineHeight: 1.25,
            marginBottom: 6,
          }}
        >
          {headline}
        </div>
        <div style={{ fontFamily: TOKENS.font.body, fontSize: 12.5, color: TOKENS.body, lineHeight: 1.45 }}>
          {blurb}
        </div>
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: `1px solid ${TOKENS.hair}`,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontFamily: TOKENS.font.mono, fontSize: 10, color: TOKENS.faint, marginBottom: 2 }}>
            {statLabel}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: TOKENS.font.display, fontSize: 20, fontWeight: 700, color: TOKENS.blue900 }}>
              {statValue}
            </span>
            {delta != null && <Delta 
            value={typeof delta === "object" ? delta.value : delta} 
            suffix={typeof delta === "object" ? delta.suffix : "cm"}
            showArrow={typeof delta === "object" ? delta.showArrow : true}/>}
          </div>
        </div>
        {spark && <MiniSpark data={spark} />}
      </div>
    </div>
  );
});

/* ------------------------------ B1: heat-map bars ------------------------------ */
const HeatBars = React.memo(function HeatBars({ seaGlobal, seaPacific, colorScale, hoverKey, width }) {
  const yearExtent = [1993, 2025];
  const xScale = d3.scaleLinear().domain(yearExtent).range([0, width]);
  const nYears = yearExtent[1] - yearExtent[0] + 1;
  const gap = 1.5;
  const sqW = width / nYears - gap;

  const topRevealed = useReveal(hoverKey === "A1" ? "A1" : null);
  const bottomRevealed = useReveal(hoverKey === "A2" ? "A2" : null);

  const otherDim = hoverKey === "A1" || hoverKey === "A2";

  const row = (data, valueKey, revealActive, revealed, label) => (
    <div style={{ opacity: otherDim && !revealActive ? 0.35 : 1, transition: "opacity 300ms ease" }}>
      <div
        style={{
          fontFamily: TOKENS.font.mono,
          fontSize: 10,
          color: TOKENS.faint,
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        <span>
          {yearExtent[0]}–{data[data.length - 1].TIME_PERIOD}
        </span>
      </div>
      <svg width={width} height={22}>
        {data.map((d, i) => {
          const x = xScale(d.TIME_PERIOD);
          const delay = revealActive ? (i / data.length) * 1.5 : 0;
          return (
            <rect
              key={i}
              x={x}
              y={0}
              width={Math.max(sqW, 1)}
              height={22}
              rx={1.5}
              fill={colorScale(d[valueKey])}
              style={
                revealActive
                  ? {
                      opacity: revealed ? 1 : 0,
                      transition: `opacity 420ms ease ${delay}s`,
                    }
                  : { opacity: 1 }
              }
            />
          );
        })}
      </svg>
    </div>
 );

  return (
  <div style={{ width: "100%" }}>
    <div
      style={{
        fontFamily: TOKENS.font.display,
        fontSize: 14,
        fontWeight: 600,
        color: TOKENS.ink,
        marginBottom: 10
      }}
    >
      Sea Level Trends
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%"
      }}
    >
      {row(
        seaGlobal,
        "SEA_LVL",
        hoverKey === "A1",
        topRevealed,
        "Global Sea Level Trends (cm)"
      )}

      {row(
        seaPacific,
        "MEAN",
        hoverKey === "A2",
        bottomRevealed,
        "Pacific Sea Level Observations (cm)"
      )}
    </div>
  </div>
);
});

/* ------------------------------ B2 replacement: simple line/area chart ------------------------------ */
const LineReplacement = React.memo(function LineReplacement({ title, series, width, height, showBand, revealed, unit = "cm" }) {
  const x = d3.scaleLinear().domain(d3.extent(series, (d) => d.x)).range([16, width - 16]);
  const yDomain = showBand
    ? [d3.min(series, (d) => d.lo), d3.max(series, (d) => d.hi)]
    : d3.extent(series, (d) => d.y);
  const y = d3.scaleLinear().domain(yDomain).nice().range([height - 26, 14]);
  const line = d3.line().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3.curveMonotoneX);
  const area = d3.area().x((d) => x(d.x)).y0((d) => y(d.lo)).y1((d) => y(d.hi)).curve(d3.curveMonotoneX);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontFamily: TOKENS.font.mono, fontSize: 10, color: TOKENS.faint, marginBottom: 4 }}>{title}</div>
      <svg width={width} height={height}>
        {showBand && (
          <path
            d={area(series)}
            fill={TOKENS.blue100}
            style={{
              clipPath: revealed ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
              transition: "clip-path 1.5s linear",
            }}
          />
        )}
        {[y.ticks(3)].flat().map((t, i) => (
          <g key={i}>
            <line x1={16} x2={width - 16} y1={y(t)} y2={y(t)} stroke={TOKENS.hair} strokeWidth={1} />
            <text x={0} y={y(t) + 3} fontSize={9} fontFamily={TOKENS.font.mono} fill={TOKENS.faint}>
              {t}
            </text>
          </g>
        ))}
        <path
          d={line(series)}
          fill="none"
          stroke={TOKENS.blue700}
          strokeWidth={2}
          pathLength={1000}
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: revealed ? 0 : 1000,
            transition: "stroke-dashoffset 1.5s linear",
          }}
        />
        <text x={width - 16} y={12} textAnchor="end" fontFamily={TOKENS.font.mono} fontSize={10} fill={TOKENS.blue900}>
          {fmt1(series[series.length - 1].y)}
          {unit}
        </text>
      </svg>
    </div>
  );
});


const MultiLineReplacement = React.memo(function MultiLineReplacement({
  series,
  width,
  height,
  revealed
}) {
  const metrics = [
    {
      key: "LVST_YIELD_var",
      label: "Livestock",
      color: TOKENS.blue900
    },
    {
      key: "CROP_YIELD_var",
      label: "Crop",
      color: TOKENS.blue300
    },
    {
      key: "TRSM_ARR_var",
      label: "Tourism",
      color: TOKENS.warm
    }
  ];

  const x = d3
    .scaleLinear()
    .domain(d3.extent(series, d => d.TIME_PERIOD))
    .range([16, width - 16]);

  const allValues = metrics.flatMap(metric =>
    series.map(d => d[metric.key])
  );

  const y = d3
    .scaleLinear()
    .domain(d3.extent(allValues))
    .nice()
    .range([height - 30, 20]);

  const makeLine = key =>
  d3.line()
    .defined(d =>
      d[key] != null &&
      !Number.isNaN(d[key])
    )
    .x(d => x(d.TIME_PERIOD))
    .y(d => y(d[key]))
    .curve(d3.curveMonotoneX);

  return (
  <div style={{ width: "100%" }}>
    <div
      style={{
        fontFamily: TOKENS.font.mono,
        fontSize: 10,
        color: TOKENS.faint,
        marginBottom: 6
      }}
    >
      Livelihood indicators (% vs. 1993-2023 average)
    </div>

    <svg width={width} height={height}>

      {/* gridlines */}

      {y.ticks(4).map(t => (
        <g key={t}>
          <line
            x1={16}
            x2={width - 16}
            y1={y(t)}
            y2={y(t)}
            stroke={TOKENS.hair}
            strokeWidth={1}
          />

          <text
            x={0}
            y={y(t) + 3}
            fontSize={9}
            fontFamily={TOKENS.font.mono}
            fill={TOKENS.faint}
          >
            {t}
          </text>
        </g>
      ))}

      {/* zero line */}

      <line
        x1={16}
        x2={width - 16}
        y1={y(0)}
        y2={y(0)}
        stroke={TOKENS.body}
        strokeWidth={1.5}
      />

      {/* lines */}

      {metrics.map(metric => (
        <path
          key={metric.key}
          d={makeLine(metric.key)(series)}
          fill="none"
          stroke={metric.color}
          strokeWidth={2}
          pathLength={1000}
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: revealed ? 0 : 1000,
            transition: "stroke-dashoffset 1.5s linear"
          }}
        />
      ))}

      {/* last-point markers */}

      {metrics.map(metric => {
        const latest = [...series]
  .reverse()
  .find(
    d =>
      d[metric.key] != null &&
      !Number.isNaN(d[metric.key])
  );
if (!latest) return null;
        return (
          <circle
            key={`${metric.key}-last`}
            cx={x(latest.TIME_PERIOD)}
            cy={y(latest[metric.key])}
            r={3}
            fill={metric.color}
          />
        );
      })}
    </svg>

    {/* legend outside SVG */}

    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 20,
        marginTop: 8,
        fontFamily: TOKENS.font.mono,
        fontSize: 10
      }}
    >
      {metrics.map(metric => (
        <div
          key={`${metric.key}-legend`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <div
            style={{
              width: 16,
              height: 2,
              background: metric.color
            }}
          />
          <span>{metric.label}</span>
        </div>
      ))}
    </div>
  </div>
);
});


/* ------------------------------ B1 replacement: lollipop by POP_N ------------------------------ */
const LollipopByPop = React.memo(function LollipopByPop({
  latestRows,
  width,
  height
}) {

  const rows = latestRows
  .filter(
    d =>
      d.GEO_PICT !== "ALL" &&
      d["5M_N"] != null &&
      d.POP_N != null &&
      d.POP_N > 0
  )
  .sort(
    (a, b) =>
      b["5M_N"] / b.POP_N -
      a["5M_N"] / a.POP_N
  )
  .slice(0, 7);

  const rowH = Math.min(20, (height - 10) / rows.length);

  const maxVal = d3.max(rows, d => d.POP_N);

  const xLeft = width * 0.32;

  const xScaleRight = d3
    .scaleLinear()
    .domain([0, maxVal])
    .range([0, width * 0.6]);

  const xScaleLeft = d3
    .scaleLinear()
    .domain([0, maxVal * 0.55])
    .range([0, width * 0.28]);

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          fontFamily: TOKENS.font.mono,
          fontSize: 10,
          color: TOKENS.faint,
          marginBottom: 4
        }}
      >
        Top 7 regions by share of population within 5 m elevation
      </div>

      <svg width={width} height={rows.length * rowH + 6}>
        <line
          x1={xLeft}
          x2={xLeft}
          y1={0}
          y2={rows.length * rowH}
          stroke={TOKENS.hair}
          strokeWidth={1}
        />

        {rows.map((d, i) => {
          const cy = i * rowH + rowH / 2;

          const r5 = xLeft + xScaleRight(d["5M_N"]);

          const minX = width * 0.12;

const r10 = Math.max(
  minX,
  xLeft - xScaleLeft(d["10M_N"] - d["5M_N"])
);

const r20 = Math.max(
  minX,
  xLeft - xScaleLeft(d["20M_N"] - d["5M_N"])
);

const rPop = Math.max(
  minX,
  xLeft - xScaleLeft(d.POP_N - d["5M_N"])
);

          return (
            <g key={d.GEO_PICT}>
              <text
                x={xLeft - width * 0.29}
                y={cy + 3}
                fontSize={9.5}
                fontFamily={TOKENS.font.mono}
                fill={TOKENS.body}
              >
                {d.GEO_PICT}
              </text>
<text
  x={r5 + 8}
  y={cy + 3}
  fontSize={9}
  fontFamily={TOKENS.font.mono}
  fill={TOKENS.blue900}
>
  {`${(
    100 * d["5M_N"] / d.POP_N
  ).toFixed(0)}% · ${fmtShort(d["5M_N"])}`}
</text>
              {/* left side */}
<line
  x1={rPop}
  x2={xLeft}
  y1={cy}
  y2={cy}
  stroke={TOKENS.warm}
  strokeWidth={1.5}
  opacity={0.6}
/>

{/* right side */}
<line
  x1={xLeft}
  x2={r5}
  y1={cy}
  y2={cy}
  stroke={TOKENS.blue500}
  strokeWidth={2}
/>

              <circle
                cx={r5}
                cy={cy}
                r={2.6}
                fill={TOKENS.blue700}
              />

              {[rPop, r20, r10].map((px, k) => (
                <circle
                  key={k}
                  cx={px}
                  cy={cy}
                  r={2}
                  fill="none"
                  stroke={TOKENS.warm}
                  strokeWidth={1.4}
                  opacity={0.75}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );

});
/* ------------------------------ B2: radial plot ------------------------------ */
const RadialPlot = React.memo(function RadialPlot({ sustainByGeo, geoCodes, size, hoverKey }) {
  const R = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const highlightLivelihoods = hoverKey === "C1";
  const toXY = (angleDeg, r) => {
    const a = (angleDeg - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const varToR = (v) => R * (0.5 + 0.0025 * Math.max(-100, Math.min(100, v)));

  // sector geometry: ALL gets a 35deg block centered at top (angle 0);
  // the remaining 14 regions share the rest of the circle, sorted by 2023 pop.
  const latestYear = 2023;
  const sortedRegions = [...geoCodes]
  .map(code => {
    const series = sustainByGeo.get(code);

    return {
      code,
      latest: series?.at(-1)
    };
  })
  .filter(d => d.latest)
  .sort(
    (a, b) =>
      b.latest.POP_N -
      a.latest.POP_N
  );
  const allBlock = 35; // 30deg sector + 2.5deg margin each side, per brief
  const regionPitch = (360 - allBlock) / sortedRegions.length;
  const regionMargin = 3; // deg reserved as gap either side of each region sector

  const sectors = [
    { code: "ALL", a0: -15, a4: 15 },
    ...sortedRegions.map((reg, i) => {
      const center = allBlock / 2 + regionPitch * i + regionPitch / 2;
      return { code: reg.code, a0: center - (regionPitch - regionMargin) / 2, a4: center + (regionPitch - regionMargin) / 2 };
    }),
  ];

  const revealed = useReveal(hoverKey === "C1" ? "C1" : null);
  const dimLines = hoverKey === "C2";
  const dimDoughnuts = hoverKey === "C1"; // doughnuts stay full opacity for C2 per brief

  const metricColor = { LVST_YIELD_var: TOKENS.blue900, CROP_YIELD_var: TOKENS.blue300, TRSM_ARR_var: TOKENS.warm };
  const metrics = ["LVST_YIELD_var", "CROP_YIELD_var", "TRSM_ARR_var"];

  // guide ring at r(0)=0.5R
  const zeroRing = d3.range(0, 361, 4).map((a) => toXY(a, R * 0.5));
  const ringPath = "M" + zeroRing.map((p) => p.join(",")).join("L") + "Z";

  const maxPop = d3.max(sortedRegions, reg => reg.latest.POP_N);
  const thicknessScale = d3.scaleSqrt().domain([0, maxPop]).range([0, R * 0.95 - R * 0.78]);
  const arcGen = d3.arc();

  
return (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%"
    }}
  >
    <div
      style={{
        fontFamily: TOKENS.font.display,
        fontSize: 14,
        fontWeight: 600,
        color: TOKENS.ink,
        marginBottom: 10,
        textAlign: "center",
        width: size
      }}
    >
      Regional Development & Coastal Exposure
    </div>

    
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <path d={ringPath} fill="none" stroke={TOKENS.hair} strokeWidth={1} strokeDasharray="1 3" />
      {sectors.map((s) => {
        const width4 = (s.a4 - s.a0) / 4;
        const b = [s.a0, s.a0 + width4, s.a0 + 2 * width4, s.a0 + 3 * width4, s.a4];
        const isAll = s.code === "ALL";
        const rows = sustainByGeo.get(s.code) || [];
        const subAssign = [
          { key: "LVST_YIELD_var", range: [b[1], b[2]] },
          { key: "CROP_YIELD_var", range: [b[2], b[3]] },
          { key: "TRSM_ARR_var", range: [b[3], b[4]] },
        ];

        return (
          <g
            key={s.code}
            
          >
            {/* sector edge guides */}
            {[s.a0, s.a4].map((a, i) => {
              const p0 = toXY(a, R * 0.22);
              const p1 = toXY(a, R * 0.78);
              return <line key={i} x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={TOKENS.hair} strokeWidth={1} opacity={highlightLivelihoods ? 0.25 : 1}/>;
            })}
            {/* region / ALL label */}
            {(() => {
              const mid = (s.a0 + s.a4) / 2;
              const lp = toXY(mid, R * 1.02);
              return (
                <text
  x={lp[0]}
  y={lp[1]}
  textAnchor="middle"
  dominantBaseline="middle"
  fontFamily={TOKENS.font.mono}
  fontSize={
    hoverKey === "C1" || hoverKey === "C2"
      ? (isAll ? 12 : 10)
      : (isAll ? 11 : 9)
  }
  fontWeight={
    hoverKey === "C1" || hoverKey === "C2"
      ? 700
      : (isAll ? 700 : 500)
  }
  fill={
    hoverKey === "C1" || hoverKey === "C2"
      ? TOKENS.blue900
      : (isAll ? TOKENS.blue900 : TOKENS.body)
  }
  opacity={1}
>
  {s.code}
</text>
              );
            })()}
            {/* three radial sparklines: LVST / CROP / TRSM */}
            {subAssign.map(({ key, range }) => {
              const pts = rows
  .map((row, i) => {
    if (
      row[key] == null ||
      Number.isNaN(row[key])
    ) {
      return null;
    }

    const angle =
      range[0] +
      ((range[1] - range[0]) * i) /
        (rows.length - 1);

    const r = varToR(row[key]);

    return toXY(angle, r);
  })
  .filter(Boolean);
  if (pts.length < 2) return null;

const d =
  "M" +
  pts.map(p => p.join(",")).join("L");
              const isEmphasised = hoverKey === "C1"; // synced with C1's line-reveal
              return (
                <g key={key}>
                  <path
  d={d}
  fill="none"
  stroke={metricColor[key]}
  strokeWidth={
    highlightLivelihoods
      ? (isAll ? 4 : 2.5)
      : (isAll ? 1.6 : 1.1)
  }
  pathLength={1000}
  style={{
    opacity: highlightLivelihoods ? 1 : 0.55,
    strokeDasharray: highlightLivelihoods ? 1000 : undefined,
    strokeDashoffset:
      highlightLivelihoods && !revealed
        ? 1000
        : 0,
    transition:
      "stroke-width 300ms ease, opacity 300ms ease, stroke-dashoffset 1.5s linear"
  }}
/>
                  <circle cx={pts[0][0]} cy={pts[0][1]} r={1.1} fill={metricColor[key]} />
                  <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.2} fill="none" stroke={metricColor[key]} strokeWidth={2.2}/>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* C2: outer doughnuts, population in low-elevation coastal zones */}
      <g style={{ opacity: dimDoughnuts ? 0.15 : 1, transition: "opacity 300ms ease" }}>
        {sortedRegions.map((reg) => {
          const s = sectors.find((sec) => sec.code === reg.code);
          const row = reg.latest;
          const r0 = R * 0.78;
          const thickness = Math.max(thicknessScale(row.POP_N), 3);
          const a0rad = (s.a0 - 90) * (Math.PI / 180);
          const a4rad = (s.a4 - 90) * (Math.PI / 180);
          const frac5 = row["5M_N"] / row.POP_N;
          const aSplit = (s.a0 - 90) * (Math.PI / 180) + (a4rad - a0rad) * frac5;
          const base = arcGen({
            innerRadius: r0,
            outerRadius: r0 + thickness,
            startAngle: (s.a0 * Math.PI) / 180,
            endAngle: (s.a4 * Math.PI) / 180,
          });
          const sub = arcGen({
            innerRadius: r0,
            outerRadius: r0 + thickness,
            startAngle: (s.a0 * Math.PI) / 180,
            endAngle: (s.a0 * Math.PI) / 180 + ((s.a4 - s.a0) * Math.PI) / 180 * frac5,
          });
          return (
            <g key={reg.code} transform={`translate(${cx},${cy})`}>
              <path d={base} fill={TOKENS.blue100} />
              <path d={sub} fill={TOKENS.blue700} />
            </g>
          );
        })}
      </g>
        </svg>



    {/* Livelihood legend */}

    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 18,
        marginTop: 8,
        fontFamily: TOKENS.font.mono,
        fontSize: 10,
        opacity: hoverKey === "C2"? 0.25: 1, 
        transition: "opacity 300ms ease"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        <div
          style={{
            width: 14,
            height: 2,
            background: TOKENS.blue900
          }}
        />
        <span
  style={{
    fontWeight:
      hoverKey === "C1"
        ? 700
        : 500,
    color:
      hoverKey === "C1"
        ? TOKENS.ink
        : TOKENS.body
  }}
>
  Livestock yield
</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        <div
          style={{
            width: 14,
            height: 2,
            background: TOKENS.blue300
          }}
        />
        <span
  style={{
    fontWeight:
      hoverKey === "C1"
        ? 700
        : 500,
    color:
      hoverKey === "C1"
        ? TOKENS.ink
        : TOKENS.body
  }}
>
  Crop yield
</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        <div
          style={{
            width: 14,
            height: 2,
            background: TOKENS.warm
          }}
        />
        <span
  style={{
    fontWeight:
      hoverKey === "C1"
        ? 700
        : 500,
    color:
      hoverKey === "C1"
        ? TOKENS.ink
        : TOKENS.body
  }}
>
  Tourism arrivals
</span>
      </div>
    </div>

    {/* Exposure legend */}

    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 18,
        marginTop: 6,
        fontFamily: TOKENS.font.mono,
        fontSize: 10,
        color: TOKENS.body,
        opacity: hoverKey === 'C1'? 0.25: 1,
        transition: "opacity 300ms ease"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: TOKENS.blue700
          }}
        />
        <span>Population within 5 m</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: TOKENS.blue100
          }}
        />
        <span>Remaining population</span>
      </div>
    </div>

  </div>
);
});

/* -------- panel B1 (bars, or C1/C2 replacement) -------- */
function PanelB1({ w, hoverKey, selectedSeries, seaGlobal, seaPacific, colorScale, latestRows }) {
  const c1Revealed = useReveal(hoverKey === "C1" ? "C1" : null);
  if (hoverKey === "C1") {
  return (
    <MultiLineReplacement
      series={selectedSeries}
      width={w}
      height={190}
      revealed={c1Revealed}
    />
  );
}
  if (hoverKey === "C2") {
    return <LollipopByPop latestRows={latestRows} width={w} height={280} />;
  }
  return <HeatBars seaGlobal={seaGlobal} seaPacific={seaPacific} colorScale={colorScale} hoverKey={hoverKey} width={w} />;
}

/* -------- panel B2 (radial plot, or A1/A2 replacement) -------- */
function PanelB2({ w, hoverKey, sustainByGeo, geoCodes, seaGlobal, seaPacific}) {
  const revealed = useReveal(hoverKey === "A1" || hoverKey === "A2" ? hoverKey : null);
  let lineSpec = null;
  if (hoverKey === "A1") {
    lineSpec = {
      title: "Global Sea Level trends (cm) — 1993–2025",
      series: seaGlobal.map((d) => ({ x: d.TIME_PERIOD, y: d.SEA_LVL })),
      showBand: false,
    };
  } else if (hoverKey === "A2") {
    lineSpec = {
      title: "Pacific Sea Level Observations [P10–P90] (cm) — 1993–2023",
      series: seaPacific.map((d) => ({ x: d.TIME_PERIOD, y: d.MEAN * 1, lo: d.P10 * 1, hi: d.P90 * 1 })),
      showBand: true,
    };
  }
  if (lineSpec) {
    return (
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        <LineReplacement
          title={lineSpec.title}
          series={lineSpec.series}
          width={w}
          height={Math.min(w * 0.7, 300)}
          showBand={lineSpec.showBand}
          revealed={revealed}
        />
      </div>
    );
  }
  return <RadialPlot sustainByGeo={sustainByGeo} geoCodes={geoCodes} size={Math.min(w, 420)} hoverKey={hoverKey} />;
}

/* ------------------------------ main component ------------------------------ */
export default function PacificClimateDashboard() {
  const [wrapRef, width] = useElementWidth();
  const isDynamic = width >= BREAKPOINT;
  const [hoverKey, setHoverKey] = useState(null);
  
  const [data, setData] = useState(null);
  



  useEffect(() => {
  loadDatasets().then(setData);
}, []);

const sustainByGeo = data?.sustainByGeo ?? new Map();
const geoCodes = data?.geoCodes ?? [];
const seaGlobal = data?.seaGlobal ?? [];
const seaPacific = data?.seaPacific ?? [];
const selectedSeries = useMemo(
  () => sustainByGeo.get("ALL") || [],
  [sustainByGeo]
);


const latestRows = useMemo(() => {
  const rows = [];

  sustainByGeo.forEach(series => {
    const latest = series.at(-1);

    if (latest) {
      rows.push(latest);
    }
  });

  return rows;
}, [sustainByGeo]);
  const onEnter = useCallback((id) => setHoverKey(id), []);
  const onLeave = useCallback(() => setHoverKey(null), []);

  const colorScale = useMemo(() => {
  const values = [
    ...seaGlobal.map(d => d.SEA_LVL),
    ...seaPacific.map(d => d.MEAN)
  ];

  return d3
    .scaleSequential(d3.interpolateBlues)
    .domain(d3.extent(values));
}, [seaGlobal, seaPacific]);

  const latest = {
    global: seaGlobal[seaGlobal.length - 1],
    pacific: seaPacific[seaPacific.length - 1],
  };
  if (
  !data ||
  seaGlobal.length === 0 ||
  seaPacific.length === 0
) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        height: "100vh"
      }}
    >
      Loading climate datasets...
    </div>
  );
}

  const cA1 = {
    id: "A1",
    eyebrow: "Sea level · Global",
    headline: "Global Sea Level Trends",
    blurb: "Global warming is accelerating sea level rise through ice mass loss and the thermal expansion of seawater. Observations indicate a sustained increase of about 0.3 cm per year since 1993. By 2025, global mean sea level is estimated to have risen by 7.6 cm.",
    statLabel: `${latest.global.TIME_PERIOD} vs. 1993–2013 baseline`,
    statValue: `+${latest.global.SEA_LVL.toFixed(1)} cm`,
    delta: {value: 0.3, suffix: " cm/yr", showArrow: true},
    //spark: seaGlobal.map((d) => d.SEA_LVL),
  };
  const cA2 = {
    id: "A2",
    eyebrow: "Sea level · Pacific",
    headline: "Pacific Local Observations",
    blurb: "Local observations across the Pacific show sea levels increasing at a faster rate than the global average, about 0.4 cm per year. By 2023, sea level had risen by 10.5 cm compared with 7.0 cm globally.",
    statLabel: `${latest.pacific.TIME_PERIOD} vs. 1993–2013 baseline`,
    statValue: `+${(latest.pacific.MEAN * 1).toFixed(1)} cm`,
    delta: {value: 0.4 , suffix: " cm/yr", showArrow:true},
    //spark: seaPacific.map((d) => d.MEAN),
  };
  const latestAll = (sustainByGeo.get("ALL") || []).at(-1) || {};
  
  
  const cC1 = {
    id: "C1",
    eyebrow: "Regional Development",
    headline: "Development Sustainability",
    blurb: "Regional trends indicate sustained growth in livestock and crop yields, while tourism is rising rapidly, placing increasing pressure on natural resources. At the same time, sea level rise remains a major climate threat in the Pacific, increasing the risk of coastal flooding and climate-related impacts.",
    statLabel: "2023 yield, vs. 1993–2023 average",
    statValue: `+${(22.9).toFixed(1)} %`,
    delta: {value: 9 , suffix: "%/yr in TRSM", showArrow:true},
    //spark: sustainByGeo.get("ALL").map((d) => d.TRSM_ARR_var),
  };
  const cC2 = {
    id: "C2",
    eyebrow: "Population · Pacific",
    headline: "Population living in low elevation coastal zones",
    blurb: "Approximately 5.5% of the population across Pacific Island Countries and Territories lives in Low Elevation Coastal Zones. The Marshall Islands (61%), French Polynesia (30%) and Kiribati (24%) have the highest relative exposure, while Papua New Guinea has the largest exposed population with 416k people.",
    statLabel: "2023 population within 5 m elevation",
    statValue: fmtShort(
  latestRows.filter(row => row.GEO_PICT !== "ALL").reduce(
    (sum, row) => sum + (row["5M_N"] || 0),
    0
  )
),
delta: {value: latestRows.filter(row => row.GEO_PICT !== "ALL").reduce(
    (sum, row) => sum + (row["5M_N"] || 0),
    0
  ) / latestRows.filter(row => row.GEO_PICT !== "ALL").reduce(
    (sum, row) => sum + (row["POP_N"] || 0),
    0
  ) * 100 , suffix: " %", showArrow: false},
    
    spark: null,
  };

  const cards = { A1: cA1, A2: cA2, C1: cC1, C2: cC2 };

  /* ------------------------------ styles ------------------------------ */
  const wrapStyle = {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    background: TOKENS.bg,
    fontFamily: TOKENS.font.body,
    color: TOKENS.ink,
    boxSizing: "border-box",
    padding: "28px clamp(16px, 3vw, 40px) 24px",
  };

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* ---------------- header ---------------- */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 22, borderBottom: `1px solid ${TOKENS.hair}`, paddingBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Waves size={18} color={TOKENS.blue500} strokeWidth={2.2} />
            <span style={{ fontFamily: TOKENS.font.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: TOKENS.blue500 }}>
              Climate Risks in the Pacific
            </span>
          </div>
          <h1 style={{ fontFamily: TOKENS.font.display, fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, margin: 0, color: TOKENS.ink }}>
            Sea Level, Development & Coastal Exposure
          </h1>
        </div>
        
      </header>


      {/* ---------------- dynamic layout ---------------- */}
      {isDynamic ? (
        <div style={{ display: "grid", gridTemplateColumns: "30% 40% 30%", gap: 16, alignItems: "stretch", marginTop: -10 }}>
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16 }}>
            <Card {...cA1} active={hoverKey === "A1"} dimmed={hoverKey && hoverKey !== "A1"} onEnter={onEnter} onLeave={onLeave} />
            <Card {...cA2} active={hoverKey === "A2"} dimmed={hoverKey && hoverKey !== "A2"} onEnter={onEnter} onLeave={onLeave} />
          </div>

          <div style={{ display: "grid", gridTemplateRows: "35% 65%", gap: 0 }}>
            <div
  style={{
    border: `1px solid ${TOKENS.hair}`,
    borderRadius: 10,
    padding: 14,
    display: "flex",
    alignItems: "center",
    height: 250,
    overflow: "hidden"
  }}
>
              <BoxMeasured>{(w) => <PanelB1 w={w} hoverKey={hoverKey} selectedSeries={selectedSeries} seaGlobal={seaGlobal} seaPacific={seaPacific} colorScale={colorScale} latestRows={latestRows}/>}</BoxMeasured>
            </div>
            <div
  style={{
    border: `1px solid ${TOKENS.hair}`,
    borderRadius: 10,
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 520,
    overflow: "visible",
    marginTop: -10
  }}
>
              <BoxMeasured>{(w) => <PanelB2 w={w} hoverKey={hoverKey} sustainByGeo={sustainByGeo} geoCodes={geoCodes} seaGlobal={seaGlobal} seaPacific={seaPacific} />}</BoxMeasured>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16 }}>
            <Card {...cC1} active={hoverKey === "C1"} dimmed={hoverKey && hoverKey !== "C1"} onEnter={onEnter} onLeave={onLeave} />
            <Card {...cC2} active={hoverKey === "C2"} dimmed={hoverKey && hoverKey !== "C2"} onEnter={onEnter} onLeave={onLeave} />
          </div>
        </div>
      ) : (
        /* ---------------- static layout: 40% / 60% x 5 rows ---------------- */
        <div style={{ display: "grid", gridTemplateColumns: "40% 60%", gap: 12 }}>
          <StaticCell><BoxMeasured>{(w) => <HeatBars seaGlobal={seaGlobal} seaPacific={seaPacific} colorScale={colorScale} hoverKey={null} width={w} />}</BoxMeasured></StaticCell>
          <StaticCell><BoxMeasured>{(w) => <RadialPlot sustainByGeo={sustainByGeo} geoCodes={geoCodes} size={Math.min(w, 320)} hoverKey={null} />}</BoxMeasured></StaticCell>

          <StaticCell><BoxMeasured>{(w) => <LineReplacement title="Global sea level (cm)" series={seaGlobal.map((d) => ({ x: d.TIME_PERIOD, y: d.SEA_LVL }))} width={w} height={180} showBand={false} revealed={true} />}</BoxMeasured></StaticCell>
          <StaticCell><Card {...cA1} active={false} dimmed={false} onEnter={() => {}} onLeave={() => {}} /></StaticCell>

          <StaticCell><BoxMeasured>{(w) => <LineReplacement title="PPacific Sea Level Observations [P10–P90] (cm)" series={seaPacific.map((d) => ({ x: d.TIME_PERIOD, y: d.MEAN, lo: d.P10, hi: d.P90 }))} width={w} height={180} showBand={true} revealed={true} />}</BoxMeasured></StaticCell>
          <StaticCell><Card {...cA2} active={false} dimmed={false} onEnter={() => {}} onLeave={() => {}} /></StaticCell>

          <StaticCell>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              {["LVST_YIELD_var", "CROP_YIELD_var", "TRSM_ARR_var"].map((key) => (
                <BoxMeasured key={key}>
                  {(w) => (
                    <LineReplacement
                      title={`${key.replace("_var", "").replace("_", " ")} — % vs. avg (ALL)`}
                      series={sustainByGeo.get("ALL").map((d) => ({ x: d.TIME_PERIOD, y: d[key] }))}
                      width={w}
                      height={64}
                      showBand={false}
                      revealed={true}
                      unit="%"
                    />
                  )}
                </BoxMeasured>
              ))}
            </div>
          </StaticCell>
          <StaticCell><Card {...cC1} active={false} dimmed={false} onEnter={() => {}} onLeave={() => {}} /></StaticCell>

          <StaticCell><BoxMeasured>{(w) => <LollipopByPop latestRows={latestRows} width={w} height={300} />}</BoxMeasured></StaticCell>
          <StaticCell><Card {...cC2} active={false} dimmed={false} onEnter={() => {}} onLeave={() => {}} /></StaticCell>
        </div>
      )}

      {/* ---------------- footnotes ---------------- */}

      
      <footer style={{ marginTop: 24, paddingTop: 14, borderTop: `1px solid ${TOKENS.hair}` }}>
        <p style={{ fontFamily: TOKENS.font.mono, fontSize: 10.5, color: TOKENS.faint, lineHeight: 1.6, margin: 0 }}>
          Created by Alvaro Campion Mezquíriz • Pacific Climatic Risk • <a
  href="https://github.com/your-user/your-repository"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    color: TOKENS.blue700,
    textDecoration: "none"
  }}
>
  github.com/your-user/your-repository
</a>
        </p>
      </footer>
    </div>
  );
}

/* measures the width of its own wrapper and passes it to a render-prop child */
function BoxMeasured({ children }) {
  const [ref, width] = useElementWidth();
  return (
    <div ref={ref} style={{ width: "100%" }}>
      {width > 10 ? children(width - 4) : null}
    </div>
  );
}

function StaticCell({ children }) {
  return (
    <div style={{ border: `1px solid ${TOKENS.hair}`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", minHeight: 70 }}>
      {children}
    </div>
  );
}
