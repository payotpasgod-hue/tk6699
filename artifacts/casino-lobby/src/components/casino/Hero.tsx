import { motion } from "framer-motion";
import { Play, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onLoadGames: () => void;
  cacheTimestamp: number | null;
}

export function Hero({ onLoadGames, cacheTimestamp }: HeroProps) {
  return (
    <div className="relative w-full py-16 lg:py-24 overflow-hidden flex items-center justify-center rounded-3xl mb-6 border border-white/10 shadow-2xl">
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </div>

      <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 blur-[60px] rounded-full mix-blend-screen" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-secondary/20 blur-[80px] rounded-full mix-blend-screen" />

      <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-4 leading-[1.1]">
            Premium <br />
            <span className="text-gradient">Casino Games</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mb-8 font-medium max-w-xl mx-auto">
            Play the best slots, live casino, fishing, and board games from top providers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={onLoadGames}
              className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white text-base font-bold rounded-xl shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 mr-2" />
              {cacheTimestamp ? "Browse Games" : "Load Games"}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 bg-white/5 border-white/20 hover:bg-white/10 text-white text-base font-bold rounded-xl backdrop-blur-sm"
              onClick={() =>
                document.getElementById("providers-section")?.scrollIntoView({ behavior: "smooth" })
              }
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
