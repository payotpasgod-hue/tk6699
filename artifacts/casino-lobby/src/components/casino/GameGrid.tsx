import { useMemo, useState } from "react";
import { Play, AlertTriangle, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLobbyStore } from "@/store/use-lobby-store";
import { GameDetailModal } from "./GameDetailModal";
import type { Game } from "@workspace/api-client-react";

const GAMES_PER_PAGE = 30;

interface GameGridProps {
  isLoading: boolean;
  loadProgress?: { current: number; total: number };
}

export function GameGrid({ isLoading, loadProgress }: GameGridProps) {
  const store = useLobbyStore();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const filteredGames = useMemo(() => {
    return store.games.filter((game) => {
      if (game.gameCode === "lobby") return false;
      if (store.selectedVendorCode !== "ALL" && game.vendorCode !== store.selectedVendorCode) return false;
      if (store.searchQuery && !game.gameName.toLowerCase().includes(store.searchQuery.toLowerCase())) return false;
      if (store.gameTypeFilter !== "ALL" && store.gameTypeFilter !== "HOT") {
        const vendor = store.vendors.find((v) => v.vendorCode === game.vendorCode);
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
    ? store.vendors.find((v) => v.vendorCode === selectedGame.vendorCode) || null
    : null;

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[#111827] overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="p-2 space-y-1.5">
                <div className="h-3 bg-white/5 rounded w-3/4" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (store.games.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center px-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
          <Gamepad2 className="w-8 h-8 text-white/10" />
        </div>
        <h3 className="text-lg font-display font-bold text-white mb-2">No Games Loaded</h3>
        <p className="text-white/30 text-sm max-w-md">
          Games will appear here once the cache is loaded.
        </p>
      </div>
    );
  }

  if (filteredGames.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center px-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-white/10" />
        </div>
        <h3 className="text-lg font-display font-bold text-white mb-2">No Matches</h3>
        <p className="text-white/30 text-sm max-w-md">
          No games match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-20">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-white/30">
          <span className="text-white/60 font-semibold">{filteredGames.length}</span> games
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => store.setGamesPage(Math.max(1, store.gamesPage - 1))}
              disabled={store.gamesPage <= 1}
              className="bg-white/5 border-white/5 h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-white/30 px-1">
              {store.gamesPage}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => store.setGamesPage(Math.min(totalPages, store.gamesPage + 1))}
              disabled={store.gamesPage >= totalPages}
              className="bg-white/5 border-white/5 h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {paginatedGames.map((game) => {
          const vendor = store.vendors.find((v) => v.vendorCode === game.vendorCode);

          return (
            <div
              key={`${game.vendorCode}-${game.gameCode}`}
              className="group relative rounded-xl bg-[#111827] border border-white/[0.04] overflow-hidden hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedGame(game)}
            >
              <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1">
                {game.isNew && (
                  <Badge className="bg-green-500/90 text-white text-[9px] font-bold border-none px-1 py-0 h-4">NEW</Badge>
                )}
                {game.underMaintenance && (
                  <Badge variant="destructive" className="text-[9px] font-bold border-none px-1 py-0 h-4">DOWN</Badge>
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
                  {vendor?.name || game.vendorCode}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => store.setGamesPage(Math.max(1, store.gamesPage - 1))}
            disabled={store.gamesPage <= 1}
            className="bg-white/5 border-white/5 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
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
                className={
                  store.gamesPage === page
                    ? "bg-amber-500 text-black h-8 w-8 p-0 font-bold"
                    : "bg-white/5 border-white/5 h-8 w-8 p-0"
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
            className="bg-white/5 border-white/5 text-xs"
          >
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
