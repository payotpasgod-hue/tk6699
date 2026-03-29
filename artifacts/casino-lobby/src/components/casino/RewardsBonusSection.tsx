import { Gift, Coins, Trophy, Percent, Star, Crown } from "lucide-react";

const REWARDS = [
  {
    icon: Gift,
    title: "Daily Login Bonus",
    description: "Claim free rewards every day",
    value: "Up to ৳500",
    color: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/20",
  },
  {
    icon: Coins,
    title: "Deposit Bonus",
    description: "100% match on first deposit",
    value: "Up to ৳10,000",
    color: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/20",
  },
  {
    icon: Percent,
    title: "Cashback",
    description: "5% daily cashback on losses",
    value: "No Limits",
    color: "from-blue-500 to-indigo-500",
    glow: "shadow-blue-500/20",
  },
  {
    icon: Trophy,
    title: "VIP Program",
    description: "Exclusive perks for top players",
    value: "7 Tiers",
    color: "from-purple-500 to-pink-500",
    glow: "shadow-purple-500/20",
  },
  {
    icon: Star,
    title: "Referral Bonus",
    description: "Earn ৳200 per referral",
    value: "Unlimited",
    color: "from-rose-500 to-red-500",
    glow: "shadow-rose-500/20",
  },
  {
    icon: Crown,
    title: "Weekly Tournament",
    description: "Compete for the top prize pool",
    value: "৳500,000",
    color: "from-yellow-500 to-amber-500",
    glow: "shadow-yellow-500/20",
  },
];

export function RewardsBonusSection() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4 px-1">
        <img src="/images/rewards-icon.png" alt="Rewards" className="w-6 h-6 object-contain" />
        <h3 className="text-base font-display font-bold text-white">Rewards</h3>
        <span className="text-white/20 mx-1">&</span>
        <img src="/images/bonus-icon.png" alt="Bonus" className="w-6 h-6 object-contain" />
        <h3 className="text-base font-display font-bold text-white">Bonuses</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {REWARDS.map((reward) => {
          const Icon = reward.icon;
          return (
            <div
              key={reward.title}
              className={`group relative bg-[#111827]/80 border border-white/5 rounded-xl p-4 hover:border-amber-500/20 transition-all duration-300 cursor-pointer overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${reward.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${reward.color} flex items-center justify-center mb-3 shadow-lg ${reward.glow}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              <h4 className="text-sm font-bold text-white mb-1">{reward.title}</h4>
              <p className="text-[11px] text-white/30 mb-2 leading-snug">{reward.description}</p>
              <p className="text-xs font-bold text-amber-400">{reward.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
