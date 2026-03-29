import { useState } from "react";
import { Search, Coins, Plus, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useToast } from "@/hooks/use-toast";
import { 
  useCreatePlayer, 
  useDepositBalance, 
  useWithdrawBalance 
} from "@workspace/api-client-react";

export function ControlPanel() {
  const store = useLobbyStore();
  const { toast } = useToast();
  
  const [isPlayerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [isDepositDialogOpen, setDepositDialogOpen] = useState(false);
  
  const [newPlayerCode, setNewPlayerCode] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  const { mutateAsync: createPlayer, isPending: isCreating } = useCreatePlayer();
  const { mutateAsync: depositBalance, isPending: isDepositing } = useDepositBalance();
  const { mutateAsync: withdrawBalance, isPending: isWithdrawing } = useWithdrawBalance();

  const handleCreatePlayer = async () => {
    if (!newPlayerCode) return;
    try {
      const res = await createPlayer({ data: { userCode: newPlayerCode } });
      if (res.success) {
        store.setPlayerSession({ playerCode: newPlayerCode, balance: 0 });
        toast({ title: "Player Created", description: `Active player set to ${newPlayerCode}` });
        setPlayerDialogOpen(false);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create player" });
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount))) return;
    try {
      const res = await depositBalance({ 
        data: { userCode: store.playerCode, amount: Number(depositAmount) } 
      });
      if (res.success && res.message !== undefined) {
        store.setPlayerSession({ balance: res.message });
        toast({ title: "Deposit Successful", description: `Added $${depositAmount}. New balance: $${res.message}` });
        setDepositDialogOpen(false);
        setDepositAmount("");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Deposit Failed", description: err.message || "Failed to deposit" });
    }
  };

  const handleWithdrawAll = async () => {
    if (store.balance <= 0) {
      toast({ title: "No balance", description: "Balance is already 0" });
      return;
    }
    try {
      const res = await withdrawBalance({
        data: { userCode: store.playerCode, amount: -1 }
      });
      if (res.success && res.message !== undefined) {
        store.setPlayerSession({ balance: res.message });
        toast({ title: "Withdrawal Successful", description: `Withdrew all funds. New balance: $${res.message}` });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Withdrawal Failed", description: err.message || "Failed to withdraw" });
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl mb-6 flex flex-col lg:flex-row gap-5">
      
      <div className="flex-1 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r border-white/10 pb-5 lg:pb-0 lg:pr-5">
        <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2 uppercase tracking-wider">
          <Coins className="w-4 h-4 text-accent" /> Wallet
        </h3>
        <div className="flex flex-wrap gap-2">
          
          <Dialog open={isPlayerDialogOpen} onOpenChange={setPlayerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New Player
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Register Test Player</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input 
                  placeholder="User Code (e.g. test_002)" 
                  className="bg-black/50 border-white/10"
                  value={newPlayerCode}
                  onChange={(e) => setNewPlayerCode(e.target.value)}
                />
                <Button className="w-full bg-primary" onClick={handleCreatePlayer} disabled={isCreating}>
                  {isCreating ? "Registering..." : "Create & Activate Player"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDepositDialogOpen} onOpenChange={setDepositDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-secondary/90 text-white hover:bg-secondary text-xs">
                <Send className="w-3.5 h-3.5 mr-1.5" /> Seed Balance
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Deposit Funds</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="text-sm text-muted-foreground mb-2">Depositing to: <strong className="text-white">{store.playerCode}</strong></div>
                <Input 
                  type="number"
                  placeholder="Amount" 
                  className="bg-black/50 border-white/10"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <div className="flex gap-2">
                  {[100, 500, 1000, 5000].map(amt => (
                    <Button 
                      key={amt} 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 bg-white/5 border-white/10 text-xs"
                      onClick={() => setDepositAmount(amt.toString())}
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>
                <Button className="w-full bg-secondary" onClick={handleDeposit} disabled={isDepositing}>
                  {isDepositing ? "Processing..." : "Process Deposit"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" size="sm" onClick={handleWithdrawAll} disabled={isWithdrawing || store.balance <= 0} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Withdraw All
          </Button>
        </div>
      </div>

      <div className="flex-[2] flex flex-col gap-3">
        <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2 uppercase tracking-wider">
          <Search className="w-4 h-4 text-primary" /> Filter Games
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search games..." 
              className="pl-10 bg-black/20 border-white/10 focus-visible:ring-primary h-9 text-sm"
              value={store.searchQuery}
              onChange={(e) => store.setFilters({ search: e.target.value })}
            />
          </div>

          <Select value={store.gameTypeFilter} onValueChange={(val) => store.setFilters({ type: val })}>
            <SelectTrigger className="bg-black/20 border-white/10 h-9 text-sm">
              <SelectValue placeholder="Game Type" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10 text-white">
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="1">Live Casino</SelectItem>
              <SelectItem value="2">Slots</SelectItem>
              <SelectItem value="3">Mini Games</SelectItem>
              <SelectItem value="4">Fishing</SelectItem>
              <SelectItem value="6">Board Games</SelectItem>
            </SelectContent>
          </Select>

          <Select value={store.language} onValueChange={(val) => store.setFilters({ language: val })}>
            <SelectTrigger className="bg-black/20 border-white/10 h-9 text-sm">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10 text-white">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="th">Thai</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </div>
    </div>
  );
}
