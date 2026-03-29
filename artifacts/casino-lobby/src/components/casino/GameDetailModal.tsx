import { useState } from "react";
import { X, Play, Info, Server, Tag, Gamepad2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useLaunchGame } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { Game, Vendor } from "@workspace/api-client-react";

const TYPE_LABELS: Record<number, string> = {
  1: "Live Casino",
  2: "Slot",
  3: "Mini Game",
  4: "Fishing",
  6: "Board Game",
};

const TYPE_COLORS: Record<number, string> = {
  1: "bg-red-500/20 text-red-400 border-red-500/30",
  2: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  3: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  4: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  6: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

interface GameDetailModalProps {
  game: Game | null;
  vendor: Vendor | null;
  open: boolean;
  onClose: () => void;
}

export function GameDetailModal({ game, vendor, open, onClose }: GameDetailModalProps) {
  const store = useLobbyStore();
  const { toast } = useToast();
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const { mutateAsync: launchGame } = useLaunchGame();

  if (!game) return null;

  const typeLabel = vendor ? TYPE_LABELS[vendor.type] || "Unknown" : "Unknown";
  const typeColor = vendor ? TYPE_COLORS[vendor.type] || "bg-white/10 text-white/60 border-white/10" : "";

  const handleLaunch = async () => {
    if (!store.playerCode) {
      toast({ variant: "destructive", title: "No Player", description: "Create a player first in the Wallet section." });
      return;
    }

    if (store.balance <= 0) {
      toast({ variant: "destructive", title: "No Balance", description: "Deposit funds before launching a game." });
      return;
    }

    setIsLaunching(true);
    setLaunchError(null);

    try {
      const res = await launchGame({
        data: {
          vendorCode: game.vendorCode,
          gameCode: game.gameCode,
          playerCode: store.playerCode,
          language: store.language,
          homeUrl: window.location.href,
        },
      });

      if (res.success && res.message) {
        store.launchGame(res.message, game);
        onClose();
        setTimeout(() => {
          document.getElementById("game-launcher-area")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        throw new Error("No game URL returned from API");
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Game launch endpoint not available for this API configuration.";
      setLaunchError(msg);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-white/10 text-white p-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">{game.gameName}</DialogTitle>
        <DialogDescription className="sr-only">Game details for {game.gameName} by {vendor?.name || game.vendorCode}</DialogDescription>
        <div className="relative">
          <div className="aspect-video w-full bg-gradient-to-br from-card to-black overflow-hidden relative">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                alt={game.gameName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <Gamepad2 className="w-16 h-16 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            <div className="absolute top-3 left-3 flex gap-2">
              {game.isNew && (
                <Badge className="bg-green-500/90 text-white text-xs font-bold border-none">NEW</Badge>
              )}
              {game.underMaintenance && (
                <Badge variant="destructive" className="text-xs font-bold border-none">MAINTENANCE</Badge>
              )}
            </div>

            <div className="absolute top-3 right-3">
              <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${typeColor}`}>
                {typeLabel}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-display font-bold text-white leading-tight">{game.gameName}</h2>
              <p className="text-sm text-muted-foreground mt-1">{vendor?.name || game.vendorCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Server className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Vendor Code</span>
                </div>
                <p className="text-sm font-mono text-white truncate">{game.vendorCode}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Game Code</span>
                </div>
                <p className="text-sm font-mono text-white truncate">{game.gameCode}</p>
              </div>
            </div>

            {game.slug && game.slug !== game.gameCode && (
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Slug</span>
                </div>
                <p className="text-sm font-mono text-white">{game.slug}</p>
              </div>
            )}

            {launchError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-0.5">Launch Not Available</p>
                  <p className="text-xs text-red-400/80">{launchError}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-bold rounded-xl h-11 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                disabled={isLaunching || game.underMaintenance}
                onClick={handleLaunch}
              >
                {isLaunching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isLaunching ? "Launching..." : "Launch Game"}
              </Button>
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 rounded-xl h-11"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
