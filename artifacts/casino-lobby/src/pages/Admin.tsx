import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Users, ArrowUpCircle, ArrowDownCircle, History, Shield, LogOut, Wallet,
  RefreshCw, BarChart3, Ban, CheckCircle, Activity, AlertTriangle, Gift,
  Server, Database, Clock, Zap, Globe, HardDrive, Search, X, FileText,
  Settings, CreditCard, Banknote, Eye, CheckCircle2, XCircle, Loader2,
  MessageCircle, Send, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: number;
  phone: string;
  displayName: string;
  balance: number;
  currency: string;
  role: string;
  userCode: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminTxn {
  id: number;
  userId: number;
  type: string;
  amount: number;
  balanceAfter: number;
  transactionCode: string | null;
  vendorCode: string | null;
  gameCode: string | null;
  description: string | null;
  createdAt: string;
  displayName: string;
  phone: string;
}

interface RequestLogEntry {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  ip: string;
  userId?: number;
  userName?: string;
  error?: string;
  body?: unknown;
  responseSnippet?: string;
}

interface ErrorLogEntry {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  error: string;
  userId?: number;
  userName?: string;
  body?: unknown;
}

interface BonusClaim {
  id: number;
  userId: number;
  bonusType: string;
  bonusKey: string;
  amount: number;
  displayName: string;
  phone: string;
  createdAt: string;
}

interface AdminDeposit {
  id: number;
  userId: number;
  amount: number;
  method: string;
  transactionId: string;
  screenshotUrl: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  userName: string;
  userPhone: string;
}

interface AdminWithdrawal {
  id: number;
  userId: number;
  amount: number;
  method: string;
  accountNumber: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  userName: string;
  userPhone: string;
}

interface SystemHealth {
  oroplayApi: { status: string; latency: number; endpoint: string };
  database: { status: string; latency: number };
  cache: { exists: boolean; size: number; age: number; totalGames: number; totalVendors: number };
  errors: { total: number; lastHour: number };
  requests: { tracked: number };
  uptime: number;
  memory: number;
  visitors?: { onlineNow: number; totalVisits: number; todayVisits: number; todayUniqueIPs: number };
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalBalance: number;
}

interface SupportConversation {
  user_id: number;
  display_name: string;
  phone: string;
  total_messages: number;
  unread_count: number;
  last_message_at: string;
  last_message: string;
}

interface SupportMsg {
  id: number;
  userId: number;
  sender: "user" | "admin";
  message: string;
  isRead: boolean;
  createdAt: string;
}

type TabId = "overview" | "users" | "transactions" | "deposits" | "withdrawals" | "settings" | "requests" | "errors" | "bonuses" | "support";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabId>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTxn[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agentBalance, setAgentBalance] = useState<number | null>(null);
  const [requestLogs, setRequestLogs] = useState<RequestLogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [bonusClaims, setBonusClaims] = useState<BonusClaim[]>([]);
  const [adminDeposits, setAdminDeposits] = useState<AdminDeposit[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ type: "deposit" | "withdrawal"; id: number; action: "approve" | "reject" } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [screenshotDialog, setScreenshotDialog] = useState<string | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logFilter, setLogFilter] = useState("");
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMsg[]>([]);
  const [activeChat, setActiveChat] = useState<SupportConversation | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [depositDialog, setDepositDialog] = useState<AdminUser | null>(null);
  const [withdrawDialog, setWithdrawDialog] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("");

  const [loadError, setLoadError] = useState<string | null>(null);

  const safeLoad = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
        logout();
        setLocation("/login");
      }
      setLoadError(err?.message || "Request failed");
      return null;
    }
  };

  const loadUsers = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/users"));
    if (data?.success) setUsers(data.users);
  }, []);

  const loadTransactions = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/transactions?limit=200"));
    if (data?.success) setTransactions(data.transactions);
  }, []);

  const loadStats = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/stats"));
    if (data?.success) setStats(data.stats);
  }, []);

  const loadAgentBalance = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/oroplay/agent/balance"));
    if (data?.success) setAgentBalance(data.message);
  }, []);

  const loadRequestLogs = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/request-log"));
    if (data?.success) setRequestLogs(data.logs);
  }, []);

  const loadErrorLogs = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/error-log"));
    if (data?.success) setErrorLogs(data.errors);
  }, []);

  const loadBonusClaims = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/bonus-claims"));
    if (data?.success) setBonusClaims(data.claims);
  }, []);

  const loadAdminDeposits = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/deposits"));
    if (data?.success) setAdminDeposits(data.deposits);
  }, []);

  const loadAdminWithdrawals = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/withdrawals"));
    if (data?.success) setAdminWithdrawals(data.withdrawals);
  }, []);

  const loadSiteSettings = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/settings"));
    if (data?.success) setSiteSettings(data.settings);
  }, []);

  const loadHealth = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/system-health"));
    if (data?.success) setHealth(data.health);
  }, []);

  const loadSupportConversations = useCallback(async () => {
    const data = await safeLoad(() => apiRequest("/api/admin/support/conversations"));
    if (data?.success) setSupportConversations(data.conversations);
  }, []);

  const loadSupportChat = useCallback(async (userId: number) => {
    const data = await safeLoad(() => apiRequest(`/api/admin/support/messages/${userId}`));
    if (data?.success) setSupportMessages(data.messages);
  }, []);

  const handleSendReply = async () => {
    if (!activeChat || !supportReply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const data = await apiRequest("/api/admin/support/reply", {
        method: "POST",
        body: JSON.stringify({ userId: activeChat.user_id, message: supportReply.trim() }),
      });
      if (data.success) {
        setSupportMessages((prev) => [...prev, data.message]);
        setSupportReply("");
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to send reply" });
    }
    setSendingReply(false);
  };

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadUsers(), loadStats(), loadAgentBalance(), loadHealth(), loadRequestLogs(), loadErrorLogs(), loadSupportConversations()]);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (tab === "transactions") loadTransactions();
    if (tab === "bonuses") loadBonusClaims();
    if (tab === "deposits") loadAdminDeposits();
    if (tab === "withdrawals") loadAdminWithdrawals();
    if (tab === "settings") loadSiteSettings();
    if (tab === "requests") loadRequestLogs();
    if (tab === "errors") loadErrorLogs();
    if (tab === "support") { loadSupportConversations(); setActiveChat(null); }
  }, [tab]);

  const handleDeposit = async () => {
    if (!depositDialog || !amount || Number(amount) <= 0) return;
    try {
      await apiRequest("/api/admin/deposit", {
        method: "POST",
        body: JSON.stringify({ userId: depositDialog.id, amount: Number(amount) }),
      });
      toast({ title: "Deposit Successful", description: `৳${amount} added to ${depositDialog.displayName}` });
      setDepositDialog(null);
      setAmount("");
      loadUsers();
      loadStats();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Deposit Failed", description: err.message });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawDialog || !amount || Number(amount) <= 0) return;
    try {
      await apiRequest("/api/admin/withdraw", {
        method: "POST",
        body: JSON.stringify({ userId: withdrawDialog.id, amount: Number(amount) }),
      });
      toast({ title: "Withdrawal Successful", description: `৳${amount} withdrawn from ${withdrawDialog.displayName}` });
      setWithdrawDialog(null);
      setAmount("");
      loadUsers();
      loadStats();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Withdrawal Failed", description: err.message });
    }
  };

  const handleToggleUser = async (u: AdminUser) => {
    try {
      await apiRequest("/api/admin/toggle-user", {
        method: "POST",
        body: JSON.stringify({ userId: u.id, isActive: !u.isActive }),
      });
      toast({ title: u.isActive ? "User Disabled" : "User Enabled" });
      loadUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDepositAction = async (id: number, action: "approve" | "reject", note?: string) => {
    setActionLoading(id);
    try {
      const data = await apiRequest(`/api/admin/deposit/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      if (data.success) {
        toast({ title: action === "approve" ? "Deposit Approved" : "Deposit Rejected", description: data.message });
        loadAdminDeposits();
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setActionLoading(null);
      setNoteDialog(null);
      setAdminNote("");
    }
  };

  const handleWithdrawalAction = async (id: number, action: "approve" | "reject", note?: string) => {
    setActionLoading(id);
    try {
      const data = await apiRequest(`/api/admin/withdrawal/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      if (data.success) {
        toast({ title: action === "approve" ? "Withdrawal Approved" : "Withdrawal Rejected", description: data.message });
        loadAdminWithdrawals();
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setActionLoading(null);
      setNoteDialog(null);
      setAdminNote("");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const data = await apiRequest("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ settings: siteSettings }),
      });
      if (data.success) {
        toast({ title: "Settings Saved" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleNoteAction = () => {
    if (!noteDialog) return;
    if (noteDialog.type === "deposit") {
      handleDepositAction(noteDialog.id, noteDialog.action, adminNote || undefined);
    } else {
      handleWithdrawalAction(noteDialog.id, noteDialog.action, adminNote || undefined);
    }
  };

  const handleRefreshCache = async () => {
    try {
      toast({ title: "Refreshing...", description: "Fetching all games from OroPlay" });
      const data = await apiRequest("/api/oroplay/cache/refresh", { method: "POST" });
      if (data.success) {
        toast({ title: "Cache Refreshed", description: `${data.totalGames} games, ${data.totalVendors} vendors` });
        loadHealth();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Cache Refresh Failed", description: err.message });
    }
  };

  const handleLogout = async () => {
    try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch {}
    logout();
    setLocation("/login");
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour12: false }) + "." + d.getMilliseconds().toString().padStart(3, "0");
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleString();

  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const statusColor = (s: string) =>
    s === "online" ? "text-emerald-400" : s === "offline" ? "text-red-400" : "text-yellow-400";

  const statusDot = (s: string) =>
    s === "online" ? "bg-emerald-400" : s === "offline" ? "bg-red-400" : "bg-yellow-400";

  const httpColor = (status: number) =>
    status < 300 ? "text-emerald-400" : status < 400 ? "text-blue-400" : status < 500 ? "text-yellow-400" : "text-red-400";

  const methodColor = (m: string) => {
    if (m === "GET") return "bg-blue-500/20 text-blue-400";
    if (m === "POST") return "bg-emerald-500/20 text-emerald-400";
    if (m === "PUT" || m === "PATCH") return "bg-yellow-500/20 text-yellow-400";
    return "bg-red-500/20 text-red-400";
  };

  const pendingDeposits = adminDeposits.filter(d => d.status === "pending").length;
  const pendingWithdrawals = adminWithdrawals.filter(w => w.status === "pending").length;

  const TABS: { id: TabId; label: string; icon: typeof Activity; badge?: number; urgent?: boolean }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "deposits", label: "Deposits", icon: CreditCard, badge: pendingDeposits, urgent: pendingDeposits > 0 },
    { id: "withdrawals", label: "Withdrawals", icon: Banknote, badge: pendingWithdrawals, urgent: pendingWithdrawals > 0 },
    { id: "users", label: "Users", icon: Users, badge: users.length },
    { id: "transactions", label: "Txns", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "requests", label: "Logs", icon: FileText, badge: requestLogs.length },
    { id: "errors", label: "Errors", icon: AlertTriangle, badge: errorLogs.length },
    { id: "bonuses", label: "Bonuses", icon: Gift, badge: bonusClaims.length },
    { id: "support", label: "Support", icon: MessageCircle, badge: supportConversations.reduce((sum, c) => sum + c.unread_count, 0), urgent: supportConversations.some(c => c.unread_count > 0) },
  ];

  const filteredLogs = logFilter
    ? requestLogs.filter((l) =>
        l.path.toLowerCase().includes(logFilter.toLowerCase()) ||
        l.method.toLowerCase().includes(logFilter.toLowerCase()) ||
        (l.userName || "").toLowerCase().includes(logFilter.toLowerCase()) ||
        (l.responseSnippet || "").toLowerCase().includes(logFilter.toLowerCase())
      )
    : requestLogs;

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <h1 className="font-bold text-white text-lg">
              TK<span className="text-amber-400">6699</span>
              <span className="text-white/30 text-sm ml-2">Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-xs" onClick={() => setLocation("/")}>
              Lobby
            </Button>
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-xs" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === t.id
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-white/[0.03] text-white/40 border border-white/5 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full ${
                    t.urgent ? "bg-amber-500/20 text-amber-400 animate-pulse" : t.id === "errors" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/30"
                  }`}>{t.badge}</span>
                )}
              </button>
            );
          })}
          <button
            onClick={loadAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap bg-white/[0.03] text-white/40 border border-white/5 hover:bg-white/5 ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{loadError}</span>
            <button onClick={() => setLoadError(null)} className="text-white/30 hover:text-white/50"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-4">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
                  { label: "Active Users", value: stats.activeUsers, icon: CheckCircle, color: "text-emerald-400" },
                  { label: "Total Balance", value: `৳${stats.totalBalance.toFixed(0)}`, icon: Wallet, color: "text-amber-400" },
                  { label: "Agent Balance", value: agentBalance !== null ? `৳${agentBalance.toFixed(0)}` : "...", icon: BarChart3, color: "text-purple-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</span>
                    </div>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {health?.visitors && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Online Now</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-400">{health.visitors.onlineNow}</p>
                </div>
                <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Today Visits</span>
                  </div>
                  <p className="text-xl font-bold text-white">{health.visitors.todayVisits}</p>
                </div>
                <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Unique IPs Today</span>
                  </div>
                  <p className="text-xl font-bold text-white">{health.visitors.todayUniqueIPs}</p>
                </div>
                <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Total Visits</span>
                  </div>
                  <p className="text-xl font-bold text-white">{health.visitors.totalVisits}</p>
                </div>
              </div>
            )}

            {health && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white">Relay VPS</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusDot(health.oroplayApi?.status || "offline")}`} />
                      <span className={`text-xs font-semibold ${statusColor(health.oroplayApi?.status || "offline")}`}>
                        {(health.oroplayApi?.status || "offline").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-white/40">
                    <div className="flex justify-between">
                      <span>Latency</span>
                      <span className="text-white/60">{health.oroplayApi?.latency || 0}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Endpoint</span>
                      <span className="text-white/60 truncate max-w-[180px]">{health.oroplayApi?.endpoint || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">Database</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusDot(health.database?.status || "offline")}`} />
                      <span className={`text-xs font-semibold ${statusColor(health.database?.status || "offline")}`}>
                        {(health.database?.status || "offline").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-white/40">
                    <div className="flex justify-between">
                      <span>Latency</span>
                      <span className="text-white/60">{health.database?.latency || 0}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory</span>
                      <span className="text-white/60">{health.memory || 0}MB</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">Server</span>
                    </div>
                    <span className="text-xs text-white/30">Up {fmtUptime(health.uptime || 0)}</span>
                  </div>
                  <div className="space-y-1 text-xs text-white/40">
                    <div className="flex justify-between">
                      <span>Tracked Requests</span>
                      <span className="text-white/60">{health.requests?.tracked || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors (1h)</span>
                      <span className={(health.errors?.lastHour || 0) > 0 ? "text-red-400 font-semibold" : "text-white/60"}>
                        {health.errors?.lastHour || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {health?.cache && (
              <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Game Cache</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-white/5 border-white/10" onClick={handleRefreshCache}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh Cache
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                  <div><span className="text-white/30">Games</span><p className="text-white font-bold">{health.cache?.totalGames || 0}</p></div>
                  <div><span className="text-white/30">Vendors</span><p className="text-white font-bold">{health.cache?.totalVendors || 0}</p></div>
                  <div><span className="text-white/30">Size</span><p className="text-white font-bold">{health.cache?.size || 0}KB</p></div>
                  <div><span className="text-white/30">Age</span><p className="text-white font-bold">{health.cache?.age || 0}min</p></div>
                </div>
              </div>
            )}

            {errorLogs.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-white">Recent Errors</span>
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded-full">{errorLogs.length}</span>
                </div>
                <div className="space-y-2">
                  {errorLogs.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-start gap-2 text-xs">
                      <span className="text-white/20 shrink-0 font-mono">{fmtTime(e.timestamp)}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${methodColor(e.method)}`}>{e.method}</span>
                      <span className="text-white/40 truncate">{e.path}</span>
                      <span className="text-red-400 font-semibold shrink-0">{e.status}</span>
                      <span className="text-red-400/60 truncate">{e.error}</span>
                    </div>
                  ))}
                </div>
                {errorLogs.length > 5 && (
                  <button onClick={() => setTab("errors")} className="text-xs text-red-400 mt-2 hover:underline">
                    View all {errorLogs.length} errors
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="bg-[#111827]/80 border border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/30 text-xs uppercase">
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-center p-3">Role</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3">
                        <div className="font-medium text-white text-xs">{u.displayName}</div>
                        <div className="text-[10px] text-white/20 font-mono">{u.userCode}</div>
                      </td>
                      <td className="p-3 text-white/40 text-xs">{u.phone}</td>
                      <td className="p-3 text-right font-bold text-amber-400 text-xs">৳{u.balance.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/40"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${u.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {u.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-6 px-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px]" onClick={() => { setDepositDialog(u); setAmount(""); }}>
                            <ArrowUpCircle className="w-3 h-3 mr-0.5" /> Deposit
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 px-2 bg-red-500/10 border-red-500/20 text-red-400 text-[10px]" onClick={() => { setWithdrawDialog(u); setAmount(""); }}>
                            <ArrowDownCircle className="w-3 h-3 mr-0.5" /> Withdraw
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0 bg-white/5 border-white/10" onClick={() => handleToggleUser(u)}>
                            {u.isActive ? <Ban className="w-3 h-3 text-red-400" /> : <CheckCircle className="w-3 h-3 text-emerald-400" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "transactions" && (
          <div className="bg-[#111827]/80 border border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/30 text-xs uppercase">
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-center p-3">Type</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-left p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-[10px] text-white/20 whitespace-nowrap font-mono">{fmtDate(t.createdAt)}</td>
                      <td className="p-3 text-xs text-white">{t.displayName}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          t.type === "bet" ? "bg-red-500/20 text-red-400"
                            : t.type === "win" ? "bg-emerald-500/20 text-emerald-400"
                            : t.type === "admin_deposit" ? "bg-blue-500/20 text-blue-400"
                            : t.type === "admin_withdraw" ? "bg-orange-500/20 text-orange-400"
                            : t.type === "cancel" ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-white/10 text-white/40"
                        }`}>{t.type}</span>
                      </td>
                      <td className={`p-3 text-right font-mono text-xs ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {t.amount >= 0 ? "+" : ""}৳{Math.abs(t.amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-white/30">৳{t.balanceAfter.toFixed(2)}</td>
                      <td className="p-3 text-xs text-white/30 max-w-[200px] truncate">
                        {t.vendorCode && t.gameCode ? `${t.vendorCode} / ${t.gameCode}` : t.description || "-"}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-white/20">No transactions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "deposits" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">Deposit Requests</h2>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-white/5 border-white/10" onClick={loadAdminDeposits}>
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </Button>
            </div>
            <div className="bg-[#111827]/80 border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/30 text-xs uppercase">
                      <th className="text-left p-3">Time</th>
                      <th className="text-left p-3">User</th>
                      <th className="text-center p-3">Method</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">TXN ID</th>
                      <th className="text-center p-3">Status</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminDeposits.map((d) => (
                      <tr key={d.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${d.status === "pending" ? "bg-amber-500/[0.03]" : ""}`}>
                        <td className="p-3 text-[10px] text-white/20 whitespace-nowrap font-mono">{fmtDate(d.createdAt)}</td>
                        <td className="p-3">
                          <div className="text-xs text-white">{d.userName}</div>
                          <div className="text-[10px] text-white/20">{d.userPhone}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            d.method === "bkash" ? "bg-pink-500/20 text-pink-400" : "bg-orange-500/20 text-orange-400"
                          }`}>{d.method}</span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400 text-xs">৳{Number(d.amount).toFixed(0)}</td>
                        <td className="p-3 text-xs text-white/40 font-mono">{d.transactionId}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            d.status === "approved" ? "bg-emerald-500/20 text-emerald-400"
                              : d.status === "rejected" ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>{d.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {d.screenshotUrl && (
                              <Button variant="outline" size="sm" className="h-6 px-2 bg-white/5 border-white/10 text-[10px]" onClick={() => setScreenshotDialog(d.screenshotUrl)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            )}
                            {d.status === "pending" && (
                              <>
                                <Button
                                  variant="outline" size="sm"
                                  className="h-6 px-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px]"
                                  disabled={actionLoading === d.id}
                                  onClick={() => { setNoteDialog({ type: "deposit", id: d.id, action: "approve" }); setAdminNote(""); }}
                                >
                                  {actionLoading === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-0.5" />} Approve
                                </Button>
                                <Button
                                  variant="outline" size="sm"
                                  className="h-6 px-2 bg-red-500/10 border-red-500/20 text-red-400 text-[10px]"
                                  disabled={actionLoading === d.id}
                                  onClick={() => { setNoteDialog({ type: "deposit", id: d.id, action: "reject" }); setAdminNote(""); }}
                                >
                                  <XCircle className="w-3 h-3 mr-0.5" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                          {d.adminNote && <p className="text-[10px] text-white/20 mt-1 text-right">{d.adminNote}</p>}
                        </td>
                      </tr>
                    ))}
                    {adminDeposits.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-white/20">No deposit requests</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">Withdrawal Requests</h2>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-white/5 border-white/10" onClick={loadAdminWithdrawals}>
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </Button>
            </div>
            <div className="bg-[#111827]/80 border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/30 text-xs uppercase">
                      <th className="text-left p-3">Time</th>
                      <th className="text-left p-3">User</th>
                      <th className="text-center p-3">Method</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Account</th>
                      <th className="text-center p-3">Status</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminWithdrawals.map((w) => (
                      <tr key={w.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${w.status === "pending" ? "bg-amber-500/[0.03]" : ""}`}>
                        <td className="p-3 text-[10px] text-white/20 whitespace-nowrap font-mono">{fmtDate(w.createdAt)}</td>
                        <td className="p-3">
                          <div className="text-xs text-white">{w.userName}</div>
                          <div className="text-[10px] text-white/20">{w.userPhone}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            w.method === "bkash" ? "bg-pink-500/20 text-pink-400" : "bg-orange-500/20 text-orange-400"
                          }`}>{w.method}</span>
                        </td>
                        <td className="p-3 text-right font-bold text-red-400 text-xs">৳{Number(w.amount).toFixed(0)}</td>
                        <td className="p-3 text-xs text-white/40 font-mono">{w.accountNumber}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            w.status === "approved" ? "bg-emerald-500/20 text-emerald-400"
                              : w.status === "rejected" ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>{w.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {w.status === "pending" && (
                              <>
                                <Button
                                  variant="outline" size="sm"
                                  className="h-6 px-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px]"
                                  disabled={actionLoading === w.id}
                                  onClick={() => { setNoteDialog({ type: "withdrawal", id: w.id, action: "approve" }); setAdminNote(""); }}
                                >
                                  {actionLoading === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-0.5" />} Approve
                                </Button>
                                <Button
                                  variant="outline" size="sm"
                                  className="h-6 px-2 bg-red-500/10 border-red-500/20 text-red-400 text-[10px]"
                                  disabled={actionLoading === w.id}
                                  onClick={() => { setNoteDialog({ type: "withdrawal", id: w.id, action: "reject" }); setAdminNote(""); }}
                                >
                                  <XCircle className="w-3 h-3 mr-0.5" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                          {w.adminNote && <p className="text-[10px] text-white/20 mt-1 text-right">{w.adminNote}</p>}
                        </td>
                      </tr>
                    ))}
                    {adminWithdrawals.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-white/20">No withdrawal requests</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">Site Settings</h2>
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs bg-amber-500/10 border-amber-500/20 text-amber-400"
                onClick={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                {savingSettings ? "Saving..." : "Save All Settings"}
              </Button>
            </div>

            {[
              {
                title: "Payment Numbers",
                fields: [
                  { key: "bkash_number", label: "bKash Number", placeholder: "01XXXXXXXXX" },
                  { key: "nagad_number", label: "Nagad Number", placeholder: "01XXXXXXXXX" },
                ],
              },
              {
                title: "Deposit / Withdrawal Limits",
                fields: [
                  { key: "min_deposit", label: "Min Deposit (BDT)" },
                  { key: "max_deposit", label: "Max Deposit (BDT)" },
                  { key: "min_withdraw", label: "Min Withdrawal (BDT)" },
                  { key: "max_withdraw", label: "Max Withdrawal (BDT)" },
                ],
              },
              {
                title: "Bonuses & Rewards",
                fields: [
                  { key: "registration_bonus", label: "Registration Bonus (BDT)" },
                  { key: "spin_cooldown_hours", label: "Spin Cooldown (hours)" },
                  { key: "daily_reward_requires_deposit", label: "Daily Reward Requires Deposit (true/false)" },
                  { key: "red_pocket_min", label: "Red Pocket Min (BDT)" },
                  { key: "red_pocket_max", label: "Red Pocket Max (BDT)" },
                  { key: "red_pocket_interval_minutes", label: "Red Pocket Interval (min)" },
                ],
              },
              {
                title: "Deposit Bonus Tier 1",
                fields: [
                  { key: "deposit_bonus_1_min", label: "Min Deposit" },
                  { key: "deposit_bonus_1_pct", label: "Bonus %" },
                  { key: "deposit_bonus_1_max", label: "Max Bonus" },
                ],
              },
              {
                title: "Deposit Bonus Tier 2",
                fields: [
                  { key: "deposit_bonus_2_min", label: "Min Deposit" },
                  { key: "deposit_bonus_2_pct", label: "Bonus %" },
                  { key: "deposit_bonus_2_max", label: "Max Bonus" },
                ],
              },
              {
                title: "Deposit Bonus Tier 3",
                fields: [
                  { key: "deposit_bonus_3_min", label: "Min Deposit" },
                  { key: "deposit_bonus_3_pct", label: "Bonus %" },
                  { key: "deposit_bonus_3_max", label: "Max Bonus" },
                ],
              },
            ].map((section) => (
              <div key={section.title} className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">{section.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.fields.map((f) => (
                    <div key={f.key}>
                      <label className="text-[10px] text-white/30 mb-1 block">{f.label}</label>
                      <input
                        type="text"
                        value={siteSettings[f.key] || ""}
                        onChange={(e) => setSiteSettings((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={("placeholder" in f ? (f as any).placeholder : "") || ""}
                        className="w-full h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                placeholder="Filter by path, method, user..."
                className="w-full h-9 pl-10 pr-10 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
              />
              {logFilter && (
                <button onClick={() => setLogFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[10px] text-white/20 px-1">
              Showing {filteredLogs.length} of {requestLogs.length} requests (in-memory, since last restart)
            </div>

            <div className="bg-[#0a0e1a] border border-white/5 rounded-xl overflow-hidden font-mono text-xs">
              <div className="max-h-[600px] overflow-y-auto">
                {filteredLogs.map((l) => (
                  <div
                    key={l.id}
                    className={`flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.03] hover:bg-white/[0.02] ${
                      l.status >= 400 ? "bg-red-500/[0.03]" : ""
                    }`}
                  >
                    <span className="text-white/15 w-[70px] shrink-0 text-[10px]">{fmtTime(l.timestamp)}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold w-[42px] text-center ${methodColor(l.method)}`}>
                      {l.method}
                    </span>
                    <span className={`shrink-0 w-[28px] text-center font-bold ${httpColor(l.status)}`}>{l.status}</span>
                    <span className="text-white/50 truncate flex-1 min-w-0">{l.path}</span>
                    <span className="text-white/15 shrink-0 w-[45px] text-right">{l.duration}ms</span>
                    {l.userName && (
                      <span className="text-blue-400/40 shrink-0 max-w-[80px] truncate text-[10px]">{l.userName}</span>
                    )}
                    {l.responseSnippet && (
                      <span className="text-red-400/50 shrink-0 max-w-[150px] truncate text-[10px]">{l.responseSnippet}</span>
                    )}
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="p-8 text-center text-white/20 text-sm">No requests logged yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "errors" && (
          <div className="space-y-3">
            <div className="text-[10px] text-white/20 px-1">
              {errorLogs.length} errors tracked (in-memory, since last restart)
            </div>

            <div className="space-y-2">
              {errorLogs.map((e) => (
                <div key={e.id} className="bg-red-500/[0.05] border border-red-500/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-white/20 font-mono">{fmtDate(e.timestamp)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${methodColor(e.method)}`}>{e.method}</span>
                    <span className="text-white/40 text-xs truncate">{e.path}</span>
                    <span className="text-red-400 font-bold text-xs ml-auto">{e.status}</span>
                  </div>
                  <p className="text-red-400/80 text-xs">{e.error}</p>
                  {e.userName && (
                    <p className="text-white/20 text-[10px] mt-1">User: {e.userName} (ID: {e.userId})</p>
                  )}
                  {e.body != null && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-white/15 cursor-pointer hover:text-white/30">Request body</summary>
                      <pre className="text-[10px] text-white/20 mt-1 bg-black/30 rounded p-2 overflow-x-auto">
                        {JSON.stringify(e.body, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              {errorLogs.length === 0 && (
                <div className="p-12 text-center text-white/20">
                  <CheckCircle className="w-8 h-8 text-emerald-400/20 mx-auto mb-3" />
                  <p className="text-sm">No errors - all systems running smoothly</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "bonuses" && (
          <div className="bg-[#111827]/80 border border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/30 text-xs uppercase">
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-center p-3">Type</th>
                    <th className="text-left p-3">Key</th>
                    <th className="text-right p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bonusClaims.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-[10px] text-white/20 font-mono whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                      <td className="p-3">
                        <div className="text-xs text-white">{c.displayName}</div>
                        <div className="text-[10px] text-white/20">{c.phone}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          c.bonusType === "gift_box" ? "bg-purple-500/20 text-purple-400"
                            : c.bonusType === "spin" ? "bg-blue-500/20 text-blue-400"
                            : c.bonusType === "daily" ? "bg-amber-500/20 text-amber-400"
                            : c.bonusType === "hourly" ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/10 text-white/40"
                        }`}>{c.bonusType}</span>
                      </td>
                      <td className="p-3 text-xs text-white/30 font-mono">{c.bonusKey}</td>
                      <td className="p-3 text-right font-bold text-amber-400 text-xs">+৳{c.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {bonusClaims.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-white/20">No bonus claims yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "support" && (
          <div className="bg-[#111827]/80 border border-white/5 rounded-xl overflow-hidden">
            {!activeChat ? (
              <div>
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-400" /> Support Conversations
                  </h3>
                  <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-xs" onClick={loadSupportConversations}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                  </Button>
                </div>
                {supportConversations.length === 0 ? (
                  <div className="p-8 text-center text-white/20 text-sm">No support messages yet</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {supportConversations.map((conv) => (
                      <button
                        key={conv.user_id}
                        className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors flex items-center gap-3"
                        onClick={() => { setActiveChat(conv); loadSupportChat(conv.user_id); }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-amber-400">{conv.display_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white truncate">{conv.display_name}</span>
                            <span className="text-[10px] text-white/20 whitespace-nowrap ml-2">{fmtDate(conv.last_message_at)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-white/40 truncate pr-2">{conv.last_message}</p>
                            {conv.unread_count > 0 && (
                              <span className="shrink-0 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/15 mt-0.5">{conv.phone} · {conv.total_messages} messages</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-[600px]">
                <div className="p-3 border-b border-white/5 flex items-center gap-3 shrink-0">
                  <button
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    onClick={() => { setActiveChat(null); setSupportMessages([]); loadSupportConversations(); }}
                  >
                    <ArrowLeft className="w-4 h-4 text-white/50" />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-white">{activeChat.display_name}</p>
                    <p className="text-[10px] text-white/30">{activeChat.phone}</p>
                  </div>
                  <Button size="sm" variant="outline" className="ml-auto bg-white/5 border-white/10 text-xs" onClick={() => loadSupportChat(activeChat.user_id)}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {supportMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                          msg.sender === "admin"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-br-md"
                            : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${msg.sender === "admin" ? "text-black/50" : "text-white/30"}`}>
                          {fmtDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {supportMessages.length === 0 && (
                    <div className="text-center py-8 text-white/20 text-sm">No messages in this conversation</div>
                  )}
                </div>

                <div className="p-3 border-t border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type your reply..."
                      className="flex-1 bg-white/5 border-white/10 text-sm"
                      value={supportReply}
                      onChange={(e) => setSupportReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendReply(); }}
                      disabled={sendingReply}
                    />
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black"
                      onClick={handleSendReply}
                      disabled={!supportReply.trim() || sendingReply}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!depositDialog} onOpenChange={(o) => !o && setDepositDialog(null)}>
        <DialogContent className="bg-[#111827] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Deposit to {depositDialog?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-white/40">Balance: <span className="text-amber-400 font-bold">৳{depositDialog?.balance.toFixed(2)}</span></p>
            <Input type="number" placeholder="Amount (BDT)" className="bg-black/30 border-white/10" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex gap-2">
              {[500, 1000, 5000, 10000].map((a) => (
                <Button key={a} variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10 text-xs" onClick={() => setAmount(a.toString())}>
                  ৳{a}
                </Button>
              ))}
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleDeposit}>Confirm Deposit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!withdrawDialog} onOpenChange={(o) => !o && setWithdrawDialog(null)}>
        <DialogContent className="bg-[#111827] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Withdraw from {withdrawDialog?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-white/40">Balance: <span className="text-amber-400 font-bold">৳{withdrawDialog?.balance.toFixed(2)}</span></p>
            <Input type="number" placeholder="Amount (BDT)" className="bg-black/30 border-white/10" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleWithdraw}>Confirm Withdrawal</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteDialog} onOpenChange={(o) => { if (!o) { setNoteDialog(null); setAdminNote(""); } }}>
        <DialogContent className="bg-[#111827] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              {noteDialog?.action === "approve" ? "Approve" : "Reject"} {noteDialog?.type === "deposit" ? "Deposit" : "Withdrawal"} #{noteDialog?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Admin note (optional)"
              className="bg-black/30 border-white/10"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10" onClick={() => { setNoteDialog(null); setAdminNote(""); }}>
                Cancel
              </Button>
              <Button
                className={`flex-1 ${noteDialog?.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
                onClick={handleNoteAction}
              >
                {noteDialog?.action === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!screenshotDialog} onOpenChange={(o) => !o && setScreenshotDialog(null)}>
        <DialogContent className="bg-[#111827] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotDialog && (
            <img src={screenshotDialog} alt="Payment screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
