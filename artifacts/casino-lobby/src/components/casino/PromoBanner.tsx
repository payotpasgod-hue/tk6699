import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BANNERS = [
  {
    id: 1,
    title: "Welcome Bonus",
    subtitle: "Get 100% on your first deposit",
    accent: "Up to ৳10,000",
    image: "/images/promo-welcome.png",
    gradient: "from-amber-900/80 to-transparent",
  },
  {
    id: 2,
    title: "VIP Rewards",
    subtitle: "Exclusive perks for loyal players",
    accent: "Join VIP Club",
    image: "/images/promo-vip.png",
    gradient: "from-amber-900/80 to-transparent",
  },
  {
    id: 3,
    title: "Slots Tournament",
    subtitle: "Compete for massive jackpots",
    accent: "৳500,000 Prize Pool",
    image: "/images/promo-slots.png",
    gradient: "from-purple-900/80 to-transparent",
  },
  {
    id: 4,
    title: "Daily Cashback",
    subtitle: "Get 5% back on every loss",
    accent: "No Limits",
    image: "/images/promo-cashback.png",
    gradient: "from-blue-900/80 to-transparent",
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
    <div className="relative w-full rounded-2xl overflow-hidden mb-5 aspect-[21/9] sm:aspect-[3/1]">
      {BANNERS.map((b, i) => (
        <div
          key={b.id}
          className={clsx(
            "absolute inset-0 transition-opacity duration-700",
            i === current ? "opacity-100" : "opacity-0"
          )}
        >
          <img
            src={b.image}
            alt={b.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${b.gradient}`} />
        </div>
      ))}

      <div className="absolute inset-0 flex items-center px-6 sm:px-10">
        <div className="relative z-10">
          <p className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider mb-1">
            {banner.subtitle}
          </p>
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-white mb-2 drop-shadow-lg">
            {banner.title}
          </h2>
          <p className="text-lg sm:text-2xl font-display font-bold text-amber-300 drop-shadow-lg">
            {banner.accent}
          </p>
        </div>
      </div>

      <button
        onClick={() => setCurrent((current - 1 + BANNERS.length) % BANNERS.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors z-20"
      >
        <ChevronLeft className="w-4 h-4 text-white" />
      </button>
      <button
        onClick={() => setCurrent((current + 1) % BANNERS.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors z-20"
      >
        <ChevronRight className="w-4 h-4 text-white" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={clsx(
              "h-1.5 rounded-full transition-all duration-300",
              i === current ? "w-6 bg-amber-400" : "w-1.5 bg-white/40"
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
