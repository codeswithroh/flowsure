import { create } from 'zustand';

interface User {
  addr: string | null;
  loggedIn: boolean;
}

interface WalletStore {
  user: User;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  user: {
    addr: null,
    loggedIn: false,
  },
  setUser: (user) => set({ user }),
  logout: () => set({ user: { addr: null, loggedIn: false } }),
}));
