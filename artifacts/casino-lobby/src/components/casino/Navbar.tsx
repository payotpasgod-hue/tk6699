import { Gem, Wallet, User, RefreshCw } from "lucide-react";
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
      const res = await checkBalance({ data: { userCode: playerCode } });
      if (res.success && res.message !== undefined) {
        setPlayerSession({ balance: res.message });
        toast({ title: "Balance Updated", description: `Current balance: $${res.message.toFixed(2)}` });
      }
    } catch {
      toast({ variant: "destructive", title: "Balance Check Failed", description: "Could not retrieve balance" });
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b-0 border-b-primary/20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary shadow-[0_0_16px_rgba(139,92,246,0.3)]">
              <Gem className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white tracking-wide leading-tight">
                ORO<span className="text-secondary">PLAY</span>
              </h1>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-[0.2em]">Test Environment</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-white">{playerCode || "No Player"}</span>
              <div className="w-px h-3.5 bg-white/20" />
              <Wallet className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">${balance.toFixed(2)}</span>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-xs h-8"
              onClick={handleCheckBalance}
              disabled={isChecking || !playerCode}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
          
        </div>
      </div>
    </nav>
  );
}
