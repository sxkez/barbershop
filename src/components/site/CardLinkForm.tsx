"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

export function CardLinkForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-6 space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
          setError("Bitte gib eine gültige E-Mail-Adresse an.");
          return;
        }
        setError(null);
        setState("busy");
        const res = await fetch("/api/kundenclub/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, website }),
        });
        if (res.ok) setState("sent");
        else {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? "Das hat nicht geklappt.");
          setState("error");
        }
      }}
    >
      <div>
        <label htmlFor="club-email" className="label">
          E-Mail-Adresse
        </label>
        <input
          id="club-email"
          type="email"
          autoComplete="email"
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "club-email-err" : undefined}
        />
        {error && (
          <p id="club-email-err" className="mt-1.5 text-sm text-red">
            {error}
          </p>
        )}
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Mail className="size-5" aria-hidden />}
        Link senden
      </button>
      {state === "sent" && (
        <p role="status" className="rounded-xl border border-blue/40 bg-blue/10 p-4 text-sm">
          Wenn zu dieser Adresse eine Stempelkarte existiert, haben wir dir gerade einen Link geschickt. Schau auch im Spam-Ordner nach.
        </p>
      )}
    </form>
  );
}
