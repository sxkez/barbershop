import { TriangleAlert } from "lucide-react";

/** Visible until the owner replaces the placeholder legal text (see docs/OWNER_HANDOVER.md). */
export function LegalDraftNotice() {
  if (process.env.LEGAL_TEXTS_REVIEWED === "true") return null;
  return (
    <p className="mt-6 flex gap-3 rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm leading-relaxed">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
      Entwurf: Dieser Text ist ein Platzhalter und muss vor dem Livegang vom Inhaber bzw. einer fachkundigen Stelle geprüft und vervollständigt werden.
    </p>
  );
}
