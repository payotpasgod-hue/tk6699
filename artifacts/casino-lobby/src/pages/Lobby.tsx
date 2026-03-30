import { useEffect, useState, useCallback, useMemo } from "react";
import { Navbar } from "@/components/casino/Navbar";
import { CategoryTabs } from "@/components/casino/CategoryTabs";
import { PromoBanner } from "@/components/casino/PromoBanner";
import { GameRow } from "@/components/casino/GameRow";
import { ProviderChips } from "@/components/casino/ProviderChips";
import { GameGrid } from "@/components/casino/GameGrid";
import { GameLauncher } from "@/components/casino/GameLauncher";
import { BottomNav } from "@/components/casino/BottomNav";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { isBDVendor, isBDHotGame } from "@/lib/bd-games";
import { Flame, Search, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Lobby() {
  const store = useLobbyStore();
  const { updateUser } = useAuthStore();
  const [isLoadingGames] = useState(false);
  const [loadProgress] = useState({ current: 0, total: 0 });
  const [localSearch, setLocalSearch] = useState("");

  const loadFromCache = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/oroplay/cache`);
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { return false; }
      if (data.success && data.vendors && data.games) {
        const bdVendors = data.vendors.filter((v: any) => isBDVendor(v.vendorCode));
        const bdGames = data.games.filter((g: any) => isBDVendor(g.vendorCode) && g.gameCode !== "lobby");
        store.setVendors(bdVendors);
        store.setGames(bdGames);
        store.setCacheTimestamp(data.timestamp);
        return true;
      }
    } catch {}
    return false;
  }, []);

  useEffect(() => {
    loadFromCache();
    syncBalance();
  }, []);

  const syncBalance = async () => {
    try {
      const data = await apiRequest("/api/oroplay/player/balance");
      if (data.success) {
        updateUser({ balance: data.balance });
      }
    } catch {}
  };

  const isHomeTab = store.gameTypeFilter === "ALL" || store.gameTypeFilter === "HOT";
  const isBrowsing = !isHomeTab || store.searchQuery.length > 0 || store.selectedVendorCode !== "ALL";

  const hotGames = useMemo(() => {
    const hot = store.games.filter((g) => isBDHotGame(g.vendorCode, g.gameCode));

    if (hot.length >= 10) return hot;

    const popularVendors = ["slot-jili", "slot-pgsoft", "slot-pragmatic", "mini-aviator", "mini-spribe", "slot-fachai", "mini-inout"];
    const merged = [...hot];
    const keys = new Set(hot.map((g) => `${g.vendorCode}::${g.gameCode}`));
    for (const g of store.games) {
      if (!keys.has(`${g.vendorCode}::${g.gameCode}`) && popularVendors.includes(g.vendorCode)) {
        merged.push(g);
        keys.add(`${g.vendorCode}::${g.gameCode}`);
      }
      if (merged.length >= 30) break;
    }
    return merged;
  }, [store.games]);

  const handleSearch = (val: string) => {
    setLocalSearch(val);
    store.setFilters({ search: val });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white pb-20 sm:pb-8 selection:bg-amber-500/30">
      <Navbar />
      <CategoryTabs />

      <GameLauncher />

      <main className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-4">
        {isHomeTab && !isBrowsing && (
          <>
            <PromoBanner />

            {hotGames.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <h2 className="text-base font-display font-bold text-white">Hot in Bangladesh</h2>
                  <span className="text-[10px] text-amber-400/50 bg-amber-400/10 px-2 py-0.5 rounded-full font-semibold">
                    {hotGames.length} games
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                  {hotGames.map((game) => {
                    const vendor = store.vendors.find((v) => v.vendorCode === game.vendorCode);
                    return (
                      <GameCard key={`${game.vendorCode}-${game.gameCode}`} game={game} vendorName={vendor?.name} />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {isBrowsing && (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search games..."
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
                {localSearch && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <ProviderChips />
            <GameGrid isLoading={isLoadingGames} loadProgress={loadProgress} />
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

import { Play, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GameDetailModal } from "@/components/casino/GameDetailModal";
import type { Game } from "@workspace/api-client-react";

function GameCard({ game, vendorName }: { game: Game; vendorName?: string }) {
  const [showDetail, setShowDetail] = useState(false);
  const store = useLobbyStore();
  const vendor = store.vendors.find((v) => v.vendorCode === game.vendorCode) || null;

  return (
    <>
      <div
        className="group relative rounded-xl bg-[#111827] border border-white/[0.04] overflow-hidden hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1">
          {game.isNew && (
            <Badge className="bg-green-500/90 text-white text-[9px] font-bold border-none px-1 py-0 h-4">NEW</Badge>
          )}
        </div>

        <div className="aspect-[4/3] w-full relative overflow-hidden">
          {game.thumbnail ? (
            <img
              src={game.thumbnail}
              alt={game.gameName}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/5 to-orange-500/5">
              <Gamepad2 className="w-8 h-8 text-white/10" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
            <div className="bg-amber-500 rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-amber-500/40 scale-75 group-hover:scale-100 transition-transform duration-200">
              <Play className="w-4 h-4 ml-0.5 text-black" fill="currentColor" />
            </div>
          </div>
        </div>

        <div className="p-2">
          <h4 className="text-white text-xs font-semibold truncate leading-tight" title={game.gameName}>
            {game.gameName}
          </h4>
          <p className="text-[10px] text-white/20 truncate mt-0.5">
            {vendorName || game.vendorCode}
          </p>
        </div>
      </div>

      <GameDetailModal
        game={showDetail ? game : null}
        vendor={vendor}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
