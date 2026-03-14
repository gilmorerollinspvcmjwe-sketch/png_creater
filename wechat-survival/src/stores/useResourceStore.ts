/**
 * 资源状态管理
 * 集成后端资源 API，支持产出计算、消耗
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { resourceApi, type ConsumeRequest } from '../services/api';
import { INITIAL_RESOURCES } from '../constants/config';

export interface Resources {
  food: number;
  wood: number;
  iron: number;
  crystal: number;
}

interface ResourceState {
  resources: Resources;
  isLoading: boolean;
  isCalculating: boolean;
  isConsuming: boolean;
  error: string | null;
  lastSyncTime: number | null;
  
  // Actions
  fetchResources: () => Promise<void>;
  setResources: (resources: Resources) => void;
  addResources: (gain: Resources) => void;
  deductResources: (cost: Resources) => boolean;
  canAfford: (cost: Resources) => boolean;
  calculateOfflineGain: (lastLoginTime: number) => Promise<void>;
  consumeResources: (payload: Omit<ConsumeRequest, 'soulCrystal'> & { crystal?: number; reason?: string }) => Promise<boolean>;
  syncToBackend: () => Promise<void>;
  clearError: () => void;
  resetResources: () => void;
}

export const useResourceStore = create<ResourceState>()(
  persist(
    (set, get) => ({
      // 初始状态
      resources: INITIAL_RESOURCES,
      isLoading: false,
      isCalculating: false,
      isConsuming: false,
      error: null,
      lastSyncTime: null,
      
      // Actions
      fetchResources: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await resourceApi.getResources();
          
          if (response.success && response.data) {
            set({
              resources: {
                food: response.data.food,
                wood: response.data.wood,
                iron: response.data.iron,
                crystal: response.data.soulCrystal,
              },
              isLoading: false,
              lastSyncTime: Date.now(),
            });
          } else {
            set({ isLoading: false, error: response.error?.message || null });
          }
        } catch (error: any) {
          console.error('获取资源失败:', error);
          set({ isLoading: false, error: error.message || '获取失败' });
        }
      },
      
      setResources: (resources) => {
        set({ resources, lastSyncTime: Date.now() });
      },
      
      addResources: (gain) => {
        set((state) => ({
          resources: {
            food: state.resources.food + gain.food,
            wood: state.resources.wood + gain.wood,
            iron: state.resources.iron + gain.iron,
            crystal: state.resources.crystal + gain.crystal,
          },
        }));
      },
      
      deductResources: (cost) => {
        const current = get().resources;
        
        // 检查资源是否足够
        if (
          current.food < cost.food ||
          current.wood < cost.wood ||
          current.iron < cost.iron ||
          current.crystal < cost.crystal
        ) {
          return false;
        }
        
        set({
          resources: {
            food: current.food - cost.food,
            wood: current.wood - cost.wood,
            iron: current.iron - cost.iron,
            crystal: current.crystal - cost.crystal,
          },
        });
        
        return true;
      },
      
      canAfford: (cost) => {
        const current = get().resources;
        
        return (
          current.food >= cost.food &&
          current.wood >= cost.wood &&
          current.iron >= cost.iron &&
          current.crystal >= cost.crystal
        );
      },
      
      calculateOfflineGain: async (lastLoginTime) => {
        set({ isCalculating: true, error: null });
        
        try {
          const response = await resourceApi.calculate({ lastLoginTime });
          
          if (response.success && response.data) {
            const { resources } = response.data;
            
            // 添加离线收益
            set((state) => ({
              resources: {
                food: state.resources.food + resources.food,
                wood: state.resources.wood + resources.wood,
                iron: state.resources.iron + resources.iron,
                crystal: state.resources.crystal + resources.soulCrystal,
              },
              isCalculating: false,
              lastSyncTime: Date.now(),
            }));
          } else {
            set({ isCalculating: false, error: response.error?.message || null });
          }
        } catch (error: any) {
          console.error('计算离线收益失败:', error);
          set({ isCalculating: false, error: error.message || '计算失败' });
        }
      },
      
      consumeResources: async (payload) => {
        const { canAfford, deductResources } = get();
        
        const cost: Resources = {
          food: payload.food || 0,
          wood: payload.wood || 0,
          iron: payload.iron || 0,
          crystal: payload.crystal || 0,
        };
        
        // 检查资源是否足够
        if (!canAfford(cost)) {
          set({ error: '资源不足' });
          return false;
        }
        
        set({ isConsuming: true, error: null });
        
        // 乐观更新：先扣除本地资源
        deductResources(cost);
        
        try {
          // 调用 API
          const response = await resourceApi.consume({
            food: payload.food || 0,
            wood: payload.wood || 0,
            iron: payload.iron || 0,
            soulCrystal: payload.crystal || 0,
            reason: payload.reason,
          });
          
          if (response.success && response.data) {
            // API 成功，确认更新
            set({
              resources: {
                food: response.data.resources.food,
                wood: response.data.resources.wood,
                iron: response.data.resources.iron,
                crystal: response.data.resources.soulCrystal,
              },
              isConsuming: false,
              lastSyncTime: Date.now(),
            });
            return true;
          } else {
            // API 失败，回滚
            console.error('消耗资源失败，回滚:', response.error);
            set((state) => ({
              resources: {
                food: state.resources.food + cost.food,
                wood: state.resources.wood + cost.wood,
                iron: state.resources.iron + cost.iron,
                crystal: state.resources.crystal + cost.crystal,
              },
              isConsuming: false,
              error: response.error?.message || '消耗失败',
            }));
            return false;
          }
        } catch (error: any) {
          console.error('消耗资源异常，回滚:', error);
          set((state) => ({
            resources: {
              food: state.resources.food + cost.food,
              wood: state.resources.wood + cost.wood,
              iron: state.resources.iron + cost.iron,
              crystal: state.resources.crystal + cost.crystal,
            },
            isConsuming: false,
            error: error.message || '消耗异常',
          }));
          return false;
        }
      },
      
      syncToBackend: async () => {
        // 预留：定期同步到后端
        // 目前通过每次操作时调用 API 来保持同步
        console.log('资源同步到后端（预留）');
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      resetResources: () => {
        set({ resources: INITIAL_RESOURCES });
      },
    }),
    {
      name: 'iron-house-resources',
      partialize: (state) => ({
        resources: state.resources,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
