import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Phone, Lock, Eye, EyeOff, UserPlus, User, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/casino/LanguageSwitcher";
import { useT } from "@/lib/i18n";
import { isGoogleConfigured, openGoogleSignIn, handleGoogleRedirectResult } from "@/lib/google-auth";

export default function Register() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  const t = useT();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const processGoogleCredential = async (credential: string) => {
    setIsGoogleLoading(true);
    try {
      const data = await apiRequest("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      setAuth(data.token, data.user);
      toast({ title: t("register.bonusAdded"), description: `${t("register.welcome")} ${data.user.displayName}! ${t("register.bonusReady")}` });
      setLocation("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: t("register.failed"), description: err.message });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    const token = handleGoogleRedirectResult();
    if (token) {
      processGoogleCredential(token);
    }
  }, []);

  const handleGoogleClick = async () => {
    if (isGoogleLoading) return;
    try {
      const credential = await openGoogleSignIn();
      await processGoogleCredential(credential);
    } catch (err: any) {
      if (err.message !== "Sign-in cancelled") {
        toast({ variant: "destructive", title: t("register.failed"), description: err.message });
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;

    setIsLoading(true);
    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ phone, password, displayName: displayName || undefined }),
      });
      setAuth(data.token, data.user);
      toast({ title: t("register.bonusAdded"), description: `${t("register.welcome")} ${data.user.displayName}! ${t("register.bonusReady")}` });
      setLocation("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: t("register.failed"), description: err.message });
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
        <div className="text-center mb-5">
          <img src="/images/logo.png" alt="TK6699" className="w-14 h-14 rounded-xl shadow-lg shadow-amber-500/20 mx-auto mb-3 object-cover" />
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
            TK<span className="text-amber-400">6699</span>
          </h1>
          <p className="text-white/30 text-xs sm:text-sm mt-1">{t("register.title")}</p>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 relative overflow-hidden">
          <div className="absolute top-1 right-2 opacity-30">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{t("register.bonus")}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-amber-400">{"\u09F3"}19</span>
            <span className="text-[10px] text-amber-400/60">{t("register.free")}</span>
          </div>
          <p className="text-[10px] text-white/40 mt-0.5">{t("register.instantCredit")}</p>
        </div>

        <form onSubmit={handleRegister} className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 p-5 sm:p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-[10px] sm:text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5 block">
              {t("register.displayName")}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                type="text"
                placeholder={t("register.namePlaceholder")}
                className="pl-10 bg-white/[0.03] border-white/5 h-11 focus-visible:ring-amber-500 text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] sm:text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5 block">
              {t("login.phone")}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                type="tel"
                placeholder={t("register.phonePlaceholder")}
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
                placeholder={t("register.passwordPlaceholder")}
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
                <UserPlus className="w-4 h-4 mr-2" /> {t("register.submit")}
              </>
            )}
          </Button>

          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] sm:text-xs text-white/20">{t("login.or")}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {isGoogleConfigured() ? (
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isGoogleLoading}
              className="w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-all text-sm border border-gray-200 shadow-sm disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t("register.google")}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => toast({ title: t("google.configNeeded") })}
              className="w-full h-11 flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white/50 font-semibold rounded-xl transition-colors text-sm border border-white/10"
            >
              <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("register.google")}
            </button>
          )}

          <p className="text-center text-xs sm:text-sm text-white/30">
            {t("register.hasAccount")}{" "}
            <button
              type="button"
              className="text-amber-400 hover:text-amber-300 font-semibold"
              onClick={() => setLocation("/login")}
            >
              {t("register.signIn")}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
