import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BANNERS = [
  {
    id: 1,
    title: "Welcome Bonus",
    subtitle: "Get 100% on your first deposit",
    accent: "Up to ৳10,000",
    gradient: "from-amber-600 via-orange-600 to-red-600",
    pattern: "radial-gradient(circle at 80% 50%, rgba(255,200,0,0.15), transparent 50%)",
  },
  {
    id: 2,
    title: "Live Casino",
    subtitle: "Play with real dealers in HD",
    accent: "24/7 Live Tables",
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    pattern: "radial-gradient(circle at 20% 50%, rgba(0,255,200,0.1), transparent 50%)",
  },
  {
    id: 3,
    title: "Slots Tournament",
    subtitle: "Compete for massive jackpots",
    accent: "৳500,000 Prize Pool",
    gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    pattern: "radial-gradient(circle at 70% 30%, rgba(200,0,255,0.15), transparent 50%)",
  },
  {
    id: 4,
    title: "Daily Cashback",
    subtitle: "Get 5% back on every loss",
    accent: "No Limits",
    gradient: "from-blue-600 via-indigo-600 to-violet-600",
    pattern: "radial-gradient(circle at 30% 70%, rgba(0,100,255,0.15), transparent 50%)",
  },
];

export function PromoBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[current];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-5">
      <div
        className={`relative bg-gradient-to-r ${banner.gradient} py-8 sm:py-12 px-6 sm:px-10 transition-all duration-500`}
        style={{ backgroundImage: banner.pattern }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)"
          }} />
        </div>

        <div className="relative z-10">
          <p className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-wider mb-1">{banner.subtitle}</p>
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-white mb-2">{banner.title}</h2>
          <p className="text-lg sm:text-2xl font-display font-bold text-amber-300">{banner.accent}</p>
        </div>

        <button
          onClick={() => setCurrent((current - 1 + BANNERS.length) % BANNERS.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={() => setCurrent((current + 1) % BANNERS.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={clsx(
              "h-1.5 rounded-full transition-all duration-300",
              i === current ? "w-6 bg-white" : "w-1.5 bg-white/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function clsx(...args: (string | boolean | undefined)[]) {
  return args.filter(Boolean).join(" ");
}
