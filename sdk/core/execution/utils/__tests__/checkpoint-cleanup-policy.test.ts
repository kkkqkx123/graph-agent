/**
 * CheckpointCleanupPolicy 单元测试
 */

import {
  TimeBasedCleanupStrategy,
  CountBasedCleanupStrategy,
  SizeBasedCleanupStrategy,
  createCleanupStrategy
} from '../checkpoint-cleanup-policy';
import type {
  CheckpointInfo,
  TimeBasedCleanupPolicy,
  CountBasedCleanupPolicy,
  SizeBasedCleanupPolicy,
  CleanupPolicy
} from '../../../../types/checkpoint-storage';

describe('CheckpointCleanupPolicy', () => {
  // 创建测试用的检查点数据
  const createCheckpoint = (id: string, timestamp: number): CheckpointInfo => ({
    checkpointId: id,
    metadata: {
      threadId: 'test-thread',
      workflowId: 'test-workflow',
      timestamp,
      tags: ['test'],
      customFields: {}
    }
  });

  describe('TimeBasedCleanupStrategy', () => {
    let strategy: TimeBasedCleanupStrategy;
    let policy: TimeBasedCleanupPolicy;

    beforeEach(() => {
      policy = {
        type: 'time',
        retentionDays: 7,
        minRetention: 2
      };
      strategy = new TimeBasedCleanupStrategy(policy);
    });

    it('应该删除超过保留时间的检查点', () => {
      const now = Date.now();
      const oldTimestamp = now - (8 * 24 * 60 * 60 * 1000); // 8天前
      const recentTimestamp = now - (3 * 24 * 60 * 60 * 1000); // 3天前

      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', oldTimestamp),
        createCheckpoint('cp2', recentTimestamp),
        createCheckpoint('cp3', now)
      ];

      const result = strategy.execute(checkpoints);

      // 策略：保留2个最新检查点，删除超过7天的检查点
      // cp3（最新）和cp2（第二新）应该保留（minRetention=2）
      // cp1（8天前）超过保留时间，应该删除
      expect(result).toContain('cp1'); // 应该删除8天前的检查点
      expect(result).not.toContain('cp2'); // 应该保留3天前的检查点
      expect(result).not.toContain('cp3'); // 应该保留最新的检查点
    });

    it('应该至少保留minRetention个检查点', () => {
      const now = Date.now();
      const oldTimestamp = now - (10 * 24 * 60 * 60 * 1000); // 10天前

      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', oldTimestamp),
        createCheckpoint('cp2', oldTimestamp),
        createCheckpoint('cp3', now)
      ];

      const result = strategy.execute(checkpoints);

      // 虽然所有检查点都超过保留时间，但应该至少保留2个最新的检查点
      // cp3（最新）和cp2（第二新）应该保留，cp1（最旧）应该删除
      expect(result).toHaveLength(1); // 只删除1个，保留2个
      expect(result).toContain('cp1'); // 最旧的应该删除
      expect(result).not.toContain('cp2'); // 第二新的应该保留
      expect(result).not.toContain('cp3'); // 最新的应该保留
    });

    it('应该按时间戳升序排序并正确处理未超时的检查点', () => {
      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 1000),
        createCheckpoint('cp2', now),
        createCheckpoint('cp3', now - 500)
      ];

      const result = strategy.execute(checkpoints);

      // 所有检查点都未超过保留时间（7天），所以不应该删除任何检查点
      expect(result).toHaveLength(0);
    });

    it('当没有检查点超过保留时间时应该返回空数组', () => {
      const now = Date.now();
      const recentTimestamp = now - (2 * 24 * 60 * 60 * 1000); // 2天前

      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', recentTimestamp),
        createCheckpoint('cp2', now)
      ];

      const result = strategy.execute(checkpoints);

      expect(result).toHaveLength(0);
    });

    it('当minRetention未设置时应该使用默认值0', () => {
      const policyWithoutMinRetention: TimeBasedCleanupPolicy = {
        type: 'time',
        retentionDays: 1
      };
      const strategyWithoutMin = new TimeBasedCleanupStrategy(policyWithoutMinRetention);

      const now = Date.now();
      const oldTimestamp = now - (2 * 24 * 60 * 60 * 1000); // 2天前

      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', oldTimestamp),
        createCheckpoint('cp2', oldTimestamp)
      ];

      const result = strategyWithoutMin.execute(checkpoints);

      // 没有minRetention限制，应该删除所有超过保留时间的检查点
      expect(result).toHaveLength(2);
    });
  });

  describe('CountBasedCleanupStrategy', () => {
    let strategy: CountBasedCleanupStrategy;
    let policy: CountBasedCleanupPolicy;

    beforeEach(() => {
      policy = {
        type: 'count',
        maxCount: 3,
        minRetention: 1
      };
      strategy = new CountBasedCleanupStrategy(policy);
    });

    it('当检查点数量不超过maxCount时应该返回空数组', () => {
      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 2000),
        createCheckpoint('cp2', now - 1000),
        createCheckpoint('cp3', now)
      ];

      const result = strategy.execute(checkpoints);

      expect(result).toHaveLength(0);
    });

    it('当检查点数量超过maxCount时应该删除最旧的检查点', () => {
      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 4000),
        createCheckpoint('cp2', now - 3000),
        createCheckpoint('cp3', now - 2000),
        createCheckpoint('cp4', now - 1000),
        createCheckpoint('cp5', now)
      ];

      const result = strategy.execute(checkpoints);

      // 应该删除最旧的2个检查点 (5 - 3 = 2)
      expect(result).toContain('cp1');
      expect(result).toContain('cp2');
      expect(result).not.toContain('cp3');
      expect(result).not.toContain('cp4');
      expect(result).not.toContain('cp5');
    });

    it('应该至少保留minRetention个检查点', () => {
      const policyWithHighMin: CountBasedCleanupPolicy = {
        type: 'count',
        maxCount: 2,
        minRetention: 3
      };
      const strategyWithHighMin = new CountBasedCleanupStrategy(policyWithHighMin);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = strategyWithHighMin.execute(checkpoints);

      // 虽然maxCount=2，但minRetention=3，所以只能删除1个
      expect(result).toHaveLength(1);
      expect(result).toContain('cp1'); // 最旧的应该被删除
    });

    it('当minRetention未设置时应该使用默认值0', () => {
      const policyWithoutMin: CountBasedCleanupPolicy = {
        type: 'count',
        maxCount: 2
      };
      const strategyWithoutMin = new CountBasedCleanupStrategy(policyWithoutMin);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 2000),
        createCheckpoint('cp2', now - 1000),
        createCheckpoint('cp3', now)
      ];

      const result = strategyWithoutMin.execute(checkpoints);

      // 没有minRetention限制，应该删除1个检查点
      expect(result).toHaveLength(1);
      expect(result).toContain('cp1');
    });

    it('应该按时间戳降序排序', () => {
      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now - 2000)
      ];

      const result = strategy.execute(checkpoints);

      // 应该删除最旧的1个检查点
      expect(result).toContain('cp1');
      expect(result).not.toContain('cp2');
      expect(result).not.toContain('cp3');
      expect(result).not.toContain('cp4');
    });
  });

  describe('SizeBasedCleanupStrategy', () => {
    let strategy: SizeBasedCleanupStrategy;
    let policy: SizeBasedCleanupPolicy;
    let checkpointSizes: Map<string, number>;

    beforeEach(() => {
      policy = {
        type: 'size',
        maxSizeBytes: 1000,
        minRetention: 1
      };
      checkpointSizes = new Map([
        ['cp1', 400],
        ['cp2', 300],
        ['cp3', 200],
        ['cp4', 100]
      ]);
      strategy = new SizeBasedCleanupStrategy(policy, checkpointSizes);
    });

    it('当总存储空间不超过maxSizeBytes时应该返回空数组', () => {
      const smallPolicy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 2000
      };
      const smallStrategy = new SizeBasedCleanupStrategy(smallPolicy, checkpointSizes);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = smallStrategy.execute(checkpoints);

      expect(result).toHaveLength(0);
    });

    it('当总存储空间不超过maxSizeBytes时应该返回空数组', () => {
      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = strategy.execute(checkpoints);

      // 总大小400+300+200+100=1000，刚好等于maxSizeBytes，不需要删除
      expect(result).toHaveLength(0);
    });

    it('当总存储空间超过maxSizeBytes时应该删除最旧的检查点', () => {
      const largePolicy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 800,
        minRetention: 1
      };
      const largeStrategy = new SizeBasedCleanupStrategy(largePolicy, checkpointSizes);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = largeStrategy.execute(checkpoints);

      // 总大小400+300+200+100=1000，超过maxSizeBytes=800
      // 需要删除最旧的检查点cp1(400)，剩余大小=300+200+100=600，<=800
      expect(result).toHaveLength(1);
      expect(result).toContain('cp1');
    });

    it('应该按时间戳降序排序并从最旧的开始删除', () => {
      const largePolicy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 500
      };
      const largeStrategy = new SizeBasedCleanupStrategy(largePolicy, checkpointSizes);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = largeStrategy.execute(checkpoints);

      // 需要删除检查点直到总大小<=500
      // 删除cp1(400)后，剩余大小=300+200+100=600，仍然>500
      // 删除cp2(300)后，剩余大小=200+100=300，<=500，停止删除
      expect(result).toContain('cp1');
      expect(result).toContain('cp2');
      expect(result).not.toContain('cp3');
      expect(result).not.toContain('cp4');
    });

    it('应该至少保留minRetention个检查点', () => {
      const policyWithHighMin: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 300,
        minRetention: 2
      };
      const strategyWithHighMin = new SizeBasedCleanupStrategy(policyWithHighMin, checkpointSizes);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = strategyWithHighMin.execute(checkpoints);

      // 虽然需要删除到总大小<=300，但必须至少保留2个检查点
      // 保留最新的2个(cp3和cp4)，总大小=200+100=300，刚好满足要求
      expect(result).toContain('cp1');
      expect(result).toContain('cp2');
      expect(result).not.toContain('cp3');
      expect(result).not.toContain('cp4');
    });

    it('当检查点大小未知时应该使用0', () => {
      const unknownSizes = new Map([
        ['cp1', 400],
        ['cp2', 300]
        // cp3和cp4没有大小信息
      ]);
      const unknownStrategy = new SizeBasedCleanupStrategy(policy, unknownSizes);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = unknownStrategy.execute(checkpoints);

      // 总大小=400+300+0+0=700，小于maxSizeBytes=1000，不需要删除
      expect(result).toHaveLength(0);
    });

    it('当minRetention未设置时应该使用默认值0', () => {
      const policyWithoutMin: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 300
      };
      const strategyWithoutMin = new SizeBasedCleanupStrategy(policyWithoutMin, checkpointSizes);

      const now = Date.now();
      const checkpoints: CheckpointInfo[] = [
        createCheckpoint('cp1', now - 3000),
        createCheckpoint('cp2', now - 2000),
        createCheckpoint('cp3', now - 1000),
        createCheckpoint('cp4', now)
      ];

      const result = strategyWithoutMin.execute(checkpoints);

      // 总大小=1000，maxSizeBytes=300
      // 删除cp1(400)后，剩余大小=600
      // 删除cp2(300)后，剩余大小=300，满足空间要求，停止删除
      expect(result).toContain('cp1');
      expect(result).toContain('cp2');
      expect(result).not.toContain('cp3');
      expect(result).not.toContain('cp4');
    });
  });

  describe('createCleanupStrategy', () => {
    it('应该创建TimeBasedCleanupStrategy实例', () => {
      const policy: TimeBasedCleanupPolicy = {
        type: 'time',
        retentionDays: 7
      };

      const strategy = createCleanupStrategy(policy);

      expect(strategy).toBeInstanceOf(TimeBasedCleanupStrategy);
    });

    it('应该创建CountBasedCleanupStrategy实例', () => {
      const policy: CountBasedCleanupPolicy = {
        type: 'count',
        maxCount: 10
      };

      const strategy = createCleanupStrategy(policy);

      expect(strategy).toBeInstanceOf(CountBasedCleanupStrategy);
    });

    it('应该创建SizeBasedCleanupStrategy实例', () => {
      const policy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 1024
      };
      const checkpointSizes = new Map<string, number>();

      const strategy = createCleanupStrategy(policy, checkpointSizes);

      expect(strategy).toBeInstanceOf(SizeBasedCleanupStrategy);
    });

    it('当创建SizeBasedCleanupStrategy时应该提供checkpointSizes参数', () => {
      const policy: SizeBasedCleanupPolicy = {
        type: 'size',
        maxSizeBytes: 1024
      };

      expect(() => {
        createCleanupStrategy(policy);
      }).toThrow('Size-based cleanup policy requires checkpointSizes parameter');
    });

    it('当策略类型未知时应该抛出错误', () => {
      const unknownPolicy = {
        type: 'unknown'
      } as unknown as CleanupPolicy;

      expect(() => {
        createCleanupStrategy(unknownPolicy);
      }).toThrow('Unknown cleanup policy type: unknown');
    });
  });
});