import type { BusinessSettings } from "@/lib/settings";

const siteUrl = () => (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** schema.org HairSalon (no ratings/reviews are claimed). */
export function LocalBusinessJsonLd({ settings }: { settings: BusinessSettings }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: settings.name,
    url: siteUrl(),
    telephone: settings.phone,
    image: `${siteUrl()}/images/og/hani-og.jpg`,
    logo: `${siteUrl()}/images/brand/hani-logo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.street,
      postalCode: settings.postalCode,
      addressLocality: settings.city,
      addressCountry: "DE",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:00",
        closes: "19:00",
      },
    ],
    areaServed: "Landau an der Isar",
    sameAs: settings.socialLinks.map((s) => s.url).filter(Boolean),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
