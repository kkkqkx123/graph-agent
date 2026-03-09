import { describe, it, expect } from 'vitest';
import { MessageArrayUtils } from '../message-array-utils';
import type { LLMMessage } from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';

describe('MessageArrayUtils', () => {
  // 创建测试消息数组
  const createTestMessages = (): LLMMessage[] => [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I am doing well' },
    { role: 'tool', content: 'Tool result' }
  ];

  describe('truncateMessages', () => {
    it('应该保留前N条消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { keepFirst: 2 });
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('user');
    });

    it('应该保留后N条消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { keepLast: 3 });
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
      expect(result[2].role).toBe('tool');
    });

    it('应该删除前N条消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { removeFirst: 2 });
      expect(result).toHaveLength(4);
      expect(result[0].role).toBe('assistant');
    });

    it('应该删除后N条消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { removeLast: 2 });
      expect(result).toHaveLength(4);
      expect(result[result.length - 1].role).toBe('user');
    });

    it('应该按范围截断', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { range: { start: 1, end: 4 } });
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('user');
      expect(result[2].role).toBe('user');
    });

    it('应该按角色过滤后截断', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { role: 'user', keepFirst: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });

    it('keepFirst为0时应该返回空数组', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { keepFirst: 0 });
      expect(result).toHaveLength(0);
    });

    it('keepLast为0时应该返回空数组', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.truncateMessages(messages, { keepLast: 0 });
      expect(result).toHaveLength(0);
    });

    it('不应该修改原数组', () => {
      const messages = createTestMessages();
      const originalLength = messages.length;
      MessageArrayUtils.truncateMessages(messages, { keepFirst: 2 });
      expect(messages).toHaveLength(originalLength);
    });
  });

  describe('insertMessages', () => {
    it('应该在指定位置插入消息', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(messages, 2, [newMessage]);
      expect(result).toHaveLength(7);
      expect(result[2].content).toBe('New message');
    });

    it('应该在末尾插入消息（position=-1）', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(messages, -1, [newMessage]);
      expect(result).toHaveLength(7);
      expect(result[result.length - 1].content).toBe('New message');
    });

    it('应该处理负数索引', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(messages, -2, [newMessage]);
      expect(result).toHaveLength(7);
      expect(result[result.length - 2].content).toBe('New message');
    });

    it('应该处理越界索引（小于0）', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(messages, -10, [newMessage]);
      expect(result).toHaveLength(7);
      expect(result[0].content).toBe('New message');
    });

    it('应该处理越界索引（大于长度）', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'New message' };
      const result = MessageArrayUtils.insertMessages(messages, 100, [newMessage]);
      expect(result).toHaveLength(7);
      expect(result[result.length - 1].content).toBe('New message');
    });

    it('空消息数组应该返回原数组', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.insertMessages(messages, 2, []);
      expect(result).toHaveLength(6);
      expect(result).toEqual(messages);
    });

    it('不应该修改原数组', () => {
      const messages = createTestMessages();
      const originalLength = messages.length;
      MessageArrayUtils.insertMessages(messages, 2, [{ role: 'user', content: 'New' }]);
      expect(messages).toHaveLength(originalLength);
    });
  });

  describe('replaceMessage', () => {
    it('应该替换指定索引的消息', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced' };
      const result = MessageArrayUtils.replaceMessage(messages, 2, newMessage);
      expect(result[2].content).toBe('Replaced');
    });

    it('应该处理负数索引', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced' };
      const result = MessageArrayUtils.replaceMessage(messages, -1, newMessage);
      expect(result[result.length - 1].content).toBe('Replaced');
    });

    it('索引越界时应该抛出异常', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced' };
      expect(() => MessageArrayUtils.replaceMessage(messages, 100, newMessage)).toThrow();
    });

    it('负数索引越界时应该抛出异常', () => {
      const messages = createTestMessages();
      const newMessage: LLMMessage = { role: 'user', content: 'Replaced' };
      expect(() => MessageArrayUtils.replaceMessage(messages, -100, newMessage)).toThrow();
    });

    it('不应该修改原数组', () => {
      const messages = createTestMessages();
      const originalContent = messages[2].content;
      MessageArrayUtils.replaceMessage(messages, 2, { role: 'user', content: 'New' });
      expect(messages[2].content).toBe(originalContent);
    });
  });

  describe('clearMessages', () => {
    it('应该清空所有消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.clearMessages(messages, false);
      expect(result).toHaveLength(0);
    });

    it('应该保留系统消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.clearMessages(messages, true);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('system');
    });

    it('默认应该保留系统消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.clearMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('system');
    });
  });

  describe('filterMessagesByRole', () => {
    it('应该按角色过滤消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.filterMessagesByRole(messages, ['user']);
      expect(result).toHaveLength(2);
      expect(result.every((msg: { role: string; }) => msg.role === 'user')).toBe(true);
    });

    it('应该支持多个角色', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.filterMessagesByRole(messages, ['user', 'assistant']);
      expect(result).toHaveLength(4);
    });

    it('空角色数组应该返回空数组', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.filterMessagesByRole(messages, []);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterMessagesByContent', () => {
    it('应该按包含关键词过滤', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.filterMessagesByContent(messages, { contains: ['Hello'] });
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('Hello');
    });

    it('应该按排除关键词过滤', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.filterMessagesByContent(messages, { excludes: ['Hello'] });
      expect(result).toHaveLength(5);
      expect(result.every((msg: LLMMessage) => typeof msg.content === 'string' && !msg.content.includes('Hello'))).toBe(true);
    });

    it('应该同时支持包含和排除', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.filterMessagesByContent(messages, {
        contains: ['you'],
        excludes: ['assistant']
      });
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });

    it('应该处理对象类型的内容', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: [{ text: 'Hello', type: 'text' }] }
      ];
      const result = MessageArrayUtils.filterMessagesByContent(messages, { contains: ['Hello'] });
      expect(result).toHaveLength(1);
    });
  });

  describe('mergeMessageArrays', () => {
    it('应该合并多个消息数组', () => {
      const messages1 = createTestMessages();
      const messages2 = [{ role: 'user', content: 'New' } as LLMMessage];
      const result = MessageArrayUtils.mergeMessageArrays(messages1, messages2);
      expect(result).toHaveLength(7);
    });

    it('应该合并多个数组', () => {
      const messages1 = [{ role: 'user', content: '1' } as LLMMessage];
      const messages2 = [{ role: 'user', content: '2' } as LLMMessage];
      const messages3 = [{ role: 'user', content: '3' } as LLMMessage];
      const result = MessageArrayUtils.mergeMessageArrays(messages1, messages2, messages3);
      expect(result).toHaveLength(3);
    });

    it('空数组应该返回空数组', () => {
      const result = MessageArrayUtils.mergeMessageArrays();
      expect(result).toHaveLength(0);
    });
  });

  describe('deduplicateMessages', () => {
    it('应该按默认规则去重', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];
      const result = MessageArrayUtils.deduplicateMessages(messages);
      expect(result).toHaveLength(2);
    });

    it('应该使用自定义keyFn去重', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];
      const result = MessageArrayUtils.deduplicateMessages(messages, (msg: { role: any; }) => msg.role);
      expect(result).toHaveLength(2);
    });

    it('应该处理对象类型的内容', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: [{ text: 'Hello', type: 'text' }] },
        { role: 'user', content: [{ text: 'Hello', type: 'text' }] }
      ];
      const result = MessageArrayUtils.deduplicateMessages(messages);
      expect(result).toHaveLength(1);
    });
  });

  describe('extractMessagesByRange', () => {
    it('应该提取指定范围的消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.extractMessagesByRange(messages, 1, 4);
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('user');
    });

    it('应该处理超出范围的索引', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.extractMessagesByRange(messages, 0, 100);
      expect(result).toHaveLength(6);
    });
  });

  describe('splitMessagesByRole', () => {
    it('应该按角色分组消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.splitMessagesByRole(messages);
      expect(result.system).toHaveLength(1);
      expect(result.user).toHaveLength(2);
      expect(result.assistant).toHaveLength(2);
      expect(result.tool).toHaveLength(1);
    });

    it('应该处理空数组', () => {
      const result = MessageArrayUtils.splitMessagesByRole([]);
      expect(result.system).toHaveLength(0);
      expect(result.user).toHaveLength(0);
      expect(result.assistant).toHaveLength(0);
      expect(result.tool).toHaveLength(0);
    });
  });

  describe('validateMessageArray', () => {
    it('应该验证有效的消息数组', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.validateMessageArray(messages);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的角色', () => {
      const messages = [{ role: 'invalid' as MessageRole, content: 'test' } as LLMMessage];
      const result = MessageArrayUtils.validateMessageArray(messages);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该检测缺失的内容', () => {
      const messages = [{ role: 'user', content: null as any } as LLMMessage];
      const result = MessageArrayUtils.validateMessageArray(messages);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该检测null消息', () => {
      const messages = [null as any];
      const result = MessageArrayUtils.validateMessageArray(messages);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该检测非数组输入', () => {
      const result = MessageArrayUtils.validateMessageArray(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Messages must be an array');
    });
  });

  describe('cloneMessages', () => {
    it('应该深拷贝消息数组', () => {
      const messages = createTestMessages();
      const cloned = MessageArrayUtils.cloneMessages(messages);
      expect(cloned).toEqual(messages);
      expect(cloned).not.toBe(messages);
    });

    it('应该深拷贝对象类型的内容', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: [{ text: 'Hello', type: 'text' }] }
      ];
      const cloned = MessageArrayUtils.cloneMessages(messages);
      expect(cloned[0].content).toEqual(messages[0].content);
      expect(cloned[0].content).not.toBe(messages[0].content);
    });
  });

  describe('createMessageSnapshot', () => {
    it('应该创建消息快照', () => {
      const messages = createTestMessages();
      const snapshot = MessageArrayUtils.createMessageSnapshot(messages);
      expect(snapshot.messages).toEqual(messages);
      expect(snapshot.messageCount).toBe(6);
      expect(snapshot.timestamp).toBeDefined();
    });

    it('应该包含自定义元数据', () => {
      const messages = createTestMessages();
      const snapshot = MessageArrayUtils.createMessageSnapshot(messages, {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: 1234567890
      });
      expect(snapshot.threadId).toBe('thread-1');
      expect(snapshot.workflowId).toBe('workflow-1');
      expect(snapshot.timestamp).toBe(1234567890);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('应该从快照恢复消息', () => {
      const messages = createTestMessages();
      const snapshot = MessageArrayUtils.createMessageSnapshot(messages);
      const restored = MessageArrayUtils.restoreFromSnapshot(snapshot);
      expect(restored).toEqual(messages);
      expect(restored).not.toBe(messages);
    });
  });

  describe('getRecentMessages', () => {
    it('应该获取最近N条消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.getRecentMessages(messages, 3);
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('user');
      expect(result[2].role).toBe('tool');
    });

    it('count为0时应该返回空数组', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.getRecentMessages(messages, 0);
      expect(result).toHaveLength(0);
    });

    it('count大于数组长度时应该返回全部消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.getRecentMessages(messages, 100);
      expect(result).toHaveLength(6);
    });
  });

  describe('getRecentMessagesByRole', () => {
    it('应该获取指定角色的最近N条消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.getRecentMessagesByRole(messages, 'user', 1);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('How are you?');
    });

    it('应该处理不存在的角色', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.getRecentMessagesByRole(messages, 'system', 5);
      expect(result).toHaveLength(1);
    });
  });

  describe('searchMessages', () => {
    it('应该搜索包含关键词的消息', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.searchMessages(messages, 'hello');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello');
    });

    it('应该不区分大小写', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.searchMessages(messages, 'HELLO');
      expect(result).toHaveLength(1);
    });

    it('应该处理对象类型的内容', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: [{ text: 'Hello World', type: 'text' }] }
      ];
      const result = MessageArrayUtils.searchMessages(messages, 'hello');
      expect(result).toHaveLength(1);
    });

    it('应该返回空数组如果没有匹配', () => {
      const messages = createTestMessages();
      const result = MessageArrayUtils.searchMessages(messages, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });
});
