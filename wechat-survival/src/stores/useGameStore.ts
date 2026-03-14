/**
 * 游戏全局状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Notification, GameConfig } from '../types/game';
import { INITIAL_GAME_CONFIG } from '../constants/config';

interface GameState {
  // 用户信息
  user: User | null;
  isLoggedIn: boolean;
  
  // 游戏进度
  survivalDays: number;
  lastLoginTime: number;
  
  // UI 状态
  currentTab: 'wechat' | 'contacts' | 'discover' | 'me';
  isCamouflage: boolean;
  
  // 通知
  notifications: Notification[];
  
  // 配置
  config: GameConfig;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  setSurvivalDays: (days: number) => void;
  updateLastLoginTime: () => void;
  switchTab: (tab: 'wechat' | 'contacts' | 'discover' | 'me') => void;
  toggleCamouflage: () => void;
  setCamouflage: (enabled: boolean) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  updateConfig: (config: Partial<GameConfig>) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      isLoggedIn: false,
      survivalDays: 0,
      lastLoginTime: Date.now(),
      currentTab: 'wechat',
      isCamouflage: false,
      notifications: [],
      config: INITIAL_GAME_CONFIG,
      
      // Actions
      login: (user) => set({ user, isLoggedIn: true }),
      
      logout: () => set({ user: null, isLoggedIn: false }),
      
      setSurvivalDays: (days) => set({ survivalDays: days }),
      
      updateLastLoginTime: () => set({ lastLoginTime: Date.now() }),
      
      switchTab: (tab) => set({ currentTab: tab }),
      
      toggleCamouflage: () => set((state) => ({ isCamouflage: !state.isCamouflage })),
      
      setCamouflage: (enabled) => set({ isCamouflage: enabled }),
      
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, 100), // 最多保留 100 条
      })),
      
      markNotificationRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, unread: false } : n
        ),
      })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      updateConfig: (config) => set((state) => ({
        config: { ...state.config, ...config },
      })),
      
      resetGame: () => set({
        user: null,
        isLoggedIn: false,
        survivalDays: 0,
        lastLoginTime: Date.now(),
        currentTab: 'wechat',
        isCamouflage: false,
        notifications: [],
        config: INITIAL_GAME_CONFIG,
      }),
    }),
    {
      name: 'iron-house-game',
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        survivalDays: state.survivalDays,
        lastLoginTime: state.lastLoginTime,
        config: state.config,
      }),
    }
  )
);
