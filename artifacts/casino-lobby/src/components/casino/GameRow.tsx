import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GameDetailModal } from "./GameDetailModal";
import { useLobbyStore } from "@/store/use-lobby-store";
import type { Game, Vendor } from "@workspace/api-client-react";

interface GameRowProps {
  title: string;
  icon?: React.ReactNode;
  games: Game[];
  accentColor?: string;
}

export function GameRow({ title, icon, games, accentColor = "text-white" }: GameRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const store = useLobbyStore();

  if (games.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  const selectedVendor = selectedGame
    ? store.vendors.find((v) => v.vendorCode === selectedGame.vendorCode) || null
    : null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`text-base font-display font-bold ${accentColor}`}>{title}</h3>
          <span className="text-xs text-white/30 font-medium">{games.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white/40" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory"
      >
        {games.map((game) => (
          <div
            key={`${game.vendorCode}-${game.gameCode}`}
            className="group relative flex-shrink-0 w-[140px] sm:w-[160px] rounded-xl bg-[#111827] border border-white/[0.04] overflow-hidden hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 cursor-pointer snap-start"
            onClick={() => setSelectedGame(game)}
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
              <p className="text-[10px] text-white/30 truncate mt-0.5">
                {store.vendors.find((v) => v.vendorCode === game.vendorCode)?.name || game.vendorCode}
              </p>
            </div>
          </div>
        ))}
      </div>

      <GameDetailModal
        game={selectedGame}
        vendor={selectedVendor}
        open={!!selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
}
