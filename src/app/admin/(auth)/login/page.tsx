import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { devLoginAllowed, getAdmin, supabaseConfigured } from "@/lib/auth";
import { loginAction } from "../../actions/auth";
import logo from "../../../../../public/images/brand/hani-logo.png";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const supa = supabaseConfigured();
  const dev = devLoginAllowed();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="card w-full max-w-sm p-7">
        <Image src={logo} alt="HANI BARBERSHOP" className="mx-auto w-44" />
        <h1 className="mt-6 text-center text-lg font-bold">Admin-Bereich</h1>
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red/50 bg-red/10 p-3 text-sm">
            {error}
          </p>
        )}
        {supa || dev ? (
          <form action={loginAction} className="mt-6 space-y-4">
            {supa && (
              <div>
                <label htmlFor="email" className="label">
                  E-Mail
                </label>
                <input id="email" name="email" type="email" autoComplete="username" required className="field" />
              </div>
            )}
            <div>
              <label htmlFor="password" className="label">
                Passwort
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
            </div>
            <button className="btn btn-primary w-full">Anmelden</button>
            {dev && <p className="text-xs text-muted">Entwicklungsmodus: Passwort aus ADMIN_DEV_PASSWORD (.env.local).</p>}
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted">
            Die Anmeldung ist nicht konfiguriert. Bitte Supabase-Umgebungsvariablen setzen (siehe docs/DEPLOYMENT.md).
          </p>
        )}
      </div>
    </main>
  );
}
