import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { useT } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = useT();

  useEffect(() => {
    const dismissed = sessionStorage.getItem("pwa-dismissed");
    if (dismissed) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  if (!showBanner) return null;

  if (showIOSGuide) {
    return (
      <div className="fixed bottom-16 left-2 right-2 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-[90] animate-in slide-in-from-bottom-4">
        <div className="bg-[#1a1e2e] border border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-black/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-white">{t("pwa.installApp")}</span>
            </div>
            <button onClick={dismiss} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>
          <div className="space-y-2 text-xs text-white/60">
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-[10px]">1</span>
              {t("pwa.step1")} <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded text-white/80">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                {t("pwa.share")}
              </span> {t("pwa.step1end")}
            </p>
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-[10px]">2</span>
              {t("pwa.step2")} <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">{t("pwa.addToHomeScreen")}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-[10px]">3</span>
              {t("pwa.step3")} <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">{t("pwa.add")}</span> {t("pwa.step3end")}
            </p>
          </div>
          <button onClick={dismiss} className="w-full mt-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold">
            {t("pwa.gotIt")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-16 left-2 right-2 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-[90] animate-in slide-in-from-bottom-4">
      <div className="bg-[#1a1e2e] border border-amber-500/30 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{t("pwa.install")}</p>
            <p className="text-[11px] text-white/40">{t("pwa.addHomeScreen")}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold"
            >
              {t("pwa.installBtn")}
            </button>
            <button onClick={dismiss} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
