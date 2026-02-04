/**
 * CheckpointManagerAPI 单元测试
 */

import { CheckpointManagerAPI } from '../management/checkpoint-manager-api';
import { ThreadRegistry } from '../../core/services/thread-registry';
import { WorkflowRegistry } from '../../core/services/workflow-registry';
import type { WorkflowDefinition } from '../../types/workflow';
import { NodeType } from '../../types/node';
import { EdgeType } from '../../types/edge';
import { ThreadStatus } from '../../types/thread';
import { NotFoundError } from '../../types/errors';
import { ExecutionContext } from '../../core/execution/context/execution-context';
import { MemoryCheckpointStorage } from '../../core/storage/memory-checkpoint-storage';
import { CheckpointStateManager } from '../../core/execution/managers/checkpoint-state-manager';
import { CheckpointCoordinator } from '../../core/execution/coordinators/checkpoint-coordinator';
import { globalMessageStorage } from '../../core/services/global-message-storage';

describe('CheckpointManagerAPI', () => {
  let api: CheckpointManagerAPI;
  let threadRegistry: ThreadRegistry;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry({ enableVersioning: false });
    
    // 创建检查点存储和状态管理器
    const storage = new MemoryCheckpointStorage();
    const stateManager = new CheckpointStateManager(storage);
    
    // 创建检查点协调器
    const coordinator = new CheckpointCoordinator(
      stateManager,
      threadRegistry,
      workflowRegistry,
      globalMessageStorage
    );
    
    // 使用协调器创建API
    api = new CheckpointManagerAPI(coordinator, stateManager);
  });

  describe('createCheckpoint', () => {
    it('应该成功创建检查点', async () => {
      // 创建并注册工作流
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      // 创建线程上下文
      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      // 创建检查点
      const checkpoint = await api.createCheckpoint(threadId, {
        description: 'Test checkpoint',
        tags: ['test']
      });

      // 验证检查点
      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.threadId).toBe(threadId);
      expect(checkpoint.workflowId).toBe(workflow.id);
      expect(checkpoint.metadata?.description).toBe('Test checkpoint');
      expect(checkpoint.metadata?.tags).toContain('test');
    });

    it('应该在线程不存在时抛出错误', async () => {
      await expect(api.createCheckpoint('non-existent-thread')).rejects.toThrow();
    });
  });

  describe('getCheckpoint', () => {
    it('应该成功获取检查点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-2',
        name: 'Test Workflow 2',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      const checkpoint = await api.createCheckpoint(threadId);
      const retrieved = await api.getCheckpoint(checkpoint.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(checkpoint.id);
    });

    it('应该在检查点不存在时返回null', async () => {
      const result = await api.getCheckpoint('non-existent-checkpoint');
      expect(result).toBeNull();
    });
  });

  describe('getCheckpoints', () => {
    it('应该成功获取检查点列表', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-3',
        name: 'Test Workflow 3',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      // 创建多个检查点
      await api.createCheckpoint(threadId);
      await api.createCheckpoint(threadId);

      const checkpoints = await api.getCheckpoints();

      expect(checkpoints).toBeDefined();
      expect(checkpoints.length).toBeGreaterThanOrEqual(2);
    });

    it('应该支持按线程ID过滤', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-4',
        name: 'Test Workflow 4',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      const threadContext1 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadContext2 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId1 = threadContext1.getThreadId();
      const threadId2 = threadContext2.getThreadId();

      await api.createCheckpoint(threadId1);
      await api.createCheckpoint(threadId2);

      const checkpoints = await api.getCheckpoints({ threadId: threadId1 });

      expect(checkpoints).toBeDefined();
      expect(checkpoints.length).toBe(1);
      const firstCheckpoint = checkpoints[0]!;
      expect(firstCheckpoint.threadId).toBe(threadId1);
    });
  });

  describe('deleteCheckpoint', () => {
    it('应该成功删除检查点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-5',
        name: 'Test Workflow 5',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      const checkpoint = await api.createCheckpoint(threadId);
      await api.deleteCheckpoint(checkpoint.id);

      const retrieved = await api.getCheckpoint(checkpoint.id);
      expect(retrieved).toBeNull();
    });

    it('应该在检查点不存在时抛出错误', async () => {
      await expect(api.deleteCheckpoint('non-existent-checkpoint')).rejects.toThrow(NotFoundError);
    });
  });

  // 定期检查点功能已移至 ThreadLifecycleCoordinator，不在 CheckpointManagerAPI 中

  describe('createNodeCheckpoint', () => {
    it('应该成功创建节点级别检查点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-7',
        name: 'Test Workflow 7',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      const checkpoint = await api.createNodeCheckpoint(threadId, 'start');

      expect(checkpoint).toBeDefined();
      expect((checkpoint.metadata?.customFields as any)?.nodeId).toBe('start');
    });
  });

  describe('getCheckpointCount', () => {
    it('应该返回正确的检查点数量', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-8',
        name: 'Test Workflow 8',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      const countBefore = await api.getCheckpointCount();
      await api.createCheckpoint(threadId);
      await api.createCheckpoint(threadId);
      const countAfter = await api.getCheckpointCount();

      expect(countAfter).toBe(countBefore + 2);
    });
  });

  describe('clearAllCheckpoints', () => {
    it('应该成功清空所有检查点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-9',
        name: 'Test Workflow 9',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge1']
          },
          {
            id: 'end',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      await api.createCheckpoint(threadId);
      await api.createCheckpoint(threadId);

      await api.clearAllCheckpoints();

      const count = await api.getCheckpointCount();
      expect(count).toBe(0);
    });
  });
});

/**
 * 辅助函数：创建测试线程上下文
 */
async function createTestThreadContext(
  threadRegistry: ThreadRegistry,
  workflowRegistry: WorkflowRegistry,
  workflow: WorkflowDefinition
) {
  const { ThreadContext } = await import('../../core/execution/context/thread-context');
  const { ConversationManager } = await import('../../core/execution/managers/conversation-manager');
  const { generateId } = await import('../../utils');
  const { GraphBuilder } = await import('../../core/graph/graph-builder');

  const conversationManager = new ConversationManager();
  const graph = GraphBuilder.build(workflow);

  const thread = {
    id: generateId(),
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    status: ThreadStatus.RUNNING,
    currentNodeId: 'start',
    graph,
    variables: [],
    variableScopes: {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    },
    variableValues: {},
    input: {},
    output: {},
    nodeResults: [],
    startTime: Date.now(),
    errors: []
  };

  // 创建自定义单例映射用于测试
  const customSingletons = new Map<string, any>();
  customSingletons.set('threadRegistry', threadRegistry);
  customSingletons.set('workflowRegistry', workflowRegistry);
  
  const executionContext = ExecutionContext.createForTesting(customSingletons);
  const threadContext = new ThreadContext(
    thread,
    conversationManager,
    threadRegistry,
    workflowRegistry,
    {} as any, // eventManager
    {} as any, // toolService
    { executeLLMCall: jest.fn() } as any // llmExecutor
  );
  threadRegistry.register(threadContext);
  // 线程上下文已经在 ExecutionContext.createForTesting 中被注册到正确的 registry

  return threadContext;
}