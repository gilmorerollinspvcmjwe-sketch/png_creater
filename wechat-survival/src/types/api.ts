// API 相关类型定义

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: number;
}

/**
 * API 错误结构
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 用户认证请求
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
  };
  token: string;
}

/**
 * 游戏数据同步请求
 */
export interface SyncGameDataRequest {
  gameData: {
    ironHouse: any;
    resources: any;
    maids: any[];
    facilities: any[];
    scavengingTeams: any[];
    config: any;
  };
  lastSyncTime: number;
  checksum: string;
}

/**
 * 游戏数据同步响应
 */
export interface SyncGameDataResponse {
  gameData: {
    ironHouse: any;
    resources: any;
    maids: any[];
    facilities: any[];
    scavengingTeams: any[];
    config: any;
  };
  serverTime: number;
  hasConflict: boolean;
}

/**
 * 错误码常量
 */
export const ErrorCode = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',
  COOLDOWN_NOT_EXPIRED: 'COOLDOWN_NOT_EXPIRED',
  INVALID_OPERATION: 'INVALID_OPERATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
