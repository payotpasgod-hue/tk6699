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
import { useToast } from "@/hooks/use-toast";
import { Flame, Sparkles, Star, Trophy } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Lobby() {
  const store = useLobbyStore();
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });

  const loadFromCache = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/oroplay/cache`);
      const data = await res.json();
      if (data.success && data.vendors && data.games) {
        store.setVendors(data.vendors);
        store.setGames(data.games);
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

  const popularGames = useMemo(() => {
    const filtered = store.games.filter((g) => {
      if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
        const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
        if (vendor && vendor.type.toString() !== store.gameTypeFilter) return false;
      }
      return true;
    });
    return filtered.slice(0, 20);
  }, [store.games, store.gameTypeFilter, store.vendors]);

  const newGames = useMemo(() => {
    const filtered = store.games.filter((g) => {
      if (!g.isNew) return false;
      if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
        const vendor = store.vendors.find((v) => v.vendorCode === g.vendorCode);
        if (vendor && vendor.type.toString() !== store.gameTypeFilter) return false;
      }
      return true;
    });
    return filtered.slice(0, 20);
  }, [store.games, store.gameTypeFilter, store.vendors]);

  const topProviderSections = useMemo(() => {
    const vendorCounts: Record<string, number> = {};
    const vendorGames: Record<string, typeof store.games> = {};

    for (const game of store.games) {
      if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
        const vendor = store.vendors.find((v) => v.vendorCode === game.vendorCode);
        if (vendor && vendor.type.toString() !== store.gameTypeFilter) continue;
      }
      vendorCounts[game.vendorCode] = (vendorCounts[game.vendorCode] || 0) + 1;
      if (!vendorGames[game.vendorCode]) vendorGames[game.vendorCode] = [];
      if (vendorGames[game.vendorCode].length < 20) {
        vendorGames[game.vendorCode].push(game);
      }
    }

    const sorted = Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return sorted.map(([vendorCode]) => {
      const vendor = store.vendors.find((v) => v.vendorCode === vendorCode);
      return {
        vendorCode,
        name: vendor?.name || vendorCode,
        games: vendorGames[vendorCode] || [],
      };
    });
  }, [store.games, store.vendors, store.gameTypeFilter]);

  return (
    <div className="min-h-screen bg-[#070b14] text-white pb-20 sm:pb-8 selection:bg-amber-500/30">
      <Navbar />
      <CategoryTabs />

      <main className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-4">
        <GameLauncher />

        {!showBrowseMode && (
          <>
            <PromoBanner />

            {popularGames.length > 0 && (
              <GameRow
                title="Popular Games"
                icon={<Flame className="w-4 h-4 text-orange-400" />}
                games={popularGames}
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

            {topProviderSections.map((section, idx) => (
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
