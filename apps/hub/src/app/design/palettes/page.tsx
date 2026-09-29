import { notFound } from "next/navigation";
import { BrandMark } from "@/components/ui/BrandMark";

export const metadata = { title: "C&J light paper palettes" };

/* Palette definitions — mirror the [data-paper] blocks in
   design/cj/tokens.css. Hex values duplicated here so the swatch labels and
   the computed contrast table always show the true values. */

type Paper = {
  id: string;
  name: string;
  hue: string;
  blurb: string;
  tokens: Record<string, string>;
};

const BASE = {
  "accent-ink": "#8F0000",
  "accent-2": "#FFE90A",
  "accent-2-ink": "#7A6200",
};

const PAPERS: Paper[] = [
  {
    id: "current",
    name: "Current light",
    hue: "neutral paper",
    blurb: "Existing light theme — the baseline for comparison.",
    tokens: {
      bg: "#F6F4EF", "bg-2": "#EFECE5", "bg-3": "#E7E3DA", surface: "#FBFAF7",
      ink: "#0F1522", "ink-2": "#3A4150", "ink-3": "#565E6A", "ink-4": "#5F6672",
      accent: "#C60000", ok: "#267030", warn: "#94570F", bad: "#B3261E",
      ...BASE,
    },
  },
  {
    id: "limestone",
    name: "Limestone",
    hue: "~35° warm neutral",
    blurb:
      "Subtle warm off-white. Softens the paper without tinting it; the C&J red keeps full strength.",
    tokens: {
      bg: "#F1ECE3", "bg-2": "#E8E1D5", "bg-3": "#DDD4C5", surface: "#F8F4EE",
      ink: "#1C1A17", "ink-2": "#45403A", "ink-3": "#5E574E", "ink-4": "#6B6359",
      accent: "#C60000", ok: "#267030", warn: "#93560F", bad: "#B3261E",
      ...BASE,
    },
  },
  {
    id: "sandstone",
    name: "Sandstone",
    hue: "~35° tan",
    blurb:
      "Tan ground — analogous to red. Accent deepened to #BB0000 to hold AA on the darker ground.",
    tokens: {
      bg: "#E9DFCE", "bg-2": "#DFD2BD", "bg-3": "#D3C3AA", surface: "#F3EBDD",
      ink: "#22190F", "ink-2": "#4A3D2E", "ink-3": "#5F5040", "ink-4": "#695947",
      accent: "#BB0000", ok: "#23682D", warn: "#854E0D", bad: "#B0251E",
      ...BASE,
    },
  },
  {
    id: "kraft",
    name: "Kraft",
    hue: "~33° light brown",
    blurb:
      "Light brown, most character — field-notebook paper. Accent #AB0000 keeps AA on the darkest ground.",
    tokens: {
      bg: "#E2D3BD", "bg-2": "#D6C4A8", "bg-3": "#C9B494", surface: "#EDE2D0",
      ink: "#24180C", "ink-2": "#4B3A27", "ink-3": "#5C4832", "ink-4": "#644F39",
      accent: "#AB0000", ok: "#205F29", warn: "#79470C", bad: "#9F221B",
      ...BASE,
    },
  },
  {
    id: "sage",
    name: "Sage",
    hue: "~90° green-gray",
    blurb:
      "Muted near-complement to red — calms the accent and makes it pop without competing.",
    tokens: {
      bg: "#E9EAE2", "bg-2": "#DFE1D6", "bg-3": "#D2D5C8", surface: "#F3F3EE",
      ink: "#181B17", "ink-2": "#3E433C", "ink-3": "#555B52", "ink-4": "#5F655D",
      accent: "#C60000", ok: "#267030", warn: "#91550F", bad: "#B3261E",
      ...BASE,
    },
  },
];

const TEXT_TOKENS = ["ink", "ink-2", "ink-3", "ink-4", "accent", "accent-ink", "ok", "warn", "bad"];
const GROUNDS = ["bg", "bg-2", "surface"];

/* WCAG 2.x relative-luminance contrast ratio. */
function channel(v: number) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function lum(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function ratio(fg: string, bg: string) {
  const a = lum(fg);
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function Swatch({ token, hex }: { token: string; hex: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <div
        style={{
          height: 34,
          borderRadius: "var(--radius)",
          border: "1px solid var(--line-strong)",
          background: hex,
        }}
      />
      <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>
        {token}
      </span>
      <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
        {hex}
      </span>
    </div>
  );
}

function Specimen({ paper }: { paper: Paper }) {
  const scope =
    paper.id === "current"
      ? ({ "data-theme": "light" } as const)
      : ({ "data-theme": "light", "data-paper": paper.id } as const);
  return (
    <div
      {...scope}
      style={{
        background: "var(--bg)",
        color: "var(--ink)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--line-strong)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {/* mini topbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-3)",
          padding: "10px var(--s-4)",
          background: "var(--glass)",
          boxShadow: "0 1px 0 var(--line)",
        }}
      >
        <span className="cj-brand" style={{ minHeight: 0 }}>
          <BrandMark />
          <span className="cj-brand-text" style={{ fontSize: "1rem" }}>
            C&J <em>Well Co</em>
          </span>
          <span className="cj-tag" style={{ marginLeft: "var(--s-2)", paddingLeft: "var(--s-2)" }}>
            Viewer
          </span>
        </span>
        <span
          className="cj-app-switch"
          style={{ minHeight: 30, fontSize: "var(--fs-xs)", padding: "0 var(--s-3)" }}
        >
          Hub <span className="arrow">→</span>
        </span>
      </div>

      <div style={{ padding: "var(--s-4)", display: "grid", gap: "var(--s-4)" }}>
        {/* swatch ramp */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "var(--s-2)",
          }}
        >
          {["bg", "bg-2", "bg-3", "surface", "ink", "ink-2", "ink-3", "ink-4", "accent", "accent-ink", "accent-2", "ok", "warn", "bad"].map(
            (t) => (
              <Swatch key={t} token={t} hex={paper.tokens[t]} />
            ),
          )}
        </div>

        {/* card + controls */}
        <div className="card" style={{ padding: "var(--s-4)" }}>
          <p className="eyebrow plain">Well type filter</p>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-lg)", margin: "2px 0 6px" }}>
            Avon field <em>prep</em>
          </h3>
          <p style={{ color: "var(--ink-2)", fontSize: "var(--fs-sm)", marginBottom: "var(--s-3)" }}>
            27 registry wells inside the job radius. Ground elevation from DEM,
            yield bands locked to registry colors.
          </p>
          <input className="input" placeholder="1234 E County Road 100 N" style={{ marginBottom: "var(--s-3)" }} readOnly />
          <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary">Generate brief</button>
            <button type="button" className="btn btn-accent">Driller hub</button>
            <button type="button" className="btn btn-ghost">Cancel</button>
          </div>
        </div>

        {/* callouts */}
        <div style={{ display: "grid", gap: "var(--s-2)" }}>
          <div className="callout is-ok"><strong>Ok.</strong> Elevation service healthy.</div>
          <div className="callout is-warn"><strong>Warn.</strong> 3 wells missing depth.</div>
          <div className="callout is-bad"><strong>Bad.</strong> Report link failed.</div>
        </div>

        {/* legend row with LOCKED data colors */}
        <div className="cj-plate" style={{ padding: "var(--s-3)" }}>
          <p className="eyebrow plain" style={{ marginBottom: 6 }}>Legend (locked colors)</p>
          {[
            ["#1d4ed8", "● Unconsolidated / Gravel"],
            ["#dc2626", "● Bedrock / Rock"],
            ["#f97316", "● Bucket / Hand Dug"],
            ["#16a34a", "● Estimated / Unverified"],
          ].map(([c, label]) => (
            <div key={label} style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: c, lineHeight: 1.6 }}>
              {label}
            </div>
          ))}
        </div>

        {/* nearest-well card with R/G/S chips (locked colors) */}
        <div className="cj-plate" style={{ padding: "var(--s-3)" }}>
          <p className="mono" style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--ink)" }}>
            DNR-186413
          </p>
          <p style={{ marginTop: 2, display: "flex", alignItems: "flex-end", gap: 8 }}>
            <span className="cj-data inline-flex items-end rounded px-0.5">
              <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626" }}>R</span>
              <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, color: "#b91c1c" }}>41</span>
            </span>
            <span className="cj-data inline-flex items-end rounded px-0.5">
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb" }}>G1</span>
              <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, color: "#1d4ed8" }}>&nbsp;10</span>
            </span>
            <span className="cj-data inline-flex items-end rounded px-0.5">
              <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706" }}>S2</span>
              <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, color: "#b45309" }}>&nbsp;12</span>
            </span>
          </p>
          <p style={{ marginTop: 4, fontSize: 11, color: "var(--ink-2)" }}>84 ft · 10 gpm · 0.1 mi</p>
        </div>

        {/* contrast table — computed from the token hexes above */}
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }} className="mono">
          <thead>
            <tr>
              <th style={{ textAlign: "left", color: "var(--ink-3)", padding: "2px 0" }}>token</th>
              {GROUNDS.map((g) => (
                <th key={g} style={{ textAlign: "right", color: "var(--ink-3)", padding: "2px 0" }}>{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEXT_TOKENS.map((t) => (
              <tr key={t} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ color: "var(--ink-2)", padding: "2px 0" }}>{t}</td>
                {GROUNDS.map((g) => {
                  const r = ratio(paper.tokens[t], paper.tokens[g]);
                  return (
                    <td
                      key={g}
                      style={{
                        textAlign: "right",
                        padding: "2px 0",
                        color: r >= 4.5 ? "var(--ok)" : "var(--bad)",
                        fontWeight: r >= 4.5 ? 400 : 700,
                      }}
                    >
                      {r.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Rendered per-request so the production notFound() returns a real 404
 *  status instead of streaming a 200 with a 404 body. */
export const dynamic = "force-dynamic";

/** Dev-only palette mockup — 404 in production builds. */
export default function PalettesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div style={{ paddingTop: "var(--s-6)" }}>
      <p className="eyebrow">C&J Well Co · light paper mockups</p>
      <h1 style={{ marginTop: "var(--s-3)", marginBottom: "var(--s-2)" }}>
        Calmer <em>paper</em> for light mode.
      </h1>
      <p className="lede" style={{ marginBottom: "var(--s-5)" }}>
        Opt-in light-theme variants chosen with <code>?paper=limestone|sandstone|kraft|sage</code>
        (persisted to <code>localStorage cj-paper</code>; <code>?paper=none</code> clears).
        Each column is a live <code>data-paper</code> scope — the values below are the real
        overrides in <code>tokens.css</code>.
      </p>
      <div
        className="card"
        style={{ marginBottom: "var(--s-6)", color: "var(--ink-2)", fontSize: "var(--fs-sm)" }}
      >
        <p style={{ marginBottom: "var(--s-2)" }}>
          <strong>Rationale.</strong> The complement of the C&J red (hue ~0°) is cyan/teal
          (~180°) — loud and off-brand. Warm, low-saturation neutrals (hue 30–40°:
          limestone, sandstone, kraft) are analogous to red and read calm and earthy.
          Sage (hue ~90–100°, low saturation) is a muted near-complement that cools the
          ground so the red pops without competing.
        </p>
        <p style={{ color: "var(--ink-3)" }}>
          Contrast: every text token ≥4.5:1 on bg / bg-2 / surface (WCAG AA). Where a
          value fell short on the paper&rsquo;s darkest ground it was darkened minimally,
          hue preserved — e.g. accent #C60000 → #BB0000 on sandstone, #AB0000 on kraft.
          bg-3 is an inset/track ground (not a text surface); a few tokens sit at
          3.8–4.3:1 there and are shown for completeness.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gap: "var(--s-4)",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
          alignItems: "start",
        }}
      >
        {PAPERS.map((p) => (
          <div key={p.id}>
            <div className="section-head" style={{ marginBottom: "var(--s-2)" }}>
              <h2 style={{ fontSize: "var(--fs-md)" }}>{p.name}</h2>
              <span className="count">{p.hue}</span>
            </div>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--ink-3)", marginBottom: "var(--s-2)" }}>
              {p.blurb}
            </p>
            <Specimen paper={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
