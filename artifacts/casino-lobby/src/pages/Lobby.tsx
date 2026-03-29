import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/casino/Navbar";
import { Hero } from "@/components/casino/Hero";
import { SearchFilters } from "@/components/casino/SearchFilters";
import { ProviderChips } from "@/components/casino/ProviderChips";
import { GameGrid } from "@/components/casino/GameGrid";
import { GameLauncher } from "@/components/casino/GameLauncher";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

  const handleLoadGames = async () => {
    const hasCached = await loadFromCache();
    if (hasCached) {
      const currentStore = useLobbyStore.getState();
      toast({ title: "Games Ready", description: `${currentStore.games.length} games available.` });
      document.getElementById("providers-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setIsLoadingGames(true);
    toast({ title: "Loading Games", description: "Fetching games from all providers..." });

    try {
      const res = await fetch(`${BASE}/api/oroplay/cache/refresh`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        store.setVendors(data.vendors);
        store.setGames(data.games);
        store.setCacheTimestamp(data.timestamp);
        toast({ title: "Games Loaded", description: `${data.totalGames} games from ${data.totalVendors} providers.` });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setIsLoadingGames(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary/30">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Hero
          onLoadGames={handleLoadGames}
          cacheTimestamp={store.cacheTimestamp}
        />

        <SearchFilters />

        <GameLauncher />

        <ProviderChips />

        <GameGrid
          isLoading={isLoadingGames}
          loadProgress={loadProgress}
        />
      </main>
    </div>
  );
}
