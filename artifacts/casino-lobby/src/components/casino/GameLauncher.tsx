import { X, ExternalLink, Maximize2, ShieldCheck, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useAuthStore } from "@/store/use-auth-store";
import { motion, AnimatePresence } from "framer-motion";

export function GameLauncher() {
  const { launchedGameUrl, launchedGameInfo, closeGame } = useLobbyStore();
  const { user } = useAuthStore();

  if (!launchedGameUrl || !launchedGameInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="game-launcher-area"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full my-6 scroll-mt-24"
      >
        <div className="glass-panel border-primary/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)]">
          <div className="bg-black/40 border-b border-white/10 px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-white leading-tight">
                  {launchedGameInfo.gameName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-green-400" />
                  <span>Secure Session</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{user?.displayName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(launchedGameUrl, "_blank")}
                className="bg-white/5 border-white/10 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Pop Out
              </Button>
              <Button variant="destructive" size="sm" onClick={closeGame} className="text-xs ml-1">
                <X className="w-3.5 h-3.5 mr-1.5" /> Close
              </Button>
            </div>
          </div>

          <div className="w-full aspect-[16/9] bg-black relative">
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-muted-foreground text-sm font-medium">Loading Game...</p>
              </div>
            </div>
            <iframe
              src={launchedGameUrl}
              className="w-full h-full border-none relative z-10"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
