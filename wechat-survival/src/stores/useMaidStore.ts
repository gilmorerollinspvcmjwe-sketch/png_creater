/**
 * 女仆状态管理
 * 集成后端玩法模块 API
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Maid } from '../types/game';
import type { MaidResponse, MaidJob, BondResponse } from '../types/gameplay';

interface MaidState {
  maids: Maid[];
  
  // 后端 API 数据
  maidResponses: MaidResponse[];
  bonds: BondResponse[];
  
  // UI 状态
  isLoading: boolean;
  isInteracting: boolean;
  error: string | null;
  
  // Actions - 本地操作
  setMaids: (maids: Maid[]) => void;
  addMaid: (maid: Maid) => void;
  removeMaid: (maidId: string) => void;
  levelUpMaid: (maidId: string) => void;
  updateAffection: (maidId: string, affection: number) => void;
  toggleLock: (maidId: string) => void;
  
  // Actions - API 集成
  fetchMaids: (userId: string) => Promise<void>;
  fetchBonds: (userId: string) => Promise<void>;
  interact: (userId: string, maidId: string, interactionType: 'talk' | 'gift' | 'work' | 'rest') => Promise<boolean>;
  promote: (userId: string, maidId: string, targetJob: MaidJob) => Promise<boolean>;
  
  // Actions - 状态管理
  resetMaids: () => void;
}

function createInitialMaids(): Maid[] {
  // 初始 3 个基础女仆
  return [
    {
      id: 'maid-1',
      templateId: 1,
      name: '小兰',
      level: 1,
      exp: 0,
      rarity: 'R',
      affection: 20,
      stats: { scavenging: 10, combat: 5, production: 8 },
      skills: [],
      isLocked: false,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maid1',
    },
    {
      id: 'maid-2',
      templateId: 2,
      name: '小梅',
      level: 1,
      exp: 0,
      rarity: 'R',
      affection: 20,
      stats: { scavenging: 8, combat: 8, production: 6 },
      skills: [],
      isLocked: false,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maid2',
    },
    {
      id: 'maid-3',
      templateId: 3,
      name: '小竹',
      level: 1,
      exp: 0,
      rarity: 'R',
      affection: 20,
      stats: { scavenging: 6, combat: 6, production: 10 },
      skills: [],
      isLocked: false,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maid3',
    },
  ];
}

/**
 * 将后端 MaidResponse 转换为前端 Maid
 */
function convertMaidResponseToMaid(response: MaidResponse): Maid {
  return {
    id: response.id,
    templateId: 1, // 默认值，实际应从后端获取
    name: response.name,
    level: response.level,
    exp: 0, // 后端未提供，使用默认值
    rarity: 'R' as const, // 默认值
    affection: response.favorability,
    stats: {
      scavenging: response.stats.scavenging,
      combat: response.stats.combat,
      production: response.stats.production,
    },
    skills: [], // 后端未提供，使用默认值
    isLocked: false,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.id}`,
    job: response.job,
  };
}

export const useMaidStore = create<MaidState>()(
  persist(
    (set, get) => ({
      maids: createInitialMaids(),
      maidResponses: [],
      bonds: [],
      isLoading: false,
      isInteracting: false,
      error: null,
      
      // 本地操作
      setMaids: (maids) => set({ maids }),
      
      addMaid: (maid) => set((state) => ({
        maids: [...state.maids, maid],
      })),
      
      removeMaid: (maidId) => set((state) => ({
        maids: state.maids.filter((m) => m.id !== maidId),
      })),
      
      levelUpMaid: (maidId) => set((state) => ({
        maids: state.maids.map((maid) =>
          maid.id === maidId
            ? {
                ...maid,
                level: maid.level + 1,
                exp: 0,
                stats: {
                  scavenging: maid.stats.scavenging + 2,
                  combat: maid.stats.combat + 2,
                  production: maid.stats.production + 2,
                },
              }
            : maid
        ),
      })),
      
      updateAffection: (maidId, affection) => set((state) => ({
        maids: state.maids.map((maid) =>
          maid.id === maidId ? { ...maid, affection: Math.min(100, Math.max(0, affection)) } : maid
        ),
      })),
      
      toggleLock: (maidId) => set((state) => ({
        maids: state.maids.map((maid) =>
          maid.id === maidId ? { ...maid, isLocked: !maid.isLocked } : maid
        ),
      })),
      
      // API 集成 - 获取女仆列表
      fetchMaids: async (userId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { maidApi } = await import('../services/gameplayApi');
          const response = await maidApi.getMaids(userId);
          
          if (response.success && response.data) {
            const maids = response.data.map(convertMaidResponseToMaid);
            set({ 
              maids,
              maidResponses: response.data,
              isLoading: false,
            });
          } else {
            set({ error: response.error?.message || '获取女仆列表失败', isLoading: false });
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', isLoading: false });
        }
      },
      
      // API 集成 - 获取羁绊加成
      fetchBonds: async (userId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { maidApi } = await import('../services/gameplayApi');
          const response = await maidApi.getBonds(userId);
          
          if (response.success && response.data) {
            set({ bonds: response.data, isLoading: false });
          } else {
            set({ error: response.error?.message || '获取羁绊加成失败', isLoading: false });
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', isLoading: false });
        }
      },
      
      // API 集成 - 互动
      interact: async (userId: string, maidId: string, interactionType: 'talk' | 'gift' | 'work' | 'rest') => {
        set({ isInteracting: true, error: null });
        
        try {
          const { maidApi } = await import('../services/gameplayApi');
          const response = await maidApi.interact({
            userId,
            maidId,
            interactionType,
          });
          
          if (response.success && response.data) {
            // 更新好感度
            get().updateAffection(maidId, response.data.newFavorability);
            set({ isInteracting: false });
            return true;
          } else {
            set({ error: response.error?.message || '互动失败', isInteracting: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', isInteracting: false });
          return false;
        }
      },
      
      // API 集成 - 转职
      promote: async (userId: string, maidId: string, targetJob: MaidJob) => {
        set({ isInteracting: true, error: null });
        
        try {
          const { maidApi } = await import('../services/gameplayApi');
          const response = await maidApi.promote({
            userId,
            maidId,
            targetJob,
          });
          
          if (response.success && response.data) {
            // 更新女仆职业和属性
            set((state) => ({
              maids: state.maids.map((maid) =>
                maid.id === maidId
                  ? {
                      ...maid,
                      job: targetJob,
                      stats: {
                        scavenging: response.data!.statsChange.scavenging,
                        combat: response.data!.statsChange.combat,
                        production: response.data!.statsChange.production,
                      },
                    }
                  : maid
              ),
              isInteracting: false,
            }));
            return true;
          } else {
            set({ error: response.error?.message || '转职失败', isInteracting: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message || '网络错误', isInteracting: false });
          return false;
        }
      },
      
      resetMaids: () => set({ 
        maids: createInitialMaids(),
        maidResponses: [],
        bonds: [],
        isLoading: false,
        isInteracting: false,
        error: null,
      }),
    }),
    {
      name: 'iron-house-maids',
      partialize: (state) => ({ maids: state.maids }),
    }
  )
);
