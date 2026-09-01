import { describe, expect, it } from "vitest";
import { appRouter, fetchOpenMeteoWeather } from "./routers";
import { buildAdminFarmerInsights, summarizeApprovedLocations } from "./db";
import type { TrpcContext } from "./_core/context";

function context(role: "user" | "admin"): TrpcContext {
  const now = new Date();
  return {
    user: { id: role === "admin" ? 2 : 1, openId: `${role}-test`, email: `${role}@example.com`, name: role, loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("CropShield authorization boundaries", () => {
  it("rejects administrator overview access for a farmer", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.overview()).rejects.toThrow("Administrator access required");
  });

  it("allows administrator overview access for an administrator", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.overview()).resolves.toMatchObject({ totals: { farmers: expect.any(Number), scans: expect.any(Number), highRisk: expect.any(Number), openCases: expect.any(Number) } });
  });

  it("allows administrators to read farmer registration insights and blocks farmers from the same route", async () => {
    await expect(appRouter.createCaller(context("admin")).admin.farmerInsights()).resolves.toEqual(expect.any(Array));
    await expect(appRouter.createCaller(context("user")).admin.farmerInsights()).rejects.toThrow("Administrator access required");
  });

  it("rejects malformed scan inputs before storage or model calls", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.farmer.analyzeScan({ imageBase64: "too-short", mimeType: "text/plain", fileName: "bad.txt" })).rejects.toThrow();
  });

  it("rejects invalid case references before persistence", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.cases.create({ scanId: 0, reference: "x" })).rejects.toThrow();
  });

  it("exposes farmer snapshot only through the authenticated context", async () => {
    const caller = appRouter.createCaller(context("user"));
    const result = await caller.farmer.snapshot();
    expect(result).toHaveProperty("crops");
    expect(result).toHaveProperty("scans");
    expect(result).toHaveProperty("cases");
  });
});


describe("AgriGuard service boundaries", () => {
  it("rejects expert and store administration from a farmer context", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.experts()).rejects.toThrow("Administrator access required");
    await expect(caller.admin.drugStores()).rejects.toThrow("Administrator access required");
  });

  it("allows a farmer to read only the verified service directories", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.farmer.verifiedExperts()).resolves.toEqual(expect.any(Array));
    await expect(caller.farmer.approvedDrugStores()).resolves.toEqual(expect.any(Array));
  });

  it("rejects impossible weather coordinates before making a remote request", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.weather.current({ latitude: 95, longitude: 300 })).rejects.toThrow();
  });
});


describe("AgriGuard input contracts", () => {
  it("rejects incomplete expert and store registrations", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.createExpert({ name: "x" })).rejects.toThrow();
    await expect(caller.admin.createDrugStore({ name: "x", address: "x" })).rejects.toThrow();
  });

  it("rejects malformed manual location profile values", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.farmer.updateProfile({ displayName: "A", pinCode: "123456789012345" })).rejects.toThrow();
  });

  it("handles successful and unavailable weather responses", async () => {
    const ok = await fetchOpenMeteoWeather(19.99, 73.78, (async () => new Response(JSON.stringify({ current: { temperature_2m: 24 } }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch);
    expect(ok.current.temperature_2m).toBe(24);
    await expect(fetchOpenMeteoWeather(19.99, 73.78, (async () => new Response("", { status: 503 })) as typeof fetch)).rejects.toThrow("Weather service unavailable");
  });

  it("includes a newly registered farmer name and saved location in admin insights", () => {
    const insights = buildAdminFarmerInsights([{ user: { id: 33, name: "New Farmer", role: "user" }, profile: { displayName: "New Farmer", state: "Maharashtra", district: "Nashik", region: "North" } }] as any, [], [] as any);
    expect(insights[0]).toMatchObject({ user: { name: "New Farmer" }, profile: { state: "Maharashtra", district: "Nashik" }, riskLevel: "unknown" });
  });

  it("limits grouped affected crops to approved scan-linked records", () => {
    const rows = [{ user: { id: 1 }, profile: { state: "Maharashtra", district: "Nashik", region: "North" } }];
    const crops = [{ id: 10, ownerId: 1, name: "Grapes" }, { id: 11, ownerId: 1, name: "Wheat" }];
    const scans = [{ ownerId: 1, cropId: 10, status: "complete", approvedAt: new Date(), riskLevel: "high", disease: "Downy mildew" }, { ownerId: 1, cropId: 11, status: "complete", approvedAt: null, riskLevel: "critical", disease: "Unapproved disease" }];
    const [summary] = summarizeApprovedLocations(rows as any, scans as any, crops as any);
    expect(summary?.crops).toEqual(["Grapes"]);
    expect(summary?.diseases).toEqual(["Downy mildew"]);
    expect(summary?.highRisk).toBe(1);
  });
});
