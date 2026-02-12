/**
 * ContinueFromTrigger节点处理函数单元测试
 */

import { continueFromTriggerHandler } from '../continue-from-trigger-handler';
import type { Node, ContinueFromTriggerNodeConfig } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ThreadStatus } from '@modular-agent/types/thread';

describe('continue-from-trigger-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;
  let mockContext: any;
  let mockMainThreadContext: any;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: 'current-node',
      graph: {} as any,
      variables: [
        { name: 'var1', value: 'value1', type: 'string', scope: 'thread', readonly: false },
        { name: 'var2', value: 42, type: 'number', scope: 'thread', readonly: false },
        { name: 'var3', value: true, type: 'boolean', scope: 'thread', readonly: false }
      ],
      variableScopes: {
        global: {},
        thread: {},
        local: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: 500,
      errors: []
    };

    // 初始化mock main thread context
    mockMainThreadContext = {
      setVariables: jest.fn(),
      addMessages: jest.fn()
    };

    // 初始化mock context
    mockContext = {
      mainThreadContext: mockMainThreadContext,
      conversationManager: {
        getRecentMessages: jest.fn(),
        getRecentMessagesByRole: jest.fn(),
        getMessagesByRole: jest.fn(),
        getMessagesByRange: jest.fn()
      }
    };

    // 初始化mock node
    mockNode = {
      id: 'continue-from-trigger-node-1',
      name: 'Continue From Trigger Node',
      type: NodeType.CONTINUE_FROM_TRIGGER,
      config: {} as ContinueFromTriggerNodeConfig,
      incomingEdgeIds: [],
      outgoingEdgeIds: []
    };
  });

  describe('基本功能测试', () => {
    it('应该成功执行并返回完成消息', async () => {
      const result = await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        message: 'Triggered subgraph completed and data callback executed',
        callbackExecuted: true
      });

      // 验证执行历史已记录
      expect(mockThread.nodeResults).toHaveLength(1);
      const executionResult = mockThread.nodeResults[0]!;
      expect(executionResult).toMatchObject({
        step: 1,
        nodeId: 'continue-from-trigger-node-1',
        nodeType: NodeType.CONTINUE_FROM_TRIGGER,
        status: 'COMPLETED'
      });
      expect(executionResult.timestamp).toBeDefined();
    });

    it('应该在没有配置时正常执行', async () => {
      mockNode.config = {} as ContinueFromTriggerNodeConfig;

      const result = await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph completed and data callback executed');
      expect(mockMainThreadContext.setVariables).not.toHaveBeenCalled();
      expect(mockMainThreadContext.addMessages).not.toHaveBeenCalled();
    });
  });

  describe('变量回调测试', () => {
    it('应该回传所有变量（includeAll=true）', async () => {
      mockNode.config = {
        variableCallback: {
          includeAll: true
        }
      } as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith(mockThread.variables);
    });

    it('应该选择性回传变量（includeVariables）', async () => {
      mockNode.config = {
        variableCallback: {
          includeVariables: ['var1', 'var3']
        }
      } as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      const expectedVariables = mockThread.variables.filter(v => 
        ['var1', 'var3'].includes(v.name)
      );
      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith(expectedVariables);
    });

    it('应该在没有匹配变量时回传空数组', async () => {
      mockNode.config = {
        variableCallback: {
          includeVariables: ['nonExistentVar']
        }
      } as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith([]);
    });

    it('应该处理空的variables数组', async () => {
      mockThread.variables = [];
      mockNode.config = {
        variableCallback: {
          includeAll: true
        }
      } as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith([]);
    });

    it('应该处理variables为undefined的情况', async () => {
      mockThread.variables = undefined as any;
      mockNode.config = {
        variableCallback: {
          includeAll: true
        }
      } as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith([]);
    });

    it('应该同时设置includeAll和includeVariables时优先使用includeAll', async () => {
      mockNode.config = {
        variableCallback: {
          includeAll: true,
          includeVariables: ['var1']
        }
      } as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith(mockThread.variables);
    });
  });

  describe('对话历史回调测试', () => {
    beforeEach(() => {
      mockNode.config = {
        conversationHistoryCallback: {}
      } as ContinueFromTriggerNodeConfig;
    });

    it('应该回传最后N条消息（lastN）', async () => {
      const mockMessages = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' },
        { role: 'user', content: 'Message 3' }
      ];
      mockContext.conversationManager.getRecentMessages.mockReturnValue(mockMessages);

      (mockNode.config as ContinueFromTriggerNodeConfig).conversationHistoryCallback = {
        lastN: 3
      };

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockContext.conversationManager.getRecentMessages).toHaveBeenCalledWith(3);
      expect(mockMainThreadContext.addMessages).toHaveBeenCalledWith(mockMessages);
    });

    it('应该回传最后N条指定角色的消息（lastNByRole）', async () => {
      const mockMessages = [
        { role: 'user', content: 'User message 1' },
        { role: 'user', content: 'User message 2' }
      ];
      mockContext.conversationManager.getRecentMessagesByRole.mockReturnValue(mockMessages);

      (mockNode.config as ContinueFromTriggerNodeConfig).conversationHistoryCallback = {
        lastNByRole: {
          role: 'user',
          count: 2
        }
      };

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockContext.conversationManager.getRecentMessagesByRole).toHaveBeenCalledWith('user', 2);
      expect(mockMainThreadContext.addMessages).toHaveBeenCalledWith(mockMessages);
    });

    it('应该回传指定角色的所有消息（byRole）', async () => {
      const mockMessages = [
        { role: 'assistant', content: 'Assistant message 1' },
        { role: 'assistant', content: 'Assistant message 2' }
      ];
      mockContext.conversationManager.getMessagesByRole.mockReturnValue(mockMessages);

      (mockNode.config as ContinueFromTriggerNodeConfig).conversationHistoryCallback = {
        byRole: 'assistant'
      };

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockContext.conversationManager.getMessagesByRole).toHaveBeenCalledWith('assistant');
      expect(mockMainThreadContext.addMessages).toHaveBeenCalledWith(mockMessages);
    });

    it('应该回传指定范围的消息（range）', async () => {
      const mockMessages = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' }
      ];
      mockContext.conversationManager.getMessagesByRange.mockReturnValue(mockMessages);

      (mockNode.config as ContinueFromTriggerNodeConfig).conversationHistoryCallback = {
        range: {
          start: 0,
          end: 2
        }
      };

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockContext.conversationManager.getMessagesByRange).toHaveBeenCalledWith(0, 2);
      expect(mockMainThreadContext.addMessages).toHaveBeenCalledWith(mockMessages);
    });

    it('应该在没有conversationManager时不调用回调方法', async () => {
      mockContext.conversationManager = undefined;
      (mockNode.config as ContinueFromTriggerNodeConfig).conversationHistoryCallback = {
        lastN: 3
      };

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockMainThreadContext.addMessages).not.toHaveBeenCalled();
    });

    it('应该在没有conversationHistoryCallback配置时不调用回调方法', async () => {
      mockNode.config = {} as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockContext.conversationManager.getRecentMessages).not.toHaveBeenCalled();
      expect(mockContext.conversationManager.getRecentMessagesByRole).not.toHaveBeenCalled();
      expect(mockContext.conversationManager.getMessagesByRole).not.toHaveBeenCalled();
      expect(mockContext.conversationManager.getMessagesByRange).not.toHaveBeenCalled();
      expect(mockMainThreadContext.addMessages).not.toHaveBeenCalled();
    });

    it('应该处理空的消息数组', async () => {
      mockContext.conversationManager.getRecentMessages.mockReturnValue([]);
      (mockNode.config as ContinueFromTriggerNodeConfig).conversationHistoryCallback = {
        lastN: 3
      };

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockMainThreadContext.addMessages).toHaveBeenCalledWith([]);
    });
  });

  describe('执行条件测试', () => {
    it('应该在RUNNING状态下正常执行', async () => {
      mockThread.status = ThreadStatus.RUNNING;

      const result = await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph completed and data callback executed');
    });

    it('应该在非RUNNING状态下跳过执行', async () => {
      const nonRunnableStates = [
        ThreadStatus.CREATED,
        ThreadStatus.PAUSED,
        ThreadStatus.COMPLETED,
        ThreadStatus.FAILED,
        ThreadStatus.CANCELLED,
        ThreadStatus.TIMEOUT
      ];

      for (const status of nonRunnableStates) {
        mockThread.status = status;
        mockThread.nodeResults = []; // 确保没有执行过

        const result = await continueFromTriggerHandler(mockThread, mockNode, mockContext);

        expect(result).toMatchObject({
          nodeId: 'continue-from-trigger-node-1',
          nodeType: 'CONTINUE_FROM_TRIGGER',
          status: 'SKIPPED',
          step: 1,
          executionTime: 0
        });

        // 验证Thread状态未改变
        expect(mockThread.status).toBe(status);
        expect(mockThread.nodeResults).toHaveLength(0);
      }
    });

    it('应该在已经执行过的情况下跳过执行', async () => {
      // 先执行一次
      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      // 再次执行应该被跳过
      const result = await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        nodeId: 'continue-from-trigger-node-1',
        nodeType: 'CONTINUE_FROM_TRIGGER',
        status: 'SKIPPED',
        step: 2, // step应该是2，因为已经有1个结果
        executionTime: 0
      });

      // 验证Thread状态未改变（除了step计数）
      expect(mockThread.nodeResults).toHaveLength(1); // 结果数组长度应该仍然是1
    });
  });

  describe('错误处理测试', () => {
    it('应该在缺少mainThreadContext时抛出错误', async () => {
      mockContext.mainThreadContext = undefined;

      await expect(continueFromTriggerHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow('Main thread context is required for CONTINUE_FROM_TRIGGER node');
    });

    it('应该在context为undefined时抛出错误', async () => {
      mockContext = undefined;

      await expect(continueFromTriggerHandler(mockThread, mockNode, mockContext))
        .rejects
        .toThrow('Main thread context is required for CONTINUE_FROM_TRIGGER node');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理没有context的情况', async () => {
      await expect(continueFromTriggerHandler(mockThread, mockNode))
        .rejects
        .toThrow('Main thread context is required for CONTINUE_FROM_TRIGGER node');
    });

    it('应该处理带有contextData的Thread', async () => {
      mockThread.contextData = { conversationId: 'conv-123' };

      const result = await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph completed and data callback executed');
      expect(mockThread.contextData).toEqual({ conversationId: 'conv-123' });
    });
  });

  describe('综合场景测试', () => {
    it('应该完整处理包含所有配置的场景', async () => {
      const mockMessages = [
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' }
      ];
      mockContext.conversationManager.getRecentMessages.mockReturnValue(mockMessages);

      mockNode.config = {
        variableCallback: {
          includeVariables: ['var1', 'var2']
        },
        conversationHistoryCallback: {
          lastN: 2
        }
      } as ContinueFromTriggerNodeConfig;

      const result = await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      // 验证返回结果
      expect(result).toMatchObject({
        message: 'Triggered subgraph completed and data callback executed',
        callbackExecuted: true
      });

      // 验证变量回调
      const expectedVariables = mockThread.variables.filter(v => 
        ['var1', 'var2'].includes(v.name)
      );
      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith(expectedVariables);

      // 验证对话历史回调
      expect(mockContext.conversationManager.getRecentMessages).toHaveBeenCalledWith(2);
      expect(mockMainThreadContext.addMessages).toHaveBeenCalledWith(mockMessages);

      // 验证执行历史已记录
      expect(mockThread.nodeResults).toHaveLength(1);
      expect(mockThread.nodeResults[0]).toMatchObject({
        step: 1,
        nodeId: 'continue-from-trigger-node-1',
        nodeType: NodeType.CONTINUE_FROM_TRIGGER,
        status: 'COMPLETED'
      });
    });

    it('应该同时处理变量回传和对话历史回传', async () => {
      const mockMessages = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' }
      ];
      mockContext.conversationManager.getMessagesByRole.mockReturnValue(mockMessages);

      mockNode.config = {
        variableCallback: {
          includeAll: true
        },
        conversationHistoryCallback: {
          byRole: 'user'
        }
      } as ContinueFromTriggerNodeConfig;

      await continueFromTriggerHandler(mockThread, mockNode, mockContext);

      // 验证所有变量都被回传
      expect(mockMainThreadContext.setVariables).toHaveBeenCalledWith(mockThread.variables);

      // 验证指定角色的消息被回传
      expect(mockContext.conversationManager.getMessagesByRole).toHaveBeenCalledWith('user');
      expect(mockMainThreadContext.addMessages).toHaveBeenCalledWith(mockMessages);
    });
  });
});