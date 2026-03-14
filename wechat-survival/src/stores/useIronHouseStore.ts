/**
 * 铁屋状态管理
 * 集成后端铁屋 API，支持升级、建造
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ironHouseApi, type IronHouseData, type Building } from '../services/api';
import { useResourceStore } from './useResourceStore';

export interface Facility {
  id: string;
  type: 'farm' | 'lumber' | 'mine' | 'barrack' | 'research' | 'defense';
  level: number;
  position: { x: number; y: number };
  productionBonus?: number;
  defenseBonus?: number;
}

export interface IronHouse extends IronHouseData {
  facilities: Facility[];
}

interface UpgradeCost {
  food: number;
  wood: number;
  iron: number;
  crystal: number;
}

interface IronHouseState {
  ironHouse: IronHouse | null;
  buildings: Building[];
  isLoading: boolean;
  isUpgrading: boolean;
  isBuilding: boolean;
  error: string | null;
  
  // Actions
  fetchIronHouse: () => Promise<void>;
  fetchBuildings: () => Promise<void>;
  upgradeIronHouse: () => Promise<boolean>;
  buildFacility: (data: { type: string; position: { x: number; y: number } }) => Promise<boolean>;
  getUpgradeCost: (level: number) => UpgradeCost;
  canUpgrade: () => boolean;
  clearError: () => void;
}

/**
 * 计算升级成本
 */
function calculateUpgradeCost(level: number): UpgradeCost {
  const baseCost = {
    food: 200,
    wood: 100,
    iron: 50,
    crystal: 5,
  };
  
  const multiplier = Math.pow(1.5, level - 1);
  
  return {
    food: Math.floor(baseCost.food * multiplier),
    wood: Math.floor(baseCost.wood * multiplier),
    iron: Math.floor(baseCost.iron * multiplier),
    crystal: Math.floor(baseCost.crystal * multiplier),
  };
}

/**
 * 创建初始铁屋
 */
function createInitialIronHouse(): IronHouse {
  return {
    id: 'iron-house-1',
    level: 1,
    exp: 0,
    defense: 1000,
    maxDefense: 1000,
    facilities: [],
    technologies: [],
    isAutoUpgrade: false,
    upgradeQueueEndTime: 0,
  };
}

export const useIronHouseStore = create<IronHouseState>()(
  persist(
    (set, get) => ({
      // 初始状态
      ironHouse: null,
      buildings: [],
      isLoading: false,
      isUpgrading: false,
      isBuilding: false,
      error: null,
      
      // Actions
      fetchIronHouse: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await ironHouseApi.getIronHouse();
          
          if (response.success && response.data) {
            set({
              ironHouse: response.data as IronHouse,
              isLoading: false,
            });
          } else {
            // 如果 API 失败，使用本地数据
            if (!get().ironHouse) {
              set({ ironHouse: createInitialIronHouse() });
            }
            set({ isLoading: false, error: response.error?.message || null });
          }
        } catch (error: any) {
          console.error('获取铁屋信息失败:', error);
          if (!get().ironHouse) {
            set({ ironHouse: createInitialIronHouse() });
          }
          set({ isLoading: false, error: error.message || '获取失败' });
        }
      },
      
      fetchBuildings: async () => {
        try {
          const response = await ironHouseApi.getBuildings();
          
          if (response.success && response.data) {
            set({ buildings: response.data });
          }
        } catch (error) {
          console.error('获取建筑列表失败:', error);
        }
      },
      
      upgradeIronHouse: async () => {
        const { ironHouse, getUpgradeCost } = get();
        if (!ironHouse) {
          set({ error: '铁屋数据未加载' });
          return false;
        }
        
        const cost = getUpgradeCost(ironHouse.level);
        const { canAfford, deductResources } = useResourceStore.getState();
        
        // 检查资源是否足够
        if (!canAfford(cost)) {
          set({ error: '资源不足' });
          return false;
        }
        
        // 乐观更新 UI
        const previousIronHouse = { ...ironHouse };
        set({ isUpgrading: true, error: null });
        
        // 本地先扣除资源
        deductResources(cost);
        
        // 本地先更新铁屋等级
        set((state) => ({
          ironHouse: state.ironHouse ? {
            ...state.ironHouse,
            level: state.ironHouse.level + 1,
            exp: 0,
            defense: Math.floor(state.ironHouse.defense * 1.2),
            maxDefense: Math.floor(state.ironHouse.maxDefense * 1.2),
          } : null,
        }));
        
        try {
          // 调用 API
          const response = await ironHouseApi.upgradeIronHouse();
          
          if (response.success && response.data) {
            // API 成功，确认更新
            set({
              ironHouse: response.data.ironHouse as IronHouse | undefined,
              isUpgrading: false,
            });
            return true;
          } else {
            // API 失败，回滚
            console.error('升级失败，回滚:', response.error);
            set({
              ironHouse: previousIronHouse,
              isUpgrading: false,
              error: response.error?.message || '升级失败',
            });
            // 回滚资源
            useResourceStore.getState().addResources(cost);
            return false;
          }
        } catch (error: any) {
          console.error('升级异常，回滚:', error);
          set({
            ironHouse: previousIronHouse,
            isUpgrading: false,
            error: error.message || '升级异常',
          });
          // 回滚资源
          useResourceStore.getState().addResources(cost);
          return false;
        }
      },
      
      buildFacility: async (data) => {
        set({ isBuilding: true, error: null });
        
        try {
          const response = await ironHouseApi.buildFacility(data);
          
          if (response.success && response.data) {
            const facility = response.data.facility as Facility | undefined;
            // 更新本地设施列表
            set((state) => ({
              ironHouse: state.ironHouse && facility ? {
                ...state.ironHouse,
                facilities: [
                  ...state.ironHouse.facilities,
                  facility,
                ],
              } : state.ironHouse,
              isBuilding: false,
            }));
            return true;
          } else {
            set({
              isBuilding: false,
              error: response.error?.message || '建造失败',
            });
            return false;
          }
        } catch (error: any) {
          set({
            isBuilding: false,
            error: error.message || '建造异常',
          });
          return false;
        }
      },
      
      getUpgradeCost: (level: number) => {
        return calculateUpgradeCost(level);
      },
      
      canUpgrade: () => {
        const { ironHouse } = get();
        if (!ironHouse) return false;
        
        const cost = calculateUpgradeCost(ironHouse.level);
        const { canAfford } = useResourceStore.getState();
        
        return canAfford(cost);
      },
      
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'iron-house-data',
      partialize: (state) => ({
        ironHouse: state.ironHouse,
        buildings: state.buildings,
      }),
    }
  )
);

// 辅助函数：检查是否可以负担成本
function canAfford(cost: UpgradeCost): boolean {
  const { resources } = useResourceStore.getState();
  
  return (
    resources.food >= cost.food &&
    resources.wood >= cost.wood &&
    resources.iron >= cost.iron &&
    resources.crystal >= cost.crystal
  );
}

// 导出辅助函数供外部使用
export { canAfford };
