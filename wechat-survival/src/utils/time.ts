/**
 * 时间格式化工具函数
 */

/**
 * 格式化时间戳为相对时间
 * @param timestamp 时间戳（毫秒）
 * @returns 相对时间字符串，如 "刚刚"、"5 分钟前"、"1 小时前"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes} 分钟前`;
  } else if (hours < 24) {
    return `${hours} 小时前`;
  } else if (days < 7) {
    return `${days} 天前`;
  } else {
    return formatDate(timestamp);
  }
}

/**
 * 格式化时间戳为日期时间
 * @param timestamp 时间戳（毫秒）
 * @param showTime 是否显示时间，默认 true
 * @returns 格式化后的日期时间字符串
 */
export function formatDate(timestamp: number, showTime: boolean = true): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (!showTime) {
    return `${year}-${month}-${day}`;
  }
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化持续时间（秒）为可读字符串
 * @param seconds 秒数
 * @returns 格式化后的持续时间字符串，如 "1 小时 30 分钟"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes} 分钟 ${remainingSeconds} 秒`
      : `${minutes} 分钟`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours} 小时 ${remainingMinutes} 分钟`
      : `${hours} 小时`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0
    ? `${days} 天 ${remainingHours} 小时`
    : `${days} 天`;
}

/**
 * 格式化离线时间（秒）为可读字符串
 * @param seconds 秒数
 * @returns 格式化后的离线时间字符串
 */
export function formatOfflineTime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分钟`);
  
  return parts.length > 0 ? parts.join(' ') : '刚刚';
}

/**
 * 计算两个时间戳之间的秒数差
 * @param start 开始时间戳
 * @param end 结束时间戳，默认为当前时间
 * @returns 秒数差
 */
export function getSecondsDiff(start: number, end: number = Date.now()): number {
  return Math.floor((end - start) / 1000);
}

/**
 * 检查是否是新的一天
 * @param lastTimestamp 上次时间戳
 * @returns 是否是新的一天
 */
export function isNewDay(lastTimestamp: number): boolean {
  const lastDate = new Date(lastTimestamp);
  const now = new Date();
  
  return lastDate.getDate() !== now.getDate() ||
         lastDate.getMonth() !== now.getMonth() ||
         lastDate.getFullYear() !== now.getFullYear();
}

/**
 * 获取今日剩余秒数（到午夜 0 点）
 * @param now 当前时间戳（毫秒），可选，默认为 Date.now()
 * @returns 秒数，午夜时返回 0
 */
export function getSecondsUntilMidnight(now?: number): number {
  const currentTime = now ?? Date.now();
  const nowDate = new Date(currentTime);
  const midnight = new Date(nowDate);
  midnight.setHours(24, 0, 0, 0);
  
  const seconds = Math.floor((midnight.getTime() - currentTime) / 1000);
  // 如果正好是午夜，返回 0 而不是 86400
  return seconds % 86400;
}
