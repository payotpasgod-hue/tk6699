import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/casino/Navbar";
import { BottomNav } from "@/components/casino/BottomNav";
import { useAuthStore } from "@/store/use-auth-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import {
  Gift, Coins, Trophy, Percent, Star, Crown, Clock,
  Zap, Users, Calendar, ChevronRight, Sparkles, Target, Lock
} from "lucide-react";

const DAILY_REWARDS = [
  { day: 1, amount: 10 },
  { day: 2, amount: 20 },
  { day: 3, amount: 30 },
  { day: 4, amount: 50 },
  { day: 5, amount: 75 },
  { day: 6, amount: 100 },
  { day: 7, amount: 500, special: true },
];

const VIP_TIERS = [
  { name: "Bronze", icon: "\u{1F949}", min: 0, cashback: 1, bonus: 5 },
  { name: "Silver", icon: "\u{1F948}", min: 5000, cashback: 2, bonus: 10 },
  { name: "Gold", icon: "\u{1F947}", min: 25000, cashback: 3, bonus: 15 },
  { name: "Platinum", icon: "\u{1F48E}", min: 100000, cashback: 5, bonus: 20 },
  { name: "Diamond", icon: "\u{1F451}", min: 500000, cashback: 7, bonus: 30 },
];

interface ClaimedBonus {
  bonusType: string;
  bonusKey: string;
  amount: string;
  claimedAt: string;
}

export default function Bonus() {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"gifts" | "daily" | "vip" | "referral">("gifts");
  const [giftBoxes, setGiftBoxes] = useState<{ id: number; opened: boolean; amount: number | null }[]>([]);
  const [spinAngle, setSpinAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [claimedBonuses, setClaimedBonuses] = useState<ClaimedBonus[]>([]);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      const data = await apiRequest("/api/bonus/claims");
      if (data.success) {
        setClaimedBonuses(data.claims);
        initGiftBoxes(data.claims);
        initCooldown(data.claims);
      }
    } catch {
      initGiftBoxes([]);
    }
  };

  const initGiftBoxes = (claims: ClaimedBonus[]) => {
    const boxes = Array.from({ length: 9 }, (_, i) => {
      const claim = claims.find((c) => c.bonusType === "gift_box" && c.bonusKey === `box_${i}`);
      return {
        id: i,
        opened: !!claim,
        amount: claim ? Number(claim.amount) : null,
      };
    });
    setGiftBoxes(boxes);
  };

  const initCooldown = (claims: ClaimedBonus[]) => {
    const spinClaim = claims.find((c) => c.bonusType === "spin");
    if (spinClaim) {
      const elapsed = Date.now() - new Date(spinClaim.claimedAt).getTime();
      const remaining = Math.max(0, 3600 - Math.floor(elapsed / 1000));
      setCooldown(remaining);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isAlreadyClaimed = (type: string, key: string) => {
    return claimedBonuses.some((c) => c.bonusType === type && c.bonusKey === key);
  };

  const claimBonus = async (bonusType: string, bonusKey: string): Promise<{ success: boolean; amount?: number; newBalance?: number; message?: string }> => {
    setClaiming(true);
    try {
      const data = await apiRequest("/api/bonus/claim", {
        method: "POST",
        body: JSON.stringify({ bonusType, bonusKey }),
      });
      if (data.success) {
        updateUser({ balance: data.newBalance });
        setClaimedBonuses((prev) => [...prev, { bonusType, bonusKey, amount: String(data.amount), claimedAt: new Date().toISOString() }]);
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      setClaiming(false);
    }
  };

  const openGiftBox = useCallback(async (id: number) => {
    if (giftBoxes[id]?.opened || claiming) return;

    const result = await claimBonus("gift_box", `box_${id}`);
    if (result.success && result.amount) {
      setGiftBoxes((prev) =>
        prev.map((box) =>
          box.id === id ? { ...box, opened: true, amount: result.amount! } : box
        )
      );
      toast({
        title: `\u{1F381} You won \u09F3${result.amount}!`,
        description: `Balance: \u09F3${result.newBalance?.toFixed(2)}`,
      });
    } else {
      toast({ variant: "destructive", title: "Claim Failed", description: result.message || "Try again" });
    }
  }, [giftBoxes, claiming, toast]);

  const handleSpin = useCallback(async () => {
    if (isSpinning || cooldown > 0 || claiming) return;

    setIsSpinning(true);
    const result = await claimBonus("spin", `spin_${Date.now()}`);

    if (result.success && result.amount) {
      const prizes = [10, 25, 50, 100, 200, 500, 20, 75];
      const idx = prizes.indexOf(result.amount);
      const targetIdx = idx >= 0 ? idx : 0;
      const targetAngle = 360 * 5 + targetIdx * (360 / prizes.length);
      setSpinAngle(targetAngle);

      setTimeout(() => {
        setIsSpinning(false);
        setCooldown(3600);
        toast({
          title: `\u{1F3B0} Spin Result: \u09F3${result.amount}!`,
          description: `Balance: \u09F3${result.newBalance?.toFixed(2)}`,
        });
      }, 4000);
    } else {
      setIsSpinning(false);
      toast({ variant: "destructive", title: "Spin Failed", description: result.message || "Try again later" });
    }
  }, [isSpinning, cooldown, claiming, toast]);

  const handleDailyClaim = async (day: number) => {
    if (claiming) return;
    const key = `day_${day}`;
    if (isAlreadyClaimed("daily", key)) {
      toast({ variant: "destructive", title: "Already Claimed", description: `Day ${day} reward was already claimed` });
      return;
    }
    const result = await claimBonus("daily", key);
    if (result.success) {
      toast({
        title: `\u{1F4C5} Day ${day} Reward: \u09F3${result.amount}!`,
        description: `Balance: \u09F3${result.newBalance?.toFixed(2)}`,
      });
    } else {
      toast({ variant: "destructive", title: "Claim Failed", description: result.message || "Try again" });
    }
  };

  const handleHourlyClaim = async () => {
    if (claiming) return;
    const result = await claimBonus("hourly", `hourly_${Date.now()}`);
    if (result.success) {
      toast({
        title: `\u23F0 Hourly Bonus: \u09F3${result.amount}!`,
        description: `Balance: \u09F3${result.newBalance?.toFixed(2)}`,
      });
    } else {
      toast({ variant: "destructive", title: "Claim Failed", description: result.message || "Try again later" });
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const TABS = [
    { id: "gifts" as const, label: "Gift Box", icon: Gift },
    { id: "daily" as const, label: "Daily", icon: Calendar },
    { id: "vip" as const, label: "VIP", icon: Crown },
    { id: "referral" as const, label: "Referral", icon: Users },
  ];

  const nextUnclaimedDay = DAILY_REWARDS.find((r) => !isAlreadyClaimed("daily", `day_${r.day}`));

  return (
    <div className="min-h-screen bg-[#070b14] text-white pb-20 sm:pb-8">
      <Navbar />

      <main className="max-w-[800px] mx-auto px-3 sm:px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Bonus Center</h1>
            <p className="text-xs text-white/30">Claim your rewards & bonuses</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "gifts" && (
          <div className="space-y-6">
            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Mystery Gift Boxes
                </h2>
                <span className="text-xs text-amber-400/60">Tap to reveal</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {giftBoxes.map((box) => (
                  <button
                    key={box.id}
                    onClick={() => openGiftBox(box.id)}
                    disabled={box.opened || claiming}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-500 ${
                      box.opened
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-600/30 hover:scale-105 active:scale-95 cursor-pointer"
                    }`}
                  >
                    {box.opened ? (
                      <>
                        <Coins className="w-6 h-6 text-amber-400 mb-1" />
                        <span className="text-lg font-bold text-amber-400">{"\u09F3"}{box.amount}</span>
                      </>
                    ) : (
                      <>
                        <Gift className="w-8 h-8 text-amber-400/80 mb-1" />
                        <span className="text-[10px] text-amber-400/40">TAP</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Lucky Spin
                </h2>
                {cooldown > 0 && (
                  <span className="flex items-center gap-1 text-xs text-white/30">
                    <Clock className="w-3 h-3" />
                    {formatTime(cooldown)}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-56 h-56 mb-4">
                  <div
                    className="w-full h-full rounded-full border-4 border-amber-500/30 overflow-hidden transition-transform ease-out"
                    style={{
                      transform: `rotate(${spinAngle}deg)`,
                      transitionDuration: isSpinning ? "4s" : "0s",
                    }}
                  >
                    {[10, 25, 50, 100, 200, 500, 20, 75].map((prize, i) => {
                      const angle = i * 45;
                      const colors = [
                        "from-amber-500 to-amber-600",
                        "from-emerald-500 to-emerald-600",
                        "from-blue-500 to-blue-600",
                        "from-purple-500 to-purple-600",
                        "from-rose-500 to-rose-600",
                        "from-yellow-400 to-yellow-500",
                        "from-teal-500 to-teal-600",
                        "from-orange-500 to-orange-600",
                      ];
                      return (
                        <div
                          key={i}
                          className={`absolute inset-0 bg-gradient-to-r ${colors[i]}`}
                          style={{
                            clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos(((angle - 22.5) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((angle - 22.5) * Math.PI) / 180)}%, ${50 + 50 * Math.cos(((angle + 22.5) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((angle + 22.5) * Math.PI) / 180)}%)`,
                          }}
                        >
                          <span
                            className="absolute text-[10px] font-bold text-white drop-shadow"
                            style={{
                              left: `${50 + 30 * Math.cos((angle * Math.PI) / 180)}%`,
                              top: `${50 + 30 * Math.sin((angle * Math.PI) / 180)}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            {"\u09F3"}{prize}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-amber-400 z-10" />
                </div>

                <button
                  onClick={handleSpin}
                  disabled={isSpinning || cooldown > 0 || claiming}
                  className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
                    isSpinning || cooldown > 0 || claiming
                      ? "bg-white/5 text-white/20 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20"
                  }`}
                >
                  {isSpinning ? "Spinning..." : cooldown > 0 ? `Next spin in ${formatTime(cooldown)}` : "SPIN NOW"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4 hover:border-amber-500/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3">
                  <Percent className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Deposit Bonus</h3>
                <p className="text-[11px] text-white/30 mb-2">100% match on first deposit</p>
                <p className="text-xs font-bold text-amber-400">Up to {"\u09F3"}10,000</p>
              </div>
              <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4 hover:border-emerald-500/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Daily Cashback</h3>
                <p className="text-[11px] text-white/30 mb-2">5% back on every loss</p>
                <p className="text-xs font-bold text-emerald-400">No Limits</p>
              </div>
              <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4 hover:border-blue-500/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-3">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Weekly Tournament</h3>
                <p className="text-[11px] text-white/30 mb-2">Compete for big prizes</p>
                <p className="text-xs font-bold text-blue-400">{"\u09F3"}500,000 Pool</p>
              </div>
              <div className="bg-[#111827]/80 border border-white/5 rounded-xl p-4 hover:border-purple-500/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Reload Bonus</h3>
                <p className="text-[11px] text-white/30 mb-2">50% on every reload</p>
                <p className="text-xs font-bold text-purple-400">Up to {"\u09F3"}5,000</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "daily" && (
          <div className="space-y-4">
            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                Daily Login Rewards
              </h2>
              <p className="text-xs text-white/30 mb-4">Log in every day to claim increasing rewards!</p>

              <div className="grid grid-cols-7 gap-2">
                {DAILY_REWARDS.map((reward) => {
                  const claimed = isAlreadyClaimed("daily", `day_${reward.day}`);
                  const isNext = nextUnclaimedDay?.day === reward.day;
                  return (
                    <button
                      key={reward.day}
                      onClick={() => isNext && handleDailyClaim(reward.day)}
                      disabled={claimed || !isNext || claiming}
                      className={`relative flex flex-col items-center p-2 rounded-xl border transition-all ${
                        claimed
                          ? "bg-amber-500/10 border-amber-500/20"
                          : isNext
                            ? "bg-amber-500/20 border-amber-500/40 ring-2 ring-amber-500/30 animate-pulse cursor-pointer"
                            : "bg-white/[0.02] border-white/5 opacity-50"
                      }`}
                    >
                      <span className="text-[10px] text-white/30 mb-1">Day {reward.day}</span>
                      {reward.special ? (
                        <Crown className="w-5 h-5 text-amber-400 mb-1" />
                      ) : (
                        <Coins className="w-4 h-4 text-amber-400/60 mb-1" />
                      )}
                      <span className={`text-xs font-bold ${claimed ? "text-amber-400" : "text-white/50"}`}>
                        {"\u09F3"}{reward.amount}
                      </span>
                      {claimed && (
                        <span className="text-[8px] text-emerald-400 mt-0.5">{"\u2713"}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {nextUnclaimedDay && (
                <button
                  onClick={() => handleDailyClaim(nextUnclaimedDay.day)}
                  disabled={claiming}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50"
                >
                  {claiming ? "Claiming..." : `Claim Day ${nextUnclaimedDay.day} Reward \u2014 \u09F3${nextUnclaimedDay.amount}`}
                </button>
              )}
              {!nextUnclaimedDay && (
                <div className="w-full mt-4 py-3 rounded-xl bg-white/5 text-white/30 font-bold text-sm text-center">
                  All daily rewards claimed!
                </div>
              )}
            </div>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Hourly Bonus
              </h2>
              <p className="text-xs text-white/30 mb-4">Claim a random bonus every hour!</p>

              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div>
                  <p className="text-sm font-bold text-white">Random {"\u09F3"}5 {"\u2014"} {"\u09F3"}100</p>
                  <p className="text-xs text-white/30 mt-1">Claim once per hour</p>
                </div>
                <button
                  onClick={handleHourlyClaim}
                  disabled={claiming}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-sm hover:from-blue-400 hover:to-indigo-400 transition-all disabled:opacity-50"
                >
                  {claiming ? "..." : "Claim"}
                </button>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Missions
              </h2>
              <div className="space-y-3">
                {[
                  { title: "Play 10 games today", progress: 3, total: 10, reward: 50, icon: Zap },
                  { title: "Win 5 rounds", progress: 2, total: 5, reward: 100, icon: Trophy },
                  { title: "Try 3 new providers", progress: 1, total: 3, reward: 75, icon: Star },
                ].map((mission, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <mission.icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{mission.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                            style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/30">{mission.progress}/{mission.total}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400 flex-shrink-0">{"\u09F3"}{mission.reward}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "vip" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{"\u{1F949}"}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">Bronze Member</h2>
                  <p className="text-xs text-white/30">Total wagered: {"\u09F3"}0 / {"\u09F3"}5,000 to Silver</p>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            <div className="space-y-3">
              {VIP_TIERS.map((tier, i) => (
                <div
                  key={tier.name}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    i === 0
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-white/[0.02] border-white/5"
                  }`}
                >
                  <span className="text-2xl">{tier.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{tier.name}</h3>
                    <p className="text-[11px] text-white/30">
                      Wager {"\u09F3"}{tier.min.toLocaleString()}+
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-400">{tier.cashback}% Cashback</p>
                    <p className="text-[10px] text-white/30">{tier.bonus}% Deposit Bonus</p>
                  </div>
                  {i > 0 && <Lock className="w-4 h-4 text-white/10" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "referral" && (
          <div className="space-y-4">
            <div className="bg-[#111827]/80 border border-white/5 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Invite Friends & Earn
              </h2>
              <p className="text-xs text-white/30 mb-4">
                Share your referral code and earn {"\u09F3"}200 for every friend who signs up and makes a deposit!
              </p>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-xs text-white/30 mb-1">Your Referral Code</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-amber-400 tracking-wider">
                    {user?.userCode?.toUpperCase() || "TK6699REF"}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user?.userCode || "TK6699REF");
                      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center bg-white/[0.02] rounded-xl p-3 border border-white/5">
                  <p className="text-xl font-bold text-amber-400">0</p>
                  <p className="text-[10px] text-white/30">Friends Invited</p>
                </div>
                <div className="text-center bg-white/[0.02] rounded-xl p-3 border border-white/5">
                  <p className="text-xl font-bold text-emerald-400">{"\u09F3"}0</p>
                  <p className="text-[10px] text-white/30">Total Earned</p>
                </div>
                <div className="text-center bg-white/[0.02] rounded-xl p-3 border border-white/5">
                  <p className="text-xl font-bold text-blue-400">{"\u09F3"}200</p>
                  <p className="text-[10px] text-white/30">Per Referral</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white/60">How it works</h3>
                {[
                  { step: 1, text: "Share your referral code with friends" },
                  { step: 2, text: "They sign up using your code" },
                  { step: 3, text: "They make their first deposit" },
                  { step: 4, text: "You both get {}\u09F3200 bonus!" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 bg-white/[0.02] rounded-xl p-3 border border-white/5">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {item.step}
                    </span>
                    <span className="text-sm text-white/60">{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  const shareText = `Join TK6699 Casino with my code ${user?.userCode?.toUpperCase() || "TK6699REF"} and get \u09F3200 bonus!`;
                  if (navigator.share) {
                    navigator.share({ title: "TK6699 Casino", text: shareText });
                  } else {
                    navigator.clipboard.writeText(shareText);
                    toast({ title: "Copied!", description: "Share message copied to clipboard" });
                  }
                }}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Share & Invite Friends
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
