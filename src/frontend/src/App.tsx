import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import {
  Activity,
  AlertTriangle,
  Baby,
  BarChart3,
  Bed,
  Bell,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileDown,
  FileSearch,
  HardDrive,
  History,
  Image,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Monitor,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Skull,
  Timer,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type {
  AppConfig,
  Department,
  DepartmentHead,
  ExternalForm,
  FieldValue,
  FormTemplate,
  Report,
} from "./backend.d";
import { useActor } from "./hooks/useActor";

// Local type for form field structure (fields serialized as JSON strings in backend)
interface FormField {
  name: string;
  fieldType: string;
  options: string[];
  required?: boolean;
}
// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const ADMIN_PIN = "786";

// ─────────────────────────────────────────────
// WA Config (stored in localStorage)
// ─────────────────────────────────────────────
interface WaConfig {
  phoneNumberId: string;
  accessToken: string;
  messageFormat: string;
}

// ─────────────────────────────────────────────
// LocalStorage Feature Interfaces
// ─────────────────────────────────────────────
interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

interface StatusHistoryEntry {
  status: string;
  changedAt: string;
  changedBy: string;
}

interface CommentEntry {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface FormVersionEntry {
  version: number;
  title: string;
  fields: string[];
  savedAt: string;
}

// ─────────────────────────────────────────────
// localStorage Helpers
// ─────────────────────────────────────────────
function logActivity(action: string, details: string, actor = "Admin") {
  try {
    const logs: ActivityEntry[] = JSON.parse(
      localStorage.getItem("thq_activity_log") || "[]",
    );
    logs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      actor,
      details,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(
      "thq_activity_log",
      JSON.stringify(logs.slice(0, 500)),
    );
  } catch {}
}

function getActivityLog(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem("thq_activity_log") || "[]");
  } catch {
    return [];
  }
}

function getDeadlines(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("thq_deadlines") || "{}");
  } catch {
    return {};
  }
}

function setDeadline(formId: string, deadline: string) {
  const d = getDeadlines();
  if (deadline) d[formId] = deadline;
  else delete d[formId];
  localStorage.setItem("thq_deadlines", JSON.stringify(d));
}

function getStatusHistory(reportId: string): StatusHistoryEntry[] {
  try {
    const all = JSON.parse(localStorage.getItem("thq_status_history") || "{}");
    return all[reportId] || [];
  } catch {
    return [];
  }
}

function addStatusHistory(reportId: string, entry: StatusHistoryEntry) {
  try {
    const all = JSON.parse(localStorage.getItem("thq_status_history") || "{}");
    if (!all[reportId]) all[reportId] = [];
    all[reportId].push(entry);
    localStorage.setItem("thq_status_history", JSON.stringify(all));
  } catch {}
}

function getReportStatus(reportId: string): string {
  const hist = getStatusHistory(reportId);
  if (hist.length === 0) return "Pending";
  return hist[hist.length - 1].status;
}

function getComments(reportId: string): CommentEntry[] {
  try {
    const all = JSON.parse(localStorage.getItem("thq_comments") || "{}");
    return all[reportId] || [];
  } catch {
    return [];
  }
}

function addComment(reportId: string, text: string) {
  try {
    const all = JSON.parse(localStorage.getItem("thq_comments") || "{}");
    if (!all[reportId]) all[reportId] = [];
    all[reportId].push({
      id: `${Date.now()}`,
      text,
      author: "Admin",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("thq_comments", JSON.stringify(all));
  } catch {}
}

function getFormVersions(formId: string): FormVersionEntry[] {
  try {
    const all = JSON.parse(localStorage.getItem("thq_form_versions") || "{}");
    return all[formId] || [];
  } catch {
    return [];
  }
}

function saveFormVersion(formId: string, title: string, fields: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem("thq_form_versions") || "{}");
    const existing = all[formId] || [];
    existing.push({
      version: existing.length + 1,
      title,
      fields,
      savedAt: new Date().toISOString(),
    });
    all[formId] = existing.slice(-10); // keep last 10
    localStorage.setItem("thq_form_versions", JSON.stringify(all));
  } catch {}
}

const MOCK_TIME_SERIES = [
  { time: "08:00", val: 15 },
  { time: "10:00", val: 30 },
  { time: "12:00", val: 45 },
  { time: "14:00", val: 38 },
  { time: "16:00", val: 22 },
  { time: "18:00", val: 55 },
];

const SEED_DEPARTMENTS = [
  { label: "Emergency", icon: "Activity", color: "text-rose-500", count: 12 },
  { label: "OPD", icon: "Users", color: "text-blue-400", count: 71 },
  { label: "Indoor", icon: "Bed", color: "text-emerald-400", count: 5 },
  { label: "Labour Room", icon: "Baby", color: "text-pink-400", count: 3 },
  { label: "X-Ray", icon: "Skull", color: "text-amber-400", count: 9 },
  {
    label: "Laboratory",
    icon: "FileSearch",
    color: "text-indigo-400",
    count: 24,
  },
];

const ICON_OPTIONS = [
  "Activity",
  "Users",
  "Bed",
  "Baby",
  "Skull",
  "FileSearch",
];
const COLOR_OPTIONS = [
  "text-rose-500",
  "text-blue-400",
  "text-emerald-400",
  "text-pink-400",
  "text-amber-400",
  "text-indigo-400",
  "text-purple-400",
  "text-cyan-400",
];

const FIELD_TYPES = ["text", "number", "dropdown", "checkbox", "date", "image"];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
  Activity,
  Camera,
  Users,
  Bed,
  Baby,
  Skull,
  FileSearch,
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <p className="text-rose-400 font-bold">
            Something went wrong loading this panel.
          </p>
          <p className="text-white/40 text-xs mt-2">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-emerald-500 text-black rounded-xl text-xs font-black uppercase"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DeptIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] || Activity;
  return <Icon className={className} />;
}

function parseFields(
  rawFields: string[],
): (FormField & { required?: boolean })[] {
  return rawFields.map((f) => {
    try {
      const parsed = JSON.parse(f);
      return parsed as FormField & { required?: boolean };
    } catch {
      return { name: f, fieldType: "text", options: [] };
    }
  });
}

function serializeFields(
  fields: (FormField & { required?: boolean })[],
): string[] {
  return fields.map((f) => JSON.stringify(f));
}

function formatDate(ts: bigint): string {
  const date = new Date(Number(ts) / 1_000_000);
  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ─────────────────────────────────────────────
// UI Primitives
// ─────────────────────────────────────────────
function Card({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[#151515] border border-white/5 rounded-[28px] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2">
      {children}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  maxLength,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
          {label}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm font-medium text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500 transition-all placeholder:text-white/20"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Session types
// ─────────────────────────────────────────────
type Session =
  | { type: "none" }
  | { type: "admin" }
  | { type: "deptHead"; head: DepartmentHead };

type AdminTab =
  | "TV"
  | "DEPT"
  | "REPORTS"
  | "FORMS"
  | "CONFIG"
  | "NOTIFY"
  | "LOGS";
type DeptTab = "MY_DEPT" | "MY_REPORTS";

// ─────────────────────────────────────────────
// Login Screen
// ─────────────────────────────────────────────
function LoginScreen({
  onLogin,
  actor,
}: {
  onLogin: (session: Session) => void;
  actor: ReturnType<typeof useActor>["actor"];
}) {
  const [mode, setMode] = useState<"select" | "admin" | "deptHead">("select");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      logActivity("Login", "Admin logged in");
      onLogin({ type: "admin" });
    } else {
      toast.error("Invalid PIN");
      setPin("");
    }
  };

  const handleDeptLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    setLoading(true);
    try {
      const head = await actor.getDepartmentHead(pin);
      if (head) {
        logActivity("Login", `Dept head ${head.name} logged in`, head.name);
        onLogin({ type: "deptHead", head });
      } else {
        toast.error("Invalid PIN");
        setPin("");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <SectionLabel>IT MONITORING SYSTEM</SectionLabel>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            THQ Hospital
            <br />
            <span className="text-emerald-400">Sillanwali</span>
          </h1>
        </div>

        <div className="w-full max-w-sm grid grid-cols-1 gap-4">
          <button
            type="button"
            data-ocid="login.admin_button"
            onClick={() => setMode("admin")}
            className="bg-[#151515] border border-white/5 rounded-[28px] p-8 flex flex-col items-center gap-4 hover:border-emerald-500/30 hover:bg-[#1a1a1a] transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-white uppercase tracking-tight">
                Admin
              </div>
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                Full Access
              </div>
            </div>
          </button>

          <button
            type="button"
            data-ocid="login.depthead_button"
            onClick={() => setMode("deptHead")}
            className="bg-[#151515] border border-white/5 rounded-[28px] p-8 flex flex-col items-center gap-4 hover:border-blue-500/30 hover:bg-[#1a1a1a] transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Users size={32} className="text-blue-400" />
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-white uppercase tracking-tight">
                Department Head
              </div>
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                Limited Access
              </div>
            </div>
          </button>
        </div>

        <p className="mt-8 text-[10px] text-white/20 font-bold uppercase tracking-widest">
          SILLANWALI-IT-SECURE-V5
        </p>
      </div>
    );
  }

  const isAdmin = mode === "admin";
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <button
          type="button"
          onClick={() => {
            setMode("select");
            setPin("");
          }}
          className="flex items-center gap-2 text-white/30 text-xs font-bold uppercase tracking-widest mb-8 hover:text-white/60 transition-colors"
        >
          <X size={14} /> Back
        </button>

        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              isAdmin ? "bg-emerald-500/10" : "bg-blue-500/10"
            }`}
          >
            <Lock
              size={28}
              className={isAdmin ? "text-emerald-400" : "text-blue-400"}
            />
          </div>
          <h2 className="text-xl font-black text-white uppercase">
            {isAdmin ? "Admin Access" : "Dept Head Access"}
          </h2>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
            Enter PIN to continue
          </p>
        </div>

        <form
          onSubmit={isAdmin ? handleAdminLogin : handleDeptLogin}
          className="space-y-4"
        >
          <div className="relative">
            <input
              data-ocid="login.pin_input"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={6}
              className="w-full bg-[#151515] border border-white/5 rounded-2xl px-5 py-4 text-center font-black tracking-[0.5em] text-white outline-none focus:ring-1 ring-emerald-500 text-xl"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            data-ocid="login.submit_button"
            type="submit"
            disabled={loading || pin.length < 3}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Authorize Access
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TV Tab
// ─────────────────────────────────────────────
function TVTab({
  departments,
  config,
  reports,
}: {
  departments: Department[];
  config: AppConfig | null;
  reports: Report[];
}) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalSubmissions = reports.length;

  return (
    <div className="space-y-4 pb-28">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <SectionLabel>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {config?.departmentName || "IT DEPARTMENT"} MONITOR
          </SectionLabel>
          <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-tight">
            {config?.departmentName || "IT DEPT"}
            <br />
            <span className="text-emerald-400">
              {config?.hospitalName || "THQ Hospital Sillanwali"}
            </span>
          </h1>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-white tracking-tighter font-mono">
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </div>
          <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
            REFRESH: {config ? Number(config.tvRefreshRate) : 30}S
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5">
          <TrendingUp size={18} className="text-emerald-400 mb-3" />
          <div className="text-[10px] font-black text-white/30 uppercase mb-1">
            Total Submissions
          </div>
          <div className="text-4xl font-black text-white tracking-tighter">
            {totalSubmissions}
          </div>
        </Card>
        <Card className="p-5">
          <HardDrive size={18} className="text-blue-400 mb-3" />
          <div className="text-[10px] font-black text-white/30 uppercase mb-1">
            Modules
          </div>
          <div className="text-4xl font-black text-white tracking-tighter">
            {departments.length}
          </div>
        </Card>
      </div>

      <Card className="p-5 h-48">
        <SectionLabel>
          <BarChart3 size={12} /> Live Traffic
        </SectionLabel>
        <div className="h-36 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_TIME_SERIES}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#151515",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
                itemStyle={{ color: "#10b981" }}
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <SectionLabel>
          <Monitor size={12} /> Department Status
        </SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {departments.map((d) => (
            <div
              key={String(d.id)}
              className="text-center py-3 px-2 rounded-2xl bg-black/30"
            >
              <DeptIcon icon={d.icon} className={`${d.color} mx-auto mb-1`} />
              <div className="text-lg font-black text-white">
                {(() => {
                  const todayStr = new Date().toDateString();
                  return reports.filter((r) => {
                    const date = new Date(Number(r.timestamp) / 1_000_000);
                    return (
                      String(r.departmentId) === String(d.id) &&
                      date.toDateString() === todayStr
                    );
                  }).length;
                })()}
              </div>
              <div className="text-[9px] text-white/30 font-bold uppercase truncate">
                {d.departmentLabel}
              </div>
              <div className="text-[8px] text-white/20 font-medium mt-0.5">
                today
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Camera Capture Component
// ─────────────────────────────────────────────
function CameraCapture({
  onCapture,
}: { onCapture: (dataUrl: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        alert("Camera not available");
        setOpen(false);
      }
    }
  };

  const stopCamera = () => {
    for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    streamRef.current = null;
  };

  const startCameraRef = React.useRef(startCamera);
  const stopCameraRef = React.useRef(stopCamera);
  startCameraRef.current = startCamera;
  stopCameraRef.current = stopCamera;

  React.useEffect(() => {
    if (open) startCameraRef.current();
    return () => {
      if (open) stopCameraRef.current();
    };
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCapture(dataUrl);
    stopCamera();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-emerald-500/20"
      >
        <Camera size={14} /> Take Photo
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-4 p-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-sm rounded-2xl"
          >
            <track kind="captions" />
          </video>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setOpen(false);
              }}
              className="px-5 py-2.5 bg-white/10 text-white/60 rounded-xl text-xs font-black uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capture}
              className="px-6 py-2.5 bg-emerald-500 text-black rounded-xl text-xs font-black uppercase"
            >
              Capture
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Submit Report Modal
// ─────────────────────────────────────────────
function SubmitReportModal({
  open,
  onClose,
  template,
  deptId,
  submittedBy,
  actor,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  template: FormTemplate | null;
  deptId: bigint;
  submittedBy: string;
  actor: ReturnType<typeof useActor>["actor"];
  onSuccess: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      const parsed = parseFields(template.fields);
      const init: Record<string, string> = {};
      for (const f of parsed) {
        init[f.name] = f.fieldType === "checkbox" ? "false" : "";
      }
      setValues(init);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !template) return;
    // Feature 8: Required fields enforcement
    const parsedFields = parseFields(template.fields) as (FormField & {
      required?: boolean;
    })[];
    for (const f of parsedFields) {
      if (f.required) {
        const val = values[f.name] || "";
        if (!val || val === "false") {
          toast.error(`Please fill required field: ${f.name}`);
          return;
        }
      }
    }
    setLoading(true);
    try {
      const fieldValues: FieldValue[] = parsedFields.map((f) => ({
        field: f.name,
        value: values[f.name] || "",
      }));
      await actor.submitReport(deptId, submittedBy, fieldValues);
      logActivity(
        "Submission",
        `${submittedBy} submitted form for dept ${String(deptId)}`,
        submittedBy,
      );
      toast.success("Report submitted successfully");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const val = values[field.name] || "";
    const baseClass =
      "w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm font-medium text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500 transition-all placeholder:text-white/20";

    switch (field.fieldType) {
      case "number":
        return (
          <input
            type="number"
            value={val}
            onChange={(e) =>
              setValues((p) => ({ ...p, [field.name]: e.target.value }))
            }
            placeholder={`Enter ${field.name}...`}
            className={baseClass}
          />
        );
      case "dropdown":
        return (
          <select
            value={val}
            onChange={(e) =>
              setValues((p) => ({ ...p, [field.name]: e.target.value }))
            }
            className={baseClass}
          >
            <option value="">-- Select --</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={val === "true"}
              onChange={(e) =>
                setValues((p) => ({
                  ...p,
                  [field.name]: e.target.checked ? "true" : "false",
                }))
              }
              className="w-5 h-5 accent-emerald-500"
            />
            <span className="text-sm text-white/60">
              {val === "true" ? "Yes" : "No"}
            </span>
          </div>
        );
      case "date":
        return (
          <input
            type="date"
            value={val}
            onChange={(e) =>
              setValues((p) => ({ ...p, [field.name]: e.target.value }))
            }
            className={baseClass}
          />
        );
      case "image":
        return (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <CameraCapture
                onCapture={(dataUrl) =>
                  setValues((p) => ({ ...p, [field.name]: dataUrl }))
                }
              />
              <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-white/10 cursor-pointer">
                <Upload size={14} /> Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      setValues((p) => ({
                        ...p,
                        [field.name]: (ev.target?.result as string) || "",
                      }));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
            {val?.startsWith("data:image") && (
              <div className="relative">
                <img
                  src={val}
                  alt="preview"
                  className="w-full max-h-48 object-contain rounded-xl border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => setValues((p) => ({ ...p, [field.name]: "" }))}
                  className="absolute top-2 right-2 bg-black/60 text-white/60 hover:text-rose-400 rounded-lg p-1"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) =>
              setValues((p) => ({ ...p, [field.name]: e.target.value }))
            }
            placeholder={`Enter ${field.name}...`}
            className={baseClass}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#151515] border border-white/5 text-white max-w-sm mx-auto rounded-[28px] overflow-y-auto max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle className="text-white font-black uppercase tracking-tight">
            {template?.title || "Submit Report"}
          </DialogTitle>
        </DialogHeader>
        {template && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {parseFields(template.fields).map((field) => (
              <div key={field.name} className="space-y-1.5">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  {field.name}
                  {field.required && (
                    <span className="text-rose-400 ml-1">*</span>
                  )}
                </span>
                {renderField(field)}
              </div>
            ))}
            <DialogFooter className="gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                data-ocid="report_modal.cancel_button"
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-ocid="report_modal.submit_button"
                disabled={loading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Submit
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// DEPARTMENTS Tab (Admin)
// ─────────────────────────────────────────────
function DepartmentsTab({
  departments,
  actor,
  onRefresh,
}: {
  departments: Department[];
  actor: ReturnType<typeof useActor>["actor"];
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<bigint | null>(null);
  const [addingDept, setAddingDept] = useState(false);
  const [newDept, setNewDept] = useState({
    label: "",
    icon: "Activity",
    color: "text-rose-500",
  });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [savingDept, setSavingDept] = useState(false);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !newDept.label) return;
    setLoading(true);
    try {
      await actor.createDepartment(newDept.label, newDept.icon, newDept.color);
      toast.success("Department added");
      setNewDept({ label: "", icon: "Activity", color: "text-rose-500" });
      setAddingDept(false);
      onRefresh();
    } catch {
      toast.error("Failed to add department");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    setDeletingId(id);
    try {
      await actor.deleteDepartment(id);
      toast.success("Department removed");
      onRefresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !editDept) return;
    setSavingDept(true);
    try {
      await actor.updateDepartment(editDept);
      setEditDept(null);
      toast.success("Department updated");
      onRefresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingDept(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black flex items-center gap-2 uppercase">
          <ClipboardList size={20} className="text-emerald-400" /> Departments
        </h2>
        <button
          type="button"
          data-ocid="dept.add_button"
          onClick={() => setAddingDept(!addingDept)}
          className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors uppercase tracking-widest"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {addingDept && (
        <Card className="p-5">
          <form onSubmit={handleAddDept} className="space-y-3">
            <SectionLabel>New Department</SectionLabel>
            <FieldInput
              label="Department Name"
              value={newDept.label}
              onChange={(v) => setNewDept((p) => ({ ...p, label: v }))}
              placeholder="e.g. Cardiology"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  Icon
                </span>
                <select
                  value={newDept.icon}
                  onChange={(e) =>
                    setNewDept((p) => ({ ...p, icon: e.target.value }))
                  }
                  className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                >
                  {ICON_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  Color
                </span>
                <select
                  value={newDept.color}
                  onChange={(e) =>
                    setNewDept((p) => ({ ...p, color: e.target.value }))
                  }
                  className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("text-", "")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAddingDept(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                data-ocid="dept.save_button"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin mx-auto" />
                ) : (
                  "Add"
                )}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3">
        {departments.map((dept) => {
          const isExpanded = String(expandedId) === String(dept.id);
          return (
            <Card key={String(dept.id)} className="overflow-hidden">
              <button
                type="button"
                className="w-full p-5 flex items-center justify-between group"
                onClick={() => setExpandedId(isExpanded ? null : dept.id)}
                data-ocid={`dept.item.${Number(dept.id)}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl bg-white/5 ${dept.color}`}>
                    <DeptIcon icon={dept.icon} />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-black text-white">
                      {dept.departmentLabel}
                    </div>
                    <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                      ID: {String(dept.id)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">
                      {String(dept.patientCount)}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-bold">
                      ● ACTIVE
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-white/30" />
                  ) : (
                    <ChevronDown size={16} className="text-white/30" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-white/5 px-5 pb-5 space-y-3 pt-3">
                  {editDept && String(editDept.id) === String(dept.id) ? (
                    <form onSubmit={handleUpdateDept} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FieldInput
                          label="Label"
                          value={editDept.departmentLabel}
                          onChange={(v) =>
                            setEditDept((p) =>
                              p ? { ...p, departmentLabel: v } : p,
                            )
                          }
                        />
                        <FieldInput
                          label="Patient Count"
                          type="number"
                          value={String(editDept.patientCount)}
                          onChange={(v) =>
                            setEditDept((p) =>
                              p ? { ...p, patientCount: BigInt(v || 0) } : p,
                            )
                          }
                        />
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            Icon
                          </span>
                          <select
                            value={editDept.icon}
                            onChange={(e) =>
                              setEditDept((p) =>
                                p ? { ...p, icon: e.target.value } : p,
                              )
                            }
                            className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                          >
                            {ICON_OPTIONS.map((i) => (
                              <option key={i} value={i}>
                                {i}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            Color
                          </span>
                          <select
                            value={editDept.color}
                            onChange={(e) =>
                              setEditDept((p) =>
                                p ? { ...p, color: e.target.value } : p,
                              )
                            }
                            className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                          >
                            {COLOR_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c.replace("text-", "")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditDept(null)}
                          className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-bold uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingDept}
                          data-ocid={`dept.save_button.${Number(dept.id)}`}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase disabled:opacity-40"
                        >
                          {savingDept ? (
                            <Loader2
                              size={12}
                              className="animate-spin mx-auto"
                            />
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        data-ocid={`dept.edit_button.${Number(dept.id)}`}
                        onClick={() => setEditDept({ ...dept })}
                        className="flex items-center gap-1 text-[10px] text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors font-bold uppercase"
                      >
                        <Edit3 size={10} /> Edit
                      </button>
                      <button
                        type="button"
                        data-ocid={`dept.delete_button.${Number(dept.id)}`}
                        onClick={() => handleDelete(dept.id)}
                        disabled={String(deletingId) === String(dept.id)}
                        className="flex items-center gap-1 text-[10px] text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors font-bold uppercase"
                      >
                        {String(deletingId) === String(dept.id) ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Trash2 size={10} />
                        )}
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {departments.length === 0 && (
        <Card className="p-10 text-center">
          <div
            data-ocid="dept.empty_state"
            className="text-white/20 text-xs font-bold uppercase"
          >
            No departments yet. Add one above.
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MY DEPT Tab (Dept Head)
// ─────────────────────────────────────────────
function MyDeptTab({
  dept,
  templates,
  externalForms,
  actor,
  headName,
  onSuccess,
}: {
  dept: Department | null;
  templates: FormTemplate[];
  externalForms: ExternalForm[];
  actor: ReturnType<typeof useActor>["actor"];
  headName: string;
  onSuccess: () => void;
}) {
  const [submitModal, setSubmitModal] = useState<{
    open: boolean;
    template: FormTemplate | null;
  } | null>(null);
  const [openExtForm, setOpenExtForm] = useState<ExternalForm | null>(null);

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!dept) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          data-ocid="mydept.loading_state"
          className="text-white/30 text-sm font-bold"
        >
          Loading department...
        </div>
      </div>
    );
  }

  const deadlines = getDeadlines();

  // Get dept reports (passed in via props - using a workaround since we don't have them here)
  // We'll show pending forms based on deadlines
  const pendingForms = (() => {
    const visible = templates.filter(
      (tmpl) => tmpl.departmentId === 0n || tmpl.departmentId === dept.id,
    );
    return visible.filter((tmpl) => {
      const dl = deadlines[String(tmpl.id)];
      if (!dl) return false;
      return new Date(dl) > now; // not yet overdue = pending
    });
  })();

  const overdueForms = (() => {
    const visible = templates.filter(
      (tmpl) => tmpl.departmentId === 0n || tmpl.departmentId === dept.id,
    );
    return visible.filter((tmpl) => {
      const dl = deadlines[String(tmpl.id)];
      if (!dl) return false;
      return new Date(dl) <= now;
    });
  })();

  return (
    <div className="space-y-4 pb-28">
      {/* Feature 5: Dept Head Dashboard Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#151515] border border-white/5 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-white">
            {pendingForms.length}
          </div>
          <div className="text-[8px] text-amber-400 font-bold uppercase mt-0.5">
            Pending
          </div>
        </div>
        <div className="bg-[#151515] border border-white/5 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-white">
            {overdueForms.length}
          </div>
          <div className="text-[8px] text-rose-400 font-bold uppercase mt-0.5">
            Overdue
          </div>
        </div>
        <div className="bg-[#151515] border border-white/5 rounded-2xl p-3 text-center">
          <div className="text-2xl font-black text-white">
            {
              templates.filter(
                (t) => t.departmentId === 0n || t.departmentId === dept.id,
              ).length
            }
          </div>
          <div className="text-[8px] text-emerald-400 font-bold uppercase mt-0.5">
            Forms
          </div>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueForms.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-rose-400 font-black uppercase">
              Overdue Forms
            </div>
            {overdueForms.map((f) => (
              <div
                key={String(f.id)}
                className="text-[10px] text-rose-300/70 font-bold"
              >
                {f.title} — deadline passed
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Forms with Countdown */}
      {pendingForms.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>
            <Timer size={10} /> Pending Deadlines
          </SectionLabel>
          {pendingForms.map((tmpl) => {
            const dl = new Date(deadlines[String(tmpl.id)]);
            const diff = dl.getTime() - now.getTime();
            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            return (
              <div
                key={String(tmpl.id)}
                className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center justify-between"
              >
                <div className="text-xs font-black text-white">
                  {tmpl.title}
                </div>
                <div className="text-[10px] text-amber-400 font-bold tabular-nums">
                  {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl bg-white/5 ${dept.color}`}>
            <DeptIcon icon={dept.icon} className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="text-xl font-black text-white uppercase">
              {dept.departmentLabel}
            </div>
            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
              Your Department
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white">
              {String(dept.patientCount)}
            </div>
            <div className="text-[9px] text-emerald-400 font-bold">
              ● ACTIVE
            </div>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="text-white font-black text-sm uppercase tracking-tight mb-3 flex items-center gap-2">
          <ClipboardList size={16} className="text-emerald-400" /> Available
          Report Forms
        </h3>
        {(() => {
          const visibleTemplates = templates.filter(
            (tmpl) => tmpl.departmentId === 0n || tmpl.departmentId === dept.id,
          );
          return visibleTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <div
                data-ocid="mydept.empty_state"
                className="text-white/20 text-xs font-bold uppercase"
              >
                No form templates available yet.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleTemplates.map((tmpl) => (
                <Card
                  key={String(tmpl.id)}
                  className="p-5 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-black text-white">
                      {tmpl.title}
                    </div>
                    <div className="text-[10px] text-white/30 mt-1">
                      {parseFields(tmpl.fields)
                        .map((f) => f.name)
                        .join(" • ")}
                    </div>
                    {(() => {
                      const dl = getDeadlines()[String(tmpl.id)];
                      if (!dl) return null;
                      const dlDate = new Date(dl);
                      const isOverdue = dlDate <= new Date();
                      if (isOverdue)
                        return (
                          <div className="text-[9px] text-rose-400 font-black uppercase mt-1 flex items-center gap-1">
                            <AlertTriangle size={9} /> OVERDUE
                          </div>
                        );
                      const diff = dlDate.getTime() - new Date().getTime();
                      const hrs = Math.floor(diff / 3600000);
                      const mins = Math.floor((diff % 3600000) / 60000);
                      return (
                        <div className="text-[9px] text-amber-400 font-bold mt-1 flex items-center gap-1">
                          <Clock size={9} /> Due in{" "}
                          {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    data-ocid={`mydept.submit_button.${Number(tmpl.id)}`}
                    onClick={() =>
                      setSubmitModal({ open: true, template: tmpl })
                    }
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-widest transition-colors ml-3 shrink-0"
                  >
                    <Plus size={12} /> Submit
                  </button>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>

      {/* External Forms Section */}
      {(() => {
        const visibleExtForms = externalForms.filter(
          (ef) => ef.departmentId === 0n || ef.departmentId === dept.id,
        );
        if (visibleExtForms.length === 0) return null;
        return (
          <div className="mt-2">
            <h3 className="text-white font-black text-sm uppercase tracking-tight mb-3 flex items-center gap-2">
              <span className="text-emerald-400">⇗</span> External Forms
            </h3>
            <div className="space-y-3">
              {visibleExtForms.map((ef) => (
                <Card
                  key={String(ef.id)}
                  className="p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-base font-black text-white">
                        {ef.title}
                      </div>
                      <PlatformBadge platform={ef.platform} />
                    </div>
                  </div>
                  <button
                    type="button"
                    data-ocid={`mydept.extform_button.${Number(ef.id)}`}
                    onClick={() => setOpenExtForm(ef)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-widest transition-colors shrink-0"
                  >
                    Open Form
                  </button>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}

      {/* External Form iframe Dialog */}
      <Dialog
        open={!!openExtForm}
        onOpenChange={(v) => !v && setOpenExtForm(null)}
      >
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 overflow-hidden bg-[#111]">
          <DialogHeader className="px-5 py-3 border-b border-white/10 flex flex-row items-center justify-between">
            <DialogTitle className="text-white font-black text-sm uppercase tracking-wide">
              {openExtForm?.title}
            </DialogTitle>
          </DialogHeader>
          {openExtForm && (
            <iframe
              src={openExtForm.embedUrl}
              title={openExtForm.title}
              className="w-full flex-1"
              style={{ height: "calc(90vh - 60px)", border: "none" }}
              allow="camera; microphone; geolocation; *"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation-by-user-activation"
            />
          )}
        </DialogContent>
      </Dialog>

      {submitModal && (
        <SubmitReportModal
          open={submitModal.open}
          onClose={() => setSubmitModal(null)}
          template={submitModal.template}
          deptId={dept.id}
          submittedBy={headName}
          actor={actor}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTS Tab
// ─────────────────────────────────────────────
function ReportsTab({
  reports,
  departments,
  loading,
  onRefresh,
}: {
  reports: Report[];
  departments: Department[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<bigint | null>(null);
  const [reportStatuses, setReportStatuses] = useState<Record<string, string>>(
    {},
  );
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [, forceRefresh] = useState(0);

  // Load statuses from localStorage
  React.useEffect(() => {
    const statuses: Record<string, string> = {};
    for (const r of reports) {
      statuses[String(r.id)] = getReportStatus(String(r.id));
    }
    setReportStatuses(statuses);
  }, [reports]);

  const handleStatusChange = (reportId: string, newStatus: string) => {
    const entry: StatusHistoryEntry = {
      status: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: "Admin",
    };
    addStatusHistory(reportId, entry);
    setReportStatuses((p) => ({ ...p, [reportId]: newStatus }));
    logActivity("Status Changed", `Report ${reportId} status → ${newStatus}`);
    toast.success(`Status updated to ${newStatus}`);
  };

  const handleAddComment = (reportId: string) => {
    const text = commentInputs[reportId]?.trim();
    if (!text) return;
    addComment(reportId, text);
    setCommentInputs((p) => ({ ...p, [reportId]: "" }));
    forceRefresh((n) => n + 1);
    toast.success("Note added");
  };

  const getDeptName = (id: bigint) =>
    departments.find((d) => String(d.id) === String(id))?.departmentLabel ||
    "Unknown";

  const handleDownloadCSV = () => {
    if (reports.length === 0) {
      toast.error("No reports to export");
      return;
    }
    // Collect all unique field names
    const allFields = Array.from(
      new Set(reports.flatMap((r) => r.fieldValues.map((fv) => fv.field))),
    );
    const headers = ["Date", "Department", "Submitted By", ...allFields];
    const rows = reports.map((r) => {
      const fieldMap: Record<string, string> = {};
      for (const fv of r.fieldValues) {
        fieldMap[fv.field] = fv.value;
      }
      return [
        escapeCSV(formatDate(r.timestamp)),
        escapeCSV(getDeptName(r.departmentId)),
        escapeCSV(r.submittedBy),
        ...allFields.map((f) => escapeCSV(fieldMap[f] || "")),
      ].join(",");
    });
    const csvContent = [headers.map(escapeCSV).join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const handleDownloadPDF = () => {
    if (reports.length === 0) {
      toast.error("No reports to export");
      return;
    }
    const allFields = Array.from(
      new Set(reports.flatMap((r) => r.fieldValues.map((fv) => fv.field))),
    );
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up blocked. Please allow pop-ups.");
      return;
    }
    const tableRows = reports
      .map((r) => {
        const fieldMap: Record<string, string> = {};
        for (const fv of r.fieldValues) {
          fieldMap[fv.field] = fv.value;
        }
        return `<tr>
          <td>${formatDate(r.timestamp)}</td>
          <td>${getDeptName(r.departmentId)}</td>
          <td>${r.submittedBy}</td>
          ${allFields.map((f) => `<td>${fieldMap[f] || "-"}</td>`).join("")}
        </tr>`;
      })
      .join("");

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>THQ Hospital Reports</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    p { color: #666; margin-bottom: 16px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a1a1a; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e5e5; font-size: 11px; }
    tr:nth-child(even) td { background: #f9f9f9; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>THQ Hospital Sillanwali — Reports</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Department</th><th>Submitted By</th>
        ${allFields.map((f) => `<th>${f}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black flex items-center gap-2 uppercase">
          <BarChart3 size={20} className="text-emerald-400" /> Reports
        </h2>
        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <>
              <button
                type="button"
                data-ocid="reports.csv_button"
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors uppercase tracking-widest"
              >
                <FileDown size={12} /> CSV
              </button>
              <button
                type="button"
                data-ocid="reports.pdf_button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl hover:bg-blue-500/10 transition-colors uppercase tracking-widest"
              >
                <Printer size={12} /> PDF
              </button>
            </>
          )}
          <button
            type="button"
            data-ocid="reports.reload_button"
            onClick={onRefresh}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div
          data-ocid="reports.loading_state"
          className="flex justify-center py-12"
        >
          <Loader2 size={24} className="text-emerald-400 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-10 text-center">
          <div
            data-ocid="reports.empty_state"
            className="text-white/20 text-xs font-bold uppercase"
          >
            No reports submitted yet.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r, idx) => {
            const isExp = String(expandedId) === String(r.id);
            return (
              <Card
                key={String(r.id)}
                className="overflow-hidden"
                data-ocid={`reports.item.${idx + 1}`}
              >
                <button
                  type="button"
                  className="w-full p-4 flex items-center justify-between"
                  onClick={() => setExpandedId(isExp ? null : r.id)}
                >
                  <div className="text-left">
                    <div className="text-sm font-black text-white">
                      {getDeptName(r.departmentId)}
                    </div>
                    <div className="text-[10px] text-white/30 font-bold mt-0.5">
                      By {r.submittedBy}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`text-[10px] font-bold ${
                          reportStatuses[String(r.id)] === "Approved"
                            ? "text-emerald-400"
                            : reportStatuses[String(r.id)] === "Submitted"
                              ? "text-blue-400"
                              : "text-amber-400"
                        }`}
                      >
                        {reportStatuses[String(r.id)] || "PENDING"}
                      </div>
                      <div className="text-[10px] text-white/20">
                        {formatDate(r.timestamp)}
                      </div>
                    </div>
                    {isExp ? (
                      <ChevronUp size={14} className="text-white/30" />
                    ) : (
                      <ChevronDown size={14} className="text-white/30" />
                    )}
                  </div>
                </button>
                {isExp && (
                  <div className="border-t border-white/5 px-4 pb-4 space-y-3 pt-3">
                    {/* Field Values */}
                    <div className="space-y-2">
                      {r.fieldValues.map((fv) => (
                        <div key={fv.field} className="flex justify-between">
                          <span className="text-[11px] text-white/40 font-bold uppercase">
                            {fv.field}
                          </span>
                          <span className="text-[11px] text-white font-bold">
                            {fv.value.startsWith("data:image") ? (
                              <img
                                src={fv.value}
                                alt="img"
                                className="w-16 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              fv.value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Status Control */}
                    <div className="border-t border-white/5 pt-3">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">
                        Status
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {["Pending", "Submitted", "Approved"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleStatusChange(String(r.id), s)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-colors ${
                              reportStatuses[String(r.id)] === s
                                ? s === "Approved"
                                  ? "bg-emerald-500 text-black"
                                  : s === "Submitted"
                                    ? "bg-blue-500 text-white"
                                    : "bg-amber-500 text-black"
                                : "bg-white/5 text-white/40 hover:bg-white/10"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Submission History */}
                    {(() => {
                      const hist = getStatusHistory(String(r.id));
                      if (hist.length === 0) return null;
                      return (
                        <div className="border-t border-white/5 pt-3">
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">
                            History
                          </span>
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-white/40">
                              Submitted by {r.submittedBy} on{" "}
                              {formatDate(r.timestamp)}
                            </div>
                            {hist.map((h, i) => (
                              <div
                                key={`${h.changedAt}-${i}`}
                                className="text-[10px] text-white/40"
                              >
                                Status →{" "}
                                <span className="text-emerald-400">
                                  {h.status}
                                </span>{" "}
                                by {h.changedBy} on{" "}
                                {new Date(h.changedAt).toLocaleString()}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Comments/Notes */}
                    <div className="border-t border-white/5 pt-3">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">
                        Admin Notes
                      </span>
                      <div className="space-y-2 mb-2">
                        {getComments(String(r.id)).map((c) => (
                          <div
                            key={c.id}
                            className="bg-black/30 rounded-xl px-3 py-2"
                          >
                            <div className="text-[11px] text-white/80">
                              {c.text}
                            </div>
                            <div className="text-[9px] text-white/20 mt-0.5">
                              {c.author} •{" "}
                              {new Date(c.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[String(r.id)] || ""}
                          onChange={(e) =>
                            setCommentInputs((p) => ({
                              ...p,
                              [String(r.id)]: e.target.value,
                            }))
                          }
                          placeholder="Add a note..."
                          className="flex-1 bg-black/40 rounded-xl px-3 py-2 text-xs text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddComment(String(r.id));
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(String(r.id))}
                          className="px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black hover:bg-emerald-500/30 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FORMS Tab (Admin)
// ─────────────────────────────────────────────
interface DraftField {
  id: string;
  name: string;
  fieldType: string;
  options: string; // comma-separated for dropdown
}

function FormsTab({
  templates,
  actor,
  onRefresh,
  departments,
  externalForms,
}: {
  templates: FormTemplate[];
  actor: ReturnType<typeof useActor>["actor"];
  onRefresh: () => void;
  departments: Department[];
  externalForms: ExternalForm[];
}) {
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [showBuilder, setShowBuilder] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [draftFields, setDraftFields] = useState<DraftField[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<bigint>(0n);
  const [formDeadline, setFormDeadline] = useState("");
  const [versionModalFormId, setVersionModalFormId] = useState<string | null>(
    null,
  );

  const openNewForm = () => {
    setEditingTemplate(null);
    setFormTitle("");
    setDraftFields([]);
    setSelectedDeptId(0n);
    setShowBuilder(true);
  };

  const openEditForm = (tmpl: FormTemplate) => {
    setEditingTemplate(tmpl);
    setFormTitle(tmpl.title);
    setSelectedDeptId(tmpl.departmentId);
    setDraftFields(
      parseFields(tmpl.fields).map((f, i) => ({
        id: `existing-${i}`,
        name: f.name,
        fieldType: f.fieldType,
        options: f.options.join(", "),
      })),
    );
    setShowBuilder(true);
  };

  const cancelBuilder = () => {
    setShowBuilder(false);
    setEditingTemplate(null);
    setFormTitle("");
    setDraftFields([]);
  };

  const addField = () => {
    setDraftFields((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", fieldType: "text", options: "" },
    ]);
  };

  const removeField = (idx: number) => {
    setDraftFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, patch: Partial<DraftField>) => {
    setDraftFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    );
  };

  const draftToFormFields = (): (FormField & { required?: boolean })[] =>
    draftFields
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        fieldType: f.fieldType,
        options:
          f.fieldType === "dropdown"
            ? f.options
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean)
            : [],
        required: (f as any).required || false,
      }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !formTitle.trim()) return;
    const fields = draftToFormFields();
    setSaving(true);
    try {
      const serialized = serializeFields(fields);
      if (editingTemplate) {
        await actor.updateFormTemplate({
          ...editingTemplate,
          title: formTitle.trim(),
          fields: serialized,
          departmentId: selectedDeptId,
        });
        saveFormVersion(
          String(editingTemplate.id),
          formTitle.trim(),
          serialized,
        );
        if (formDeadline) setDeadline(String(editingTemplate.id), formDeadline);
        logActivity("Form Updated", `Form "${formTitle}" updated`);
        toast.success("Form template updated");
      } else {
        const result = await actor.createFormTemplate(
          selectedDeptId,
          formTitle.trim(),
          serialized,
        );
        // save version after create - we don't have the id yet so log generically
        logActivity("Form Created", `Form "${formTitle}" created`);
        toast.success("Form template created");
        if (formDeadline && result) {
          setDeadline(String(result), formDeadline);
        }
      }
      setFormDeadline("");
      cancelBuilder();
      onRefresh();
    } catch {
      toast.error("Failed to save form template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    setDeletingId(id);
    try {
      await actor.deleteFormTemplate(id);
      logActivity("Form Deleted", `Form ID ${String(id)} deleted`);
      toast.success("Form template deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black flex items-center gap-2 uppercase">
          <ClipboardList size={20} className="text-emerald-400" /> Form
          Templates
        </h2>
        {!showBuilder && (
          <button
            type="button"
            data-ocid="forms.add_button"
            onClick={openNewForm}
            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors uppercase tracking-widest"
          >
            <Plus size={12} /> New Form
          </button>
        )}
      </div>

      {/* ── Form Builder ── */}
      {showBuilder && (
        <Card className="p-5 space-y-4">
          <SectionLabel>
            {editingTemplate ? "Edit Form" : "New Form Builder"}
          </SectionLabel>
          <form onSubmit={handleSave} className="space-y-4">
            <FieldInput
              label="Form Title"
              value={formTitle}
              onChange={setFormTitle}
              placeholder="e.g. Daily Patient Report"
            />

            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                Assign to Department
              </span>
              <select
                data-ocid="forms.select"
                value={String(selectedDeptId)}
                onChange={(e) => setSelectedDeptId(BigInt(e.target.value))}
                className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
              >
                <option value="0">All Departments (Global)</option>
                {departments.map((d) => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {d.departmentLabel}
                  </option>
                ))}
              </select>
            </div>
            {/* Feature 4: Deadline per form */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                <Timer size={10} /> Submission Deadline (optional)
              </span>
              <input
                type="datetime-local"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                data-ocid="forms.deadline_input"
                className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  Fields ({draftFields.length})
                </span>
                <button
                  type="button"
                  data-ocid="forms.add_field_button"
                  onClick={addField}
                  className="flex items-center gap-1 text-[10px] font-black text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl hover:bg-emerald-500/10 transition-colors uppercase tracking-widest"
                >
                  <Plus size={10} /> Add Field
                </button>
              </div>

              {draftFields.length === 0 && (
                <div className="text-center py-4 text-white/20 text-xs font-bold uppercase border border-dashed border-white/10 rounded-2xl">
                  No fields yet. Click "Add Field" to start.
                </div>
              )}

              {draftFields.map((field, idx) => (
                <div
                  key={field.id || String(idx)}
                  data-ocid={`forms.field.${idx + 1}`}
                  className="bg-black/30 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/30 uppercase">
                      Field {idx + 1}
                    </span>
                    <button
                      type="button"
                      data-ocid={`forms.remove_field_button.${idx + 1}`}
                      onClick={() => removeField(idx)}
                      className="text-rose-500/50 hover:text-rose-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput
                      label="Field Name"
                      value={field.name}
                      onChange={(v) => updateField(idx, { name: v })}
                      placeholder="e.g. Patient Count"
                    />
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        Type
                      </span>
                      <select
                        value={field.fieldType}
                        onChange={(e) =>
                          updateField(idx, { fieldType: e.target.value })
                        }
                        className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {field.fieldType === "dropdown" && (
                    <FieldInput
                      label="Options (comma separated)"
                      value={field.options}
                      onChange={(v) => updateField(idx, { options: v })}
                      placeholder="e.g. Low, Medium, High"
                    />
                  )}
                  {/* Feature 8: Required field toggle */}
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id={`req-${idx}`}
                      checked={(field as any).required || false}
                      onChange={(e) =>
                        updateField(idx, { required: e.target.checked } as any)
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <label
                      htmlFor={`req-${idx}`}
                      className="text-[10px] text-white/40 font-bold uppercase tracking-widest cursor-pointer"
                    >
                      Required Field
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                data-ocid="forms.cancel_button"
                onClick={cancelBuilder}
                className="flex-1 py-3 rounded-2xl bg-white/5 text-white/60 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-ocid="forms.save_button"
                disabled={saving || !formTitle.trim()}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {editingTemplate ? "Update Form" : "Create Form"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Templates List ── */}
      {!showBuilder &&
        (templates.length === 0 ? (
          <Card className="p-10 text-center">
            <div
              data-ocid="forms.empty_state"
              className="text-white/20 text-xs font-bold uppercase"
            >
              No form templates yet. Create your first form above.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((tmpl, idx) => (
              <Card
                key={String(tmpl.id)}
                data-ocid={`forms.item.${idx + 1}`}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-base font-black text-white">
                        {tmpl.title}
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${tmpl.departmentId === 0n ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"}`}
                      >
                        {tmpl.departmentId === 0n
                          ? "Global"
                          : (departments.find((d) => d.id === tmpl.departmentId)
                              ?.departmentLabel ?? "Unknown Dept")}
                      </span>
                      {(() => {
                        const dl = getDeadlines()[String(tmpl.id)];
                        if (!dl) return null;
                        const isOverdue = new Date(dl) < new Date();
                        return (
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 ${isOverdue ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/15 text-amber-400"}`}
                          >
                            <Clock size={8} />{" "}
                            {isOverdue
                              ? "OVERDUE"
                              : new Date(dl).toLocaleDateString()}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-[10px] text-white/30 mt-1 font-bold uppercase tracking-widest">
                      {tmpl.fields.length} field
                      {tmpl.fields.length !== 1 ? "s" : ""}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parseFields(tmpl.fields).map((f) => (
                        <span
                          key={f.name}
                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-white/5 text-white/40 px-2 py-0.5 rounded-lg"
                        >
                          {f.name}
                          <span className="text-emerald-400/60">
                            [{f.fieldType}]
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      data-ocid={`forms.edit_button.${idx + 1}`}
                      onClick={() => openEditForm(tmpl)}
                      className="flex items-center gap-1 text-[10px] text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-colors font-bold uppercase"
                    >
                      <Edit3 size={10} /> Edit
                    </button>
                    <button
                      type="button"
                      data-ocid={`forms.history_button.${idx + 1}`}
                      onClick={() => setVersionModalFormId(String(tmpl.id))}
                      className="flex items-center gap-1 text-[10px] text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-xl hover:bg-purple-500/10 transition-colors font-bold uppercase"
                    >
                      <History size={10} /> History
                    </button>
                    <button
                      type="button"
                      data-ocid={`forms.delete_button.${idx + 1}`}
                      onClick={() => handleDelete(tmpl.id)}
                      disabled={String(deletingId) === String(tmpl.id)}
                      className="flex items-center gap-1 text-[10px] text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors font-bold uppercase"
                    >
                      {String(deletingId) === String(tmpl.id) ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Trash2 size={10} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}
      <ExternalFormsSection
        externalForms={externalForms}
        departments={departments}
        actor={actor}
        onRefresh={onRefresh}
      />

      {/* Feature 7: Version History Modal */}
      {versionModalFormId && (
        <Dialog
          open={!!versionModalFormId}
          onOpenChange={() => setVersionModalFormId(null)}
        >
          <DialogContent className="bg-[#151515] border border-white/5 text-white max-w-sm mx-auto rounded-[28px] overflow-y-auto max-h-[80dvh]">
            <DialogHeader>
              <DialogTitle className="text-white font-black uppercase tracking-tight flex items-center gap-2">
                <History size={16} className="text-purple-400" /> Version
                History
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {(() => {
                const versions = getFormVersions(versionModalFormId);
                if (versions.length === 0)
                  return (
                    <div className="text-white/30 text-xs font-bold uppercase text-center py-8">
                      No versions saved yet.
                    </div>
                  );
                return versions
                  .slice()
                  .reverse()
                  .map((v) => (
                    <div
                      key={v.version}
                      className="bg-black/30 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-purple-400 uppercase">
                          Version {v.version}
                        </span>
                        <span className="text-[9px] text-white/20">
                          {new Date(v.savedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mb-1">
                        {v.title}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {v.fields.map((f, i) => {
                          try {
                            const parsed = JSON.parse(f);
                            return (
                              <span
                                key={`${String(i)}-${f}`}
                                className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 rounded-lg"
                              >
                                {parsed.name}
                              </span>
                            );
                          } catch {
                            return null;
                          }
                        })}
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// EXTERNAL FORMS Section (within Admin FORMS Tab)
// ─────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  "Google Forms": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  JotForm: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Typeform: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Zoho Forms": "bg-teal-500/15 text-teal-400 border-teal-500/20",
  "Microsoft Forms": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  SurveyMonkey: "bg-green-500/15 text-green-400 border-green-500/20",
  Tally: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  Other: "bg-white/10 text-white/50 border-white/10",
};

const PLATFORMS = [
  "Google Forms",
  "JotForm",
  "Typeform",
  "Zoho Forms",
  "Microsoft Forms",
  "SurveyMonkey",
  "Tally",
  "Other",
];

function PlatformBadge({ platform }: { platform: string }) {
  const cls = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.Other;
  return (
    <span
      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${cls}`}
    >
      {platform}
    </span>
  );
}

function ExternalFormsSection({
  externalForms,
  departments,
  actor,
  onRefresh,
}: {
  externalForms: ExternalForm[];
  departments: Department[];
  actor: ReturnType<typeof useActor>["actor"];
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingForm, setEditingForm] = useState<ExternalForm | null>(null);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("Google Forms");
  const [embedUrl, setEmbedUrl] = useState("");
  const [deptId, setDeptId] = useState("0");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const openAdd = () => {
    setEditingForm(null);
    setTitle("");
    setPlatform("Google Forms");
    setEmbedUrl("");
    setDeptId("0");
    setShowAdd(true);
  };

  const openEdit = (ef: ExternalForm) => {
    setEditingForm(ef);
    setTitle(ef.title);
    setPlatform(ef.platform);
    setEmbedUrl(ef.embedUrl);
    setDeptId(String(ef.departmentId));
    setShowAdd(true);
  };

  const cancel = () => {
    setShowAdd(false);
    setEditingForm(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !title.trim() || !embedUrl.trim()) return;
    setSaving(true);
    try {
      if (editingForm) {
        await actor.updateExternalForm({
          ...editingForm,
          title: title.trim(),
          platform,
          embedUrl: embedUrl.trim(),
          departmentId: BigInt(deptId),
        });
        toast.success("External form updated");
      } else {
        await actor.createExternalForm(
          title.trim(),
          platform,
          embedUrl.trim(),
          BigInt(deptId),
        );
        toast.success("External form added");
      }
      cancel();
      onRefresh();
    } catch {
      toast.error("Failed to save external form");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    setDeletingId(id);
    try {
      await actor.deleteExternalForm(id);
      toast.success("External form deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete external form");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-emerald-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <span className="w-5 h-0.5 bg-emerald-500 inline-block rounded" />
          External Forms
        </h3>
        {!showAdd && (
          <button
            type="button"
            data-ocid="extforms.open_modal_button"
            onClick={openAdd}
            className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl hover:bg-emerald-500/20 transition-colors font-black uppercase"
          >
            <Plus size={11} /> Attach Form
          </button>
        )}
      </div>

      {/* Add/Edit inline form */}
      {showAdd && (
        <Card className="p-5">
          <div className="text-white font-black text-xs uppercase tracking-widest mb-4">
            {editingForm ? "Edit External Form" : "Attach External Form"}
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label
                htmlFor="ef-title"
                className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1.5"
              >
                Form Title
              </label>
              <input
                id="ef-title"
                data-ocid="extforms.input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Patient Feedback Survey"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                required
              />
            </div>
            <div>
              <label
                htmlFor="ef-platform"
                className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1.5"
              >
                Platform
              </label>
              <select
                id="ef-platform"
                data-ocid="extforms.select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} className="bg-[#151515]">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="ef-url"
                className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1.5"
              >
                Form URL / Embed URL
              </label>
              <input
                id="ef-url"
                data-ocid="extforms.input"
                type="url"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://forms.google.com/..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                required
              />
            </div>
            <div>
              <label
                htmlFor="ef-dept"
                className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1.5"
              >
                Assign To
              </label>
              <select
                id="ef-dept"
                data-ocid="extforms.select"
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              >
                <option value="0" className="bg-[#151515]">
                  Global (All Departments)
                </option>
                {departments.map((d) => (
                  <option
                    key={String(d.id)}
                    value={String(d.id)}
                    className="bg-[#151515]"
                  >
                    {d.departmentLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                data-ocid="extforms.cancel_button"
                onClick={cancel}
                className="flex-1 py-3 rounded-2xl bg-white/5 text-white/60 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-ocid="extforms.save_button"
                disabled={saving || !title.trim() || !embedUrl.trim()}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {editingForm ? "Update" : "Attach Form"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* External Forms List */}
      {!showAdd && externalForms.length === 0 && (
        <Card className="p-8 text-center">
          <div
            data-ocid="extforms.empty_state"
            className="text-white/20 text-xs font-bold uppercase"
          >
            No external forms attached yet.
          </div>
        </Card>
      )}
      {!showAdd && externalForms.length > 0 && (
        <div className="space-y-3">
          {externalForms.map((ef, idx) => (
            <Card
              key={String(ef.id)}
              data-ocid={`extforms.item.${idx + 1}`}
              className="p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-base font-black text-white">
                      {ef.title}
                    </div>
                    <PlatformBadge platform={ef.platform} />
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${ef.departmentId === 0n ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"}`}
                    >
                      {ef.departmentId === 0n
                        ? "Global"
                        : (departments.find((d) => d.id === ef.departmentId)
                            ?.departmentLabel ?? "Unknown Dept")}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1 truncate max-w-xs">
                    {ef.embedUrl}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    data-ocid={`extforms.edit_button.${idx + 1}`}
                    onClick={() => openEdit(ef)}
                    className="flex items-center gap-1 text-[10px] text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-colors font-bold uppercase"
                  >
                    <Edit3 size={10} /> Edit
                  </button>
                  <button
                    type="button"
                    data-ocid={`extforms.delete_button.${idx + 1}`}
                    onClick={() => handleDelete(ef.id)}
                    disabled={String(deletingId) === String(ef.id)}
                    className="flex items-center gap-1 text-[10px] text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors font-bold uppercase"
                  >
                    {String(deletingId) === String(ef.id) ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Trash2 size={10} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CONFIG Tab
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// CONFIG Tab (Admin)
// ─────────────────────────────────────────────
function BulkUserImport({
  actor,
  onDone,
}: { actor: ReturnType<typeof useActor>["actor"]; onDone: () => void }) {
  const [progress, setProgress] = React.useState<string[]>([]);
  const [importing, setImporting] = React.useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !actor) return;
    setImporting(true);
    setProgress([]);
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const dataLines = lines[0]?.toLowerCase().includes("name")
      ? lines.slice(1)
      : lines;
    const msgs: string[] = [];
    for (let i = 0; i < dataLines.length; i++) {
      const parts = dataLines[i].split(",").map((p) => p.trim());
      const [name, pin, deptId] = parts;
      if (!name || !pin || !deptId) {
        msgs.push(`Row ${i + 1}: Invalid format - skipped`);
        setProgress([...msgs]);
        continue;
      }
      try {
        await actor.createDepartmentHead(name, pin, BigInt(deptId));
        msgs.push(`Row ${i + 1}: ✓ ${name} imported`);
        logActivity("User Created", `Bulk import: ${name}`);
      } catch {
        msgs.push(`Row ${i + 1}: ✗ ${name} failed`);
      }
      setProgress([...msgs]);
    }
    setImporting(false);
    toast.success(
      `Import complete: ${msgs.filter((m) => m.includes("✓")).length}/${dataLines.length} users`,
    );
    onDone();
  };

  return (
    <div className="space-y-3">
      <label
        data-ocid="config.bulk.upload_button"
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/40 text-white/40 hover:text-emerald-400 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}
      >
        {importing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {importing ? "Importing..." : "Choose CSV File"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFile}
          disabled={importing}
        />
      </label>
      {progress.length > 0 && (
        <div className="bg-black/30 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto">
          {progress.map((p, i) => (
            <div
              key={`${String(i)}-${p.slice(0, 20)}`}
              className={`text-[10px] font-bold ${p.includes("✓") ? "text-emerald-400" : "text-rose-400"}`}
            >
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BackupRestoreSection({
  departments,
  templates,
  reports,
}: {
  departments: Department[];
  templates: FormTemplate[];
  reports: Report[];
}) {
  const [restoring, setRestoring] = React.useState(false);

  const handleExport = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      departments,
      templates,
      reports,
      localStorage: {
        thq_deadlines: localStorage.getItem("thq_deadlines"),
        thq_comments: localStorage.getItem("thq_comments"),
        thq_activity_log: localStorage.getItem("thq_activity_log"),
        thq_form_versions: localStorage.getItem("thq_form_versions"),
        thq_status_history: localStorage.getItem("thq_status_history"),
        thq_wa_config: localStorage.getItem("thq_wa_config"),
      },
    };
    const blob = new Blob(
      [
        JSON.stringify(
          backup,
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thq-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity("Backup", "Admin exported backup");
    toast.success("Backup downloaded");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.localStorage) {
        const ls = data.localStorage;
        if (ls.thq_deadlines)
          localStorage.setItem("thq_deadlines", ls.thq_deadlines);
        if (ls.thq_comments)
          localStorage.setItem("thq_comments", ls.thq_comments);
        if (ls.thq_activity_log)
          localStorage.setItem("thq_activity_log", ls.thq_activity_log);
        if (ls.thq_form_versions)
          localStorage.setItem("thq_form_versions", ls.thq_form_versions);
        if (ls.thq_status_history)
          localStorage.setItem("thq_status_history", ls.thq_status_history);
      }
      logActivity("Restore", "Admin restored backup");
      toast.success("Backup restored. Reload to apply backend data.");
    } catch {
      toast.error("Invalid backup file");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          data-ocid="config.backup.button"
          onClick={handleExport}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-xs font-black uppercase"
        >
          <Download size={14} /> Export Backup
        </button>
        <label
          data-ocid="config.restore.button"
          className={`flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-xs font-black uppercase cursor-pointer ${restoring ? "opacity-50" : ""}`}
        >
          {restoring ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          Import Backup
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
            disabled={restoring}
          />
        </label>
      </div>
      <p className="text-[10px] text-white/20 font-bold">
        Note: Backup includes all localStorage data. Backend data cannot be
        restored via API.
      </p>
    </div>
  );
}

function ConfigTab({
  departments,
  actor,
  config,
  onRefresh,
  reports,
  templates,
}: {
  departments: Department[];
  actor: ReturnType<typeof useActor>["actor"];
  config: AppConfig | null;
  onRefresh: () => void;
  reports: Report[];
  templates: FormTemplate[];
}) {
  const [appCfg, setAppCfg] = useState<
    Omit<AppConfig, "tvRefreshRate"> & { tvRefreshRate: number }
  >({
    hospitalName: config?.hospitalName || "THQ Hospital Sillanwali",
    departmentName: config?.departmentName || "IT DEPARTMENT",
    tvRefreshRate: config ? Number(config.tvRefreshRate) : 30,
  });
  const [savingCfg, setSavingCfg] = useState(false);

  // WhatsApp Config state
  const [waCfg, setWaCfg] = useState<WaConfig>({
    phoneNumberId: "",
    accessToken: "",
    messageFormat:
      "Friendly Reminder: Please submit your {formName} report for {departmentName} by today. Kindly submit your report as early as possible.",
  });
  const [savingWa, setSavingWa] = useState(false);

  // Department Users state
  const [deptHeads, setDeptHeads] = useState<DepartmentHead[]>([]);
  const [loadingHeads, setLoadingHeads] = useState(false);
  const [newHead, setNewHead] = useState({ name: "", pin: "", deptId: "" });
  const [addingHead, setAddingHead] = useState(false);
  const [savingHead, setSavingHead] = useState(false);
  const [editHead, setEditHead] = useState<DepartmentHead | null>(null);
  const [editHeadDeptId, setEditHeadDeptId] = useState("");
  const [savingEditHead, setSavingEditHead] = useState(false);

  const [editDept, setEditDept] = useState<Department | null>(null);
  const [savingDept, setSavingDept] = useState(false);

  useEffect(() => {
    if (config)
      setAppCfg({ ...config, tvRefreshRate: Number(config.tvRefreshRate) });
  }, [config]);

  useEffect(() => {
    if (!actor) return;
    setLoadingHeads(true);
    actor
      .getAllDepartmentHeads()
      .then(setDeptHeads)
      .catch(() => toast.error("Failed to load dept heads"))
      .finally(() => setLoadingHeads(false));
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    actor
      .getWaConfig()
      .then(setWaCfg)
      .catch(() => {});
  }, [actor]);

  const saveWaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWa(true);
    try {
      await actor!.setWaConfig(waCfg);
      toast.success("WhatsApp config saved");
    } catch {
      toast.error("Failed to save WhatsApp config");
    } finally {
      setSavingWa(false);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    setSavingCfg(true);
    try {
      await actor.setAppConfig({
        ...appCfg,
        tvRefreshRate: BigInt(appCfg.tvRefreshRate || 30),
      });
      toast.success("Configuration saved");
      onRefresh();
    } catch {
      toast.error("Failed to save config");
    } finally {
      setSavingCfg(false);
    }
  };

  const handleAddHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !newHead.name || !newHead.pin || !newHead.deptId) return;
    setSavingHead(true);
    try {
      await actor.createDepartmentHead(
        newHead.name,
        newHead.pin,
        BigInt(newHead.deptId),
      );
      logActivity("User Created", `User "${newHead.name}" created`);
      const updatedHeads = await actor.getAllDepartmentHeads();
      setDeptHeads(updatedHeads);
      setNewHead({ name: "", pin: "", deptId: "" });
      setAddingHead(false);
      toast.success("Department user created");
    } catch {
      toast.error("Failed to create department user");
    } finally {
      setSavingHead(false);
    }
  };

  const handleUpdateHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !editHead) return;
    setSavingEditHead(true);
    try {
      await actor.updateDepartmentHead({
        ...editHead,
        departmentId: BigInt(editHeadDeptId || editHead.departmentId),
      });
      const updatedHeads = await actor.getAllDepartmentHeads();
      setDeptHeads(updatedHeads);
      setEditHead(null);
      toast.success("Department user updated");
    } catch {
      toast.error("Failed to update department user");
    } finally {
      setSavingEditHead(false);
    }
  };

  const handleDeleteHead = async (pin: string) => {
    if (!actor) return;
    try {
      await actor.deleteDepartmentHead(pin);
      logActivity("User Deleted", "User with PIN deleted");
      setDeptHeads((prev) => prev.filter((h) => h.pin !== pin));
      toast.success("Department user removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !editDept) return;
    setSavingDept(true);
    try {
      await actor.updateDepartment(editDept);
      setEditDept(null);
      toast.success("Department updated");
      onRefresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingDept(false);
    }
  };

  return (
    <div className="space-y-5 pb-28">
      <h2 className="text-white font-black flex items-center gap-2 uppercase">
        <Settings size={20} className="text-emerald-400" /> Global Configuration
      </h2>

      {/* ── Department Users (User Management) — FIRST & PROMINENT ── */}
      <div className="border border-emerald-500/20 rounded-[28px] overflow-hidden">
        <div className="bg-emerald-500/10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users size={16} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-black text-white uppercase tracking-tight">
                Department Users
              </div>
              <div className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest mt-0.5">
                User Management
              </div>
            </div>
          </div>
          <button
            type="button"
            data-ocid="config.head.add_button"
            onClick={() => {
              setAddingHead(!addingHead);
              setEditHead(null);
            }}
            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors uppercase tracking-widest bg-black/20"
          >
            <UserPlus size={12} /> Add User
          </button>
        </div>

        <div className="p-5 space-y-4 bg-[#151515]">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3">
            <p className="text-[11px] text-blue-300/80 font-bold">
              ⚠️ Create department users here first. Each user gets a PIN to log
              in as a Department Head and access their assigned department.
            </p>
          </div>

          {addingHead && (
            <form
              onSubmit={handleAddHead}
              className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3"
            >
              <SectionLabel>
                <UserPlus size={10} /> New Department User
              </SectionLabel>
              <FieldInput
                label="Full Name"
                value={newHead.name}
                onChange={(v) => setNewHead((p) => ({ ...p, name: v }))}
                placeholder="e.g. Dr. Ahmed"
              />
              <FieldInput
                label="PIN (4-6 digits)"
                value={newHead.pin}
                onChange={(v) => setNewHead((p) => ({ ...p, pin: v }))}
                type="password"
                maxLength={6}
                placeholder="Create PIN"
              />
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  Assign Department
                </span>
                <select
                  value={newHead.deptId}
                  onChange={(e) =>
                    setNewHead((p) => ({ ...p, deptId: e.target.value }))
                  }
                  data-ocid="config.head.dept_select"
                  className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={String(d.id)} value={String(d.id)}>
                      {d.departmentLabel}
                    </option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="text-[10px] text-amber-400/80 font-bold">
                    No departments yet — add departments in the DEPT tab first.
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  data-ocid="config.head.cancel_button"
                  onClick={() => setAddingHead(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    savingHead ||
                    !newHead.name ||
                    !newHead.pin ||
                    !newHead.deptId
                  }
                  data-ocid="config.head.save_button"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase disabled:opacity-40 flex items-center justify-center gap-1 transition-colors"
                >
                  {savingHead ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <UserPlus size={12} />
                  )}
                  Create User
                </button>
              </div>
            </form>
          )}

          {loadingHeads ? (
            <div
              data-ocid="config.head.loading_state"
              className="flex justify-center py-6"
            >
              <Loader2 size={20} className="text-emerald-400 animate-spin" />
            </div>
          ) : deptHeads.length === 0 ? (
            <div
              data-ocid="config.head.empty_state"
              className="text-center py-8 border border-dashed border-white/10 rounded-2xl"
            >
              <Users size={28} className="text-white/10 mx-auto mb-2" />
              <div className="text-white/20 text-xs font-bold uppercase">
                No department users yet
              </div>
              <div className="text-white/10 text-[10px] mt-1">
                Click "Add User" to create the first one
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {deptHeads.map((h, idx) => {
                const dname =
                  departments.find(
                    (d) => String(d.id) === String(h.departmentId),
                  )?.departmentLabel || "Unknown Department";
                const isEditing = editHead?.pin === h.pin;
                return (
                  <div key={h.pin} data-ocid={`config.head.item.${idx + 1}`}>
                    {isEditing ? (
                      <form
                        onSubmit={handleUpdateHead}
                        className="bg-black/30 border border-emerald-500/20 rounded-2xl p-4 space-y-3"
                      >
                        <SectionLabel>Edit User</SectionLabel>
                        <FieldInput
                          label="Full Name"
                          value={editHead.name}
                          onChange={(v) =>
                            setEditHead((p) => (p ? { ...p, name: v } : p))
                          }
                          placeholder="Full Name"
                        />
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            Assign Department
                          </span>
                          <select
                            value={
                              editHeadDeptId || String(editHead.departmentId)
                            }
                            onChange={(e) => setEditHeadDeptId(e.target.value)}
                            className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                          >
                            {departments.map((d) => (
                              <option key={String(d.id)} value={String(d.id)}>
                                {d.departmentLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            data-ocid={`config.head.cancel_button.${idx + 1}`}
                            onClick={() => {
                              setEditHead(null);
                              setEditHeadDeptId("");
                            }}
                            className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-bold uppercase"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingEditHead}
                            data-ocid={`config.head.save_button.${idx + 1}`}
                            className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase disabled:opacity-40 flex items-center justify-center"
                          >
                            {savingEditHead ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between bg-black/20 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                            <Users size={14} className="text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-white">
                              {h.name}
                            </div>
                            <div className="text-[10px] text-white/30 font-bold mt-0.5">
                              {dname} • PIN: {"•".repeat(h.pin.length)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-ocid={`config.head.edit_button.${idx + 1}`}
                            onClick={() => {
                              setEditHead({ ...h });
                              setEditHeadDeptId(String(h.departmentId));
                              setAddingHead(false);
                            }}
                            className="text-blue-400/50 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-500/10"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            data-ocid={`config.head.delete_button.${idx + 1}`}
                            onClick={() => handleDeleteHead(h.pin)}
                            className="text-rose-500/50 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bulk User Import ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel>
            <Upload size={12} /> Bulk User Import (CSV)
          </SectionLabel>
          <button
            type="button"
            data-ocid="config.bulk.download_button"
            onClick={() => {
              const csv =
                "name,pin,departmentId\nDr. Ahmed,1234,1\nDr. Sara,5678,2";
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "sample-users.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-[10px] text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl hover:bg-emerald-500/10 transition-colors font-bold uppercase flex items-center gap-1"
          >
            <Download size={10} /> Sample CSV
          </button>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
          <p className="text-[11px] text-blue-300/80 font-bold">
            CSV Format: name,pin,departmentId (one user per row)
          </p>
        </div>
        <BulkUserImport
          actor={actor}
          onDone={async () => {
            if (!actor) return;
            actor
              .getAllDepartmentHeads()
              .then(() => {})
              .catch(() => {});
          }}
        />
      </Card>

      {/* ── App Settings ── */}
      <Card className="p-5 space-y-4">
        <SectionLabel>
          <Monitor size={12} /> App Settings
        </SectionLabel>
        <form onSubmit={saveConfig} className="space-y-3">
          <FieldInput
            label="Hospital Name"
            value={appCfg.hospitalName}
            onChange={(v) => setAppCfg((p) => ({ ...p, hospitalName: v }))}
          />
          <FieldInput
            label="IT Department Label"
            value={appCfg.departmentName}
            onChange={(v) => setAppCfg((p) => ({ ...p, departmentName: v }))}
          />
          <FieldInput
            label="TV Refresh Rate (seconds)"
            type="number"
            value={String(appCfg.tvRefreshRate)}
            onChange={(v) =>
              setAppCfg((p) => ({
                ...p,
                tvRefreshRate: Number.parseInt(v) || 30,
              }))
            }
          />
          <button
            type="submit"
            data-ocid="config.save_button"
            disabled={savingCfg}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black py-3 rounded-2xl uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
          >
            {savingCfg && <Loader2 size={14} className="animate-spin" />}
            Save Configuration
          </button>
        </form>
      </Card>

      {/* ── WhatsApp Notifications Config ── */}
      <Card className="p-5 space-y-4">
        <SectionLabel>
          <MessageSquare size={12} /> WhatsApp Notifications
        </SectionLabel>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3">
          <p className="text-[11px] text-blue-300/80 font-bold">
            Uses Meta WhatsApp Business API. Variables you can use in the
            message format:{" "}
            <span className="text-emerald-400">&#123;formName&#125;</span>,{" "}
            <span className="text-emerald-400">&#123;departmentName&#125;</span>
          </p>
        </div>
        <form onSubmit={saveWaConfig} className="space-y-3">
          <FieldInput
            label="Phone Number ID"
            value={waCfg.phoneNumberId}
            onChange={(v) => setWaCfg((p) => ({ ...p, phoneNumberId: v }))}
            placeholder="e.g. 1234567890"
          />
          <FieldInput
            label="Access Token"
            type="password"
            value={waCfg.accessToken}
            onChange={(v) => setWaCfg((p) => ({ ...p, accessToken: v }))}
            placeholder="Bearer token from Meta"
          />
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Message Format
            </span>
            <textarea
              value={waCfg.messageFormat}
              onChange={(e) =>
                setWaCfg((p) => ({ ...p, messageFormat: e.target.value }))
              }
              rows={3}
              data-ocid="config.wa.textarea"
              className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm font-medium text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500 transition-all placeholder:text-white/20 resize-none"
              placeholder="Friendly Reminder: Please submit your {formName} report for {departmentName} by today."
            />
          </div>
          <button
            type="submit"
            disabled={savingWa}
            data-ocid="config.wa.save_button"
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
          >
            {savingWa ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            Save WhatsApp Config
          </button>
        </form>
      </Card>

      {/* ── Backup & Restore ── */}
      <Card className="p-5 space-y-4">
        <SectionLabel>
          <HardDrive size={12} /> Backup &amp; Restore
        </SectionLabel>
        <BackupRestoreSection
          departments={departments}
          templates={templates}
          reports={reports}
        />
      </Card>

      {/* ── Department Management ── */}
      <Card className="p-5 space-y-4">
        <SectionLabel>
          <ClipboardList size={12} /> Department Management
        </SectionLabel>
        <div className="space-y-2">
          {departments.map((d) => (
            <div key={String(d.id)}>
              {editDept && String(editDept.id) === String(d.id) ? (
                <form
                  onSubmit={handleUpdateDept}
                  className="bg-black/30 rounded-2xl p-4 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <FieldInput
                      label="Label"
                      value={editDept.departmentLabel}
                      onChange={(v) =>
                        setEditDept((p) =>
                          p ? { ...p, departmentLabel: v } : p,
                        )
                      }
                    />
                    <FieldInput
                      label="Patient Count"
                      type="number"
                      value={String(editDept.patientCount)}
                      onChange={(v) =>
                        setEditDept((p) =>
                          p ? { ...p, patientCount: BigInt(v || 0) } : p,
                        )
                      }
                    />
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        Icon
                      </span>
                      <select
                        value={editDept.icon}
                        onChange={(e) =>
                          setEditDept((p) =>
                            p ? { ...p, icon: e.target.value } : p,
                          )
                        }
                        className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                      >
                        {ICON_OPTIONS.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        Color
                      </span>
                      <select
                        value={editDept.color}
                        onChange={(e) =>
                          setEditDept((p) =>
                            p ? { ...p, color: e.target.value } : p,
                          )
                        }
                        className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
                      >
                        {COLOR_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c.replace("text-", "")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditDept(null)}
                      className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-bold uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingDept}
                      data-ocid={`config.dept.save_button.${Number(d.id)}`}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase disabled:opacity-40"
                    >
                      {savingDept ? (
                        <Loader2 size={12} className="animate-spin mx-auto" />
                      ) : (
                        "Save"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between bg-black/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <DeptIcon icon={d.icon} className={`${d.color} w-5 h-5`} />
                    <span className="text-sm font-bold text-white">
                      {d.departmentLabel}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] text-white/40 border-white/10"
                    >
                      {String(d.patientCount)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-ocid={`config.dept.edit_button.${Number(d.id)}`}
                      onClick={() => setEditDept({ ...d })}
                      className="text-white/30 hover:text-emerald-400 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {departments.length === 0 && (
            <div className="text-center py-4 text-white/20 text-xs font-bold uppercase">
              No departments yet. Go to the DEPT tab to add departments.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Notify Tab
// ─────────────────────────────────────────────
// LOGS Tab (Admin) - Feature 10 + Feature 2
// ─────────────────────────────────────────────
function LogsTab({
  reports,
  departments,
}: { reports: Report[]; departments: Department[] }) {
  const [logs, setLogs] = React.useState<ActivityEntry[]>([]);
  const [dateRange, setDateRange] = React.useState<"today" | "week" | "month">(
    "today",
  );
  React.useEffect(() => {
    setLogs(getActivityLog());
  }, []);

  const clearLogs = () => {
    localStorage.removeItem("thq_activity_log");
    setLogs([]);
    toast.success("Logs cleared");
  };

  const getActionIcon = (action: string) => {
    if (action.includes("Login")) return "🔐";
    if (action.includes("Form")) return "📋";
    if (action.includes("Submission")) return "📤";
    if (action.includes("User")) return "👤";
    if (action.includes("Status")) return "🔄";
    if (action.includes("Backup") || action.includes("Restore")) return "💾";
    if (action.includes("Config")) return "⚙️";
    return "📌";
  };

  const getFilteredReports = () => {
    const now = new Date();
    return reports.filter((r) => {
      const date = new Date(Number(r.timestamp) / 1_000_000);
      if (dateRange === "today") {
        return date.toDateString() === now.toDateString();
      }
      if (dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      }
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= monthAgo;
    });
  };

  const generateReportSummaryPDF = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      toast.error("No reports in selected period");
      return;
    }
    const getDeptName = (id: bigint) =>
      departments.find((d) => String(d.id) === String(id))?.departmentLabel ||
      "Unknown";
    const byDept: Record<string, { count: number; names: string[] }> = {};
    for (const r of filtered) {
      const name = getDeptName(r.departmentId);
      if (!byDept[name]) byDept[name] = { count: 0, names: [] };
      byDept[name].count++;
      byDept[name].names.push(r.submittedBy);
    }
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up blocked");
      return;
    }
    const label =
      dateRange === "today"
        ? "Today"
        : dateRange === "week"
          ? "Last 7 Days"
          : "Last 30 Days";
    const rows = Object.entries(byDept)
      .map(
        ([dept, data]) =>
          `<tr><td>${dept}</td><td>${data.count}</td><td>${[...new Set(data.names)].join(", ")}</td></tr>`,
      )
      .join("");
    win.document.write(
      `<!DOCTYPE html><html><head><title>THQ Report Summary</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}h1{font-size:18px}table{width:100%;border-collapse:collapse}th{background:#1a1a1a;color:#fff;padding:8px;text-align:left;font-size:11px;text-transform:uppercase}td{padding:7px 10px;border-bottom:1px solid #e5e5e5;font-size:11px}@media print{body{padding:0}}</style></head><body><h1>THQ Hospital — Report Summary (${label})</h1><p>Generated: ${new Date().toLocaleString()} | Total Submissions: ${filtered.length}</p><table><thead><tr><th>Department</th><th>Count</th><th>Submitted By</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    win.document.close();
    win.print();
    logActivity("Report Summary", `Generated PDF summary for ${label}`);
  };

  return (
    <div className="space-y-5 pb-28">
      <h2 className="text-white font-black flex items-center gap-2 uppercase">
        <ScrollText size={20} className="text-emerald-400" /> Activity Logs
      </h2>

      {/* Report Summary Generator */}
      <div className="border border-purple-500/20 rounded-[28px] overflow-hidden">
        <div className="bg-purple-500/10 px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <FileSearch size={16} className="text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-black text-white uppercase">
              Generate Report Summary
            </div>
            <div className="text-[10px] text-purple-400/60 font-bold uppercase mt-0.5">
              PDF export by date range
            </div>
          </div>
        </div>
        <div className="p-5 bg-[#151515] space-y-4">
          <div className="flex gap-2">
            {(["today", "week", "month"] as const).map((r) => (
              <button
                key={r}
                type="button"
                data-ocid={`logs.range_${r}_button`}
                onClick={() => setDateRange(r)}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-colors ${dateRange === r ? "bg-purple-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
              >
                {r === "today" ? "Today" : r === "week" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
          <div className="text-center text-sm text-white/60 font-bold">
            {getFilteredReports().length} submissions in period
          </div>
          <button
            type="button"
            data-ocid="logs.generate_pdf_button"
            onClick={generateReportSummaryPDF}
            className="w-full py-3 rounded-xl bg-purple-500 text-white text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-purple-400 transition-colors"
          >
            <Printer size={14} /> Generate PDF Summary
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="flex items-center justify-between">
        <SectionLabel>
          <ScrollText size={10} /> Activity Feed ({logs.length})
        </SectionLabel>
        <button
          type="button"
          data-ocid="logs.clear_button"
          onClick={clearLogs}
          className="text-[10px] text-rose-500/60 hover:text-rose-500 font-bold uppercase border border-rose-500/20 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors"
        >
          Clear Logs
        </button>
      </div>

      {logs.length === 0 ? (
        <div
          data-ocid="logs.empty_state"
          className="bg-[#151515] border border-white/5 rounded-[28px] p-10 text-center"
        >
          <div className="text-white/20 text-xs font-bold uppercase">
            No activity logged yet.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              data-ocid="logs.item.1"
              className="bg-[#151515] border border-white/5 rounded-2xl px-4 py-3 flex items-start gap-3"
            >
              <span className="text-base mt-0.5">
                {getActionIcon(log.action)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-black text-white">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {log.actor}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {log.details}
                </div>
                <div className="text-[9px] text-white/20 mt-0.5">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
function NotifyTab({
  departments,
  templates,
  actor,
}: {
  departments: Department[];
  templates: FormTemplate[];
  actor: ReturnType<typeof useActor>["actor"];
}) {
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [waConfig, setWaConfig] = useState<WaConfig>({
    phoneNumberId: "",
    accessToken: "",
    messageFormat:
      "Friendly Reminder: Please submit your {formName} report for {departmentName} by today. Kindly submit your report as early as possible.",
  });

  useEffect(() => {
    if (!actor) return;
    actor
      .getWaConfig()
      .then(setWaConfig)
      .catch(() => {});
  }, [actor]);
  // legacy refresh
  const refreshConfig = () => {
    if (actor)
      actor
        .getWaConfig()
        .then(setWaConfig)
        .catch(() => {});
  };

  const selectedDept = departments.find((d) => String(d.id) === selectedDeptId);
  const selectedForm = templates.find((t) => String(t.id) === selectedFormId);

  const previewMsg = waConfig.messageFormat
    ? waConfig.messageFormat
        .replace("{formName}", selectedForm?.title || "[Form Name]")
        .replace(
          "{departmentName}",
          selectedDept?.departmentLabel || "[Department Name]",
        )
    : "";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waConfig.phoneNumberId || !waConfig.accessToken) {
      toast.error("WhatsApp API not configured. Go to CONFIG tab.");
      return;
    }
    if (!selectedDeptId) {
      toast.error("Please select a department.");
      return;
    }
    if (!recipientPhone) {
      toast.error("Please enter a recipient phone number.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${waConfig.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waConfig.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipientPhone,
            type: "text",
            text: { body: previewMsg },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || res.statusText);
      }
      toast.success("Notification sent!");
    } catch (err: any) {
      toast.error(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black flex items-center gap-2 uppercase">
          <Bell size={20} className="text-emerald-400" /> WhatsApp Notifications
        </h2>
        <button
          type="button"
          onClick={refreshConfig}
          className="text-white/30 hover:text-emerald-400 transition-colors"
          title="Reload config"
        >
          <RefreshCcw size={14} />
        </button>
      </div>

      {!waConfig.phoneNumberId && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-start gap-3">
          <MessageSquare size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300/80 font-bold">
            WhatsApp API is not configured. Go to the{" "}
            <span className="text-emerald-400 underline cursor-pointer">
              CONFIG
            </span>{" "}
            tab and add your Phone Number ID and Access Token.
          </p>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <SectionLabel>
          <Send size={12} /> Send Notification
        </SectionLabel>
        <form onSubmit={handleSend} className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Select Department
            </span>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              data-ocid="notify.dept.select"
              className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>
                  {d.departmentLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Select Form
            </span>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              data-ocid="notify.form.select"
              className="w-full bg-black/40 rounded-xl px-3 py-2.5 text-sm text-white border border-white/5 outline-none focus:ring-1 ring-emerald-500"
            >
              <option value="">-- Select Form (optional) --</option>
              {templates.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <FieldInput
            label="Recipient Phone"
            value={recipientPhone}
            onChange={setRecipientPhone}
            placeholder="+92XXXXXXXXXX"
          />

          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Message Preview
            </span>
            <textarea
              readOnly
              value={previewMsg}
              rows={3}
              data-ocid="notify.preview.textarea"
              className="w-full bg-black/20 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 border border-white/5 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !waConfig.phoneNumberId}
            data-ocid="notify.send_button"
            className="w-full py-3 rounded-xl bg-emerald-500 text-black text-sm font-black uppercase disabled:opacity-40 flex items-center justify-center gap-2 transition-colors hover:bg-emerald-400"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {sending ? "Sending..." : "Send Notification"}
          </button>
        </form>
      </Card>
    </div>
  );
}

// Nav Button
// ─────────────────────────────────────────────
function NavBtn({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${
        active ? "text-emerald-400" : "text-white/30 hover:text-white/50"
      }`}
    >
      <Icon size={16} />
      <span className="text-[7px] font-black uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
export default function App() {
  const { actor, isFetching } = useActor();
  const [session, setSession] = useState<Session>({ type: "none" });
  const [adminTab, setAdminTab] = useState<AdminTab>("TV");
  const [deptTab, setDeptTab] = useState<DeptTab>("MY_DEPT");

  // Feature 11: Auto-logout after 15 minutes inactivity
  const inactivityRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const warnRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivityTimer = React.useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
    if (session.type === "none") return;
    warnRef.current = setTimeout(
      () => {
        toast.warning("Session will expire in 1 minute due to inactivity");
      },
      14 * 60 * 1000,
    );
    inactivityRef.current = setTimeout(
      () => {
        setSession({ type: "none" });
        toast.error("Session expired due to inactivity");
      },
      15 * 60 * 1000,
    );
  }, [session.type]);

  React.useEffect(() => {
    const events = ["click", "keypress", "scroll", "touchstart"];
    const handler = () => resetInactivityTimer();
    for (const ev of events)
      window.addEventListener(ev, handler, { passive: true });
    resetInactivityTimer();
    return () => {
      for (const ev of events) window.removeEventListener(ev, handler);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      if (warnRef.current) clearTimeout(warnRef.current);
    };
  }, [resetInactivityTimer]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [externalForms, setExternalForms] = useState<ExternalForm[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const loadData = useCallback(async () => {
    if (!actor) return;
    setDataLoading(true);
    try {
      const [depts, tmpls, cfg, extForms] = await Promise.all([
        actor.getAllDepartments(),
        actor.getAllFormTemplates(),
        actor.getAppConfig(),
        actor.getAllExternalForms(),
      ]);
      setDepartments(depts);
      setHasLoadedOnce(true);
      setTemplates(tmpls as any);
      setConfig(cfg);
      setExternalForms(extForms as ExternalForm[]);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setDataLoading(false);
    }
  }, [actor]);

  const loadReports = useCallback(
    async (deptId?: bigint) => {
      if (!actor) return;
      setReportsLoading(true);
      try {
        const reps = deptId
          ? await actor.getReportsByDepartment(deptId)
          : await actor.getAllReports();
        setReports(reps);
      } catch {
        toast.error("Failed to load reports");
      } finally {
        setReportsLoading(false);
      }
    },
    [actor],
  );

  // Bootstrap: seed departments if empty
  useEffect(() => {
    if (!actor || isFetching || bootstrapped) return;
    setBootstrapped(true);
    (async () => {
      try {
        const depts = await actor.getAllDepartments();
        if (depts.length === 0) {
          await Promise.all(
            SEED_DEPARTMENTS.map((d) =>
              actor.createDepartment(d.label, d.icon, d.color),
            ),
          );
        }
        await loadData();
      } catch {
        await loadData();
      }
    })();
  }, [actor, isFetching, bootstrapped, loadData]);

  // Load reports when tab changes
  useEffect(() => {
    if (!actor) return;
    if (
      session.type === "admin" &&
      (adminTab === "REPORTS" || adminTab === "TV")
    ) {
      loadReports();
    } else if (session.type === "deptHead" && deptTab === "MY_REPORTS") {
      loadReports(session.head.departmentId);
    }
  }, [actor, session, adminTab, deptTab, loadReports]);

  const handleLogout = () => {
    setSession({ type: "none" });
    setAdminTab("TV");
    setDeptTab("MY_DEPT");
  };

  if (session.type === "none") {
    return (
      <>
        <LoginScreen onLogin={setSession} actor={actor} />
        <Toaster position="top-center" />
      </>
    );
  }

  const myDept =
    session.type === "deptHead"
      ? departments.find(
          (d) => String(d.id) === String(session.head.departmentId),
        ) || null
      : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Status Bar */}
      <div className="px-4 py-2 flex justify-between items-center text-[10px] font-bold text-white/20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Monitor size={10} />
          <span className="uppercase tracking-widest">
            SILLANWALI-IT-SECURE-V5
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck size={10} className="text-emerald-400" />
          <span className="text-emerald-400 uppercase">
            {session.type === "admin" ? "Admin" : session.head.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-rose-500/60 hover:text-rose-500 transition-colors uppercase"
          >
            <LogOut size={10} /> Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-5 max-w-2xl mx-auto">
        {!hasLoadedOnce && dataLoading && (
          <div
            data-ocid="app.loading_state"
            className="flex justify-center py-20"
          >
            <Loader2 size={32} className="text-emerald-400 animate-spin" />
          </div>
        )}

        {session.type === "admin" && (
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/10">
            <Monitor size={20} className="text-emerald-400 shrink-0" />
            <h1 className="text-lg font-black text-white tracking-wide uppercase">
              THQ Hospital IT Monitor
            </h1>
          </div>
        )}

        {(hasLoadedOnce || !dataLoading) && (
          <>
            {session.type === "admin" && (
              <>
                {adminTab === "TV" && (
                  <TVTab
                    departments={departments}
                    config={config}
                    reports={reports}
                  />
                )}
                {adminTab === "DEPT" && (
                  <DepartmentsTab
                    departments={departments}
                    actor={actor}
                    onRefresh={loadData}
                  />
                )}
                {adminTab === "REPORTS" && (
                  <ReportsTab
                    reports={reports}
                    departments={departments}
                    loading={reportsLoading}
                    onRefresh={() => loadReports()}
                  />
                )}
                {adminTab === "FORMS" && (
                  <FormsTab
                    templates={templates}
                    actor={actor}
                    onRefresh={loadData}
                    departments={departments}
                    externalForms={externalForms}
                  />
                )}
                {adminTab === "CONFIG" && (
                  <ErrorBoundary>
                    <ConfigTab
                      departments={departments}
                      actor={actor}
                      config={config}
                      onRefresh={loadData}
                      reports={reports}
                      templates={templates}
                    />
                  </ErrorBoundary>
                )}
                {adminTab === "NOTIFY" && (
                  <NotifyTab
                    departments={departments}
                    templates={templates}
                    actor={actor}
                  />
                )}
                {adminTab === "LOGS" && (
                  <LogsTab reports={reports} departments={departments} />
                )}
              </>
            )}

            {session.type === "deptHead" && (
              <>
                {deptTab === "MY_DEPT" && (
                  <MyDeptTab
                    dept={myDept}
                    templates={templates}
                    externalForms={externalForms}
                    actor={actor}
                    headName={session.head.name}
                    onSuccess={() => {
                      loadData();
                      loadReports();
                    }}
                  />
                )}
                {deptTab === "MY_REPORTS" && (
                  <ReportsTab
                    reports={reports}
                    departments={departments}
                    loading={reportsLoading}
                    onRefresh={() => loadReports(session.head.departmentId)}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none z-50">
        <div className="max-w-md mx-auto bg-[#151515]/95 backdrop-blur-xl border border-white/10 rounded-[28px] p-1 flex justify-around items-center pointer-events-auto shadow-2xl">
          {session.type === "admin" ? (
            <>
              <NavBtn
                active={adminTab === "TV"}
                onClick={() => setAdminTab("TV")}
                label="TV"
                icon={LayoutDashboard}
              />
              <NavBtn
                active={adminTab === "DEPT"}
                onClick={() => setAdminTab("DEPT")}
                label="DEPT"
                icon={ClipboardList}
              />
              <NavBtn
                active={adminTab === "REPORTS"}
                onClick={() => setAdminTab("REPORTS")}
                label="REPORTS"
                icon={BarChart3}
              />
              <NavBtn
                active={adminTab === "FORMS"}
                onClick={() => setAdminTab("FORMS")}
                label="FORMS"
                icon={FileSearch}
              />
              <NavBtn
                active={adminTab === "CONFIG"}
                onClick={() => setAdminTab("CONFIG")}
                label="CONFIG"
                icon={Settings}
              />
              <NavBtn
                active={adminTab === "NOTIFY"}
                onClick={() => setAdminTab("NOTIFY")}
                label="NOTIFY"
                icon={Bell}
              />
              <NavBtn
                active={adminTab === "LOGS"}
                onClick={() => setAdminTab("LOGS")}
                label="LOGS"
                icon={ScrollText}
              />
            </>
          ) : (
            <>
              <NavBtn
                active={deptTab === "MY_DEPT"}
                onClick={() => setDeptTab("MY_DEPT")}
                label="My Dept"
                icon={ClipboardList}
              />
              <NavBtn
                active={deptTab === "MY_REPORTS"}
                onClick={() => setDeptTab("MY_REPORTS")}
                label="Reports"
                icon={BarChart3}
              />
            </>
          )}
        </div>
      </div>

      <Toaster position="top-center" />

      {/* Footer */}
      <div className="pb-28 pt-2 text-center">
        <p className="text-[9px] text-white/10 font-bold uppercase tracking-widest">
          © {new Date().getFullYear()}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined" ? window.location.hostname : "",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/30 transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
