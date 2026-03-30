import { useEffect } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useState } from "react";
import { useT } from "@/lib/i18n";

export function GameLauncher() {
  const { launchedGameUrl, launchedGameInfo, closeGame } = useLobbyStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const t = useT();

  useEffect(() => {
    if (launchedGameUrl) {
      setIsLoaded(false);
      document.body.style.overflow = "hidden";
      try {
        window.scrollTo({ top: 0 });
      } catch {}
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [launchedGameUrl]);

  if (!launchedGameUrl || !launchedGameInfo) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-[#0a0e1a] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-white truncate">
            {launchedGameInfo.gameName}
          </span>
        </div>
        <button
          onClick={closeGame}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          {t("game.close")}
        </button>
      </div>

      <div className="flex-1 relative">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white/40 text-sm">{t("game.loadingGame")}</p>
            </div>
          </div>
        )}
        <iframe
          src={launchedGameUrl}
          className="w-full h-full border-none"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
          onLoad={() => setIsLoaded(true)}
        />
      </div>
    </div>
  );
}
