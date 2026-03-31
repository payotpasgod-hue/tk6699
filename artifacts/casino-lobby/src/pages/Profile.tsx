import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  User, ArrowLeft, History, ArrowDownCircle, ArrowUpCircle, Wallet,
  TrendingUp, TrendingDown, Gamepad2, Calendar, Clock, ChevronRight,
  Shield, Copy, Check, LogOut, KeyRound, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  vendorCode: string | null;
  gameCode: string | null;
  roundId: string | null;
  description: string | null;
  createdAt: string;
}

interface ProfileStats {
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  totalDeposited: number;
  totalWithdrawn: number;
  gamesPlayed: number;
  memberSince: string | null;
}

type TabId = "overview" | "bets" | "deposits" | "withdrawals";

export default function Profile() {
  const { user, updateUser, logout } = useAuthStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const t = useT();

  const [tab, setTab] = useState<TabId>("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txFilter, setTxFilter] = useState("all");
  const [txTotal, setTxTotal] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiRequest("/api/profile/stats");
      if (data.success) setStats(data.stats);
    } catch {}
  }, []);

  const loadTransactions = useCallback(async (type?: string) => {
    setLoading(true);
    try {
      const filter = type || txFilter;
      const data = await apiRequest(`/api/profile/transactions?type=${filter}&limit=50`);
      if (data.success) {
        setTransactions(data.transactions);
        setTxTotal(data.total);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [txFilter]);

  useEffect(() => {
    loadStats();
    loadTransactions();
  }, []);

  const handleTabChange = (newTab: TabId) => {
    setTab(newTab);
    if (newTab === "bets") {
      setTxFilter("bet");
      loadTransactions("bet");
    } else if (newTab === "deposits") {
      setTxFilter("admin_deposit");
      loadTransactions("admin_deposit");
    } else if (newTab === "withdrawals") {
      setTxFilter("admin_withdraw");
      loadTransactions("admin_withdraw");
    } else {
      setTxFilter("all");
      loadTransactions("all");
    }
  };

  const handleCopyCode = () => {
    if (user?.userCode) {
      navigator.clipboard.writeText(user.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSyncBalance = async () => {
    try {
      const data = await apiRequest("/api/oroplay/player/balance");
      if (data.success) {
        updateUser({ balance: data.balance });
        toast({ title: t("common.balanceUpdated"), description: `৳${data.balance.toFixed(2)}` });
      }
    } catch {
      toast({ variant: "destructive", title: t("common.error"), description: t("common.couldNotSync") });
    }
  };

  const handleLogout = async () => {
    try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch {}
    logout();
    setLocation("/login");
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };

  const fmtTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const txTypeLabel = (type: string) => {
    switch (type) {
      case "bet": return t("profile.bet");
      case "win": return t("profile.win");
      case "cancel": return t("profile.cancel");
      case "admin_deposit": return t("profile.deposit");
      case "admin_withdraw": return t("profile.withdraw");
      default: return type;
    }
  };

  const txTypeColor = (type: string) => {
    switch (type) {
      case "bet": return "text-red-400 bg-red-500/10";
      case "win": return "text-emerald-400 bg-emerald-500/10";
      case "cancel": return "text-amber-400 bg-amber-500/10";
      case "admin_deposit": return "text-blue-400 bg-blue-500/10";
      case "admin_withdraw": return "text-orange-400 bg-orange-500/10";
      default: return "text-white/50 bg-white/5";
    }
  };

  const TABS: { id: TabId; label: string; icon: typeof History }[] = [
    { id: "overview", label: t("profile.overview"), icon: User },
    { id: "bets", label: t("profile.betHistory"), icon: History },
    { id: "deposits", label: t("profile.deposits"), icon: ArrowDownCircle },
    { id: "withdrawals", label: t("profile.withdrawals"), icon: ArrowUpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#070b14]">
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[800px] mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => setLocation("/")} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <h1 className="text-lg font-bold text-white">{t("profile.title")}</h1>
        </div>
      </nav>

      <div className="max-w-[800px] mx-auto px-4 py-4 pb-24 space-y-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <User className="w-7 h-7 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{user?.displayName}</h2>
              <p className="text-xs text-white/40">{user?.phone}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  {user?.role === "admin" ? "ADMIN" : "PLAYER"}
                </span>
                {stats?.memberSince && (
                  <span className="text-[10px] text-white/30 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t("profile.since")} {fmtDate(stats.memberSince)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between bg-black/20 rounded-xl p-3">
            <div>
              <p className="text-[10px] text-amber-400/60 uppercase tracking-wider">{t("profile.balance")}</p>
              <p className="text-2xl font-bold text-amber-400">৳{(user?.balance || 0).toFixed(2)}</p>
            </div>
            <Button size="sm" variant="outline" className="bg-white/5 border-amber-500/20 text-amber-400 text-xs" onClick={handleSyncBalance}>
              <RefreshCw className="w-3 h-3 mr-1" /> {t("profile.refresh")}
            </Button>
          </div>

          {user?.userCode && (
            <div className="mt-3 flex items-center justify-between bg-black/20 rounded-xl p-3">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{t("profile.referralCode")}</p>
                <p className="text-sm font-mono font-bold text-white">{user.userCode}</p>
              </div>
              <button onClick={handleCopyCode} className="text-xs text-amber-400 flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? t("profile.copied") : t("profile.copy")}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === item.id
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-white/[0.03] text-white/40 border border-white/5 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Gamepad2} label={t("profile.gamesPlayed")} value={stats.gamesPlayed.toString()} color="text-purple-400" />
                <StatCard icon={History} label={t("profile.totalBets")} value={stats.totalBets.toString()} color="text-blue-400" />
                <StatCard icon={TrendingDown} label={t("profile.totalWagered")} value={`৳${stats.totalWagered.toFixed(0)}`} color="text-red-400" />
                <StatCard icon={TrendingUp} label={t("profile.totalWon")} value={`৳${stats.totalWon.toFixed(0)}`} color="text-emerald-400" />
                <StatCard icon={ArrowDownCircle} label={t("profile.totalDeposited")} value={`৳${stats.totalDeposited.toFixed(0)}`} color="text-cyan-400" />
                <StatCard icon={ArrowUpCircle} label={t("profile.totalWithdrawn")} value={`৳${stats.totalWithdrawn.toFixed(0)}`} color="text-orange-400" />
              </div>
            )}

            <div className="space-y-2">
              <MenuButton icon={History} label={t("profile.betHistory")} onClick={() => handleTabChange("bets")} />
              <MenuButton icon={ArrowDownCircle} label={t("profile.depositHistory")} onClick={() => setLocation("/deposit")} />
              <MenuButton icon={ArrowUpCircle} label={t("profile.withdrawHistory")} onClick={() => setLocation("/withdraw")} />
              <MenuButton icon={KeyRound} label={t("profile.withdrawPin")} onClick={() => setLocation("/withdraw")} />
              {user?.role === "admin" && (
                <MenuButton icon={Shield} label={t("profile.adminPanel")} onClick={() => setLocation("/admin")} color="text-amber-400" />
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">{t("profile.logout")}</span>
              </button>
            </div>
          </div>
        )}

        {(tab === "bets" || tab === "deposits" || tab === "withdrawals") && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">{t("profile.noTransactions")}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-white/30 px-1">{t("profile.showing")} {transactions.length} / {txTotal}</p>
                {transactions.map((tx) => (
                  <div key={tx.id} className="bg-[#111827]/80 border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${txTypeColor(tx.type)}`}>
                      {tx.type === "bet" ? <TrendingDown className="w-4 h-4" /> :
                       tx.type === "win" ? <TrendingUp className="w-4 h-4" /> :
                       tx.type === "admin_deposit" ? <ArrowDownCircle className="w-4 h-4" /> :
                       tx.type === "admin_withdraw" ? <ArrowUpCircle className="w-4 h-4" /> :
                       <History className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{txTypeLabel(tx.type)}</span>
                        {tx.gameCode && (
                          <span className="text-[10px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {tx.gameCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/20 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {fmtDate(tx.createdAt)} {fmtTime(tx.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.amount >= 0 ? "+" : ""}৳{Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-white/20">৳{tx.balanceAfter.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {transactions.length < txTotal && (
                  <Button
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 text-white/40 text-xs"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const data = await apiRequest(`/api/profile/transactions?type=${txFilter}&limit=50&offset=${transactions.length}`);
                        if (data.success) {
                          setTransactions((prev) => [...prev, ...data.transactions]);
                        }
                      } catch {} finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {t("profile.loadMore")}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof History; label: string; value: string; color: string }) {
  return (
    <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick, color = "text-white" }: { icon: typeof History; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#111827]/80 hover:bg-[#111827] border border-white/5 transition-colors"
    >
      <Icon className={`w-5 h-5 ${color}`} />
      <span className={`text-sm font-semibold flex-1 text-left ${color}`}>{label}</span>
      <ChevronRight className="w-4 h-4 text-white/20" />
    </button>
  );
}
