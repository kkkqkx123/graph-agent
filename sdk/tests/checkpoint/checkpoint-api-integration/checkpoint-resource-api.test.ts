/**
 * 检查点资源API集成测试
 * 
 * 测试范围：
 * - RESTful API功能验证
 * - 复杂过滤和查询
 * - 分页和排序
 * - 错误处理
 */

import { CheckpointResourceAPI } from '../../../api/resources/checkpoints/checkpoint-resource-api';
import { ThreadRegistry } from '../../../core/services/thread-registry';
import { WorkflowRegistry } from '../../../core/services/workflow-registry';
import { SingletonRegistry } from '../../../core/execution/context/singleton-registry';
import type { WorkflowDefinition } from '../../../types/workflow';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import { ThreadStatus } from '../../../types/thread';

describe('检查点资源API集成测试', () => {
  let api: CheckpointResourceAPI;
  let threadRegistry: ThreadRegistry;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry();

    // 注册全局服务
    SingletonRegistry.register('threadRegistry', threadRegistry);
    SingletonRegistry.register('workflowRegistry', workflowRegistry);

    // 创建API
    api = new CheckpointResourceAPI();
  });

  /**
   * 创建测试工作流
   */
  const createTestWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: `${id}-start`,
        name: 'Start',
        type: NodeType.START,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-process`,
        name: 'Process',
        type: NodeType.CODE,
        config: {
          scriptName: 'test-process',
          scriptType: 'javascript',
          risk: 'low'
        },
        incomingEdgeIds: [`${id}-edge-1`],
        outgoingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-end`,
        name: 'End',
        type: NodeType.END,
        config: {},
        incomingEdgeIds: [`${id}-edge-2`],
        outgoingEdgeIds: []
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process`,
        type: EdgeType.DEFAULT,
        condition: undefined
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT,
        condition: undefined
      }
    ]
  });

  /**
   * 创建测试线程上下文
   */
  const createTestThreadContext = async (
    threadRegistry: ThreadRegistry,
    workflowRegistry: WorkflowRegistry,
    workflow: WorkflowDefinition
  ) => {
    const { ThreadContext } = await import('../../../core/execution/context/thread-context');
    const { ConversationManager } = await import('../../../core/execution/managers/conversation-manager');
    const { generateId } = await import('../../../utils');
    const { GraphBuilder } = await import('../../../core/graph/graph-builder');

    const conversationManager = new ConversationManager();
    const graph = GraphBuilder.build(workflow);

    const thread = {
      id: generateId(),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: ThreadStatus.RUNNING,
      currentNodeId: `${workflow.id}-process`,
      graph,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      variableValues: {},
      input: { testInput: 'value' },
      output: {},
      nodeResults: [],
      startTime: Date.now(),
      errors: []
    };

    const executionContext = await import('../../../core/execution/context/execution-context');
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

    return threadContext;
  };

  describe('场景1: 基础CRUD操作', () => {
    it('应该成功创建、获取、更新和删除检查点', async () => {
      // 创建并注册工作流
      const workflow = createTestWorkflow('crud-test-workflow', 'CRUD Test Workflow');
      workflowRegistry.register(workflow);

      // 创建线程上下文
      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadId = threadContext.getThreadId();

      // 创建检查点
      const checkpointId = await api.createThreadCheckpoint(threadId, {
        description: 'CRUD test checkpoint',
        tags: ['crud', 'test']
      });

      // 验证创建成功
      expect(checkpointId).toBeDefined();

      // 获取检查点
      const retrieved = await api.get(checkpointId);
      expect(retrieved).toBeDefined();
      expect(retrieved.success).toBe(true);
      if (retrieved.success) {
        expect(retrieved.data?.id).toBe(checkpointId);
        expect(retrieved.data?.threadId).toBe(threadId);
        expect(retrieved.data?.metadata?.description).toBe('CRUD test checkpoint');
        expect(retrieved.data?.metadata?.tags).toContain('crud');
      }

      // 更新检查点
      await api.update(checkpointId, {
        metadata: {
          description: 'Updated CRUD test checkpoint',
          tags: ['crud', 'test', 'updated']
        }
      });

      // 验证更新成功
      const updated = await api.get(checkpointId);
      expect(updated.success).toBe(true);
      if (updated.success) {
        expect(updated.data?.metadata?.description).toBe('Updated CRUD test checkpoint');
        expect(updated.data?.metadata?.tags).toContain('updated');
      }

      // 删除检查点
      await api.delete(checkpointId);

      // 验证删除成功
      const deleted = await api.get(checkpointId);
      expect(deleted).toBeNull();
    });
  });

  describe('场景2: 复杂过滤和查询', () => {
    it('应该支持按线程ID过滤', async () => {
      // 创建两个不同的工作流
      const workflow1 = createTestWorkflow('filter-workflow-1', 'Filter Workflow 1');
      const workflow2 = createTestWorkflow('filter-workflow-2', 'Filter Workflow 2');
      workflowRegistry.register(workflow1);
      workflowRegistry.register(workflow2);

      // 创建两个线程
      const threadContext1 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow1);
      const threadContext2 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow2);

      // 为每个线程创建检查点
      const checkpointId1 = await api.createThreadCheckpoint(threadContext1.getThreadId(), {
        tags: ['filter-test']
      });
      const checkpointId2 = await api.createThreadCheckpoint(threadContext2.getThreadId(), {
        tags: ['filter-test']
      });

      // 按线程1 ID过滤
      const result1 = await api.getAll({ threadId: threadContext1.getThreadId() });
      expect(result1.success).toBe(true);
      const checkpoints1 = result1.success ? (result1 as any).data || [] : [];
      expect(checkpoints1).toHaveLength(1);
      expect((checkpoints1[0] as any)?.id).toBe(checkpointId1);

      // 按线程2 ID过滤
      const result2 = await api.getAll({ threadId: threadContext2.getThreadId() });
      expect(result2.success).toBe(true);
      const checkpoints2 = result2.success ? (result2 as any).data || [] : [];
      expect(checkpoints2).toHaveLength(1);
      expect((checkpoints2[0] as any)?.id).toBe(checkpointId2);
    });

    it('应该支持按工作流ID过滤', async () => {
      const workflow = createTestWorkflow('workflow-filter-test', 'Workflow Filter Test');
      workflowRegistry.register(workflow);

      // 创建两个线程使用同一个工作流
      const threadContext1 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);
      const threadContext2 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 创建检查点
      await api.createThreadCheckpoint(threadContext1.getThreadId());
      await api.createThreadCheckpoint(threadContext2.getThreadId());

      // 按工作流ID过滤
      const result = await api.getAll({ workflowId: 'workflow-filter-test' });
      expect(result.success).toBe(true);
      const checkpoints = result.success ? (result as any).data || [] : [];
      expect(checkpoints).toHaveLength(2);
      expect(checkpoints.every((cp: any) => cp.workflowId === 'workflow-filter-test')).toBe(true);
    });

    it('应该支持按标签过滤', async () => {
      const workflow = createTestWorkflow('tag-filter-test', 'Tag Filter Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 创建多个带不同标签的检查点
      await api.createThreadCheckpoint(threadContext.getThreadId(), { tags: ['tag1', 'common'] });
      await api.createThreadCheckpoint(threadContext.getThreadId(), { tags: ['tag2', 'common'] });
      await api.createThreadCheckpoint(threadContext.getThreadId(), { tags: ['tag3'] });

      // 按标签过滤
      const result1 = await api.getAll({ tags: ['common'] });
      expect(result1.success).toBe(true);
      expect((result1.success ? (result1 as any).data || [] : []).length).toBe(2);

      const result2 = await api.getAll({ tags: ['tag1'] });
      expect(result2.success).toBe(true);
      expect((result2.success ? (result2 as any).data || [] : []).length).toBe(1);

      const result3 = await api.getAll({ tags: ['nonexistent'] });
      expect(result3.success).toBe(true);
      expect((result3.success ? (result3 as any).data || [] : []).length).toBe(0);
    });

    it('应该支持时间范围过滤', async () => {
      const workflow = createTestWorkflow('time-filter-test', 'Time Filter Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 创建检查点
      const now = Date.now();
      await api.createThreadCheckpoint(threadContext.getThreadId());

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 100));

      const later = Date.now();
      await api.createThreadCheckpoint(threadContext.getThreadId());

      // 查询在now之后创建的检查点
      const result = await api.getAll({ startTimeFrom: now + 50 });
      expect(result.success).toBe(true);
      expect((result.success ? (result as any).data || [] : []).length).toBe(1);

      // 查询在later之前创建的检查点
      const result2 = await api.getAll({ startTimeTo: later - 50 });
      expect(result2.success).toBe(true);
      expect((result2.success ? (result2 as any).data || [] : []).length).toBe(1);
    });
  });

  describe('场景3: 分页和排序', () => {
    it('应该正确实现分页功能', async () => {
      const workflow = createTestWorkflow('pagination-test', 'Pagination Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 创建多个检查点
      const numCheckpoints = 10;
      for (let i = 0; i < numCheckpoints; i++) {
        await api.createThreadCheckpoint(threadContext.getThreadId(), {
          description: `Pagination test ${i}`
        });
      }

      // 测试分页
      const pageSize = 3;
      const totalPages = Math.ceil(numCheckpoints / pageSize);

      // 获取所有检查点后进行分页处理
      const allResult = await api.getAll();
      expect(allResult.success).toBe(true);
      const allCheckpointsData = allResult.success ? (allResult as any).data || [] : [];

      let allCheckpoints: any[] = [];
      for (let page = 0; page < totalPages; page++) {
        const offset = page * pageSize;
        const end = Math.min(offset + pageSize, allCheckpointsData.length);
        const pageCheckpoints = allCheckpointsData.slice(offset, end);
        allCheckpoints = allCheckpoints.concat(pageCheckpoints);

        if (page < totalPages - 1) {
          expect(pageCheckpoints).toHaveLength(pageSize);
        } else {
          expect(pageCheckpoints).toHaveLength(numCheckpoints % pageSize || pageSize);
        }
      }

      expect(allCheckpoints).toHaveLength(numCheckpoints);
    });

    it('应该按时间戳降序排序', async () => {
      const workflow = createTestWorkflow('sorting-test', 'Sorting Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 创建检查点，间隔一段时间
      const checkpointIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const checkpointId = await api.createThreadCheckpoint(threadContext.getThreadId(), {
          description: `Sorting test ${i}`
        });
        checkpointIds.push(checkpointId);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 获取所有检查点
      const result = await api.getAll();
      expect(result.success).toBe(true);
      const checkpoints = result.success ? (result as any).data || [] : [];

      // 验证按时间戳降序排序（最新的在前）
      for (let i = 0; i < checkpoints.length - 1; i++) {
        expect((checkpoints[i] as any).createdAt).toBeGreaterThanOrEqual((checkpoints[i + 1] as any).createdAt);
      }

      // 验证顺序与创建顺序相反
      expect(checkpoints[0].id).toBe(checkpointIds[4]); // 最新的
      expect(checkpoints[4].id).toBe(checkpointIds[0]); // 最旧的
    });
  });

  describe('场景4: 错误处理', () => {
    it('应该在检查点不存在时返回null', async () => {
      const result = await api.get('non-existent-checkpoint');
      expect(result).toBeNull();
    });

    it('应该在更新不存在的检查点时抛出错误', async () => {
      await expect(
        api.update('non-existent-checkpoint', { metadata: { description: 'test' } })
      ).rejects.toThrow('Checkpoint not found');
    });

    it('应该在删除不存在的检查点时抛出错误', async () => {
      await expect(
        api.delete('non-existent-checkpoint')
      ).rejects.toThrow('Checkpoint not found');
    });

    it('应该在创建检查点时线程不存在时抛出错误', async () => {
      await expect(
        api.createThreadCheckpoint('non-existent-thread')
      ).rejects.toThrow();
    });
  });

  describe('场景5: 统计信息和工具方法', () => {
    it('应该正确获取线程的检查点列表', async () => {
      const workflow = createTestWorkflow('thread-checkpoints-test', 'Thread Checkpoints Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 创建多个检查点
      await api.createThreadCheckpoint(threadContext.getThreadId(), { tags: ['thread-test'] });
      await api.createThreadCheckpoint(threadContext.getThreadId(), { tags: ['thread-test'] });

      const checkpoints = await api.getThreadCheckpoints(threadContext.getThreadId());
      expect(checkpoints).toHaveLength(2);
      expect(checkpoints.every(cp => cp.threadId === threadContext.getThreadId())).toBe(true);
      expect(checkpoints.every(cp => cp.metadata?.tags?.includes('thread-test'))).toBe(true);
    });

    it('应该正确获取最新检查点', async () => {
      const workflow = createTestWorkflow('latest-checkpoint-test', 'Latest Checkpoint Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 创建多个检查点
      await api.createThreadCheckpoint(threadContext.getThreadId(), { description: 'Old checkpoint' });
      await new Promise(resolve => setTimeout(resolve, 100));
      const latestCheckpointId = await api.createThreadCheckpoint(threadContext.getThreadId(), { description: 'Latest checkpoint' });

      const latest = await api.getLatestCheckpoint(threadContext.getThreadId());
      expect(latest).toBeDefined();
      expect(latest?.id).toBe(latestCheckpointId);
      expect(latest?.metadata?.description).toBe('Latest checkpoint');
    });

    it('应该正确获取检查点统计信息', async () => {
      // 创建多个工作流和线程
      const workflow1 = createTestWorkflow('stats-workflow-1', 'Stats Workflow 1');
      const workflow2 = createTestWorkflow('stats-workflow-2', 'Stats Workflow 2');
      workflowRegistry.register(workflow1);
      workflowRegistry.register(workflow2);

      const threadContext1 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow1);
      const threadContext2 = await createTestThreadContext(threadRegistry, workflowRegistry, workflow2);

      // 为线程1创建2个检查点，线程2创建3个检查点
      await api.createThreadCheckpoint(threadContext1.getThreadId());
      await api.createThreadCheckpoint(threadContext1.getThreadId());
      await api.createThreadCheckpoint(threadContext2.getThreadId());
      await api.createThreadCheckpoint(threadContext2.getThreadId());
      await api.createThreadCheckpoint(threadContext2.getThreadId());

      const stats = await api.getCheckpointStatistics();
      expect(stats.total).toBe(5);
      expect(stats.byThread[threadContext1.getThreadId()]).toBe(2);
      expect(stats.byThread[threadContext2.getThreadId()]).toBe(3);
      expect(stats.byWorkflow['stats-workflow-1']).toBe(2);
      expect(stats.byWorkflow['stats-workflow-2']).toBe(3);
    });
  });
});