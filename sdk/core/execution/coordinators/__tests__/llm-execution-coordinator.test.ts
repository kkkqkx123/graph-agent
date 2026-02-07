/**
 * LLMExecutionCoordinator 单元测试
 */

import { LLMExecutionCoordinator } from '../llm-execution-coordinator';
import { ConversationManager } from '../../managers/conversation-manager';
import { LLMExecutor } from '../../executors/llm-executor';
import { ToolCallExecutor } from '../../executors/tool-call-executor';
import { EventManager } from '../../../services/event-manager';
import { EventType } from '../../../../types/events';
import { ExecutionError } from '../../../../types/errors';
import { now } from '../../../../utils';
import { UserInteractionOperationType } from '../../../../types/interaction';
import type { ToolApprovalData } from '../../../../types/interaction';

// Mock 依赖
jest.mock('../../managers/conversation-manager');
jest.mock('../../executors/llm-executor');
jest.mock('../../executors/tool-call-executor');
jest.mock('../../../services/event-manager');

describe('LLMExecutionCoordinator', () => {
  let coordinator: LLMExecutionCoordinator;
  let mockLLMExecutor: jest.Mocked<LLMExecutor>;
  let mockToolService: any;
  let mockEventManager: jest.Mocked<EventManager>;
  let mockConversationManager: jest.Mocked<ConversationManager>;
  let mockToolCallExecutor: jest.Mocked<ToolCallExecutor>;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 创建 mock 实例
    mockLLMExecutor = {
      executeLLMCall: jest.fn()
    } as any;

    mockToolService = {
      getTool: jest.fn()
    };

    mockEventManager = {
      emit: jest.fn()
    } as any;

    mockConversationManager = {
      addMessage: jest.fn(),
      getMessages: jest.fn(),
      checkTokenUsage: jest.fn(),
      getTokenUsage: jest.fn(),
      updateTokenUsage: jest.fn(),
      finalizeCurrentRequest: jest.fn()
    } as any;

    mockToolCallExecutor = {
      executeToolCalls: jest.fn()
    } as any;

    // 创建协调器实例
    coordinator = new LLMExecutionCoordinator(
      mockLLMExecutor,
      mockToolService,
      mockEventManager
    );
  });

  describe('构造函数', () => {
    it('应该正确初始化协调器', () => {
      expect(coordinator).toBeInstanceOf(LLMExecutionCoordinator);
    });

    it('应该在没有提供可选依赖时正常工作', () => {
      const minimalCoordinator = new LLMExecutionCoordinator(mockLLMExecutor, mockToolService, mockEventManager);
      expect(minimalCoordinator).toBeInstanceOf(LLMExecutionCoordinator);
    });
  });

  describe('executeLLM', () => {
    const mockParams = {
      threadId: 'thread-1',
      nodeId: 'node-1',
      prompt: 'Hello, world!',
      profileId: 'profile-1',
      parameters: { temperature: 0.7 },
      tools: [{ name: 'tool1', description: 'Test tool' }],
      maxToolCallsPerRequest: 3
    };

    it('应该成功执行 LLM 调用', async () => {
      // 设置 mock 返回值
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        toolCalls: []
      });

      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Hello, world!' },
        { role: 'assistant', content: 'Test response' }
      ]);

      // 执行测试
      const result = await coordinator.executeLLM(mockParams, mockConversationManager);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.content).toBe('Test response');
      expect(result.messages).toHaveLength(2);
      expect(result.error).toBeUndefined();

      // 验证方法调用
      expect(mockConversationManager.addMessage).toHaveBeenCalledTimes(2);
      expect(mockLLMExecutor.executeLLMCall).toHaveBeenCalledTimes(1);
      expect(mockConversationManager.updateTokenUsage).toHaveBeenCalledWith({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      });
      expect(mockConversationManager.finalizeCurrentRequest).toHaveBeenCalled();
    });

    it('应该处理工具调用', async () => {
      // 设置 mock 返回值
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'Test response with tools',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        toolCalls: [
          {
            id: 'call-1',
            name: 'test_tool',
            arguments: '{"param": "value"}'
          }
        ]
      });

      // 设置对话管理器返回值
      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Hello, world!' },
        { role: 'assistant', content: 'Test response with tools' }
      ]);

      // 设置工具调用执行结果
      mockToolCallExecutor.executeToolCalls.mockResolvedValue([
        {
          toolCallId: 'call-1',
          toolName: 'test_tool',
          success: true,
          result: 'Tool execution result',
          executionTime: 100
        }
      ]);

      // Mock ToolCallExecutor 构造函数
      (ToolCallExecutor as jest.MockedClass<typeof ToolCallExecutor>).mockImplementation(() => mockToolCallExecutor);

      // 执行测试
      const result = await coordinator.executeLLM(mockParams, mockConversationManager);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.content).toBe('Test response with tools');

      // 验证工具调用执行
      expect(mockToolCallExecutor.executeToolCalls).toHaveBeenCalledWith(
        [
          {
            id: 'call-1',
            name: 'test_tool',
            arguments: '{"param": "value"}'
          }
        ],
        mockConversationManager,
        'thread-1',
        'node-1'
      );
    });

    it('应该处理工具调用数量超过限制的情况', async () => {
      // 设置 mock 返回值 - 返回超过限制的工具调用
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'Test response with too many tools',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        toolCalls: [
          { id: 'call-1', name: 'tool1', arguments: '{}' },
          { id: 'call-2', name: 'tool2', arguments: '{}' },
          { id: 'call-3', name: 'tool3', arguments: '{}' },
          { id: 'call-4', name: 'tool4', arguments: '{}' } // 超过默认限制 3
        ]
      });

      // 执行测试
      const result = await coordinator.executeLLM(mockParams, mockConversationManager);

      // 验证错误处理
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ExecutionError);
      expect(result.error?.message).toContain('LLM returned 4 tool calls, exceeds limit of 3');
    });

    it('应该处理动态工具', async () => {
      const paramsWithDynamicTools = {
        ...mockParams,
        dynamicTools: {
          toolIds: ['dynamic-tool-1', 'dynamic-tool-2'],
          descriptionTemplate: 'Dynamic tool: {name}'
        }
      };

      // Mock 工具服务
      mockToolService.getTool.mockImplementation((id: string) => {
        if (id === 'tool1') {
          return { name: 'tool1', description: 'Static tool', parameters: {} };
        }
        if (id === 'dynamic-tool-1') {
          return { name: 'dynamic-tool-1', description: 'Dynamic tool 1', parameters: {} };
        }
        if (id === 'dynamic-tool-2') {
          return { name: 'dynamic-tool-2', description: 'Dynamic tool 2', parameters: {} };
        }
        return null;
      });

      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'Test response with dynamic tools',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: []
      });

      // 执行测试
      await coordinator.executeLLM(paramsWithDynamicTools, mockConversationManager);

      // 验证工具合并逻辑
      const callArgs = mockLLMExecutor.executeLLMCall.mock.calls[0];
      expect(callArgs?.[1].tools).toEqual(
        expect.arrayContaining([
          { name: 'tool1', description: 'Static tool', parameters: {} },
          { name: 'dynamic-tool-1', description: 'Dynamic tool 1', parameters: {} },
          { name: 'dynamic-tool-2', description: 'Dynamic tool 2', parameters: {} }
        ])
      );
    });

    it('应该处理 Token 使用警告', async () => {
      // 设置高 Token 使用量
      mockConversationManager.getTokenUsage.mockReturnValue({
        promptTokens: 80000,
        completionTokens: 20000,
        totalTokens: 100000
      });

      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'Test response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: []
      });

      // 执行测试
      await coordinator.executeLLM(mockParams, mockConversationManager);

      // 验证 Token 使用警告事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.TOKEN_USAGE_WARNING,
          tokensUsed: 100000,
          tokenLimit: 100000,
          usagePercentage: 100
        })
      );
    });

    it('应该处理执行错误', async () => {
      // 设置 mock 抛出错误
      mockLLMExecutor.executeLLMCall.mockRejectedValue(new Error('LLM API error'));

      // 执行测试
      const result = await coordinator.executeLLM(mockParams, mockConversationManager);

      // 验证错误处理
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('LLM API error');
      expect(result.content).toBeUndefined();
      expect(result.messages).toBeUndefined();
    });

    it('应该触发正确的事件', async () => {
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'Test response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: []
      });

      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Hello, world!' },
        { role: 'assistant', content: 'Test response' }
      ]);

      mockConversationManager.getTokenUsage.mockReturnValue({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      });

      // 执行测试
      await coordinator.executeLLM(mockParams, mockConversationManager);

      // 验证事件触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.MESSAGE_ADDED,
          role: 'user',
          content: 'Hello, world!'
        })
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.MESSAGE_ADDED,
          role: 'assistant',
          content: 'Test response'
        })
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.CONVERSATION_STATE_CHANGED,
          messageCount: 2,
          tokenUsage: 150
        })
      );
    });

    it('应该在没有事件管理器时正常工作', async () => {
      // 创建最小化的事件管理器
      const minimalEventManager = {
        emit: jest.fn()
      } as any;

      // 创建协调器
      const coordinatorWithoutEvents = new LLMExecutionCoordinator(mockLLMExecutor, mockToolService, minimalEventManager);

      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'Test response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: []
      });

      // 设置对话管理器返回值
      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Hello, world!' },
        { role: 'assistant', content: 'Test response' }
      ]);

      // 执行测试
      const result = await coordinatorWithoutEvents.executeLLM(mockParams, mockConversationManager);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.content).toBe('Test response');
    });
  });

  describe('getAvailableTools', () => {
    it('应该正确合并静态和动态工具', () => {
      const workflowTools = new Set(['static-tool-1', 'static-tool-2']);
      const dynamicTools = {
        toolIds: ['dynamic-tool-1', 'dynamic-tool-2'],
        descriptionTemplate: 'Dynamic tool: {name}'
      };

      // Mock 工具服务
      mockToolService.getTool.mockImplementation((id: string) => {
        const tools: Record<string, any> = {
          'static-tool-1': { name: 'static-tool-1', description: 'Static tool 1', parameters: {} },
          'static-tool-2': { name: 'static-tool-2', description: 'Static tool 2', parameters: {} },
          'dynamic-tool-1': { name: 'dynamic-tool-1', description: 'Dynamic tool 1', parameters: {} },
          'dynamic-tool-2': { name: 'dynamic-tool-2', description: 'Dynamic tool 2', parameters: {} }
        };
        return tools[id] || null;
      });

      // 使用私有方法测试
      const availableTools = (coordinator as any).getAvailableTools(workflowTools, dynamicTools);

      // 验证结果
      expect(availableTools).toHaveLength(4);
      expect(availableTools).toEqual(
        expect.arrayContaining([
          { name: 'static-tool-1', description: 'Static tool 1', parameters: {} },
          { name: 'static-tool-2', description: 'Static tool 2', parameters: {} },
          { name: 'dynamic-tool-1', description: 'Dynamic tool 1', parameters: {} },
          { name: 'dynamic-tool-2', description: 'Dynamic tool 2', parameters: {} }
        ])
      );
    });

    it('应该过滤掉不存在的工具', () => {
      const workflowTools = new Set(['existing-tool', 'non-existent-tool']);
      const dynamicTools = {
        toolIds: ['another-existing-tool', 'another-non-existent-tool']
      };

      // Mock 工具服务 - 只返回存在的工具
      mockToolService.getTool.mockImplementation((id: string) => {
        if (id === 'existing-tool' || id === 'another-existing-tool') {
          return { name: id, description: `${id} description`, parameters: {} };
        }
        return null;
      });

      const availableTools = (coordinator as any).getAvailableTools(workflowTools, dynamicTools);

      // 验证结果 - 只包含存在的工具
      expect(availableTools).toHaveLength(2);
      expect(availableTools).toEqual(
        expect.arrayContaining([
          { name: 'existing-tool', description: 'existing-tool description', parameters: {} },
          { name: 'another-existing-tool', description: 'another-existing-tool description', parameters: {} }
        ])
      );
    });

    it('应该在没有动态工具时只返回静态工具', () => {
      const workflowTools = new Set(['tool1', 'tool2']);

      mockToolService.getTool.mockImplementation((id: string) => {
        const tools: Record<string, any> = {
          tool1: { name: 'tool1', description: 'Tool 1', parameters: {} },
          tool2: { name: 'tool2', description: 'Tool 2', parameters: {} }
        };
        return tools[id] || null;
      });

      const availableTools = (coordinator as any).getAvailableTools(workflowTools);

      expect(availableTools).toHaveLength(2);
      expect(availableTools).toEqual(
        expect.arrayContaining([
          { name: 'tool1', description: 'Tool 1', parameters: {} },
          { name: 'tool2', description: 'Tool 2', parameters: {} }
        ])
      );
    });
  });

  describe('工具审批机制', () => {
    const mockParamsWithApproval = {
      threadId: 'thread-1',
      nodeId: 'node-1',
      prompt: 'Execute sensitive operation',
      profileId: 'profile-1',
      parameters: { temperature: 0.7 },
      tools: [{ name: 'sensitive_tool', description: 'Sensitive tool' }],
      maxToolCallsPerRequest: 3,
      workflowConfig: {
        toolApproval: {
          autoApprovedTools: ['safe_tool'],
          approvalTimeout: 0 // 禁用超时，让测试能够正常完成
        }
      }
    };

    beforeEach(() => {
      // 设置事件管理器的 on 和 off 方法
      mockEventManager.on = jest.fn();
      mockEventManager.off = jest.fn();
    });

    it('应该检查工具是否需要审批', () => {
      const workflowConfig = {
        toolApproval: {
          autoApprovedTools: ['safe_tool', 'another_safe_tool'],
          approvalTimeout: 30000
        }
      };

      // 测试需要审批的工具
      expect((coordinator as any).requiresHumanApproval('sensitive_tool', workflowConfig)).toBe(true);
      expect((coordinator as any).requiresHumanApproval('dangerous_tool', workflowConfig)).toBe(true);

      // 测试不需要审批的工具（白名单）
      expect((coordinator as any).requiresHumanApproval('safe_tool', workflowConfig)).toBe(false);
      expect((coordinator as any).requiresHumanApproval('another_safe_tool', workflowConfig)).toBe(false);

      // 测试没有配置审批的情况
      expect((coordinator as any).requiresHumanApproval('any_tool', undefined)).toBe(false);
      expect((coordinator as any).requiresHumanApproval('any_tool', {})).toBe(false);
    });

    it('应该为需要审批的工具触发审批流程', async () => {
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'I need to execute a sensitive operation',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: [
          {
            id: 'call-1',
            name: 'sensitive_tool',
            arguments: '{"param": "value"}'
          }
        ]
      });

      mockToolService.getTool.mockReturnValue({
        name: 'sensitive_tool',
        description: 'A sensitive tool that requires approval',
        parameters: {}
      });

      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Execute sensitive operation' },
        { role: 'assistant', content: 'I need to execute a sensitive operation' }
      ]);

      // 使用Jest模拟异步等待 - 虚拟超时
      const waitForUserInteractionResponse = jest.fn().mockResolvedValue({
        interactionId: 'test-interaction-id',
        inputData: {
          toolName: 'sensitive_tool',
          toolDescription: 'A sensitive tool that requires approval',
          toolParameters: { param: 'value' },
          approved: true
        }
      });

      // 模拟 waitForUserInteractionResponse 方法
      jest.spyOn(coordinator as any, 'waitForUserInteractionResponse').mockImplementation(waitForUserInteractionResponse);

      // 执行测试
      await coordinator.executeLLM(mockParamsWithApproval, mockConversationManager);

      // 验证审批请求事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.USER_INTERACTION_REQUESTED,
          operationType: UserInteractionOperationType.TOOL_APPROVAL,
          prompt: '是否批准调用工具 "sensitive_tool"?'
        })
      );

      // 验证工具被执行
      expect(mockToolCallExecutor.executeToolCalls).toHaveBeenCalled();
    }, 5000); // 减少超时时间，因为现在使用虚拟等待

    it('应该跳过被用户拒绝的工具调用', async () => {
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'I need to execute a sensitive operation',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: [
          {
            id: 'call-1',
            name: 'sensitive_tool',
            arguments: '{"param": "value"}'
          }
        ]
      });

      mockToolService.getTool.mockReturnValue({
        name: 'sensitive_tool',
        description: 'A sensitive tool that requires approval',
        parameters: {}
      });

      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Execute sensitive operation' },
        { role: 'assistant', content: 'I need to execute a sensitive operation' }
      ]);

      // 使用Jest模拟异步等待 - 虚拟超时（用户拒绝）
      const waitForUserInteractionResponse = jest.fn().mockResolvedValue({
        interactionId: 'test-interaction-id',
        inputData: {
          toolName: 'sensitive_tool',
          toolDescription: 'A sensitive tool that requires approval',
          toolParameters: { param: 'value' },
          approved: false
        }
      });

      // 模拟 waitForUserInteractionResponse 方法
      jest.spyOn(coordinator as any, 'waitForUserInteractionResponse').mockImplementation(waitForUserInteractionResponse);

      // 执行测试
      await coordinator.executeLLM(mockParamsWithApproval, mockConversationManager);

      // 验证审批请求事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.USER_INTERACTION_REQUESTED,
          operationType: UserInteractionOperationType.TOOL_APPROVAL,
          prompt: '是否批准调用工具 "sensitive_tool"?'
        })
      );

      // 验证工具未被执行
      expect(mockToolCallExecutor.executeToolCalls).not.toHaveBeenCalled();

      // 验证拒绝消息被添加到对话
      expect(mockConversationManager.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'tool',
          content: expect.stringContaining('rejected by user approval')
        })
      );
    }, 5000); // 减少超时时间，因为现在使用虚拟等待

    it('应该使用用户编辑后的参数执行工具', async () => {
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'I need to execute a sensitive operation',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: [
          {
            id: 'call-1',
            name: 'sensitive_tool',
            arguments: '{"param": "original_value"}'
          }
        ]
      });

      mockToolService.getTool.mockReturnValue({
        name: 'sensitive_tool',
        description: 'A sensitive tool that requires approval',
        parameters: {}
      });

      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Execute sensitive operation' },
        { role: 'assistant', content: 'I need to execute a sensitive operation' }
      ]);

      // 使用Jest模拟异步等待 - 虚拟超时（用户编辑参数）
      const waitForUserInteractionResponse = jest.fn().mockResolvedValue({
        interactionId: 'test-interaction-id',
        inputData: {
          toolName: 'sensitive_tool',
          toolDescription: 'A sensitive tool that requires approval',
          toolParameters: { param: 'original_value' },
          approved: true,
          editedParameters: { param: 'edited_value' }
        }
      });

      // 模拟 waitForUserInteractionResponse 方法
      jest.spyOn(coordinator as any, 'waitForUserInteractionResponse').mockImplementation(waitForUserInteractionResponse);

      // 执行测试
      await coordinator.executeLLM(mockParamsWithApproval, mockConversationManager);

      // 验证审批请求事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.USER_INTERACTION_REQUESTED,
          operationType: UserInteractionOperationType.TOOL_APPROVAL,
          prompt: '是否批准调用工具 "sensitive_tool"?'
        })
      );

      // 验证工具使用编辑后的参数被执行
      expect(mockToolCallExecutor.executeToolCalls).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            arguments: JSON.stringify({ param: 'edited_value' })
          })
        ],
        mockConversationManager,
        'thread-1',
        'node-1'
      );
    }, 30000); // 增加超时时间

    it('应该将用户指令添加到对话历史', async () => {
      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'I need to execute a sensitive operation',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: [
          {
            id: 'call-1',
            name: 'sensitive_tool',
            arguments: '{"param": "value"}'
          }
        ]
      });

      mockToolService.getTool.mockReturnValue({
        name: 'sensitive_tool',
        description: 'A sensitive tool that requires approval',
        parameters: {}
      });

      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Execute sensitive operation' },
        { role: 'assistant', content: 'I need to execute a sensitive operation' }
      ]);

      // 使用Jest模拟异步等待 - 虚拟超时（用户提供额外指令）
      const waitForUserInteractionResponse = jest.fn().mockResolvedValue({
        interactionId: 'test-interaction-id',
        inputData: {
          toolName: 'sensitive_tool',
          toolDescription: 'A sensitive tool that requires approval',
          toolParameters: { param: 'value' },
          approved: true,
          userInstruction: 'Please also log the operation'
        }
      });

      // 模拟 waitForUserInteractionResponse 方法
      jest.spyOn(coordinator as any, 'waitForUserInteractionResponse').mockImplementation(waitForUserInteractionResponse);

      // 执行测试
      await coordinator.executeLLM(mockParamsWithApproval, mockConversationManager);

      // 验证审批请求事件
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.USER_INTERACTION_REQUESTED,
          operationType: UserInteractionOperationType.TOOL_APPROVAL,
          prompt: '是否批准调用工具 "sensitive_tool"?'
        })
      );

      // 验证用户指令被添加到对话
      expect(mockConversationManager.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Please also log the operation'
        })
      );
    }, 5000); // 减少超时时间，因为现在使用虚拟等待

    it('应该跳过白名单中的工具审批', async () => {
      const paramsWithWhitelist = {
        ...mockParamsWithApproval,
        tools: [{ name: 'safe_tool', description: 'Safe tool' }]
      };

      mockLLMExecutor.executeLLMCall.mockResolvedValue({
        content: 'I need to execute a safe operation',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        toolCalls: [
          {
            id: 'call-1',
            name: 'safe_tool',
            arguments: '{"param": "value"}'
          }
        ]
      });

      mockToolService.getTool.mockReturnValue({
        name: 'safe_tool',
        description: 'A safe tool',
        parameters: {}
      });

      mockConversationManager.getMessages.mockReturnValue([
        { role: 'user', content: 'Execute safe operation' },
        { role: 'assistant', content: 'I need to execute a safe operation' }
      ]);

      // 执行测试
      await coordinator.executeLLM(paramsWithWhitelist, mockConversationManager);

      // 验证工具直接执行，没有触发审批流程
      expect(mockToolCallExecutor.executeToolCalls).toHaveBeenCalled();
      expect(mockEventManager.emit).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.USER_INTERACTION_REQUESTED,
          operationType: UserInteractionOperationType.TOOL_APPROVAL
        })
      );
    });

  });
});