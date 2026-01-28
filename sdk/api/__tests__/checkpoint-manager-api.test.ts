/**
 * CheckpointManagerAPI 单元测试
 */

import { CheckpointManagerAPI } from '../checkpoint-manager-api';
import { CheckpointManager } from '../../core/execution/managers/checkpoint-manager';
import { ThreadRegistry } from '../../core/registry/thread-registry';
import { WorkflowRegistry } from '../../core/registry/workflow-registry';
import type { WorkflowDefinition } from '../../types/workflow';
import { NodeType } from '../../types/node';
import { EdgeType } from '../../types/edge';
import { ThreadStatus } from '../../types/thread';
import { NotFoundError } from '../../types/errors';

describe('CheckpointManagerAPI', () => {
  let api: CheckpointManagerAPI;
  let checkpointManager: CheckpointManager;
  let threadRegistry: ThreadRegistry;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry({ enableVersioning: false });
    checkpointManager = new CheckpointManager(undefined, threadRegistry, workflowRegistry);
    api = new CheckpointManagerAPI(checkpointManager);
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
      const threadContext = await createTestThreadContext(threadRegistry, workflow);
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

      const threadContext = await createTestThreadContext(threadRegistry, workflow);
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

      const threadContext = await createTestThreadContext(threadRegistry, workflow);
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

      const threadContext1 = await createTestThreadContext(threadRegistry, workflow);
      const threadContext2 = await createTestThreadContext(threadRegistry, workflow);
      const threadId1 = threadContext1.getThreadId();
      const threadId2 = threadContext2.getThreadId();

      await api.createCheckpoint(threadId1);
      await api.createCheckpoint(threadId2);

      const checkpoints = await api.getCheckpoints({ threadId: threadId1 });

      expect(checkpoints).toBeDefined();
      expect(checkpoints.length).toBe(1);
      expect(checkpoints[0].threadId).toBe(threadId1);
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

      const threadContext = await createTestThreadContext(threadRegistry, workflow);
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

  describe('enablePeriodicCheckpoints', () => {
    it('应该成功启用定期检查点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-6',
        name: 'Test Workflow 6',
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

      const threadContext = await createTestThreadContext(threadRegistry, workflow);
      const threadId = threadContext.getThreadId();

      const timerId = await api.enablePeriodicCheckpoints(threadId, 1000);

      expect(timerId).toBeDefined();

      // 清理定时器
      await api.disablePeriodicCheckpoints(timerId);
    });
  });

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

      const threadContext = await createTestThreadContext(threadRegistry, workflow);
      const threadId = threadContext.getThreadId();

      const checkpoint = await api.createNodeCheckpoint(threadId, 'start');

      expect(checkpoint).toBeDefined();
      expect(checkpoint.metadata?.customFields?.nodeId).toBe('start');
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

      const threadContext = await createTestThreadContext(threadRegistry, workflow);
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

      const threadContext = await createTestThreadContext(threadRegistry, workflow);
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
  workflow: WorkflowDefinition
) {
  const { ThreadContext } = await import('../../core/execution/context/thread-context');
  const { WorkflowContext } = await import('../../core/execution/context/workflow-context');
  const { ConversationManager } = await import('../../core/execution/conversation');
  const { LLMExecutor } = await import('../../core/execution/llm-executor');
  const { generateId } = await import('../../utils');

  const workflowContext = new WorkflowContext(workflow);
  const conversationManager = new ConversationManager();
  const llmExecutor = new LLMExecutor(conversationManager);

  const thread = {
    id: generateId(),
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    status: ThreadStatus.RUNNING,
    currentNodeId: 'start',
    variables: [],
    variableValues: {},
    input: {},
    output: {},
    nodeResults: [],
    startTime: Date.now(),
    errors: []
  };

  const threadContext = new ThreadContext(thread, workflowContext, llmExecutor);
  threadRegistry.register(threadContext);

  return threadContext;
}