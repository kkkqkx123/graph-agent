/**
 * GetMessagesCommand 单元测试
 */

import { GetMessagesCommand } from '../get-messages-command';
import { threadRegistry } from '../../../../../../core/services/thread-registry';
import { success, failure, isSuccess, isFailure } from '../../../../../types/execution-result';
import type { LLMMessage } from '../../../../../../types/llm';

// Mock threadRegistry
jest.mock('../../../../../core/services/thread-registry');

describe('GetMessagesCommand', () => {
  let mockThreadContext: any;

  beforeEach(() => {
    // 创建mock thread context
    mockThreadContext = {
      conversationManager: {
        getMessages: jest.fn()
      }
    };

    (threadRegistry.get as jest.Mock).mockReturnValue(mockThreadContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetadata', () => {
    it('应该返回正确的元数据', () => {
      const command = new GetMessagesCommand({ threadId: 'test-thread' });

      const metadata = command.getMetadata();

      expect(metadata.name).toBe('GetMessages');
      expect(metadata.description).toBe('获取线程的消息列表');
      expect(metadata.category).toBe('monitoring');
      expect(metadata.requiresAuth).toBe(false);
      expect(metadata.version).toBe('1.0.0');
    });
  });

  describe('validate', () => {
    it('应该验证通过当提供有效的threadId', () => {
      const command = new GetMessagesCommand({ threadId: 'test-thread' });

      const result = command.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证失败当threadId为空', () => {
      const command = new GetMessagesCommand({ threadId: '' });

      const result = command.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('threadId is required and cannot be empty');
    });

    it('应该验证失败当limit为负数', () => {
      const command = new GetMessagesCommand({ threadId: 'test-thread', limit: -1 });

      const result = command.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('limit must be non-negative');
    });

    it('应该验证失败当offset为负数', () => {
      const command = new GetMessagesCommand({ threadId: 'test-thread', offset: -1 });

      const result = command.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('offset must be non-negative');
    });
  });

  describe('execute', () => {
    it('应该成功获取消息列表', async () => {
      const mockMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];

      mockThreadContext.conversationManager.getMessages.mockReturnValue(mockMessages);

      const command = new GetMessagesCommand({ threadId: 'test-thread' });

      const result = await command.execute();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockMessages);
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      }
      });

    it('应该应用排序', async () => {
      const mockMessages: LLMMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'assistant', content: 'Second' }
      ];

      mockThreadContext.conversationManager.getMessages.mockReturnValue(mockMessages);

      const command = new GetMessagesCommand({ threadId: 'test-thread', orderBy: 'desc' });

      const result = await command.execute();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([
          { role: 'assistant', content: 'Second' },
          { role: 'user', content: 'First' }
        ]);
      }
      });

    it('应该应用分页', async () => {
      const mockMessages: LLMMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' },
        { role: 'user', content: 'Message 3' }
      ];

      mockThreadContext.conversationManager.getMessages.mockReturnValue(mockMessages);

      const command = new GetMessagesCommand({ threadId: 'test-thread', offset: 1, limit: 1 });

      const result = await command.execute();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({ role: 'assistant', content: 'Message 2' });
      }
      });

    it('应该返回失败当线程不存在', async () => {
      (threadRegistry.get as jest.Mock).mockReturnValue(null);

      const command = new GetMessagesCommand({ threadId: 'non-existent-thread' });

      const result = await command.execute();

      expect(isSuccess(result)).toBe(false);
      if (isFailure(result)) {
        expect(result.error).toContain('Thread not found: non-existent-thread');
      }
      });

    it('应该返回失败当验证失败', async () => {
      const command = new GetMessagesCommand({ threadId: '' });

      const result = await command.execute();

      expect(isSuccess(result)).toBe(false);
      if (isFailure(result)) {
        expect(result.error).toContain('threadId is required and cannot be empty');
      }
      });
  });
});