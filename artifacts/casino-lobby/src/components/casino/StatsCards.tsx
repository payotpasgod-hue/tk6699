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
      title: "Providers Loaded",
      value: vendors.length.toString(),
      icon: Server,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "Total Games",
      value: games.length.toString(),
      icon: Gamepad2,
      color: "text-secondary",
      bg: "bg-secondary/10"
    },
    {
      title: "Active Balance",
      value: `$${balance.toFixed(2)}`,
      icon: Wallet,
      color: "text-accent",
      bg: "bg-accent/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="glass-panel p-6 rounded-2xl flex items-center gap-5"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg}`}>
            <stat.icon className={`w-7 h-7 ${stat.color}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-semibold mb-1 uppercase tracking-wider">{stat.title}</p>
            <h3 className="text-2xl font-display font-bold text-white">{stat.value}</h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
