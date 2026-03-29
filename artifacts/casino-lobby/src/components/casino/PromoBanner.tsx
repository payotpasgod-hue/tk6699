import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BANNERS = [
  { id: 1, image: "/images/promo-welcome.png", alt: "Welcome Bonus" },
  { id: 2, image: "/images/promo-vip.png", alt: "VIP Rewards" },
  { id: 3, image: "/images/promo-slots.png", alt: "Slots Tournament" },
  { id: 4, image: "/images/promo-cashback.png", alt: "Daily Cashback" },
];

export function PromoBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
            alt={b.alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      ))}

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
