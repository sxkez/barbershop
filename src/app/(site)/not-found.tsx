import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-3 text-4xl">Seite nicht gefunden</h1>
      <p className="mt-4 text-muted">Diese Seite gibt es nicht (mehr).</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="btn btn-primary">
          Zur Startseite
        </Link>
        <Link href="/termin" className="btn btn-ghost">
          Termin buchen
        </Link>
      </div>
    </div>
  );
}
