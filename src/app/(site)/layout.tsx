import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileCta } from "@/components/site/MobileCta";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LocalBusinessJsonLd } from "@/components/site/JsonLd";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings(await getDb());
  return (
    <>
      <Header phone={settings.phone} />
      <main id="main" className="pb-20 sm:pb-0">
        {children}
      </main>
      <Footer settings={settings} />
      <MobileCta phone={settings.phone} />
      <LocalBusinessJsonLd settings={settings} />
    </>
  );
}
