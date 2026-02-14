/**
 * 检查点存储适配器兼容性集成测试
 * 
 * 测试范围：
 * - 不同存储实现的兼容性验证
 * - 序列化/反序列化兼容性
 * - 存储接口一致性验证
 */

import { CheckpointStateManager } from '@modular-agent/sdk/core/execution/managers/checkpoint-state-manager';
import { MemoryCheckpointStorage } from '../../core/storage/memory-checkpoint-storage';
import { GlobalMessageStorage } from '../../core/services/global-message-storage';
import { ThreadRegistry } from '../../../core/services/thread-registry';
import { WorkflowRegistry } from '@modular-agent/sdk/core/services/workflow-registry';
import { ThreadBuilder } from '@modular-agent/sdk/core/execution/thread-builder';
import { CheckpointCoordinator } from '../../core/execution/coordinators/checkpoint-coordinator';
import type { CheckpointStorage } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { EdgeType } from '@modular-agent/types';

// 自定义存储实现用于测试
class TestCheckpointStorage implements CheckpointStorage {
  private data = new Map<string, { data: Uint8Array; metadata: import('../../../types/checkpoint-storage').CheckpointStorageMetadata }>();

  async save(checkpointId: string, data: Uint8Array, metadata: import('../../../types/checkpoint-storage').CheckpointStorageMetadata): Promise<void> {
    this.data.set(checkpointId, { data, metadata });
  }

  async load(checkpointId: string): Promise<Uint8Array | null> {
    return this.data.get(checkpointId)?.data || null;
  }

  async delete(checkpointId: string): Promise<void> {
    this.data.delete(checkpointId);
  }

  async list(options?: import('../../../types/checkpoint-storage').CheckpointListOptions): Promise<string[]> {
    let entries = Array.from(this.data.entries());

    if (options?.threadId) {
      entries = entries.filter(([_, { metadata }]) => metadata.threadId === options.threadId);
    }
    if (options?.workflowId) {
      entries = entries.filter(([_, { metadata }]) => metadata.workflowId === options.workflowId);
    }
    if (options?.tags?.length) {
      entries = entries.filter(([_, { metadata }]) =>
        metadata.tags?.some(tag => options.tags!.includes(tag))
      );
    }

    entries.sort(([idA, a], [idB, b]) => {
      const timeDiff = b.metadata.timestamp - a.metadata.timestamp;
      if (timeDiff !== 0) return timeDiff;
      return idB.localeCompare(idA);
    });

    const offset = options?.offset || 0;
    const limit = options?.limit !== undefined ? options.limit : entries.length;
    entries = entries.slice(offset, offset + limit);

    return entries.map(([id]) => id);
  }

  async exists(checkpointId: string): Promise<boolean> {
    return this.data.has(checkpointId);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  getCount(): number {
    return this.data.size;
  }
}

describe('检查点存储适配器兼容性集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let threadRegistry: ThreadRegistry;
  let globalMessageStorage: GlobalMessageStorage;

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

  describe('场景1: 内存存储适配器兼容性', () => {
    it('应该正确支持MemoryCheckpointStorage的所有操作', async () => {
      const storage = new MemoryCheckpointStorage();
      const stateManager = new CheckpointStateManager(storage);

      const workflow = createTestWorkflow('memory-test');
      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build('memory-test');
      threadRegistry.register(threadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager: stateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        { description: 'Memory storage test' }
      );

      // 验证存在性
      expect(await storage.exists(checkpointId)).toBe(true);

      // 验证加载
      const loadedData = await storage.load(checkpointId);
      expect(loadedData).not.toBeNull();

      // 验证列表
      const checkpointIds = await storage.list();
      expect(checkpointIds).toContain(checkpointId);

      // 验证删除
      await storage.delete(checkpointId);
      expect(await storage.exists(checkpointId)).toBe(false);
    });
  });

  describe('场景2: 自定义存储适配器兼容性', () => {
    it('应该正确支持自定义存储实现', async () => {
      const storage = new TestCheckpointStorage();
      const stateManager = new CheckpointStateManager(storage);

      const workflow = createTestWorkflow('custom-test');
      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build('custom-test');
      threadRegistry.register(threadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager: stateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        { description: 'Custom storage test' }
      );

      // 验证存在性
      expect(await storage.exists(checkpointId)).toBe(true);

      // 验证加载和反序列化
      const loadedData = await storage.load(checkpointId);
      expect(loadedData).not.toBeNull();

      const { deserializeCheckpoint } = await import('../../../core/execution/utils/checkpoint-serializer');
      const checkpoint = deserializeCheckpoint(loadedData!);
      expect(checkpoint.id).toBe(checkpointId);
      expect(checkpoint.threadId).toBe(threadContext.getThreadId());

      // 验证列表功能
      const checkpointIds = await storage.list({ threadId: threadContext.getThreadId() });
      expect(checkpointIds).toContain(checkpointId);

      // 验证过滤功能
      const workflowCheckpointIds = await storage.list({ workflowId: 'custom-test' });
      expect(workflowCheckpointIds).toContain(checkpointId);

      // 验证删除
      await storage.delete(checkpointId);
      expect(await storage.exists(checkpointId)).toBe(false);
    });
  });

  describe('场景3: 序列化兼容性', () => {
    it('应该保持序列化格式的向后兼容性', async () => {
      const storage = new MemoryCheckpointStorage();
      const stateManager = new CheckpointStateManager(storage);

      const workflow = createTestWorkflow('serialization-test');
      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build('serialization-test');
      threadRegistry.register(threadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager: stateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建包含各种数据类型的检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        {
          description: 'Serialization compatibility test',
          tags: ['test', 'serialization'],
          customFields: {
            numberField: 42,
            stringField: 'test-value',
            booleanField: true,
            arrayField: [1, 2, 3],
            objectField: { nested: 'value' }
          }
        }
      );

      // 验证序列化和反序列化的完整性
      const loadedData = await storage.load(checkpointId);
      const { deserializeCheckpoint } = await import('../../../core/execution/utils/checkpoint-serializer');
      const checkpoint = deserializeCheckpoint(loadedData!);

      expect(checkpoint.metadata?.description).toBe('Serialization compatibility test');
      expect(checkpoint.metadata?.tags).toEqual(['test', 'serialization']);
      expect(checkpoint.metadata?.customFields?.['numberField']).toBe(42);
      expect(checkpoint.metadata?.customFields?.['stringField']).toBe('test-value');
      expect(checkpoint.metadata?.customFields?.['booleanField']).toBe(true);
      expect(checkpoint.metadata?.customFields?.['arrayField']).toEqual([1, 2, 3]);
      expect(checkpoint.metadata?.customFields?.['objectField']).toEqual({ nested: 'value' });
    });
  });
});