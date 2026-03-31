import { useLobbyStore } from "@/store/use-lobby-store";
import { clsx } from "clsx";
import { useState, useCallback } from "react";

const PROVIDER_LOGO_MAP: Record<string, string> = {
  "slot-jili": "https://static.imgbin.com/storage/games/providers/jili.png",
  "slot-pragmatic": "https://cdn.softswiss.net/i/s2/155/pragmaticplay.png",
  "casino-pragmatic": "https://cdn.softswiss.net/i/s2/155/pragmaticplay.png",
  "mini-pragmatic": "https://cdn.softswiss.net/i/s2/155/pragmaticplay.png",
  "slot-pgsoft": "https://cdn.softswiss.net/i/s2/173/pgsoft.png",
  "slot-evoplay": "https://cdn.softswiss.net/i/s2/139/evoplay.png",
  "slot-habanero": "https://cdn.softswiss.net/i/s2/140/habanero.png",
  "slot-cq9": "https://cdn.softswiss.net/i/s2/186/cq9.png",
  "fishing-cq9": "https://cdn.softswiss.net/i/s2/186/cq9.png",
  "mini-spribe": "https://cdn.softswiss.net/i/s2/169/spribe.png",
  "mini-aviator": "https://cdn.softswiss.net/i/s2/169/spribe.png",
  "slot-jdb": "https://cdn.softswiss.net/i/s2/188/jdb.png",
  "fishing-jdb": "https://cdn.softswiss.net/i/s2/188/jdb.png",
  "slot-hacksaw": "https://cdn.softswiss.net/i/s2/180/hacksawgaming.png",
  "casino-micro": "https://cdn.softswiss.net/i/s2/108/microgaming.png",
  "slot-booongo": "https://cdn.softswiss.net/i/s2/147/booongo.png",
  "casino-ezugi": "https://cdn.softswiss.net/i/s2/126/ezugi.png",
  "slot-playson": "https://cdn.softswiss.net/i/s2/137/playson.png",
  "slot-egt": "https://cdn.softswiss.net/i/s2/142/egt.png",
  "slot-novomatic": "https://cdn.softswiss.net/i/s2/109/novomatic.png",
  "slot-3oaks": "https://cdn.softswiss.net/i/s2/185/3oaks.png",
  "slot-tada": "https://cdn.softswiss.net/i/s2/191/tada.png",
  "slot-fachai": "https://cdn.softswiss.net/i/s2/189/fachai.png",
  "slot-popok": "https://cdn.softswiss.net/i/s2/167/popok.png",
  "slot-mascot": "https://cdn.softswiss.net/i/s2/138/mascot.png",
  "casino-sa": "https://cdn.softswiss.net/i/s2/124/sagaming.png",
  "slot-ka": "https://cdn.softswiss.net/i/s2/190/kagaming.png",
  "slot-nolimitcity": "https://cdn.softswiss.net/i/s2/160/nolimitcity.png",
  "mini-bgaming": "https://cdn.softswiss.net/i/s2/145/bgaming.png",
  "mini-inout": "https://cdn.softswiss.net/i/s2/156/inout.png",
  "slot-dreamtech": "https://cdn.softswiss.net/i/s2/154/dreamtech.png",
  "slot-rubyplay": "https://cdn.softswiss.net/i/s2/176/rubyplay.png",
  "slot-amusnet": "https://cdn.softswiss.net/i/s2/122/amusnet.png",
  "slot-popiplay": "https://cdn.softswiss.net/i/s2/177/popiplay.png",
  "slot-wg": "https://cdn.softswiss.net/i/s2/184/worldmatch.png",
  "casino-dream": "https://cdn.softswiss.net/i/s2/136/dreamgaming.png",
  "casino-playace": "https://cdn.softswiss.net/i/s2/155/pragmaticplay.png",
  "slot-homeslot": "https://cdn.softswiss.net/i/s2/187/jili.png",
  "slot-atg": "https://cdn.softswiss.net/i/s2/185/3oaks.png",
  "slot-amigo": "https://cdn.softswiss.net/i/s2/147/booongo.png",
  "fishing-fungaming": "https://cdn.softswiss.net/i/s2/186/cq9.png",
  "board-poker": "https://cdn.softswiss.net/i/s2/108/microgaming.png",
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
