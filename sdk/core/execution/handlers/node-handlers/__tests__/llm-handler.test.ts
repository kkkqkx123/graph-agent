/**
 * LLM节点处理函数单元测试
 */

import { llmHandler } from '../llm-handler';
import type { Node, LLMNodeConfig } from '../../../../../types/node';
import { NodeType } from '../../../../../types/node';
import type { Thread } from '../../../../../types/thread';
import { ThreadStatus } from '../../../../../types/thread';
import { ExecutionError } from '../../../../../types/errors';

// Mock LLMExecutionCoordinator
jest.mock('../../../coordinators/llm-execution-coordinator', () => ({
  LLMExecutionCoordinator: jest.fn().mockImplementation(() => ({
    executeLLM: jest.fn()
  }))
}));

// Mock LLMWrapper
jest.mock('../../../../llm/wrapper', () => ({
  LLMWrapper: jest.fn().mockImplementation(() => ({
    getProfile: jest.fn()
  }))
}));

// Mock executeHumanRelay
jest.mock('../../human-relay-handler', () => ({
  executeHumanRelay: jest.fn()
}));

// Mock utils
jest.mock('../../../../../utils', () => ({
  now: jest.fn(() => Date.now()),
  diffTimestamp: jest.fn((start, end) => end - start)
}));

import { LLMExecutionCoordinator } from '../../../coordinators/llm-execution-coordinator';
import { LLMWrapper } from '../../../../llm/wrapper';
import { executeHumanRelay } from '../../human-relay-handler';

describe('llm-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;
  let mockContext: any;
  let mockLLMCoordinator: any;
  let mockLLMWrapper: any;

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
      errors: []
    };

    // 初始化mock context
    mockLLMCoordinator = {
      executeLLM: jest.fn()
    };
    mockLLMWrapper = {
      getProfile: jest.fn()
    };
    
    mockContext = {
      llmCoordinator: mockLLMCoordinator,
      llmWrapper: mockLLMWrapper,
      eventManager: {
        emit: jest.fn()
      },
      conversationManager: {
        getMessages: jest.fn(() => []),
        addMessage: jest.fn()
      },
      humanRelayHandler: {
        handle: jest.fn()
      }
    };

    // 重置所有mock
    jest.clearAllMocks();
  });

  describe('基本功能测试', () => {
    it('应该成功执行LLM节点并返回结果', async () => {
      const mockLLMResult = {
        success: true,
        content: 'LLM response content',
        usage: { totalTokens: 100 }
      };

      (mockLLMCoordinator.executeLLM as jest.Mock).mockResolvedValue(mockLLMResult);
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'OPENAI',
        model: 'gpt-4'
      });

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Test prompt',
          profileId: 'openai-profile',
          parameters: { temperature: 0.7 }
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        status: 'COMPLETED',
        content: 'LLM response content',
        executionTime: expect.any(Number)
      });

      expect(mockLLMCoordinator.executeLLM).toHaveBeenCalledWith(
        {
          threadId: 'thread-1',
          nodeId: 'llm-node-1',
          prompt: 'Test prompt',
          profileId: 'openai-profile',
          parameters: { temperature: 0.7 },
          dynamicTools: undefined,
          maxToolCallsPerRequest: undefined
        },
        mockContext.conversationManager
      );
    });

    it('应该在LLM执行失败时返回失败状态', async () => {
      const mockError = new Error('LLM API error');
      const mockLLMResult = {
        success: false,
        error: mockError
      };

      (mockLLMCoordinator.executeLLM as jest.Mock).mockResolvedValue(mockLLMResult);
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'OPENAI',
        model: 'gpt-4'
      });

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Test prompt',
          profileId: 'openai-profile'
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        status: 'FAILED',
        error: mockError,
        executionTime: expect.any(Number)
      });
    });

    it('应该在执行过程中抛出异常时返回失败状态', async () => {
      const mockError = new Error('Unexpected error');
      (mockLLMCoordinator.executeLLM as jest.Mock).mockRejectedValue(mockError);
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'OPENAI',
        model: 'gpt-4'
      });

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Test prompt',
          profileId: 'openai-profile'
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        status: 'FAILED',
        error: mockError,
        executionTime: expect.any(Number)
      });
    });
  });

  describe('HumanRelay provider测试', () => {
    it('应该正确处理HumanRelay provider', async () => {
      const mockHumanRelayResult = {
        message: {
          role: 'user',
          content: 'Human input'
        }
      };

      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'HUMAN_RELAY',
        model: 'human'
      });

      (executeHumanRelay as jest.Mock).mockResolvedValue(mockHumanRelayResult);

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Please provide input',
          profileId: 'human-relay-profile',
          parameters: { timeout: 300000 }
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        status: 'COMPLETED',
        content: 'Human input',
        executionTime: expect.any(Number)
      });

      expect(executeHumanRelay).toHaveBeenCalledWith(
        [],
        'Please provide input',
        300000,
        expect.any(Object),
        mockContext.eventManager,
        mockContext.humanRelayHandler,
        'llm-node-1'
      );
    });

    it('应该在HumanRelay handler未提供时抛出错误', async () => {
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'HUMAN_RELAY',
        model: 'human'
      });

      mockContext.humanRelayHandler = undefined;

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Please provide input',
          profileId: 'human-relay-profile'
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        status: 'FAILED',
        error: expect.any(ExecutionError),
        executionTime: expect.any(Number)
      });

      expect(result.error?.message).toContain('HumanRelayHandler is not provided');
    });

    it('应该在HumanRelay执行失败时返回失败状态', async () => {
      const mockError = new Error('Human relay failed');
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'HUMAN_RELAY',
        model: 'human'
      });

      (executeHumanRelay as jest.Mock).mockRejectedValue(mockError);

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Please provide input',
          profileId: 'human-relay-profile'
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        status: 'FAILED',
        error: mockError,
        executionTime: expect.any(Number)
      });
    });
  });

  describe('配置处理测试', () => {
    it('应该正确处理空prompt', async () => {
      const mockLLMResult = {
        success: true,
        content: 'Response'
      };

      (mockLLMCoordinator.executeLLM as jest.Mock).mockResolvedValue(mockLLMResult);
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'OPENAI',
        model: 'gpt-4'
      });

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          profileId: 'openai-profile'
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(mockLLMCoordinator.executeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: ''
        }),
        expect.any(Object)
      );
    });

    it('应该正确处理dynamicTools配置', async () => {
      const mockLLMResult = {
        success: true,
        content: 'Response'
      };

      (mockLLMCoordinator.executeLLM as jest.Mock).mockResolvedValue(mockLLMResult);
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'OPENAI',
        model: 'gpt-4'
      });

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Test prompt',
          profileId: 'openai-profile',
          dynamicTools: {
            toolIds: ['tool1', 'tool2'],
            descriptionTemplate: 'Tool: {{toolName}}'
          },
          maxToolCallsPerRequest: 5
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(mockLLMCoordinator.executeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamicTools: {
            toolIds: ['tool1', 'tool2'],
            descriptionTemplate: 'Tool: {{toolName}}'
          },
          maxToolCallsPerRequest: 5
        }),
        expect.any(Object)
      );
    });

    it('应该使用默认profileId当未指定时', async () => {
      const mockLLMResult = {
        success: true,
        content: 'Response'
      };

      (mockLLMCoordinator.executeLLM as jest.Mock).mockResolvedValue(mockLLMResult);
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'OPENAI',
        model: 'gpt-4'
      });

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Test prompt'
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(mockLLMWrapper.getProfile).toHaveBeenCalledWith('default');
    });
  });

  describe('执行时间测试', () => {
    it('应该正确计算执行时间', async () => {
      const mockLLMResult = {
        success: true,
        content: 'Response'
      };

      // 模拟异步执行，确保执行时间大于0
      (mockLLMCoordinator.executeLLM as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockLLMResult), 10))
      );
      (mockLLMWrapper.getProfile as jest.Mock).mockReturnValue({
        provider: 'OPENAI',
        model: 'gpt-4'
      });

      mockNode = {
        id: 'llm-node-1',
        name: 'LLM Node',
        type: NodeType.LLM,
        config: {
          prompt: 'Test prompt',
          profileId: 'openai-profile'
        } as LLMNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await llmHandler(mockThread, mockNode, mockContext);

      expect(result.executionTime).toBeGreaterThan(0);
      expect(typeof result.executionTime).toBe('number');
    });
  });
});