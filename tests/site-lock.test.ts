import { describe, expect, it } from "vitest";
import { checkBasicAuth, lockConfig } from "@/lib/site-lock";

const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;

describe("pre-launch site lock", () => {
  it("is off when no password is set", () => {
    expect(lockConfig({})).toBeNull();
    expect(lockConfig({ SITE_LOCK_PASSWORD: "  " })).toBeNull();
    expect(checkBasicAuth(null, null)).toBe(true);
  });

  const cfg = lockConfig({ SITE_LOCK_PASSWORD: "Geheim:123" })!;

  it("uses 'hani' as default username", () => {
    expect(cfg.user).toBe("hani");
  });

  it("accepts the right credentials (password may contain ':')", () => {
    expect(checkBasicAuth(basic("hani", "Geheim:123"), cfg)).toBe(true);
  });

  it("rejects missing, wrong or malformed credentials", () => {
    expect(checkBasicAuth(null, cfg)).toBe(false);
    expect(checkBasicAuth(basic("hani", "falsch"), cfg)).toBe(false);
    expect(checkBasicAuth(basic("admin", "Geheim:123"), cfg)).toBe(false);
    expect(checkBasicAuth(basic("hani", "Geheim:12"), cfg)).toBe(false);
    expect(checkBasicAuth("Bearer xyz", cfg)).toBe(false);
    expect(checkBasicAuth("Basic !!!", cfg)).toBe(false);
  });
});
