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
import { isBDVendor, isBDHotGame, BD_FEATURED_VENDORS } from "@/lib/bd-games";
import { Flame, Sparkles, Star, Trophy, Zap, Fish, Tv } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Lobby() {
  const store = useLobbyStore();
  const { user, updateUser } = useAuthStore();
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });

  const loadFromCache = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/oroplay/cache`);
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { return false; }
      if (data.success && data.vendors && data.games) {
        const bdVendors = data.vendors.filter((v: any) => isBDVendor(v.vendorCode));
        const bdGames = data.games.filter((g: any) => isBDVendor(g.vendorCode));
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

  const showBrowseMode = store.searchQuery.length > 0 || store.selectedVendorCode !== "ALL";

  const hotGames = useMemo(() => {
    const hot = store.games.filter((g) => {
      if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
        const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
        if (vendor && vendor.type.toString() !== store.gameTypeFilter) return false;
      }
      return isBDHotGame(g.vendorCode, g.gameCode);
    });

    if (hot.length >= 5) return hot;

    const popularVendors = ["slot-jili", "slot-pgsoft", "slot-pragmatic", "mini-aviator", "mini-spribe", "slot-fachai"];
    const fallback = store.games.filter((g) => {
      if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
        const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
        if (vendor && vendor.type.toString() !== store.gameTypeFilter) return false;
      }
      return popularVendors.includes(g.vendorCode) && g.gameCode !== "lobby";
    });

    const merged = [...hot];
    const keys = new Set(hot.map((g) => `${g.vendorCode}::${g.gameCode}`));
    for (const g of fallback) {
      if (!keys.has(`${g.vendorCode}::${g.gameCode}`)) {
        merged.push(g);
        keys.add(`${g.vendorCode}::${g.gameCode}`);
      }
      if (merged.length >= 20) break;
    }
    return merged;
  }, [store.games, store.gameTypeFilter, store.vendors]);

  const newGames = useMemo(() => {
    return store.games
      .filter((g) => {
        if (!g.isNew || g.gameCode === "lobby") return false;
        if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
          const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
          if (vendor && vendor.type.toString() !== store.gameTypeFilter) return false;
        }
        return true;
      })
      .slice(0, 20);
  }, [store.games, store.gameTypeFilter, store.vendors]);

  const crashGames = useMemo(() => {
    return store.games
      .filter((g) => {
        if (g.gameCode === "lobby") return false;
        const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
        return vendor && vendor.type === 3;
      })
      .slice(0, 20);
  }, [store.games, store.vendors]);

  const fishingGames = useMemo(() => {
    return store.games
      .filter((g) => {
        if (g.gameCode === "lobby") return false;
        const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
        return vendor && vendor.type === 4;
      })
      .slice(0, 20);
  }, [store.games, store.vendors]);

  const liveCasinoGames = useMemo(() => {
    return store.games
      .filter((g) => {
        if (g.gameCode === "lobby") return false;
        const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
        return vendor && vendor.type === 1;
      })
      .slice(0, 20);
  }, [store.games, store.vendors]);

  const featuredProviderSections = useMemo(() => {
    if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
      const typeId = store.gameTypeFilter;
      const vendorGames: Record<string, typeof store.games> = {};
      for (const game of store.games) {
        if (game.gameCode === "lobby") continue;
        const vendor = store.vendors.find((v) => v.vendorCode === game.vendorCode);
        if (!vendor || vendor.type.toString() !== typeId) continue;
        if (!vendorGames[game.vendorCode]) vendorGames[game.vendorCode] = [];
        if (vendorGames[game.vendorCode].length < 20) {
          vendorGames[game.vendorCode].push(game);
        }
      }

      return Object.entries(vendorGames)
        .filter(([, games]) => games.length > 0)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 6)
        .map(([vendorCode, games]) => {
          const vendor = store.vendors.find((v) => v.vendorCode === vendorCode);
          return { vendorCode, name: vendor?.name || vendorCode, games };
        });
    }

    return BD_FEATURED_VENDORS.map((vendorCode) => {
      const vendor = store.vendors.find((v) => v.vendorCode === vendorCode);
      if (!vendor) return null;
      const games = store.games
        .filter((g) => g.vendorCode === vendorCode && g.gameCode !== "lobby")
        .slice(0, 20);
      if (games.length === 0) return null;
      return { vendorCode, name: vendor.name, games };
    }).filter(Boolean) as { vendorCode: string; name: string; games: typeof store.games }[];
  }, [store.games, store.vendors, store.gameTypeFilter]);

  const showCategorySections = store.gameTypeFilter === "ALL" || store.gameTypeFilter === "HOT";

  return (
    <div className="min-h-screen bg-[#070b14] text-white pb-20 sm:pb-8 selection:bg-amber-500/30">
      <Navbar />
      <CategoryTabs />

      <main className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-4">
        <GameLauncher />

        {!showBrowseMode && (
          <>
            <PromoBanner />

            {hotGames.length > 0 && (
              <GameRow
                title="Hot in Bangladesh"
                icon={<Flame className="w-4 h-4 text-orange-400" />}
                games={hotGames}
                accentColor="text-white"
              />
            )}

            {showCategorySections && crashGames.length > 0 && (
              <GameRow
                title="Crash Games"
                icon={<Zap className="w-4 h-4 text-yellow-400" />}
                games={crashGames}
                accentColor="text-white"
              />
            )}

            {newGames.length > 0 && (
              <GameRow
                title="New Games"
                icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
                games={newGames}
                accentColor="text-white"
              />
            )}

            {showCategorySections && fishingGames.length > 0 && (
              <GameRow
                title="Fishing Games"
                icon={<Fish className="w-4 h-4 text-blue-400" />}
                games={fishingGames}
                accentColor="text-white"
              />
            )}

            {showCategorySections && liveCasinoGames.length > 0 && (
              <GameRow
                title="Live Casino"
                icon={<Tv className="w-4 h-4 text-red-400" />}
                games={liveCasinoGames}
                accentColor="text-white"
              />
            )}

            {featuredProviderSections.map((section, idx) => (
              <GameRow
                key={section.vendorCode}
                title={section.name}
                icon={idx === 0 ? <Trophy className="w-4 h-4 text-amber-400" /> : <Star className="w-4 h-4 text-white/20" />}
                games={section.games}
                accentColor="text-white"
              />
            ))}
          </>
        )}

        {showBrowseMode && (
          <>
            <ProviderChips />
            <GameGrid isLoading={isLoadingGames} loadProgress={loadProgress} />
          </>
        )}

        {!showBrowseMode && store.games.length > 0 && (
          <>
            <ProviderChips />
            <GameGrid isLoading={isLoadingGames} loadProgress={loadProgress} />
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
