import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Game, Vendor } from "@workspace/api-client-react";

interface LobbyState {
  // API & Auth
  apiEndpoint: string;
  clientId: string;
  clientSecret: string;
  isConnected: boolean;
  setApiConfig: (config: { apiEndpoint?: string; clientId?: string; clientSecret?: string }) => void;
  setIsConnected: (status: boolean) => void;

  // Player Session
  playerCode: string;
  balance: number;
  currency: string;
  setPlayerSession: (session: { playerCode?: string; balance?: number; currency?: string }) => void;

  // Lobby Data
  vendors: Vendor[];
  games: Game[];
  setVendors: (vendors: Vendor[]) => void;
  setGames: (games: Game[]) => void;
  addGames: (games: Game[]) => void;

  // Filters & Search
  searchQuery: string;
  selectedVendorCode: string;
  gameTypeFilter: string; // "ALL", "1" (Live), "2" (Slot), "3" (Mini)
  language: string;
  setFilters: (filters: { search?: string; vendor?: string; type?: string; language?: string }) => void;

  // Launch State
  launchedGameUrl: string | null;
  launchedGameInfo: Game | null;
  launchGame: (url: string, game: Game) => void;
  closeGame: () => void;
}

export const useLobbyStore = create<LobbyState>()(
  persist(
    (set) => ({
      apiEndpoint: "",
      clientId: "",
      clientSecret: "",
      isConnected: false,
      setApiConfig: (config) => set((state) => ({ ...state, ...config })),
      setIsConnected: (status) => set({ isConnected: status }),

      playerCode: "test_player_001",
      balance: 0,
      currency: "USD",
      setPlayerSession: (session) => set((state) => ({ ...state, ...session })),

      vendors: [],
      games: [],
      setVendors: (vendors) => set({ vendors }),
      setGames: (games) => set({ games }),
      addGames: (newGames) => set((state) => {
        // Avoid duplicates by gameCode
        const existingCodes = new Set(state.games.map(g => g.gameCode));
        const filteredNew = newGames.filter(g => !existingCodes.has(g.gameCode));
        return { games: [...state.games, ...filteredNew] };
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
      })),

      launchedGameUrl: null,
      launchedGameInfo: null,
      launchGame: (url, game) => set({ launchedGameUrl: url, launchedGameInfo: game }),
      closeGame: () => set({ launchedGameUrl: null, launchedGameInfo: null }),
    }),
    {
      name: "casino-lobby-storage",
      partialize: (state) => ({ 
        apiEndpoint: state.apiEndpoint, 
        clientId: state.clientId,
        playerCode: state.playerCode,
        language: state.language
      }), // Don't persist secret, games, or launch state
    }
  )
);
