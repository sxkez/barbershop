import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth, lockConfig } from "@/lib/site-lock";

export function proxy(request: NextRequest) {
  const cfg = lockConfig({ SITE_LOCK_PASSWORD: process.env.SITE_LOCK_PASSWORD, SITE_LOCK_USER: process.env.SITE_LOCK_USER });
  if (!cfg) return NextResponse.next();

  if (!checkBasicAuth(request.headers.get("authorization"), cfg)) {
    return new NextResponse("Diese Website ist noch nicht öffentlich.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="HANI BARBERSHOP Vorschau", charset="UTF-8"',
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Everything except framework JS/CSS bundles (they contain no content).
  matcher: ["/((?!_next/static).*)"],
};
