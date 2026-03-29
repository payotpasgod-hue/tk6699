import { LayoutGrid, Tv, Gamepad2, Fish, User, Wallet } from "lucide-react";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useAuthStore } from "@/store/use-auth-store";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { id: "ALL", label: "All", icon: LayoutGrid },
  { id: "2", label: "Slots", icon: Gamepad2 },
  { id: "1", label: "Live", icon: Tv },
  { id: "4", label: "Fishing", icon: Fish },
];

export function BottomNav() {
  const { gameTypeFilter, setFilters } = useLobbyStore();
  const { user } = useAuthStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0a0e1a]/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around py-1.5 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = gameTypeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setFilters({ type: item.id })}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
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
        <button className="flex flex-col items-center gap-0.5 py-1 px-3">
          <div className="relative">
            <Wallet className="w-5 h-5 text-amber-400/60" />
          </div>
          <span className="text-[10px] font-bold text-amber-400">৳{(user?.balance || 0).toFixed(0)}</span>
        </button>
      </div>
    </div>
  );
}
