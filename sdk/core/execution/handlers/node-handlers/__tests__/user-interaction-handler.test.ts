/**
 * 用户交互节点处理函数单元测试
 */

import { userInteractionHandler } from '../user-interaction-handler';
import type { Node, UserInteractionNodeConfig } from '../../../../../types/node';
import { NodeType } from '../../../../../types/node';
import type { Thread } from '../../../../../types/thread';
import { ThreadStatus } from '../../../../../types/thread';
import { ExecutionError } from '../../../../../types/errors';

describe('user-interaction-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;
  let mockContext: any;
  let mockUserInteractionHandler: any;
  let mockConversationManager: any;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: '',
      graph: {} as any,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: 0,
      errors: [],
      metadata: {}
    };

    // 初始化mock handlers
    mockUserInteractionHandler = {
      handle: jest.fn()
    };

    mockConversationManager = {
      getMessages: jest.fn(() => []),
      addMessage: jest.fn()
    };

    mockContext = {
      userInteractionHandler: mockUserInteractionHandler,
      conversationManager: mockConversationManager,
      timeout: 30000
    };

    // 重置所有mock
    jest.clearAllMocks();
  });

  describe('UPDATE_VARIABLES操作测试', () => {
    it('应该成功执行UPDATE_VARIABLES操作', async () => {
      const mockInputData = 'user input value';
      mockUserInteractionHandler.handle.mockResolvedValue(mockInputData);

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'userName',
              expression: '{{input}}'
            },
            {
              variableName: 'greeting',
              expression: 'Hello, {{input}}'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await userInteractionHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        interactionId: expect.any(String),
        operationType: 'UPDATE_VARIABLES',
        results: {
          userName: 'user input value',
          greeting: 'Hello, user input value'
        },
        executionTime: expect.any(Number)
      });

      // 验证变量已更新
      expect(mockThread.variableScopes.thread?.['userName']).toBe('user input value');
      expect(mockThread.variableScopes.thread?.['greeting']).toBe('Hello, user input value');

      // 验证调用了用户交互处理器
      expect(mockUserInteractionHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: 'UPDATE_VARIABLES',
          prompt: 'Please enter your name',
          timeout: 30000
        }),
        expect.any(Object)
      );
    });

    it('应该在UPDATE_VARIABLES操作中没有定义变量时抛出错误', async () => {
      mockUserInteractionHandler.handle.mockResolvedValue('input');

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [],
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ExecutionError);

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow('No variables defined for UPDATE_VARIABLES operation');
    });

    it('应该正确处理常量表达式', async () => {
      mockUserInteractionHandler.handle.mockResolvedValue('input');

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'constant',
              expression: 'fixed value'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await userInteractionHandler(mockThread, mockNode, mockContext);

      expect(result.results.constant).toBe('fixed value');
      expect(mockThread.variableScopes.thread?.['constant']).toBe('fixed value');
    });
  });

  describe('ADD_MESSAGE操作测试', () => {
    it('应该成功执行ADD_MESSAGE操作', async () => {
      const mockInputData = 'user message';
      mockUserInteractionHandler.handle.mockResolvedValue(mockInputData);

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'ADD_MESSAGE',
          message: {
            role: 'user',
            contentTemplate: 'User said: {{input}}'
          },
          prompt: 'Please enter your message',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await userInteractionHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        interactionId: expect.any(String),
        operationType: 'ADD_MESSAGE',
        results: {
          role: 'user',
          content: 'User said: user message'
        },
        executionTime: expect.any(Number)
      });

      // 验证消息已添加到对话管理器
      expect(mockConversationManager.addMessage).toHaveBeenCalledWith({
        role: 'user',
        content: 'User said: user message'
      });
    });

    it('应该在ADD_MESSAGE操作中没有定义消息时抛出错误', async () => {
      mockUserInteractionHandler.handle.mockResolvedValue('input');

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'ADD_MESSAGE',
          prompt: 'Please enter your message',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ExecutionError);

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow('No message defined for ADD_MESSAGE operation');
    });

    it('应该在没有conversationManager时仍然返回结果', async () => {
      mockUserInteractionHandler.handle.mockResolvedValue('user message');
      mockContext.conversationManager = undefined;

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'ADD_MESSAGE',
          message: {
            role: 'user',
            contentTemplate: 'User said: {{input}}'
          },
          prompt: 'Please enter your message',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await userInteractionHandler(mockThread, mockNode, mockContext);

      expect(result.results).toMatchObject({
        role: 'user',
        content: 'User said: user message'
      });
    });
  });

  describe('超时和取消测试', () => {
    it('应该在超时时抛出错误', async () => {
      // 模拟超时
      mockUserInteractionHandler.handle.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'input',
              expression: '{{input}}'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 100 // 100ms超时
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow('User interaction timeout after 100ms');
    });

    it('应该在取消时抛出错误', async () => {
      mockUserInteractionHandler.handle.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'input',
              expression: '{{input}}'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 10000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      // 在150ms后取消
      setTimeout(() => {
        const context = mockUserInteractionHandler.handle.mock.calls[0]?.[1];
        if (context?.cancelToken) {
          context.cancelToken.cancel();
        }
      }, 150);

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow('User interaction cancelled');
    });
  });

  describe('占位符替换测试', () => {
    it('应该正确替换{{input}}占位符', async () => {
      mockUserInteractionHandler.handle.mockResolvedValue('John Doe');

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'fullName',
              expression: '{{input}}'
            },
            {
              variableName: 'message',
              expression: 'Hello, {{input}}! Welcome to the system.'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await userInteractionHandler(mockThread, mockNode, mockContext);

      expect(result.results.fullName).toBe('John Doe');
      expect(result.results.message).toBe('Hello, John Doe! Welcome to the system.');
    });

    it('应该正确处理多个{{input}}占位符', async () => {
      mockUserInteractionHandler.handle.mockResolvedValue('test');

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'repeated',
              expression: '{{input}} and {{input}} and {{input}}'
            }
          ],
          prompt: 'Please enter a value',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await userInteractionHandler(mockThread, mockNode, mockContext);

      expect(result.results.repeated).toBe('test and test and test');
    });
  });

  describe('未知操作类型测试', () => {
    it('应该在未知操作类型时抛出错误', async () => {
      mockUserInteractionHandler.handle.mockResolvedValue('input');

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UNKNOWN_OPERATION' as any,
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow(ExecutionError);

      await expect(userInteractionHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow('Unknown operation type: UNKNOWN_OPERATION');
    });
  });

  describe('交互上下文测试', () => {
    it('应该正确创建交互上下文', async () => {
      mockUserInteractionHandler.handle.mockImplementation((request: any, context: any) => {
        // 验证上下文属性
        expect(context.threadId).toBe('thread-1');
        expect(context.workflowId).toBe('workflow-1');
        expect(context.nodeId).toBe('user-interaction-node-1');
        expect(context.timeout).toBe(30000);
        expect(context.cancelToken).toBeDefined();
        expect(typeof context.getVariable).toBe('function');
        expect(typeof context.setVariable).toBe('function');
        expect(typeof context.getVariables).toBe('function');
        return Promise.resolve('input');
      });

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'input',
              expression: '{{input}}'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await userInteractionHandler(mockThread, mockNode, mockContext);
    });

    it('应该支持通过上下文获取和设置变量', async () => {
      mockThread.variableScopes.thread = { existingVar: 'existing value' };

      mockUserInteractionHandler.handle.mockImplementation(async (request: any, context: any) => {
        // 获取变量
        const existingValue = context.getVariable('existingVar');
        expect(existingValue).toBe('existing value');

        // 设置变量
        await context.setVariable('newVar', 'new value');

        return 'input';
      });

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'input',
              expression: '{{input}}'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await userInteractionHandler(mockThread, mockNode, mockContext);

      // 验证变量已设置
      expect(mockThread.variableScopes.thread?.['newVar']).toBe('new value');
    });
  });

  describe('执行时间测试', () => {
    it('应该正确计算执行时间', async () => {
      mockUserInteractionHandler.handle.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('input'), 100))
      );

      mockNode = {
        id: 'user-interaction-node-1',
        name: 'User Interaction Node',
        type: NodeType.USER_INTERACTION,
        config: {
          operationType: 'UPDATE_VARIABLES',
          variables: [
            {
              variableName: 'input',
              expression: '{{input}}'
            }
          ],
          prompt: 'Please enter your name',
          timeout: 30000
        } as UserInteractionNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await userInteractionHandler(mockThread, mockNode, mockContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(100);
      expect(typeof result.executionTime).toBe('number');
    });
  });
});