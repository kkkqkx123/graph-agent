/**
 * 检查点工具函数测试
 */

import {
  createCheckpoint,
  createCheckpoints,
  createNodeCheckpoint,
  createToolCheckpoint
} from '../checkpoint-utils';
import { CheckpointCoordinator } from '../../../coordinators/checkpoint-coordinator';
import { CheckpointStateManager } from '../../../managers/checkpoint-state-manager';
import { ThreadRegistry } from '../../../../services/thread-registry';
import { WorkflowRegistry } from '../../../../services/workflow-registry';
import { globalMessageStorage } from '../../../../services/global-message-storage';
import type { ThreadContext } from '../../../context/thread-context';

describe('CheckpointUtils', () => {
  let mockThreadRegistry: jest.Mocked<ThreadRegistry>;
  let mockCheckpointStateManager: jest.Mocked<CheckpointStateManager>;
  let mockWorkflowRegistry: jest.Mocked<WorkflowRegistry>;
  let mockThreadContext: jest.Mocked<ThreadContext>;
  let mockThread: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建 mock 实例
    mockCheckpointStateManager = {
      create: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      clearAll: jest.fn()
    } as any;

    mockThreadRegistry = {
      register: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      clear: jest.fn(),
      has: jest.fn()
    } as any;

    mockWorkflowRegistry = {
      register: jest.fn(),
      get: jest.fn(),
      unregister: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      size: jest.fn()
    } as any;

    // 创建 mock Thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      status: 'RUNNING',
      currentNodeId: 'node-1',
      graph: {},
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: { test: 'input' },
      output: { test: 'output' },
      nodeResults: [],
      startTime: Date.now(),
      errors: [],
      metadata: {}
    };

    // 创建 mock ConversationManager
    const mockConversationManager = {
      addMessage: jest.fn(),
      addMessages: jest.fn(),
      getMessages: jest.fn(),
      getAllMessages: jest.fn().mockReturnValue([]),
      clearMessages: jest.fn(),
      getMarkMap: jest.fn(),
      getTokenUsage: jest.fn(),
      getCurrentRequestUsage: jest.fn(),
      getIndexManager: jest.fn(),
      getTokenUsageTracker: jest.fn(),
      cleanup: jest.fn()
    };

    // 创建 mock ThreadContext
    mockThreadContext = {
      thread: mockThread,
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1'),
      getConversationManager: jest.fn().mockReturnValue(mockConversationManager),
      getTriggerStateSnapshot: jest.fn().mockReturnValue(new Map()),
      restoreTriggerState: jest.fn()
    } as any;

    mockThreadRegistry.get.mockReturnValue(mockThreadContext);
    mockWorkflowRegistry.get.mockReturnValue({
      id: 'workflow-1',
      name: 'Test Workflow',
      version: '1.0.0',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  });

  describe('createCheckpoint', () => {
    it('应该成功创建检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createCheckpoint(
        {
          threadId: 'thread-1',
          description: 'Test checkpoint'
        },
        dependencies
      );

      expect(checkpointId).toBe('checkpoint-1');
      expect(mockCheckpointStateManager.create).toHaveBeenCalled();
    });

    it('应该使用节点ID创建检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createCheckpoint(
        {
          threadId: 'thread-1',
          nodeId: 'node-1',
          description: 'Node checkpoint'
        },
        dependencies
      );

      expect(checkpointId).toBe('checkpoint-1');
    });

    it('应该使用工具名称创建检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createCheckpoint(
        {
          threadId: 'thread-1',
          toolName: 'test_tool',
          description: 'Tool checkpoint'
        },
        dependencies
      );

      expect(checkpointId).toBe('checkpoint-1');
    });

    it('应该使用自定义元数据创建检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createCheckpoint(
        {
          threadId: 'thread-1',
          description: 'Custom checkpoint',
          metadata: {
            creator: 'test_user',
            tags: ['test', 'custom'],
            customFields: {
              key1: 'value1',
              key2: 123
            }
          }
        },
        dependencies
      );

      expect(checkpointId).toBe('checkpoint-1');
    });
  });

  describe('createCheckpoints', () => {
    it('应该批量创建检查点', async () => {
      mockCheckpointStateManager.create
        .mockResolvedValueOnce('checkpoint-1')
        .mockResolvedValueOnce('checkpoint-2')
        .mockResolvedValueOnce('checkpoint-3');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointIds = await createCheckpoints(
        [
          { threadId: 'thread-1', description: 'Checkpoint 1' },
          { threadId: 'thread-1', description: 'Checkpoint 2' },
          { threadId: 'thread-1', description: 'Checkpoint 3' }
        ],
        dependencies
      );

      expect(checkpointIds).toEqual(['checkpoint-1', 'checkpoint-2', 'checkpoint-3']);
      expect(mockCheckpointStateManager.create).toHaveBeenCalledTimes(3);
    });

    it('应该并行创建检查点', async () => {
      let callOrder: string[] = [];
      mockCheckpointStateManager.create.mockImplementation(async () => {
        callOrder.push('called');
        await new Promise(resolve => setTimeout(resolve, 10));
        return `checkpoint-${callOrder.length}`;
      });

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const startTime = Date.now();
      await createCheckpoints(
        [
          { threadId: 'thread-1', description: 'Checkpoint 1' },
          { threadId: 'thread-1', description: 'Checkpoint 2' },
          { threadId: 'thread-1', description: 'Checkpoint 3' }
        ],
        dependencies
      );
      const endTime = Date.now();

      // 并行执行应该比串行快
      expect(endTime - startTime).toBeLessThan(30);
    });
  });

  describe('createNodeCheckpoint', () => {
    it('应该创建节点级别检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createNodeCheckpoint(
        'thread-1',
        'node-1',
        dependencies,
        'Node checkpoint'
      );

      expect(checkpointId).toBe('checkpoint-1');
    });

    it('应该使用默认描述创建节点检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createNodeCheckpoint(
        'thread-1',
        'node-1',
        dependencies,
        undefined
      );

      expect(checkpointId).toBe('checkpoint-1');
    });
  });

  describe('createToolCheckpoint', () => {
    it('应该创建工具级别检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createToolCheckpoint(
        'thread-1',
        'test_tool',
        dependencies,
        'Tool checkpoint'
      );

      expect(checkpointId).toBe('checkpoint-1');
    });

    it('应该使用默认描述创建工具检查点', async () => {
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      const dependencies = {
        threadRegistry: mockThreadRegistry,
        checkpointStateManager: mockCheckpointStateManager,
        workflowRegistry: mockWorkflowRegistry,
        globalMessageStorage: globalMessageStorage
      };

      const checkpointId = await createToolCheckpoint(
        'thread-1',
        'test_tool',
        dependencies,
        undefined
      );

      expect(checkpointId).toBe('checkpoint-1');
    });
  });
});