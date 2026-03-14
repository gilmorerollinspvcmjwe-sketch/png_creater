/**
 * 用户状态管理
 * 集成后端用户 API，支持登录、档案同步
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userApi } from '../services/api';

export interface UserData {
  id: string;
  nickname: string;
  avatar?: string;
  survivalDays: number;
}

interface UserState {
  // 用户信息
  user: UserData | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 认证 token
  token: string | null;
  
  // Actions
  anonymousLogin: () => Promise<boolean>;
  syncProfile: () => Promise<void>;
  updateProfile: (data: { nickname?: string; avatar?: string }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
      token: null,
      
      // Actions
      anonymousLogin: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await userApi.anonymousLogin({
            deviceId: localStorage.getItem('device_id') || undefined,
            platform: 'web',
          });
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            
            set({
              user: {
                id: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                survivalDays: user.survivalDays,
              },
              isLoggedIn: true,
              token,
              isLoading: false,
            });
            
            return true;
          } else {
            set({
              error: response.error?.message || '登录失败',
              isLoading: false,
            });
            return false;
          }
        } catch (error: any) {
          set({
            error: error.message || '登录异常',
            isLoading: false,
          });
          return false;
        }
      },
      
      syncProfile: async () => {
        const token = get().token;
        if (!token) {
          return;
        }
        
        try {
          const response = await userApi.getProfile();
          
          if (response.success && response.data) {
            const { user } = response.data;
            
            set({
              user: {
                id: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                survivalDays: user.survivalDays,
              },
            });
          }
        } catch (error) {
          console.error('同步用户档案失败:', error);
        }
      },
      
      updateProfile: async (data) => {
        try {
          const response = await userApi.updateProfile(data);
          
          if (response.success && response.data) {
            const { user } = response.data;
            
            set({
              user: {
                id: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                survivalDays: user.survivalDays,
              },
            });
            
            return true;
          } else {
            set({ error: response.error?.message || '更新失败' });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '更新异常' });
          return false;
        }
      },
      
      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          user: null,
          isLoggedIn: false,
          token: null,
          error: null,
        });
      },
      
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'iron-house-user',
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        token: state.token,
      }),
    }
  )
);
