/**
 * 按类型分组的统计信息
 */
export interface StatisticsByType {
  [key: string]: number;
}

/**
 * 大小统计信息
 */
export interface SizeStatistics {
  total: number;
  byType: StatisticsByType;
  totalSizeBytes: number;
  averageSizeBytes: number;
}

/**
 * 恢复统计信息
 */
export interface RestoreStatistics {
  totalRestores: number;
  byType: StatisticsByType;
  mostRestoredId: string | null;
}

/**
 * 统计计算工具类
 *
 * 提供通用的统计计算功能
 */
export class StatisticsUtils {
  /**
   * 计算按类型分组的统计信息
   *
   * @param items - 包含类型信息的对象数组
   * @returns 按类型分组的统计信息
   */
  static calculateByType<T extends { type: { toString: () => string } }>(
    items: T[]
  ): StatisticsByType {
    const byType: StatisticsByType = {};
    for (const item of items) {
      const type = item.type.toString();
      byType[type] = (byType[type] || 0) + 1;
    }
    return byType;
  }

  /**
   * 计算大小统计信息
   *
   * @param items - 包含类型和大小信息的对象数组
   * @returns 大小统计信息
   */
  static calculateSizeStatistics<T extends { type: { toString: () => string }; sizeBytes: number }>(
    items: T[]
  ): SizeStatistics {
    const byType: StatisticsByType = {};
    let totalSizeBytes = 0;

    for (const item of items) {
      const type = item.type.toString();
      byType[type] = (byType[type] || 0) + 1;
      totalSizeBytes += item.sizeBytes;
    }

    return {
      total: items.length,
      byType,
      totalSizeBytes,
      averageSizeBytes: totalSizeBytes / Math.max(items.length, 1),
    };
  }

  /**
   * 计算恢复统计信息
   *
   * @param items - 包含类型、恢复次数和 ID 的对象数组
   * @returns 恢复统计信息
   */
  static calculateRestoreStatistics<T extends {
    type: { toString: () => string };
    restoreCount: number;
    checkpointId: { value: string };
  }>(items: T[]): RestoreStatistics {
    const byType: StatisticsByType = {};
    let totalRestores = 0;
    let mostRestoredItem: T | null = null;

    for (const item of items) {
      const type = item.type.toString();
      const restoreCount = item.restoreCount;

      byType[type] = (byType[type] || 0) + restoreCount;
      totalRestores += restoreCount;

      if (!mostRestoredItem || restoreCount > mostRestoredItem.restoreCount) {
        mostRestoredItem = item;
      }
    }

    return {
      totalRestores,
      byType,
      mostRestoredId: mostRestoredItem?.checkpointId.value || null,
    };
  }
}