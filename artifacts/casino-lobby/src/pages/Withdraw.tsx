import { useState, useEffect } from "react";
import { Navbar } from "@/components/casino/Navbar";
import { BottomNav } from "@/components/casino/BottomNav";
import { useAuthStore } from "@/store/use-auth-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  ArrowUpFromLine, CheckCircle2, Clock, XCircle, Lock, Eye, EyeOff, Loader2
} from "lucide-react";

interface WithdrawalRecord {
  id: number;
  amount: number;
  method: string;
  accountNumber: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

export default function Withdraw() {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const t = useT();
  const [step, setStep] = useState<"form" | "history">("form");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [passData, historyData] = await Promise.all([
        apiRequest("/api/withdraw/has-password"),
        apiRequest("/api/withdraw/history"),
      ]);
      if (passData.success) {
        setHasPassword(passData.hasPassword);
        if (!passData.hasPassword) setShowSetPassword(true);
      }
      if (historyData.success) setHistory(historyData.withdrawals);
    } catch {}
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 4 || newPassword.length > 6) {
      toast({ variant: "destructive", title: "Invalid", description: "Password must be 4-6 digits" });
      return;
    }
    if (!/^\d+$/.test(newPassword)) {
      toast({ variant: "destructive", title: "Invalid", description: "Only digits allowed" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Mismatch", description: "Passwords don't match" });
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest("/api/withdraw/set-password", {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      if (data.success) {
        toast({ title: "Withdraw password set!" });
        setHasPassword(true);
        setShowSetPassword(false);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const numAmount = Number(amount) || 0;
    if (numAmount < 500) {
      toast({ variant: "destructive", title: "Minimum ৳500" });
      return;
    }
    if (!accountNumber || accountNumber.length < 11) {
      toast({ variant: "destructive", title: "Enter valid account number" });
      return;
    }
    if (!withdrawPassword) {
      toast({ variant: "destructive", title: "Enter withdraw password" });
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest("/api/withdraw/create", {
        method: "POST",
        body: JSON.stringify({
          amount: numAmount,
          method,
          accountNumber: accountNumber.trim(),
          withdrawPassword,
        }),
      });
      if (data.success) {
        toast({ title: "Withdrawal request submitted", description: "Awaiting admin approval" });
        updateUser({ balance: data.newBalance });
        setAmount("");
        setAccountNumber("");
        setWithdrawPassword("");
        loadData();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000];
  const numAmount = Number(amount) || 0;

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white pb-20 sm:pb-8">
      <Navbar />
      <main className="max-w-[500px] mx-auto px-3 sm:px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ArrowUpFromLine className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-white">{t("withdraw.title")}</h1>
            <p className="text-xs text-white/30">{t("withdraw.balance")}: ৳{(user?.balance || 0).toFixed(2)}</p>
          </div>
          <button
            onClick={() => setStep(step === "history" ? "form" : "history")}
            className="text-xs text-amber-400 font-semibold"
          >
            {step === "history" ? t("withdraw.newWithdraw") : t("withdraw.history")}
          </button>
        </div>

        {showSetPassword && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="text-center">
                <Lock className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h2 className="text-lg font-bold text-white">{t("withdraw.setPasswordTitle")}</h2>
                <p className="text-xs text-white/40 mt-1">{t("withdraw.setPasswordDesc")}</p>
              </div>
              <input
                type="password"
                maxLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ""))}
                placeholder={t("withdraw.enterPin")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/20 focus:border-amber-500/50 focus:outline-none"
              />
              <input
                type="password"
                maxLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ""))}
                placeholder={t("withdraw.confirmPin")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/20 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                onClick={handleSetPassword}
                disabled={submitting || newPassword.length < 4}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-sm disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("withdraw.setPassword")}
              </button>
              {hasPassword && (
                <button onClick={() => setShowSetPassword(false)} className="w-full text-sm text-white/30 hover:text-white/50">
                  {t("withdraw.cancel")}
                </button>
              )}
            </div>
          </div>
        )}

        {step === "history" && (
          <div className="space-y-3">
            {history.length === 0 && (
              <div className="text-center text-white/30 py-10 text-sm">{t("withdraw.noHistory")}</div>
            )}
            {history.map(w => (
              <div key={w.id} className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-white">৳{w.amount}</span>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(w.status)}
                    <span className={`text-xs font-semibold capitalize ${w.status === "approved" ? "text-emerald-400" : w.status === "rejected" ? "text-red-400" : "text-yellow-400"}`}>
                      {w.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span className="uppercase font-semibold">{w.method} • {w.accountNumber}</span>
                  <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                </div>
                {w.adminNote && <p className="text-xs text-white/40 mt-2">{w.adminNote}</p>}
              </div>
            ))}
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4">
            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <label className="text-xs text-white/40 font-semibold uppercase mb-2 block">{t("withdraw.amount")}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="৳0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-bold text-white placeholder-white/20 focus:border-orange-500/50 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {quickAmounts.map(a => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      numAmount === a ? "bg-orange-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    ৳{a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <label className="text-xs text-white/40 font-semibold uppercase mb-3 block">{t("withdraw.method")}</label>
              <div className="grid grid-cols-2 gap-3">
                {(["bkash", "nagad"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      method === m
                        ? m === "bkash" ? "border-pink-500 bg-pink-500/10" : "border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <img
                      src={m === "bkash" ? "/bkash-logo.png" : "/nagad-logo.png"}
                      alt={m === "bkash" ? "bKash" : "Nagad"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <span className="text-sm font-bold text-white capitalize">{m === "bkash" ? "bKash" : "Nagad"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs text-white/40 font-semibold uppercase mb-2 block">{t("withdraw.accountNumber")}</label>
                <input
                  type="tel"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  maxLength={14}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-orange-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 font-semibold uppercase mb-2 block">{t("withdraw.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    maxLength={6}
                    value={withdrawPassword}
                    onChange={(e) => setWithdrawPassword(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-orange-500/50 focus:outline-none pr-10"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || numAmount < 500 || !accountNumber || !withdrawPassword}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-red-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? t("withdraw.submitting") : t("withdraw.submit")}
            </button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
