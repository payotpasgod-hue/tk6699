import { useState } from "react";
import { X, Play, Server, Tag, Gamepad2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/use-auth-store";
import { useLobbyStore } from "@/store/use-lobby-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Game, Vendor } from "@workspace/api-client-react";

const TYPE_LABELS: Record<number, string> = {
  1: "Live Casino",
  2: "Slot",
  3: "Crash",
  4: "Fishing",
  6: "Table Game",
};

interface GameDetailModalProps {
  game: Game | null;
  vendor: Vendor | null;
  open: boolean;
  onClose: () => void;
}

export function GameDetailModal({ game, vendor, open, onClose }: GameDetailModalProps) {
  const { user } = useAuthStore();
  const store = useLobbyStore();
  const { toast } = useToast();
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  if (!game) return null;

  const typeLabel = vendor ? TYPE_LABELS[vendor.type] || "Game" : "Game";

  const handleLaunch = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to play games." });
      return;
    }

    if ((user.balance || 0) <= 0) {
      toast({ variant: "destructive", title: "No Balance", description: "Contact admin to add funds to your account." });
      return;
    }

    setIsLaunching(true);
    setLaunchError(null);

    try {
      const data = await apiRequest("/api/oroplay/game/launch", {
        method: "POST",
        body: JSON.stringify({
          vendorCode: game.vendorCode,
          gameCode: game.gameCode,
          language: store.language,
          lobbyUrl: window.location.href,
        }),
      });

      if (data.success && data.message) {
        store.launchGame(data.message, game);
        onClose();
        setTimeout(() => {
          document.getElementById("game-launcher-area")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        throw new Error("No game URL returned");
      }
    } catch (err: any) {
      setLaunchError(err.message || "Failed to launch game");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#111827]/98 backdrop-blur-xl border-white/10 text-white p-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">{game.gameName}</DialogTitle>
        <DialogDescription className="sr-only">Game details for {game.gameName}</DialogDescription>
        <div className="relative">
          <div className="aspect-video w-full bg-gradient-to-br from-[#111827] to-black overflow-hidden relative">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                alt={game.gameName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                <Gamepad2 className="w-16 h-16 text-white/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />

            <div className="absolute top-3 left-3 flex gap-2">
              {game.isNew && (
                <Badge className="bg-green-500/90 text-white text-xs font-bold border-none">NEW</Badge>
              )}
              {game.underMaintenance && (
                <Badge variant="destructive" className="text-xs font-bold border-none">MAINTENANCE</Badge>
              )}
            </div>

            <div className="absolute top-3 right-3">
              <span className="text-xs px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold">
                {typeLabel}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-display font-bold text-white leading-tight">{game.gameName}</h2>
              <p className="text-sm text-white/40 mt-1">{vendor?.name || game.vendorCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Server className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] text-white/30 uppercase font-semibold">Provider</span>
                </div>
                <p className="text-sm text-white truncate">{vendor?.name || game.vendorCode}</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Tag className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] text-white/30 uppercase font-semibold">Type</span>
                </div>
                <p className="text-sm text-white truncate">{typeLabel}</p>
              </div>
            </div>

            {launchError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-0.5">Launch Failed</p>
                  <p className="text-xs text-red-400/80">{launchError}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl h-11 shadow-lg shadow-amber-500/20"
                disabled={isLaunching || game.underMaintenance}
                onClick={handleLaunch}
              >
                {isLaunching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isLaunching ? "Launching..." : "Play Now"}
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
