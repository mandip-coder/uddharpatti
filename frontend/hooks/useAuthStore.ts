import { create } from 'zustand';
import { User, AuthResponse } from '../types';
import api from '../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: AuthResponse) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateAvatar: (avatarId: string) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: true,

  login: (data: AuthResponse) => {
    localStorage.setItem('token', data.token);
    set({
      user: {
        id: data._id,
        username: data.username,
        email: data.email,
        walletBalance: data.walletBalance,
        avatarId: data.avatarId,
        friends: [], // API doesn't always return friends in login response strictly? AuthController says it does.
        // We'll trust data.friends if present, else empty
        stats: data.stats,
        debtSummary: data.debtSummary,
        createdAt: data.createdAt || new Date().toISOString()
      },
      token: data.token,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      // Use /users/me for full profile details including stats/debt
      const res = await api.get('/users/me');
      const userData = res.data;

      set({
        user: {
          id: userData._id,
          username: userData.username,
          email: userData.email,
          walletBalance: userData.walletBalance,
          avatarId: userData.avatarId,
          friends: userData.friends || [],
          stats: userData.stats,
          debtSummary: userData.debtSummary,
          createdAt: userData.createdAt,
          joinedAt: userData.createdAt // Map backend createdAt to frontend joinedAt
        },
        token,
        isLoading: false
      });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  updateAvatar: (avatarId: string) => {
    set((state) => ({
      user: state.user ? { ...state.user, avatarId } : null
    }));
  },

  updateUser: (updates: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null
    }));
  }
}));
