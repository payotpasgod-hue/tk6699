import { useState } from "react";
import { Wallet, RefreshCw, LogOut, Shield, Search, X, Menu, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/use-auth-store";
import { useLobbyStore } from "@/store/use-lobby-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function Navbar() {
  const { user, updateUser, logout, isAdmin } = useAuthStore();
  const store = useLobbyStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSyncBalance = async () => {
    try {
      const data = await apiRequest("/api/oroplay/player/balance");
      if (data.success) {
        updateUser({ balance: data.balance });
        toast({ title: "Balance Updated", description: `৳${data.balance.toFixed(2)}` });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not sync balance" });
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {}
    logout();
    setLocation("/login");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-[#0a0e1a]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
                <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <span className="text-white font-display font-bold text-xs">TK</span>
                </div>
                <h1 className="text-lg font-display font-bold text-white tracking-wide hidden sm:block">
                  TK<span className="text-amber-400">6699</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Search className="w-4 h-4 text-white/70" />
              </button>

              <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">৳{(user?.balance || 0).toFixed(2)}</span>
                <button onClick={handleSyncBalance} className="ml-1 hover:text-amber-300 transition-colors">
                  <RefreshCw className="w-3 h-3 text-amber-400/60" />
                </button>
              </div>

              <Button
                size="sm"
                className="hidden sm:flex h-8 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs rounded-lg"
                onClick={() => { if (isAdmin()) setLocation("/admin"); }}
              >
                {isAdmin() ? <><Shield className="w-3 h-3 mr-1" /> Admin</> : <><Wallet className="w-3 h-3 mr-1" /> Deposit</>}
              </Button>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors sm:hidden"
              >
                <Menu className="w-4 h-4 text-white/70" />
              </button>

              <button
                onClick={handleLogout}
                className="hidden sm:flex w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 items-center justify-center transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-white/50 hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {showSearch && (
          <div className="border-t border-white/5 px-3 py-2 bg-[#0a0e1a]">
            <div className="max-w-[1400px] mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                autoFocus
                placeholder="Search games..."
                className="pl-10 pr-10 bg-white/5 border-white/10 focus-visible:ring-amber-500 h-10 text-sm"
                value={store.searchQuery}
                onChange={(e) => store.setFilters({ search: e.target.value })}
              />
              <button
                onClick={() => { setShowSearch(false); store.setFilters({ search: "" }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-white/30 hover:text-white" />
              </button>
            </div>
          </div>
        )}
      </nav>

      {showMobileMenu && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm sm:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute right-0 top-0 w-72 h-full bg-[#0d1220] border-l border-white/10 p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">{user?.displayName}</span>
              </div>
              <button onClick={() => setShowMobileMenu(false)}>
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-amber-400/60 mb-1">Balance</p>
              <p className="text-2xl font-bold text-amber-400">৳{(user?.balance || 0).toFixed(2)}</p>
              <button onClick={handleSyncBalance} className="text-xs text-amber-400/60 mt-2 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {isAdmin() && (
              <button
                onClick={() => { setShowMobileMenu(false); setLocation("/admin"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-white">Admin Dashboard</span>
              </button>
            )}

            <button
              onClick={() => { setShowMobileMenu(false); handleLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Logout</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
