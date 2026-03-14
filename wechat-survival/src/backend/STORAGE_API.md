# WeChat Survival Phase 1 - 本地存储 API 文档

## 概述

Phase 1 使用 **localStorage** 作为数据存储方案，无需数据库和服务器。

## 存储结构

### 主存档键
```typescript
const STORAGE_KEY = 'wechat_survival_save';
```

### 备份键
```typescript
const BACKUP_KEY = 'wechat_survival_backup';
```

### 存档数据格式
```typescript
interface SaveData {
  version: string;          // 存档版本
  saveTime: number;         // 保存时间戳
  gameDay: number;          // 游戏内天数
  survivalDays: number;     // 生存天数
  checksum: string;         // 数据校验和
  gameState: GameState;     // 游戏状态
}
```

## LocalStorageSystem API

### 保存游戏
```typescript
saveGame(gameState: GameState): { 
  success: boolean; 
  message: string; 
}
```

**功能**: 保存游戏数据到 localStorage
- 自动创建备份
- 计算校验和用于数据完整性验证
- 清理不可序列化的数据（如战斗状态）

### 加载游戏
```typescript
loadGame(): { 
  success: boolean; 
  gameState?: GameState; 
  message: string; 
}
```

**功能**: 从 localStorage 加载游戏数据
- 版本兼容性检查
- 校验和验证
- 失败时自动从备份恢复

### 获取存档信息
```typescript
getSaveInfo(): { 
  exists: boolean; 
  version?: string; 
  saveTime?: number;
  gameDay?: number;
  survivalDays?: number;
}
```

**功能**: 获取存档元数据（不加载完整数据）

### 删除存档
```typescript
deleteSave(): { 
  success: boolean; 
  message: string; 
}
```

**功能**: 删除主存档和备份

### 导出存档
```typescript
exportSave(): string | null
```

**功能**: 导出存档数据（用于备份/分享）
- 返回 JSON 字符串

### 导入存档
```typescript
importSave(saveData: string): { 
  success: boolean; 
  message: string; 
}
```

**参数**: `saveData` - JSON 格式的存档数据

**功能**: 导入存档数据
- 版本兼容性检查
- 数据格式验证

### 自动保存
```typescript
startAutoSave(
  gameStateGetter: () => GameState, 
  intervalMs: number = 300000
): () => void
```

**参数**: 
- `gameStateGetter` - 获取游戏状态的函数
- `intervalMs` - 保存间隔（默认 5 分钟）

**返回**: 停止自动保存的函数

**功能**: 启动定时自动保存

### 存储空间使用
```typescript
getStorageUsage(): { 
  used: number; 
  limit: number; 
  percentage: number;
  canSave: boolean;
}
```

**功能**: 获取 localStorage 使用情况

## 数据版本管理

### 版本格式
```
主版本。次版本.修订号
例如：1.0.0
```

### 兼容性规则
- **主版本**必须相同才能兼容
- 次版本和修订号向后兼容

### 版本升级策略
```typescript
private isVersionCompatible(version: string): boolean {
  const current = this.parseVersion(this.currentVersion);
  const saved = this.parseVersion(version);
  return current.major === saved.major;
}
```

## 数据完整性

### 校验和计算
```typescript
function calculateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
```

### 验证流程
1. 加载存档时计算校验和
2. 与保存的校验和对比
3. 不匹配则尝试从备份恢复

## 备份机制

### 自动备份
- 每次保存前自动创建备份
- 备份覆盖之前的备份（只保留一份）

### 备份恢复
- 主存档损坏时自动尝试
- 版本不兼容时提示用户

## 使用示例

### 初始化游戏
```typescript
import { LocalStorageSystem, createInitialGameState } from './storage/localStorage';

const storage = new LocalStorageSystem();

// 检查是否有存档
const saveInfo = storage.getSaveInfo();

if (saveInfo.exists) {
  // 加载存档
  const result = storage.loadGame();
  if (result.success) {
    console.log('加载成功', result.gameState);
  }
} else {
  // 新游戏
  const initialState = createInitialGameState();
  storage.saveGame(initialState);
}
```

### 自动保存
```typescript
// 启动自动保存
const stopAutoSave = storage.startAutoSave(
  () => gameEngine.getGameState(),
  300000 // 5 分钟
);

// 停止自动保存
stopAutoSave();
```

### 导出/导入
```typescript
// 导出
const saveData = storage.exportSave();
if (saveData) {
  // 保存到文件或发送到服务器
  downloadFile('save.json', saveData);
}

// 导入
const fileContent = await readFile('save.json');
const result = storage.importSave(fileContent);
if (result.success) {
  console.log('导入成功');
}
```

## 注意事项

### localStorage 限制
- **容量**: 通常 5MB 左右
- **同步**: 操作是同步的，可能阻塞 UI
- **域名**: 数据绑定到域名

### 性能优化
- 避免频繁保存（使用自动保存）
- 大量数据使用 IndexedDB
- 定期清理无用数据

### 安全性
- 校验和防止数据篡改
- 版本检查防止不兼容
- 备份机制防止数据丢失

## 与前端对接

### React Hook 示例
```typescript
function useGameStorage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const storage = useMemo(() => new LocalStorageSystem(), []);
  
  const load = useCallback(() => {
    const result = storage.loadGame();
    if (result.success) {
      setGameState(result.gameState!);
    }
  }, [storage]);
  
  const save = useCallback(() => {
    if (gameState) {
      storage.saveGame(gameState);
    }
  }, [storage, gameState]);
  
  return { gameState, load, save };
}
```

### 保存策略
1. **手动保存**: 玩家点击保存按钮
2. **自动保存**: 每 5 分钟
3. **场景切换**: 进入/离开战斗时
4. **退出前**: 监听 beforeunload 事件

## 错误处理

### 常见错误
```typescript
// 存储空间不足
{ success: false, message: '保存失败：QuotaExceededError' }

// 数据损坏
{ success: false, message: '存档校验失败' }

// 版本不兼容
{ success: false, message: '存档版本不兼容：0.9.0' }
```

### 恢复策略
1. 尝试从备份恢复
2. 提示玩家开始新游戏
3. 提供导入存档选项
