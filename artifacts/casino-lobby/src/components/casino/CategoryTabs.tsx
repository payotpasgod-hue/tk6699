import { useLobbyStore } from "@/store/use-lobby-store";
import { clsx } from "clsx";
import { Flame, Tv, Gamepad2, Fish, Zap, Dice1, LayoutGrid } from "lucide-react";
import { useT } from "@/lib/i18n";

export function CategoryTabs() {
  const { gameTypeFilter, setFilters } = useLobbyStore();
  const t = useT();

  const CATEGORIES = [
    { id: "ALL", label: t("cat.all"), icon: LayoutGrid },
    { id: "HOT", label: t("cat.popular"), icon: Flame },
    { id: "2", label: t("cat.slots"), icon: Gamepad2 },
    { id: "1", label: t("cat.liveCasino"), icon: Tv },
    { id: "4", label: t("cat.fishing"), icon: Fish },
    { id: "3", label: t("cat.crash"), icon: Zap },
    { id: "6", label: t("cat.table"), icon: Dice1 },
  ];

  const handleTab = (id: string) => {
    setFilters({ type: id, vendor: "ALL", search: "" });
  };

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
                onClick={() => handleTab(cat.id)}
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
