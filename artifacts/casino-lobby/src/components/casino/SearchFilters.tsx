import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLobbyStore } from "@/store/use-lobby-store";

export function SearchFilters() {
  const store = useLobbyStore();

  return (
    <div className="glass-panel p-4 rounded-2xl mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search games..."
            className="pl-10 bg-black/20 border-white/10 focus-visible:ring-primary h-10 text-sm"
            value={store.searchQuery}
            onChange={(e) => store.setFilters({ search: e.target.value })}
          />
        </div>

        <Select value={store.gameTypeFilter} onValueChange={(val) => store.setFilters({ type: val })}>
          <SelectTrigger className="bg-black/20 border-white/10 h-10 text-sm">
            <SelectValue placeholder="Game Type" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10 text-white">
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="1">Live Casino</SelectItem>
            <SelectItem value="2">Slots</SelectItem>
            <SelectItem value="3">Mini Games</SelectItem>
            <SelectItem value="4">Fishing</SelectItem>
            <SelectItem value="6">Board Games</SelectItem>
          </SelectContent>
        </Select>

        <Select value={store.language} onValueChange={(val) => store.setFilters({ language: val })}>
          <SelectTrigger className="bg-black/20 border-white/10 h-10 text-sm">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10 text-white">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="bn">Bangla</SelectItem>
            <SelectItem value="hi">Hindi</SelectItem>
            <SelectItem value="th">Thai</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
