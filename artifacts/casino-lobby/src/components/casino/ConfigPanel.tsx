import { useState, useEffect } from "react";
import { Link2, Key, Server, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useCreateToken } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function ConfigPanel({ hasEnvCredentials }: { hasEnvCredentials?: boolean }) {
  const store = useLobbyStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(!store.isConnected && !hasEnvCredentials);
  const { mutateAsync: createToken, isPending } = useCreateToken();

  const handleConnect = async () => {
    try {
      const res = await createToken({ 
        data: { 
          clientId: store.clientId || "env", 
          clientSecret: store.clientSecret || "env",
          apiEndpoint: store.apiEndpoint || undefined
        } 
      });
      
      if (res.success) {
        store.setIsConnected(true);
        setIsOpen(false);
        toast({ title: "Connected", description: "Successfully authenticated with OroPlay API." });
      } else {
        throw new Error(res.message || "Failed to authenticate");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Connection Error", description: err.message || "Check your credentials." });
      store.setIsConnected(false);
    }
  };

  useEffect(() => {
    if (hasEnvCredentials && !store.isConnected) {
      handleConnect();
    }
  }, [hasEnvCredentials]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <div className="glass-panel p-1 rounded-xl">
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-white/5 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${store.isConnected ? 'bg-green-400/20' : 'bg-primary/20'}`}>
              {store.isConnected ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4 text-primary" />}
            </div>
            <div className="text-left">
              <h3 className="text-white text-sm font-semibold font-display">API Configuration</h3>
              <p className="text-[10px] text-muted-foreground">
                {store.isConnected ? "Connected to OroPlay Node" : "Requires authentication"}
              </p>
            </div>
          </div>
          {hasEnvCredentials && !store.isConnected && (
            <Badge variant="outline" className="border-accent/30 text-accent text-[10px] mr-4">ENV</Badge>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4 pt-1">
          <div className="bg-black/20 rounded-lg p-4 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-3">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Server className="w-3 h-3" /> Endpoint
              </label>
              <Input 
                placeholder="https://api.oroplay.com" 
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-8 text-sm"
                value={store.apiEndpoint}
                onChange={(e) => store.setApiConfig({ apiEndpoint: e.target.value })}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Key className="w-3 h-3" /> Client ID
              </label>
              <Input 
                placeholder={hasEnvCredentials ? "Using server env" : "Client ID"} 
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-8 text-sm"
                value={store.clientId}
                onChange={(e) => store.setApiConfig({ clientId: e.target.value })}
                disabled={hasEnvCredentials}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> Secret
              </label>
              <Input 
                type="password"
                placeholder={hasEnvCredentials ? "Using server env" : "Client Secret"} 
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-8 text-sm"
                value={store.clientSecret}
                onChange={(e) => store.setApiConfig({ clientSecret: e.target.value })}
                disabled={hasEnvCredentials}
              />
            </div>
            
            <div className="md:col-span-3 flex justify-end mt-1">
              <Button 
                size="sm"
                onClick={handleConnect} 
                disabled={isPending || (!hasEnvCredentials && (!store.clientId || !store.clientSecret))}
                className="bg-primary hover:bg-primary/90 min-w-[120px] text-xs"
              >
                {isPending ? "Connecting..." : store.isConnected ? "Reconnect" : "Connect"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
