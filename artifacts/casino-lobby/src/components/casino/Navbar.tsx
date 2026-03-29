import { Wallet, User, RefreshCw, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function Navbar() {
  const { user, updateUser, logout, isAdmin } = useAuthStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSyncBalance = async () => {
    try {
      const data = await apiRequest("/api/oroplay/player/balance");
      if (data.success) {
        updateUser({ balance: data.balance });
        toast({ title: "Balance Updated", description: `Current balance: ৳${data.balance.toFixed(2)}` });
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
    <nav className="sticky top-0 z-50 w-full glass-panel border-b-0 border-b-primary/20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary shadow-[0_0_16px_rgba(139,92,246,0.3)]">
              <span className="text-white font-display font-bold text-sm">TK</span>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white tracking-wide leading-tight">
                TK<span className="text-secondary">6699</span>
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAdmin() && (
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20 text-xs h-8"
                onClick={() => setLocation("/admin")}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Admin
              </Button>
            )}

            <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-white">{user?.displayName || "Guest"}</span>
              <div className="w-px h-3.5 bg-white/20" />
              <Wallet className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">৳{(user?.balance || 0).toFixed(2)}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-xs h-8"
              onClick={handleSyncBalance}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Sync
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-8"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
