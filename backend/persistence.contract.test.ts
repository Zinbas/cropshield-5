import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  insertScan: vi.fn().mockResolvedValue(42),
  updateScan: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  createExpert: vi.fn().mockResolvedValue({ id: 7, status: "pending" }),
  setExpertStatus: vi.fn().mockResolvedValue(undefined),
  createDrugStore: vi.fn().mockResolvedValue({ id: 8, status: "pending" }),
  setDrugStoreStatus: vi.fn().mockResolvedValue(undefined),
  storagePut: vi.fn().mockResolvedValue({ key: "farmer-1/scans/test.jpg", url: "https://storage.test/test.jpg" }),
  invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ cropType: "Grapes", riskLevel: "high", confidence: 88, symptoms: ["Spots"], assessment: "Visible leaf damage", disease: "Downy mildew", recommendations: ["Consult an expert"] }) } }] }),
  notifyOwner: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, insertScan: mocks.insertScan, updateScan: mocks.updateScan, updateProfile: mocks.updateProfile, createExpert: mocks.createExpert, setExpertStatus: mocks.setExpertStatus, createDrugStore: mocks.createDrugStore, setDrugStoreStatus: mocks.setDrugStoreStatus };
});
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));

function context(role: "user" | "admin"): TrpcContext {
  const now = new Date();
  return { user: { id: role === "admin" ? 2 : 1, openId: `${role}-persistence`, email: `${role}@example.com`, name: role, loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("CropShield persistence workflows", () => {
  it("persists a scan with the selected crop link and structured diagnosis", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context("user"));
    const result = await caller.farmer.analyzeScan({ imageBase64: `data:image/jpeg;base64,${"a".repeat(40)}`, mimeType: "image/jpeg", fileName: "leaf.jpg", cropId: 10 });
    expect(mocks.insertScan).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 1, cropId: 10, status: "analyzing" }));
    expect(mocks.updateScan).toHaveBeenCalledWith(42, 1, expect.objectContaining({ status: "complete", disease: "Downy mildew", riskLevel: "high" }));
    expect(result.disease).toBe("Downy mildew");
  });

  it("persists GPS/manual profile fields through the protected mutation", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context("user"));
    await caller.farmer.updateProfile({ displayName: "Test Farmer", state: "Maharashtra", district: "Nashik", pinCode: "422001", village: "Demo", primaryCrop: "Grapes", farmingExperienceYears: 12, latitude: 19.99, longitude: 73.78 });
    expect(mocks.updateProfile).toHaveBeenCalledWith(1, expect.objectContaining({ state: "Maharashtra", pinCode: "422001", primaryCrop: "Grapes", farmingExperienceYears: 12, latitude: 19.99, longitude: 73.78 }));
  });

  it("persists expert and store registrations and moderation status changes", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context("admin"));
    await caller.admin.createExpert({ name: "Agronomy Expert", specialization: "Vines", organization: "Agri Lab" });
    await caller.admin.setExpertStatus({ id: 7, status: "verified" });
    await caller.admin.createDrugStore({ name: "Farm Supply", address: "Main Road, Nashik" });
    await caller.admin.setDrugStoreStatus({ id: 8, status: "approved" });
    expect(mocks.createExpert).toHaveBeenCalledWith(expect.objectContaining({ name: "Agronomy Expert" }));
    expect(mocks.setExpertStatus).toHaveBeenCalledWith(7, "verified");
    expect(mocks.createDrugStore).toHaveBeenCalledWith(expect.objectContaining({ name: "Farm Supply" }));
    expect(mocks.setDrugStoreStatus).toHaveBeenCalledWith(8, "approved");
  });
});
