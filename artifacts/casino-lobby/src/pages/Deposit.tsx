import { useState, useEffect } from "react";
import { Navbar } from "@/components/casino/Navbar";
import { BottomNav } from "@/components/casino/BottomNav";
import { useAuthStore } from "@/store/use-auth-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { useT } from "@/lib/i18n";
import {
  ArrowDownToLine, ArrowLeft, Copy, Upload, CheckCircle2, Clock,
  XCircle, ChevronRight, Loader2, AlertTriangle
} from "lucide-react";

interface DepositBonus {
  minDeposit: number;
  percentage: number;
  maxBonus: number | null;
}

interface DepositRecord {
  id: number;
  amount: number;
  method: string;
  transactionId: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

export default function Deposit() {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const t = useT();
  const [step, setStep] = useState<"amount" | "confirm" | "history">("amount");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bonuses, setBonuses] = useState<DepositBonus[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<DepositRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bonusData, settingsData, historyData] = await Promise.all([
        apiRequest("/api/deposit/bonuses"),
        apiRequest("/api/settings/public"),
        apiRequest("/api/deposit/history"),
      ]);
      if (bonusData.success) setBonuses(bonusData.bonuses);
      if (settingsData.success) setSettings(settingsData.settings);
      if (historyData.success) setHistory(historyData.deposits);
    } catch {}
  };

  const quickAmounts = [200, 500, 1000, 2000, 5000, 10000];
  const numAmount = Number(amount) || 0;

  const matchedBonus = bonuses
    .filter(b => numAmount >= b.minDeposit)
    .sort((a, b) => b.minDeposit - a.minDeposit)[0];

  const bonusAmount = matchedBonus
    ? Math.min(numAmount * matchedBonus.percentage / 100, matchedBonus.maxBonus || 999999)
    : 0;

  const paymentNumber = method === "bkash" ? settings.bkash_number : settings.nagad_number;

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 3MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!transactionId.trim()) {
      toast({ variant: "destructive", title: "Missing", description: "Enter transaction ID" });
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest("/api/deposit/create", {
        method: "POST",
        body: JSON.stringify({
          amount: numAmount,
          method,
          transactionId: transactionId.trim(),
          screenshot,
        }),
      });
      if (data.success) {
        toast({ title: "Deposit request submitted", description: "Awaiting admin approval" });
        setStep("amount");
        setAmount("");
        setTransactionId("");
        setScreenshot(null);
        loadData();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ArrowDownToLine className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-white">{t("deposit.title")}</h1>
            <p className="text-xs text-white/30">{t("deposit.subtitle")}</p>
          </div>
          <button
            onClick={() => setStep(step === "history" ? "amount" : "history")}
            className="text-xs text-amber-400 font-semibold"
          >
            {step === "history" ? t("deposit.newDeposit") : t("deposit.history")}
          </button>
        </div>

        {step === "history" && (
          <div className="space-y-3">
            {history.length === 0 && (
              <div className="text-center text-white/30 py-10 text-sm">{t("deposit.noHistory")}</div>
            )}
            {history.map(d => (
              <div key={d.id} className="bg-[#111827]/80 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-white">৳{d.amount}</span>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(d.status)}
                    <span className={`text-xs font-semibold capitalize ${d.status === "approved" ? "text-emerald-400" : d.status === "rejected" ? "text-red-400" : "text-yellow-400"}`}>
                      {d.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span className="uppercase font-semibold">{d.method}</span>
                  <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
                {d.adminNote && <p className="text-xs text-white/40 mt-2">{d.adminNote}</p>}
              </div>
            ))}
          </div>
        )}

        {step === "amount" && (
          <div className="space-y-4">
            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <label className="text-xs text-white/40 font-semibold uppercase mb-2 block">{t("deposit.enterAmount")}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="৳0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-bold text-white placeholder-white/20 focus:border-emerald-500/50 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {quickAmounts.map(a => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      numAmount === a
                        ? "bg-emerald-500 text-white"
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    ৳{a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <label className="text-xs text-white/40 font-semibold uppercase mb-3 block">{t("deposit.selectMethod")}</label>
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

            {bonuses.length > 0 && (
              <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
                <label className="text-xs text-white/40 font-semibold uppercase mb-3 block">{t("deposit.bonusOffers")}</label>
                <div className="space-y-2">
                  {bonuses.map((b, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        matchedBonus === b && numAmount > 0
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-white/5 bg-white/[0.02]"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-bold text-white">{b.percentage}% {t("deposit.bonus")}</span>
                        <span className="text-xs text-white/30 ml-2">{t("deposit.minDeposit")} ৳{b.minDeposit}</span>
                      </div>
                      {b.maxBonus && <span className="text-xs text-amber-400">{t("deposit.upTo")} ৳{b.maxBonus}</span>}
                    </div>
                  ))}
                </div>
                {bonusAmount > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-sm text-emerald-400 font-bold">{t("deposit.youGet")} ৳{bonusAmount.toFixed(0)} {t("deposit.bonus")}!</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => numAmount >= 100 && setStep("confirm")}
              disabled={numAmount < 100}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t("deposit.continue")} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <button onClick={() => setStep("amount")} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60">
              <ArrowLeft className="w-4 h-4" /> {t("deposit.back")}
            </button>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <div className="text-center mb-4">
                <img
                  src={method === "bkash" ? "/bkash-logo.png" : "/nagad-logo.png"}
                  alt={method === "bkash" ? "bKash" : "Nagad"}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                />
                <h2 className="text-lg font-bold text-white">{t("deposit.sendTo")} {method === "bkash" ? "bKash" : "Nagad"}</h2>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-xs text-white/40 mb-1">{t("deposit.sendExactAmount")}</p>
                <p className="text-2xl font-bold text-emerald-400">৳{numAmount.toLocaleString()}</p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-xs text-white/40 mb-1">{t("deposit.toNumber")}</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-white font-mono">{paymentNumber || "Not configured"}</p>
                  {paymentNumber && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(paymentNumber);
                        toast({ title: "Copied!" });
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
                    >
                      <Copy className="w-4 h-4 text-white/40" />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-400/80">{t("deposit.instructions")}</p>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs text-white/40 font-semibold uppercase mb-2 block">{t("deposit.transactionId")}</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder={t("deposit.enterTxnId")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 font-semibold uppercase mb-2 block">{t("deposit.screenshot")}</label>
                <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
                  {screenshot ? (
                    <img src={screenshot} alt="Screenshot" className="max-h-40 rounded-lg" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-white/30" />
                      <span className="text-xs text-white/30">{t("deposit.uploadScreenshot")}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
                </label>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !transactionId.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? t("deposit.submitting") : t("deposit.submitDeposit")}
            </button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
