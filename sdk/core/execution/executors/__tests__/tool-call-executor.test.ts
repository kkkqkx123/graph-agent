/**
 * ToolCallExecutor 单元测试
 */

import { ToolCallExecutor } from '../tool-call-executor';
import type { ToolService } from '../../../services/tool-service';
import type { EventManager } from '../../../services/event-manager';
import type { ConversationManager } from '../../managers/conversation-manager';
import { EventType } from '../../../../types/events';

// Mock dependencies
const mockToolService = {
  execute: jest.fn()
} as unknown as jest.Mocked<ToolService>;

const mockEventManager = {
  emit: jest.fn()
} as unknown as jest.Mocked<EventManager>;

const mockConversationManager = {
  addMessage: jest.fn()
} as unknown as jest.Mocked<ConversationManager>;

describe('ToolCallExecutor', () => {
  let executor: ToolCallExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new ToolCallExecutor(mockToolService, mockEventManager);
  });

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(executor).toBeInstanceOf(ToolCallExecutor);
    });

    it('应该在没有EventManager的情况下初始化', () => {
      const executorWithoutEventManager = new ToolCallExecutor(mockToolService);
      expect(executorWithoutEventManager).toBeInstanceOf(ToolCallExecutor);
    });
  });

  describe('executeToolCalls', () => {
    const mockToolCalls = [
      {
        id: 'call-1',
        name: 'tool1',
        arguments: '{"param": "value1"}'
      },
      {
        id: 'call-2',
        name: 'tool2',
        arguments: '{"param": "value2"}'
      }
    ];

    it('应该成功执行多个工具调用', async () => {
      mockToolService.execute
        .mockResolvedValueOnce({ success: true, result: 'result1', executionTime: 100, retryCount: 0 })
        .mockResolvedValueOnce({ success: true, result: 'result2', executionTime: 100, retryCount: 0 });

      const results = await executor.executeToolCalls(
        mockToolCalls,
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(results).toHaveLength(2);
      expect((results as any)[0].success).toBe(true);
      expect((results as any)[0].toolCallId).toBe('call-1');
      expect((results as any)[0].toolName).toBe('tool1');
      expect((results as any)[0].result).toBe('result1');
      expect((results as any)[0].executionTime).toBeGreaterThanOrEqual(0);

      expect((results as any)[1].success).toBe(true);
      expect((results as any)[1].toolCallId).toBe('call-2');
      expect((results as any)[1].toolName).toBe('tool2');
      expect((results as any)[1].result).toBe('result2');
    });

    it('应该按顺序执行工具调用', async () => {
      const executionOrder: string[] = [];
      mockToolService.execute.mockImplementation(async (toolName: string) => {
        executionOrder.push(toolName);
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true, result: `result-${toolName}`, executionTime: 100, retryCount: 0 };
      });

      await executor.executeToolCalls(
        mockToolCalls,
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(executionOrder).toEqual(['tool1', 'tool2']);
    });

    it('应该处理部分工具调用失败的情况', async () => {
      mockToolService.execute
        .mockResolvedValueOnce({ success: true, result: 'result1', executionTime: 100, retryCount: 0 })
        .mockRejectedValueOnce(new Error('Tool execution failed'));

      const results = await executor.executeToolCalls(
        mockToolCalls,
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(results).toHaveLength(2);
      expect((results as any)[0].success).toBe(true);
      expect((results as any)[1].success).toBe(false);
      expect((results as any)[1].error).toBe('Tool execution failed');
    });

    it('应该在没有threadId和nodeId的情况下执行', async () => {
      mockToolService.execute.mockResolvedValue({ success: true, result: 'result1', executionTime: 100, retryCount: 0 });

      const results = await executor.executeToolCalls(
        [mockToolCalls[0] as any],
        mockConversationManager
      );

      expect(results).toHaveLength(1);
      expect((results as any)[0].success).toBe(true);
    });

    it('应该处理空工具调用数组', async () => {
      const results = await executor.executeToolCalls(
        [],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(results).toHaveLength(0);
      expect(mockToolService.execute).not.toHaveBeenCalled();
    });
  });

  describe('executeSingleToolCall - 成功场景', () => {
    const mockToolCall = {
      id: 'call-1',
      name: 'test_tool',
      arguments: '{"param": "value"}'
    };

    it('应该成功执行单个工具调用', async () => {
      mockToolService.execute.mockResolvedValue({
        success: true,
        result: { data: 'test result' },
        executionTime: 100,
        retryCount: 0
      });

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].success).toBe(true);
      expect((results as any)[0].result).toEqual({ data: 'test result' });
      expect((results as any)[0].executionTime).toBeGreaterThanOrEqual(0);

      // 验证工具服务调用
      expect(mockToolService.execute).toHaveBeenCalledWith(
        'test_tool',
        { param: 'value' },
        {
          timeout: 30000,
          retries: 0,
          retryDelay: 1000
        }
      );

      // 验证消息添加到对话历史
      expect(mockConversationManager.addMessage).toHaveBeenCalledWith({
        role: 'tool',
        content: JSON.stringify({ data: 'test result' }),
        toolCallId: 'call-1'
      });
    });

    it('应该触发TOOL_CALL_STARTED事件', async () => {
      mockToolService.execute.mockResolvedValue({
        success: true,
        result: 'result',
        executionTime: 100,
        retryCount: 0
      });

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.TOOL_CALL_STARTED,
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolName: 'test_tool',
          toolArguments: '{"param": "value"}'
        })
      );
    });

    it('应该触发MESSAGE_ADDED事件', async () => {
      mockToolService.execute.mockResolvedValue({
        success: true,
        result: 'result',
        executionTime: 100,
        retryCount: 0
      });

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.MESSAGE_ADDED,
          threadId: 'thread-1',
          nodeId: 'node-1',
          role: 'tool',
          content: '"result"',
          toolCalls: undefined
        })
      );
    });

    it('应该触发TOOL_CALL_COMPLETED事件', async () => {
      mockToolService.execute.mockResolvedValue({
        success: true,
        result: 'result',
        executionTime: 100,
        retryCount: 0
      });

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.TOOL_CALL_COMPLETED,
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolName: 'test_tool',
          toolResult: 'result',
          executionTime: expect.any(Number)
        })
      );
    });

    it('应该正确处理undefined的结果', async () => {
      mockToolService.execute.mockResolvedValue({
        success: true,
        result: undefined,
        executionTime: 100,
        retryCount: 0
      });

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].success).toBe(true);
      expect((results as any)[0].result).toBeUndefined();
    });

    it('应该在没有EventManager的情况下正常工作', async () => {
      const executorWithoutEventManager = new ToolCallExecutor(mockToolService);
      mockToolService.execute.mockResolvedValue({
        success: true,
        result: 'result',
        executionTime: 100,
        retryCount: 0
      });

      const results = await executorWithoutEventManager.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].success).toBe(true);
      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });
  });

  describe('executeSingleToolCall - 失败场景', () => {
    const mockToolCall = {
      id: 'call-1',
      name: 'test_tool',
      arguments: '{"param": "value"}'
    };

    it('应该处理工具执行失败', async () => {
      mockToolService.execute.mockRejectedValue(new Error('Tool failed'));

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].success).toBe(false);
      expect((results as any)[0].error).toBe('Tool failed');
      expect((results as any)[0].executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该在失败时将错误信息添加到对话历史', async () => {
      mockToolService.execute.mockRejectedValue(new Error('Tool failed'));

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(mockConversationManager.addMessage).toHaveBeenCalledWith({
        role: 'tool',
        content: JSON.stringify({ error: 'Tool failed' }),
        toolCallId: 'call-1'
      });
    });

    it('应该在失败时触发MESSAGE_ADDED事件', async () => {
      mockToolService.execute.mockRejectedValue(new Error('Tool failed'));

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.MESSAGE_ADDED,
          threadId: 'thread-1',
          nodeId: 'node-1',
          role: 'tool',
          content: JSON.stringify({ error: 'Tool failed' }),
          toolCalls: undefined
        })
      );
    });

    it('应该在失败时触发TOOL_CALL_FAILED事件', async () => {
      mockToolService.execute.mockRejectedValue(new Error('Tool failed'));

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.TOOL_CALL_FAILED,
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolName: 'test_tool',
          error: 'Tool failed'
        })
      );
    });

    it('应该处理非Error类型的错误', async () => {
      mockToolService.execute.mockRejectedValue('String error');

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].success).toBe(false);
      expect((results as any)[0].error).toBe('String error');
    });

    it('应该处理null错误', async () => {
      mockToolService.execute.mockRejectedValue(null);

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].success).toBe(false);
      expect((results as any)[0].error).toBe('null');
    });

    it('应该在失败时仍然记录执行时间', async () => {
      mockToolService.execute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Tool failed');
      });

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].executionTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('工具参数解析', () => {
    it('应该正确解析JSON参数', async () => {
      const mockToolCall = {
        id: 'call-1',
        name: 'test_tool',
        arguments: '{"param1": "value1", "param2": 123}'
      };

      mockToolService.execute.mockResolvedValue({
        success: true,
        result: 'result',
        executionTime: 100,
        retryCount: 0
      });

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(mockToolService.execute).toHaveBeenCalledWith(
        'test_tool',
        { param1: 'value1', param2: 123 },
        expect.any(Object)
      );
    });

    it('应该处理无效的JSON参数', async () => {
      const mockToolCall = {
        id: 'call-1',
        name: 'test_tool',
        arguments: 'invalid json'
      };

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect(results).toHaveLength(1);
      expect((results as any)[0].success).toBe(false);
      expect((results as any)[0].error).toContain('Unexpected token');
    });
  });

  describe('执行时间统计', () => {
    it('应该准确记录执行时间', async () => {
      const mockToolCall = {
        id: 'call-1',
        name: 'test_tool',
        arguments: '{}'
      };

      mockToolService.execute.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, result: 'result', executionTime: 100, retryCount: 0 };
      });

      const results = await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      expect((results as any)[0].executionTime).toBeGreaterThanOrEqual(100);
      expect((results as any)[0].executionTime).toBeLessThan(200);
    });
  });

  describe('事件触发顺序', () => {
    it('应该按正确顺序触发事件', async () => {
      const mockToolCall = {
        id: 'call-1',
        name: 'test_tool',
        arguments: '{}'
      };

      mockToolService.execute.mockResolvedValue({
        success: true,
        result: 'result',
        executionTime: 100,
        retryCount: 0
      });

      await executor.executeToolCalls(
        [mockToolCall],
        mockConversationManager,
        'thread-1',
        'node-1'
      );

      const calls = mockEventManager.emit.mock.calls;
      const eventTypes = calls.map((call: any) => call[0].type);

      expect(eventTypes).toEqual([
        EventType.TOOL_CALL_STARTED,
        EventType.MESSAGE_ADDED,
        EventType.TOOL_CALL_COMPLETED
      ]);
    });
  });
});