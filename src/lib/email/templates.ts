import type { BookingView } from "@/lib/booking/service";
import type { BusinessSettings } from "@/lib/settings";
import { fullAddress } from "@/lib/settings";
import { formatDateLong } from "@/lib/time";
import { formatPrice } from "@/lib/format";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, bodyHtml: string, s: BusinessSettings) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(title)}</title></head>
<body style="margin:0;background:#05080D;font-family:Arial,Helvetica,sans-serif;color:#F5F7FA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05080D;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#101722;border:1px solid #1E2A3A;border-radius:16px">
<tr><td style="padding:28px 28px 8px">
  <div style="font-size:12px;letter-spacing:4px;color:#9AA5B5">HANI BARBERSHOP</div>
  <div style="height:3px;width:120px;margin-top:10px;background:linear-gradient(90deg,#087BFF 50%,#D83A43 50%)"></div>
  <h1 style="font-size:24px;line-height:1.25;margin:20px 0 0;color:#F5F7FA">${esc(title)}</h1>
</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;color:#D8DEE8">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #1E2A3A;font-size:12px;line-height:1.6;color:#9AA5B5">
  ${esc(s.name)} · ${esc(fullAddress(s))} · ${esc(s.phone)}
</td></tr></table></td></tr></table></body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#9AA5B5;width:120px;vertical-align:top">${esc(label)}</td><td style="padding:6px 0;color:#F5F7FA;font-weight:bold">${esc(value)}</td></tr>`;
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#087BFF;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${esc(label)}</a>`;
}

function bookingTable(b: BookingView, s: BusinessSettings) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0">
${row("Buchungsnr.", b.reference)}
${row("Leistung", b.serviceName)}
${row("Datum", formatDateLong(b.localDate))}
${row("Uhrzeit", `${b.localTime} Uhr`)}
${row("Dauer", `${b.durationMinutes} Minuten`)}
${b.priceCents != null ? row("Preis", formatPrice(b.priceCents)) : ""}
${row("Ort", fullAddress(s))}
</table>`;
}

function bookingText(b: BookingView, s: BusinessSettings) {
  return [
    `Buchungsnr.: ${b.reference}`,
    `Leistung: ${b.serviceName}`,
    `Datum: ${formatDateLong(b.localDate)}`,
    `Uhrzeit: ${b.localTime} Uhr`,
    `Dauer: ${b.durationMinutes} Minuten`,
    b.priceCents != null ? `Preis: ${formatPrice(b.priceCents)}` : null,
    `Ort: ${fullAddress(s)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function policyText(s: BusinessSettings) {
  const hours = Math.round(s.cancellationNoticeMinutes / 60);
  return `Du kannst deinen Termin bis ${hours} Stunden vorher online stornieren oder verschieben. Danach ruf uns bitte an: ${s.phone}.`;
}

export function bookingConfirmationEmail(b: BookingView, s: BusinessSettings, manageUrl: string | null) {
  const subject = `Terminbestätigung ${b.reference} – ${formatDateLong(b.localDate)}, ${b.localTime} Uhr`;
  const html = layout(
    "Dein Termin ist bestätigt",
    `<p>Hallo ${esc(b.contactName)},</p><p>vielen Dank für deine Buchung. Wir freuen uns auf dich!</p>
${bookingTable(b, s)}
${manageUrl ? `<p style="margin:20px 0">${button(manageUrl, "Termin verwalten")}</p>` : ""}
<p style="color:#9AA5B5;font-size:13px">${esc(policyText(s))}</p>`,
    s,
  );
  const text = `Hallo ${b.contactName},\n\ndein Termin ist bestätigt.\n\n${bookingText(b, s)}\n\n${
    manageUrl ? `Termin verwalten: ${manageUrl}\n\n` : ""
  }${policyText(s)}\n\n${s.name}`;
  return { subject, html, text };
}

export function bookingCancelledEmail(b: BookingView, s: BusinessSettings) {
  const subject = `Termin storniert – ${b.reference}`;
  const html = layout(
    "Dein Termin wurde storniert",
    `<p>Hallo ${esc(b.contactName)},</p><p>der folgende Termin wurde storniert:</p>${bookingTable(b, s)}
<p>Du möchtest einen neuen Termin? Buche einfach online oder komm Mittwoch bis Samstag ohne Termin vorbei.</p>`,
    s,
  );
  return { subject, html, text: `Hallo ${b.contactName},\n\nder folgende Termin wurde storniert:\n\n${bookingText(b, s)}\n\n${s.name}` };
}

export function bookingRescheduledEmail(b: BookingView, s: BusinessSettings, manageUrl: string | null) {
  const subject = `Termin verschoben – ${formatDateLong(b.localDate)}, ${b.localTime} Uhr`;
  const html = layout(
    "Dein Termin wurde verschoben",
    `<p>Hallo ${esc(b.contactName)},</p><p>hier ist dein neuer Termin:</p>${bookingTable(b, s)}
${manageUrl ? `<p style="margin:20px 0">${button(manageUrl, "Termin verwalten")}</p>` : ""}`,
    s,
  );
  return { subject, html, text: `Hallo ${b.contactName},\n\ndein neuer Termin:\n\n${bookingText(b, s)}\n\n${manageUrl ?? ""}\n\n${s.name}` };
}

export function loyaltyLinkEmail(name: string, url: string, s: BusinessSettings) {
  const subject = "Deine digitale HANI Stempelkarte";
  const html = layout(
    "Deine Stempelkarte",
    `<p>Hallo ${esc(name)},</p><p>hier ist der Link zu deiner digitalen Stempelkarte. Er ist 7 Tage gültig.</p>
<p style="margin:20px 0">${button(url, "Stempelkarte öffnen")}</p>
<p style="color:#9AA5B5;font-size:13px">Du hast diesen Link nicht angefordert? Dann kannst du diese E-Mail ignorieren.</p>`,
    s,
  );
  return { subject, html, text: `Hallo ${name},\n\ndeine digitale Stempelkarte (7 Tage gültig):\n${url}\n\n${s.name}` };
}

/** iCalendar file for "add to calendar". */
export function bookingIcs(b: BookingView, s: BusinessSettings) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escIcs = (t: string) => t.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HANI BARBERSHOP//Termin//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@hani-barbershop`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(b.startsAt)}`,
    `DTEND:${fmt(b.endsAt)}`,
    `SUMMARY:${escIcs(`${s.name}: ${b.serviceName}`)}`,
    `LOCATION:${escIcs(fullAddress(s))}`,
    `DESCRIPTION:${escIcs(`Buchungsnr. ${b.reference}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
