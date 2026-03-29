import { X, ExternalLink, Maximize2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/store/use-lobby-store";
import { motion, AnimatePresence } from "framer-motion";

export function GameLauncher() {
  const { launchedGameUrl, launchedGameInfo, playerCode, closeGame } = useLobbyStore();

  if (!launchedGameUrl || !launchedGameInfo) return null;

  const handleOpenNewTab = () => {
    window.open(launchedGameUrl, '_blank');
  };

  return (
    <AnimatePresence>
      <motion.div 
        id="game-launcher-area"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full my-8 scroll-mt-24"
      >
        <div className="glass-panel border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)]">
          {/* Header */}
          <div className="bg-black/40 border-b border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Play className="w-6 h-6 text-primary" fill="currentColor" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white leading-tight">
                  {launchedGameInfo.gameName}
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                    Secure Session
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="font-mono">{playerCode}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenNewTab} className="bg-white/5 border-white/10">
                <ExternalLink className="w-4 h-4 mr-2" /> Pop Out
              </Button>
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hidden sm:flex">
                <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen
              </Button>
              <Button variant="destructive" size="sm" onClick={closeGame} className="ml-2">
                <X className="w-4 h-4 mr-2" /> Close Game
              </Button>
            </div>
          </div>

          {/* Iframe Container */}
          <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-black relative">
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Loading Game Frame...</p>
              </div>
            </div>
            <iframe 
              src={launchedGameUrl} 
              className="w-full h-full border-none relative z-10"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Quick inline icon just for the header
function Play(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  )
}
