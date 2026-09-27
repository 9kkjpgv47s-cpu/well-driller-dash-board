import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="cj-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="bg-layer" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
      </div>
      <header className="cj-topbar">
        <Link className="cj-brand" href="/">
          <BrandMark />
          <span className="cj-brand-text">
            C&J <em>Well Co</em>
          </span>
          <span className="cj-tag">Driller Hub</span>
        </Link>
        <div className="cj-top-actions">
          <a className="cj-app-switch" href="/well-viewer/index.html">
            Well viewer <span className="arrow">→</span>
          </a>
          <ThemeToggle />
        </div>
      </header>
      <main className="cj-main" id="main">
        {children}
      </main>
    </div>
  );
}
