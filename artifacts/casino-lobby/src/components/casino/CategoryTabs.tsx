import { useLobbyStore } from "@/store/use-lobby-store";
import { clsx } from "clsx";
import { Flame, Tv, Gamepad2, Fish, Zap, Dice1, LayoutGrid, Trophy, Star } from "lucide-react";

const CATEGORIES = [
  { id: "ALL", label: "All", icon: LayoutGrid },
  { id: "HOT", label: "Popular", icon: Flame },
  { id: "2", label: "Slots", icon: Gamepad2 },
  { id: "1", label: "Live Casino", icon: Tv },
  { id: "4", label: "Fishing", icon: Fish },
  { id: "3", label: "Crash", icon: Zap },
  { id: "6", label: "Table", icon: Dice1 },
];

export function CategoryTabs() {
  const { gameTypeFilter, setFilters } = useLobbyStore();

  return (
    <div className="w-full overflow-x-auto scrollbar-hide bg-[#0d1220]/80 border-b border-white/5">
      <div className="max-w-[1400px] mx-auto px-3">
        <div className="flex items-center gap-1 py-2 min-w-max">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = gameTypeFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setFilters({ type: cat.id })}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
