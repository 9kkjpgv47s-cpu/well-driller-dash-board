import { DrillerBriefApp } from "@/components/DrillerBriefApp";

export default function Page() {
  return (
    <div className="space-y-10">
      <header className="text-center sm:text-left">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Driller brief
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
          From dispatch to field outline
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:mx-0">
          Paste your dispatch email. We pull out the address and coordinates
          (when present) and build the same jobsite outline — mock nearby wells
          for now. Google-powered email parsing and geocoding can plug in later
          when you have API keys.
        </p>
      </header>
      <DrillerBriefApp />
    </div>
  );
}
