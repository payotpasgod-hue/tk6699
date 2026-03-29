import { useLobbyStore } from "@/store/use-lobby-store";
import { clsx } from "clsx";

const PROVIDER_LOGOS: Record<string, string> = {
  JILI: "/images/providers/jili.png",
  Pragmatic: "/images/providers/pragmatic-play.png",
  "Pragmatic Live": "/images/providers/pragmatic-play.png",
  "Pragmatic Mini": "/images/providers/pragmatic-play.png",
  PGSoft: "/images/providers/pgsoft.png",
  Evoplay: "/images/providers/evoplay.png",
  Habanero: "/images/providers/habanero.png",
  CQ9: "/images/providers/cq9.png",
  "CQ9 Fishing": "/images/providers/cq9.png",
  Spribe: "/images/providers/spribe.png",
  Aviator: "/images/providers/spribe.png",
  JDB: "/images/providers/jdb.png",
  "JDB Fishing": "/images/providers/jdb.png",
  Hacksaw: "/images/providers/hacksaw.png",
  "Micro Gaming": "/images/providers/micro-gaming.png",
};

export function ProviderChips() {
  const { vendors, games, selectedVendorCode, setFilters } = useLobbyStore();

  if (vendors.length === 0) return null;

  const vendorGameCounts = vendors.reduce<Record<string, number>>((acc, v) => {
    acc[v.vendorCode] = games.filter((g) => g.vendorCode === v.vendorCode).length;
    return acc;
  }, {});

  return (
    <div className="mb-5" id="providers-section">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-display font-bold text-white/60">Providers</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setFilters({ vendor: "ALL" })}
          className={clsx(
            "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border",
            selectedVendorCode === "ALL"
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-white/[0.03] text-white/30 border-white/5 hover:bg-white/5 hover:text-white/50"
          )}
        >
          All ({games.length})
        </button>

        {vendors.map((vendor) => {
          const count = vendorGameCounts[vendor.vendorCode] || 0;
          if (count === 0) return null;

          const logoSrc = PROVIDER_LOGOS[vendor.name];

          return (
            <button
              key={vendor.vendorCode}
              onClick={() => setFilters({ vendor: vendor.vendorCode })}
              className={clsx(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border whitespace-nowrap",
                selectedVendorCode === vendor.vendorCode
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-white/[0.03] text-white/30 border-white/5 hover:bg-white/5 hover:text-white/50"
              )}
            >
              {logoSrc && (
                <img src={logoSrc} alt={vendor.name} className="w-4 h-4 rounded-sm object-contain" />
              )}
              {vendor.name}
              <span className="ml-0.5 text-[10px] opacity-50">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
