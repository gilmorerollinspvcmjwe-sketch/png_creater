/**
 * 战斗状态管理
 * 集成后端玩法模块 API
 */

import { create } from 'zustand';
import type { DefenseStatusResponse, CombatRecordResponse, NextWaveResponse } from '../types/gameplay';

interface CombatState {
  // 防御状态
  defenseStatus: DefenseStatusResponse | null;
  
  // 战斗记录
  records: CombatRecordResponse[];
  
  // 下次袭城
  nextWave: NextWaveResponse | null;
  
  // UI 状态
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // Actions - 数据获取
  fetchDefenseStatus: (userId: string) => Promise<void>;
  fetchRecords: (userId: string) => Promise<void>;
  fetchNextWave: (userId: string) => Promise<void>;
  
  // Actions - 操作
  updateDefense: (userId: string, facilityDefense: number, maidIds: string[]) => Promise<boolean>;
  
  // Actions - 状态管理
  setDefenseStatus: (status: DefenseStatusResponse | null) => void;
  setRecords: (records: CombatRecordResponse[]) => void;
  setNextWave: (wave: NextWaveResponse | null) => void;
  resetCombat: () => void;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  // 初始状态
  defenseStatus: null,
  records: [],
  nextWave: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  
  // 获取防御状态
  fetchDefenseStatus: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { combatApi } = await import('../services/gameplayApi');
      const response = await combatApi.getDefense(userId);
      
      if (response.success && response.data) {
        set({ 
          defenseStatus: response.data,
          nextWave: response.data.nextWave || null,
          isLoading: false,
        });
      } else {
        set({ error: response.error?.message || '获取防御状态失败', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
    }
  },
  
  // 获取战斗记录
  fetchRecords: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { combatApi } = await import('../services/gameplayApi');
      const response = await combatApi.getRecords(userId);
      
      if (response.success && response.data) {
        set({ records: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || '获取战斗记录失败', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
    }
  },
  
  // 获取下次袭城信息
  fetchNextWave: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { combatApi } = await import('../services/gameplayApi');
      const response = await combatApi.getNextWave(userId);
      
      if (response.success && response.data) {
        set({ nextWave: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || '获取袭城信息失败', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isLoading: false });
    }
  },
  
  // 更新防御配置
  updateDefense: async (userId: string, facilityDefense: number, maidIds: string[]) => {
    set({ isUpdating: true, error: null });
    
    try {
      const { combatApi } = await import('../services/gameplayApi');
      const response = await combatApi.updateDefense({
        userId,
        facilityDefense,
        maidIds,
      });
      
      if (response.success) {
        // 刷新防御状态
        await get().fetchDefenseStatus(userId);
        set({ isUpdating: false });
        return true;
      } else {
        set({ error: response.error?.message || '更新防御配置失败', isUpdating: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '网络错误', isUpdating: false });
      return false;
    }
  },
  
  // 状态管理
  setDefenseStatus: (status) => set({ defenseStatus: status }),
  
  setRecords: (records) => set({ records }),
  
  setNextWave: (wave) => set({ nextWave: wave }),
  
  resetCombat: () => set({
    defenseStatus: null,
    records: [],
    nextWave: null,
    isLoading: false,
    isUpdating: false,
    error: null,
  }),
}));
