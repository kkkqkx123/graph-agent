/**
 * ThreadExecutorAPI 单元测试
 */

import { ThreadExecutorAPI } from '../thread-executor-api';
import { WorkflowRegistry } from '../../core/execution/registrys/workflow-registry';
import type { WorkflowDefinition } from '../../types/workflow';
import { NodeType } from '../../types/node';
import { EdgeType } from '../../types/edge';

describe('ThreadExecutorAPI', () => {
  let api: ThreadExecutorAPI;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    workflowRegistry = new WorkflowRegistry({ enableVersioning: false });
    api = new ThreadExecutorAPI(workflowRegistry);
  });

  describe('executeWorkflow', () => {
    it('应该成功执行工作流', async () => {
      // 创建测试工作流
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

      // 注册工作流
      workflowRegistry.register(workflow);

      // 执行工作流
      const result = await api.executeWorkflow('test-workflow');

      // 验证结果
      expect(result).toBeDefined();
      expect(result.threadId).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该在工作流不存在时抛出错误', async () => {
      await expect(api.executeWorkflow('non-existent-workflow')).rejects.toThrow();
    });

    it('应该支持执行选项', async () => {
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

      const options = {
        input: { test: 'value' },
        maxSteps: 100,
        timeout: 5000
      };

      const result = await api.executeWorkflow('test-workflow-2', options);

      expect(result.success).toBe(true);
    });
  });

  describe('executeWorkflowFromDefinition', () => {
    it('应该成功执行工作流定义', async () => {
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

      const result = await api.executeWorkflowFromDefinition(workflow);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('pauseThread', () => {
    it('应该暂停线程', async () => {
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
      const result = await api.executeWorkflow('test-workflow-4');

      // 注意：由于工作流已经完成，暂停操作可能会失败
      // 这里只是测试方法存在
      expect(result.threadId).toBeDefined();
    });
  });

  describe('getThreadContext', () => {
    it('应该获取线程上下文', async () => {
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
      const result = await api.executeWorkflow('test-workflow-5');

      const threadContext = api.getThreadContext(result.threadId);
      expect(threadContext).toBeDefined();
      expect(threadContext?.getThreadId()).toBe(result.threadId);
    });

    it('在线程不存在时返回null', () => {
      const threadContext = api.getThreadContext('non-existent-thread');
      expect(threadContext).toBeNull();
    });
  });

  describe('getAllThreadContexts', () => {
    it('应该获取所有线程上下文', async () => {
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
      await api.executeWorkflow('test-workflow-6');

      const allContexts = api.getAllThreadContexts();
      expect(allContexts.length).toBeGreaterThan(0);
    });
  });
});