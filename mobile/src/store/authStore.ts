import { create } from "zustand";
import { api } from "../api/client";
import { tokenStore } from "../api/tokenStore";
import type { User } from "../types/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { email: string; password: string; name: string; hostelId: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = await tokenStore.getAccessToken();
    if (token) {
      try {
        set({ user: await api.me() });
      } catch {
        await tokenStore.clear();
      }
    }
    set({ loading: false });
  },

  login: async (email, password) => {
    const res = await api.login({ email, password });
    await tokenStore.save(res.accessToken, res.refreshToken);
    set({ user: res.user });
  },

  signup: async (input) => {
    const res = await api.signup(input);
    await tokenStore.save(res.accessToken, res.refreshToken);
    set({ user: res.user });
  },

  logout: async () => {
    const refreshToken = await tokenStore.getRefreshToken();
    if (refreshToken) await api.logout(refreshToken).catch(() => {});
    await tokenStore.clear();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));

export function useAuth() {
  const { user, loading, login, signup, logout, setUser } = useAuthStore();
  return { user, loading, login, signup, logout, setUser };
}
