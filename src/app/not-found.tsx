import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="text-5xl font-semibold tracking-tight text-muted-2">404</span>
      <p className="text-sm text-muted">This page could not be found.</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Back to overview
      </Link>
    </main>
  );
}
