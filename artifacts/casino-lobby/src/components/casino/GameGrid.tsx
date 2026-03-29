import { useMemo, useState } from "react";
import { Play, AlertTriangle, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLobbyStore } from "@/store/use-lobby-store";
import { GameDetailModal } from "./GameDetailModal";
import type { Game } from "@workspace/api-client-react";

const GAMES_PER_PAGE = 30;

const TYPE_LABELS: Record<number, string> = {
  1: "Live",
  2: "Slot",
  3: "Mini",
  4: "Fish",
  6: "Board",
};

interface GameGridProps {
  isLoading: boolean;
  loadProgress?: { current: number; total: number };
}

export function GameGrid({ isLoading, loadProgress }: GameGridProps) {
  const store = useLobbyStore();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const filteredGames = useMemo(() => {
    return store.games.filter(game => {
      if (store.selectedVendorCode !== "ALL" && game.vendorCode !== store.selectedVendorCode) return false;
      if (store.searchQuery && !game.gameName.toLowerCase().includes(store.searchQuery.toLowerCase())) return false;
      if (store.gameTypeFilter !== "ALL") {
        const vendor = store.vendors.find(v => v.vendorCode === game.vendorCode);
        if (vendor && vendor.type.toString() !== store.gameTypeFilter) return false;
      }
      return true;
    });
  }, [store.games, store.searchQuery, store.selectedVendorCode, store.gameTypeFilter, store.vendors]);

  const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
  const paginatedGames = useMemo(() => {
    const start = (store.gamesPage - 1) * GAMES_PER_PAGE;
    return filteredGames.slice(start, start + GAMES_PER_PAGE);
  }, [filteredGames, store.gamesPage]);

  const selectedVendor = selectedGame
    ? store.vendors.find(v => v.vendorCode === selectedGame.vendorCode) || null
    : null;

  if (isLoading) {
    return (
      <div className="mb-8">
        {loadProgress && loadProgress.total > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Loading providers...</span>
              <span>{loadProgress.current}/{loadProgress.total}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300"
                style={{ width: `${(loadProgress.current / loadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-card/40 border border-white/5 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (store.games.length === 0) {
    return (
      <div className="glass-panel py-16 flex flex-col items-center justify-center rounded-2xl text-center px-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
          <Gamepad2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-display font-bold text-white mb-2">No Games Loaded</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Click "Load All Games" or "Refresh Cache" above to fetch games from all providers.
        </p>
      </div>
    );
  }

  if (filteredGames.length === 0) {
    return (
      <div className="glass-panel py-16 flex flex-col items-center justify-center rounded-2xl text-center px-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-display font-bold text-white mb-2">No Matches</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          No games match your current filters. Try changing the provider or clearing your search.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="text-white font-semibold">{paginatedGames.length}</span> of <span className="text-white font-semibold">{filteredGames.length}</span> games
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => store.setGamesPage(Math.max(1, store.gamesPage - 1))}
              disabled={store.gamesPage <= 1}
              className="bg-white/5 border-white/10 h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {store.gamesPage} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => store.setGamesPage(Math.min(totalPages, store.gamesPage + 1))}
              disabled={store.gamesPage >= totalPages}
              className="bg-white/5 border-white/10 h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {paginatedGames.map((game) => {
          const vendor = store.vendors.find(v => v.vendorCode === game.vendorCode);
          const typeLabel = vendor ? TYPE_LABELS[vendor.type] || "" : "";
          
          return (
            <div 
              key={`${game.vendorCode}-${game.gameCode}`}
              className="group relative rounded-xl bg-card/50 border border-white/[0.06] overflow-hidden hover:border-white/20 hover:shadow-[0_4px_24px_rgba(139,92,246,0.12)] transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedGame(game)}
            >
              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {game.isNew && (
                  <Badge className="bg-green-500/90 text-white text-[10px] font-bold border-none px-1.5 py-0">NEW</Badge>
                )}
                {game.underMaintenance && (
                  <Badge variant="destructive" className="text-[10px] font-bold border-none px-1.5 py-0">DOWN</Badge>
                )}
              </div>

              {typeLabel && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 font-bold uppercase">
                    {typeLabel}
                  </span>
                </div>
              )}

              <div className="aspect-[4/3] w-full relative bg-gradient-to-br from-card to-black overflow-hidden">
                {game.thumbnail ? (
                  <img 
                    src={game.thumbnail} 
                    alt={game.gameName}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <Gamepad2 className="w-8 h-8 text-white/20" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                  <div className="bg-primary/90 rounded-full w-12 h-12 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.6)]">
                    <Play className="w-5 h-5 ml-0.5 text-white" fill="currentColor" />
                  </div>
                </div>
              </div>

              <div className="p-2.5">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate mb-0.5">
                  {vendor?.name || game.vendorCode}
                </p>
                <h4 className="text-white font-bold text-sm truncate leading-tight" title={game.gameName}>
                  {game.gameName}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => store.setGamesPage(Math.max(1, store.gamesPage - 1))}
            disabled={store.gamesPage <= 1}
            className="bg-white/5 border-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            let page: number;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (store.gamesPage <= 3) {
              page = i + 1;
            } else if (store.gamesPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = store.gamesPage - 2 + i;
            }

            return (
              <Button
                key={page}
                variant={store.gamesPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => store.setGamesPage(page)}
                className={store.gamesPage === page 
                  ? "bg-primary text-white h-8 w-8 p-0" 
                  : "bg-white/5 border-white/10 h-8 w-8 p-0"
                }
              >
                {page}
              </Button>
            );
          })}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => store.setGamesPage(Math.min(totalPages, store.gamesPage + 1))}
            disabled={store.gamesPage >= totalPages}
            className="bg-white/5 border-white/10"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <GameDetailModal
        game={selectedGame}
        vendor={selectedVendor}
        open={!!selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
}
