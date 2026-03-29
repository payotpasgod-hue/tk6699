import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useLobbyStore } from "@/store/use-lobby-store";
import { Layers } from "lucide-react";
import { clsx } from "clsx";

const TYPE_LABELS: Record<number, string> = {
  1: "Live",
  2: "Slot",
  3: "Mini",
  4: "Fish",
  6: "Board",
};

const TYPE_COLORS: Record<number, string> = {
  1: "bg-red-500/20 text-red-400 border-red-500/20",
  2: "bg-purple-500/20 text-purple-400 border-purple-500/20",
  3: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  4: "bg-cyan-500/20 text-cyan-400 border-cyan-500/20",
  6: "bg-orange-500/20 text-orange-400 border-orange-500/20",
};

export function ProviderChips() {
  const { vendors, games, selectedVendorCode, setFilters } = useLobbyStore();

  const vendorGameCounts = vendors.reduce<Record<string, number>>((acc, v) => {
    acc[v.vendorCode] = games.filter(g => g.vendorCode === v.vendorCode).length;
    return acc;
  }, {});

  return (
    <div className="mb-6" id="providers-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-secondary" />
          <h3 className="text-base font-display font-semibold text-white">Providers</h3>
          <span className="text-xs text-muted-foreground">({vendors.length})</span>
        </div>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex w-max space-x-2 p-0.5">
          <button
            onClick={() => setFilters({ vendor: "ALL" })}
            className={clsx(
              "px-4 py-2 rounded-lg font-semibold transition-all duration-200 border text-sm",
              selectedVendorCode === "ALL" 
                ? "bg-gradient-to-r from-primary to-purple-500 text-white border-transparent shadow-[0_0_12px_rgba(139,92,246,0.4)]" 
                : "bg-card/40 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            All ({games.length})
          </button>
          
          {vendors.map((vendor) => {
            const count = vendorGameCounts[vendor.vendorCode] || 0;
            const typeLabel = TYPE_LABELS[vendor.type] || "";
            const typeColor = TYPE_COLORS[vendor.type] || "bg-white/10 text-white/50 border-white/10";
            
            return (
              <button
                key={vendor.vendorCode}
                onClick={() => setFilters({ vendor: vendor.vendorCode })}
                className={clsx(
                  "px-4 py-2 rounded-lg font-semibold transition-all duration-200 border flex items-center gap-2 text-sm",
                  selectedVendorCode === vendor.vendorCode 
                    ? "bg-gradient-to-r from-secondary to-blue-500 text-white border-transparent shadow-[0_0_12px_rgba(6,182,212,0.4)]" 
                    : "bg-card/40 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                {vendor.name}
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0 rounded-full bg-black/30 border border-white/10 text-white/60 font-bold">
                    {count}
                  </span>
                )}
                {typeLabel && (
                  <span className={clsx("text-[9px] px-1.5 py-0 rounded border font-bold uppercase", typeColor)}>
                    {typeLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="bg-white/5" />
      </ScrollArea>
    </div>
  );
}
