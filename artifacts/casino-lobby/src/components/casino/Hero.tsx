import { motion } from "framer-motion";
import { Play, Layers, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero({ onLoadGames }: { onLoadGames: () => void }) {
  return (
    <div className="relative w-full py-20 lg:py-32 overflow-hidden flex items-center justify-center rounded-3xl mb-8 border border-white/10 shadow-2xl">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Luxury Casino Background" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>

      {/* Floating Elements (CSS Only) */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 blur-[60px] rounded-full mix-blend-screen" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full mix-blend-screen" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Live API Connected</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
            Next Generation <br/>
            <span className="text-gradient">Gaming Experience</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 font-medium">
            Immersive casino lobby testing environment. Seamlessly launch games, manage operator balances, and validate provider integrations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={onLoadGames}
              className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white text-lg font-bold rounded-xl shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all hover:-translate-y-1"
            >
              <Play className="w-5 h-5 mr-2" />
              Load All Games
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 bg-white/5 border-white/20 hover:bg-white/10 text-white text-lg font-bold rounded-xl backdrop-blur-sm"
              onClick={() => document.getElementById('providers-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Layers className="w-5 h-5 mr-2" />
              Browse Providers
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
