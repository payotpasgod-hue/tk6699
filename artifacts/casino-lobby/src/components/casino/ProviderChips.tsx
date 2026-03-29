import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useLobbyStore } from "@/store/use-lobby-store";
import { Layers } from "lucide-react";
import { clsx } from "clsx";

export function ProviderChips() {
  const { vendors, selectedVendorCode, setFilters } = useLobbyStore();

  return (
    <div className="mb-8" id="providers-section">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-secondary" />
        <h3 className="text-xl font-display font-semibold text-white">Providers</h3>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex w-max space-x-3 p-1">
          <button
            onClick={() => setFilters({ vendor: "ALL" })}
            className={clsx(
              "px-6 py-3 rounded-xl font-semibold transition-all duration-300 border",
              selectedVendorCode === "ALL" 
                ? "bg-gradient-to-r from-primary to-purple-500 text-white border-transparent shadow-[0_0_15px_rgba(139,92,246,0.5)]" 
                : "bg-card/40 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            All Providers
          </button>
          
          {vendors.map((vendor) => (
            <button
              key={vendor.vendorCode}
              onClick={() => setFilters({ vendor: vendor.vendorCode })}
              className={clsx(
                "px-6 py-3 rounded-xl font-semibold transition-all duration-300 border flex items-center gap-2",
                selectedVendorCode === vendor.vendorCode 
                  ? "bg-gradient-to-r from-secondary to-blue-500 text-white border-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
                  : "bg-card/40 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white"
              )}
            >
              {vendor.name}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10 text-white/70">
                {vendor.type === 1 ? 'Live' : vendor.type === 2 ? 'Slot' : 'Mini'}
              </span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="bg-white/5" />
      </ScrollArea>
    </div>
  );
}
