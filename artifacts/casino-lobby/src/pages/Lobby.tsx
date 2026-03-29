import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/casino/Navbar";
import { Hero } from "@/components/casino/Hero";
import { StatsCards } from "@/components/casino/StatsCards";
import { ConfigPanel } from "@/components/casino/ConfigPanel";
import { ControlPanel } from "@/components/casino/ControlPanel";
import { ProviderChips } from "@/components/casino/ProviderChips";
import { GameGrid } from "@/components/casino/GameGrid";
import { GameLauncher } from "@/components/casino/GameLauncher";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useToast } from "@/hooks/use-toast";
import { useGetConfig, useGetVendors, useGetGames } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Lobby() {
  const store = useLobbyStore();
  const { toast } = useToast();
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  const { data: configData } = useGetConfig();

  const { refetch: fetchVendors } = useGetVendors({
    query: { enabled: false }
  });

  const { mutateAsync: fetchGamesForVendor } = useGetGames();

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
    if (store.isConnected) {
      loadFromCache().then((cached) => {
        if (!cached) {
          loadVendors();
        }
      });
    }
  }, [store.isConnected]);

  const loadVendors = async (): Promise<typeof store.vendors> => {
    try {
      const res = await fetchVendors();
      if (res.data?.success && res.data.message) {
        store.setVendors(res.data.message);
        return res.data.message;
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Vendor Load Failed", description: err.message || "Could not fetch providers." });
    }
    return [];
  };

  const handleLoadAllGames = async () => {
    if (!store.isConnected) {
      toast({ variant: "destructive", title: "Not Connected", description: "Please connect API first." });
      return;
    }

    const hasCached = await loadFromCache();
    if (hasCached) {
      const currentStore = useLobbyStore.getState();
      toast({ title: "Games Loaded", description: `Loaded ${currentStore.games.length} games from cache instantly.` });
      document.getElementById('providers-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    let vendorList = useLobbyStore.getState().vendors;
    if (vendorList.length === 0) {
      vendorList = await loadVendors();
      if (vendorList.length === 0) return;
    }

    setIsLoadingGames(true);
    store.setGames([]);
    
    let loadedCount = 0;
    let failedCount = 0;
    setLoadProgress({ current: 0, total: vendorList.length });
    
    for (let i = 0; i < vendorList.length; i++) {
      const vendor = vendorList[i];
      setLoadProgress({ current: i + 1, total: vendorList.length });
      try {
        const res = await fetchGamesForVendor({
          data: { vendorCode: vendor.vendorCode, language: store.language }
        });
        if (res.success && res.message) {
          store.addGames(res.message);
          loadedCount += res.message.length;
        }
      } catch {
        failedCount++;
      }
    }
    
    setIsLoadingGames(false);
    toast({ 
      title: "Games Loaded", 
      description: `Loaded ${loadedCount} games from ${vendorList.length} providers.${failedCount > 0 ? ` (${failedCount} failed)` : ""}` 
    });
    
    document.getElementById('providers-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRefreshCache = async () => {
    if (!store.isConnected) {
      toast({ variant: "destructive", title: "Not Connected", description: "Please connect API first." });
      return;
    }
    
    setIsRefreshingCache(true);
    toast({ title: "Refreshing Cache", description: "Fetching all games from all providers... This may take a minute." });
    
    try {
      const res = await fetch(`${BASE}/api/oroplay/cache/refresh`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        store.setVendors(data.vendors);
        store.setGames(data.games);
        store.setCacheTimestamp(data.timestamp);
        const failedNote = data.failedVendors > 0 ? ` (${data.failedVendors} provider${data.failedVendors > 1 ? 's' : ''} failed)` : '';
        toast({ 
          title: "Cache Refreshed", 
          description: `Cached ${data.totalGames} games from ${data.totalVendors} providers.${failedNote}` 
        });
      } else {
        throw new Error(data.message || "Failed to refresh cache");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Cache Refresh Failed", description: err.message });
    } finally {
      setIsRefreshingCache(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary/30">
      <Navbar />
      
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ConfigPanel hasEnvCredentials={configData?.hasCredentials} />
        
        <Hero 
          onLoadGames={handleLoadAllGames}
          onRefreshCache={handleRefreshCache}
          isRefreshing={isRefreshingCache}
          cacheTimestamp={store.cacheTimestamp}
        />
        
        <StatsCards />
        
        <ControlPanel />
        
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
