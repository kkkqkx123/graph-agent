/**
 * MessageArrayUtils 单元测试
 * 
 * 测试覆盖率目标：> 90%
 */

import { MessageArrayUtils } from '../message-array-utils';
import type { LLMMessage } from '@modular-agent/types/llm';

describe('MessageArrayUtils', () => {
  // 测试数据
  const mockMessages: LLMMessage[] = [
    { role: 'system', content: 'System message' },
    { role: 'user', content: 'User message 1' },
    { role: 'assistant', content: 'Assistant message 1' },
    { role: 'user', content: 'User message 2' },
    { role: 'assistant', content: 'Assistant message 2' }
  ];

  describe('truncateMessages', () => {
    it('应该保留前N条消息', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { keepFirst: 2 });
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('System message');
      expect(result[1]?.content).toBe('User message 1');
    });

    it('应该保留后N条消息', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { keepLast: 2 });
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('User message 2');
      expect(result[1]?.content).toBe('Assistant message 2');
    });

    it('应该删除前N条消息', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { removeFirst: 2 });
      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe('Assistant message 1');
    });

    it('应该删除后N条消息', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { removeLast: 2 });
      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe('System message');
      expect(result[1]?.content).toBe('User message 1');
      expect(result[2]?.content).toBe('Assistant message 1');
    });

    it('应该按范围截断', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { range: { start: 1, end: 3 } });
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('User message 1');
      expect(result[1]?.content).toBe('Assistant message 1');
    });

    it('应该按角色过滤后截断', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { role: 'user', keepFirst: 1 });
      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe('user');
      expect(result[0]?.content).toBe('User message 1');
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.truncateMessages([], { keepFirst: 2 });
      expect(result).toHaveLength(0);
    });

    it('应该处理越界情况', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { keepFirst: 10 });
      expect(result).toHaveLength(5);
    });

    it('应该处理keepFirst为0的情况', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { keepFirst: 0 });
      expect(result).toHaveLength(0);
    });

    it('应该处理keepLast为0的情况', () => {
      const result = MessageArrayUtils.truncateMessages(mockMessages, { keepLast: 0 });
      expect(result).toHaveLength(0);
    });
  });

  describe('insertMessages', () => {
    it('应该在末尾插入消息（position=-1）', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(mockMessages, -1, [newMessage]);
      expect(result).toHaveLength(6);
      expect(result[5]?.content).toBe('New message');
    });

    it('应该在指定位置插入消息', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(mockMessages, 1, [newMessage]);
      expect(result).toHaveLength(6);
      expect(result[1]?.content).toBe('New message');
      expect(result[2]?.content).toBe('User message 1');
    });

    it('应该插入多条消息', () => {
      const newMessages: LLMMessage[] = [
        { role: 'user', content: 'New message 1' },
        { role: 'user', content: 'New message 2' }
      ];
      const result = MessageArrayUtils.insertMessages(mockMessages, 1, newMessages);
      expect(result).toHaveLength(7);
      expect(result[1]?.content).toBe('New message 1');
      expect(result[2]?.content).toBe('New message 2');
    });

    it('应该处理空消息数组', () => {
      const result = MessageArrayUtils.insertMessages(mockMessages, 1, []);
      expect(result).toHaveLength(5);
      expect(result).toEqual(mockMessages);
    });

    it('应该处理负数索引', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(mockMessages, -2, [newMessage]);
      expect(result).toHaveLength(6);
      expect(result[4]?.content).toBe('New message');
    });

    it('应该处理索引越界（大于数组长度）', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(mockMessages, 10, [newMessage]);
      expect(result).toHaveLength(6);
      expect(result[5]?.content).toBe('New message');
    });

    it('应该处理索引越界（小于0）', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(mockMessages, -10, [newMessage]);
      expect(result).toHaveLength(6);
      expect(result[0]?.content).toBe('New message');
    });
  });

  describe('replaceMessage', () => {
    it('应该替换指定索引的消息', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced message' };
      const result = MessageArrayUtils.replaceMessage(mockMessages, 1, newMessage);
      expect(result).toHaveLength(5);
      expect(result[1]?.content).toBe('Replaced message');
    });

    it('应该处理负数索引', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced message' };
      const result = MessageArrayUtils.replaceMessage(mockMessages, -1, newMessage);
      expect(result).toHaveLength(5);
      expect(result[4]?.content).toBe('Replaced message');
    });

    it('应该在索引越界时抛出异常', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced message' };
      expect(() => {
        MessageArrayUtils.replaceMessage(mockMessages, 10, newMessage);
      }).toThrow('Index 10 is out of bounds');
    });

    it('应该在负数索引越界时抛出异常', () => {
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced message' };
      expect(() => {
        MessageArrayUtils.replaceMessage(mockMessages, -10, newMessage);
      }).toThrow('Index -10 is out of bounds');
    });
  });

  describe('clearMessages', () => {
    it('应该清空所有消息（不保留系统消息）', () => {
      const result = MessageArrayUtils.clearMessages(mockMessages, false);
      expect(result).toHaveLength(0);
    });

    it('应该保留系统消息', () => {
      const result = MessageArrayUtils.clearMessages(mockMessages, true);
      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe('system');
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.clearMessages([], true);
      expect(result).toHaveLength(0);
    });

    it('应该处理没有系统消息的数组', () => {
      const messagesWithoutSystem: LLMMessage[] = [
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' }
      ];
      const result = MessageArrayUtils.clearMessages(messagesWithoutSystem, true);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterMessagesByRole', () => {
    it('应该按角色过滤消息', () => {
      const result = MessageArrayUtils.filterMessagesByRole(mockMessages, ['user']);
      expect(result).toHaveLength(2);
      expect(result.every(msg => msg.role === 'user')).toBe(true);
    });

    it('应该支持多个角色', () => {
      const result = MessageArrayUtils.filterMessagesByRole(mockMessages, ['user', 'assistant']);
      expect(result).toHaveLength(4);
      expect(result.every(msg => msg.role === 'user' || msg.role === 'assistant')).toBe(true);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.filterMessagesByRole([], ['user']);
      expect(result).toHaveLength(0);
    });

    it('应该处理没有匹配的消息', () => {
      const result = MessageArrayUtils.filterMessagesByRole(mockMessages, ['tool']);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterMessagesByContent', () => {
    it('应该按包含关键词过滤', () => {
      const result = MessageArrayUtils.filterMessagesByContent(mockMessages, {
        contains: ['message 1']
      });
      expect(result).toHaveLength(2);
      expect(result.every(msg => 
        typeof msg.content === 'string' && msg.content.includes('message 1')
      )).toBe(true);
    });

    it('应该按排除关键词过滤', () => {
      const result = MessageArrayUtils.filterMessagesByContent(mockMessages, {
        excludes: ['message 1']
      });
      expect(result).toHaveLength(3);
      expect(result.every(msg => 
        typeof msg.content === 'string' && !msg.content.includes('message 1')
      )).toBe(true);
    });

    it('应该支持组合过滤条件', () => {
      const result = MessageArrayUtils.filterMessagesByContent(mockMessages, {
        contains: ['message'],
        excludes: ['1']
      });
      expect(result).toHaveLength(3);
      expect(result.every(msg =>
        typeof msg.content === 'string' &&
        msg.content.includes('message') &&
        !msg.content.includes('1')
      )).toBe(true);
    });

    it('应该处理对象类型的内容', () => {
      const messagesWithObject: LLMMessage[] = [
        { role: 'user', content: ['Hello', 123] },
        { role: 'assistant', content: ['World', 456] }
      ];
      const result = MessageArrayUtils.filterMessagesByContent(messagesWithObject, {
        contains: ['Hello']
      });
      expect(result).toHaveLength(1);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.filterMessagesByContent([], { contains: ['test'] });
      expect(result).toHaveLength(0);
    });
  });

  describe('mergeMessageArrays', () => {
    it('应该合并多个消息数组', () => {
      const array1: LLMMessage[] = [{ role: 'user', content: 'Message 1' }];
      const array2: LLMMessage[] = [{ role: 'assistant', content: 'Message 2' }];
      const array3: LLMMessage[] = [{ role: 'user', content: 'Message 3' }];
      const result = MessageArrayUtils.mergeMessageArrays(array1, array2, array3);
      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe('Message 1');
      expect(result[1]?.content).toBe('Message 2');
      expect(result[2]?.content).toBe('Message 3');
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.mergeMessageArrays([], [], []);
      expect(result).toHaveLength(0);
    });

    it('应该处理单个数组', () => {
      const result = MessageArrayUtils.mergeMessageArrays(mockMessages);
      expect(result).toHaveLength(5);
    });
  });

  describe('deduplicateMessages', () => {
    it('应该按默认规则去重', () => {
      const duplicateMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'World' },
        { role: 'assistant', content: 'World' }
      ];
      const result = MessageArrayUtils.deduplicateMessages(duplicateMessages);
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('Hello');
      expect(result[1]?.content).toBe('World');
    });

    it('应该使用自定义键函数去重', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello' }
      ];
      const result = MessageArrayUtils.deduplicateMessages(messages, msg =>
        typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe('Hello');
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.deduplicateMessages([]);
      expect(result).toHaveLength(0);
    });

    it('应该处理没有重复的数组', () => {
      const result = MessageArrayUtils.deduplicateMessages(mockMessages);
      expect(result).toHaveLength(5);
    });
  });

  describe('extractMessagesByRange', () => {
    it('应该提取指定范围的消息', () => {
      const result = MessageArrayUtils.extractMessagesByRange(mockMessages, 1, 3);
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('User message 1');
      expect(result[1]?.content).toBe('Assistant message 1');
    });

    it('应该处理负数索引', () => {
      const result = MessageArrayUtils.extractMessagesByRange(mockMessages, -3, -1);
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('Assistant message 1');
      expect(result[1]?.content).toBe('User message 2');
    });

    it('应该处理越界情况', () => {
      const result = MessageArrayUtils.extractMessagesByRange(mockMessages, 0, 10);
      expect(result).toHaveLength(5);
    });

    it('应该处理空范围', () => {
      const result = MessageArrayUtils.extractMessagesByRange(mockMessages, 2, 2);
      expect(result).toHaveLength(0);
    });
  });

  describe('splitMessagesByRole', () => {
    it('应该按角色分组消息', () => {
      const result = MessageArrayUtils.splitMessagesByRole(mockMessages);
      expect(result.system).toHaveLength(1);
      expect(result.user).toHaveLength(2);
      expect(result.assistant).toHaveLength(2);
      expect(result.tool).toHaveLength(0);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.splitMessagesByRole([]);
      expect(result.system).toHaveLength(0);
      expect(result.user).toHaveLength(0);
      expect(result.assistant).toHaveLength(0);
      expect(result.tool).toHaveLength(0);
    });

    it('应该处理只有一种角色的消息', () => {
      const userMessages: LLMMessage[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'user', content: 'Message 2' }
      ];
      const result = MessageArrayUtils.splitMessagesByRole(userMessages);
      expect(result.user).toHaveLength(2);
      expect(result.assistant).toHaveLength(0);
    });
  });

  describe('validateMessageArray', () => {
    it('应该验证有效的消息数组', () => {
      const result = MessageArrayUtils.validateMessageArray(mockMessages);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测非数组输入', () => {
      const result = MessageArrayUtils.validateMessageArray(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Messages must be an array');
    });

    it('应该检测无效的角色', () => {
      const invalidMessages: LLMMessage[] = [
        { role: 'invalid' as any, content: 'Message' }
      ];
      const result = MessageArrayUtils.validateMessageArray(invalidMessages);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该检测缺失的内容', () => {
      const invalidMessages: LLMMessage[] = [
        { role: 'user', content: null as any }
      ];
      const result = MessageArrayUtils.validateMessageArray(invalidMessages);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.validateMessageArray([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('cloneMessages', () => {
    it('应该深拷贝消息数组', () => {
      const cloned = MessageArrayUtils.cloneMessages(mockMessages);
      expect(cloned).toEqual(mockMessages);
      expect(cloned).not.toBe(mockMessages);
      expect(cloned[0]).not.toBe(mockMessages[0]);
    });

    it('应该深拷贝对象类型的内容', () => {
      const messagesWithObject: LLMMessage[] = [
        { role: 'user', content: ['Hello', 123] }
      ];
      const cloned = MessageArrayUtils.cloneMessages(messagesWithObject);
      expect(cloned[0]?.content).toEqual(messagesWithObject[0]?.content);
      expect(cloned[0]?.content).not.toBe(messagesWithObject[0]?.content);
    });

    it('应该处理空数组', () => {
      const cloned = MessageArrayUtils.cloneMessages([]);
      expect(cloned).toHaveLength(0);
    });
  });

  describe('createMessageSnapshot', () => {
    it('应该创建消息快照', () => {
      const snapshot = MessageArrayUtils.createMessageSnapshot(mockMessages, {
        threadId: 'thread-1',
        workflowId: 'workflow-1'
      });
      expect(snapshot.messages).toHaveLength(5);
      expect(snapshot.threadId).toBe('thread-1');
      expect(snapshot.workflowId).toBe('workflow-1');
      expect(snapshot.messageCount).toBe(5);
      expect(typeof snapshot.timestamp).toBe('number');
    });

    it('应该使用默认时间戳', () => {
      const before = Date.now();
      const snapshot = MessageArrayUtils.createMessageSnapshot(mockMessages);
      const after = Date.now();
      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });

    it('应该深拷贝消息', () => {
      const snapshot = MessageArrayUtils.createMessageSnapshot(mockMessages);
      if (snapshot.messages[0]) {
        snapshot.messages[0].content = 'Modified';
      }
      expect(mockMessages[0]?.content).toBe('System message');
    });
  });

  describe('restoreFromSnapshot', () => {
    it('应该从快照恢复消息', () => {
      const snapshot = MessageArrayUtils.createMessageSnapshot(mockMessages);
      const restored = MessageArrayUtils.restoreFromSnapshot(snapshot);
      expect(restored).toHaveLength(5);
      expect(restored).toEqual(mockMessages);
    });

    it('应该返回深拷贝的消息', () => {
      const snapshot = MessageArrayUtils.createMessageSnapshot(mockMessages);
      const restored = MessageArrayUtils.restoreFromSnapshot(snapshot);
      if (restored[0]) {
        restored[0].content = 'Modified';
      }
      expect(snapshot.messages[0]?.content).toBe('System message');
    });
  });

  describe('getRecentMessages', () => {
    it('应该获取最近N条消息', () => {
      const result = MessageArrayUtils.getRecentMessages(mockMessages, 2);
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe('User message 2');
      expect(result[1]?.content).toBe('Assistant message 2');
    });

    it('应该处理count大于数组长度的情况', () => {
      const result = MessageArrayUtils.getRecentMessages(mockMessages, 10);
      expect(result).toHaveLength(5);
    });

    it('应该处理count为0的情况', () => {
      const result = MessageArrayUtils.getRecentMessages(mockMessages, 0);
      expect(result).toHaveLength(0);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.getRecentMessages([], 2);
      expect(result).toHaveLength(0);
    });
  });

  describe('getRecentMessagesByRole', () => {
    it('应该获取指定角色的最近N条消息', () => {
      const result = MessageArrayUtils.getRecentMessagesByRole(mockMessages, 'user', 1);
      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe('user');
      expect(result[0]?.content).toBe('User message 2');
    });

    it('应该处理count大于匹配消息数量', () => {
      const result = MessageArrayUtils.getRecentMessagesByRole(mockMessages, 'user', 10);
      expect(result).toHaveLength(2);
    });

    it('应该处理没有匹配的消息', () => {
      const result = MessageArrayUtils.getRecentMessagesByRole(mockMessages, 'tool', 2);
      expect(result).toHaveLength(0);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.getRecentMessagesByRole([], 'user', 2);
      expect(result).toHaveLength(0);
    });
  });

  describe('searchMessages', () => {
    it('应该搜索包含关键词的消息', () => {
      const result = MessageArrayUtils.searchMessages(mockMessages, 'message 1');
      expect(result).toHaveLength(2);
      expect(result.every(msg => 
        typeof msg.content === 'string' && msg.content.includes('message 1')
      )).toBe(true);
    });

    it('应该不区分大小写', () => {
      const result = MessageArrayUtils.searchMessages(mockMessages, 'MESSAGE 1');
      expect(result).toHaveLength(2);
    });

    it('应该处理对象类型的内容', () => {
      const messagesWithObject: LLMMessage[] = [
        { role: 'user', content: ['Hello World', 123] }
      ];
      const result = MessageArrayUtils.searchMessages(messagesWithObject, 'Hello');
      expect(result).toHaveLength(1);
    });

    it('应该处理没有匹配的情况', () => {
      const result = MessageArrayUtils.searchMessages(mockMessages, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.searchMessages([], 'test');
      expect(result).toHaveLength(0);
    });
  });
});