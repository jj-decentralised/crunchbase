export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span className="rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted">
        Powered by Crunchbase
      </span>
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Capital Flows
      </h1>
      <p className="max-w-xl text-pretty text-lg text-muted">
        A venture-capital research hub for tracking how investment dollars flow
        across categories over time.
      </p>
      <p className="text-sm text-muted-2">Foundation scaffolding in progress…</p>
    </main>
  );
}
