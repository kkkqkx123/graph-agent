/**
 * Stateful执行器类型定义
 */

/**
 * Stateful执行器配置
 */
export interface StatefulExecutorConfig {
  /** 是否启用实例缓存 */
  enableInstanceCache?: boolean;
  /** 最大缓存实例数 */
  maxCachedInstances?: number;
  /** 实例过期时间（毫秒） */
  instanceExpirationTime?: number;
  /** 是否自动清理过期实例 */
  autoCleanupExpiredInstances?: boolean;
  /** 清理间隔（毫秒） */
  cleanupInterval?: number;
}