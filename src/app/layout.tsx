import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Driller brief — Field outline",
  description:
    "Paste dispatch text to build a jobsite brief. No API keys required for MVP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <div className="app-backdrop min-h-screen">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">{children}</div>
          <footer className="border-t border-[var(--border)] px-4 py-8">
            <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-[var(--muted)]">
              MVP: paste-only parsing. Official registry data and community
              notes stay separate when wired to live sources.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
