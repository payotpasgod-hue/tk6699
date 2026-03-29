import { useState, useEffect } from "react";
import { Link2, Key, Server, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLobbyStore } from "@/store/use-lobby-store";
import { useCreateToken } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function ConfigPanel({ hasEnvCredentials }: { hasEnvCredentials?: boolean }) {
  const store = useLobbyStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(!store.isConnected && !hasEnvCredentials);
  const { mutateAsync: createToken, isPending } = useCreateToken();

  // If backend has credentials, we don't strictly need them in the form, 
  // but we still trigger connection to establish the token session.
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
    // Auto-connect if environment has credentials and we haven't yet
    if (hasEnvCredentials && !store.isConnected) {
      handleConnect();
    }
  }, [hasEnvCredentials]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-8">
      <div className="glass-panel p-1 rounded-2xl">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-white/5 rounded-xl transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${store.isConnected ? 'bg-green-400/20' : 'bg-primary/20'}`}>
              {store.isConnected ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Link2 className="w-5 h-5 text-primary" />}
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold font-display">API Configuration</h3>
              <p className="text-xs text-muted-foreground">
                {store.isConnected ? "Connected to OroPlay Node" : "Requires authentication to load providers"}
              </p>
            </div>
          </div>
          {hasEnvCredentials && !store.isConnected && (
            <Badge variant="outline" className="border-accent text-accent mr-4">Credentials via ENV</Badge>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="px-5 pb-5 pt-2">
          <div className="bg-black/20 rounded-xl p-5 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <Server className="w-3 h-3" /> API Endpoint (Optional)
              </label>
              <Input 
                placeholder="https://api.oroplay.com" 
                className="bg-black/50 border-white/10 focus-visible:ring-primary"
                value={store.apiEndpoint}
                onChange={(e) => store.setApiConfig({ apiEndpoint: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <Key className="w-3 h-3" /> Client ID
              </label>
              <Input 
                placeholder={hasEnvCredentials ? "Using server environment" : "Enter Client ID"} 
                className="bg-black/50 border-white/10 focus-visible:ring-primary"
                value={store.clientId}
                onChange={(e) => store.setApiConfig({ clientId: e.target.value })}
                disabled={hasEnvCredentials}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> Client Secret
              </label>
              <Input 
                type="password"
                placeholder={hasEnvCredentials ? "Using server environment" : "Enter Client Secret"} 
                className="bg-black/50 border-white/10 focus-visible:ring-primary"
                value={store.clientSecret}
                onChange={(e) => store.setApiConfig({ clientSecret: e.target.value })}
                disabled={hasEnvCredentials}
              />
            </div>
            
            <div className="md:col-span-3 flex justify-end mt-2">
              <Button 
                onClick={handleConnect} 
                disabled={isPending || (!hasEnvCredentials && (!store.clientId || !store.clientSecret))}
                className="bg-primary hover:bg-primary/90 min-w-[150px]"
              >
                {isPending ? "Connecting..." : store.isConnected ? "Reconnect" : "Connect API"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Inline badge component
function Badge({ children, className, variant = "default" }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  )
}
