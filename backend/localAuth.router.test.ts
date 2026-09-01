import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "./localAuth";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  countAdmins: vi.fn(),
  createLocalUser: vi.fn(),
  updateProfile: vi.fn(),
  updateLastSignedIn: vi.fn(),
  setFarmerAccountStatus: vi.fn(),
  deleteFarmerAccount: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getUserByEmail: mocks.getUserByEmail, countAdmins: mocks.countAdmins, createLocalUser: mocks.createLocalUser, updateProfile: mocks.updateProfile, updateLastSignedIn: mocks.updateLastSignedIn, setFarmerAccountStatus: mocks.setFarmerAccountStatus, deleteFarmerAccount: mocks.deleteFarmerAccount };
});

function response() {
  const cookies: Array<{ name: string; value: string }> = [];
  return { cookies, res: { cookie: (name: string, value: string) => cookies.push({ name, value }) } as TrpcContext["res"] };
}

const baseUser = {
  id: 901,
  openId: "local:farmer@example.com",
  name: "Farmer One",
  email: "farmer@example.com",
  loginMethod: "local-test",
  passwordHash: "private",
  role: "user" as const,
  accountStatus: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(res: TrpcContext["res"], user: TrpcContext["user"] = null): TrpcContext {
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res };
}

const adminUser = { ...baseUser, id: 999, openId: "local:admin@example.com", email: "admin@example.com", role: "admin" as const };

describe("local auth router", () => {
  beforeEach(() => vi.resetAllMocks());

  it("registers a farmer with crop context and returns no password hash", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(undefined);
    mocks.createLocalUser.mockResolvedValueOnce(baseUser);
    mocks.countAdmins.mockResolvedValueOnce(0);
    const { appRouter } = await import("./routers");
    const output = response();
    const result = await appRouter.createCaller(context(output.res)).auth.signup({ name: "Farmer One", email: "Farmer@Example.com", password: "CropTest01!", role: "user", primaryCrop: "Grapes", farmingExperienceYears: 12, state: "Maharashtra", district: "Nashik" });
    expect(result.user.email).toBe("farmer@example.com");
    expect("passwordHash" in result.user).toBe(false);
    expect(mocks.updateProfile).toHaveBeenCalledWith(901, expect.objectContaining({ primaryCrop: "Grapes", farmingExperienceYears: 12 }));
    expect(output.cookies[0]?.name).toBe("cropshield_local_session");
  });

  it("rejects duplicate local account registration", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(baseUser);
    const { appRouter } = await import("./routers");
    await expect(appRouter.createCaller(context(response().res)).auth.signup({ name: "Farmer One", email: "farmer@example.com", password: "CropTest01!", role: "user" })).rejects.toThrow("already exists");
    expect(mocks.createLocalUser).not.toHaveBeenCalled();
  });

  it("enforces one administrator through the signup router", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(undefined);
    mocks.countAdmins.mockResolvedValueOnce(1);
    const { appRouter } = await import("./routers");
    await expect(appRouter.createCaller(context(response().res)).auth.signup({ name: "Owner Admin", email: "abhidey0822@gmail.com", password: "CropTest01!", role: "admin" })).rejects.toThrow("only one account");
    expect(mocks.createLocalUser).not.toHaveBeenCalled();
  });

  it("rejects administrator signup for an email other than the configured owner", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(undefined);
    mocks.countAdmins.mockResolvedValueOnce(0);
    const { appRouter } = await import("./routers");
    await expect(appRouter.createCaller(context(response().res)).auth.signup({ name: "Other Admin", email: "other@example.com", password: "CropTest01!", role: "admin" })).rejects.toThrow("Administrator signup is reserved");
    expect(mocks.createLocalUser).not.toHaveBeenCalled();
  });

  it("signs in a stored local user and issues a local session", async () => {
    const passwordHash = await hashPassword("CropTest01!");
    mocks.getUserByEmail.mockResolvedValueOnce({ ...baseUser, passwordHash });
    const { appRouter } = await import("./routers");
    const output = response();
    const result = await appRouter.createCaller(context(output.res)).auth.signin({ email: "FARMER@example.com", password: "CropTest01!" });
    expect(result.user.role).toBe("user");
    expect(output.cookies[0]?.name).toBe("cropshield_local_session");
    expect(mocks.updateLastSignedIn).toHaveBeenCalledWith(901);
  });

  it("rejects sign-in for a disabled farmer", async () => {
    const passwordHash = await hashPassword("CropTest01!");
    mocks.getUserByEmail.mockResolvedValueOnce({ ...baseUser, passwordHash, accountStatus: "disabled" });
    const { appRouter } = await import("./routers");
    await expect(appRouter.createCaller(context(response().res)).auth.signin({ email: "farmer@example.com", password: "CropTest01!" })).rejects.toThrow("account is disabled");
    expect(mocks.updateLastSignedIn).not.toHaveBeenCalled();
  });

  it("allows an administrator to disable and re-enable a farmer", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context(response().res, adminUser));
    await caller.admin.setFarmerStatus({ id: 901, accountStatus: "disabled" });
    await caller.admin.setFarmerStatus({ id: 901, accountStatus: "active" });
    expect(mocks.setFarmerAccountStatus).toHaveBeenNthCalledWith(1, 901, "disabled");
    expect(mocks.setFarmerAccountStatus).toHaveBeenNthCalledWith(2, 901, "active");
  });

  it("allows an administrator to delete a farmer through the protected mutation", async () => {
    const { appRouter } = await import("./routers");
    await appRouter.createCaller(context(response().res, adminUser)).admin.deleteFarmer({ id: 901 });
    expect(mocks.deleteFarmerAccount).toHaveBeenCalledWith(901);
  });

  it("rejects farmer access to account-management mutations", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context(response().res, baseUser));
    await expect(caller.admin.setFarmerStatus({ id: 901, accountStatus: "disabled" })).rejects.toThrow("Administrator access required");
    await expect(caller.admin.deleteFarmer({ id: 901 })).rejects.toThrow("Administrator access required");
    expect(mocks.setFarmerAccountStatus).not.toHaveBeenCalled();
    expect(mocks.deleteFarmerAccount).not.toHaveBeenCalled();
  });
});
