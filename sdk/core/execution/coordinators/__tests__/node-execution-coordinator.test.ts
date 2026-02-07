/**
 * NodeExecutionCoordinator 单元测试
 */

import { NodeExecutionCoordinator } from '../node-execution-coordinator';
import { ThreadContext } from '../../context/thread-context';
import { EventManager } from '../../../services/event-manager';
import { LLMExecutionCoordinator } from '../llm-execution-coordinator';
import { EventType } from '../../../../types/events';
import { ExecutionError } from '../../../../types/errors';
import { NodeType, HookType } from '../../../../types/node';

// Mock 依赖
jest.mock('../../context/thread-context');
jest.mock('../../../services/event-manager');
jest.mock('../llm-execution-coordinator');
jest.mock('../../handlers/node-handlers');
jest.mock('../../handlers/subgraph-handler');
jest.mock('../../handlers/hook-handlers');

describe('NodeExecutionCoordinator', () => {
  let coordinator: NodeExecutionCoordinator;
  let mockEventManager: jest.Mocked<EventManager>;
  let mockLLMCoordinator: jest.Mocked<LLMExecutionCoordinator>;
  let mockThreadContext: jest.Mocked<ThreadContext>;
  let mockUserInteractionHandler: any;
  let mockHumanRelayHandler: any;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 创建 mock 实例
    mockEventManager = {
      emit: jest.fn()
    } as any;

    mockLLMCoordinator = {} as any;

    mockThreadContext = {
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1'),
      getNavigator: jest.fn().mockReturnValue({
        getGraph: jest.fn().mockReturnValue({
          getNode: jest.fn().mockReturnValue(null)
        })
      }),
      thread: {
        id: 'thread-1',
        workflowId: 'workflow-1',
        nodeResults: []
      },
      addNodeResult: jest.fn(),
      getNodeResults: jest.fn().mockReturnValue([]),
      getConversationManager: jest.fn().mockReturnValue({}),
      getCurrentSubgraphContext: jest.fn().mockReturnValue(null)
    } as any;

    mockUserInteractionHandler = {};
    mockHumanRelayHandler = {};

    // 创建协调器实例
    coordinator = new NodeExecutionCoordinator(
      mockEventManager,
      mockLLMCoordinator,
      mockUserInteractionHandler,
      mockHumanRelayHandler
    );
  });

  describe('构造函数', () => {
    it('应该正确初始化协调器', () => {
      expect(coordinator).toBeInstanceOf(NodeExecutionCoordinator);
    });

    it('应该在没有提供可选依赖时正常工作', () => {
      const minimalCoordinator = new NodeExecutionCoordinator(
        mockEventManager,
        mockLLMCoordinator
      );
      expect(minimalCoordinator).toBeInstanceOf(NodeExecutionCoordinator);
    });
  });

  describe('executeNode', () => {
    const mockNode = {
      id: 'node-1',
      type: NodeType.LLM,
      name: 'Test Node',
      config: {},
      outgoingEdgeIds: [],
      incomingEdgeIds: [],
      hooks: []
    };

    it('应该成功执行节点', async () => {
      // Mock node handler
      const { getNodeHandler } = require('../../handlers/node-handlers');
      getNodeHandler.mockReturnValue(jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        data: { result: 'success' }
      }));

      // 执行测试
      const result = await coordinator.executeNode(mockThreadContext, mockNode);

      // 验证结果
      expect(result.status).toBe('COMPLETED');
      expect(result.nodeId).toBe('node-1');
      expect(result.nodeType).toBe(NodeType.LLM);

      // 验证事件触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.NODE_STARTED,
          nodeId: 'node-1',
          nodeType: NodeType.LLM
        })
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.NODE_COMPLETED,
          nodeId: 'node-1',
          output: undefined
        })
      );

      // 验证节点结果记录
      expect(mockThreadContext.addNodeResult).toHaveBeenCalledWith(result);
    });

    it('应该处理节点执行失败', async () => {
      // Mock node handler 抛出错误
      const { getNodeHandler } = require('../../handlers/node-handlers');
      getNodeHandler.mockReturnValue(jest.fn().mockRejectedValue(new Error('Node execution failed')));

      // 执行测试
      const result = await coordinator.executeNode(mockThreadContext, mockNode);

      // 验证结果
      expect(result.status).toBe('FAILED');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Node execution failed');

      // 验证失败事件触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.NODE_FAILED,
          nodeId: 'node-1',
          error: expect.any(Error)
        })
      );
    });

    it('应该执行节点 Hooks', async () => {
      const nodeWithHooks = {
        ...mockNode,
        hooks: [
          {
            hookType: HookType.BEFORE_EXECUTE,
            eventName: 'before_execute_log',
            eventPayload: { message: 'Before execution' }
          },
          {
            hookType: HookType.AFTER_EXECUTE,
            eventName: 'after_execute_log',
            eventPayload: { message: 'After execution' }
          }
        ]
      };

      // Mock node handler
      const { getNodeHandler } = require('../../handlers/node-handlers');
      getNodeHandler.mockReturnValue(jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        data: { result: 'success' }
      }));

      // Mock hook 执行
      const { executeHook } = require('../../handlers/hook-handlers');
      executeHook.mockResolvedValue(undefined);

      // 执行测试
      await coordinator.executeNode(mockThreadContext, nodeWithHooks);

      // 验证 Hook 执行
      expect(executeHook).toHaveBeenCalledTimes(2);
      expect(executeHook).toHaveBeenCalledWith(
        expect.objectContaining({
          thread: mockThreadContext.thread,
          node: nodeWithHooks
        }),
        'BEFORE_EXECUTE',
        expect.any(Function)
      );
      expect(executeHook).toHaveBeenCalledWith(
        expect.objectContaining({
          thread: mockThreadContext.thread,
          node: nodeWithHooks,
          result: expect.any(Object)
        }),
        'AFTER_EXECUTE',
        expect.any(Function)
      );
    });

    it('应该处理子图边界节点', async () => {
      // Mock 图节点包含子图边界信息
      const mockGraphNode = {
        internalMetadata: {
          'subgraphBoundaryType': 'entry',
          'originalSubgraphNodeId': 'original-node-1'
        },
        workflowId: 'subgraph-1',
        parentWorkflowId: 'workflow-1'
      };

      // 更新 mockThreadContext 的 navigator 以返回包含子图边界信息的节点
      mockThreadContext.getNavigator.mockReturnValue({
        getGraph: jest.fn().mockReturnValue({
          getNode: jest.fn().mockReturnValue(mockGraphNode)
        })
      } as any);

      // Mock 子图处理函数
      const { enterSubgraph, getSubgraphInput } = require('../../handlers/subgraph-handler');
      getSubgraphInput.mockReturnValue({ input: 'test' });
      enterSubgraph.mockReturnValue(undefined);

      // Mock node handler
      const { getNodeHandler } = require('../../handlers/node-handlers');
      getNodeHandler.mockReturnValue(jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        data: { result: 'success' }
      }));

      // 执行测试
      await coordinator.executeNode(mockThreadContext, mockNode);

      // 验证子图处理
      expect(enterSubgraph).toHaveBeenCalledWith(
        mockThreadContext,
        'subgraph-1',
        'workflow-1',
        { input: 'test' }
      );

      // 验证子图开始事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SUBGRAPH_STARTED,
          subgraphId: 'subgraph-1',
          parentWorkflowId: 'workflow-1',
          input: { input: 'test' }
        })
      );
    });

    it('应该处理不同类型的节点', async () => {
      const nodeTypes = [
        NodeType.LLM,
        NodeType.USER_INTERACTION,
        NodeType.CONTEXT_PROCESSOR
      ];

      for (const nodeType of nodeTypes) {
        jest.clearAllMocks();

        const node = {
          ...mockNode,
          type: nodeType
        };

        // Mock node handler
        const { getNodeHandler } = require('../../handlers/node-handlers');
        getNodeHandler.mockReturnValue(jest.fn().mockResolvedValue({
          status: 'COMPLETED',
          data: { result: 'success' }
        }));

        // 执行测试
        await coordinator.executeNode(mockThreadContext, node);

        // 验证节点类型正确传递
        expect(mockEventManager.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: EventType.NODE_STARTED,
            nodeType: nodeType
          })
        );
      }
    });

    it('应该处理用户交互节点缺少处理程序的情况', async () => {
      const userInteractionNode = {
        ...mockNode,
        type: NodeType.USER_INTERACTION
      };

      // 创建没有用户交互处理程序的协调器
      const coordinatorWithoutHandler = new NodeExecutionCoordinator(
        mockEventManager,
        mockLLMCoordinator
        // 不提供 userInteractionHandler
      );

      // Mock node handler
      const { getNodeHandler } = require('../../handlers/node-handlers');
      getNodeHandler.mockReturnValue(jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        data: { result: 'success' }
      }));

      // 执行测试并验证返回错误结果而不是抛出错误
      const result = await coordinatorWithoutHandler.executeNode(mockThreadContext, userInteractionNode);

      // 验证返回了错误结果
      expect(result.status).toBe('FAILED');
      expect(result.error).toBeInstanceOf(ExecutionError);
      expect(result.error?.message).toBe('UserInteractionHandler is not provided');
    });

    it('应该正确处理执行时间统计', async () => {
      // Mock node handler
      const { getNodeHandler } = require('../../handlers/node-handlers');
      getNodeHandler.mockReturnValue(jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        data: { result: 'success' }
      }));

      // 执行测试
      const result = await coordinator.executeNode(mockThreadContext, mockNode);

      // 验证执行时间统计
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('handleSubgraphBoundary', () => {
    it('应该处理子图入口边界', async () => {
      const mockGraphNode = {
        internalMetadata: {
          'subgraphBoundaryType': 'entry',
          'originalSubgraphNodeId': 'original-node-1'
        },
        workflowId: 'subgraph-1',
        parentWorkflowId: 'workflow-1'
      };

      // Mock 子图处理函数
      const { enterSubgraph, getSubgraphInput } = require('../../handlers/subgraph-handler');
      getSubgraphInput.mockReturnValue({ input: 'test' });
      enterSubgraph.mockReturnValue(undefined);

      // 使用私有方法测试
      await (coordinator as any).handleSubgraphBoundary(mockThreadContext, mockGraphNode);

      // 验证子图处理
      expect(enterSubgraph).toHaveBeenCalledWith(
        mockThreadContext,
        'subgraph-1',
        'workflow-1',
        { input: 'test' }
      );

      // 验证子图开始事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SUBGRAPH_STARTED,
          subgraphId: 'subgraph-1',
          parentWorkflowId: 'workflow-1',
          input: { input: 'test' }
        })
      );
    });

    it('应该处理子图出口边界', async () => {
      const mockGraphNode = {
        internalMetadata: {
          'subgraphBoundaryType': 'exit',
          'originalSubgraphNodeId': 'original-node-2'
        }
      };

      const mockSubgraphContext = {
        workflowId: 'subgraph-1',
        startTime: Date.now() - 1000
      };

      mockThreadContext.getCurrentSubgraphContext.mockReturnValue(mockSubgraphContext);

      // Mock 子图处理函数
      const { exitSubgraph, getSubgraphOutput } = require('../../handlers/subgraph-handler');
      getSubgraphOutput.mockReturnValue({ output: 'result' });
      exitSubgraph.mockReturnValue(undefined);

      // 使用私有方法测试
      await (coordinator as any).handleSubgraphBoundary(mockThreadContext, mockGraphNode);

      // 验证子图完成事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.SUBGRAPH_COMPLETED,
          subgraphId: 'subgraph-1',
          output: { output: 'result' },
          executionTime: expect.any(Number)
        })
      );

      // 验证子图退出
      expect(exitSubgraph).toHaveBeenCalledWith(mockThreadContext);
    });

    it('应该忽略未知的边界类型', async () => {
      const mockGraphNode = {
        internalMetadata: {
          'subgraphBoundaryType': 'unknown',
          'originalSubgraphNodeId': 'original-node-3'
        }
      };

      // 使用私有方法测试
      await (coordinator as any).handleSubgraphBoundary(mockThreadContext, mockGraphNode);

      // 验证没有调用子图处理函数
      const { enterSubgraph, exitSubgraph } = require('../../handlers/subgraph-handler');
      expect(enterSubgraph).not.toHaveBeenCalled();
      expect(exitSubgraph).not.toHaveBeenCalled();
    });
  });

  describe('executeNodeLogic', () => {
    it('应该为不同类型的节点提供正确的上下文', async () => {
      const nodeTypes = [
        {
          type: NodeType.USER_INTERACTION,
          expectedContext: {
            userInteractionHandler: mockUserInteractionHandler,
            conversationManager: expect.any(Object)
          }
        },
        {
          type: NodeType.CONTEXT_PROCESSOR,
          expectedContext: {
            conversationManager: expect.any(Object)
          }
        },
        {
          type: NodeType.LLM,
          expectedContext: {
            llmCoordinator: mockLLMCoordinator,
            eventManager: mockEventManager,
            conversationManager: expect.any(Object),
            humanRelayHandler: mockHumanRelayHandler
          }
        }
      ];

      for (const { type, expectedContext } of nodeTypes) {
        jest.clearAllMocks();

        const node = {
          id: 'node-1',
          type: type,
          name: 'Test Node',
          config: {},
          outgoingEdgeIds: [],
          incomingEdgeIds: []
        };

        // Mock node handler
        const { getNodeHandler } = require('../../handlers/node-handlers');
        const mockHandler = jest.fn().mockResolvedValue({ status: 'COMPLETED', data: { result: 'success' } });
        getNodeHandler.mockReturnValue(mockHandler);

        // Mock conversation manager
        const mockConversationManager = {
          messages: [],
          tokenUsageTracker: {} as any,
          indexManager: {} as any,
          addMessage: jest.fn(),
          getMessages: jest.fn(),
          checkTokenUsage: jest.fn(),
          getTokenUsage: jest.fn(),
          updateTokenUsage: jest.fn(),
          finalizeCurrentRequest: jest.fn(),
          getCurrentRequestTokenUsage: jest.fn(),
          resetTokenUsage: jest.fn(),
          hasMessages: jest.fn(),
          getLastMessage: jest.fn(),
          getMessageCount: jest.fn(),
          clearMessages: jest.fn(),
          addSystemMessage: jest.fn(),
          addUserMessage: jest.fn(),
          addAssistantMessage: jest.fn(),
          addToolMessage: jest.fn(),
          getSystemMessages: jest.fn(),
          getUserMessages: jest.fn(),
          getAssistantMessages: jest.fn(),
          getToolMessages: jest.fn(),
          getMessageByIndex: jest.fn(),
          findMessage: jest.fn(),
          filterMessages: jest.fn(),
          sliceMessages: jest.fn(),
          serialize: jest.fn(),
          deserialize: jest.fn()
        } as any;

        mockThreadContext.getConversationManager.mockReturnValue(mockConversationManager);

        // 使用私有方法测试
        await (coordinator as any).executeNodeLogic(mockThreadContext, node);

        // 验证处理器上下文
        expect(mockHandler).toHaveBeenCalledWith(
          mockThreadContext.thread,
          node,
          expect.objectContaining(expectedContext)
        );
      }
    });

    it('应该正确处理节点执行结果', async () => {
      const node = {
        id: 'node-1',
        type: NodeType.LLM,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };

      // Mock node handler
      const { getNodeHandler } = require('../../handlers/node-handlers');
      const mockHandler = jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        customField: 'custom value'
      });
      getNodeHandler.mockReturnValue(mockHandler);

      // 使用私有方法测试
      const result = await (coordinator as any).executeNodeLogic(mockThreadContext, node);

      // 验证结果结构
      expect(result.nodeId).toBe('node-1');
      expect(result.nodeType).toBe(NodeType.LLM);
      expect(result.status).toBe('COMPLETED');
      expect(result.step).toBe(1);
      expect(result.data).toBeUndefined(); // 因为 output.status 存在
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });
});