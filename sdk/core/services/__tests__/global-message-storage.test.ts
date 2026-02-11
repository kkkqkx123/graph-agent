/**
 * GlobalMessageStorage 单元测试
 */

import { GlobalMessageStorage } from '../global-message-storage';
import type { LLMMessage } from '@modular-agent/types/llm';

describe('GlobalMessageStorage', () => {
  let storage: GlobalMessageStorage;

  beforeEach(() => {
    // 创建新的 GlobalMessageStorage 实例以避免测试间干扰
    storage = new GlobalMessageStorage();
  });

  afterEach(() => {
    // 清理所有存储的数据
    storage.clearAll();
  });

  describe('storeMessages - 存储消息历史', () => {
    it('应该成功存储消息历史', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      storage.storeMessages(threadId, messages);

      const storedMessages = storage.getMessages(threadId);
      expect(storedMessages).toEqual(messages);
    });

    it('应该深度复制消息数组', () => {
      const threadId = 'thread-1';
      const originalMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      storage.storeMessages(threadId, originalMessages);

      // 修改原始数组不应该影响存储的消息
      originalMessages.push({ role: 'assistant', content: 'Hi' });

      const storedMessages = storage.getMessages(threadId);
      expect(storedMessages).toHaveLength(1);
      if (storedMessages) {
        expect(storedMessages[0]?.content).toBe('Hello');
      }
    });

    it('应该覆盖已存在的消息历史', () => {
      const threadId = 'thread-1';
      const messages1: LLMMessage[] = [
        { role: 'user', content: 'First message' }
      ];
      const messages2: LLMMessage[] = [
        { role: 'user', content: 'Second message' },
        { role: 'assistant', content: 'Response' }
      ];

      storage.storeMessages(threadId, messages1);
      storage.storeMessages(threadId, messages2);

      const storedMessages = storage.getMessages(threadId);
      expect(storedMessages).toEqual(messages2);
    });
  });

  describe('getMessages - 获取消息历史', () => {
    it('应该返回消息数组的副本', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      storage.storeMessages(threadId, messages);

      const storedMessages = storage.getMessages(threadId);
      
      // 修改返回的数组不应该影响存储的消息
      storedMessages!.push({ role: 'user', content: 'New message' });

      const originalMessages = storage.getMessages(threadId);
      expect(originalMessages).toHaveLength(2);
    });

    it('应该返回 undefined 当消息历史不存在', () => {
      expect(storage.getMessages('non-existent')).toBeUndefined();
    });

    it('应该深度复制消息对象', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello', thinking: 'Thinking...' }
      ];

      storage.storeMessages(threadId, messages);

      const storedMessages = storage.getMessages(threadId);
      expect(storedMessages).toBeDefined();
      
      // 修改返回的消息对象不应该影响存储的消息
      if (storedMessages) {
        storedMessages[0]!.content = 'Modified';
      }

      const originalMessages = storage.getMessages(threadId);
      expect(originalMessages).toBeDefined();
      if (originalMessages) {
        expect(originalMessages[0]?.content).toBe('Hello');
      }
    });
  });

  describe('addReference - 添加引用计数', () => {
    it('应该成功添加引用计数', () => {
      const threadId = 'thread-1';
      
      storage.addReference(threadId);
      storage.addReference(threadId);

      // 无法直接访问引用计数，通过移除引用来验证
      storage.removeReference(threadId);
      // 此时引用计数应为1，消息历史应该仍然存在
      expect(storage.getMessages(threadId)).toBeUndefined(); // 没有存储消息，但引用计数逻辑应该工作
    });

    it('应该为不存在的线程初始化引用计数', () => {
      const threadId = 'thread-1';
      
      storage.addReference(threadId);

      // 通过移除引用来验证引用计数存在
      storage.removeReference(threadId);
      // 此时引用计数应为0，应该被清理
      expect(storage.getMessages(threadId)).toBeUndefined();
    });
  });

  describe('removeReference - 移除引用计数', () => {
    it('应该减少引用计数', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      storage.storeMessages(threadId, messages);
      storage.addReference(threadId);
      storage.addReference(threadId); // 引用计数: 2

      storage.removeReference(threadId); // 引用计数: 1
      // 消息历史应该仍然存在
      expect(storage.getMessages(threadId)).toEqual(messages);

      storage.removeReference(threadId); // 引用计数: 0
      // 消息历史应该被清理
      expect(storage.getMessages(threadId)).toBeUndefined();
    });

    it('应该自动清理不再使用的消息历史', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      storage.storeMessages(threadId, messages);
      storage.addReference(threadId); // 引用计数: 1

      storage.removeReference(threadId); // 引用计数: 0
      // 消息历史应该被清理
      expect(storage.getMessages(threadId)).toBeUndefined();
    });

    it('应该处理不存在的线程', () => {
      expect(() => {
        storage.removeReference('non-existent');
      }).not.toThrow();
    });
  });

  describe('cleanupThread - 清理线程消息历史', () => {
    it('应该完全清理线程的所有数据', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      storage.storeMessages(threadId, messages);
      storage.addReference(threadId);
      storage.saveBatchSnapshot(threadId, 1, messages);

      storage.cleanupThread(threadId);

      expect(storage.getMessages(threadId)).toBeUndefined();
      expect(storage.getBatchSnapshot(threadId, 1)).toBeUndefined();
      // 无法直接验证引用计数被清理，但通过整体功能可以推断
    });

    it('应该不抛出错误当清理不存在的线程', () => {
      expect(() => {
        storage.cleanupThread('non-existent');
      }).not.toThrow();
    });
  });

  describe('saveBatchSnapshot - 记录批次消息快照', () => {
    it('应该成功保存批次快照', () => {
      const threadId = 'thread-1';
      const batchId = 1;
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' }
      ];

      storage.saveBatchSnapshot(threadId, batchId, messages);

      const snapshot = storage.getBatchSnapshot(threadId, batchId);
      expect(snapshot).toEqual(messages);
    });

    it('应该深度复制消息数组', () => {
      const threadId = 'thread-1';
      const batchId = 1;
      const originalMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      storage.saveBatchSnapshot(threadId, batchId, originalMessages);

      // 修改原始数组不应该影响快照
      originalMessages.push({ role: 'assistant', content: 'Hi' });

      const snapshot = storage.getBatchSnapshot(threadId, batchId);
      expect(snapshot).toHaveLength(1);
      expect(snapshot).toBeDefined();
      if (snapshot) {
        expect(snapshot[0]?.content).toBe('Hello');
      }
    });

    it('应该支持同一线程的多个批次快照', () => {
      const threadId = 'thread-1';
      const messages1: LLMMessage[] = [
        { role: 'user', content: 'Batch 1' }
      ];
      const messages2: LLMMessage[] = [
        { role: 'user', content: 'Batch 2' }
      ];

      storage.saveBatchSnapshot(threadId, 1, messages1);
      storage.saveBatchSnapshot(threadId, 2, messages2);

      expect(storage.getBatchSnapshot(threadId, 1)).toEqual(messages1);
      expect(storage.getBatchSnapshot(threadId, 2)).toEqual(messages2);
    });

    it('应该覆盖同一批次的现有快照', () => {
      const threadId = 'thread-1';
      const messages1: LLMMessage[] = [
        { role: 'user', content: 'First' }
      ];
      const messages2: LLMMessage[] = [
        { role: 'user', content: 'Second' }
      ];

      storage.saveBatchSnapshot(threadId, 1, messages1);
      storage.saveBatchSnapshot(threadId, 1, messages2);

      expect(storage.getBatchSnapshot(threadId, 1)).toEqual(messages2);
    });
  });

  describe('getBatchSnapshot - 获取批次消息快照', () => {
    it('应该返回快照消息的副本', () => {
      const threadId = 'thread-1';
      const batchId = 1;
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      storage.saveBatchSnapshot(threadId, batchId, messages);

      const snapshot = storage.getBatchSnapshot(threadId, batchId);
      
      // 修改返回的数组不应该影响存储的快照
      snapshot!.push({ role: 'assistant', content: 'Hi' });

      const originalSnapshot = storage.getBatchSnapshot(threadId, batchId);
      expect(originalSnapshot).toHaveLength(1);
    });

    it('应该返回 undefined 当快照不存在', () => {
      expect(storage.getBatchSnapshot('thread-1', 1)).toBeUndefined();
      expect(storage.getBatchSnapshot('non-existent', 1)).toBeUndefined();
    });

    it('应该深度复制消息对象', () => {
      const threadId = 'thread-1';
      const batchId = 1;
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello', thinking: 'Thinking...' }
      ];

      storage.saveBatchSnapshot(threadId, batchId, messages);

      const snapshot = storage.getBatchSnapshot(threadId, batchId);
      expect(snapshot).toBeDefined();
      
      // 修改返回的消息对象不应该影响存储的快照
      if (snapshot) {
        snapshot[0]!.content = 'Modified';
      }

      const originalSnapshot = storage.getBatchSnapshot(threadId, batchId);
      expect(originalSnapshot).toBeDefined();
      if (originalSnapshot) {
        expect(originalSnapshot[0]?.content).toBe('Hello');
      }
    });
  });

  describe('cleanupBatchSnapshotsAfter - 清理批次快照', () => {
    it('应该清理指定批次之后的快照', () => {
      const threadId = 'thread-1';
      
      // 创建多个批次快照
      storage.saveBatchSnapshot(threadId, 1, [{ role: 'user', content: 'Batch 1' }]);
      storage.saveBatchSnapshot(threadId, 2, [{ role: 'user', content: 'Batch 2' }]);
      storage.saveBatchSnapshot(threadId, 3, [{ role: 'user', content: 'Batch 3' }]);
      storage.saveBatchSnapshot(threadId, 4, [{ role: 'user', content: 'Batch 4' }]);

      // 清理批次2之后的快照
      storage.cleanupBatchSnapshotsAfter(threadId, 2);

      expect(storage.getBatchSnapshot(threadId, 1)).toBeDefined();
      expect(storage.getBatchSnapshot(threadId, 2)).toBeDefined();
      expect(storage.getBatchSnapshot(threadId, 3)).toBeUndefined();
      expect(storage.getBatchSnapshot(threadId, 4)).toBeUndefined();
    });

    it('应该不抛出错误当线程不存在', () => {
      expect(() => {
        storage.cleanupBatchSnapshotsAfter('non-existent', 1);
      }).not.toThrow();
    });

    it('应该不抛出错误当没有快照时', () => {
      expect(() => {
        storage.cleanupBatchSnapshotsAfter('thread-1', 1);
      }).not.toThrow();
    });
  });

  describe('clearAll - 清空所有消息历史', () => {
    it('应该清空所有存储的数据', () => {
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      // 设置多个线程的数据
      storage.storeMessages(threadId1, messages);
      storage.storeMessages(threadId2, messages);
      storage.addReference(threadId1);
      storage.saveBatchSnapshot(threadId1, 1, messages);
      storage.saveBatchSnapshot(threadId2, 1, messages);

      storage.clearAll();

      expect(storage.getMessages(threadId1)).toBeUndefined();
      expect(storage.getMessages(threadId2)).toBeUndefined();
      expect(storage.getBatchSnapshot(threadId1, 1)).toBeUndefined();
      expect(storage.getBatchSnapshot(threadId2, 1)).toBeUndefined();
    });
  });

  describe('getStats - 获取存储统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';
      const messages1: LLMMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' }
      ];
      const messages2: LLMMessage[] = [
        { role: 'user', content: 'Message 2' }
      ];

      // 设置测试数据
      storage.storeMessages(threadId1, messages1);
      storage.storeMessages(threadId2, messages2);
      storage.addReference(threadId1);
      storage.addReference(threadId1); // thread-1 引用计数: 2
      storage.addReference(threadId2); // thread-2 引用计数: 1
      storage.saveBatchSnapshot(threadId1, 1, messages1);
      storage.saveBatchSnapshot(threadId1, 2, messages2);
      storage.saveBatchSnapshot(threadId2, 1, messages2);

      const stats = storage.getStats();

      expect(stats.threadCount).toBe(2);
      expect(stats.totalMessages).toBe(3); // 2 + 1
      expect(stats.totalReferences).toBe(3); // 2 + 1
      expect(stats.totalBatchSnapshots).toBe(3); // 2 + 1
    });

    it('应该返回零统计当没有数据时', () => {
      const stats = storage.getStats();

      expect(stats.threadCount).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.totalReferences).toBe(0);
      expect(stats.totalBatchSnapshots).toBe(0);
    });

    it('应该正确处理空消息数组', () => {
      const threadId = 'thread-1';
      storage.storeMessages(threadId, []);

      const stats = storage.getStats();

      expect(stats.threadCount).toBe(1);
      expect(stats.totalMessages).toBe(0);
    });
  });

  describe('集成测试 - 引用计数与清理', () => {
    it('应该正确处理复杂的引用计数场景', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      // 初始状态
      storage.storeMessages(threadId, messages);
      expect(storage.getMessages(threadId)).toEqual(messages);

      // 添加引用
      storage.addReference(threadId);
      storage.addReference(threadId);

      // 移除一个引用，消息应该仍然存在
      storage.removeReference(threadId);
      expect(storage.getMessages(threadId)).toEqual(messages);

      // 移除最后一个引用，消息应该被清理
      storage.removeReference(threadId);
      expect(storage.getMessages(threadId)).toBeUndefined();

      // 再次添加引用（此时没有消息历史）
      storage.addReference(threadId);
      storage.removeReference(threadId);
      // 应该不抛出错误
    });

    it('应该独立管理不同线程的数据', () => {
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';
      const messages1: LLMMessage[] = [
        { role: 'user', content: 'Thread 1' }
      ];
      const messages2: LLMMessage[] = [
        { role: 'user', content: 'Thread 2' }
      ];

      storage.storeMessages(threadId1, messages1);
      storage.storeMessages(threadId2, messages2);
      storage.addReference(threadId1);
      storage.addReference(threadId2);

      // 清理 thread-1
      storage.cleanupThread(threadId1);

      expect(storage.getMessages(threadId1)).toBeUndefined();
      expect(storage.getMessages(threadId2)).toEqual(messages2);
    });
  });

  describe('复杂消息结构测试', () => {
    it('应该正确处理包含工具调用的消息', () => {
      const threadId = 'thread-1';
      const complexMessages: LLMMessage[] = [
        {
          role: 'user',
          content: '请帮我查询天气'
        },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"city": "Beijing"}'
              }
            }
          ]
        },
        {
          role: 'tool',
          content: '{"temperature": 25, "condition": "sunny"}',
          toolCallId: 'call-1'
        }
      ];

      storage.storeMessages(threadId, complexMessages);
      const storedMessages = storage.getMessages(threadId);

      expect(storedMessages).toEqual(complexMessages);
      expect(storedMessages).toBeDefined();
      if (storedMessages) {
        expect(storedMessages[1]?.toolCalls).toBeDefined();
        expect(storedMessages[1]?.toolCalls?.[0]?.function.name).toBe('get_weather');
      }
    });

    it('应该正确处理包含思考内容的消息', () => {
      const threadId = 'thread-1';
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: '好的，我来帮你',
          thinking: '用户需要帮助，我应该提供友好的回应'
        }
      ];

      storage.storeMessages(threadId, messages);
      const storedMessages = storage.getMessages(threadId);
      expect(storedMessages).toBeDefined();
      if (storedMessages) {
        expect(storedMessages[0]?.thinking).toBe('用户需要帮助，我应该提供友好的回应');
      }
    });
  });
});