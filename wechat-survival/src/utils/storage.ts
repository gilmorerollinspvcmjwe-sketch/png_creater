/**
 * localStorage 封装工具函数
 */

const STORAGE_KEY = 'iron_house_survival_data';
const STORAGE_VERSION = '1.0.0';

/**
 * 计算简单校验和（用于数据完整性检查）
 */
function calculateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * 游戏数据存储结构
 */
export interface StoredData {
  version: string;
  lastSaveTime: number;
  lastLoginTime: number;
  gameData: {
    ironHouse: any;
    resources: any;
    maids: any[];
    facilities: any[];
    scavengingTeams: any[];
    config: any;
    user?: any;
  };
  checksum: string;
}

/**
 * 保存游戏数据到 localStorage
 */
export function saveGameData(data: StoredData['gameData']): void {
  try {
    const storedData: StoredData = {
      version: STORAGE_VERSION,
      lastSaveTime: Date.now(),
      lastLoginTime: getStoredData()?.lastLoginTime || Date.now(),
      gameData: data,
      checksum: calculateChecksum(data),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
  } catch (error) {
    console.error('保存游戏数据失败:', error);
  }
}

/**
 * 从 localStorage 加载游戏数据
 */
export function loadGameData(): StoredData['gameData'] | null {
  try {
    const storedData = getStoredData();
    if (!storedData) return null;
    
    // 校验数据完整性
    const expectedChecksum = calculateChecksum(storedData.gameData);
    if (storedData.checksum !== expectedChecksum) {
      console.warn('数据校验失败，可能存在篡改');
      return null;
    }
    
    return storedData.gameData;
  } catch (error) {
    console.error('加载游戏数据失败:', error);
    return null;
  }
}

/**
 * 获取原始存储数据（不校验）
 */
export function getStoredData(): StoredData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('读取存储数据失败:', error);
    return null;
  }
}

/**
 * 获取上次登录时间
 */
export function getLastLoginTime(): number {
  return getStoredData()?.lastLoginTime || Date.now();
}

/**
 * 更新登录时间
 */
export function updateLoginTime(): number {
  const now = Date.now();
  const storedData = getStoredData();
  
  if (storedData) {
    storedData.lastLoginTime = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
  }
  
  return now;
}

/**
 * 清除游戏数据
 */
export function clearGameData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 导出游戏数据（用于备份）
 */
export function exportGameData(): string | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored;
}

/**
 * 导入游戏数据（用于恢复）
 */
export function importGameData(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.version || !parsed.gameData || !parsed.checksum) {
      throw new Error('无效的备份数据');
    }
    
    localStorage.setItem(STORAGE_KEY, data);
    return true;
  } catch (error) {
    console.error('导入游戏数据失败:', error);
    return false;
  }
}

/**
 * 存储配置项
 */
export function saveConfig<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`iron_house_config_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

/**
 * 加载配置项
 */
export function loadConfig<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(`iron_house_config_${key}`);
    if (!stored) return defaultValue;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('加载配置失败:', error);
    return defaultValue;
  }
}

/**
 * 存储临时数据（IndexedDB 用于大量数据）
 */
export async function saveToIndexedDB<T>(storeName: string, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('IronHouseSurvival', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const putRequest = objectStore.put(value, key);
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
  });
}

/**
 * 从 IndexedDB 加载数据
 */
export async function loadFromIndexedDB<T>(storeName: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('IronHouseSurvival', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const getRequest = objectStore.get(key);
      
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
  });
}
