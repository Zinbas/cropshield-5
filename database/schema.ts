import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
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
  town: varchar("town", { length: 160 }),
  primaryCrop: varchar("primaryCrop", { length: 120 }),
  farmingExperienceYears: int("farmingExperienceYears"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  networkMode: mysqlEnum("networkMode", ["good", "poor", "offline"]).default("good").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const crops = mysqlTable("crops", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  cropType: varchar("cropType", { length: 80 }).notNull(),
  region: varchar("region", { length: 160 }),
  acreage: decimal("acreage", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["healthy", "monitoring", "at_risk"]).default("healthy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const scans = mysqlTable("scans", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  cropId: int("cropId"),
  imageKey: varchar("imageKey", { length: 500 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1000 }).notNull(),
  status: mysqlEnum("status", ["queued", "analyzing", "complete", "failed"]).default("queued").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical", "unknown"]).default("unknown").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  disease: varchar("disease", { length: 180 }),
  soilType: varchar("soilType", { length: 120 }),
  soilPh: decimal("soilPh", { precision: 4, scale: 2 }),
  soilMoisture: varchar("soilMoisture", { length: 80 }),
  cropCount: int("cropCount"),
  landArea: decimal("landArea", { precision: 10, scale: 2 }),
  landUnit: varchar("landUnit", { length: 24 }),
  fieldNotes: text("fieldNotes"),
  recommendationProgress: text("recommendationProgress"),
  symptoms: text("symptoms"),
  assessment: text("assessment"),
  recommendations: text("recommendations"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  scanId: int("scanId").notNull().unique(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  status: mysqlEnum("status", ["open", "reviewing", "resolved"]).default("open").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Crop = typeof crops.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Case = typeof cases.$inferSelect;

export const experts = mysqlTable("experts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 1000 }),
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const drugStores = mysqlTable("drugStores", {
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
  supportingDocumentUrl: varchar("supportingDocumentUrl", { length: 1000 }),
  categories: text("categories"),
  openingHours: varchar("openingHours", { length: 160 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "suspended"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const weatherCache = mysqlTable("weatherCache", {
  id: int("id").autoincrement().primaryKey(),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  payload: text("payload").notNull(),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type Expert = typeof experts.$inferSelect;
export type DrugStore = typeof drugStores.$inferSelect;
export type WeatherCache = typeof weatherCache.$inferSelect;
