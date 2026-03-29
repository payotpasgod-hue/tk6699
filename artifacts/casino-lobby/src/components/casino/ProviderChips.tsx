import { useLobbyStore } from "@/store/use-lobby-store";
import { clsx } from "clsx";

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

          return (
            <button
              key={vendor.vendorCode}
              onClick={() => setFilters({ vendor: vendor.vendorCode })}
              className={clsx(
                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border whitespace-nowrap",
                selectedVendorCode === vendor.vendorCode
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-white/[0.03] text-white/30 border-white/5 hover:bg-white/5 hover:text-white/50"
              )}
            >
              {vendor.name}
              <span className="ml-1.5 text-[10px] opacity-50">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
