"use client";

import { useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { BoreLoader } from "@/components/ui/BoreLoader";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ICON_NAMES, type IconName } from "@/styles/cj/icons";

const COLOR_TOKENS = [
  "bg", "bg-2", "bg-3", "surface", "glass",
  "ink", "ink-2", "ink-3", "ink-4",
  "line", "line-strong",
  "accent", "accent-ink", "accent-soft",
  "accent-2", "accent-2-ink", "accent-2-soft",
  "ok", "ok-soft", "warn", "warn-soft", "bad", "bad-soft", "bad-ink",
  "selection",
];

const THEME_ORDER = ["light", "dark", "field"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--s-7)" }}>
      <div className="section-head">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Swatch({ name }: { name: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          height: 44,
          borderRadius: "var(--radius)",
          border: "1px solid var(--line-strong)",
          background: `var(--${name})`,
        }}
      />
      <span className="mono" style={{ fontSize: "var(--fs-xs)" }}>--{name}</span>
    </div>
  );
}

export function DesignShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [seg, setSeg] = useState("map");
  const [switchOn, setSwitchOn] = useState(true);
  const [theme, setTheme] = useState<string | null>(null);

  const setDocTheme = (t: string) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("cj-theme", t); } catch {}
    setTheme(t);
  };

  return (
    <div className="cj-shell">
      <header className="cj-topbar">
        <span className="cj-brand">
          <BrandMark />
          <span className="cj-brand-text">C&J <em>Well Co</em></span>
          <span className="cj-tag">Design system</span>
        </span>
        <div className="cj-top-actions">
          <div className="seg" role="group" aria-label="Theme">
            {THEME_ORDER.map((t) => (
              <button key={t} type="button" aria-pressed={theme === t} onClick={() => setDocTheme(t)}>
                {t}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="cj-main">
        <div style={{ paddingTop: "var(--s-6)" }}>
          <p className="eyebrow">C&J Well Co · design system</p>
          <h1 style={{ marginTop: "var(--s-3)", marginBottom: "var(--s-4)" }}>
            One system for <em>office and field</em>.
          </h1>
          <p className="lede" style={{ marginBottom: "var(--s-7)" }}>
            Tokens, type, components and motion shared by the Driller Hub and the
            C&J Well Viewer. Three themes — light, dark, and the high-contrast
            field theme for daylight use.
          </p>
        </div>

        <Section title="Color tokens">
          <div style={{ display: "grid", gap: "var(--s-3)", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
            {COLOR_TOKENS.map((t) => <Swatch key={t} name={t} />)}
          </div>
        </Section>

        <Section title="Typography">
          <div className="card" style={{ display: "grid", gap: "var(--s-4)" }}>
            <h1>Display — Instrument Serif <em>accent</em></h1>
            <h2>Section heading <em>in italic red</em></h2>
            <h3>Subhead — Inter 500</h3>
            <p>Body copy in Inter. The ground truth for paragraphs, lists, and everything a driller reads on site.</p>
            <p className="lede">Lede — a longer intro line in ink-2 with a 64ch measure.</p>
            <p><span className="eyebrow">Eyebrow label</span></p>
            <p className="mono">Mono — IBM Plex Mono for labels and measurements</p>
            <p className="num">Numerals — 1,125 wells · 86.4 ft · DNR-186413</p>
            <p className="muted">Muted ink-3 text · <span className="faint">faint ink-4</span></p>
          </div>
        </Section>

        <Section title="Spacing &amp; radii">
          <div className="card" style={{ display: "flex", gap: "var(--s-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                <div style={{ width: `var(--s-${n})`, height: `var(--s-${n})`, background: "var(--accent)", borderRadius: 2 }} />
                <span className="mono" style={{ fontSize: "var(--fs-xs)" }}>s-{n}</span>
              </div>
            ))}
            <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
              <div style={{ width: 40, height: 24, border: "1px solid var(--ink)", borderRadius: "var(--radius)" }} />
              <span className="mono" style={{ fontSize: "var(--fs-xs)" }}>radius</span>
            </div>
            <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
              <div style={{ width: 40, height: 24, border: "1px solid var(--ink)", borderRadius: "var(--radius-lg)" }} />
              <span className="mono" style={{ fontSize: "var(--fs-xs)" }}>radius-lg</span>
            </div>
          </div>
        </Section>

        <Section title="Icons">
          <div className="card" style={{ display: "grid", gap: "var(--s-4)", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
            {ICON_NAMES.map((name: IconName) => (
              <div key={name} style={{ display: "grid", gap: 6, justifyItems: "center", textAlign: "center" }}>
                <Icon name={name} size={22} />
                <span className="mono" style={{ fontSize: "var(--fs-xs)" }}>{name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className="card" style={{ display: "grid", gap: "var(--s-4)" }}>
            <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-accent">Accent</button>
              <button className="btn btn-ghost">Ghost</button>
              <button className="btn btn-danger">Danger</button>
              <button className="btn btn-icon" aria-label="Refresh"><Icon name="refresh" /></button>
              <button className="btn btn-primary"><span>Next</span><span className="arrow">→</span></button>
            </div>
            <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-ghost btn-sm">Small ghost</button>
              <button className="btn btn-primary is-loading"><span>Saving</span></button>
              <button className="btn btn-accent is-loading"><span>Saving</span></button>
              <button className="btn btn-ghost is-loading"><span>Saving</span></button>
              <button className="btn btn-primary" disabled>Disabled</button>
              <button className="btn btn-ghost" disabled>Disabled ghost</button>
            </div>
            <a className="link-arrow" href="/design">Arrow link</a>
          </div>
        </Section>

        <Section title="Forms">
          <div className="card" style={{ display: "grid", gap: "var(--s-4)", maxWidth: 560 }}>
            <div className="field">
              <label htmlFor="ds-input">Job address</label>
              <input id="ds-input" className="input" placeholder="1234 S County Rd 500 E" />
            </div>
            <div className="field">
              <label htmlFor="ds-select">Well type</label>
              <select id="ds-select" className="select">
                <option>Domestic</option>
                <option>Monitoring</option>
                <option>Irrigation</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ds-ta">Notes</label>
              <textarea id="ds-ta" className="textarea" placeholder="Access notes, gate codes…" />
            </div>
            <label className="switch">
              <input type="checkbox" checked={switchOn} onChange={(e) => setSwitchOn(e.target.checked)} />
              <span className="track" />
              <span className="switch-label">Switch — {switchOn ? "on" : "off"}</span>
            </label>
            <div className="seg" role="group" aria-label="Demo segmented">
              {["map", "list", "depth"].map((k) => (
                <button key={k} type="button" aria-pressed={seg === k} onClick={() => setSeg(k)}>
                  <span className="seg-icon"><Icon name={k === "map" ? "layers" : k === "list" ? "filter" : "well"} size={15} /></span>
                  {k}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Cards, callouts, badges">
          <div style={{ display: "grid", gap: "var(--s-4)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div className="card">
              <div className="label">Card</div>
              <h3>Plain card</h3>
              <p>Surface, hairline border, 12px radius.</p>
              <div className="card-foot"><span className="mono">footer</span><Icon name="arrow-right" size={15} /></div>
            </div>
            <div className="card is-featured">
              <div className="label">Featured</div>
              <h3>Featured card</h3>
              <p>Stronger line + shadow.</p>
            </div>
            <div className="card" style={{ display: "grid", gap: "var(--s-2)", alignContent: "start" }}>
              <span className="badge">default</span>
              <span className="badge badge-ok">ok</span>
              <span className="badge badge-warn">warn</span>
              <span className="badge badge-bad">bad</span>
              <span className="badge badge-info">info</span>
              <span className="badge badge-faint">faint</span>
              <span className="chip">chip</span>
              <span className="chip on"><span className="dot" />chip on</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: "var(--s-3)", marginTop: "var(--s-4)" }}>
            <div className="callout is-info"><strong>Info.</strong> Default callout with the accent left rule.</div>
            <div className="callout is-ok"><strong>Ok.</strong> Everything checks out.</div>
            <div className="callout is-warn"><strong>Warn.</strong> Worth a second look.</div>
            <div className="callout is-bad"><strong>Bad.</strong> Something needs attention.</div>
          </div>
        </Section>

        <Section title="Loading">
          <div style={{ display: "grid", gap: "var(--s-4)", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div className="card" style={{ display: "grid", placeItems: "center" }}>
              <BoreLoader status="Locating wells" />
            </div>
            <div className="card" style={{ display: "grid", gap: "var(--s-3)" }}>
              <div className="skel" style={{ height: 18, width: "40%" }} />
              <div className="skel" style={{ height: 12 }} />
              <div className="skel" style={{ height: 12 }} />
              <div className="skel" style={{ height: 12, width: "70%" }} />
              <div className="progress"><span style={{ width: "62%" }} /></div>
            </div>
          </div>
        </Section>

        <Section title="Empty &amp; modal">
          <div className="empty">
            <h3>Nothing here yet</h3>
            <p>Empty states get the dashed border and a serif title.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Open modal</button>
          {modalOpen && (
            <div className="modal-backdrop" onClick={() => setModalOpen(false)} role="presentation">
              <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="ds-modal-title" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h2 id="ds-modal-title">Modal dialog</h2>
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label="Close" onClick={() => setModalOpen(false)}>
                    <Icon name="close" size={15} />
                  </button>
                </div>
                <p style={{ color: "var(--ink-2)", fontSize: "var(--fs-sm)", marginBottom: "var(--s-4)" }}>
                  Dialogs center on wide screens and become a bottom sheet at ≤760px.
                </p>
                <div style={{ display: "flex", gap: "var(--s-3)", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button className="btn btn-accent" onClick={() => setModalOpen(false)}>Confirm</button>
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Motion">
          <div className="reveal-group" style={{ display: "grid", gap: "var(--s-3)", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="card"><div className="label">reveal {n}</div><p>60ms stagger</p></div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
