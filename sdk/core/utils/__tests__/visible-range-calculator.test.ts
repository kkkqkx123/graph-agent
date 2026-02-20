import { describe, it, expect } from 'vitest';
import {
  getCurrentBoundary,
  getVisibleOriginalIndices,
  visibleIndexToOriginal,
  originalIndexToVisible,
  getVisibleMessages,
  getInvisibleMessages,
  isMessageVisible,
  getVisibleMessageCount,
  getInvisibleMessageCount
} from '../visible-range-calculator';
import type { LLMMessage } from '@modular-agent/types';
import type { MessageMarkMap } from '@modular-agent/types';

describe('visible-range-calculator', () => {
  // 创建测试用的 MessageMarkMap
  const createTestMarkMap = (): MessageMarkMap => ({
    originalIndices: [0, 1, 2, 3, 4, 5],
    batchBoundaries: [0],
    boundaryToBatch: [0],
    currentBatch: 0
  });

  // 创建测试消息数组
  const createTestMessages = (): LLMMessage[] => [
    { role: 'system', content: 'System message' },
    { role: 'user', content: 'User message 1' },
    { role: 'assistant', content: 'Assistant message 1' },
    { role: 'user', content: 'User message 2' },
    { role: 'assistant', content: 'Assistant message 2' },
    { role: 'tool', content: 'Tool result' }
  ];

  describe('getCurrentBoundary', () => {
    it('应该返回当前批次的边界索引', () => {
      const markMap = createTestMarkMap();
      const boundary = getCurrentBoundary(markMap);
      expect(boundary).toBe(0);
    });

    it('应该返回正确的边界索引（批次1）', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      const boundary = getCurrentBoundary(markMap);
      expect(boundary).toBe(3);
    });

    it('应该返回正确的边界索引（批次2）', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 2, 4];
      markMap.currentBatch = 2;
      
      const boundary = getCurrentBoundary(markMap);
      expect(boundary).toBe(4);
    });

    it('batchBoundaries为空时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [];
      
      expect(() => getCurrentBoundary(markMap)).toThrow();
    });

    it('batchBoundaries为undefined时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = undefined as any;
      
      expect(() => getCurrentBoundary(markMap)).toThrow();
    });

    it('currentBatch为负数时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      markMap.currentBatch = -1;
      
      expect(() => getCurrentBoundary(markMap)).toThrow();
    });

    it('currentBatch越界时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      markMap.currentBatch = 10;
      
      expect(() => getCurrentBoundary(markMap)).toThrow();
    });

    it('边界索引为undefined时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, undefined as any];
      markMap.currentBatch = 1;
      
      expect(() => getCurrentBoundary(markMap)).toThrow();
    });

    it('markMap为null时应该抛出异常', () => {
      expect(() => getCurrentBoundary(null as any)).toThrow();
    });
  });

  describe('getVisibleOriginalIndices', () => {
    it('应该返回所有可见消息的原始索引（边界为0）', () => {
      const markMap = createTestMarkMap();
      const visibleIndices = getVisibleOriginalIndices(markMap);
      
      expect(visibleIndices).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('应该返回边界之后的索引（边界为3）', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      const visibleIndices = getVisibleOriginalIndices(markMap);
      
      expect(visibleIndices).toEqual([3, 4, 5]);
    });

    it('应该返回边界之后的索引（边界为5）', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 5];
      markMap.currentBatch = 1;
      
      const visibleIndices = getVisibleOriginalIndices(markMap);
      
      expect(visibleIndices).toEqual([5]);
    });

    it('边界等于数组长度时应该返回空数组', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 6];
      markMap.currentBatch = 1;
      
      const visibleIndices = getVisibleOriginalIndices(markMap);
      
      expect(visibleIndices).toEqual([]);
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4, 6, 8, 10];
      markMap.batchBoundaries = [0, 4];
      markMap.currentBatch = 1;
      
      const visibleIndices = getVisibleOriginalIndices(markMap);
      
      expect(visibleIndices).toEqual([4, 6, 8, 10]);
    });
  });

  describe('visibleIndexToOriginal', () => {
    it('应该将可见索引转换为原始索引', () => {
      const markMap = createTestMarkMap();
      const originalIndex = visibleIndexToOriginal(2, markMap);
      
      expect(originalIndex).toBe(2);
    });

    it('应该处理边界不为0的情况', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      const originalIndex = visibleIndexToOriginal(0, markMap);
      
      expect(originalIndex).toBe(3);
    });

    it('应该处理多个可见索引', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(visibleIndexToOriginal(0, markMap)).toBe(3);
      expect(visibleIndexToOriginal(1, markMap)).toBe(4);
      expect(visibleIndexToOriginal(2, markMap)).toBe(5);
    });

    it('可见索引为负数时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      expect(() => visibleIndexToOriginal(-1, markMap)).toThrow();
    });

    it('可见索引越界时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      expect(() => visibleIndexToOriginal(10, markMap)).toThrow();
    });

    it('边界为6时所有可见索引都应该越界', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 6];
      markMap.currentBatch = 1;
      
      expect(() => visibleIndexToOriginal(0, markMap)).toThrow();
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4, 6, 8, 10];
      markMap.batchBoundaries = [0, 4];
      markMap.currentBatch = 1;
      
      expect(visibleIndexToOriginal(0, markMap)).toBe(4);
      expect(visibleIndexToOriginal(1, markMap)).toBe(6);
      expect(visibleIndexToOriginal(2, markMap)).toBe(8);
    });
  });

  describe('originalIndexToVisible', () => {
    it('应该将原始索引转换为可见索引', () => {
      const markMap = createTestMarkMap();
      const visibleIndex = originalIndexToVisible(2, markMap);
      
      expect(visibleIndex).toBe(2);
    });

    it('边界之前的消息应该返回null', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(originalIndexToVisible(0, markMap)).toBeNull();
      expect(originalIndexToVisible(1, markMap)).toBeNull();
      expect(originalIndexToVisible(2, markMap)).toBeNull();
    });

    it('边界之后的消息应该返回正确的可见索引', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(originalIndexToVisible(3, markMap)).toBe(0);
      expect(originalIndexToVisible(4, markMap)).toBe(1);
      expect(originalIndexToVisible(5, markMap)).toBe(2);
    });

    it('边界上的消息应该是可见的', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(originalIndexToVisible(3, markMap)).toBe(0);
    });

    it('不存在的原始索引应该返回null', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(originalIndexToVisible(10, markMap)).toBeNull();
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4, 6, 8, 10];
      markMap.batchBoundaries = [0, 4];
      markMap.currentBatch = 1;
      
      expect(originalIndexToVisible(4, markMap)).toBe(0);
      expect(originalIndexToVisible(6, markMap)).toBe(1);
      expect(originalIndexToVisible(8, markMap)).toBe(2);
      expect(originalIndexToVisible(10, markMap)).toBe(3);
    });
  });

  describe('getVisibleMessages', () => {
    it('应该返回所有可见消息（边界为0）', () => {
      const markMap = createTestMarkMap();
      const messages = createTestMessages();
      
      const visibleMessages = getVisibleMessages(messages, markMap);
      
      expect(visibleMessages).toHaveLength(6);
      expect(visibleMessages).toEqual(messages);
    });

    it('应该返回边界之后的消息', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const visibleMessages = getVisibleMessages(messages, markMap);
      
      expect(visibleMessages).toHaveLength(3);
      expect(visibleMessages[0].content).toBe('User message 2');
      expect(visibleMessages[1].content).toBe('Assistant message 2');
      expect(visibleMessages[2].content).toBe('Tool result');
    });

    it('边界等于数组长度时应该返回空数组', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 6];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const visibleMessages = getVisibleMessages(messages, markMap);
      
      expect(visibleMessages).toHaveLength(0);
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4];
      markMap.batchBoundaries = [0, 2];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const visibleMessages = getVisibleMessages(messages, markMap);
      
      expect(visibleMessages).toHaveLength(2);
      expect(visibleMessages[0].content).toBe('Assistant message 1');
      expect(visibleMessages[1].content).toBe('Assistant message 2');
    });

    it('应该过滤掉undefined的消息', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 1, 2, 10]; // 10 超出范围
      markMap.batchBoundaries = [0, 2];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const visibleMessages = getVisibleMessages(messages, markMap);
      
      expect(visibleMessages).toHaveLength(1);
      expect(visibleMessages[0].content).toBe('Assistant message 1');
    });
  });

  describe('getInvisibleMessages', () => {
    it('应该返回边界之前的消息', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const invisibleMessages = getInvisibleMessages(messages, markMap);
      
      expect(invisibleMessages).toHaveLength(3);
      expect(invisibleMessages[0].content).toBe('System message');
      expect(invisibleMessages[1].content).toBe('User message 1');
      expect(invisibleMessages[2].content).toBe('Assistant message 1');
    });

    it('边界为0时应该返回空数组', () => {
      const markMap = createTestMarkMap();
      const messages = createTestMessages();
      
      const invisibleMessages = getInvisibleMessages(messages, markMap);
      
      expect(invisibleMessages).toHaveLength(0);
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4, 6];
      markMap.batchBoundaries = [0, 4];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const invisibleMessages = getInvisibleMessages(messages, markMap);
      
      expect(invisibleMessages).toHaveLength(2);
      expect(invisibleMessages[0].content).toBe('System message');
      expect(invisibleMessages[1].content).toBe('Assistant message 1');
    });

    it('应该过滤掉undefined的消息', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 1, 10]; // 10 超出范围
      markMap.batchBoundaries = [0, 1];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const invisibleMessages = getInvisibleMessages(messages, markMap);
      
      expect(invisibleMessages).toHaveLength(1);
      expect(invisibleMessages[0].content).toBe('System message');
    });
  });

  describe('isMessageVisible', () => {
    it('应该正确判断消息是否可见', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(isMessageVisible(0, markMap)).toBe(false);
      expect(isMessageVisible(1, markMap)).toBe(false);
      expect(isMessageVisible(2, markMap)).toBe(false);
      expect(isMessageVisible(3, markMap)).toBe(true);
      expect(isMessageVisible(4, markMap)).toBe(true);
      expect(isMessageVisible(5, markMap)).toBe(true);
    });

    it('边界为0时所有消息都应该可见', () => {
      const markMap = createTestMarkMap();
      
      expect(isMessageVisible(0, markMap)).toBe(true);
      expect(isMessageVisible(1, markMap)).toBe(true);
      expect(isMessageVisible(2, markMap)).toBe(true);
      expect(isMessageVisible(3, markMap)).toBe(true);
      expect(isMessageVisible(4, markMap)).toBe(true);
      expect(isMessageVisible(5, markMap)).toBe(true);
    });

    it('边界上的消息应该是可见的', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(isMessageVisible(3, markMap)).toBe(true);
    });

    it('不存在的原始索引应该返回false', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      expect(isMessageVisible(10, markMap)).toBe(false);
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4, 6];
      markMap.batchBoundaries = [0, 4];
      markMap.currentBatch = 1;
      
      expect(isMessageVisible(0, markMap)).toBe(false);
      expect(isMessageVisible(2, markMap)).toBe(false);
      expect(isMessageVisible(4, markMap)).toBe(true);
      expect(isMessageVisible(6, markMap)).toBe(true);
    });
  });

  describe('getVisibleMessageCount', () => {
    it('应该返回可见消息数量', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      const count = getVisibleMessageCount(markMap);
      
      expect(count).toBe(3);
    });

    it('边界为0时应该返回所有消息数量', () => {
      const markMap = createTestMarkMap();
      
      const count = getVisibleMessageCount(markMap);
      
      expect(count).toBe(6);
    });

    it('边界等于数组长度时应该返回0', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 6];
      markMap.currentBatch = 1;
      
      const count = getVisibleMessageCount(markMap);
      
      expect(count).toBe(0);
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4, 6, 8, 10];
      markMap.batchBoundaries = [0, 4];
      markMap.currentBatch = 1;
      
      const count = getVisibleMessageCount(markMap);
      
      expect(count).toBe(4);
    });
  });

  describe('getInvisibleMessageCount', () => {
    it('应该返回不可见消息数量', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      const count = getInvisibleMessageCount(markMap);
      
      expect(count).toBe(3);
    });

    it('边界为0时应该返回0', () => {
      const markMap = createTestMarkMap();
      
      const count = getInvisibleMessageCount(markMap);
      
      expect(count).toBe(0);
    });

    it('边界等于数组长度时应该返回所有消息数量', () => {
      const markMap = createTestMarkMap();
      markMap.batchBoundaries = [0, 6];
      markMap.currentBatch = 1;
      
      const count = getInvisibleMessageCount(markMap);
      
      expect(count).toBe(6);
    });

    it('应该处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 2, 4, 6, 8, 10];
      markMap.batchBoundaries = [0, 4];
      markMap.currentBatch = 1;
      
      const count = getInvisibleMessageCount(markMap);
      
      expect(count).toBe(2);
    });
  });

  describe('集成测试', () => {
    it('应该正确处理完整的可见性计算流程', () => {
      const markMap = createTestMarkMap();
      const messages = createTestMessages();
      
      // 初始状态：所有消息可见
      expect(getVisibleMessageCount(markMap)).toBe(6);
      expect(getInvisibleMessageCount(markMap)).toBe(0);
      expect(getVisibleMessages(messages, markMap)).toHaveLength(6);
      expect(getInvisibleMessages(messages, markMap)).toHaveLength(0);
      
      // 创建新批次
      markMap.batchBoundaries = [0, 3];
      markMap.currentBatch = 1;
      
      // 验证可见性
      expect(getVisibleMessageCount(markMap)).toBe(3);
      expect(getInvisibleMessageCount(markMap)).toBe(3);
      expect(getVisibleMessages(messages, markMap)).toHaveLength(3);
      expect(getInvisibleMessages(messages, markMap)).toHaveLength(3);
      
      // 验证索引转换
      expect(visibleIndexToOriginal(0, markMap)).toBe(3);
      expect(originalIndexToVisible(3, markMap)).toBe(0);
      expect(originalIndexToVisible(2, markMap)).toBeNull();
      expect(isMessageVisible(3, markMap)).toBe(true);
      expect(isMessageVisible(2, markMap)).toBe(false);
    });

    it('应该正确处理多个批次的可见性', () => {
      const markMap = createTestMarkMap();
      const messages = createTestMessages();
      
      // 批次0：边界0
      markMap.batchBoundaries = [0];
      markMap.currentBatch = 0;
      expect(getVisibleMessages(messages, markMap)).toHaveLength(6);
      
      // 批次1：边界2
      markMap.batchBoundaries = [0, 2];
      markMap.currentBatch = 1;
      expect(getVisibleMessages(messages, markMap)).toHaveLength(4);
      
      // 批次2：边界4
      markMap.batchBoundaries = [0, 2, 4];
      markMap.currentBatch = 2;
      expect(getVisibleMessages(messages, markMap)).toHaveLength(2);
      
      // 批次3：边界6
      markMap.batchBoundaries = [0, 2, 4, 6];
      markMap.currentBatch = 3;
      expect(getVisibleMessages(messages, markMap)).toHaveLength(0);
    });

    it('应该正确处理不连续的原始索引', () => {
      const markMap = createTestMarkMap();
      markMap.originalIndices = [0, 3, 5, 7, 9, 11];
      markMap.batchBoundaries = [0, 5];
      markMap.currentBatch = 1;
      const messages = createTestMessages();
      
      const visibleMessages = getVisibleMessages(messages, markMap);
      const invisibleMessages = getInvisibleMessages(messages, markMap);
      
      expect(visibleMessages).toHaveLength(1);
      expect(invisibleMessages).toHaveLength(2);
      expect(getVisibleMessageCount(markMap)).toBe(4);
      expect(getInvisibleMessageCount(markMap)).toBe(2);
    });
  });
});