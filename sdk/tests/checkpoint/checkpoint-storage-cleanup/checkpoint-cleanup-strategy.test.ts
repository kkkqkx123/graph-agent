/**
 * 检查点清理策略集成测试
 * 
 * 测试范围：
 * - 时间基础清理策略
 * - 数量基础清理策略  
 * - 空间基础清理策略
 * - 最少保留数量保护机制
 */

import { CheckpointStateManager } from '@modular-agent/sdk/core/execution/managers/checkpoint-state-manager';
import { MemoryCheckpointStorage } from '../../core/storage/memory-checkpoint-storage';
import { GlobalMessageStorage } from '../../core/services/global-message-storage';
import { ThreadRegistry } from '../../../core/services/thread-registry';
import { WorkflowRegistry } from '@modular-agent/sdk/core/services/workflow-registry';
import { ThreadBuilder } from '@modular-agent/sdk/core/execution/thread-builder';
import { CheckpointCoordinator } from '../../core/execution/coordinators/checkpoint-coordinator';
import type { CleanupPolicy } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { EdgeType } from '@modular-agent/types';

describe('检查点清理策略集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let threadRegistry: ThreadRegistry;
  let globalMessageStorage: GlobalMessageStorage;
  let checkpointStorage: MemoryCheckpointStorage;
  let checkpointStateManager: CheckpointStateManager;

  beforeAll(async () => {
    // 注册测试脚本
    const { codeService } = await import('../../../core/services/code-service');
    const { ScriptType } = await import('../../../types/code');
    const { generateId } = await import('../../../utils/id-utils');

    const javascriptExecutor: import('../../../types/code').ScriptExecutor = {
      async execute(script, options) {
        try {
          const result = eval(script.content || '');
          return {
            success: true,
            scriptName: script.name,
            scriptType: script.type,
            stdout: JSON.stringify(result),
            executionTime: 0
          };
        } catch (error) {
          return {
            success: false,
            scriptName: script.name,
            scriptType: script.type,
            stderr: String(error),
            executionTime: 0
          };
        }
      },
      validate(script) {
        if (!script.content && !script.filePath) {
          return { valid: false, errors: ['脚本内容或文件路径必须提供'] };
        }
        return { valid: true, errors: [] };
      },
      getSupportedTypes() {
        return [ScriptType.JAVASCRIPT];
      }
    };

    codeService.registerExecutor(ScriptType.JAVASCRIPT, javascriptExecutor);

    const testProcessScript = {
      id: generateId(),
      name: 'test-process',
      type: ScriptType.JAVASCRIPT,
      content: 'return { processed: true };',
      description: 'Test process script',
      options: {}
    };

    codeService.registerScript(testProcessScript);
  });

  beforeEach(() => {
    workflowRegistry = new WorkflowRegistry();
    threadRegistry = new ThreadRegistry();
    globalMessageStorage = new GlobalMessageStorage();
    checkpointStorage = new MemoryCheckpointStorage();
    checkpointStateManager = new CheckpointStateManager(checkpointStorage);
  });

  /**
   * 创建测试工作流
   */
  const createTestWorkflow = (id: string): any => ({
    id,
    name: `Test Workflow ${id}`,
    version: '1.0.0',
    nodes: [
      {
        id: `${id}-start`,
        type: NodeType.START,
        name: 'Start',
        config: {},
        outgoingEdgeIds: [`${id}-edge-1`],
        incomingEdgeIds: []
      },
      {
        id: `${id}-process`,
        type: NodeType.CODE,
        name: 'Process',
        config: {
          scriptName: 'test-process',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-2`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
      }
    ],
    variables: [],
    triggers: [],
    config: {
      timeout: 60000,
      maxSteps: 1000,
      toolApproval: {
        autoApprovedTools: []
      }
    },
    metadata: {},
    availableTools: { initial: new Set() },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建多个检查点用于测试
   */
  const createMultipleCheckpoints = async (
    workflowId: string,
    count: number,
    intervalMs: number = 1000
  ): Promise<string[]> => {
    const workflow = createTestWorkflow(workflowId);
    workflowRegistry.register(workflow);

    const threadBuilder = new ThreadBuilder(workflowRegistry);
    const threadContext = await threadBuilder.build(workflowId);
    threadRegistry.register(threadContext);

    const dependencies = {
      threadRegistry,
      checkpointStateManager,
      workflowRegistry,
      globalMessageStorage
    };

    const checkpointIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        { description: `Checkpoint ${i + 1} for cleanup test` }
      );
      checkpointIds.push(checkpointId);

      // 模拟时间间隔
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    return checkpointIds;
  };

  describe('场景1: 时间基础清理策略', () => {
    it('应该正确清理超过保留时间的检查点', async () => {
      // 创建3个检查点，间隔2秒
      const checkpointIds = await createMultipleCheckpoints('time-cleanup-test', 3, 2000);

      // 设置清理策略：保留1秒，最少保留1个
      const cleanupPolicy: CleanupPolicy = {
        type: 'time',
        retentionDays: 0, // 0天
        minRetention: 1
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);

      // 执行清理
      const cleanupResult = await checkpointStateManager.executeCleanup();

      // 验证结果
      expect(cleanupResult.deletedCount).toBe(2); // 删除前2个（最旧的）
      expect(cleanupResult.remainingCount).toBe(1); // 保留最新的1个

      // 验证保留的检查点存在
      const remainingIds = await checkpointStateManager.list();
      expect(remainingIds).toHaveLength(1);
      expect(remainingIds[0]).toBe(checkpointIds[2]); // 最新的检查点
    });

    it('应该尊重最少保留数量配置', async () => {
      // 创建2个检查点
      const checkpointIds = await createMultipleCheckpoints('min-retention-test', 2, 1000);

      // 设置清理策略：保留0天，最少保留2个
      const cleanupPolicy: CleanupPolicy = {
        type: 'time',
        retentionDays: 0,
        minRetention: 2
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);

      // 执行清理
      const cleanupResult = await checkpointStateManager.executeCleanup();

      // 验证结果：不应该删除任何检查点，因为minRetention=2
      expect(cleanupResult.deletedCount).toBe(0);
      expect(cleanupResult.remainingCount).toBe(2);
    });
  });

  describe('场景2: 数量基础清理策略', () => {
    it('应该正确限制最大检查点数量', async () => {
      // 创建5个检查点
      const checkpointIds = await createMultipleCheckpoints('count-cleanup-test', 5, 500);

      // 设置清理策略：最大3个，最少保留1个
      const cleanupPolicy: CleanupPolicy = {
        type: 'count',
        maxCount: 3,
        minRetention: 1
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);

      // 执行清理
      const cleanupResult = await checkpointStateManager.executeCleanup();

      // 验证结果
      expect(cleanupResult.deletedCount).toBe(2); // 删除最旧的2个
      expect(cleanupResult.remainingCount).toBe(3); // 保留最新的3个

      // 验证保留的检查点是最新的3个
      const remainingIds = await checkpointStateManager.list();
      expect(remainingIds).toHaveLength(3);
      expect(remainingIds).toEqual([checkpointIds[4], checkpointIds[3], checkpointIds[2]]);
    });

    it('应该在检查点数量未超过限制时不执行清理', async () => {
      // 创建2个检查点
      await createMultipleCheckpoints('count-no-cleanup-test', 2, 500);

      // 设置清理策略：最大5个
      const cleanupPolicy: CleanupPolicy = {
        type: 'count',
        maxCount: 5
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);

      // 执行清理
      const cleanupResult = await checkpointStateManager.executeCleanup();

      // 验证结果：不应该删除任何检查点
      expect(cleanupResult.deletedCount).toBe(0);
      expect(cleanupResult.remainingCount).toBe(2);
    });
  });

  describe('场景3: 空间基础清理策略', () => {
    it('应该正确限制存储空间使用', async () => {
      // 创建3个检查点（每个大约几KB）
      const checkpointIds = await createMultipleCheckpoints('size-cleanup-test', 3, 500);

      // 获取当前总大小
      let totalSize = 0;
      for (const checkpointId of checkpointIds) {
        const data = await checkpointStorage.load(checkpointId);
        if (data) {
          totalSize += data.length;
        }
      }

      // 设置清理策略：最大空间为总大小的60%，最少保留1个
      const cleanupPolicy: CleanupPolicy = {
        type: 'size',
        maxSizeBytes: Math.floor(totalSize * 0.6),
        minRetention: 1
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);

      // 执行清理
      const cleanupResult = await checkpointStateManager.executeCleanup();

      // 验证结果：应该删除一些检查点以满足空间限制
      expect(cleanupResult.deletedCount).toBeGreaterThanOrEqual(1);
      expect(cleanupResult.remainingCount).toBeLessThan(3);
      expect(cleanupResult.remainingCount).toBeGreaterThanOrEqual(1); // minRetention保护
    });
  });

  describe('场景4: 清理策略组合和边界情况', () => {
    it('应该正确处理空的检查点列表', async () => {
      // 不创建任何检查点
      const cleanupPolicy: CleanupPolicy = {
        type: 'time',
        retentionDays: 1
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);

      // 执行清理
      const cleanupResult = await checkpointStateManager.executeCleanup();

      // 验证结果
      expect(cleanupResult.deletedCount).toBe(0);
      expect(cleanupResult.remainingCount).toBe(0);
      expect(cleanupResult.freedSpaceBytes).toBe(0);
    });

    it('应该支持动态切换清理策略', async () => {
      // 创建3个检查点
      await createMultipleCheckpoints('strategy-switch-test', 3, 500);

      // 先使用数量策略
      let cleanupPolicy: CleanupPolicy = {
        type: 'count',
        maxCount: 2
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);
      let cleanupResult = await checkpointStateManager.executeCleanup();
      expect(cleanupResult.remainingCount).toBe(2);

      // 切换到时间策略
      cleanupPolicy = {
        type: 'time',
        retentionDays: 0,
        minRetention: 1
      };

      checkpointStateManager.setCleanupPolicy(cleanupPolicy);
      cleanupResult = await checkpointStateManager.executeCleanup();
      expect(cleanupResult.remainingCount).toBe(1);
    });
  });
});