/**
 * CheckpointCleanupPolicy - 检查点清理策略实现
 * 
 * 定义检查点自动清理的策略实现
 * 
 * 核心职责：
 * 1. 实现时间基础清理策略
 * 2. 实现数量基础清理策略
 * 3. 实现空间基础清理策略
 * 4. 提供策略工厂函数
 * 
 * 设计原则：
 * - 灵活配置：支持多种清理策略组合
 * - 可扩展性：易于添加新的清理策略
 * - 安全性：确保不会删除所有检查点
 */

import type {
  CheckpointInfo,
  CleanupPolicy,
  TimeBasedCleanupPolicy,
  CountBasedCleanupPolicy,
  SizeBasedCleanupPolicy,
  CheckpointCleanupStrategy
} from '../../../types/checkpoint-storage';

/**
 * 基于时间的清理策略实现
 */
export class TimeBasedCleanupStrategy implements CheckpointCleanupStrategy {
  constructor(private policy: TimeBasedCleanupPolicy) {}

  execute(checkpoints: CheckpointInfo[]): string[] {
    const now = Date.now();
    const retentionMs = this.policy.retentionDays * 24 * 60 * 60 * 1000;
    const minRetention = this.policy.minRetention || 0;

    // 按时间戳降序排序
    const sorted = [...checkpoints].sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);

    // 找出需要删除的检查点
    const toDelete: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const checkpoint = sorted[i];
      if (!checkpoint) continue;
      
      const age = now - checkpoint.metadata.timestamp;

      // 保留最近的minRetention个检查点
      if (i < minRetention) {
        continue;
      }

      // 删除超过保留时间的检查点
      if (age > retentionMs) {
        toDelete.push(checkpoint.checkpointId);
      }
    }

    return toDelete;
  }
}

/**
 * 基于数量的清理策略实现
 */
export class CountBasedCleanupStrategy implements CheckpointCleanupStrategy {
  constructor(private policy: CountBasedCleanupPolicy) {}

  execute(checkpoints: CheckpointInfo[]): string[] {
    const maxCount = this.policy.maxCount;
    const minRetention = this.policy.minRetention || 0;

    // 按时间戳降序排序
    const sorted = [...checkpoints].sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);

    // 如果检查点数量不超过最大值，不需要删除
    if (sorted.length <= maxCount) {
      return [];
    }

    // 计算需要删除的数量
    const deleteCount = Math.max(0, sorted.length - maxCount);

    // 确保至少保留minRetention个检查点
    const actualDeleteCount = Math.min(deleteCount, sorted.length - minRetention);

    // 返回需要删除的检查点ID（从最旧的开始）
    return sorted
      .slice(sorted.length - actualDeleteCount)
      .map(cp => cp.checkpointId);
  }
}

/**
 * 基于存储空间的清理策略实现
 */
export class SizeBasedCleanupStrategy implements CheckpointCleanupStrategy {
  constructor(
    private policy: SizeBasedCleanupPolicy,
    private checkpointSizes: Map<string, number> // checkpointId -> size in bytes
  ) {}

  execute(checkpoints: CheckpointInfo[]): string[] {
    const maxSize = this.policy.maxSizeBytes;
    const minRetention = this.policy.minRetention || 0;

    // 按时间戳降序排序
    const sorted = [...checkpoints].sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);

    // 计算总存储空间
    let totalSize = 0;
    for (const checkpoint of sorted) {
      const size = this.checkpointSizes.get(checkpoint.checkpointId) || 0;
      totalSize += size;
    }

    // 如果总存储空间不超过最大值，不需要删除
    if (totalSize <= maxSize) {
      return [];
    }

    // 从最旧的检查点开始删除，直到满足空间要求
    const toDelete: string[] = [];
    let currentSize = totalSize;

    for (let i = sorted.length - 1; i >= 0; i--) {
      const checkpoint = sorted[i];
      if (!checkpoint) continue;
      
      const checkpointId = checkpoint.checkpointId;
      const size = this.checkpointSizes.get(checkpointId) || 0;

      // 确保至少保留minRetention个检查点
      if (i < minRetention) {
        break;
      }

      // 删除检查点
      toDelete.push(checkpointId);
      currentSize -= size;

      // 如果已经满足空间要求，停止删除
      if (currentSize <= maxSize) {
        break;
      }
    }

    return toDelete;
  }
}

/**
 * 创建清理策略实例
 * 
 * @param policy 清理策略配置
 * @param checkpointSizes 检查点大小映射（仅用于基于空间的策略）
 * @returns 清理策略实例
 */
export function createCleanupStrategy(
  policy: CleanupPolicy,
  checkpointSizes?: Map<string, number>
): CheckpointCleanupStrategy {
  switch (policy.type) {
    case 'time':
      return new TimeBasedCleanupStrategy(policy);
    case 'count':
      return new CountBasedCleanupStrategy(policy);
    case 'size':
      if (!checkpointSizes) {
        throw new Error('Size-based cleanup policy requires checkpointSizes parameter');
      }
      return new SizeBasedCleanupStrategy(policy, checkpointSizes);
    default:
      throw new Error(`Unknown cleanup policy type: ${(policy as any).type}`);
  }
}

// 重新导出类型（为了向后兼容）
export type {
  CheckpointInfo,
  CleanupPolicy,
  CleanupStrategyType,
  TimeBasedCleanupPolicy,
  CountBasedCleanupPolicy,
  SizeBasedCleanupPolicy,
  CheckpointCleanupStrategy
} from '../../../types/checkpoint-storage';
