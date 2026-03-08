import { describe, it, expect, vi } from 'vitest';
import { executeOperation, type MessageOperationCallback } from '../message-operation-utils';
import type {
  MessageOperationContext,
  TruncateMessageOperation,
  InsertMessageOperation,
  ReplaceMessageOperation,
  ClearMessageOperation,
  FilterMessageOperation,
  BatchManagementOperation,
  LLMMessage,
  MessageMarkMap
} from '@modular-agent/types';

describe('message-operation-utils', () => {
  // 创建测试消息数组
  const createTestMessages = (): LLMMessage[] => [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I am doing well' },
    { role: 'tool', content: 'Tool result' }
  ];

  // 创建测试用的 MessageMarkMap
  const createTestMarkMap = (): MessageMarkMap => ({
    originalIndices: [0, 1, 2, 3, 4, 5],
    batchBoundaries: [0],
    boundaryToBatch: [0],
    currentBatch: 0
  });

  // 创建带批次的 MessageMarkMap
  const createMarkMapWithBatches = (): MessageMarkMap => ({
    originalIndices: [0, 1, 2, 3, 4, 5],
    batchBoundaries: [0, 3],
    boundaryToBatch: [0, 1],
    currentBatch: 1
  });

  describe('executeOperation', () => {
    describe('TRUNCATE operation', () => {
      it('应该按 KEEP_FIRST 策略截断可见消息', async () => {
        const messages = createTestMessages();
        const markMap = createMarkMapWithBatches(); // 批次边界在索引3，可见消息为 [3,4,5]
        const operation: TruncateMessageOperation = {
          operation: 'TRUNCATE',
          strategy: { type: 'KEEP_FIRST', count: 2 },
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: true } };

        const result = await executeOperation(context, operation);

        // 期望保留前2条可见消息（索引3和4），丢弃索引5
        expect(result.messages).toHaveLength(5); // 原始消息6条，丢弃1条
        expect(result.messages.map(m => m.content)).toEqual([
          'You are a helpful assistant',
          'Hello',
          'Hi there!',
          'How are you?',
          'I am doing well'
        ]);
        expect(result.markMap.currentBatch).toBe(1);
        expect(result.stats.visibleMessageCount).toBe(2);
      });

      it('应该按 KEEP_LAST 策略截断完整消息数组', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: TruncateMessageOperation = {
          operation: 'TRUNCATE',
          strategy: { type: 'KEEP_LAST', count: 3 },
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: false } };

        const result = await executeOperation(context, operation);

        expect(result.messages).toHaveLength(3);
        expect(result.messages.map(m => m.role)).toEqual(['user', 'assistant', 'tool']);
        expect(result.stats.visibleMessageCount).toBe(3);
      });

      it('截断后应该创建新批次', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: TruncateMessageOperation = {
          operation: 'TRUNCATE',
          strategy: { type: 'KEEP_FIRST', count: 2 },
          createNewBatch: true
        };
        const context: MessageOperationContext = { messages, markMap };

        const result = await executeOperation(context, operation);

        expect(result.markMap.currentBatch).toBe(1);
        expect(result.markMap.batchBoundaries).toEqual([0, 2]);
      });
    });

    describe('INSERT operation', () => {
      it('应该在可见消息的指定位置插入', async () => {
        const messages = createTestMessages();
        const markMap = createMarkMapWithBatches(); // 可见消息索引 [3,4,5]
        const newMessage: LLMMessage = { role: 'user', content: 'New message' };
        const operation: InsertMessageOperation = {
          operation: 'INSERT',
          position: 1, // 在可见消息的索引1处插入（即原始索引4之前）
          messages: [newMessage],
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: true } };

        const result = await executeOperation(context, operation);

        // 期望新消息插入到原始索引4的位置
        expect(result.messages).toHaveLength(7);
        expect(result.messages[4].content).toBe('New message');
        expect(result.messages[4].role).toBe('user');
        expect(result.stats.visibleMessageCount).toBe(4); // 原来3条 + 1条
      });

      it('应该在末尾插入消息（position = -1）', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const newMessage: LLMMessage = { role: 'user', content: 'New message' };
        const operation: InsertMessageOperation = {
          operation: 'INSERT',
          position: -1,
          messages: [newMessage],
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap };

        const result = await executeOperation(context, operation);

        expect(result.messages).toHaveLength(7);
        expect(result.messages[6].content).toBe('New message');
      });

      it('插入后应该创建新批次', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const newMessage: LLMMessage = { role: 'user', content: 'New message' };
        const operation: InsertMessageOperation = {
          operation: 'INSERT',
          position: 0,
          messages: [newMessage],
          createNewBatch: true
        };
        const context: MessageOperationContext = { messages, markMap };

        const result = await executeOperation(context, operation);

        expect(result.markMap.currentBatch).toBe(1);
        // 插入位置为0，所有原始索引后移1，批次边界从0调整为1
        expect(result.markMap.batchBoundaries).toEqual([1, 7]);
      });
    });

    describe('REPLACE operation', () => {
      it('应该替换可见消息', async () => {
        const messages = createTestMessages();
        const markMap = createMarkMapWithBatches(); // 可见消息索引 [3,4,5]
        const newMessage: LLMMessage = { role: 'user', content: 'Replaced' };
        const operation: ReplaceMessageOperation = {
          operation: 'REPLACE',
          index: 0, // 替换第一条可见消息（原始索引3）
          message: newMessage,
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: true } };

        const result = await executeOperation(context, operation);

        expect(result.messages[3].content).toBe('Replaced');
        expect(result.messages[3].role).toBe('user');
        expect(result.messages).toHaveLength(6);
      });

      it('应该替换完整数组中的消息', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const newMessage: LLMMessage = { role: 'user', content: 'Replaced' };
        const operation: ReplaceMessageOperation = {
          operation: 'REPLACE',
          index: 2,
          message: newMessage,
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: false } };

        const result = await executeOperation(context, operation);

        expect(result.messages[2].content).toBe('Replaced');
      });

      it('替换索引越界应该抛出错误', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const newMessage: LLMMessage = { role: 'user', content: 'Replaced' };
        const operation: ReplaceMessageOperation = {
          operation: 'REPLACE',
          index: 10,
          message: newMessage,
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: false } };

        await expect(executeOperation(context, operation)).rejects.toThrow();
      });
    });

    describe('CLEAR operation', () => {
      it('应该清空可见消息', async () => {
        const messages = createTestMessages();
        const markMap = createMarkMapWithBatches(); // 可见消息索引 [3,4,5]
        const operation: ClearMessageOperation = {
          operation: 'CLEAR',
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: true } };

        const result = await executeOperation(context, operation);

        // 期望只保留不可见消息（索引0,1,2）
        expect(result.messages).toHaveLength(3);
        expect(result.messages.map(m => m.content)).toEqual([
          'You are a helpful assistant',
          'Hello',
          'Hi there!'
        ]);
        expect(result.stats.visibleMessageCount).toBe(0);
      });

      it('应该清空所有消息', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: ClearMessageOperation = {
          operation: 'CLEAR',
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: false } };

        const result = await executeOperation(context, operation);

        expect(result.messages).toHaveLength(0);
        expect(result.stats.originalMessageCount).toBe(0);
      });

      it('清空后应该创建新批次', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: ClearMessageOperation = {
          operation: 'CLEAR',
          createNewBatch: true
        };
        const context: MessageOperationContext = { messages, markMap };

        const result = await executeOperation(context, operation);

        expect(result.markMap.currentBatch).toBe(1);
        expect(result.markMap.batchBoundaries).toEqual([0, 0]);
      });
    });

    describe('FILTER operation', () => {
      it('应该按角色过滤可见消息', async () => {
        const messages = createTestMessages();
        const markMap = createMarkMapWithBatches(); // 可见消息索引 [3,4,5] 对应角色 user, assistant, tool
        const operation: FilterMessageOperation = {
          operation: 'FILTER',
          roles: ['user'],
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: true } };

        const result = await executeOperation(context, operation);

        // 期望只保留 user 消息（索引3）
        expect(result.messages).toHaveLength(4); // 不可见消息3条 + 1条user
        expect(result.messages[3].role).toBe('user');
        expect(result.messages[3].content).toBe('How are you?');
        expect(result.stats.visibleMessageCount).toBe(1);
      });

      it('应该按内容关键词过滤完整数组', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: FilterMessageOperation = {
          operation: 'FILTER',
          contentContains: ['Hello'],
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap, options: { visibleOnly: false } };

        const result = await executeOperation(context, operation);

        // 只保留包含 "Hello" 的消息（索引1）
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].content).toBe('Hello');
      });

      it('过滤后应该创建新批次', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: FilterMessageOperation = {
          operation: 'FILTER',
          roles: ['user'],
          createNewBatch: true
        };
        const context: MessageOperationContext = { messages, markMap };

        const result = await executeOperation(context, operation);

        expect(result.markMap.currentBatch).toBe(1);
        expect(result.markMap.batchBoundaries).toEqual([0, 2]); // 过滤后保留2条user消息
      });
    });

    describe('BATCH_MANAGEMENT operation', () => {
      it('应该创建新批次', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: BatchManagementOperation = {
          operation: 'BATCH_MANAGEMENT',
          batchOperation: 'START_NEW_BATCH',
          boundaryIndex: 3
        };
        const context: MessageOperationContext = { messages, markMap };

        const result = await executeOperation(context, operation);

        expect(result.markMap.currentBatch).toBe(1);
        expect(result.markMap.batchBoundaries).toEqual([0, 3]);
        expect(result.messages).toBe(messages); // 消息数组不变
      });

      it('应该回退到指定批次', async () => {
        const messages = createTestMessages();
        const markMap = createMarkMapWithBatches(); // 当前批次1，边界3
        const operation: BatchManagementOperation = {
          operation: 'BATCH_MANAGEMENT',
          batchOperation: 'ROLLBACK_TO_BATCH',
          targetBatch: 0
        };
        const context: MessageOperationContext = { messages, markMap };

        const result = await executeOperation(context, operation);

        expect(result.markMap.currentBatch).toBe(0);
        // 回退到批次0会移除之后的批次边界
        expect(result.markMap.batchBoundaries).toEqual([0]);
      });

      it('缺少必要参数应该抛出错误', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation = {
          operation: 'BATCH_MANAGEMENT',
          batchOperation: 'START_NEW_BATCH'
          // 缺少 boundaryIndex
        } as BatchManagementOperation;
        const context: MessageOperationContext = { messages, markMap };

        await expect(executeOperation(context, operation)).rejects.toThrow();
      });
    });

    describe('callback', () => {
      it('应该执行回调函数', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: TruncateMessageOperation = {
          operation: 'TRUNCATE',
          strategy: { type: 'KEEP_FIRST', count: 2 },
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap };
        const mockCallback = vi.fn<MessageOperationCallback>();

        const result = await executeOperation(context, operation, mockCallback);

        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith(result);
      });

      it('回调函数可以返回 Promise', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation: TruncateMessageOperation = {
          operation: 'TRUNCATE',
          strategy: { type: 'KEEP_FIRST', count: 2 },
          createNewBatch: false
        };
        const context: MessageOperationContext = { messages, markMap };
        const mockCallback = vi.fn<MessageOperationCallback>().mockResolvedValue(undefined);

        await executeOperation(context, operation, mockCallback);

        expect(mockCallback).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('不支持的操作类型应该抛出错误', async () => {
        const messages = createTestMessages();
        const markMap = createTestMarkMap();
        const operation = {
          operation: 'UNKNOWN'
        } as any;
        const context: MessageOperationContext = { messages, markMap };

        await expect(executeOperation(context, operation)).rejects.toThrow('Unsupported operation type');
      });
    });
  });
});
