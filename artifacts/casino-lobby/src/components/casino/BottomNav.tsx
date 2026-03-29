import { LayoutGrid, Gamepad2, Tv, Fish, Gift, Wallet } from "lucide-react";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useLocation } from "wouter";
import { clsx } from "clsx";

const GAME_TABS = [
  { id: "ALL", label: "All", icon: LayoutGrid },
  { id: "2", label: "Slots", icon: Gamepad2 },
  { id: "1", label: "Live", icon: Tv },
  { id: "4", label: "Fish", icon: Fish },
];

export function BottomNav() {
  const { gameTypeFilter, setFilters } = useLobbyStore();
  const { user } = useAuthStore();
  const [location, setLocation] = useLocation();

  const isBonus = location === "/bonus";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0a0e1a]/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around py-1.5 px-1">
        {GAME_TABS.map((item) => {
          const Icon = item.icon;
          const isActive = !isBonus && gameTypeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isBonus) setLocation("/");
                setFilters({ type: item.id });
              }}
              className="flex flex-col items-center gap-0.5 py-1 px-2"
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
          onClick={() => setLocation("/bonus")}
          className="flex flex-col items-center gap-0.5 py-1 px-2 relative"
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
            Bonus
          </span>
        </button>

        <button className="flex flex-col items-center gap-0.5 py-1 px-2">
          <Wallet className="w-5 h-5 text-amber-400/60" />
          <span className="text-[10px] font-bold text-amber-400">
            ৳{(user?.balance || 0).toFixed(0)}
          </span>
        </button>
      </div>
    </div>
  );
}
