import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";
import { getAccountByAccessToken, getTransactions } from "@/lib/loyalty/service";
import { getSettings } from "@/lib/settings";
import { DigitalCard } from "@/components/site/DigitalCard";
import { formatInstant } from "@/lib/time";

export const metadata: Metadata = { title: "Meine Stempelkarte", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

const TYPE_LABEL = { stamp: "Stempel", correction: "Korrektur", redemption: "Belohnung eingelöst", migration: "Übertrag Papierkarte" } as const;

export default async function CardPage({ params }: Props) {
  const { token } = await params;
  const db = await getDb();
  const [account, settings] = await Promise.all([getAccountByAccessToken(db, token), getSettings(db)]);
  if (!account) {
    return (
      <div className="container-page max-w-xl pt-16 text-center">
        <h1 className="display text-3xl">Link abgelaufen</h1>
        <p className="mt-4 text-muted">Fordere einfach einen neuen Link zu deiner Stempelkarte an.</p>
        <Link href="/kundenclub" className="btn btn-primary mt-8">
          Neuen Link anfordern
        </Link>
      </div>
    );
  }
  const history = await getTransactions(db, account.id, 30);
  // The QR code only contains the opaque card code — no personal data.
  const qr = await QRCode.toString(account.cardCode, { type: "svg", margin: 1, color: { dark: "#05080D", light: "#FFFFFF" }, errorCorrectionLevel: "M" });

  return (
    <div className="container-page max-w-xl pt-10 md:pt-14">
      <p className="eyebrow">Kundenclub</p>
      <h1 className="display mt-3 text-3xl">Hallo {account.fullName.split(" ")[0]}!</h1>
      <div className="mt-8">
        <DigitalCard stamps={account.stamps} required={settings.loyaltyStampsRequired} name={account.fullName} cardCode={account.cardCode} />
      </div>
      {account.stamps >= settings.loyaltyStampsRequired && (
        <p className="mt-5 rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm">
          Deine Belohnung ist bereit! Sag beim nächsten Besuch einfach an der Theke Bescheid.
        </p>
      )}
      <section className="card mt-8 flex flex-col items-center p-6 text-center" aria-labelledby="qr">
        <h2 id="qr" className="font-bold">
          Zum Stempeln an der Theke vorzeigen
        </h2>
        <div className="mt-5 w-48 rounded-xl bg-white p-3" role="img" aria-label={`QR-Code der Karte ${account.cardCode}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="mt-3 font-mono text-sm tracking-widest text-muted">{account.cardCode}</p>
      </section>
      <section className="mt-8" aria-labelledby="hist">
        <h2 id="hist" className="display text-xl">
          Verlauf
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Noch keine Stempel – bis bald im Shop!</p>
        ) : (
          <ul className="card mt-4 divide-y divide-line">
            {history.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span>
                  <span className="font-semibold">{TYPE_LABEL[t.type]}</span>
                  <br />
                  <span className="text-xs text-muted">{formatInstant(t.createdAt)}</span>
                </span>
                <span className={t.delta > 0 ? "font-bold text-blue-soft" : "font-bold text-red"}>
                  {t.delta > 0 ? `+${t.delta}` : t.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
