/**
 * CheckpointCleanupPolicy 单元测试
 * 测试检查点清理策略的实现
 */

import { describe, it, expect } from 'vitest';
import {
  TimeBasedCleanupStrategy,
  CountBasedCleanupStrategy,
  SizeBasedCleanupStrategy,
  createCleanupStrategy
} from '../checkpoint-cleanup-policy.js';
import type { CheckpointInfo, TimeBasedCleanupPolicy, CountBasedCleanupPolicy, SizeBasedCleanupPolicy } from '@modular-agent/types';

/**
 * 创建模拟 CheckpointInfo
 */
function createMockCheckpoint(checkpointId: string, ageInDays: number): CheckpointInfo {
  const timestamp = Date.now() - (ageInDays * 24 * 60 * 60 * 1000);
  return {
    checkpointId,
    threadId: 'test-thread',
    nodeId: 'test-node',
    metadata: {
      timestamp,
      workflowId: 'test-workflow',
      status: 'COMPLETED'
    }
  };
}

describe('TimeBasedCleanupStrategy', () => {
  describe('execute', () => {
    it('应该删除超过保留时间的检查点', () => {
      // 准备测试数据：保留 2 天，有 3 个检查点（1 天、3 天、5 天前）
      const policy: TimeBasedCleanupPolicy = {
        type: 'time',
        retentionDays: 2,
        minRetention: 0
      };
      const strategy = new TimeBasedCleanupStrategy(policy);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1), // 1 天前，应该保留
        createMockCheckpoint('cp-2', 3), // 3 天前，应该删除
        createMockCheckpoint('cp-3', 5)  // 5 天前，应该删除
      ];

      // 执行测试
      const toDelete = strategy.execute(checkpoints);

      // 验证结果
      expect(toDelete).toHaveLength(2);
      expect(toDelete).toContain('cp-2');
      expect(toDelete).toContain('cp-3');
      expect(toDelete).not.toContain('cp-1');
    });

    it('应该保留 minRetention 指定的最少检查点数量', () => {
      // 准备测试数据：保留 1 天，最少保留 2 个检查点
      const policy: TimeBasedCleanupPolicy = {
        type: 'time',
        retentionDays: 1,
        minRetention: 2
      };
      const strategy = new TimeBasedCleanupStrategy(policy);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 0.5), // 0.5 天前
        createMockCheckpoint('cp-2', 2),   // 2 天前
        createMockCheckpoint('cp-3', 3),   // 3 天前
        createMockCheckpoint('cp-4', 4)    // 4 天前
      ];

      // 执行测试
      const toDelete = strategy.execute(checkpoints);

      // 验证结果：虽然 cp-2, cp-3, cp-4 都超过 1 天，但要保留最新的 2 个
      expect(toDelete).toHaveLength(2);
      expect(toDelete).toContain('cp-3');
      expect(toDelete).toContain('cp-4');
      expect(toDelete).not.toContain('cp-1');
      expect(toDelete).not.toContain('cp-2');
    });

    it('当没有检查点超过保留时间时，不删除任何检查点', () => {
      const policy: TimeBasedCleanupPolicy = {
        type: 'time',
        retentionDays: 10,
        minRetention: 0
      };
      const strategy = new TimeBasedCleanupStrategy(policy);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1),
        createMockCheckpoint('cp-2', 2),
        createMockCheckpoint('cp-3', 3)
      ];

      const toDelete = strategy.execute(checkpoints);

      expect(toDelete).toHaveLength(0);
    });

    it('当所有检查点都超过保留时间但 minRetention 保护时，只删除允许的部分', () => {
      const policy: TimeBasedCleanupPolicy = {
        type: 'time',
        retentionDays: 1,
        minRetention: 3
      };
      const strategy = new TimeBasedCleanupStrategy(policy);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 2),
        createMockCheckpoint('cp-2', 3),
        createMockCheckpoint('cp-3', 4),
        createMockCheckpoint('cp-4', 5)
      ];

      const toDelete = strategy.execute(checkpoints);

      // 所有检查点都超过 1 天，但要保留最新的 3 个
      expect(toDelete).toHaveLength(1);
      expect(toDelete).toContain('cp-4');
    });

    it('应该正确处理空检查点数组', () => {
      const policy: TimeBasedCleanupPolicy = {
        type: 'time',
        retentionDays: 1,
        minRetention: 0
      };
      const strategy = new TimeBasedCleanupStrategy(policy);

      const toDelete = strategy.execute([]);

      expect(toDelete).toHaveLength(0);
    });
  });
});

describe('CountBasedCleanupStrategy', () => {
  describe('execute', () => {
    it('当检查点数量不超过最大值时，不删除任何检查点', () => {
      const policy: CountBasedCleanupPolicy = {
        type: 'count',
        maxCount: 5,
        minRetention: 0
      };
      const strategy = new CountBasedCleanupStrategy(policy);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1),
        createMockCheckpoint('cp-2', 2),
        createMockCheckpoint('cp-3', 3)
      ];

      const toDelete = strategy.execute(checkpoints);

      expect(toDelete).toHaveLength(0);
    });

    it('当检查点数量超过最大值时，删除最旧的检查点', () => {
      const policy: CountBasedCleanupPolicy = {
        type: 'count',
        maxCount: 2,
        minRetention: 0
      };
      const strategy = new CountBasedCleanupStrategy(policy);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1), // 最新
        createMockCheckpoint('cp-2', 2),
        createMockCheckpoint('cp-3', 3), // 最旧
        createMockCheckpoint('cp-4', 4)  // 最旧
      ];

      const toDelete = strategy.execute(checkpoints);

      // 应该删除最旧的 2 个
      expect(toDelete).toHaveLength(2);
      expect(toDelete).toContain('cp-3');
      expect(toDelete).toContain('cp-4');
      expect(toDelete).not.toContain('cp-1');
      expect(toDelete).not.toContain('cp-2');
    });

    it('应该保留 minRetention 指定的最少检查点数量', () => {
      const policy: CountBasedCleanupPolicy = {
        type: 'count',
        maxCount: 1,
        minRetention: 3
      };
      const strategy = new CountBasedCleanupStrategy(policy);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1),
        createMockCheckpoint('cp-2', 2),
        createMockCheckpoint('cp-3', 3),
        createMockCheckpoint('cp-4', 4),
        createMockCheckpoint('cp-5', 5)
      ];

      const toDelete = strategy.execute(checkpoints);

      // 虽然 maxCount=1，但 minRetention=3，所以只能删除 2 个
      expect(toDelete).toHaveLength(2);
      expect(toDelete).toContain('cp-4');
      expect(toDelete).toContain('cp-5');
    });

    it('应该正确处理空检查点数组', () => {
      const policy: CountBasedCleanupPolicy = {
        type: 'count',
        maxCount: 5,
        minRetention: 0
      };
      const strategy = new CountBasedCleanupStrategy(policy);

      const toDelete = strategy.execute([]);

      expect(toDelete).toHaveLength(0);
    });
  });
});

describe('SizeBasedCleanupStrategy', () => {
  describe('execute', () => {
    it('当总大小不超过最大值时，不删除任何检查点', () => {
      const policy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 1000,
        minRetention: 0
      };
      const checkpointSizes = new Map<string, number>([
        ['cp-1', 100],
        ['cp-2', 200],
        ['cp-3', 300]
      ]);
      const strategy = new SizeBasedCleanupStrategy(policy, checkpointSizes);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1),
        createMockCheckpoint('cp-2', 2),
        createMockCheckpoint('cp-3', 3)
      ];

      const toDelete = strategy.execute(checkpoints);

      expect(toDelete).toHaveLength(0);
    });

    it('当总大小超过最大值时，从最旧的检查点开始删除', () => {
      const policy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 300,
        minRetention: 0
      };
      const checkpointSizes = new Map<string, number>([
        ['cp-1', 100], // 最新
        ['cp-2', 150],
        ['cp-3', 200], // 最旧
        ['cp-4', 150]  // 最旧
      ]);
      const strategy = new SizeBasedCleanupStrategy(policy, checkpointSizes);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1),
        createMockCheckpoint('cp-2', 2),
        createMockCheckpoint('cp-3', 3),
        createMockCheckpoint('cp-4', 4)
      ];

      const toDelete = strategy.execute(checkpoints);

      // 总大小 600，需要删除到 300 以下
      // 删除 cp-4 (150) -> 450
      // 删除 cp-3 (200) -> 250 <= 300，停止
      expect(toDelete).toHaveLength(2);
      expect(toDelete).toContain('cp-3');
      expect(toDelete).toContain('cp-4');
    });

    it('应该保留 minRetention 指定的最少检查点数量', () => {
      const policy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 100,
        minRetention: 2
      };
      const checkpointSizes = new Map<string, number>([
        ['cp-1', 100],
        ['cp-2', 100],
        ['cp-3', 100],
        ['cp-4', 100]
      ]);
      const strategy = new SizeBasedCleanupStrategy(policy, checkpointSizes);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1),
        createMockCheckpoint('cp-2', 2),
        createMockCheckpoint('cp-3', 3),
        createMockCheckpoint('cp-4', 4)
      ];

      const toDelete = strategy.execute(checkpoints);

      // 总大小 400，需要删除到 100 以下，但要保留最新的 2 个
      // 只能删除 cp-3 和 cp-4
      expect(toDelete).toHaveLength(2);
      expect(toDelete).toContain('cp-3');
      expect(toDelete).toContain('cp-4');
    });

    it('对于不在 checkpointSizes 中的检查点，使用 0 作为大小', () => {
      const policy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 100,
        minRetention: 0
      };
      const checkpointSizes = new Map<string, number>([
        ['cp-1', 100]
      ]);
      const strategy = new SizeBasedCleanupStrategy(policy, checkpointSizes);

      const checkpoints: CheckpointInfo[] = [
        createMockCheckpoint('cp-1', 1),
        createMockCheckpoint('cp-2', 2) // 不在 checkpointSizes 中
      ];

      const toDelete = strategy.execute(checkpoints);

      // cp-2 大小为 0，总大小 100，不需要删除
      expect(toDelete).toHaveLength(0);
    });

    it('应该正确处理空检查点数组', () => {
      const policy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 100,
        minRetention: 0
      };
      const checkpointSizes = new Map<string, number>();
      const strategy = new SizeBasedCleanupStrategy(policy, checkpointSizes);

      const toDelete = strategy.execute([]);

      expect(toDelete).toHaveLength(0);
    });
  });
});

describe('createCleanupStrategy', () => {
  it('应该创建 TimeBasedCleanupStrategy 实例', () => {
    const policy: TimeBasedCleanupPolicy = {
      type: 'time',
      retentionDays: 7,
      minRetention: 0
    };

    const strategy = createCleanupStrategy(policy);

    expect(strategy).toBeInstanceOf(TimeBasedCleanupStrategy);
  });

  it('应该创建 CountBasedCleanupStrategy 实例', () => {
    const policy: CountBasedCleanupPolicy = {
      type: 'count',
      maxCount: 10,
      minRetention: 0
    };

    const strategy = createCleanupStrategy(policy);

    expect(strategy).toBeInstanceOf(CountBasedCleanupStrategy);
  });

  it('应该创建 SizeBasedCleanupStrategy 实例', () => {
    const policy: SizeBasedCleanupPolicy = {
      type: 'size',
      maxSizeBytes: 1000,
      minRetention: 0
    };
    const checkpointSizes = new Map<string, number>();

    const strategy = createCleanupStrategy(policy, checkpointSizes);

    expect(strategy).toBeInstanceOf(SizeBasedCleanupStrategy);
  });

  it('当 size 策略没有提供 checkpointSizes 时抛出错误', () => {
    const policy: SizeBasedCleanupPolicy = {
      type: 'size',
      maxSizeBytes: 1000,
      minRetention: 0
    };

    expect(() => createCleanupStrategy(policy)).toThrow('Size-based cleanup policy requires checkpointSizes parameter');
  });

  it('当策略类型未知时抛出错误', () => {
    const policy = { type: 'unknown' } as any;

    expect(() => createCleanupStrategy(policy)).toThrow('Unknown cleanup policy type: unknown');
  });
});
