/**
 * 消息数组管理器单元测试
 */

import type { Message } from '@modular-agent/types';
import type {
  AppendMessageOperation,
  InsertMessageOperation,
  ReplaceMessageOperation,
  TruncateMessageOperation,
  ClearMessageOperation,
  FilterMessageOperation,
  RollbackMessageOperation
} from '@modular-agent/types';
import { MessageArrayManager } from '../message-array-manager';

describe('MessageArrayManager', () => {
  const createMockMessage = (role: Message['role'], content: string): Message => ({
    role,
    content,
    id: `msg-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  });

  const initialMessages: Message[] = [
    createMockMessage('system', 'You are a helpful assistant'),
    createMockMessage('user', 'Hello'),
    createMockMessage('assistant', 'Hi there!')
  ];

  describe('初始化', () => {
    it('应该正确初始化空消息数组', () => {
      const manager = new MessageArrayManager();
      const state = manager.getState();
      
      expect(state.messages).toEqual([]);
      expect(state.batchSnapshots).toEqual([]);
      expect(state.currentBatchIndex).toBe(0);
      expect(state.totalMessageCount).toBe(0);
    });

    it('应该正确初始化带初始消息的数组', () => {
      const manager = new MessageArrayManager(initialMessages);
      const state = manager.getState();
      
      expect(state.messages).toEqual(initialMessages);
      expect(state.batchSnapshots).toEqual([]);
      expect(state.currentBatchIndex).toBe(0);
      expect(state.totalMessageCount).toBe(3);
    });
  });

  describe('APPEND 操作', () => {
    it('应该正确追加消息（不创建新批次）', () => {
      const manager = new MessageArrayManager(initialMessages);
      const newMessages = [createMockMessage('user', 'How are you?')];
      
      const operation: AppendMessageOperation = {
        operation: 'APPEND',
        messages: newMessages
      };
      
      const result = manager.execute(operation);
      
      const state = manager.getState();
      expect(result.messages).toHaveLength(4);
      expect(result.messages[3]).toEqual(newMessages[0]);
      expect(result.affectedBatchIndex).toBe(0);
      expect(state.batchSnapshots).toHaveLength(0);
      expect(state.currentBatchIndex).toBe(0);
    });

    it('应该支持批量追加', () => {
      const manager = new MessageArrayManager(initialMessages);
      const newMessages = [
        createMockMessage('user', 'First'),
        createMockMessage('user', 'Second')
      ];
      
      const operation: AppendMessageOperation = {
        operation: 'APPEND',
        messages: newMessages
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(5);
      expect(result.messages[3]).toEqual(newMessages[0]);
      expect(result.messages[4]).toEqual(newMessages[1]);
    });
  });

  describe('INSERT 操作', () => {
    it('应该正确在中间插入消息（创建新批次）', () => {
      const manager = new MessageArrayManager(initialMessages);
      const newMessage = createMockMessage('user', 'Inserted message');
      
      const operation: InsertMessageOperation = {
        operation: 'INSERT',
        position: 1,
        messages: [newMessage]
      };
      
      const result = manager.execute(operation);
      
      const state = manager.getState();
      expect(result.messages).toHaveLength(4);
      expect(result.messages[1]).toEqual(newMessage);
      expect(result.affectedBatchIndex).toBe(1);
      expect(state.batchSnapshots).toHaveLength(1);
      expect(state.currentBatchIndex).toBe(1);
    });

    it('应该在开头插入消息', () => {
      const manager = new MessageArrayManager(initialMessages);
      const newMessage = createMockMessage('system', 'New system message');
      
      const operation: InsertMessageOperation = {
        operation: 'INSERT',
        position: 0,
        messages: [newMessage]
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages[0]).toEqual(newMessage);
      expect(result.messages[1]).toEqual(initialMessages[0]);
    });

    it('应该在末尾插入消息', () => {
      const manager = new MessageArrayManager(initialMessages);
      const newMessage = createMockMessage('user', 'Last message');
      
      const operation: InsertMessageOperation = {
        operation: 'INSERT',
        position: 3,
        messages: [newMessage]
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages[3]).toEqual(newMessage);
    });

    it('应该拒绝无效的插入位置', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      expect(() => {
        const operation: InsertMessageOperation = {
          operation: 'INSERT',
          position: -1,
          messages: [createMockMessage('user', 'test')]
        };
        manager.execute(operation);
      }).toThrow('Invalid insert position');
      
      expect(() => {
        const operation: InsertMessageOperation = {
          operation: 'INSERT',
          position: 10,
          messages: [createMockMessage('user', 'test')]
        };
        manager.execute(operation);
      }).toThrow('Invalid insert position');
    });

    it('应该创建快照保存插入前的状态', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: InsertMessageOperation = {
        operation: 'INSERT',
        position: 1,
        messages: [createMockMessage('user', 'test')]
      };
      
      manager.execute(operation);
      
      const snapshot = manager.getBatchSnapshot(0);
      expect(snapshot).toBeDefined();
      expect(snapshot!.messages).toEqual(initialMessages);
      expect(snapshot!.messageCount).toBe(3);
    });
  });

  describe('REPLACE 操作', () => {
    it('应该正确替换消息（创建新批次）', () => {
      const manager = new MessageArrayManager(initialMessages);
      const newMessage = createMockMessage('user', 'Replaced message');
      
      const operation: ReplaceMessageOperation = {
        operation: 'REPLACE',
        index: 1,
        message: newMessage
      };
      
      const result = manager.execute(operation);
      
      const state = manager.getState();
      expect(result.messages[1]).toEqual(newMessage);
      expect(result.messages[0]).toEqual(initialMessages[0]);
      expect(result.affectedBatchIndex).toBe(1);
      expect(state.batchSnapshots).toHaveLength(1);
    });

    it('应该拒绝无效的替换索引', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      expect(() => {
        const operation: ReplaceMessageOperation = {
          operation: 'REPLACE',
          index: -1,
          message: createMockMessage('user', 'test')
        };
        manager.execute(operation);
      }).toThrow('Invalid replace index');
      
      expect(() => {
        const operation: ReplaceMessageOperation = {
          operation: 'REPLACE',
          index: 10,
          message: createMockMessage('user', 'test')
        };
        manager.execute(operation);
      }).toThrow('Invalid replace index');
    });
  });

  describe('TRUNCATE 操作', () => {
    it('应该正确保留前N条消息', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: TruncateMessageOperation = {
        operation: 'TRUNCATE',
        keepFirst: 2
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual(initialMessages[0]);
      expect(result.messages[1]).toEqual(initialMessages[1]);
    });

    it('应该正确保留后N条消息', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: TruncateMessageOperation = {
        operation: 'TRUNCATE',
        keepLast: 2
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual(initialMessages[1]);
      expect(result.messages[1]).toEqual(initialMessages[2]);
    });

    it('应该正确删除前N条消息', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: TruncateMessageOperation = {
        operation: 'TRUNCATE',
        removeFirst: 1
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual(initialMessages[1]);
    });

    it('应该正确删除后N条消息', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: TruncateMessageOperation = {
        operation: 'TRUNCATE',
        removeLast: 1
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toEqual(initialMessages[1]);
    });

    it('应该正确按范围截断', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: TruncateMessageOperation = {
        operation: 'TRUNCATE',
        range: { start: 1, end: 2 }
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(initialMessages[1]);
    });

    it('应该正确按角色过滤后截断', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: TruncateMessageOperation = {
        operation: 'TRUNCATE',
        role: 'user',
        keepFirst: 1
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.role).toBe('user');
    });
  });

  describe('CLEAR 操作', () => {
    it('应该正确清空消息（保留系统消息）', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: ClearMessageOperation = {
        operation: 'CLEAR',
        keepSystemMessage: true
      };
      
      const result = manager.execute(operation);
      
      const state = manager.getState();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.role).toBe('system');
      expect(result.affectedBatchIndex).toBe(1);
      expect(state.batchSnapshots).toHaveLength(1);
    });

    it('应该正确清空所有消息（不保留系统消息）', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: ClearMessageOperation = {
        operation: 'CLEAR',
        keepSystemMessage: false
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(0);
    });

    it('应该创建空快照（无拷贝开销）', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: ClearMessageOperation = {
        operation: 'CLEAR'
      };
      
      manager.execute(operation);
      
      const snapshot = manager.getBatchSnapshot(0);
      expect(snapshot).toBeDefined();
      expect(snapshot!.messages).toEqual([]);
      expect(snapshot!.messageCount).toBe(0);
    });
  });

  describe('FILTER 操作', () => {
    it('应该正确按角色过滤', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: FilterMessageOperation = {
        operation: 'FILTER',
        roles: ['user', 'assistant']
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages.every(msg => msg.role !== 'system')).toBe(true);
    });

    it('应该正确按内容关键词过滤（包含）', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: FilterMessageOperation = {
        operation: 'FILTER',
        contentContains: ['Hello']
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.content).toContain('Hello');
    });

    it('应该正确按内容关键词过滤（排除）', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: FilterMessageOperation = {
        operation: 'FILTER',
        contentExcludes: ['Hello']
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages.every(msg => {
        const content = typeof msg.content === 'string' ? msg.content : '';
        return !content.includes('Hello');
      })).toBe(true);
    });

    it('应该支持组合过滤条件', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: FilterMessageOperation = {
        operation: 'FILTER',
        roles: ['user', 'assistant'],
        contentContains: ['Hi']
      };
      
      const result = manager.execute(operation);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.role).toBe('assistant');
    });
  });

  describe('ROLLBACK 操作', () => {
    it('应该正确回退到指定批次', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      // 执行一些操作创建批次
      const insertOp: InsertMessageOperation = {
        operation: 'INSERT',
        position: 1,
        messages: [createMockMessage('user', 'test')]
      };
      manager.execute(insertOp);
      
      const appendOp: AppendMessageOperation = {
        operation: 'APPEND',
        messages: [createMockMessage('user', 'another')]
      };
      manager.execute(appendOp);
      
      // 回退到批次0
      const rollbackOp: RollbackMessageOperation = {
        operation: 'ROLLBACK',
        targetBatchIndex: 0
      };
      const result = manager.execute(rollbackOp);
      
      const state = manager.getState();
      expect(result.messages).toEqual(initialMessages);
      expect(state.currentBatchIndex).toBe(0);
      expect(state.batchSnapshots).toHaveLength(0);
    });

    it('应该拒绝无效的批次索引', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      expect(() => {
        const operation: RollbackMessageOperation = {
          operation: 'ROLLBACK',
          targetBatchIndex: -1
        };
        manager.execute(operation);
      }).toThrow('Invalid batch index');
      
      expect(() => {
        const operation: RollbackMessageOperation = {
          operation: 'ROLLBACK',
          targetBatchIndex: 10
        };
        manager.execute(operation);
      }).toThrow('Invalid batch index');
    });

    it('应该支持通过rollback方法回退', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: InsertMessageOperation = {
        operation: 'INSERT',
        position: 1,
        messages: [createMockMessage('user', 'test')]
      };
      manager.execute(operation);
      
      const result = manager.rollback(0);
      
      const state = manager.getState();
      expect(result.messages).toEqual(initialMessages);
      expect(state.currentBatchIndex).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该正确计算统计信息', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const stats = manager.getStats();
      
      expect(stats.totalMessages).toBe(3);
      expect(stats.currentBatchMessages).toBe(3);
      expect(stats.totalBatches).toBe(1);
      expect(stats.currentBatchIndex).toBe(0);
    });

    it('应该在创建新批次后更新统计信息', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: InsertMessageOperation = {
        operation: 'INSERT',
        position: 1,
        messages: [createMockMessage('user', 'test')]
      };
      manager.execute(operation);
      
      const stats = manager.getStats();
      
      expect(stats.totalMessages).toBe(4);
      expect(stats.currentBatchMessages).toBe(4);
      expect(stats.totalBatches).toBe(2);
      expect(stats.currentBatchIndex).toBe(1);
    });
  });

  describe('辅助方法', () => {
    it('getCurrentMessages应该返回当前消息的副本', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const messages = manager.getCurrentMessages();
      
      expect(messages).toEqual(initialMessages);
      expect(messages).not.toBe(manager.getState().messages);
    });

    it('getBatchSnapshot应该返回指定批次的快照', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const operation: InsertMessageOperation = {
        operation: 'INSERT',
        position: 1,
        messages: [createMockMessage('user', 'test')]
      };
      manager.execute(operation);
      
      const snapshot = manager.getBatchSnapshot(0);
      
      expect(snapshot).toBeDefined();
      expect(snapshot!.messages).toEqual(initialMessages);
    });

    it('getBatchSnapshot应该对不存在的批次返回null', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      const snapshot = manager.getBatchSnapshot(10);
      
      expect(snapshot).toBeNull();
    });
  });

  describe('复杂场景', () => {
    it('应该支持多次操作和回退', () => {
      const manager = new MessageArrayManager(initialMessages);
      
      // 操作1：插入
      const insertOp: InsertMessageOperation = {
        operation: 'INSERT',
        position: 1,
        messages: [createMockMessage('user', 'inserted')]
      };
      manager.execute(insertOp);
      
      // 操作2：追加
      const appendOp: AppendMessageOperation = {
        operation: 'APPEND',
        messages: [createMockMessage('user', 'appended')]
      };
      manager.execute(appendOp);
      
      // 操作3：替换
      const replaceOp: ReplaceMessageOperation = {
        operation: 'REPLACE',
        index: 2,
        message: createMockMessage('assistant', 'replaced')
      };
      manager.execute(replaceOp);
      
      // 回退到批次1
      const rollbackOp: RollbackMessageOperation = {
        operation: 'ROLLBACK',
        targetBatchIndex: 1
      };
      const result = manager.execute(rollbackOp);
      
      const state = manager.getState();
      expect(result.messages).toHaveLength(5);
      expect(state.currentBatchIndex).toBe(1);
    });

    it('应该正确处理空数组上的操作', () => {
      const manager = new MessageArrayManager();
      
      const operation: AppendMessageOperation = {
        operation: 'APPEND',
        messages: [createMockMessage('user', 'first')]
      };
      const result = manager.execute(operation);
      
      const state = manager.getState();
      expect(result.messages).toHaveLength(1);
      expect(state.currentBatchIndex).toBe(0);
    });
  });
});