import { LayoutGrid, Gamepad2, Tv, Fish, Gift, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useLocation } from "wouter";
import { clsx } from "clsx";
import { useT } from "@/lib/i18n";

export function BottomNav() {
  const { gameTypeFilter, setFilters } = useLobbyStore();
  const { user } = useAuthStore();
  const [location, setLocation] = useLocation();
  const t = useT();

  const isBonus = location === "/bonus";
  const isDeposit = location === "/deposit";
  const isWithdraw = location === "/withdraw";
  const isSpecialPage = isBonus || isDeposit || isWithdraw;

  const GAME_TABS = [
    { id: "ALL", label: t("bottom.all"), icon: LayoutGrid },
    { id: "2", label: t("bottom.slots"), icon: Gamepad2 },
    { id: "1", label: t("bottom.live"), icon: Tv },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0a0e1a]/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around py-1.5 px-1 safe-bottom">
        {GAME_TABS.map((item) => {
          const Icon = item.icon;
          const isActive = !isSpecialPage && gameTypeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isSpecialPage) setLocation("/");
                setFilters({ type: item.id });
              }}
              className="flex flex-col items-center gap-0.5 py-1 px-1.5"
            >
              <Icon
                className={clsx(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-amber-400" : "text-white/30"
                )}
              />
              <span
                className={clsx(
                  "text-[10px] font-semibold transition-colors",
                  isActive ? "text-amber-400" : "text-white/30"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setLocation("/deposit")}
          className="flex flex-col items-center gap-0.5 py-1 px-1.5"
        >
          <ArrowDownToLine
            className={clsx(
              "w-5 h-5 transition-colors",
              isDeposit ? "text-emerald-400" : "text-white/30"
            )}
          />
          <span
            className={clsx(
              "text-[10px] font-semibold transition-colors",
              isDeposit ? "text-emerald-400" : "text-white/30"
            )}
          >
            {t("bottom.deposit")}
          </span>
        </button>

        <button
          onClick={() => setLocation("/withdraw")}
          className="flex flex-col items-center gap-0.5 py-1 px-1.5"
        >
          <ArrowUpFromLine
            className={clsx(
              "w-5 h-5 transition-colors",
              isWithdraw ? "text-orange-400" : "text-white/30"
            )}
          />
          <span
            className={clsx(
              "text-[10px] font-semibold transition-colors",
              isWithdraw ? "text-orange-400" : "text-white/30"
            )}
          >
            {t("bottom.withdraw")}
          </span>
        </button>

        <button
          onClick={() => setLocation("/bonus")}
          className="flex flex-col items-center gap-0.5 py-1 px-1.5 relative"
        >
          <div className="relative">
            <Gift
              className={clsx(
                "w-5 h-5 transition-colors",
                isBonus ? "text-amber-400" : "text-white/30"
              )}
            />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <span
            className={clsx(
              "text-[10px] font-semibold transition-colors",
              isBonus ? "text-amber-400" : "text-white/30"
            )}
          >
            {t("bottom.bonus")}
          </span>
        </button>
      </div>
    </div>
  );
}
