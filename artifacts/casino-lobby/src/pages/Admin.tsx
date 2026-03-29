import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Shield,
  LogOut,
  Wallet,
  RefreshCw,
  BarChart3,
  Ban,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalBalance: number;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();

  const [tab, setTab] = useState<"users" | "transactions">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTxn[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agentBalance, setAgentBalance] = useState<number | null>(null);

  const [depositDialog, setDepositDialog] = useState<AdminUser | null>(null);
  const [withdrawDialog, setWithdrawDialog] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiRequest("/api/admin/users");
      if (data.success) setUsers(data.users);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await apiRequest("/api/admin/transactions?limit=200");
      if (data.success) setTransactions(data.transactions);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiRequest("/api/admin/stats");
      if (data.success) setStats(data.stats);
    } catch (err: any) {}
  }, []);

  const loadAgentBalance = useCallback(async () => {
    try {
      const data = await apiRequest("/api/oroplay/agent/balance");
      if (data.success) setAgentBalance(data.message);
    } catch {}
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadUsers(), loadTransactions(), loadStats(), loadAgentBalance()]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

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

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {}
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-secondary" />
            <h1 className="font-display font-bold text-white text-lg">
              TK<span className="text-secondary">6699</span>
              <span className="text-muted-foreground text-sm ml-2">Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-xs"
              onClick={() => setLocation("/")}
            >
              Casino Lobby
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-xs"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
              { label: "Active Users", value: stats.activeUsers, icon: CheckCircle, color: "text-green-400" },
              { label: "Total Balance", value: `৳${stats.totalBalance.toFixed(2)}`, icon: Wallet, color: "text-accent" },
              { label: "Agent Balance", value: agentBalance !== null ? `৳${agentBalance.toFixed(2)}` : "...", icon: BarChart3, color: "text-secondary" },
            ].map((s) => (
              <div key={s.label} className="glass-panel p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={tab === "users" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("users")}
            className={tab === "users" ? "bg-primary" : "bg-white/5 border-white/10"}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> Users
          </Button>
          <Button
            variant={tab === "transactions" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTab("transactions"); loadTransactions(); }}
            className={tab === "transactions" ? "bg-primary" : "bg-white/5 border-white/10"}
          >
            <History className="w-3.5 h-3.5 mr-1.5" /> Transactions
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/10 ml-auto"
            onClick={loadAll}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {tab === "users" && (
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground text-xs uppercase">
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
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <div className="font-medium text-white">{u.displayName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{u.userCode}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{u.phone}</td>
                      <td className="p-3 text-right font-bold text-accent">৳{u.balance.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${u.role === "admin" ? "bg-secondary/20 text-secondary" : "bg-white/10 text-white/60"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {u.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs"
                            onClick={() => { setDepositDialog(u); setAmount(""); }}
                          >
                            <ArrowUpCircle className="w-3 h-3 mr-1" /> Deposit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs"
                            onClick={() => { setWithdrawDialog(u); setAmount(""); }}
                          >
                            <ArrowDownCircle className="w-3 h-3 mr-1" /> Withdraw
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 bg-white/5 border-white/10 text-xs"
                            onClick={() => handleToggleUser(u)}
                          >
                            {u.isActive ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
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
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground text-xs uppercase">
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-center p-3">Type</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-right p-3">Balance After</th>
                    <th className="text-left p-3">Game</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="text-white text-xs">{t.displayName}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            t.type === "bet"
                              ? "bg-red-500/20 text-red-400"
                              : t.type === "win"
                              ? "bg-green-500/20 text-green-400"
                              : t.type === "admin_deposit"
                              ? "bg-blue-500/20 text-blue-400"
                              : t.type === "admin_withdraw"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-mono text-xs ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {t.amount >= 0 ? "+" : ""}৳{Math.abs(t.amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                        ৳{t.balanceAfter.toFixed(2)}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {t.vendorCode && t.gameCode ? `${t.vendorCode} / ${t.gameCode}` : t.description || "-"}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">No transactions yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Dialog open={!!depositDialog} onOpenChange={(o) => !o && setDepositDialog(null)}>
        <DialogContent className="bg-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display">Deposit to {depositDialog?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Current balance: <span className="text-accent font-bold">৳{depositDialog?.balance.toFixed(2)}</span>
            </p>
            <Input
              type="number"
              placeholder="Amount (BDT)"
              className="bg-black/30 border-white/10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex gap-2">
              {[500, 1000, 5000, 10000].map((a) => (
                <Button
                  key={a}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-white/5 border-white/10 text-xs"
                  onClick={() => setAmount(a.toString())}
                >
                  ৳{a}
                </Button>
              ))}
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleDeposit}>
              Confirm Deposit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!withdrawDialog} onOpenChange={(o) => !o && setWithdrawDialog(null)}>
        <DialogContent className="bg-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display">Withdraw from {withdrawDialog?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Current balance: <span className="text-accent font-bold">৳{withdrawDialog?.balance.toFixed(2)}</span>
            </p>
            <Input
              type="number"
              placeholder="Amount (BDT)"
              className="bg-black/30 border-white/10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleWithdraw}>
              Confirm Withdrawal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
