import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Phone, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { WelcomeBonusModal } from "@/components/casino/WelcomeBonusModal";
import { LanguageSwitcher } from "@/components/casino/LanguageSwitcher";
import { useT } from "@/lib/i18n";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  const t = useT();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("bonus-popup-seen");
    if (!seen) {
      const timer = setTimeout(() => setShowBonus(true), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const dismissBonus = () => {
    setShowBonus(false);
    sessionStorage.setItem("bonus-popup-seen", "1");
  };

  const handleGoogleResponse = useCallback(async (response: any) => {
    if (!response?.credential) return;
    setIsGoogleLoading(true);
    try {
      const data = await apiRequest("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });
      setAuth(data.token, data.user);
      toast({ title: t("login.welcomeBack"), description: `${t("login.loggedInAs")} ${data.user.displayName}` });
      setLocation("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: t("login.failed"), description: err.message });
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
        });
        const btnEl = document.getElementById("google-signin-btn-login");
        if (btnEl) {
          window.google.accounts.id.renderButton(btnEl, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "center",
          });
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [handleGoogleResponse]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;

    setIsLoading(true);
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });
      setAuth(data.token, data.user);
      toast({ title: t("login.welcomeBack"), description: `${t("login.loggedInAs")} ${data.user.displayName}` });
      setLocation("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: t("login.failed"), description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#070b14] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-orange-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/images/logo.png" alt="TK6699" className="w-14 h-14 rounded-xl shadow-lg shadow-amber-500/20 mx-auto mb-3 object-cover" />
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
            TK<span className="text-amber-400">6699</span>
          </h1>
          <p className="text-white/30 text-xs sm:text-sm mt-1">{t("login.title")}</p>
        </div>

        <div
          onClick={() => { dismissBonus(); setLocation("/register"); }}
          className="mb-4 p-3 rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 cursor-pointer hover:border-green-400/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-400">{t("login.newPlayer")}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{t("login.freeBonus")}</p>
            </div>
            <span className="px-2 py-1 rounded-lg bg-green-500 text-[10px] font-bold text-white animate-pulse">{t("login.claim")}</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 p-5 sm:p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-[10px] sm:text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5 block">
              {t("login.phone")}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                type="tel"
                placeholder="01XXXXXXXXX"
                className="pl-10 bg-white/[0.03] border-white/5 h-11 focus-visible:ring-amber-500 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] sm:text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5 block">
              {t("login.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("login.password")}
                className="pl-10 pr-10 bg-white/[0.03] border-white/5 h-11 focus-visible:ring-amber-500 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" /> {t("login.submit")}
              </>
            )}
          </Button>

          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] sm:text-xs text-white/20">{t("login.or")}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {GOOGLE_CLIENT_ID ? (
            <div className="relative">
              <div id="google-signin-btn-login" className="w-full flex justify-center [&>div]:!w-full" />
              {isGoogleLoading && (
                <div className="absolute inset-0 bg-white/90 rounded-xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => toast({ title: t("google.configNeeded") })}
              className="w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-xl transition-colors text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("login.google")}
            </button>
          )}

          <p className="text-center text-xs sm:text-sm text-white/30">
            {t("login.noAccount")}{" "}
            <button
              type="button"
              className="text-amber-400 hover:text-amber-300 font-semibold"
              onClick={() => setLocation("/register")}
            >
              {t("login.register")}
            </button>
          </p>
        </form>
      </div>

      {showBonus && (
        <WelcomeBonusModal
          onClose={dismissBonus}
          onRegister={() => { dismissBonus(); setLocation("/register"); }}
        />
      )}
    </div>
  );
}
