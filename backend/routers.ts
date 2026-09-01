import { z } from "zod";
import { COOKIE_NAME } from "@common/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { countAdmins, createCase, createCrop, createDrugStore, createExpert, createLocalUser, getAdminDrugStores, getAdminExperts, getAdminFarmerInsights, getAdminLocationSummaries, getAdminOverview, getApprovedCases, getApprovedDirectory, getApprovedDrugStores, getFarmerSnapshot, getOwnerCases, getOwnerCrops, getOwnerScans, getUserByEmail, getVerifiedExperts, insertScan, setDrugStoreStatus, setExpertStatus, setFarmerAccountStatus, deleteFarmerAccount, updateLastSignedIn, updateProfile, updateScan } from "./db";
import { storagePut } from "./storage";
import { canCreateLocalAdmin, createLocalSession, hashPassword, LOCAL_SESSION_COOKIE, normalizeLocalEmail, toSafeUser, verifyPassword } from "./localAuth";

export async function fetchOpenMeteoWeather(latitude: number, longitude: number, fetcher: typeof fetch = fetch) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&hourly=precipitation_probability&forecast_days=2&timezone=auto`;
  const response = await fetcher(url);
  if (!response.ok) throw new Error("Weather service unavailable");
  const json = await response.json() as { current?: { temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; wind_speed_10m?: number; weather_code?: number }; current_units?: Record<string, string> };
  return { current: json.current ?? {}, units: json.current_units ?? {}, fetchedAt: new Date().toISOString() };
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new Error("Administrator access required");
  return next();
});

const optionalText = (schema: z.ZodString) => z.union([schema, z.literal("")]).optional().transform((value) => value || undefined);

const fieldContextSchema = z.object({
  soilType: z.string().trim().max(120).optional(),
  soilPh: z.number().min(0).max(14).optional(),
  soilMoisture: z.enum(["dry", "balanced", "wet"]).optional(),
  cropCount: z.number().int().min(1).max(1_000_000).optional(),
  landArea: z.number().positive().max(1_000_000).optional(),
  landUnit: z.enum(["acres", "hectares"]).optional(),
  fieldNotes: z.string().trim().max(1000).optional(),
}).optional();

const analysisSchema = {
  type: "object",
  properties: {
    cropType: { type: "string" },
    riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    symptoms: { type: "array", items: { type: "string" } },
    assessment: { type: "string" },
    disease: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["cropType", "riskLevel", "confidence", "symptoms", "assessment", "disease", "recommendations"],
  additionalProperties: false,
} as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    signup: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(8).max(128), role: z.enum(["user", "admin"]), phone: z.string().trim().max(40).optional(), region: z.string().trim().max(160).optional(), state: z.string().trim().max(100).optional(), district: z.string().trim().max(100).optional(), pinCode: z.string().trim().max(12).optional(), village: z.string().trim().max(160).optional(), primaryCrop: optionalText(z.string().trim().min(2).max(120)), farmingExperienceYears: z.number().int().min(0).max(100).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() })).mutation(async ({ ctx, input }) => {
      const email = normalizeLocalEmail(input.email);
      if (await getUserByEmail(email)) throw new Error("An account with this email already exists");
      if (input.role === "admin" && !canCreateLocalAdmin(email, await countAdmins())) throw new Error("Administrator signup is reserved for the configured owner account and only one account is allowed");
      const user = await createLocalUser({ name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: input.role });
      await updateProfile(user.id, { displayName: input.name.trim(), phone: input.phone, region: input.region, state: input.state, district: input.district, pinCode: input.pinCode, village: input.village, primaryCrop: input.primaryCrop, farmingExperienceYears: input.farmingExperienceYears, latitude: input.latitude, longitude: input.longitude });
      const token = await createLocalSession(user.openId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      return { user: toSafeUser(user), sessionToken: token } as const;
    }),
    signin: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(normalizeLocalEmail(input.email));
      if (!user?.passwordHash || user.accountStatus === "disabled" || !(await verifyPassword(input.password, user.passwordHash))) throw new Error(user?.accountStatus === "disabled" ? "This farmer account is disabled. Contact an administrator." : "Email or password is incorrect");
      await updateLastSignedIn(user.id);
      const token = await createLocalSession(user.openId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      return { user: toSafeUser(user), sessionToken: token } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  farmer: router({
    snapshot: protectedProcedure.query(({ ctx }) => getFarmerSnapshot(ctx.user.id)),
    crops: protectedProcedure.query(({ ctx }) => getOwnerCrops(ctx.user.id)),
    scans: protectedProcedure.query(({ ctx }) => getOwnerScans(ctx.user.id)),
    verifiedExperts: protectedProcedure.input(z.object({ state: z.string().max(100).optional(), district: z.string().max(100).optional() }).optional()).query(({ input }) => getVerifiedExperts(input)),
    approvedDrugStores: protectedProcedure.query(() => getApprovedDrugStores()),
    createCrop: protectedProcedure.input(z.object({ name: z.string().min(2).max(120), cropType: z.string().min(2).max(80), region: z.string().max(160).optional() })).mutation(({ ctx, input }) => createCrop({ ownerId: ctx.user.id, ...input })),
    cases: protectedProcedure.query(({ ctx }) => getOwnerCases(ctx.user.id)),
    updateProfile: protectedProcedure.input(z.object({ displayName: z.string().min(2).max(160), region: z.string().max(160).optional(), phone: z.string().max(40).optional(), state: z.string().max(100).optional(), district: z.string().max(100).optional(), pinCode: z.string().max(12).optional(), village: z.string().max(160).optional(), primaryCrop: optionalText(z.string().trim().min(2).max(120)), farmingExperienceYears: z.number().int().min(0).max(100).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() })).mutation(({ ctx, input }) => updateProfile(ctx.user.id, input)),
    analyzeScan: protectedProcedure.input(z.object({ imageBase64: z.string().min(32).max(12_000_000), mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/), cropId: z.number().int().positive().optional(), fileName: z.string().min(1).max(180), fieldContext: fieldContextSchema })).mutation(async ({ ctx, input }) => {
      const key = `farmer-${ctx.user.id}/scans/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const buffer = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
      let stored: { key: string; url: string } | undefined;
      let scanId: number | undefined;

      // A scan is only successful when its image and initial database record are both saved.
      try {
        stored = await storagePut(key, buffer, input.mimeType);
        scanId = await insertScan({ ownerId: ctx.user.id, cropId: input.cropId, imageKey: stored.key, imageUrl: stored.url, status: "analyzing", riskLevel: "unknown", soilType: input.fieldContext?.soilType, soilPh: input.fieldContext?.soilPh?.toString(), soilMoisture: input.fieldContext?.soilMoisture, cropCount: input.fieldContext?.cropCount, landArea: input.fieldContext?.landArea?.toString(), landUnit: input.fieldContext?.landUnit, fieldNotes: input.fieldContext?.fieldNotes, recommendationProgress: JSON.stringify([]) });
      } catch (persistenceError) {
        console.error("[Scan] Storage/database unavailable before AI analysis:", persistenceError);
        throw new Error("The scan could not be saved. Please check your connection and try again.");
      }

      try {
        const contextSummary = [
          input.fieldContext?.soilType && `Soil type: ${input.fieldContext.soilType}`,
          input.fieldContext?.soilPh !== undefined && `Soil pH: ${input.fieldContext.soilPh}`,
          input.fieldContext?.soilMoisture && `Soil moisture: ${input.fieldContext.soilMoisture}`,
          input.fieldContext?.cropCount !== undefined && `Number of crops/plants represented: ${input.fieldContext.cropCount}`,
          input.fieldContext?.landArea !== undefined && `Land area: ${input.fieldContext.landArea} ${input.fieldContext.landUnit ?? "units"}`,
          input.fieldContext?.fieldNotes && `Farmer notes: ${input.fieldContext.fieldNotes}`,
        ].filter(Boolean).join("\n") || "No optional field context was supplied. Base the result on the image only.";
        const messages = [
          { role: "system" as const, content: "You are CropShield's crop-health assessment service. Analyze the actual crop image conservatively. Do not claim certainty; return only the requested structured JSON. Use farmer-supplied field context as supporting evidence, explain when image evidence is limited, and make recommendations practical, safe, and specific to the crop and context." },
          { role: "user" as const, content: [{ type: "text" as const, text: `Assess this crop image for visible health concerns. Identify likely crop type, risk level, confidence from 0 to 100, visible symptoms, concise assessment, and practical recommendations. Return treatment, prevention, and monitoring actions where appropriate.\n\nOptional farmer field context (may be incomplete):\n${contextSummary}` }, { type: "image_url" as const, image_url: { url: `data:${input.mimeType};base64,${input.imageBase64.replace(/^data:[^;]+;base64,/, "")}` } }] },
        ];
        let response;
        try {
          response = await invokeLLM({
            model: "gemini-3-flash-preview",
            messages,
            response_format: { type: "json_schema", json_schema: { name: "crop_health_assessment", strict: true, schema: analysisSchema } },
          });
        } catch (structuredError) {
          console.warn("[Scan] Structured AI response failed; retrying with JSON object format:", structuredError);
          response = await invokeLLM({
            model: "gemini-3-flash-preview",
            messages,
            response_format: { type: "json_object" },
          });
        }
        const rawContent = response.choices?.[0]?.message?.content;
        const content = Array.isArray(rawContent)
          ? rawContent.filter((part) => part.type === "text").map((part) => part.text).join("")
          : rawContent;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");
        const confidence = Number(parsed.confidence);
        const riskLevel = z.enum(["low", "medium", "high", "critical"]).parse(parsed.riskLevel);
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100 || typeof parsed.disease !== "string" || typeof parsed.assessment !== "string" || !Array.isArray(parsed.symptoms) || !Array.isArray(parsed.recommendations)) throw new Error("The crop assessment response was not valid structured data");

        if (scanId) {
          await updateScan(scanId, ctx.user.id, { status: "complete", riskLevel, confidence: confidence.toFixed(2), disease: parsed.disease, symptoms: JSON.stringify(parsed.symptoms), assessment: parsed.assessment, recommendations: JSON.stringify(parsed.recommendations), recommendationProgress: JSON.stringify(parsed.recommendations.map((step: string) => ({ step, completed: false }))) });
        } else {
          console.warn("[Scan] AI succeeded, but no persistent scan record was created.");
        }

        if (riskLevel === "high" || riskLevel === "critical") {
          try { await notifyOwner({ title: "High-risk CropShield scan", content: `A new high-risk crop scan was analyzed for farmer ${ctx.user.name ?? ctx.user.id}. Review the approved workflow before system-wide publication.` }); }
          catch (notificationError) { console.warn("[Scan] Notification failed after successful analysis:", notificationError); }
        }
        return { scanId: scanId ?? 0, imageUrl: stored?.url ?? "", fieldContext: input.fieldContext ?? null, recommendationProgress: parsed.recommendations.map((step: string) => ({ step, completed: false })), ...parsed };
      } catch (error) {
        if (scanId) {
          try { await updateScan(scanId, ctx.user.id, { status: "failed" }); }
          catch (persistenceError) { console.error("[Scan] Could not mark failed scan:", persistenceError); }
        }
        console.error("[Scan] analyzeScan failed:", error);
        throw error;
      }
    }),
    updateRecommendationProgress: protectedProcedure.input(z.object({ scanId: z.number().int().positive(), progress: z.array(z.object({ step: z.string().trim().min(1).max(600), completed: z.boolean() })).max(30) })).mutation(async ({ ctx, input }) => {
      await updateScan(input.scanId, ctx.user.id, { recommendationProgress: JSON.stringify(input.progress) });
      return { success: true } as const;
    }),
  }),
  weather: router({
    current: publicProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).query(({ input }) => fetchOpenMeteoWeather(input.latitude, input.longitude)),
  }),
  admin: router({
    overview: adminProcedure.query(() => getAdminOverview()),
    directory: adminProcedure.query(() => getApprovedDirectory()),
    farmerInsights: adminProcedure.query(() => getAdminFarmerInsights()),
    setFarmerStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), accountStatus: z.enum(["active", "disabled"]) })).mutation(({ input }) => setFarmerAccountStatus(input.id, input.accountStatus)),
    deleteFarmer: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteFarmerAccount(input.id)),
    locationSummaries: adminProcedure.query(() => getAdminLocationSummaries()),
    cases: adminProcedure.query(() => getApprovedCases()),
    experts: adminProcedure.query(() => getAdminExperts()),
    createExpert: adminProcedure.input(z.object({ name: z.string().min(2).max(160), phone: z.string().max(40).optional(), email: z.string().email().optional(), qualification: z.string().max(240).optional(), specialization: z.string().max(240).optional(), organization: z.string().max(240).optional(), state: z.string().max(100).optional(), district: z.string().max(100).optional(), availability: z.string().max(160).optional() })).mutation(({ input }) => createExpert(input)),
    setExpertStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "verified", "rejected", "suspended"]) })).mutation(({ input }) => setExpertStatus(input.id, input.status)),
    drugStores: adminProcedure.query(() => getAdminDrugStores()),
    createDrugStore: adminProcedure.input(z.object({ name: z.string().min(2).max(200), address: z.string().min(4), phone: z.string().max(40).optional(), email: z.string().email().optional(), state: z.string().max(100).optional(), district: z.string().max(100).optional(), pinCode: z.string().max(12).optional(), licenseInfo: z.string().max(2000).optional(), categories: z.string().max(500).optional(), openingHours: z.string().max(160).optional() })).mutation(({ input }) => createDrugStore(input)),
    setDrugStoreStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "approved", "rejected", "suspended"]) })).mutation(({ input }) => setDrugStoreStatus(input.id, input.status)),
  }),
  cases: router({
    create: protectedProcedure.input(z.object({ scanId: z.number().int().positive(), reference: z.string().min(3).max(32), notes: z.string().max(2000).optional() })).mutation(({ ctx, input }) => createCase({ ownerId: ctx.user.id, scanId: input.scanId, reference: input.reference, notes: input.notes })),
  }),
});

export type AppRouter = typeof appRouter;
