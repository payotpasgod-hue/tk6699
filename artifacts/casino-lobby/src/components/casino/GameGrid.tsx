import { useMemo, useState } from "react";
import { Play, Info, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useLaunchGame } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { Game } from "@workspace/api-client-react";

export function GameGrid({ isLoading }: { isLoading: boolean }) {
  const store = useLobbyStore();
  const { toast } = useToast();
  const [launchingGame, setLaunchingGame] = useState<string | null>(null);

  const { mutateAsync: launchGame } = useLaunchGame();

  const filteredGames = useMemo(() => {
    return store.games.filter(game => {
      // Vendor match
      if (store.selectedVendorCode !== "ALL" && game.vendorCode !== store.selectedVendorCode) return false;
      
      // Search match
      if (store.searchQuery && !game.gameName.toLowerCase().includes(store.searchQuery.toLowerCase())) return false;
      
      // Type match (needs vendor mapping to check type)
      if (store.gameTypeFilter !== "ALL") {
        const vendor = store.vendors.find(v => v.vendorCode === game.vendorCode);
        if (vendor && vendor.type.toString() !== store.gameTypeFilter) return false;
      }
      
      return true;
    });
  }, [store.games, store.searchQuery, store.selectedVendorCode, store.gameTypeFilter, store.vendors]);

  const handleLaunch = async (game: Game) => {
    if (!store.playerCode) {
      toast({ variant: "destructive", title: "No Player", description: "Set a player code first." });
      return;
    }
    
    setLaunchingGame(game.gameCode);
    try {
      const res = await launchGame({
        data: {
          vendorCode: game.vendorCode,
          gameCode: game.gameCode,
          playerCode: store.playerCode,
          language: store.language,
          homeUrl: window.location.origin
        }
      });
      
      if (res.success && res.message) {
        store.launchGame(res.message, game);
        setTimeout(() => {
          document.getElementById('game-launcher-area')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        throw new Error("Failed to get game URL");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Launch Failed", description: err.message || "An error occurred launching the game." });
    } finally {
      setLaunchingGame(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card border border-white/5 overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-white/5" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-white/10 rounded w-1/3" />
              <div className="h-5 bg-white/10 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredGames.length === 0) {
    return (
      <div className="glass-panel py-20 flex flex-col items-center justify-center rounded-3xl text-center px-4">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-display font-bold text-white mb-2">No Games Found</h3>
        <p className="text-muted-foreground max-w-md">
          We couldn't find any games matching your current filters. Try changing the provider or clearing your search.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
      {filteredGames.map((game) => (
        <div 
          key={`${game.vendorCode}-${game.gameCode}`}
          className="group relative rounded-2xl bg-card/60 border border-white/10 overflow-hidden glass-panel-hover"
        >
          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <Badge variant="outline" className="bg-black/50 backdrop-blur-md border-white/20 text-white font-semibold">
              {store.vendors.find(v => v.vendorCode === game.vendorCode)?.name || game.provider || game.vendorCode}
            </Badge>
            {game.isNew && (
              <Badge className="bg-accent text-accent-foreground font-bold border-none w-fit">NEW</Badge>
            )}
            {game.underMaintenance && (
              <Badge variant="destructive" className="font-bold border-none w-fit">MAINTENANCE</Badge>
            )}
          </div>

          {/* Thumbnail area */}
          <div className="aspect-[4/3] w-full relative bg-gradient-to-br from-black to-card">
            {game.thumbnail ? (
              <img 
                src={game.thumbnail} 
                alt={game.gameName}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518546543973-10eb0a7b45cb?w=500&h=400&fit=crop&q=80';
                }}
              />
            ) : (
              /* abstract geometric neon placeholder */
              <img 
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&h=400&fit=crop&q=80"
                alt="Game placeholder"
                className="w-full h-full object-cover opacity-60 mix-blend-luminosity transition-transform duration-500 group-hover:scale-110"
              />
            )}
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3">
              <Button 
                className="bg-primary hover:bg-primary/90 rounded-full w-14 h-14 p-0 shadow-[0_0_20px_rgba(139,92,246,0.6)]"
                disabled={game.underMaintenance || launchingGame === game.gameCode}
                onClick={() => handleLaunch(game)}
              >
                {launchingGame === game.gameCode ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Play className="w-6 h-6 ml-1 text-white" fill="currentColor" />
                )}
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-white">
                <Info className="w-4 h-4 mr-2" /> Details
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 relative z-20 bg-gradient-to-t from-card to-transparent">
            <h4 className="text-white font-bold text-lg truncate mb-1" title={game.gameName}>
              {game.gameName}
            </h4>
            <p className="text-muted-foreground text-xs font-mono truncate">
              {game.gameCode}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
