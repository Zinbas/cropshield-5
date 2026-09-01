// server/_core/app.ts
import "dotenv/config";
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountStatus: mysqlEnum("accountStatus", ["active", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  region: varchar("region", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  notificationPreference: mysqlEnum("notificationPreference", ["all", "high_risk", "none"]).default("high_risk").notNull(),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pinCode: varchar("pinCode", { length: 12 }),
  village: varchar("village", { length: 160 }),
  primaryCrop: varchar("primaryCrop", { length: 120 }),
  farmingExperienceYears: int("farmingExperienceYears"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  networkMode: mysqlEnum("networkMode", ["good", "poor", "offline"]).default("good").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var crops = mysqlTable("crops", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  cropType: varchar("cropType", { length: 80 }).notNull(),
  region: varchar("region", { length: 160 }),
  acreage: decimal("acreage", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["healthy", "monitoring", "at_risk"]).default("healthy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var scans = mysqlTable("scans", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  cropId: int("cropId"),
  imageKey: varchar("imageKey", { length: 500 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1e3 }).notNull(),
  status: mysqlEnum("status", ["queued", "analyzing", "complete", "failed"]).default("queued").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical", "unknown"]).default("unknown").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  disease: varchar("disease", { length: 180 }),
  symptoms: text("symptoms"),
  assessment: text("assessment"),
  recommendations: text("recommendations"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  scanId: int("scanId").notNull().unique(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  status: mysqlEnum("status", ["open", "reviewing", "resolved"]).default("open").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var experts = mysqlTable("experts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 1e3 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  qualification: varchar("qualification", { length: 240 }),
  specialization: varchar("specialization", { length: 240 }),
  organization: varchar("organization", { length: 240 }),
  experienceYears: int("experienceYears"),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pinCode: varchar("pinCode", { length: 12 }),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  availability: varchar("availability", { length: 160 }),
  status: mysqlEnum("status", ["pending", "verified", "rejected", "suspended"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var drugStores = mysqlTable("drugStores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  ownerContact: varchar("ownerContact", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address").notNull(),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pinCode: varchar("pinCode", { length: 12 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  licenseInfo: text("licenseInfo"),
  supportingDocumentUrl: varchar("supportingDocumentUrl", { length: 1e3 }),
  categories: text("categories"),
  openingHours: varchar("openingHours", { length: 160 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "suspended"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var weatherCache = mysqlTable("weatherCache", {
  id: int("id").autoincrement().primaryKey(),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  payload: text("payload").notNull(),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production"
};

// server/localAuth.ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { jwtVerify, SignJWT } from "jose";
function toSafeUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
var scrypt = promisify(scryptCallback);
var LOCAL_SESSION_COOKIE = "cropshield_local_session";
var LOCAL_ADMIN_EMAIL = "abhidey0822@gmail.com";
var SESSION_TTL = "7d";
function normalizeLocalEmail(email) {
  return email.trim().toLowerCase();
}
function canCreateLocalAdmin(email, existingLocalAdminCount) {
  return normalizeLocalEmail(email) === LOCAL_ADMIN_EMAIL && existingLocalAdminCount === 0;
}
function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for local sessions");
  return new TextEncoder().encode(secret);
}
async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}
async function verifyPassword(password, encoded) {
  const [, saltHex, hashHex] = encoded.split("$");
  if (!saltHex || !hashHex) return false;
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
async function createLocalSession(openId) {
  return new SignJWT({ kind: "local" }).setProtectedHeader({ alg: "HS256" }).setSubject(openId).setIssuedAt().setExpirationTime(SESSION_TTL).sign(secretKey());
}
async function getLocalSessionOpenId(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.kind === "local" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  for (const field of ["name", "email", "loginMethod"]) {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? /* @__PURE__ */ new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== void 0 || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}
async function countAdmins() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select({ count: sql`count(*)` }).from(users).where(and(eq(users.role, "admin"), eq(users.loginMethod, "local-test")));
  return Number(result[0]?.count ?? 0);
}
async function createLocalUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const openId = `local:${data.email}`;
  const result = await db.insert(users).values({ openId, name: data.name, email: data.email, passwordHash: data.passwordHash, role: data.role, loginMethod: "local-test", lastSignedIn: /* @__PURE__ */ new Date() });
  const id = Number(result[0].insertId);
  const created = await getUserByOpenId(openId);
  if (!created) throw new Error(`Local user ${id} could not be loaded after creation`);
  return created;
}
async function updateLastSignedIn(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}
async function updateProfile(userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = { userId, displayName: data.displayName, region: data.region, phone: data.phone, state: data.state, district: data.district, pinCode: data.pinCode, village: data.village, primaryCrop: data.primaryCrop, farmingExperienceYears: data.farmingExperienceYears, latitude: data.latitude?.toString(), longitude: data.longitude?.toString() };
  await db.insert(profiles).values(values).onDuplicateKeyUpdate({ set: { displayName: data.displayName, region: data.region ?? null, phone: data.phone ?? null, state: data.state ?? null, district: data.district ?? null, pinCode: data.pinCode ?? null, village: data.village ?? null, primaryCrop: data.primaryCrop ?? null, farmingExperienceYears: data.farmingExperienceYears ?? null, latitude: data.latitude?.toString() ?? null, longitude: data.longitude?.toString() ?? null } });
}
async function getFarmerSnapshot(ownerId) {
  const db = await getDb();
  if (!db) return { profile: void 0, crops: [], scans: [], cases: [] };
  const [profile, farmerCrops, farmerScans, farmerCases] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, ownerId)).limit(1),
    db.select().from(crops).where(eq(crops.ownerId, ownerId)).orderBy(desc(crops.updatedAt)),
    db.select().from(scans).where(eq(scans.ownerId, ownerId)).orderBy(desc(scans.createdAt)).limit(50),
    db.select().from(cases).where(eq(cases.ownerId, ownerId)).orderBy(desc(cases.createdAt)).limit(50)
  ]);
  return { profile: profile[0], crops: farmerCrops, scans: farmerScans, cases: farmerCases };
}
async function insertScan(data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(scans).values(data);
  return Number(result[0].insertId);
}
async function updateScan(id, ownerId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(scans).set(data).where(and(eq(scans.id, id), eq(scans.ownerId, ownerId)));
}
async function createCase(data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(cases).values(data);
}
async function createCrop(data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(crops).values({ ownerId: data.ownerId, name: data.name, cropType: data.cropType, region: data.region, status: "healthy" });
}
async function getOwnerCrops(ownerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crops).where(eq(crops.ownerId, ownerId)).orderBy(desc(crops.updatedAt));
}
async function getOwnerScans(ownerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scans).where(eq(scans.ownerId, ownerId)).orderBy(desc(scans.createdAt));
}
async function getOwnerCases(ownerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cases).where(eq(cases.ownerId, ownerId)).orderBy(desc(cases.createdAt));
}
async function getAdminOverview() {
  const db = await getDb();
  if (!db) return { totals: { farmers: 0, scans: 0, highRisk: 0, openCases: 0, avgConfidence: 0 }, distribution: { healthy: 0, monitoring: 0, critical: 0 }, recentScans: [], regions: [] };
  const [farmerCount, scanCount, highRiskCount, openCaseCount, healthyCount, monitoringCount, criticalCount, avgConfidence, recentScans, regions] = await Promise.all([
    db.select({ count: sql`count(*)` }).from(users).where(eq(users.role, "user")),
    db.select({ count: sql`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), or(eq(scans.riskLevel, "high"), eq(scans.riskLevel, "critical")), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql`count(*)` }).from(cases).where(sql`${cases.status} <> 'resolved'`),
    db.select({ count: sql`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), eq(scans.riskLevel, "low"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), eq(scans.riskLevel, "medium"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ count: sql`count(*)` }).from(scans).where(and(eq(scans.status, "complete"), eq(scans.riskLevel, "high"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select({ average: sql`avg(${scans.confidence})` }).from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)),
    db.select().from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)).orderBy(desc(scans.createdAt)).limit(20),
    db.select({ region: crops.region, count: sql`count(*)` }).from(crops).groupBy(crops.region).orderBy(desc(sql`count(*)`)).limit(10)
  ]);
  return { totals: { farmers: Number(farmerCount[0]?.count ?? 0), scans: Number(scanCount[0]?.count ?? 0), highRisk: Number(highRiskCount[0]?.count ?? 0), openCases: Number(openCaseCount[0]?.count ?? 0), avgConfidence: Number(avgConfidence[0]?.average ?? 0) }, distribution: { healthy: Number(healthyCount[0]?.count ?? 0), monitoring: Number(monitoringCount[0]?.count ?? 0), critical: Number(criticalCount[0]?.count ?? 0) }, recentScans, regions };
}
async function getApprovedCases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cases).orderBy(desc(cases.createdAt)).limit(100);
}
async function getApprovedDirectory() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ user: users, profile: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.role, "user")).orderBy(desc(users.createdAt));
}
function summarizeApprovedLocations(farmerRows, approvedScans, farmerCrops) {
  const eligibleScans = approvedScans.filter((scan) => scan.status === "complete" && Boolean(scan.approvedAt));
  const groups = /* @__PURE__ */ new Map();
  for (const { user, profile } of farmerRows) {
    const location = [profile?.state, profile?.district, profile?.region].filter(Boolean).join(" \xB7 ") || "Location not provided";
    const group = groups.get(location) ?? { location, state: profile?.state, district: profile?.district, farmers: 0, scans: 0, highRisk: 0, crops: /* @__PURE__ */ new Set(), diseases: /* @__PURE__ */ new Set(), latitude: profile?.latitude, longitude: profile?.longitude };
    group.farmers += 1;
    eligibleScans.filter((scan) => scan.ownerId === user.id).forEach((scan) => {
      group.scans += 1;
      if (scan.riskLevel === "high" || scan.riskLevel === "critical") group.highRisk += 1;
      if (scan.cropId) {
        const crop = farmerCrops.find((candidate) => candidate.id === scan.cropId && candidate.ownerId === user.id);
        if (crop) group.crops.add(crop.name);
      }
      if (scan.disease) group.diseases.add(scan.disease);
    });
    groups.set(location, group);
  }
  return Array.from(groups.values()).map((group) => ({ ...group, crops: Array.from(group.crops), diseases: Array.from(group.diseases) })).sort((a, b) => b.highRisk - a.highRisk || b.farmers - a.farmers);
}
async function getAdminLocationSummaries() {
  const db = await getDb();
  if (!db) return [];
  const [farmerRows, approvedScans, farmerCrops] = await Promise.all([
    db.select({ user: users, profile: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.role, "user")),
    db.select().from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)).orderBy(desc(scans.createdAt)),
    db.select().from(crops)
  ]);
  return summarizeApprovedLocations(farmerRows, approvedScans, farmerCrops);
}
function buildAdminFarmerInsights(farmerRows, approvedScans, farmerCrops) {
  return farmerRows.map(({ user, profile }) => {
    const ownScans = approvedScans.filter((scan) => scan.ownerId === user.id);
    const latest = ownScans[0];
    const ownCrops = farmerCrops.filter((crop) => crop.ownerId === user.id);
    const risk = ownScans.some((scan) => scan.riskLevel === "critical") ? "critical" : ownScans.some((scan) => scan.riskLevel === "high") ? "high" : ownScans.some((scan) => scan.riskLevel === "medium") ? "medium" : ownScans.length ? "low" : "unknown";
    return { user, profile, crops: ownCrops, latestScan: latest, riskLevel: risk };
  });
}
async function getAdminFarmerInsights() {
  const db = await getDb();
  if (!db) return [];
  const [farmerRows, approvedScans, farmerCrops] = await Promise.all([
    db.select({ user: users, profile: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.role, "user")),
    db.select().from(scans).where(and(eq(scans.status, "complete"), sql`${scans.approvedAt} IS NOT NULL`)).orderBy(desc(scans.createdAt)),
    db.select().from(crops)
  ]);
  return buildAdminFarmerInsights(farmerRows, approvedScans, farmerCrops).map((entry) => ({ ...entry, user: toSafeUser(entry.user) }));
}
function canManageFarmerAccount(targetRole) {
  return targetRole === "user";
}
async function setFarmerAccountStatus(userId, accountStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(users).set({ accountStatus }).where(and(eq(users.id, userId), eq(users.role, "user")));
  if (!result[0]?.affectedRows) throw new Error("Farmer account not found");
}
async function deleteFarmerAccount(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
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
function rankExpertsByLocation(rows, location) {
  const state = location?.state?.trim().toLowerCase();
  const district = location?.district?.trim().toLowerCase();
  const score = (expert) => {
    const expertState = expert.state?.trim().toLowerCase();
    const expertDistrict = expert.district?.trim().toLowerCase();
    return (district && expertDistrict === district ? 3 : 0) + (state && expertState === state ? 2 : 0);
  };
  return [...rows].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}
async function getVerifiedExperts(location) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(experts).where(eq(experts.status, "verified")).orderBy(desc(experts.updatedAt));
  return rankExpertsByLocation(rows, location);
}
async function getApprovedDrugStores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drugStores).where(eq(drugStores.status, "approved")).orderBy(desc(drugStores.updatedAt));
}
async function getAdminExperts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(experts).orderBy(desc(experts.createdAt));
}
async function getAdminDrugStores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drugStores).orderBy(desc(drugStores.createdAt));
}
async function createExpert(data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(experts).values(data);
}
async function setExpertStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(experts).set({ status }).where(eq(experts.id, id));
}
async function createDrugStore(data) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(drugStores).values(data);
}
async function setDrugStoreStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(drugStores).set({ status }).where(eq(drugStores.id, id));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const host = String(req.headers.host ?? "").toLowerCase();
  const isManagedPreview = host.endsWith(".manus.computer") || host.endsWith(".manus.space");
  const secure = isSecureRequest(req) || isManagedPreview;
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey2 = this.getSessionSecret();
    return new SignJWT2({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey2);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey2 = this.getSessionSecret();
      const { payload } = await jwtVerify2(cookieValue, secretKey2, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!(process.env.EXTERNAL_SERVICE_URL ?? "") || !(process.env.EXTERNAL_SERVICE_KEY ?? "")) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        "".replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${""}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!(process.env.EXTERNAL_SERVICE_URL ?? "")) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!(process.env.EXTERNAL_SERVICE_URL ?? "")) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint2 = buildEndpointUrl("");
  try {
    const response = await fetch(endpoint2, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${""}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/llm.ts
var DEFAULT_MODEL = "gemini-3-flash-preview";
function endpoint() {
  const base = process.env.BUILT_IN_FORGE_API_URL;
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  if (!base || !key) throw new Error("Manus built-in LLM service is not configured");
  return { url: `${base.replace(/\/$/, "")}/v1/chat/completions`, key };
}
function normalizeParams(params) {
  const responseFormat = params.response_format ?? params.responseFormat ?? (params.output_schema || params.outputSchema ? {
    type: "json_schema",
    json_schema: params.output_schema ?? params.outputSchema
  } : void 0);
  return {
    model: params.model ?? DEFAULT_MODEL,
    messages: params.messages,
    ...params.tools ? { tools: params.tools } : {},
    ...params.tool_choice || params.toolChoice ? { tool_choice: params.tool_choice ?? params.toolChoice } : {},
    ...params.max_tokens || params.maxTokens ? { max_tokens: params.max_tokens ?? params.maxTokens } : {},
    ...responseFormat ? { response_format: responseFormat } : {},
    ...params.thinking ? { thinking: params.thinking } : {},
    ...params.reasoning ? { reasoning: params.reasoning } : {}
  };
}
async function request(path2, init) {
  const { url, key } = endpoint();
  const target = path2 ? `${url.replace(/\/chat\/completions$/, "")}${path2}` : url;
  const response = await fetch(target, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers ?? {} }
  });
  const body = await response.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    parsed = { error: body };
  }
  if (!response.ok) {
    const detail = typeof parsed === "object" && parsed && "error" in parsed ? String(parsed.error) : response.statusText;
    throw new Error(`Built-in LLM request failed (${response.status}): ${detail}`);
  }
  return parsed;
}
async function invokeLLM(params) {
  return request("", { method: "POST", body: JSON.stringify(normalizeParams(params)) });
}

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = process.env.EXTERNAL_SERVICE_URL ?? "";
  const forgeKey = process.env.EXTERNAL_SERVICE_KEY ?? "";
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set EXTERNAL_SERVICE_URL and EXTERNAL_SERVICE_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/routers.ts
async function fetchOpenMeteoWeather(latitude, longitude, fetcher = fetch) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&hourly=precipitation_probability&forecast_days=2&timezone=auto`;
  const response = await fetcher(url);
  if (!response.ok) throw new Error("Weather service unavailable");
  const json = await response.json();
  return { current: json.current ?? {}, units: json.current_units ?? {}, fetchedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new Error("Administrator access required");
  return next();
});
var analysisSchema = {
  type: "object",
  properties: {
    cropType: { type: "string" },
    riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    symptoms: { type: "array", items: { type: "string" } },
    assessment: { type: "string" },
    disease: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } }
  },
  required: ["cropType", "riskLevel", "confidence", "symptoms", "assessment", "disease", "recommendations"],
  additionalProperties: false
};
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    signup: publicProcedure.input(z2.object({ name: z2.string().trim().min(2).max(160), email: z2.string().trim().toLowerCase().email().max(320), password: z2.string().min(8).max(128), role: z2.enum(["user", "admin"]), phone: z2.string().trim().max(40).optional(), region: z2.string().trim().max(160).optional(), state: z2.string().trim().max(100).optional(), district: z2.string().trim().max(100).optional(), pinCode: z2.string().trim().max(12).optional(), village: z2.string().trim().max(160).optional(), primaryCrop: z2.string().trim().min(2).max(120).optional(), farmingExperienceYears: z2.number().int().min(0).max(100).optional() })).mutation(async ({ ctx, input }) => {
      const email = normalizeLocalEmail(input.email);
      if (await getUserByEmail(email)) throw new Error("An account with this email already exists");
      if (input.role === "admin" && !canCreateLocalAdmin(email, await countAdmins())) throw new Error("Administrator signup is reserved for the configured owner account and only one account is allowed");
      const user = await createLocalUser({ name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: input.role });
      await updateProfile(user.id, { displayName: input.name.trim(), phone: input.phone, region: input.region, state: input.state, district: input.district, pinCode: input.pinCode, village: input.village, primaryCrop: input.primaryCrop, farmingExperienceYears: input.farmingExperienceYears });
      const token = await createLocalSession(user.openId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1e3 });
      return { user: toSafeUser(user), sessionToken: token };
    }),
    signin: publicProcedure.input(z2.object({ email: z2.string().trim().toLowerCase().email().max(320), password: z2.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(normalizeLocalEmail(input.email));
      if (!user?.passwordHash || user.accountStatus === "disabled" || !await verifyPassword(input.password, user.passwordHash)) throw new Error(user?.accountStatus === "disabled" ? "This farmer account is disabled. Contact an administrator." : "Email or password is incorrect");
      await updateLastSignedIn(user.id);
      const token = await createLocalSession(user.openId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1e3 });
      return { user: toSafeUser(user), sessionToken: token };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  farmer: router({
    snapshot: protectedProcedure.query(({ ctx }) => getFarmerSnapshot(ctx.user.id)),
    crops: protectedProcedure.query(({ ctx }) => getOwnerCrops(ctx.user.id)),
    scans: protectedProcedure.query(({ ctx }) => getOwnerScans(ctx.user.id)),
    verifiedExperts: protectedProcedure.input(z2.object({ state: z2.string().max(100).optional(), district: z2.string().max(100).optional() }).optional()).query(({ input }) => getVerifiedExperts(input)),
    approvedDrugStores: protectedProcedure.query(() => getApprovedDrugStores()),
    createCrop: protectedProcedure.input(z2.object({ name: z2.string().min(2).max(120), cropType: z2.string().min(2).max(80), region: z2.string().max(160).optional() })).mutation(({ ctx, input }) => createCrop({ ownerId: ctx.user.id, ...input })),
    cases: protectedProcedure.query(({ ctx }) => getOwnerCases(ctx.user.id)),
    updateProfile: protectedProcedure.input(z2.object({ displayName: z2.string().min(2).max(160), region: z2.string().max(160).optional(), phone: z2.string().max(40).optional(), state: z2.string().max(100).optional(), district: z2.string().max(100).optional(), pinCode: z2.string().max(12).optional(), village: z2.string().max(160).optional(), primaryCrop: z2.string().min(2).max(120).optional(), farmingExperienceYears: z2.number().int().min(0).max(100).optional(), latitude: z2.number().min(-90).max(90).optional(), longitude: z2.number().min(-180).max(180).optional() })).mutation(({ ctx, input }) => updateProfile(ctx.user.id, input)),
    analyzeScan: protectedProcedure.input(z2.object({ imageBase64: z2.string().min(32).max(12e6), mimeType: z2.string().regex(/^image\/(jpeg|png|webp)$/), cropId: z2.number().int().positive().optional(), fileName: z2.string().min(1).max(180) })).mutation(async ({ ctx, input }) => {
      const key = `farmer-${ctx.user.id}/scans/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
      let stored;
      let scanId;
      try {
        stored = await storagePut(key, buffer, input.mimeType);
        scanId = await insertScan({ ownerId: ctx.user.id, cropId: input.cropId, imageKey: stored.key, imageUrl: stored.url, status: "analyzing", riskLevel: "unknown" });
      } catch (persistenceError) {
        console.error("[Scan] Storage/database unavailable before AI analysis; continuing with AI:", persistenceError);
      }
      try {
        const messages = [
          { role: "system", content: "You are CropShield's crop-health assessment service. Analyze the actual crop image conservatively. Do not claim certainty; return only the requested structured JSON." },
          { role: "user", content: [{ type: "text", text: "Assess this crop image for visible health concerns. Identify likely crop type, risk level, confidence from 0 to 100, visible symptoms, concise assessment, and practical recommendations." }, { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64.replace(/^data:[^;]+;base64,/, "")}` } }] }
        ];
        let response;
        try {
          response = await invokeLLM({
            model: "gemini-3-flash-preview",
            messages,
            response_format: { type: "json_schema", json_schema: { name: "crop_health_assessment", strict: true, schema: analysisSchema } }
          });
        } catch (structuredError) {
          console.warn("[Scan] Structured AI response failed; retrying with JSON object format:", structuredError);
          response = await invokeLLM({
            model: "gemini-3-flash-preview",
            messages,
            response_format: { type: "json_object" }
          });
        }
        const rawContent = response.choices?.[0]?.message?.content;
        const content = Array.isArray(rawContent) ? rawContent.filter((part) => part.type === "text").map((part) => part.text).join("") : rawContent;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        const confidence = Number(parsed.confidence);
        const riskLevel = z2.enum(["low", "medium", "high", "critical"]).parse(parsed.riskLevel);
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100 || typeof parsed.disease !== "string" || typeof parsed.assessment !== "string" || !Array.isArray(parsed.symptoms) || !Array.isArray(parsed.recommendations)) throw new Error("The crop assessment response was not valid structured data");
        if (scanId) {
          await updateScan(scanId, ctx.user.id, { status: "complete", riskLevel, confidence: confidence.toFixed(2), disease: parsed.disease, symptoms: JSON.stringify(parsed.symptoms), assessment: parsed.assessment, recommendations: JSON.stringify(parsed.recommendations) });
        } else {
          console.warn("[Scan] AI succeeded, but no persistent scan record was created.");
        }
        if (riskLevel === "high" || riskLevel === "critical") {
          try {
            await notifyOwner({ title: "High-risk CropShield scan", content: `A new high-risk crop scan was analyzed for farmer ${ctx.user.name ?? ctx.user.id}. Review the approved workflow before system-wide publication.` });
          } catch (notificationError) {
            console.warn("[Scan] Notification failed after successful analysis:", notificationError);
          }
        }
        return { scanId: scanId ?? 0, imageUrl: stored?.url ?? "", ...parsed };
      } catch (error) {
        if (scanId) {
          try {
            await updateScan(scanId, ctx.user.id, { status: "failed" });
          } catch (persistenceError) {
            console.error("[Scan] Could not mark failed scan:", persistenceError);
          }
        }
        console.error("[Scan] analyzeScan failed:", error);
        throw error;
      }
    })
  }),
  weather: router({
    current: publicProcedure.input(z2.object({ latitude: z2.number().min(-90).max(90), longitude: z2.number().min(-180).max(180) })).query(({ input }) => fetchOpenMeteoWeather(input.latitude, input.longitude))
  }),
  admin: router({
    overview: adminProcedure2.query(() => getAdminOverview()),
    directory: adminProcedure2.query(() => getApprovedDirectory()),
    farmerInsights: adminProcedure2.query(() => getAdminFarmerInsights()),
    setFarmerStatus: adminProcedure2.input(z2.object({ id: z2.number().int().positive(), accountStatus: z2.enum(["active", "disabled"]) })).mutation(({ input }) => setFarmerAccountStatus(input.id, input.accountStatus)),
    deleteFarmer: adminProcedure2.input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteFarmerAccount(input.id)),
    locationSummaries: adminProcedure2.query(() => getAdminLocationSummaries()),
    cases: adminProcedure2.query(() => getApprovedCases()),
    experts: adminProcedure2.query(() => getAdminExperts()),
    createExpert: adminProcedure2.input(z2.object({ name: z2.string().min(2).max(160), phone: z2.string().max(40).optional(), email: z2.string().email().optional(), qualification: z2.string().max(240).optional(), specialization: z2.string().max(240).optional(), organization: z2.string().max(240).optional(), state: z2.string().max(100).optional(), district: z2.string().max(100).optional(), availability: z2.string().max(160).optional() })).mutation(({ input }) => createExpert(input)),
    setExpertStatus: adminProcedure2.input(z2.object({ id: z2.number().int().positive(), status: z2.enum(["pending", "verified", "rejected", "suspended"]) })).mutation(({ input }) => setExpertStatus(input.id, input.status)),
    drugStores: adminProcedure2.query(() => getAdminDrugStores()),
    createDrugStore: adminProcedure2.input(z2.object({ name: z2.string().min(2).max(200), address: z2.string().min(4), phone: z2.string().max(40).optional(), email: z2.string().email().optional(), state: z2.string().max(100).optional(), district: z2.string().max(100).optional(), pinCode: z2.string().max(12).optional(), licenseInfo: z2.string().max(2e3).optional(), categories: z2.string().max(500).optional(), openingHours: z2.string().max(160).optional() })).mutation(({ input }) => createDrugStore(input)),
    setDrugStoreStatus: adminProcedure2.input(z2.object({ id: z2.number().int().positive(), status: z2.enum(["pending", "approved", "rejected", "suspended"]) })).mutation(({ input }) => setDrugStoreStatus(input.id, input.status))
  }),
  cases: router({
    create: protectedProcedure.input(z2.object({ scanId: z2.number().int().positive(), reference: z2.string().min(3).max(32), notes: z2.string().max(2e3).optional() })).mutation(({ ctx, input }) => createCase({ ownerId: ctx.user.id, scanId: input.scanId, reference: input.reference, notes: input.notes }))
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    const authorization = opts.req.headers.authorization;
    const bearerToken = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : void 0;
    const localOpenId = await getLocalSessionOpenId(opts.req.cookies?.[LOCAL_SESSION_COOKIE] ?? bearerToken);
    if (localOpenId) {
      const localUser = await getUserByOpenId(localOpenId);
      user = localUser && localUser.accountStatus === "active" ? toSafeUser(localUser) : null;
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/static.ts
import express from "express";
import fs from "fs";
import path from "path";
function serveStatic(app) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/_core/app.ts
function createBaseApp(options = {}) {
  const app = express2();
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (!options.development) serveStatic(app);
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    console.error("[API] Unhandled request error:", error);
    if (req.path.startsWith("/api/")) {
      return res.status(500).json({ error: { message: "The request could not be completed.", code: "INTERNAL_SERVER_ERROR", detail: process.env.NODE_ENV === "development" ? message : void 0 } });
    }
    return next(error);
  });
  return app;
}

// server/_core/vercel.ts
var appPromise = Promise.resolve(createBaseApp());
async function handler(req, res) {
  const app = await appPromise;
  return app(req, res);
}
export {
  handler as default
};
