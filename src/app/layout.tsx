import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Montserrat({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display", display: "swap" });

const siteUrl = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HANI BARBERSHOP – Dein Barbershop in Landau an der Isar",
    template: "%s | HANI BARBERSHOP Landau a.d. Isar",
  },
  description:
    "HANI BARBERSHOP in Landau an der Isar: Haarschnitt, Bart und Styling. Mittwoch bis Samstag ohne Termin, ab Januar 2027 Montag & Dienstag mit Online-Termin.",
  applicationName: "HANI BARBERSHOP",
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "HANI BARBERSHOP",
    images: [{ url: "/images/og/hani-og.jpg", width: 1200, height: 630, alt: "HANI BARBERSHOP Landau an der Isar" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#05080D",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
