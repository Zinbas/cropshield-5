import { describe, expect, it } from "vitest";
import { canCreateLocalAdmin, createLocalSession, getLocalSessionOpenId, hashPassword, LOCAL_ADMIN_EMAIL, normalizeLocalEmail, toSafeUser, verifyPassword } from "./localAuth";

describe("local test authentication", () => {
  it("hashes passwords without exposing the original value and verifies them", async () => {
    const password = "test-password-123";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("normalizes emails and allows open administrator testing", () => {
    expect(normalizeLocalEmail("  ABHIDEY0822@GMAIL.COM ")).toBe(LOCAL_ADMIN_EMAIL);
    expect(canCreateLocalAdmin(LOCAL_ADMIN_EMAIL, 0)).toBe(true);
    expect(canCreateLocalAdmin("other@example.com", 0)).toBe(true);
    expect(canCreateLocalAdmin(LOCAL_ADMIN_EMAIL, 1)).toBe(true);
  });

  it("never includes a password hash in the safe user projection", () => {
    const safe = toSafeUser({ id: 1, openId: "local:test@example.com", name: "Test", email: "test@example.com", loginMethod: "local-test", passwordHash: "private", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
    expect(safe.email).toBe("test@example.com");
    expect("passwordHash" in safe).toBe(false);
  });

  it("creates a verifiable local session token", async () => {
    const token = await createLocalSession("local:farmer@example.com");
    expect(await getLocalSessionOpenId(token)).toBe("local:farmer@example.com");
    expect(await getLocalSessionOpenId("not-a-valid-token")).toBeNull();
  });
});
