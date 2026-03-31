import { useLobbyStore } from "@/store/use-lobby-store";
import { clsx } from "clsx";
import { useState, useCallback } from "react";

const PROVIDER_LOGO_MAP: Record<string, string> = {
  "slot-jili": "/providers/jili.png",
  "slot-pragmatic": "/providers/pragmatic.png",
  "casino-pragmatic": "/providers/pragmatic.png",
  "mini-pragmatic": "/providers/pragmatic.png",
  "slot-pgsoft": "/providers/pgsoft.png",
  "slot-evoplay": "/providers/evoplay.png",
  "slot-habanero": "/providers/habanero.png",
  "slot-cq9": "/providers/cq9.png",
  "fishing-cq9": "/providers/cq9.png",
  "mini-spribe": "/providers/spribe.png",
  "mini-aviator": "/providers/spribe.png",
  "slot-jdb": "/providers/jdb.png",
  "fishing-jdb": "/providers/jdb.png",
  "slot-hacksaw": "/providers/hacksaw.png",
  "casino-micro": "/providers/microgaming.png",
  "slot-booongo": "/providers/booongo.png",
  "casino-ezugi": "/providers/ezugi.png",
  "slot-playson": "/providers/playson.png",
  "slot-egt": "/providers/egt.png",
  "slot-novomatic": "/providers/novomatic.png",
  "slot-3oaks": "/providers/3oaks.png",
  "slot-tada": "/providers/tada.png",
  "slot-fachai": "/providers/fachai.png",
  "slot-popok": "/providers/popok.png",
  "slot-mascot": "/providers/mascot.png",
  "casino-sa": "/providers/sagaming.png",
  "slot-ka": "/providers/kagaming.png",
  "slot-nolimitcity": "/providers/nolimitcity.png",
  "mini-bgaming": "/providers/bgaming.png",
  "mini-inout": "/providers/inout.png",
  "slot-dreamtech": "/providers/dreamtech.png",
  "slot-rubyplay": "/providers/rubyplay.png",
  "slot-amusnet": "/providers/amusnet.png",
  "slot-popiplay": "/providers/popiplay.png",
  "slot-wg": "/providers/worldmatch.png",
  "casino-dream": "/providers/dreamgaming.png",
  "casino-playace": "/providers/pragmatic.png",
  "slot-homeslot": "/providers/jili.png",
  "slot-atg": "/providers/atg.png",
  "slot-amigo": "/providers/amigo.png",
  "fishing-fungaming": "/providers/fungaming.png",
  "board-poker": "/providers/microgaming.png",
};

function getProviderInitials(name: string): string {
  const words = name.split(/[\s-]+/);
  if (words.length === 1) return name.substring(0, 2).toUpperCase();
  return words.map(w => w.charAt(0)).join("").substring(0, 2).toUpperCase();
}

function ProviderLogo({ vendorCode, name }: { vendorCode: string; name: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = PROVIDER_LOGO_MAP[vendorCode];

  const handleError = useCallback(() => setImgFailed(true), []);

  if (!logoUrl || imgFailed) {
    return (
      <span className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center text-[8px] font-bold text-amber-300 flex-shrink-0 border border-amber-500/20">
        {getProviderInitials(name)}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      className="w-5 h-5 rounded-md object-contain flex-shrink-0 bg-white/10 p-[1px]"
      onError={handleError}
      loading="lazy"
    />
  );
}

export function ProviderChips() {
  const { vendors, games, selectedVendorCode, gameTypeFilter, setFilters } = useLobbyStore();

  if (vendors.length === 0) return null;

  const filteredVendors = vendors.filter((v) => {
    if (gameTypeFilter === "ALL" || gameTypeFilter === "HOT") return true;
    return v.type.toString() === gameTypeFilter;
  });

  const vendorGameCounts = filteredVendors.reduce<Record<string, number>>((acc, v) => {
    acc[v.vendorCode] = games.filter((g) => g.vendorCode === v.vendorCode && g.gameCode !== "lobby").length;
    return acc;
  }, {});

  const totalGames = Object.values(vendorGameCounts).reduce((a, b) => a + b, 0);

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
          All ({totalGames})
        </button>

        {filteredVendors.map((vendor) => {
          const count = vendorGameCounts[vendor.vendorCode] || 0;
          if (count === 0) return null;

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
              <ProviderLogo vendorCode={vendor.vendorCode} name={vendor.name} />
              {vendor.name}
              <span className="ml-0.5 text-[10px] opacity-50">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
