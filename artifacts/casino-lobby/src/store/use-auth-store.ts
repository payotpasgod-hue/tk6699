import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: number;
  phone: string;
  displayName: string;
  balance: number;
  currency: string;
  role: string;
  userCode: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
      logout: () => set({ token: null, user: null }),
      isLoggedIn: () => !!get().token && !!get().user,
      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "tk6699-auth",
    }
  )
);
