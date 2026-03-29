import { Gem, Settings, Wallet, User, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useToast } from "@/hooks/use-toast";
import { useGetPlayerBalance } from "@workspace/api-client-react";

export function Navbar() {
  const { playerCode, balance, setPlayerSession } = useLobbyStore();
  const { toast } = useToast();
  const { mutateAsync: checkBalance, isPending: isChecking } = useGetPlayerBalance();

  const handleCheckBalance = async () => {
    try {
      const res = await checkBalance({ data: { playerCode } });
      if (res.success && res.message !== undefined) {
        setPlayerSession({ balance: res.message });
        toast({ title: "Balance Updated", description: `Current balance: $${res.message.toFixed(2)}` });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Balance Check Failed", description: "Could not retrieve balance" });
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b-0 border-b-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Gem className="w-6 h-6 text-white" />
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/20"></div>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white tracking-wide">
                ORO<span className="text-secondary">PLAY</span>
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Premium Test Env</p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-3 mr-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-white">{playerCode || "No Player"}</span>
              <div className="w-px h-4 bg-white/20 mx-1"></div>
              <Wallet className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-accent">${balance.toFixed(2)}</span>
            </div>

            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white"
              onClick={handleCheckBalance}
              disabled={isChecking || !playerCode}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Sync Balance
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              Operator Panel
            </Button>
          </div>
          
        </div>
      </div>
    </nav>
  );
}
