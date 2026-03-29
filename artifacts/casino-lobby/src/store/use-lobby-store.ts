import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Game, Vendor } from "@workspace/api-client-react";

interface LobbyState {
  vendors: Vendor[];
  games: Game[];
  setVendors: (vendors: Vendor[]) => void;
  setGames: (games: Game[]) => void;
  addGames: (games: Game[]) => void;

  searchQuery: string;
  selectedVendorCode: string;
  gameTypeFilter: string;
  language: string;
  setFilters: (filters: { search?: string; vendor?: string; type?: string; language?: string }) => void;

  launchedGameUrl: string | null;
  launchedGameInfo: Game | null;
  launchGame: (url: string, game: Game) => void;
  closeGame: () => void;

  cacheTimestamp: number | null;
  setCacheTimestamp: (ts: number | null) => void;

  gamesPage: number;
  setGamesPage: (page: number) => void;
}

export const useLobbyStore = create<LobbyState>()(
  persist(
    (set) => ({
      vendors: [],
      games: [],
      setVendors: (vendors) => set({ vendors }),
      setGames: (games) => set({ games, gamesPage: 1 }),
      addGames: (newGames) => set((state) => {
        const existingKeys = new Set(state.games.map(g => `${g.vendorCode}::${g.gameCode}`));
        const filtered: Game[] = [];
        for (const g of newGames) {
          const key = `${g.vendorCode}::${g.gameCode}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            filtered.push(g);
          }
        }
        return { games: [...state.games, ...filtered] };
      }),

      searchQuery: "",
      selectedVendorCode: "ALL",
      gameTypeFilter: "ALL",
      language: "en",
      setFilters: (filters) => set((state) => ({
        searchQuery: filters.search ?? state.searchQuery,
        selectedVendorCode: filters.vendor ?? state.selectedVendorCode,
        gameTypeFilter: filters.type ?? state.gameTypeFilter,
        language: filters.language ?? state.language,
        gamesPage: 1,
      })),

      launchedGameUrl: null,
      launchedGameInfo: null,
      launchGame: (url, game) => set({ launchedGameUrl: url, launchedGameInfo: game }),
      closeGame: () => set({ launchedGameUrl: null, launchedGameInfo: null }),

      cacheTimestamp: null,
      setCacheTimestamp: (ts) => set({ cacheTimestamp: ts }),

      gamesPage: 1,
      setGamesPage: (page) => set({ gamesPage: page }),
    }),
    {
      name: "tk6699-lobby",
      partialize: (state) => ({
        language: state.language,
      }),
    }
  )
);
