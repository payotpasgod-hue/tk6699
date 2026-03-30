import { useState, useEffect } from "react";
import { X, Gift, Sparkles, Crown, Coins, Star, ChevronRight, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";

export function WelcomeBonusModal({ onClose, onRegister }: { onClose: () => void; onRegister: () => void }) {
  const [visible, setVisible] = useState(false);
  const [countUp, setCountUp] = useState(0);
  const t = useT();

  const BONUS_ITEMS = [
    { label: t("welcome.registrationLabel"), amount: 19, tag: t("register.free"), tagColor: "bg-green-500", desc: t("welcome.registrationDesc") },
    { label: t("welcome.firstDeposit"), amount: 156, tag: "100%", tagColor: "bg-amber-500", desc: t("welcome.firstDepositDesc") },
    { label: t("welcome.secondDeposit"), amount: 100, tag: "50%", tagColor: "bg-orange-500", desc: t("welcome.secondDepositDesc") },
    { label: t("welcome.thirdDeposit"), amount: 100, tag: "25%", tagColor: "bg-purple-500", desc: t("welcome.thirdDepositDesc") },
    { label: t("welcome.dailyCashback"), amount: 100, tag: "10%", tagColor: "bg-blue-500", desc: t("welcome.dailyCashbackDesc") },
    { label: t("welcome.vipWeekly"), amount: 100, tag: "VIP", tagColor: "bg-red-500", desc: t("welcome.vipWeeklyDesc") },
  ];

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const target = 575;
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCountUp(target);
        clearInterval(timer);
      } else {
        setCountUp(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-300 ${visible ? "bg-black/70 backdrop-blur-sm" : "bg-transparent"}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md mx-2 sm:mx-4 transition-all duration-500 ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-3 -left-3 -right-3 -bottom-3 bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-transparent rounded-3xl blur-xl" />

        <div className="relative bg-gradient-to-b from-[#1a1530] via-[#111827] to-[#0d1220] rounded-2xl sm:rounded-3xl border border-amber-500/30 overflow-hidden shadow-2xl shadow-amber-500/20">
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-500/10 to-transparent" />
          <div className="absolute top-4 left-6 w-2 h-2 bg-amber-400 rounded-full animate-ping opacity-50" />
          <div className="absolute top-8 right-10 w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping opacity-40" style={{ animationDelay: "0.5s" }} />
          <div className="absolute top-12 left-16 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-60" style={{ animationDelay: "1s" }} />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          <div className="relative pt-5 pb-3 px-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce" style={{ animationDuration: "2s" }}>
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">{t("welcome.title")}</h2>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
                {"\u09F3"}{countUp}
              </span>
              <span className="text-base sm:text-lg font-bold text-amber-400/60">BDT</span>
            </div>
            <p className="text-xs text-white/40 mt-1">{t("welcome.instantBonus")}</p>
          </div>

          <div className="px-3 sm:px-4 pb-3 space-y-1.5 max-h-[45vh] overflow-y-auto">
            {BONUS_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl transition-all duration-300 ${
                  i === 0
                    ? "bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 ring-1 ring-green-500/20"
                    : "bg-white/[0.03] border border-white/5 hover:border-white/10"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg ${i === 0 ? "bg-green-500/20" : "bg-amber-500/10"} flex items-center justify-center`}>
                  {i === 0 ? <Zap className="w-4 h-4 text-green-400" /> :
                   i === 1 ? <Crown className="w-4 h-4 text-amber-400" /> :
                   i === 2 ? <Coins className="w-4 h-4 text-orange-400" /> :
                   i === 3 ? <Star className="w-4 h-4 text-purple-400" /> :
                   i === 4 ? <Gift className="w-4 h-4 text-blue-400" /> :
                   <Sparkles className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-white truncate">{item.label}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-white ${item.tagColor}`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">{item.desc}</p>
                </div>
                <span className="shrink-0 text-sm sm:text-base font-bold text-amber-400">{"\u09F3"}{item.amount}</span>
              </div>
            ))}
          </div>

          <div className="p-3 sm:p-4 space-y-2">
            <button
              onClick={onRegister}
              className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm sm:text-base shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              {t("welcome.registerFree")}
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[10px] sm:text-xs text-white/30">
              {t("welcome.registrationBonus")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
