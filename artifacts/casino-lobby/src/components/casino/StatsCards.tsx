import { motion } from "framer-motion";
import { Server, Gamepad2, Activity, Wallet } from "lucide-react";
import { useLobbyStore } from "@/store/use-lobby-store";

export function StatsCards() {
  const { vendors, games, balance, isConnected } = useLobbyStore();

  const stats = [
    {
      title: "API Status",
      value: isConnected ? "Connected" : "Offline",
      icon: Activity,
      color: isConnected ? "text-green-400" : "text-destructive",
      bg: isConnected ? "bg-green-400/10" : "bg-destructive/10"
    },
    {
      title: "Providers",
      value: vendors.length.toString(),
      icon: Server,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "Games",
      value: games.length.toLocaleString(),
      icon: Gamepad2,
      color: "text-secondary",
      bg: "bg-secondary/10"
    },
    {
      title: "Balance",
      value: `$${balance.toFixed(2)}`,
      icon: Wallet,
      color: "text-accent",
      bg: "bg-accent/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="glass-panel p-4 rounded-xl flex items-center gap-4"
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.title}</p>
            <h3 className="text-lg font-display font-bold text-white truncate">{stat.value}</h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
