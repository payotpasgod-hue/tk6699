import { useState } from "react";
import { useLocation } from "wouter";
import { Phone, Lock, Eye, EyeOff, UserPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/use-auth-store";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      toast({ title: "Account Created!", description: `Welcome, ${data.user.displayName}` });
      setLocation("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-orange-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 mb-4">
            <span className="text-white font-display font-bold text-lg">TK</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">
            TK<span className="text-amber-400">6699</span>
          </h1>
          <p className="text-white/30 text-sm mt-2">Create your account</p>
        </div>

        <form onSubmit={handleRegister} className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl space-y-5">
          <div>
            <label className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2 block">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                type="text"
                placeholder="Your name"
                className="pl-10 bg-white/[0.03] border-white/5 h-11 focus-visible:ring-amber-500"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2 block">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                type="tel"
                placeholder="01XXXXXXXXX"
                className="pl-10 bg-white/[0.03] border-white/5 h-11 focus-visible:ring-amber-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2 block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                className="pl-10 pr-10 bg-white/[0.03] border-white/5 h-11 focus-visible:ring-amber-500"
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
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" /> Create Account
              </>
            )}
          </Button>

          <p className="text-center text-sm text-white/30">
            Already have an account?{" "}
            <button
              type="button"
              className="text-amber-400 hover:text-amber-300 font-semibold"
              onClick={() => setLocation("/login")}
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
