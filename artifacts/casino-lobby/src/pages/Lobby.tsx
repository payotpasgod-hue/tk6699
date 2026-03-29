import { useEffect, useState } from "react";
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

export default function Lobby() {
  const store = useLobbyStore();
  const { toast } = useToast();
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  // 1. Check server config for credentials
  const { data: configData } = useGetConfig();

  // 2. Setup queries for vendors
  // We use the query but only fetch when connected. 
  // In a real app we might use enabled: store.isConnected
  const { refetch: fetchVendors, isFetching: isFetchingVendors } = useGetVendors({
    query: { enabled: false }
  });

  const { mutateAsync: fetchGamesForVendor } = useGetGames();

  // Auto fetch vendors when connection is established
  useEffect(() => {
    if (store.isConnected) {
      loadVendors();
    }
  }, [store.isConnected]);

  const loadVendors = async () => {
    try {
      const res = await fetchVendors();
      if (res.data?.success && res.data.message) {
        store.setVendors(res.data.message);
        toast({ title: "Providers Loaded", description: `Found ${res.data.message.length} providers.` });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load vendors" });
    }
  };

  const handleLoadAllGames = async () => {
    if (!store.isConnected) {
      toast({ variant: "destructive", title: "Not Connected", description: "Please connect API first." });
      return;
    }
    if (store.vendors.length === 0) {
      await loadVendors();
      if (store.vendors.length === 0) return;
    }

    setIsLoadingGames(true);
    store.setGames([]); // clear existing
    
    let loadedCount = 0;
    
    // Process sequentially or in small batches to not overwhelm proxy
    for (const vendor of store.vendors) {
      try {
        const res = await fetchGamesForVendor({
          data: { vendorCode: vendor.vendorCode, language: store.language }
        });
        if (res.success && res.message) {
          store.addGames(res.message);
          loadedCount += res.message.length;
        }
      } catch (err) {
        console.warn(`Failed loading games for ${vendor.name}`, err);
      }
    }
    
    setIsLoadingGames(false);
    toast({ 
      title: "Games Loaded", 
      description: `Successfully loaded ${loadedCount} games from ${store.vendors.length} providers.` 
    });
    
    // Scroll to grid
    document.getElementById('providers-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary/30">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <ConfigPanel hasEnvCredentials={configData?.hasCredentials} />
        
        <Hero onLoadGames={handleLoadAllGames} />
        
        <StatsCards />
        
        <ControlPanel />
        
        <GameLauncher />
        
        <ProviderChips />
        
        <GameGrid isLoading={isLoadingGames} />
      </main>
    </div>
  );
}
