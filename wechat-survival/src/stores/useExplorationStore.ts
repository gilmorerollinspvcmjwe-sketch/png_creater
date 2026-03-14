/**
 * 探索状态管理
 * 集成后端玩法模块 API
 */

import { create } from 'zustand';
import type {
  ExplorationMapResponse,
  EventResponse,
} from '../types/gameplay';

interface ExplorationState {
  // 地图信息
  map: ExplorationMapResponse | null;
  
  // 当前区域的事件
  currentEvents: EventResponse[];
  
  // UI 状态
  isLoading: boolean;
  isExploring: boolean;
  error: string | null;
  
  // Actions - 数据获取
  fetchMap: (userId: string) => Promise<void>;
  fetchEvents: (userId: string, areaId: number) => Promise<void>;
  
  // Actions - 操作
  explore: (userId: string, areaId: number) => Promise<boolean>;
  createOutpost: (userId: string, areaId: number) => Promise<boolean>;
  
  // Actions - 状态管理
  setMap: (map: ExplorationMapResponse | null) => void;
  setCurrentEvents: (events: EventResponse[]) => void;
  resetExploration: () => void;
}

export const useExplorationStore = create<ExplorationState>((set, get) => ({
  // 初始状态
  map: null,
  currentEvents: [],
  isLoading: false,
  isExploring: false,
  error: null,
  
  // 获取地图信息
  fetchMap: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { explorationApi } = await import('../services/gameplayApi');
      const response = await explorationApi.getMap(userId);
      
      if (response.success && response.data) {
        set({ map: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || '获取地图失败', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
    }
  },
  
  // 获取区域事件
  fetchEvents: async (userId: string, areaId: number) => {
    set({ isLoading: true, error: null });
    
    try {
      const { explorationApi } = await import('../services/gameplayApi');
      const response = await explorationApi.getEvents(userId, areaId);
      
      if (response.success && response.data) {
        set({ currentEvents: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || '获取事件失败', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
    }
  },
  
  // 派遣探索
  explore: async (userId: string, areaId: number) => {
    set({ isExploring: true, error: null });
    
    try {
      const { explorationApi } = await import('../services/gameplayApi');
      const response = await explorationApi.explore({
        userId,
        areaId,
      });
      
      if (response.success) {
        // 刷新地图信息
        await get().fetchMap(userId);
        set({ isExploring: false });
        return true;
      } else {
        set({ error: response.error?.message || '探索失败', isExploring: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isExploring: false });
      return false;
    }
  },
  
  // 建立前哨站
  createOutpost: async (userId: string, areaId: number) => {
    set({ isExploring: true, error: null });
    
    try {
      const { explorationApi } = await import('../services/gameplayApi');
      const response = await explorationApi.createOutpost({
        userId,
        areaId,
      });
      
      if (response.success) {
        // 刷新地图信息
        await get().fetchMap(userId);
        set({ isExploring: false });
        return true;
      } else {
        set({ error: response.error?.message || '建立前哨站失败', isExploring: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isExploring: false });
      return false;
    }
  },
  
  // 状态管理
  setMap: (map) => set({ map }),
  
  setCurrentEvents: (events) => set({ currentEvents: events }),
  
  resetExploration: () => set({
    map: null,
    currentEvents: [],
    isLoading: false,
    isExploring: false,
    error: null,
  }),
}));
