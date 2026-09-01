import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CloudSun,
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  CloudUpload,
  FileSearch,
  Filter,
  FolderOpen,
  Gauge,
  Grid2X2,
  Leaf,
  Lightbulb,
  LogOut,
  MapPin,
  MessageCircle,
  Menu,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldCheck,
  Sprout,
  Store,
  Stethoscope,
  UserRound,
  UserCheck,
  UserRoundCog,
  Trash2,
  Users,
  WifiOff,
  X,
} from "lucide-react";

type Role = "farmer" | "admin";
type Section = "dashboard" | "crops" | "scan" | "cases" | "profile" | "farmers" | "analytics" | "scans" | "experts" | "stores";

export const LOCAL_SIGNUP_ROLES = [
  { value: "user", label: "Farmer" },
  { value: "admin", label: "Administrator (configured owner only)" },
] as const;

export function getUserInitials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function getScanNextSteps(riskLevel: string, disease?: string | null) {
  const risk = riskLevel.toLowerCase();
  const subject = disease && disease !== "No disease identified" ? disease : "the visible crop concern";
  if (risk === "critical" || risk === "high") return [
    `Isolate the affected area and check nearby plants for ${subject}.`,
    "Take a second close-up photo in good daylight and keep this case open for follow-up.",
    "Contact a verified agricultural expert before applying treatment.",
  ];
  if (risk === "medium") return [
    `Recheck ${subject} within the next 24–48 hours and note any spread.`,
    "Improve airflow, watering, and field hygiene while you monitor the crop.",
    "Contact a verified expert if symptoms increase or the crop begins to wilt.",
  ];
  return [
    "Continue the current care routine and monitor new growth.",
    "Capture another scan if the color, texture, or leaf shape changes.",
    "Keep this result in Cases so you can compare future observations.",
  ];
}

type ExpertContact = { phone?: string | null; email?: string | null };

export function validateCropImage(file: { type: string; size: number }) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return "Please choose a JPEG, PNG, or WebP image.";
  if (file.size > 12 * 1024 * 1024) return "Please choose an image smaller than 12 MB.";
  return null;
}

export function getExpertContactHref(expert: ExpertContact, action: "call" | "message") {
  const phone = expert.phone?.replace(/[^\d+]/g, "");
  if (action === "call") return phone ? `tel:${phone}` : "";
  return phone ? `sms:${phone}` : expert.email ? `mailto:${expert.email}` : "";
}

const nav: { id: Section; label: string; icon: typeof Grid2X2; roles: Role[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: Grid2X2, roles: ["farmer", "admin"] },
  { id: "crops", label: "My Crops", icon: Sprout, roles: ["farmer"] },
  { id: "scans", label: "Scan History", icon: FileSearch, roles: ["farmer"] },
  { id: "farmers", label: "Farmers", icon: Users, roles: ["admin"] },
  { id: "scans", label: "Scans", icon: FileSearch, roles: ["admin"] },
  { id: "cases", label: "Cases", icon: ClipboardList, roles: ["farmer", "admin"] },
  { id: "experts", label: "Experts", icon: Stethoscope, roles: ["farmer", "admin"] },
  { id: "stores", label: "Stores", icon: Store, roles: ["farmer", "admin"] },
  { id: "analytics", label: "Analytics", icon: BarChart3, roles: ["admin"] },
  { id: "profile", label: "Profile", icon: UserRound, roles: ["farmer", "admin"] },
];

export function getSection(path: string): Section {
  const raw = path.split("/").filter(Boolean).pop() as Section | undefined;
  // Scan is a deliberate primary action rather than a persistent nav item.
  return raw === "scan" || nav.some((item) => item.id === raw) ? raw! : "dashboard";
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-mark${compact ? " brand-mark-compact" : ""}`}><img className="brand-logo" src="/logo.svg" alt="CropShield logo" /><span>CropShield</span></div>;
}

function StatusChip({ children, tone = "healthy" }: { children: React.ReactNode; tone?: "healthy" | "medium" | "high" | "neutral" }) {
  return <span className={`status-chip status-${tone}`}>{children}</span>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><FolderOpen size={22} /></div><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function NetworkMode() {
  const [mode, setMode] = useState<"good" | "poor" | "offline">(() => (typeof window !== "undefined" && (localStorage.getItem("cropshield-network-mode") as "good" | "poor" | "offline") ) || "good");
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => { const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  const effective = online ? mode : "offline";
  return <button className={`network-badge network-${effective}`} onClick={() => { const next = effective === "good" ? "poor" : effective === "poor" ? "offline" : "good"; setMode(next); localStorage.setItem("cropshield-network-mode", next); toast.success(`Network mode: ${next === "good" ? "Good quality" : next === "poor" ? "Poor quality" : "Offline"}`); }} title="Cycle network mode">{effective === "offline" ? <WifiOff size={14} /> : <Activity size={14} />}<span>{effective === "good" ? "GOOD" : effective === "poor" ? "POOR" : "OFFLINE"}</span></button>;
}

function WeatherWidget() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "detecting" | "denied">("idle");
  const weather = trpc.weather.current.useQuery(coords ?? { latitude: 20.5937, longitude: 78.9629 }, { enabled: Boolean(coords) });
  const detect = () => { if (!navigator.geolocation) { setLocationState("denied"); return; } setLocationState("detecting"); navigator.geolocation.getCurrentPosition((position) => { setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationState("idle"); }, () => setLocationState("denied"), { enableHighAccuracy: false, timeout: 8000 }); };
  useEffect(() => { detect(); }, []);
  const current = weather.data?.current;
  const precipitation = Number(current?.precipitation ?? 0);
  const humidity = Number(current?.relative_humidity_2m ?? 0);
  const wind = Number(current?.wind_speed_10m ?? 0);
  const weatherGuidance = precipitation >= 5 ? { tone: "high", title: "Wet-weather watch", detail: "Delay foliar spraying, improve drainage, and inspect leaves for fungal spread after rainfall." } : humidity >= 80 ? { tone: "medium", title: "Humidity watch", detail: "Increase airflow between plants and check shaded leaves closely for early disease symptoms." } : wind >= 30 ? { tone: "medium", title: "Wind watch", detail: "Secure young plants, avoid spraying in strong wind, and check for broken stems after gusts." } : { tone: "healthy", title: "Good field conditions", detail: "Conditions are suitable for routine crop care. Keep monitoring soil moisture and new growth." };
  return <section className="surface-card weather-card"><div className="section-heading"><h2>Local weather</h2><CloudSun size={20} /></div>{locationState === "detecting" || weather.isLoading ? <div className="weather-state"><RefreshCw className="spin" size={18} /> Fetching local weather…</div> : weather.isError ? <div className="weather-state"><p>Weather is temporarily unavailable.</p><Button variant="outline" onClick={detect}>Retry location</Button></div> : current ? <><div className="weather-reading"><strong>{current.temperature_2m ?? "—"}°</strong><div><b>Current conditions</b><span>Humidity {current.relative_humidity_2m ?? "—"}% · Wind {current.wind_speed_10m ?? "—"} km/h</span><small>Updated {new Date(weather.data?.fetchedAt ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div></div><div className={`weather-guidance guidance-${weatherGuidance.tone}`}><ShieldCheck size={16} /><div><b>{weatherGuidance.title}</b><p>{weatherGuidance.detail}</p></div></div></> : <div className="weather-state"><p>Enable location to load local weather.</p><Button variant="outline" onClick={detect}>Use my location</Button></div>}{locationState === "denied" && <p className="weather-note">Location permission was unavailable. Enable it in your browser settings to see local conditions.</p>}</section>;
}

function Donut() {
  return <div className="donut-wrap"><div className="donut"><div><strong>85%</strong><span>OPTIMAL</span></div></div></div>;
}

function FarmerDashboard({ onScan, user }: { onScan: () => void; user?: { name?: string | null } | null }) {
  const snapshot = trpc.farmer.snapshot.useQuery();
  const data = snapshot.data;
  const crops = data?.crops ?? [];
  const scans = data?.scans ?? [];
  const cases = data?.cases ?? [];
  const healthy = crops.filter((crop) => crop.status === "healthy").length;
  const monitoring = crops.filter((crop) => crop.status === "monitoring").length;
  const atRisk = crops.filter((crop) => crop.status === "at_risk").length;
  const totalCrops = Math.max(crops.length, 1);
  const latest = scans[0];
  const recommendation = (() => { try { return latest?.recommendations ? JSON.parse(latest.recommendations)[0] : undefined; } catch { return undefined; } })();
  return <div className="page-stack">
    <WeatherWidget />
    <section className="welcome-row dashboard-welcome"><div><p className="eyebrow">FARMER WORKSPACE</p><h1>Your crop health,<br /><span>in one place.</span></h1><p className="stable"><Check size={16} /> {snapshot.isLoading ? "Loading your records…" : `${crops.length} crops · ${scans.length} scans · ${cases.length} cases`}</p></div><div className="avatar avatar-large">{getUserInitials(user?.name)}</div></section>
    <button className="scan-hero" onClick={onScan}><Camera size={24} /><span><b>SCAN CROP</b><small>Upload a leaf or field image for an assessment</small></span><ArrowRight size={22} /></button>
    <section><div className="section-heading"><h2>Your Crops</h2><Link href="/farmer/crops">View all</Link></div>{snapshot.isLoading ? <div className="surface-card loading-row"><RefreshCw className="spin" size={18} /> Loading your crops…</div> : crops.length ? <div className="horizontal-cards">{crops.slice(0, 3).map((crop) => <article className="crop-card" key={crop.id}><div className={`crop-thumb ${crop.status === "at_risk" ? "tomato" : crop.status === "monitoring" ? "potato" : "rice"}`}><Sprout /></div><StatusChip tone={crop.status === "at_risk" ? "high" : crop.status === "monitoring" ? "medium" : "healthy"}>{crop.status.replace("_", " ").toUpperCase()}</StatusChip><h3>{crop.name}</h3><p>{crop.cropType}{crop.region ? ` · ${crop.region}` : ""}</p></article>)}</div> : <div className="surface-card"><EmptyState title="Start with your first crop" detail="Add a crop so CropShield can organize scans and guidance around your farm." action={<Button asChild><Link href="/farmer/crops">Add crop</Link></Button>} /></div>}</section>
    <section className="surface-card"><div className="section-heading"><h2>Recent Scans</h2><Link href="/farmer/scans">View all</Link></div>{scans.length ? <div className="scan-list">{scans.slice(0, 3).map((scan) => <div className="scan-row" key={scan.id}><div className="scan-photo rice-photo"><Leaf /></div><div><h3>{scan.disease || "Crop health scan"}</h3><p>{new Date(scan.createdAt).toLocaleString()}</p></div>{scan.riskLevel === "high" || scan.riskLevel === "critical" ? <AlertTriangle className="icon-danger" /> : <Check className="icon-success" />}</div>)}</div> : <EmptyState title="No scans yet" detail="Upload a clear crop image to receive your first health assessment." action={<Button onClick={onScan}><Camera size={16} /> Scan a crop</Button>} />}</section>
    <section className="surface-card"><div className="section-heading"><h2>Health Overview</h2><Gauge size={20} /></div><div className="health-metrics"><div><strong>{crops.length}</strong><span>Total crops</span></div><div><strong>{Math.round((healthy / totalCrops) * 100)}%</strong><span>Healthy</span></div><div><strong>{atRisk}</strong><span>At risk</span></div></div><div className="legend"><span><i className="legend-green" />Healthy <b>{healthy}</b></span><span><i className="legend-mint" />Monitoring <b>{monitoring}</b></span><span><i className="legend-red" />At Risk <b>{atRisk}</b></span></div></section>
    <section className="recommendation"><div className="recommendation-icon"><Lightbulb size={22} /></div><div><p className="eyebrow">NEXT BEST ACTION</p><h3>{latest?.disease || "Complete your farm profile"}</h3><p>{recommendation || (latest ? "Review your latest scan and keep monitoring the crop for changes." : "Save your location and add a crop to unlock tailored crop-health guidance.")}</p><Button variant="outline" asChild><Link href={latest ? "/farmer/scans" : "/farmer/profile"}>View details <ChevronRight size={16} /></Link></Button></div></section>
  </div>;
}

type FieldContext = { soilType?: string; soilPh?: number; soilMoisture?: "dry" | "balanced" | "wet"; cropCount?: number; landArea?: number; landUnit?: "acres" | "hectares"; fieldNotes?: string };
type RecommendationProgress = { step: string; completed: boolean };
type ScanResult = { scanId: number; cropType: string; disease: string; riskLevel: string; confidence: number; assessment: string; symptoms: string[]; recommendations: string[]; fieldContext?: FieldContext | null; recommendationProgress?: RecommendationProgress[] };

export function buildRecommendationProgress(recommendations: string[]): RecommendationProgress[] {
  return recommendations.filter(Boolean).map((step) => ({ step, completed: false }));
}

export function formatFieldContext(context?: FieldContext | null) {
  if (!context) return [];
  return [
    context.soilType && `Soil: ${context.soilType}`,
    context.soilPh !== undefined && `pH ${context.soilPh}`,
    context.soilMoisture && `Moisture: ${context.soilMoisture}`,
    context.cropCount !== undefined && `${context.cropCount} crops/plants`,
    context.landArea !== undefined && `${context.landArea} ${context.landUnit ?? "land units"}`,
    context.fieldNotes && `Notes: ${context.fieldNotes}`,
  ].filter((item): item is string => Boolean(item));
}

export function formatGpsLabel(latitude?: number | string | null, longitude?: number | string | null) {
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null || latitude === "" || longitude === "") return "No GPS coordinates captured";
  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}

export function parseRecommendationProgress(raw?: string | null): RecommendationProgress[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is RecommendationProgress => Boolean(item && typeof item.step === "string" && typeof item.completed === "boolean"));
  } catch {
    return [];
  }
}

type ExpertRecord = { id: number; name: string; phone?: string | null; email?: string | null; qualification?: string | null; specialization?: string | null; organization?: string | null; experienceYears?: number | null; state?: string | null; district?: string | null; pinCode?: string | null; address?: string | null; availability?: string | null; status: string };

function ExpertContactCard({ expert }: { expert: ExpertRecord }) {
  const location = [expert.district, expert.state].filter(Boolean).join(", ") || "Location not provided";
  const callHref = getExpertContactHref(expert, "call");
  const messageHref = getExpertContactHref(expert, "message");
  return <article className="expert-contact-card"><div className="expert-avatar">{getUserInitials(expert.name)}</div><div className="expert-contact-main"><div className="expert-contact-heading"><div><h3>{expert.name}</h3><p>{expert.specialization || "Agricultural expert"}{expert.organization ? ` · ${expert.organization}` : ""}</p></div><StatusChip>{expert.status}</StatusChip></div><div className="expert-contact-meta"><span><MapPin size={14} /> {location}</span>{expert.availability && <span>{expert.availability}</span>}{expert.phone && <span><PhoneCall size={14} /> {expert.phone}</span>}{expert.email && <span><MessageCircle size={14} /> {expert.email}</span>}</div>{expert.address && <small>{expert.address}</small>}<div className="expert-contact-actions">{callHref && <a className="contact-action" href={callHref}><PhoneCall size={15} /> Call</a>}{messageHref && <a className="contact-action contact-action-primary" href={messageHref}><MessageCircle size={15} /> Message</a>}</div></div></article>;
}

function NearbyExperts({ state, district }: { state?: string | null; district?: string | null }) {
  const experts = trpc.farmer.verifiedExperts.useQuery({ state: state || undefined, district: district || undefined });
  return <section className="surface-card nearby-experts"><div className="section-heading"><div><p className="eyebrow">FIELD SUPPORT</p><h2>Verified experts near your area</h2></div><Stethoscope size={20} /></div><p className="nearby-experts-intro">If you want a second opinion, these verified contacts are ordered by your saved district and state.</p>{experts.isLoading ? <div className="empty-state compact-empty"><RefreshCw className="spin" size={20} /><p>Finding verified experts…</p></div> : experts.isError ? <EmptyState title="Experts unavailable" detail="The expert directory could not be loaded right now." action={<Button variant="outline" onClick={() => experts.refetch()}>Retry</Button>} /> : experts.data?.length ? <div className="expert-contact-list">{experts.data.slice(0, 3).map((expert) => <ExpertContactCard key={expert.id} expert={expert} />)}</div> : <EmptyState title="No verified experts yet" detail="Verified expert contacts will appear here after an administrator approves them." />}</section>;
}

function ScanFlow({ onComplete, canAnalyze }: { onComplete: (scanId: number) => void; canAnalyze: boolean }) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"start" | "preparing" | "preview" | "analyzing" | "result">("start");
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [mimeType, setMimeType] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [selectedCropId, setSelectedCropId] = useState("");
  const [fieldContext, setFieldContext] = useState<FieldContext>({});
  const [showContext, setShowContext] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState<RecommendationProgress[]>([]);
  const cropOptions = trpc.farmer.crops.useQuery(undefined, { enabled: canAnalyze });
  const snapshot = trpc.farmer.snapshot.useQuery(undefined, { enabled: canAnalyze });
  const analyze = trpc.farmer.analyzeScan.useMutation();
  const updateProgress = trpc.farmer.updateRecommendationProgress.useMutation();
  const hasContext = Object.values(fieldContext).some((value) => value !== undefined && value !== "");
  const updateContext = <K extends keyof FieldContext>(key: K, value: FieldContext[K]) => setFieldContext((current) => ({ ...current, [key]: value }));

  const chooseFile = async (file?: File) => {
    if (!file) return;
    const validationError = validateCropImage(file);
    if (validationError) { toast.error(validationError); return; }
    setStep("preparing");
    setFileName(file.name);
    try {
      const sourceUrl = URL.createObjectURL(file);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        URL.revokeObjectURL(sourceUrl);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
        canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) { setStep("start"); toast.error("Your browser could not prepare the image. Please try another photo."); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
        setPreviewUrl(dataUrl);
        setImageBase64(dataUrl);
        setMimeType("image/jpeg");
        setStep("preview");
      };
      image.onerror = () => { URL.revokeObjectURL(sourceUrl); setStep("start"); toast.error("The image could not be prepared for analysis. Please try another photo."); };
      image.src = sourceUrl;
    } catch (error) {
      setStep("start");
      toast.error(error instanceof Error ? error.message : "The image could not be prepared. Please try again.");
    }
  };

  const resetScan = () => { setStep("start"); setResult(null); setProgress([]); setFileName(""); setPreviewUrl(""); setImageBase64(""); setSelectedCropId(""); setFieldContext({}); setShowContext(true); };
  const skipContext = () => { setFieldContext({}); setShowContext(false); toast.info("Analysis will use the crop image only. You can add details on your next scan."); };
  const beginAnalysis = async () => {
    if (!canAnalyze) { toast.error("Sign in to run a real crop analysis."); return; }
    setStep("analyzing");
    try {
      const assessment = await analyze.mutateAsync({ imageBase64, mimeType, fileName, cropId: selectedCropId ? Number(selectedCropId) : undefined, fieldContext: hasContext ? fieldContext : undefined });
      const nextProgress = buildRecommendationProgress(assessment.recommendations ?? []);
      setProgress(nextProgress);
      setResult({ ...assessment, recommendationProgress: nextProgress });
      setStep("result");
    } catch (error) {
      setStep("preview");
      const message = error instanceof Error ? error.message : "The scan could not be completed. Please try again.";
      toast.error(message, { duration: 9000 });
    }
  };
  const toggleRecommendation = async (index: number) => {
    if (!result) return;
    const previous = progress;
    const next = progress.map((item, itemIndex) => itemIndex === index ? { ...item, completed: !item.completed } : item);
    setProgress(next);
    setResult({ ...result, recommendationProgress: next });
    if (!result.scanId) return;
    try {
      await updateProgress.mutateAsync({ scanId: result.scanId, progress: next });
      toast.success(next[index]?.completed ? "Step marked complete" : "Step moved back to pending");
    } catch {
      setProgress(previous);
      setResult({ ...result, recommendationProgress: previous });
      toast.error("The recommendation progress could not be saved.");
    }
  };

  if (step === "preparing") return <div className="scan-state centered"><div className="spinner"><RefreshCw size={30} /></div><p className="eyebrow">PREPARING PHOTO</p><h1>Optimizing your image</h1><p>We are resizing the image securely so analysis stays fast on mobile data.</p></div>;
  if (step === "analyzing") return <div className="scan-state centered"><div className="spinner"><RefreshCw size={30} /></div><p className="eyebrow">AI SCAN ANALYSIS</p><h1>Understanding your crop</h1><p>We’re reviewing the image and preparing practical guidance for your field.</p><div className="progress-steps"><span className="done"><Check size={14} /> Uploading image</span><span className="active"><Activity size={14} /> Checking visible symptoms</span><span>Preparing recommendations</span><span>Saving scan history</span></div></div>;
  if (step === "result" && result) {
    const profile = snapshot.data?.profile;
    const fallbackSteps = getScanNextSteps(result.riskLevel, result.disease);
    const recommendations = result.recommendations?.length ? result.recommendations : fallbackSteps;
    const resultProgress = progress.length ? progress : buildRecommendationProgress(recommendations);
    const completedCount = resultProgress.filter((item) => item.completed).length;
    const contextSummary = formatFieldContext(result.fieldContext);
    return <div className="page-stack scan-results">
      <div className="result-banner"><Check size={22} /><div><p className="eyebrow">SCAN COMPLETE</p><h1>Your assessment is ready</h1><p>This result is saved in Scan History. Mark the steps you complete so your follow-up stays organized.</p></div></div>
      <section className="surface-card result-card">
        <div className="result-top"><div><StatusChip tone={result.riskLevel === "high" || result.riskLevel === "critical" ? "high" : result.riskLevel === "medium" ? "medium" : "healthy"}>{result.riskLevel.toUpperCase()} RISK</StatusChip><h2>{result.cropType || "Crop"} assessment</h2><p className="diagnosis-line"><b>Diagnosis:</b> {result.disease || "No disease identified"}</p><p>AI guidance is based on the uploaded image{contextSummary.length ? " and your optional field details" : " only"}.</p></div><div className="confidence"><strong>{result.confidence}%</strong><span>CONFIDENCE</span></div></div>
        <div className="result-grid"><div><span className="eyebrow">WHAT WE NOTICED</span><p>{result.symptoms?.join(" ") || result.assessment}</p></div><div><span className="eyebrow">ASSESSMENT SUMMARY</span><p>{result.assessment || "Structured crop assessment available."}</p></div></div>
        {contextSummary.length > 0 && <div className="context-summary"><div><p className="eyebrow">FIELD CONTEXT USED</p><h3>Your details help tailor the guidance</h3></div><div className="context-summary-list">{contextSummary.map((item) => <span key={item}>{item}</span>)}</div></div>}
        <section className="recommendation-tracker"><div className="tracker-heading"><div><p className="eyebrow">RECOMMENDATIONS & FOLLOW-UP</p><h3>Work through the next steps</h3><p>Tap each step when you have completed it in the field.</p></div><strong>{completedCount}/{resultProgress.length}<small>COMPLETE</small></strong></div><div className="tracker-progress"><span style={{ width: `${resultProgress.length ? (completedCount / resultProgress.length) * 100 : 0}%` }} /></div><div className="recommendation-list">{resultProgress.map((item, index) => <button type="button" className={`recommendation-step${item.completed ? " completed" : ""}`} aria-pressed={item.completed} key={`${item.step}-${index}`} onClick={() => void toggleRecommendation(index)}><span className="recommendation-check">{item.completed ? <Check size={16} /> : index + 1}</span><span className="recommendation-step-copy"><b>{item.step}</b><small>{item.completed ? "Completed by you" : "Tap to mark complete"}</small></span><ChevronRight size={17} /></button>)}</div><div className="safety-note"><ShieldCheck size={16} /><span>Follow product labels and local agricultural guidance before applying any treatment. Contact a verified expert if symptoms spread or the crop is under severe stress.</span></div></section>
        <div className="scan-result-actions"><Button onClick={() => onComplete(result.scanId)} disabled={!result.scanId}><ClipboardList size={17} /> Save to Cases</Button><Button variant="outline" onClick={resetScan}><Camera size={16} /> Scan another crop</Button><Button variant="ghost" asChild><Link href="/farmer/scans">Open Scan History <ChevronRight size={16} /></Link></Button></div>
      </section>
      <NearbyExperts state={profile?.state} district={profile?.district} />
    </div>;
  }
  return <div className="page-stack scan-page"><button className="back-link scan-back" type="button" onClick={() => navigate("/farmer/dashboard")}>← Back to dashboard</button><section className="scan-intro"><div className="scan-orb"><Camera size={34} /></div><p className="eyebrow">CROP HEALTH SCAN</p><h1>Get a clear read on your crop</h1><p>Take a focused photo of a leaf, stem, or affected area. We’ll return an assessment, practical next steps, and support options.</p></section>{step === "start" ? <section className="surface-card upload-stage"><div className="upload-stage-heading"><div className="step-number">01</div><div><p className="eyebrow">START WITH A PHOTO</p><h2>Choose how to add your crop image</h2><p>Use natural light and keep the affected area in focus.</p></div></div><div className="upload-options"><label className="upload-card primary-upload"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onClick={(e) => { e.currentTarget.value = ""; }} onChange={(e) => void chooseFile(e.target.files?.[0])} /><span className="upload-card-icon"><Camera size={23} /></span><b>Take a photo</b><span>Open your device camera</span></label><label className="upload-card"><input type="file" accept="image/jpeg,image/png,image/webp" onClick={(e) => { e.currentTarget.value = ""; }} onChange={(e) => void chooseFile(e.target.files?.[0])} /><span className="upload-card-icon"><CloudUpload size={23} /></span><b>Upload from gallery</b><span>Choose an existing image</span></label></div><div className="upload-checklist"><span><Check size={15} /> One crop per photo</span><span><Check size={15} /> Leaf or stem fills the frame</span><span><Check size={15} /> JPEG, PNG, or WebP · max 12 MB</span></div></section> : <section className="surface-card preview-card"><div className="preview-card-heading"><div><p className="eyebrow">STEP 02 · REVIEW PHOTO</p><h2>Is this image ready?</h2><p>Make sure the affected crop area is clearly visible before analysis.</p></div><button className="icon-button" type="button" onClick={resetScan} aria-label="Replace image"><X size={18} /></button></div><div className="preview-placeholder">{previewUrl ? <img className="preview-image" src={previewUrl} alt="Selected crop" /> : <Leaf size={54} />}</div><div className="photo-ready"><div className="photo-ready-icon"><Check size={17} /></div><div><b>Photo ready to review</b><span>Check focus, lighting, and that the affected area is visible.</span></div></div><div className="preview-file"><span className="file-badge"><Leaf size={16} /></span><div><b>{fileName}</b><small>Resized securely for faster analysis</small></div></div>{cropOptions.data?.length ? <label className="scan-crop-select">Link to a crop record <span className="optional-label">optional</span><select value={selectedCropId} onChange={(event) => setSelectedCropId(event.target.value)}><option value="">Choose a crop</option>{cropOptions.data.map((crop) => <option value={crop.id} key={crop.id}>{crop.name} · {crop.cropType}</option>)}</select></label> : <div className="scan-note"><Leaf size={16} /><span>No crop records yet. You can still analyze this photo and save the result to Cases.</span></div>}<div className="field-context-panel"><div className="context-panel-heading"><div><p className="eyebrow">STEP 03 · OPTIONAL FIELD DETAILS</p><h3>Give the analysis more context</h3><p>Soil and farm details help tailor treatment and prevention advice. You can skip this step.</p></div><button type="button" className="context-toggle" onClick={() => setShowContext((current) => !current)}>{showContext ? "Hide details" : "Add details"}</button></div>{showContext ? <><div className="context-form-grid"><label>Soil type <span className="optional-label">optional</span><Input value={fieldContext.soilType ?? ""} onChange={(event) => updateContext("soilType", event.target.value || undefined)} placeholder="e.g. sandy loam" /></label><label>Soil pH <span className="optional-label">optional</span><Input type="number" min="0" max="14" step="0.1" value={fieldContext.soilPh ?? ""} onChange={(event) => updateContext("soilPh", event.target.value ? Number(event.target.value) : undefined)} placeholder="0–14" /></label><label>Soil moisture <span className="optional-label">optional</span><select value={fieldContext.soilMoisture ?? ""} onChange={(event) => updateContext("soilMoisture", (event.target.value || undefined) as FieldContext["soilMoisture"])}><option value="">Choose moisture</option><option value="dry">Dry</option><option value="balanced">Balanced</option><option value="wet">Wet</option></select></label><label>Number of crops / plants <span className="optional-label">optional</span><Input type="number" min="1" step="1" value={fieldContext.cropCount ?? ""} onChange={(event) => updateContext("cropCount", event.target.value ? Number(event.target.value) : undefined)} placeholder="e.g. 120" /></label><label>Land area <span className="optional-label">optional</span><Input type="number" min="0" step="0.01" value={fieldContext.landArea ?? ""} onChange={(event) => updateContext("landArea", event.target.value ? Number(event.target.value) : undefined)} placeholder="e.g. 2.5" /></label><label>Unit <span className="optional-label">optional</span><select value={fieldContext.landUnit ?? "acres"} onChange={(event) => updateContext("landUnit", event.target.value as FieldContext["landUnit"])}><option value="acres">Acres</option><option value="hectares">Hectares</option></select></label></div><label className="context-notes">What have you noticed? <span className="optional-label">optional</span><Textarea value={fieldContext.fieldNotes ?? ""} onChange={(event) => updateContext("fieldNotes", event.target.value || undefined)} placeholder="Describe when it started, how it is spreading, or anything you already tried." rows={3} /></label><button type="button" className="skip-context-button" onClick={skipContext}>Skip field details and analyze from the image</button></> : <div className="context-skipped"><Check size={16} /><span>Field details skipped. The analysis will use the image only.</span></div>}</div><div className="button-row scan-actions"><Button variant="outline" onClick={resetScan}><X size={16} /> Replace photo</Button><Button onClick={() => void beginAnalysis()} disabled={analyze.isPending || !canAnalyze}>{analyze.isPending ? "Analyzing…" : canAnalyze ? hasContext ? "Analyze with details" : "Analyze image" : "Sign in to analyze"} <ArrowRight size={16} /></Button></div></section>}</div>;
  }

function ExpertsPage({ admin = false }: { admin?: boolean }) {
  const profile = trpc.farmer.snapshot.useQuery(undefined, { enabled: !admin });
  const farmerQuery = trpc.farmer.verifiedExperts.useQuery({ state: profile.data?.profile?.state || undefined, district: profile.data?.profile?.district || undefined }, { enabled: !admin });
  const adminQuery = trpc.admin.experts.useQuery(undefined, { enabled: admin });
  const create = trpc.admin.createExpert.useMutation({ onSuccess: () => adminQuery.refetch() });
  const setStatus = trpc.admin.setExpertStatus.useMutation({ onSuccess: () => adminQuery.refetch() });
  const [name, setName] = useState(""); const [specialization, setSpecialization] = useState(""); const [organization, setOrganization] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); const [state, setState] = useState(""); const [district, setDistrict] = useState(""); const [availability, setAvailability] = useState("");
  const list = admin ? adminQuery.data ?? [] : farmerQuery.data ?? [];
  const resetExpertForm = () => { setName(""); setSpecialization(""); setOrganization(""); setPhone(""); setEmail(""); setState(""); setDistrict(""); setAvailability(""); };
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">{admin ? "ADMINISTRATION" : "FIELD SUPPORT"}</p><h1>{admin ? "Expert Management" : "Verified Agricultural Experts"}</h1><p>{admin ? "Register, verify, reject, or suspend agricultural experts." : "Only verified contacts are shown, ordered by your saved district and state."}</p></div>{admin && <form className="entity-form entity-form-wide surface-card" onSubmit={async (event) => { event.preventDefault(); try { await create.mutateAsync({ name, specialization, organization, phone: phone || undefined, email: email || undefined, state: state || undefined, district: district || undefined, availability: availability || undefined }); resetExpertForm(); toast.success("Expert registered for review"); } catch { toast.error("Expert could not be registered"); } }}><div className="entity-form-grid"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Expert name" required /><Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Specialization" /><Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Organization" /><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" /><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" /><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" /><Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" /><Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Availability" /></div><Button type="submit" disabled={create.isPending}>{create.isPending ? "Registering…" : "Register expert"}</Button></form>}<section className="directory-list">{(admin ? adminQuery.isLoading : farmerQuery.isLoading) ? <div className="empty-state"><RefreshCw className="spin" size={22} /><p>Finding verified experts…</p></div> : (admin ? adminQuery.isError : farmerQuery.isError) ? <EmptyState title="Experts unavailable" detail="The expert directory could not be loaded." action={<Button onClick={() => (admin ? adminQuery.refetch() : farmerQuery.refetch())}>Retry</Button>} /> : list.length ? list.map((expert) => admin ? <article className="directory-card" key={expert.id}><div className="expert-avatar">{getUserInitials(expert.name)}</div><div className="directory-card-main"><h3>{expert.name}</h3><p>{expert.specialization || "Crop health specialist"}{expert.organization ? ` · ${expert.organization}` : ""}</p><p className="directory-contact-line">{[expert.district, expert.state].filter(Boolean).join(", ") || "Location not provided"}{expert.phone ? ` · ${expert.phone}` : ""}</p><StatusChip tone={expert.status === "verified" ? "healthy" : expert.status === "suspended" || expert.status === "rejected" ? "high" : "medium"}>{expert.status}</StatusChip></div><div className="button-row"><Button size="sm" onClick={() => setStatus.mutate({ id: expert.id, status: "verified" })}>Verify</Button><Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: expert.id, status: "rejected" })}>Reject</Button><Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: expert.id, status: "suspended" })}>Suspend</Button></div></article> : <ExpertContactCard key={expert.id} expert={expert} />) : <EmptyState title={admin ? "No experts registered" : "No verified experts nearby"} detail={admin ? "Register the first expert to start the approval queue." : "Verified expert contacts will appear after administrative approval."} />}</section></div>;
}

function StoresPage({ admin = false }: { admin?: boolean }) {
  const farmerQuery = trpc.farmer.approvedDrugStores.useQuery(undefined, { enabled: !admin });
  const adminQuery = trpc.admin.drugStores.useQuery(undefined, { enabled: admin });
  const create = trpc.admin.createDrugStore.useMutation({ onSuccess: () => adminQuery.refetch() });
  const setStatus = trpc.admin.setDrugStoreStatus.useMutation({ onSuccess: () => adminQuery.refetch() });
  const [name, setName] = useState(""); const [address, setAddress] = useState(""); const [phone, setPhone] = useState(""); const [licenseInfo, setLicenseInfo] = useState("");
  const list = admin ? adminQuery.data ?? [] : farmerQuery.data ?? [];
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">{admin ? "ADMINISTRATION" : "FIELD SERVICES"}</p><h1>{admin ? "Drug Store Management" : "Verified Agricultural Drug Stores"}</h1><p>{admin ? "Register and moderate stores before they are shown as verified." : "Find agricultural stores approved by CropShield administrators."}</p></div>{admin && <form className="entity-form surface-card" onSubmit={async (event) => { event.preventDefault(); try { await create.mutateAsync({ name, address, phone, licenseInfo }); setName(""); setAddress(""); setPhone(""); setLicenseInfo(""); toast.success("Store registered for review"); } catch { toast.error("Store could not be registered"); } }}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Store name" required /><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" required /><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" /><Input value={licenseInfo} onChange={(e) => setLicenseInfo(e.target.value)} placeholder="License / registration information" /><Button type="submit" disabled={create.isPending}>{create.isPending ? "Registering…" : "Register store"}</Button></form>}<section className="directory-list">{(admin ? adminQuery.isLoading : farmerQuery.isLoading) ? <div className="empty-state"><RefreshCw className="spin" size={22} /><p>Finding verified stores…</p></div> : (admin ? adminQuery.isError : farmerQuery.isError) ? <EmptyState title="Stores unavailable" detail="The store directory could not be loaded." action={<Button onClick={() => (admin ? adminQuery.refetch() : farmerQuery.refetch())}>Retry</Button>} /> : list.length ? list.map((store) => <article className="directory-card" key={store.id}><div className="avatar avatar-green"><Store size={20} /></div><div><h3>{store.name}</h3><p>{store.address}</p><StatusChip tone={store.status === "approved" ? "healthy" : store.status === "suspended" || store.status === "rejected" ? "high" : "medium"}>{store.status === "approved" ? "Verified Store" : store.status}</StatusChip></div>{admin && <div className="button-row"><Button size="sm" onClick={() => setStatus.mutate({ id: store.id, status: "approved" })}>Approve</Button><Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: store.id, status: "rejected" })}>Reject</Button><Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: store.id, status: "suspended" })}>Suspend</Button></div>}</article>) : <EmptyState title={admin ? "No stores registered" : "No verified stores nearby"} detail={admin ? "Register an agricultural store to start the approval queue." : "Approved stores will appear after administrative review."} />}</section></div>;
}

function AdminDashboard({ isLive = false }: { isLive?: boolean }) {
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: isLive });
  const { data } = overview;
  const totals = data?.totals;
  if (isLive && overview.isLoading) return <div className="app-loading"><Logo /><RefreshCw className="spin" size={22} /><p>Loading system overview…</p></div>;
  if (isLive && overview.isError) return <div className="page-stack"><EmptyState title="Overview unavailable" detail="Approved system insights could not be loaded." action={<Button onClick={() => overview.refetch()}>Retry</Button>} /></div>;

  return <div className="page-stack"><WeatherWidget /><section className="admin-title"><p className="eyebrow">SYSTEM OVERVIEW & DIAGNOSTICS</p><h1>Admin Panel</h1><p>Approved insights from the CropShield network.</p></section><div className="metric-grid"><div className="metric-card"><Users size={19} /><span>+12%</span><p>TOTAL FARMERS</p><strong>{totals ? totals.farmers.toLocaleString() : "—"}</strong></div><div className="metric-card"><FileSearch size={19} /><span>+5%</span><p>TOTAL SCANS</p><strong>{totals ? totals.scans.toLocaleString() : "—"}</strong></div></div><section className="risk-card"><div><AlertTriangle size={24} /><p className="eyebrow">HIGH-RISK CASES</p><strong>{totals ? totals.highRisk.toLocaleString() : "—"}</strong></div><p>Requires immediate attention</p><Link href="/admin/cases">View all <ArrowRight size={16} /></Link></section><section className="surface-card map-card"><div className="section-heading"><h2>Regional Risk Map</h2><MapPin size={20} /></div><div className="map-placeholder"><div className="map-grid"><span /><span /><span /><span /><span /></div><div className="map-dot dot-a" /><div className="map-dot dot-b" /><div className="map-dot dot-c" /></div>{data?.regions?.length ? data.regions.slice(0, 3).map((region) => <div className="region-row" key={region.region ?? "unknown"}><span>{region.region ?? "Unspecified region"}</span><StatusChip>{Number(region.count)} approved crops</StatusChip></div>) : <EmptyState title="No approved regional data" detail="Regional summaries will appear after approved crop records are available." />}</section><section><div className="section-heading"><h2>Recent Activity</h2><Button variant="ghost" onClick={() => toast.info("Activity filters are ready for approved records.")}><Filter size={16} /> Filter</Button></div>{data?.recentScans?.length ? <div className="activity-list">{data.recentScans.slice(0, 3).map((scan) => <div key={scan.id}><div className={`activity-icon ${scan.riskLevel === "high" ? "danger" : "mint"}`}>{scan.riskLevel === "high" ? <AlertTriangle size={17} /> : <Sprout size={17} />}</div><p><b>{scan.riskLevel === "high" ? "High-risk scan detected" : "Approved scan logged"}</b><span>{scan.assessment || "Structured crop assessment available."}</span><small>{new Date(scan.createdAt).toLocaleString()} · Approved insight</small></p></div>)}</div> : <section className="surface-card"><EmptyState title="No approved activity" detail="Approved scan activity will appear here after review." /></section>}</section></div>;
}

function LocationWeather({ latitude, longitude }: { latitude?: string | null; longitude?: string | null }) {
  const hasCoords = Boolean(latitude && longitude);
  const weather = trpc.weather.current.useQuery({ latitude: Number(latitude), longitude: Number(longitude) }, { enabled: hasCoords });
  const current = weather.data?.current;
  if (!hasCoords) return <small className="location-weather unavailable">Weather unavailable · add GPS coordinates to a farmer profile</small>;
  if (weather.isLoading) return <small className="location-weather">Fetching group weather…</small>;
  if (weather.isError || !current) return <small className="location-weather unavailable">Weather unavailable for this location</small>;
  return <small className="location-weather">{current.temperature_2m ?? "—"}° · Humidity {current.relative_humidity_2m ?? "—"}% · Wind {current.wind_speed_10m ?? "—"} km/h</small>;
}

function Directory() {
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const directory = trpc.admin.farmerInsights.useQuery();
  const locations = trpc.admin.locationSummaries.useQuery();
  const setStatus = trpc.admin.setFarmerStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([directory.refetch(), locations.refetch()]);
      toast.success("Farmer account status updated");
    },
    onError: (error) => toast.error(error.message || "Account status could not be updated"),
  });
  const deleteFarmer = trpc.admin.deleteFarmer.useMutation({
    onSuccess: async () => {
      await Promise.all([directory.refetch(), locations.refetch()]);
      toast.success("Farmer account deleted");
    },
    onError: (error) => toast.error(error.message || "Farmer account could not be deleted"),
  });
  const { data } = directory;
  if (directory.isLoading || locations.isLoading) return <div className="app-loading"><Logo /><RefreshCw className="spin" size={22} /><p>Loading farmer risk groups…</p></div>;
  if (directory.isError || locations.isError) return <div className="page-stack"><EmptyState title="Directory unavailable" detail="Approved farmer location and risk data could not be loaded." action={<Button onClick={() => { directory.refetch(); locations.refetch(); }}>Retry</Button>} /></div>;
  const farmers = (data ?? []).map((entry) => ({ id: entry.user.id, name: entry.profile?.displayName ?? entry.user.name ?? "Unnamed farmer", place: [entry.profile?.state, entry.profile?.district, entry.profile?.region].filter(Boolean).join(" · ") || "Location not provided", crops: entry.crops.map((crop) => crop.name).join(", ") || "No crops recorded", risk: entry.riskLevel, latest: entry.latestScan, accountStatus: entry.user.accountStatus }));
  const filtered = farmers.filter((f) => (riskFilter === "all" || f.risk === riskFilter) && `${f.name} ${f.place} ${f.crops}`.toLowerCase().includes(query.toLowerCase()));
  const busyId = setStatus.isPending ? setStatus.variables?.id : deleteFarmer.isPending ? deleteFarmer.variables?.id : undefined;
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">ADMINISTRATION</p><h1>Farmer Directory</h1><p>Group farmers by location and identify high or critical risk records.</p></div><div className="search-field"><Search size={18} /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search farmers, state, district, or crop" /></div><section className="location-summary-grid">{(locations.data ?? []).map((location) => <article className="location-summary surface-card" key={location.location}><div className="section-heading"><h2>{location.location}</h2><MapPin size={17} /></div><p><b>{location.farmers}</b> farmers · <b>{location.scans}</b> approved scans</p><span>{location.crops.join(", ") || "No crops recorded"}</span><small>{location.diseases.length ? `Affected: ${location.diseases.join(", ")}` : "No affected diseases recorded"} · {location.highRisk} high/critical risk</small><LocationWeather latitude={location.latitude} longitude={location.longitude} /></article>)}</section><div className="filter-pills">{["all", "low", "medium", "high", "critical"].map((filter) => <button className={riskFilter === filter ? "active" : ""} key={filter} onClick={() => setRiskFilter(filter)}>{filter === "all" ? "All" : filter === "medium" ? "Moderate" : filter[0].toUpperCase() + filter.slice(1)}{filter !== "all" ? ` (${farmers.filter((farmer) => farmer.risk === filter).length})` : ` (${farmers.length})`}</button>)}</div><section className="directory-list">{filtered.length ? filtered.map((farmer) => <article className={`directory-card ${farmer.accountStatus === "disabled" ? "account-disabled" : ""}`} key={farmer.id}><div className="avatar avatar-green">{farmer.name.split(" ").map((x: string) => x[0]).join("")}</div><div className="directory-card-main"><div className="directory-card-heading"><div><h3>{farmer.name}</h3><p><MapPin size={14} /> {farmer.place}</p></div><StatusChip tone={farmer.accountStatus === "disabled" ? "high" : farmer.risk === "high" || farmer.risk === "critical" ? "high" : farmer.risk === "medium" ? "medium" : "healthy"}>{farmer.accountStatus === "disabled" ? "disabled" : `${farmer.risk} risk`}</StatusChip></div><span>{farmer.crops} · {farmer.latest ? `${farmer.latest.confidence ?? 0}% confidence` : "No approved scans"}</span><div className="account-actions" aria-label={`Account actions for ${farmer.name}`}><Button size="sm" variant="outline" disabled={busyId === farmer.id} onClick={() => { const next = farmer.accountStatus === "disabled" ? "active" : "disabled"; const action = next === "disabled" ? "disable" : "re-enable"; if (window.confirm(`Are you sure you want to ${action} ${farmer.name}?`)) setStatus.mutate({ id: farmer.id, accountStatus: next }); }}>{farmer.accountStatus === "disabled" ? <><UserCheck size={15} /> Re-enable</> : <><UserRoundCog size={15} /> Disable</>}</Button><Button size="sm" variant="outline" className="delete-account-button" disabled={busyId === farmer.id} onClick={() => { if (window.confirm(`Delete ${farmer.name} permanently? This removes the farmer profile, crops, scans, cases, and recommendations.`)) deleteFarmer.mutate({ id: farmer.id }); }}><Trash2 size={15} /> Delete</Button></div></div><ChevronRight size={20} /></article>) : <EmptyState title="No farmers found" detail="Try another search term or risk filter." />}</section></div>;
}

function Analytics() {
  const overview = trpc.admin.overview.useQuery();
  const { data } = overview;
  const totals = data?.totals;
  if (overview.isLoading) return <div className="app-loading"><Logo /><RefreshCw className="spin" size={22} /><p>Loading approved analytics…</p></div>;
  if (overview.isError) return <div className="page-stack"><EmptyState title="Analytics unavailable" detail="Approved analytics could not be loaded." action={<Button onClick={() => overview.refetch()}>Retry</Button>} /></div>;
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">SYSTEM INSIGHTS</p><h1>Global Analytics</h1><p>Calculated from approved records across the CropShield network.</p></div><div className="metric-grid four"><div className="metric-card"><Activity size={19} /><p>AI CONFIDENCE</p><strong>{totals ? `${totals.avgConfidence.toFixed(1)}%` : "—"}</strong></div><div className="metric-card"><AlertTriangle size={19} /><p>THREAT RATE</p><strong>{totals ? `${totals.scans ? ((totals.highRisk / totals.scans) * 100).toFixed(1) : "0.0"}%` : "—"}</strong></div><div className="metric-card"><FileSearch size={19} /><p>TOTAL SCANS</p><strong>{totals ? totals.scans.toLocaleString() : "—"}</strong></div><div className="metric-card"><ClipboardList size={19} /><p>OPEN CASES</p><strong>{totals ? totals.openCases.toLocaleString() : "—"}</strong></div></div><section className="surface-card chart-card"><div className="section-heading"><h2>Scans vs Cases Activity</h2><span className="chart-key"><i /> Scans <i className="brown" /> Cases</span></div><div className="bar-chart">{(data?.recentScans?.length ? data.recentScans.slice(0, 7).map((scan) => Math.max(18, Number(scan.confidence ?? 0))) : []).map((height, i) => <div key={i} className="bar-group"><div className="bar scans" style={{ height: `${height}%` }} /><div className="bar cases" style={{ height: `${height}%` }} /><small>{data?.recentScans?.[i] ? new Date(data.recentScans[i].createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</small></div>)}</div>{!data?.recentScans?.length && <p className="chart-empty">No approved scan activity is available for this period.</p>}</section><section className="surface-card"><div className="section-heading"><h2>Health Distribution</h2><Sprout size={20} /></div><div className="distribution"><div className="distribution-ring"><strong>{totals && data.distribution ? `${totals.scans ? Math.round((data.distribution.healthy / totals.scans) * 100) : 0}%` : "—"}</strong><span>Healthy</span></div><div className="legend"><span><i className="legend-green" />Healthy <b>{totals && data.distribution ? `${totals.scans ? Math.round((data.distribution.healthy / totals.scans) * 100) : 0}%` : "—"}</b></span><span><i className="legend-mint" />Action needed <b>{totals && data.distribution ? `${totals.scans ? Math.round((data.distribution.monitoring / totals.scans) * 100) : 0}%` : "—"}</b></span><span><i className="legend-red" />Critical <b>{totals && data.distribution ? `${totals.scans ? Math.round((data.distribution.critical / totals.scans) * 100) : 0}%` : "—"}</b></span></div></div></section></div>;
}

function CropList() {
  const { data, isLoading, isError, refetch } = trpc.farmer.crops.useQuery();
  const scans = trpc.farmer.scans.useQuery();
  const create = trpc.farmer.createCrop.useMutation({ onSuccess: () => refetch() });
  const [name, setName] = useState(""); const [cropType, setCropType] = useState(""); const [region, setRegion] = useState("");
  let body: React.ReactNode;
  if (isLoading || scans.isLoading) body = <div className="empty-state"><RefreshCw className="spin" size={22} /><p>Loading your crop portfolio…</p></div>;
  else if (isError || scans.isError) body = <EmptyState title="Crops unavailable" detail="We could not load your crop portfolio and latest assessments." action={<Button onClick={() => { refetch(); scans.refetch(); }}>Retry</Button>} />;
  else if (data?.length) body = <div className="crop-grid">{data.map((crop) => { const latest = scans.data?.find((scan) => scan.cropId === crop.id); const risk = latest?.riskLevel ?? (crop.status === "at_risk" ? "high" : crop.status === "monitoring" ? "medium" : "low"); return <article className="crop-card surface-card" key={crop.id}>{latest?.imageUrl ? <img src={latest.imageUrl} alt={`${crop.name} latest scan`} /> : <div className="crop-image-fallback"><Sprout size={28} /></div>}<div className="crop-card-content"><div className="crop-card-heading"><div><p className="eyebrow">{crop.cropType}</p><h3>{crop.name}</h3></div><StatusChip tone={risk === "high" || risk === "critical" ? "high" : risk === "medium" ? "medium" : "healthy"}>{risk} risk</StatusChip></div><p className="crop-location"><MapPin size={14} /> {crop.region || "Location not provided"}</p><div className="crop-report-meta"><span>Latest report</span><b>{latest ? `${latest.confidence ?? 0}% confidence` : "Not scanned yet"}</b></div>{latest && <p className="crop-report-summary"><b>{latest.disease || "No disease identified"}</b> · {latest.assessment || "Structured assessment available."}</p>}<div className="crop-card-footer"><small>{latest ? new Date(latest.createdAt).toLocaleDateString() : "Awaiting first scan"}</small><Button size="sm" variant="outline" asChild><Link href="/farmer/scan">{latest ? "Rescan" : "Scan crop"}</Link></Button></div></div></article>; })}</div>;
  else body = <EmptyState title="No crops yet" detail="Add your first crop record to begin monitoring field health." />;
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">FIELD PORTFOLIO</p><h1>My Crops</h1><p>Track the crops, latest reports, and field locations connected to your account.</p></div><section className="surface-card"><form className="crop-form" onSubmit={async (event) => { event.preventDefault(); try { await create.mutateAsync({ name, cropType, region: region || undefined }); setName(""); setCropType(""); setRegion(""); toast.success("Crop added to your portfolio"); } catch { toast.error("Crop could not be added"); } }}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Crop name" required /><Input value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="Crop type" required /><Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region (optional)" /><Button type="submit" disabled={create.isPending}>{create.isPending ? "Adding…" : "Add crop"}</Button></form>{body}</section></div>;
}

function ScanHistory() {
  const { data, isLoading, isError, refetch } = trpc.farmer.scans.useQuery();
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high" | "critical">("all");
  const filtered = useMemo(() => (data ?? []).filter((scan) => {
    const haystack = `${scan.disease ?? ""} ${scan.assessment ?? ""} ${scan.cropId ?? ""} ${scan.status}`.toLowerCase();
    return (riskFilter === "all" || scan.riskLevel === riskFilter) && haystack.includes(query.trim().toLowerCase());
  }), [data, query, riskFilter]);
  const tone = (risk: string) => risk === "high" || risk === "critical" ? "danger" : risk === "medium" ? "neutral" : "mint";
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">FIELD HISTORY</p><h1>Scan History</h1><p>Review every crop-health assessment created from your account, including the actions you have marked complete.</p></div><section className="surface-card"><div className="history-toolbar"><div className="search-field"><Search size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search diagnosis, crop, or status" /></div><div className="tab-row history-filters"><button className={riskFilter === "all" ? "active" : ""} onClick={() => setRiskFilter("all")}>All</button><button className={riskFilter === "low" ? "active" : ""} onClick={() => setRiskFilter("low")}>Low</button><button className={riskFilter === "medium" ? "active" : ""} onClick={() => setRiskFilter("medium")}>Medium</button><button className={riskFilter === "high" ? "active" : ""} onClick={() => setRiskFilter("high")}>High</button><button className={riskFilter === "critical" ? "active" : ""} onClick={() => setRiskFilter("critical")}>Critical</button><Button variant="ghost" onClick={() => refetch()}><RefreshCw size={15} /> Refresh</Button></div></div>{isLoading ? <div className="empty-state"><RefreshCw className="spin" size={22} /><p>Loading scan history…</p></div> : isError ? <EmptyState title="Scan history unavailable" detail="Your scan records could not be loaded." action={<Button onClick={() => refetch()}>Retry</Button>} /> : filtered.length ? <div className="activity-list history-list">{filtered.map((scan) => { const persistedProgress = parseRecommendationProgress(scan.recommendationProgress); const completed = persistedProgress.filter((item) => item.completed).length; return <details className="history-entry" key={scan.id}><summary><div className={`activity-icon ${tone(scan.riskLevel)}`}><FileSearch size={17} /></div><p><b>{scan.disease || (scan.cropId ? `Crop #${scan.cropId}` : "Crop scan")}</b><span>{scan.status} · {scan.riskLevel} risk · {scan.confidence ?? 0}% confidence</span><small>{new Date(scan.createdAt).toLocaleString()}</small></p><ChevronRight className="history-chevron" size={18} /></summary><div className="history-detail"><div><span className="eyebrow">ASSESSMENT</span><p>{scan.assessment || "No assessment summary was recorded."}</p></div><div><span className="eyebrow">OBSERVATIONS</span><p>{scan.symptoms ? (() => { try { return JSON.parse(scan.symptoms).join(" "); } catch { return scan.symptoms; } })() : "No observations recorded."}</p></div><div><span className="eyebrow">RECOMMENDED NEXT STEPS</span>{persistedProgress.length ? <div className="history-progress"><strong>{completed}/{persistedProgress.length} steps complete</strong>{persistedProgress.map((item) => <span className={item.completed ? "complete" : "pending"} key={item.step}>{item.completed ? "✓" : "○"} {item.step}</span>)}</div> : <p>{scan.recommendations ? (() => { try { return JSON.parse(scan.recommendations).join(" "); } catch { return scan.recommendations; } })() : "No recommendations recorded."}</p>}</div></div></details>; })}</div> : <EmptyState title={data?.length ? "No matching scans" : "No scans yet"} detail={data?.length ? "Try a different search term or risk filter." : "Start a crop scan to create your first health assessment."} action={data?.length ? undefined : <Button asChild><Link href="/farmer/scan">Start a scan</Link></Button>} />}</section></div>;
}

function ScanReview() {
  const { data, isLoading, isError, refetch } = trpc.admin.overview.useQuery();
  const scans = data?.recentScans ?? [];
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">REVIEW QUEUE</p><h1>Scan Review</h1><p>Review approved scan assessments and their risk classifications.</p></div><section className="surface-card">{isLoading ? <div className="empty-state"><RefreshCw className="spin" size={22} /><p>Loading approved scans…</p></div> : isError ? <EmptyState title="Scans unavailable" detail="We could not load approved scan records." action={<Button onClick={() => refetch()}>Retry</Button>} /> : scans.length ? <div className="activity-list">{scans.map((scan) => <div key={scan.id}><div className={`activity-icon ${scan.riskLevel === "high" ? "danger" : "mint"}`}><FileSearch size={17} /></div><p><b>{scan.cropId ? `Crop #${scan.cropId}` : "Crop scan"}</b><span>{scan.riskLevel ?? "unknown"} risk · {scan.confidence ?? 0}% confidence</span><small>{new Date(scan.createdAt).toLocaleString()}</small></p></div>)}</div> : <EmptyState title="No approved scans" detail="Approved scan assessments will appear here after review." />}</section></div>;
}

function CaseList({ admin = false }: { admin?: boolean }) {
  const farmerCases = trpc.farmer.cases.useQuery(undefined, { enabled: !admin });
  const adminCases = trpc.admin.cases.useQuery(undefined, { enabled: admin });
  const [caseFilter, setCaseFilter] = useState<"all" | "open" | "resolved">("all");
  const rows = admin ? adminCases.data : farmerCases.data;
  const loading = admin ? adminCases.isLoading : farmerCases.isLoading;
  const error = admin ? adminCases.isError : farmerCases.isError;
  const filteredRows = (rows ?? []).filter((item) => caseFilter === "all" || (caseFilter === "resolved" ? item.status === "resolved" : item.status !== "resolved"));
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">{admin ? "REVIEW QUEUE" : "CASE MANAGEMENT"}</p><h1>{admin ? "Case Review" : "My Cases"}</h1><p>{admin ? "Review approved case records and follow up on high-risk findings." : "Review your crop assessments, recommendations, and follow-up progress."}</p></div><div className="tab-row"><button className={caseFilter === "all" ? "active" : ""} onClick={() => setCaseFilter("all")}>All</button><button className={caseFilter === "open" ? "active" : ""} onClick={() => setCaseFilter("open")}>Open</button><button className={caseFilter === "resolved" ? "active" : ""} onClick={() => setCaseFilter("resolved")}>Resolved</button></div><section className="surface-card">{loading ? <div className="empty-state"><RefreshCw className="spin" size={22} /><p>Loading cases…</p></div> : error ? <EmptyState title="Cases unavailable" detail="We could not load case records. Please try again." action={<Button onClick={() => (admin ? adminCases.refetch() : farmerCases.refetch())}>Retry</Button>} /> : filteredRows.length ? <div className="activity-list">{filteredRows.map((item) => <div key={item.id}><div className={`activity-icon ${item.status === "resolved" ? "mint" : "danger"}`}><ClipboardList size={17} /></div><p><b>{item.reference}</b><span>{item.status === "resolved" ? "Resolved" : "Open case requiring follow-up"}</span><small>{new Date(item.createdAt).toLocaleString()} · {(() => { const progress = parseRecommendationProgress(item.recommendationProgress); return progress.length ? `${progress.filter((step) => step.completed).length}/${progress.length} steps complete` : "No checklist yet"; })()}</small></p></div>)}</div> : <EmptyState title={rows?.length ? "No cases in this view" : admin ? "No approved cases" : "No cases yet"} detail={rows?.length ? "Choose another case filter to see more records." : admin ? "Approved case records will appear here after review." : "Run a crop scan to create your first case."} action={!admin && !rows?.length ? <Button asChild><Link href="/farmer/scan">Start a scan</Link></Button> : undefined} />}</section></div>;
}

function SimpleList({ title, subtitle, admin = false }: { title: string; subtitle: string; admin?: boolean }) {
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">{admin ? "REVIEW QUEUE" : "CASE MANAGEMENT"}</p><h1>{title}</h1><p>{subtitle}</p></div><div className="tab-row"><button className="active">All</button><button>High Risk</button><button>Resolved</button></div><section className="surface-card"><EmptyState title="No additional records yet" detail="New approved records will appear here when activity is recorded in the system." action={admin ? <Button asChild><Link href="/admin/dashboard">Return to overview</Link></Button> : <Button asChild><Link href="/farmer/scan">Start a scan</Link></Button>} /></section></div>;
}

function LocalAuthPanel({ navigate }: { navigate: (path: string) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [detailsStep, setDetailsStep] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", region: "", state: "", district: "", pinCode: "", village: "", primaryCrop: "", farmingExperienceYears: "", latitude: "", longitude: "" });
  const [gpsState, setGpsState] = useState<"idle" | "detecting" | "saved" | "denied">("idle");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const signin = trpc.auth.signin.useMutation();
  const signup = trpc.auth.signup.useMutation();
  const busy = signin.isPending || signup.isPending;
  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const detectSignupLocation = () => {
    if (!navigator.geolocation) { setGpsState("denied"); return; }
    setGpsState("detecting");
    navigator.geolocation.getCurrentPosition((position) => {
      setForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }));
      setGpsState("saved");
      toast.success("GPS location captured. Save the account to keep it on your profile.");
    }, () => {
      setGpsState("denied");
      toast.info("GPS was unavailable. You can enter your address manually.");
    }, { enableHighAccuracy: false, timeout: 8000 });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    try {
      const result = mode === "signin" ? await signin.mutateAsync({ email: form.email, password: form.password }) : await signup.mutateAsync({ ...form, role, farmingExperienceYears: form.farmingExperienceYears ? Number(form.farmingExperienceYears) : undefined, latitude: form.latitude ? Number(form.latitude) : undefined, longitude: form.longitude ? Number(form.longitude) : undefined });
      try { sessionStorage.setItem("cropshield-local-session", result.sessionToken); } catch {}
      await utils.auth.me.invalidate();
      navigate(result.user.role === "admin" ? "/admin/dashboard" : "/farmer/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The account action could not be completed.");
    }
  };
  const chooseRole = (nextRole: "user" | "admin") => { setRole(nextRole); setError(""); setDetailsStep(true); };
  const roleName = role === "admin" ? "Administrator" : "Farmer";
  if (mode === "signup" && !detailsStep) return <section className="login-card role-choice-card"><div className="login-icon"><ShieldCheck size={24} /></div><p className="eyebrow">WELCOME TO CROPSHIELD</p><h2>Who are you signing in as?</h2><p>Choose your workspace first. We’ll only ask for the details needed to get you started.</p><div className="role-choice-list">{LOCAL_SIGNUP_ROLES.map((option) => <button className="role-choice" type="button" key={option.value} onClick={() => chooseRole(option.value)}><span className="role-choice-icon">{option.value === "admin" ? <UserRoundCog size={20} /> : <Sprout size={20} />}</span><span><b>{option.value === "admin" ? "I’m an administrator" : "I’m a farmer"}</b><small>{option.value === "admin" ? "Manage approvals, farmers, and field services" : "Monitor crops, scan images, and track cases"}</small></span><ChevronRight size={18} /></button>)}</div><button className="auth-switch" type="button" onClick={() => { setMode("signin"); setDetailsStep(true); setError(""); }}>Already have an account? Sign in</button></section>;
  return <section className="login-card details-card"><button className="back-link auth-back" type="button" onClick={() => { if (mode === "signup") setDetailsStep(false); else { setMode("signup"); setDetailsStep(false); } }}>← {mode === "signup" ? "Change workspace" : "Create a test account"}</button><div className="login-icon"><ShieldCheck size={24} /></div><p className="eyebrow">{mode === "signin" ? "LOCAL TEST ACCESS" : `${roleName.toUpperCase()} SETUP`}</p><h2>{mode === "signin" ? "Sign in to CropShield" : `Set up your ${roleName.toLowerCase()} workspace`}</h2><p>{mode === "signin" ? "Use an account saved in this test application's database." : role === "admin" ? "Administrator access is reserved for the configured owner account." : "Add the essentials now. You can complete your profile later."}</p><form className="auth-form" onSubmit={submit}>{mode === "signup" && <><div className="selected-role"><span className="role-choice-icon">{role === "admin" ? <UserRoundCog size={17} /> : <Sprout size={17} />}</span><div><small>WORKSPACE</small><b>{roleName}</b></div></div><label>Full name<Input required value={form.name} onChange={set("name")} placeholder="Your name" autoComplete="name" /></label>{role === "user" && <><label>Primary crop<Input required value={form.primaryCrop} onChange={set("primaryCrop")} placeholder="e.g. rice, wheat, tomato" /></label><div className="auth-grid compact-fields"><label>State<Input required value={form.state} onChange={set("state")} placeholder="State" /></label><label>District<Input required value={form.district} onChange={set("district")} placeholder="District" /></label></div><div className="signup-location-actions"><Button type="button" variant="outline" onClick={detectSignupLocation} disabled={gpsState === "detecting"}><MapPin size={16} /> {gpsState === "detecting" ? "Detecting location…" : gpsState === "saved" ? "GPS location captured" : "Use my GPS location"}</Button><span>{gpsState === "saved" ? formatGpsLabel(form.latitude, form.longitude) : "Optional: use GPS to save your coordinates"}</span></div><div className="auth-grid compact-fields"><label>PIN code <span className="optional-label">optional</span><Input value={form.pinCode} onChange={set("pinCode")} placeholder="PIN code" inputMode="numeric" /></label><label>Village / town <span className="optional-label">optional</span><Input value={form.village} onChange={set("village")} placeholder="Village or town" /></label></div></>}<label>Phone <span className="optional-label">optional</span><Input value={form.phone} onChange={set("phone")} placeholder="Phone number" autoComplete="tel" /></label></>}{mode === "signin" && <label>Email<Input required type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" /></label>}{mode === "signup" && <label>Email<Input required type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" /></label>}<label>Password<Input required type="password" minLength={mode === "signup" ? 8 : 1} value={form.password} onChange={set("password")} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<Button className="login-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : `Create ${roleName.toLowerCase()} account`} <ArrowRight size={17} /></Button></form><button className="auth-switch" type="button" onClick={() => { if (mode === "signin") { setMode("signup"); setDetailsStep(false); } else { setMode("signin"); setDetailsStep(true); } setError(""); }}>{mode === "signin" ? "Need a test account? Sign up" : "Already have an account? Sign in"}</button></section>;
}

function Profile({ role, logout, userId, userName }: { role: Role; logout: () => void; userId?: number; userName?: string | null }) {
  const snapshot = trpc.farmer.snapshot.useQuery(undefined, { enabled: Boolean(userId) });
  const [displayName, setDisplayName] = useState(userName || (role === "admin" ? "System Administrator" : "Farmer"));
  const [region, setRegion] = useState(""); const [state, setState] = useState(""); const [district, setDistrict] = useState(""); const [pinCode, setPinCode] = useState(""); const [village, setVillage] = useState(""); const [latitude, setLatitude] = useState(""); const [longitude, setLongitude] = useState(""); const [gpsState, setGpsState] = useState<"idle" | "detecting" | "denied" | "saved">("idle");
  useEffect(() => { if (snapshot.data?.profile) { setDisplayName(snapshot.data.profile.displayName); setRegion(snapshot.data.profile.region ?? ""); setState(snapshot.data.profile.state ?? ""); setDistrict(snapshot.data.profile.district ?? ""); setPinCode(snapshot.data.profile.pinCode ?? ""); setVillage(snapshot.data.profile.village ?? ""); setLatitude(String(snapshot.data.profile.latitude ?? "")); setLongitude(String(snapshot.data.profile.longitude ?? "")); } else if (userName) setDisplayName(userName); }, [snapshot.data?.profile, userName]);
  const update = trpc.farmer.updateProfile.useMutation();
  if (role === "farmer" && snapshot.isError) return <div className="page-stack"><EmptyState title="Profile unavailable" detail="Your saved profile could not be loaded." action={<Button onClick={() => snapshot.refetch()}>Retry</Button>} /></div>;
  return <div className="page-stack"><div className="admin-title"><p className="eyebrow">ACCOUNT</p><h1>Profile</h1><p>Manage your CropShield identity and notification preferences.</p></div><section className="surface-card profile-card"><div className="profile-header"><div className="avatar avatar-large">{getUserInitials(displayName)}</div><div><h2>{displayName}</h2><p>{role === "admin" ? "Administrator" : "Farmer"}</p></div></div><label>Display name<Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label><label>Region<Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Add your operating region" /></label><div className="location-actions"><Button type="button" variant="outline" onClick={() => { if (!navigator.geolocation) { setGpsState("denied"); return; } setGpsState("detecting"); navigator.geolocation.getCurrentPosition((position) => { setLatitude(position.coords.latitude.toFixed(6)); setLongitude(position.coords.longitude.toFixed(6)); setGpsState("saved"); toast.success("GPS coordinates captured; save your profile to persist them."); }, () => { setGpsState("denied"); toast.info("GPS was unavailable. Enter state, district, PIN, and village manually."); }, { enableHighAccuracy: false, timeout: 8000 }); }}>{gpsState === "detecting" ? "Detecting…" : "Use my GPS location"}</Button>{gpsState === "denied" && <small>GPS permission was unavailable. Manual location fields below are the fallback.</small>}</div><div className="location-fields"><label>State<Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" /></label><label>District<Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" /></label><label>PIN code<Input value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="PIN code" inputMode="numeric" /></label><label>Village / town<Input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Optional village or town" /></label></div><label>Role<Input value={role} readOnly /></label>{userId && <Button disabled={update.isPending} onClick={async () => { try { await update.mutateAsync({ displayName, region, state, district, pinCode, village, latitude: latitude ? Number(latitude) : undefined, longitude: longitude ? Number(longitude) : undefined }); toast.success("Profile saved"); } catch { toast.error("Profile could not be saved"); } }}>{update.isPending ? "Saving…" : "Save profile"}</Button>}<Button onClick={() => { logout(); toast.success("You have been signed out"); }} variant="outline"><LogOut size={17} /> Sign out</Button></section></div>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [scanDone, setScanDone] = useState(false);
  const createCase = trpc.cases.create.useMutation();
  const role: Role = user?.role === "admin" ? "admin" : "farmer";
  const section = useMemo(() => getSection(location), [location]);
  useEffect(() => { if (!user) return; const intendedRole: Role = user.role === "admin" ? "admin" : "farmer"; const isAdminPath = location.startsWith("/admin"); if ((intendedRole === "admin") !== isAdminPath && location !== "/") navigate(`/${intendedRole}/dashboard`); }, [location, navigate, user]);
  useEffect(() => { if (!loading && !user && location !== "/") navigate("/"); }, [loading, location, navigate, user]);
  if (loading) return <div className="app-loading"><Logo /><RefreshCw className="spin" size={22} /><p>Loading your local test session…</p></div>;
  if (!isAuthenticated && !user) return <main className="login-page"><div className="login-brand"><Logo /><span>4.0 TEST MODE</span></div><div className="login-layout"><div className="login-copy"><p className="eyebrow">LOCAL AGRITECH TEST PLATFORM</p><h1>Know your crops.<br /><span>Grow with confidence.</span></h1><p>CropShield brings crop monitoring and actionable health intelligence into one calm, field-ready workspace.</p><div className="login-trust"><ShieldCheck size={20} /><span>Local test accounts and private crop records</span></div></div><LocalAuthPanel navigate={navigate} /></div><footer><ShieldCheck size={15} /> Test accounts are stored in this project database.</footer></main>;
  const go = (id: Section) => navigate(`/${role}/${id}`);
  const content = role === "admin" ? (section === "dashboard" ? <AdminDashboard isLive={Boolean(user)} /> : section === "farmers" ? <Directory /> : section === "analytics" ? <Analytics /> : section === "profile" ? <Profile role={role} logout={logout} userId={user?.id} userName={user?.name} /> : section === "scans" ? <ScanReview /> : section === "experts" ? <ExpertsPage admin /> : section === "stores" ? <StoresPage admin /> : section === "cases" ? <CaseList admin /> : <SimpleList admin title="Review Queue" subtitle="Review approved records and follow up on high-risk findings." />) : (section === "dashboard" ? <FarmerDashboard onScan={() => go("scan")} user={user} /> : section === "scan" ? <ScanFlow canAnalyze={Boolean(user)} onComplete={async (scanId) => { if (!user) { toast.error("Sign in to save a case."); return; } try { await createCase.mutateAsync({ scanId, reference: `CS-${Date.now().toString().slice(-6)}` }); setScanDone(true); go("cases"); toast.success("Scan saved to your cases"); } catch { toast.error("The scan was analyzed, but the case could not be saved."); } }} /> : section === "crops" ? <CropList /> : section === "scans" ? <ScanHistory /> : section === "experts" ? <ExpertsPage /> : section === "stores" ? <StoresPage /> : section === "profile" ? <Profile role={role} logout={logout} userId={user?.id} userName={user?.name} /> : <CaseList />);
  return <main className="app-shell"><aside className="desktop-sidebar"><Logo /><nav>{nav.filter((item) => item.roles.includes(role)).map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => go(item.id)}><item.icon size={19} />{item.label}</button>)}</nav><div className="sidebar-footer"><button className="sign-out" onClick={logout}><LogOut size={17} /> Sign out</button></div></aside><div className="app-content"><header className="topbar"><button className="mobile-menu" onClick={() => toast.info("Use the bottom navigation to move between workspace sections.")}><Menu size={21} /></button><Logo compact /><div className="topbar-actions"><NetworkMode /><button aria-label="Notifications" onClick={() => toast.info("Notifications are shown here when a new approved alert is available.")}><Bell size={20} /></button><div className="avatar avatar-small">{getUserInitials(user?.name)}</div></div></header><div className="content-inner">{content}</div></div><nav className="mobile-nav">{nav.filter((item) => item.roles.includes(role)).map((item) => <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => go(item.id)}><item.icon size={19} /><span>{item.label === "Dashboard" ? "Dashboard" : item.label.replace("My ", "")}</span></button>)}{role === "farmer" && <button className="mobile-scan" onClick={() => go("scan")}><Camera size={20} /></button>}</nav></main>;
}
