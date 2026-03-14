/**
 * 拾荒状态管理
 * 集成后端玩法模块 API
 */

import { create } from 'zustand';
import type { ScavengingTeamResponse, ScavengingAreaResponse } from '../types/gameplay';

interface ScavengingState {
  // 小队状态
  teams: ScavengingTeamResponse[];
  
  // 可探索区域
  areas: ScavengingAreaResponse[];
  
  // UI 状态
  isLoading: boolean;
  isDispatching: boolean;
  error: string | null;
  
  // Actions - 数据获取
  fetchTeams: (userId: string) => Promise<void>;
  fetchAreas: (userId: string) => Promise<void>;
  
  // Actions - 操作
  dispatchTeam: (userId: string, maidIds: string[], areaId: number, durationSeconds: number) => Promise<boolean>;
  collectLoot: (userId: string, teamId: string) => Promise<boolean>;
  
  // Actions - 状态管理
  setTeams: (teams: ScavengingTeamResponse[]) => void;
  setAreas: (areas: ScavengingAreaResponse[]) => void;
  resetScavenging: () => void;
}

export const useScavengingStore = create<ScavengingState>((set, get) => ({
  // 初始状态
  teams: [],
  areas: [],
  isLoading: false,
  isDispatching: false,
  error: null,
  
  // 数据获取
  fetchTeams: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { scavengingApi } = await import('../services/gameplayApi');
      const response = await scavengingApi.getTeams(userId);
      
      if (response.success && response.data) {
        set({ teams: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || '获取小队状态失败', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
    }
  },
  
  fetchAreas: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { scavengingApi } = await import('../services/gameplayApi');
      const response = await scavengingApi.getAreas(userId);
      
      if (response.success && response.data) {
        set({ areas: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || '获取区域列表失败', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
    }
  },
  
  // 派遣小队
  dispatchTeam: async (userId: string, maidIds: string[], areaId: number, durationSeconds: number) => {
    set({ isDispatching: true, error: null });
    
    try {
      const { scavengingApi } = await import('../services/gameplayApi');
      const response = await scavengingApi.dispatch({
        userId,
        maidIds,
        areaId,
        durationSeconds,
      });
      
      if (response.success && response.data) {
        // 更新小队列表
        const currentTeams = get().teams;
        set({ 
          teams: [...currentTeams, response.data!],
          isDispatching: false,
        });
        return true;
      } else {
        set({ error: response.error?.message || '派遣失败', isDispatching: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isDispatching: false });
      return false;
    }
  },
  
  // 收获收益
  collectLoot: async (userId: string, teamId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { scavengingApi } = await import('../services/gameplayApi');
      const response = await scavengingApi.collect({
        userId,
        teamId,
      });
      
      if (response.success) {
        // 从列表中移除已完成的小队
        const currentTeams = get().teams;
        set({
          teams: currentTeams.filter(team => team.id !== teamId),
          isLoading: false,
        });
        return true;
      } else {
        set({ error: response.error?.message || '收获失败', isLoading: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
      return false;
    }
  },
  
  // 状态管理
  setTeams: (teams) => set({ teams }),
  
  setAreas: (areas) => set({ areas }),
  
  resetScavenging: () => set({
    teams: [],
    areas: [],
    isLoading: false,
    isDispatching: false,
    error: null,
  }),
}));
