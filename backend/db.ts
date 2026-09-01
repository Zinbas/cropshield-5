import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { cases, crops, drugStores, experts, profiles, scans, users, type InsertUser } from "../database/schema";
import { ENV } from "./_core/env";
import { toSafeUser } from "./localAuth";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function countAdmins() {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "admin"), eq(users.loginMethod, "local-test")));
  return Number(result[0]?.count ?? 0);
}

export async function createLocalUser(data: { name: string; email: string; passwordHash: string; role: "user" | "admin" }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const openId = `local:${data.email}`;
  const result = await db.insert(users).values({ openId, name: data.name, email: data.email, passwordHash: data.passwordHash, role: data.role, loginMethod: "local-test", lastSignedIn: new Date() });
  const id = Number(result[0].insertId);
  const created = await getUserByOpenId(openId);
  if (!created) throw new Error(`Local user ${id} could not be loaded after creation`);
  return created;
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function updateProfile(userId: number, data: { displayName: string; region?: string; phone?: string; state?: string; district?: string; pinCode?: string; village?: string; primaryCrop?: string; farmingExperienceYears?: number; latitude?: number; longitude?: number }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const values = { userId, displayName: data.displayName, region: data.region, phone: data.phone, state: data.state, district: data.district, pinCode: data.pinCode, village: data.village, primaryCrop: data.primaryCrop, farmingExperienceYears: data.farmingExperienceYears, latitude: data.latitude?.toString(), longitude: data.longitude?.toString() };
  await db.insert(profiles).values(values).onDuplicateKeyUpdate({ set: { displayName: data.displayName, region: data.region ?? null, phone: data.phone ?? null, state: data.state ?? null, district: data.district ?? null, pinCode: data.pinCode ?? null, village: data.village ?? null, primaryCrop: data.primaryCrop ?? null, farmingExperienceYears: data.farmingExperienceYears ?? null, latitude: data.latitude?.toString() ?? null, longitude: data.longitude?.toString() ?? null } });
}

export async function getFarmerSnapshot(ownerId: number) {
  const db = await getDb(); if (!db) return { profile: undefined, crops: [], scans: [], cases: [] };
  const [profile, farmerCrops, farmerScans, farmerCases] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, ownerId)).limit(1),
    db.select().from(crops).where(eq(crops.ownerId, ownerId)).orderBy(desc(crops.updatedAt)),
    db.select().from(scans).where(eq(scans.ownerId, ownerId)).orderBy(desc(scans.createdAt)).limit(50),
    db.select().from(cases).where(eq(cases.ownerId, ownerId)).orderBy(desc(cases.createdAt)).limit(50),
  ]);
  return { profile: profile[0], crops: farmerCrops, scans: farmerScans, cases: farmerCases };
}

export async function insertScan(data: typeof scans.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const result = await db.insert(scans).values(data);
  return Number(result[0].insertId);
}

export async function updateScan(id: number, ownerId: number, data: Partial<typeof scans.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(scans).set(data).where(and(eq(scans.id, id), eq(scans.ownerId, ownerId)));
}

export async function createCase(data: typeof cases.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(cases).values(data);
}

export async function createCrop(data: { ownerId: number; name: string; cropType: string; region?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(crops).values({ ownerId: data.ownerId, name: data.name, cropType: data.cropType, region: data.region, status: "healthy" });
}

export async function getOwnerCrops(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(crops).where(eq(crops.ownerId, ownerId)).orderBy(desc(crops.updatedAt));
}

export async function getOwnerScans(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(scans).where(eq(scans.ownerId, ownerId)).orderBy(desc(scans.createdAt));
}

export async function getOwnerCases(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(cases).where(eq(cases.ownerId, ownerId)).orderBy(desc(cases.createdAt));
}

export async function getAdminOverview() {
  const db = await getDb(); if (!db) return { totals: { farmers: 0, scans: 0, highRisk: 0, openCases: 0, avgConfidence: 0 }, distribution: { healthy: 0, monitoring: 0, critical: 0 }, recentScans: [], regions: [] };
  const [farmerCount, scanCount, highRiskCount, openCaseCount, healthyCount, monitoringCount, criticalCount, avgConfidence, recentScans, regions] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "user")),
    db.select({ count: sql<number>`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql<number>`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), or(eq(scans.riskLevel, "high"), eq(scans.riskLevel, "critical")), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql<number>`count(*)` }).from(cases).where(sql`${cases.status} <> 'resolved'`),
    db.select({ count: sql<number>`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), eq(scans.riskLevel, "low"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql<number>`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), eq(scans.riskLevel, "medium"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql<number>`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), eq(scans.riskLevel, "high"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ average: sql<number>`avg(${scans.confidence})` }).from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select().from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)).orderBy(desc(scans.createdAt)).limit(20),
    db.select({ region: crops.region, count: sql<number>`count(*)` }).from(crops).groupBy(crops.region).orderBy(desc(sql`count(*)`)).limit(10),
  ]);
  return { totals: { farmers: Number(farmerCount[0]?.count ?? 0), scans: Number(scanCount[0]?.count ?? 0), highRisk: Number(highRiskCount[0]?.count ?? 0), openCases: Number(openCaseCount[0]?.count ?? 0), avgConfidence: Number(avgConfidence[0]?.average ?? 0) }, distribution: { healthy: Number(healthyCount[0]?.count ?? 0), monitoring: Number(monitoringCount[0]?.count ?? 0), critical: Number(criticalCount[0]?.count ?? 0) }, recentScans, regions };
}

export async function getApprovedCases() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(cases).orderBy(desc(cases.createdAt)).limit(100);
}

export async function getApprovedDirectory() {
  const db = await getDb(); if (!db) return [];
  return db.select({ user: users, profile: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.role, "user")).orderBy(desc(users.createdAt));
}

type AdminLocationFarmer = { user: typeof users.$inferSelect; profile: typeof profiles.$inferSelect | null };
type AdminLocationScan = typeof scans.$inferSelect;
type AdminLocationCrop = typeof crops.$inferSelect;

export function summarizeApprovedLocations(farmerRows: AdminLocationFarmer[], approvedScans: AdminLocationScan[], farmerCrops: AdminLocationCrop[]) {
  const eligibleScans = approvedScans.filter((scan) => scan.status === "complete" && Boolean(scan.approvedAt));
  const groups = new Map<string, { location: string; state?: string | null; district?: string | null; farmers: number; scans: number; highRisk: number; crops: Set<string>; diseases: Set<string>; latitude?: string | null; longitude?: string | null }>();
  for (const { user, profile } of farmerRows) {
    const location = [profile?.state, profile?.district, profile?.region].filter(Boolean).join(" · ") || "Location not provided";
    const group = groups.get(location) ?? { location, state: profile?.state, district: profile?.district, farmers: 0, scans: 0, highRisk: 0, crops: new Set<string>(), diseases: new Set<string>(), latitude: profile?.latitude, longitude: profile?.longitude };
    group.farmers += 1;
    eligibleScans.filter((scan) => scan.ownerId === user.id).forEach((scan) => { group.scans += 1; if (scan.riskLevel === "high" || scan.riskLevel === "critical") group.highRisk += 1; if (scan.cropId) { const crop = farmerCrops.find((candidate) => candidate.id === scan.cropId && candidate.ownerId === user.id); if (crop) group.crops.add(crop.name); } if (scan.disease) group.diseases.add(scan.disease); });
    groups.set(location, group);
  }
  return Array.from(groups.values()).map((group) => ({ ...group, crops: Array.from(group.crops), diseases: Array.from(group.diseases) })).sort((a, b) => b.highRisk - a.highRisk || b.farmers - a.farmers);
}

export async function getAdminLocationSummaries() {
  const db = await getDb(); if (!db) return [];
  const [farmerRows, approvedScans, farmerCrops] = await Promise.all([
    db.select({ user: users, profile: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.role, "user")),
    db.select().from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)).orderBy(desc(scans.createdAt)),
    db.select().from(crops),
  ]);
  return summarizeApprovedLocations(farmerRows, approvedScans, farmerCrops);
}

export function buildAdminFarmerInsights(farmerRows: AdminLocationFarmer[], approvedScans: AdminLocationScan[], farmerCrops: AdminLocationCrop[]) {
  return farmerRows.map(({ user, profile }) => {
    const ownScans = approvedScans.filter((scan) => scan.ownerId === user.id);
    const latest = ownScans[0];
    const ownCrops = farmerCrops.filter((crop) => crop.ownerId === user.id);
    const risk = ownScans.some((scan) => scan.riskLevel === "critical") ? "critical" : ownScans.some((scan) => scan.riskLevel === "high") ? "high" : ownScans.some((scan) => scan.riskLevel === "medium") ? "medium" : ownScans.length ? "low" : "unknown";
    return { user, profile, crops: ownCrops, latestScan: latest, riskLevel: risk };
  });
}

export async function getAdminFarmerInsights() {
  const db = await getDb(); if (!db) return [];
  const [farmerRows, approvedScans, farmerCrops] = await Promise.all([
    db.select({ user: users, profile: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.role, "user")),
    db.select().from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)).orderBy(desc(scans.createdAt)),
    db.select().from(crops),
  ]);
  return buildAdminFarmerInsights(farmerRows, approvedScans, farmerCrops).map((entry) => ({ ...entry, user: toSafeUser(entry.user) }));
}

export function canManageFarmerAccount(targetRole: "user" | "admin") {
  return targetRole === "user";
}

export async function setFarmerAccountStatus(userId: number, accountStatus: "active" | "disabled") {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const result = await db.update(users).set({ accountStatus }).where(and(eq(users.id, userId), eq(users.role, "user")));
  if (!result[0]?.affectedRows) throw new Error("Farmer account not found");
}

export async function deleteFarmerAccount(userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const farmer = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!farmer[0]) throw new Error("Farmer account not found");
  if (!canManageFarmerAccount(farmer[0].role)) throw new Error("The administrator account cannot be deleted here");
  await db.transaction(async (tx) => {
    await tx.delete(cases).where(eq(cases.ownerId, userId));
    await tx.delete(scans).where(eq(scans.ownerId, userId));
    await tx.delete(crops).where(eq(crops.ownerId, userId));
    await tx.delete(profiles).where(eq(profiles.userId, userId));
    await tx.delete(users).where(and(eq(users.id, userId), eq(users.role, "user")));
  });
}

export function rankExpertsByLocation<T extends { name: string; state?: string | null; district?: string | null }>(rows: T[], location?: { state?: string; district?: string }) {
  const state = location?.state?.trim().toLowerCase();
  const district = location?.district?.trim().toLowerCase();
  const score = (expert: T) => {
    const expertState = expert.state?.trim().toLowerCase();
    const expertDistrict = expert.district?.trim().toLowerCase();
    return (district && expertDistrict === district ? 3 : 0) + (state && expertState === state ? 2 : 0);
  };
  return [...rows].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

export async function getVerifiedExperts(location?: { state?: string; district?: string }) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select().from(experts).where(eq(experts.status, "verified")).orderBy(desc(experts.updatedAt));
  return rankExpertsByLocation(rows, location);
}

export async function getApprovedDrugStores() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(drugStores).where(eq(drugStores.status, "approved")).orderBy(desc(drugStores.updatedAt));
}

export async function getAdminExperts() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(experts).orderBy(desc(experts.createdAt));
}

export async function getAdminDrugStores() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(drugStores).orderBy(desc(drugStores.createdAt));
}

export async function createExpert(data: typeof experts.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(experts).values(data);
}

export async function setExpertStatus(id: number, status: "pending" | "verified" | "rejected" | "suspended") {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(experts).set({ status }).where(eq(experts.id, id));
}

export async function createDrugStore(data: typeof drugStores.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(drugStores).values(data);
}

export async function setDrugStoreStatus(id: number, status: "pending" | "approved" | "rejected" | "suspended") {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(drugStores).set({ status }).where(eq(drugStores.id, id));
}
