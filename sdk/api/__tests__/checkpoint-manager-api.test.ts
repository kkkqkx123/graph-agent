/**
 * CheckpointResourceAPI 单元测试
 */

import { CheckpointResourceAPI } from '../resources/checkpoints/checkpoint-resource-api';
import { ThreadRegistry } from '@modular-agent/sdk/core/services/thread-registry';
import { WorkflowRegistry } from '@modular-agent/sdk/core/services/workflow-registry';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import { NodeType } from '@modular-agent/types/node';
import { EdgeType } from '@modular-agent/types/edge';
import { ThreadStatus } from '@modular-agent/types/thread';
import { NotFoundError } from '@modular-agent/types/errors';
import { ExecutionContext } from '@modular-agent/sdk/core/execution/context/execution-context';
import { SingletonRegistry } from '@modular-agent/sdk/core/execution/context/singleton-registry';

describe('CheckpointResourceAPI', () => {
  let api: CheckpointResourceAPI;
  let threadRegistry: ThreadRegistry;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry({ enableVersioning: false });
    
    // 注册全局服务
    SingletonRegistry.register('threadRegistry', threadRegistry);
    SingletonRegistry.register('workflowRegistry', workflowRegistry);
    
    // 创建API
    api = new CheckpointResourceAPI();
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
      const result = await api.createThreadCheckpoint(threadId, {
        description: 'Test checkpoint',
        tags: ['test']
      });

      // 验证检查点
      expect(result).toBeDefined();
      const checkpoint = await api.get(result);
      expect(checkpoint).toBeDefined();
      expect(checkpoint?.id).toBe(result);
      expect(checkpoint?.threadId).toBe(threadId);
      expect(checkpoint?.workflowId).toBe(workflow.id);
      expect(checkpoint?.metadata?.description).toBe('Test checkpoint');
      expect(checkpoint?.metadata?.tags).toContain('test');
    });

    it('应该在线程不存在时抛出错误', async () => {
      await expect(api.createThreadCheckpoint('non-existent-thread')).rejects.toThrow();
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

      const checkpointId = await api.createThreadCheckpoint(threadId);
      const retrieved = await api.get(checkpointId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(checkpointId);
    });

    it('应该在检查点不存在时返回null', async () => {
      const result = await api.get('non-existent-checkpoint');
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
      await api.createThreadCheckpoint(threadId);
      await api.createThreadCheckpoint(threadId);

      const result = await api.getAll();
      const checkpoints = result.success ? result.data : [];

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

      await api.createThreadCheckpoint(threadId1);
      await api.createThreadCheckpoint(threadId2);

      const result = await api.getAll({ threadId: threadId1 });
      const checkpoints = result.success ? result.data : [];

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

      const checkpointId = await api.createThreadCheckpoint(threadId);
      await api.delete(checkpointId);

      const retrieved = await api.get(checkpointId);
      expect(retrieved).toBeNull();
    });

    it('应该在检查点不存在时抛出错误', async () => {
      await expect(api.delete('non-existent-checkpoint')).rejects.toThrow();
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

      const checkpointId = await api.createThreadCheckpoint(threadId, {
        customFields: { nodeId: 'start' }
      });

      const checkpoint = await api.get(checkpointId);
      expect(checkpoint).toBeDefined();
      expect((checkpoint?.metadata?.customFields as any)?.nodeId).toBe('start');
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

      const resultBefore = await api.getAll();
      const countBefore = resultBefore.success ? resultBefore.data.length : 0;
      
      await api.createThreadCheckpoint(threadId);
      await api.createThreadCheckpoint(threadId);
      
      const resultAfter = await api.getAll();
      const countAfter = resultAfter.success ? resultAfter.data.length : 0;

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

      await api.createThreadCheckpoint(threadId);
      await api.createThreadCheckpoint(threadId);

      await api.clear();

      const result = await api.getAll();
      const count = result.success ? result.data.length : 0;
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