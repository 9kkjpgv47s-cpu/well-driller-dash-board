import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, IBM_Plex_Mono, Geist } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

// Self-hosted via next/font — no fonts.googleapis.com RTT on first paint.
// The --f-* vars plug into the C&J tokens (--font-display/body/mono).
const fontDisplay = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--f-display",
  display: "swap",
});
const fontBody = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--f-body",
  display: "swap",
});
const fontMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--f-mono",
  display: "swap",
});
// Loaded only so map marker labels keep their pre-restyle font (the locked
// marker CSS inherits body font — see globals.css note above the marker block).
const fontMarker = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

// No-flash theme bootstrap — mirrors design/cj/theme-init.js verbatim.
// Paper palettes: ?paper=limestone|sandstone|kraft|sage persists to
// localStorage 'cj-paper' (?paper=none clears); applies under light only.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('cj-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}try{var q=new URLSearchParams(location.search).get('paper');if(q==='none')localStorage.removeItem('cj-paper');else if(q)localStorage.setItem('cj-paper',q);var p=localStorage.getItem('cj-paper');if(p==='limestone'||p==='sandstone'||p==='kraft'||p==='sage'){document.documentElement.dataset.paper=p}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Driller Hub — C&J Well Co",
  description:
    "Field jobsite workspace: dispatch parsing, DNR wells map, depth view, weather, and area drilling analysis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} ${fontMarker.variable}`}
    >
      <body suppressHydrationWarning>
        {/* First child of <body>: sets html[data-theme] before paint. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
