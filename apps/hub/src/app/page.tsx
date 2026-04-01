import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pre-job hub
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-300">
          Switch between trip scheduling and quick jobsite optimization hints.
          Built for light concurrent use while testing; deployment can scale
          reads with caching and a future analytics service.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/scheduling"
          className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
        >
          <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-sky-700 dark:text-zinc-50 dark:group-hover:text-sky-400">
            Scheduling
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Week view and job list for the crew. Local demo data only until
            connected to your systems.
          </p>
          <p className="mt-4 text-sm font-medium text-sky-700 dark:text-sky-400">
            Open scheduling →
          </p>
        </Link>

        <Link
          href="/optimization"
          className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
        >
          <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-400">
            Driller optimization
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Jobsite parameters and sample neighborhood hints from the API
            (mocked logic for now).
          </p>
          <p className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-400">
            Open optimization →
          </p>
        </Link>
      </div>
    </div>
  );
}
