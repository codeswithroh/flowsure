import { create } from 'zustand';

type FloState = 'idle' | 'froth' | 'dapper' | 'success' | 'retry' | 'compensated';

interface MascotStore {
  state: FloState;
  message?: string;
  setState: (state: FloState, message?: string) => void;
}

export const useMascotStore = create<MascotStore>((set) => ({
  state: 'idle',
  message: undefined,
  setState: (state, message) => set({ state, message }),
}));
