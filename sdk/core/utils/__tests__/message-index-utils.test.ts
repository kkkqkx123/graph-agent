/**
 * MessageIndexUtils 单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  getIndicesByRole,
  getRecentIndicesByRole,
  getRangeIndicesByRole,
  getCountByRole,
  getVisibleIndicesByRole,
  getVisibleRecentIndicesByRole,
  getVisibleRangeIndicesByRole,
  getVisibleCountByRole
} from '../message-index-utils.js';
import type { LLMMessage } from '@modular-agent/types';
import type { MessageMarkMap } from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';

// 创建测试消息的辅助函数
function createMockMessages(count: number, role: MessageRole = 'user'): LLMMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role,
    content: `Message ${i + 1}`
  }));
}

function createMixedMessages(): LLMMessage[] {
  return [
    { role: 'system', content: 'System message' },
    { role: 'user', content: 'User message 1' },
    { role: 'assistant', content: 'Assistant message 1' },
    { role: 'user', content: 'User message 2' },
    { role: 'assistant', content: 'Assistant message 2' },
    { role: 'tool', content: 'Tool result' }
  ];
}

// 创建测试用的 MessageMarkMap
function createMockMarkMap(currentBatch: number = 0, batchBoundaries: number[] = [0]): MessageMarkMap {
  return {
    originalIndices: Array.from({ length: 10 }, (_, i) => i),
    batchBoundaries,
    boundaryToBatch: batchBoundaries.map((_, i) => i),
    currentBatch
  };
}

describe('getIndicesByRole', () => {
  it('应该返回指定角色的所有索引', () => {
    const messages = createMixedMessages();
    const result = getIndicesByRole(messages, 'user');
    expect(result).toEqual([1, 3]);
  });

  it('应该返回 assistant 角色的索引', () => {
    const messages = createMixedMessages();
    const result = getIndicesByRole(messages, 'assistant');
    expect(result).toEqual([2, 4]);
  });

  it('应该返回 system 角色的索引', () => {
    const messages = createMixedMessages();
    const result = getIndicesByRole(messages, 'system');
    expect(result).toEqual([0]);
  });

  it('应该返回 tool 角色的索引', () => {
    const messages = createMixedMessages();
    const result = getIndicesByRole(messages, 'tool');
    expect(result).toEqual([5]);
  });

  it('当角色不存在时应该返回空数组', () => {
    const messages = createMixedMessages();
    const result = getIndicesByRole(messages, 'user');
    // 移除所有 user 消息
    const noUserMessages = messages.filter(m => m.role !== 'user');
    const emptyResult = getIndicesByRole(noUserMessages, 'user');
    expect(emptyResult).toEqual([]);
  });

  it('应该处理空消息数组', () => {
    const result = getIndicesByRole([], 'user');
    expect(result).toEqual([]);
  });

  it('应该处理所有消息都是同一角色的情况', () => {
    const messages = createMockMessages(5, 'user');
    const result = getIndicesByRole(messages, 'user');
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('getRecentIndicesByRole', () => {
  it('应该返回指定角色的最近N条消息索引', () => {
    const messages = createMixedMessages();
    const result = getRecentIndicesByRole(messages, 'user', 1);
    expect(result).toEqual([3]);
  });

  it('应该返回指定角色的最近2条消息索引', () => {
    const messages = createMixedMessages();
    const result = getRecentIndicesByRole(messages, 'user', 2);
    expect(result).toEqual([1, 3]);
  });

  it('当N大于角色消息数量时应该返回所有索引', () => {
    const messages = createMixedMessages();
    const result = getRecentIndicesByRole(messages, 'user', 10);
    expect(result).toEqual([1, 3]);
  });

  it('当N为0时应该返回所有索引（slice(-0)返回整个数组）', () => {
    const messages = createMixedMessages();
    const result = getRecentIndicesByRole(messages, 'user', 0);
    // slice(-0) 在 JavaScript 中等同于 slice(0)，返回整个数组
    expect(result).toEqual([1, 3]);
  });

  it('应该处理空消息数组', () => {
    const result = getRecentIndicesByRole([], 'user', 3);
    expect(result).toEqual([]);
  });

  it('应该处理角色不存在的情况', () => {
    const messages = createMixedMessages();
    const result = getRecentIndicesByRole(messages, 'tool', 5);
    expect(result).toEqual([5]);
  });
});

describe('getRangeIndicesByRole', () => {
  it('应该返回指定角色的索引范围', () => {
    const messages = createMixedMessages();
    const result = getRangeIndicesByRole(messages, 'user', 0, 1);
    expect(result).toEqual([1]);
  });

  it('应该返回指定角色的索引范围（多个）', () => {
    const messages = createMixedMessages();
    const result = getRangeIndicesByRole(messages, 'user', 0, 2);
    expect(result).toEqual([1, 3]);
  });

  it('应该处理start为0的情况', () => {
    const messages = createMixedMessages();
    const result = getRangeIndicesByRole(messages, 'user', 0, 1);
    expect(result).toEqual([1]);
  });

  it('应该处理end超出范围的情况', () => {
    const messages = createMixedMessages();
    const result = getRangeIndicesByRole(messages, 'user', 0, 10);
    expect(result).toEqual([1, 3]);
  });

  it('当start >= end时应该返回空数组', () => {
    const messages = createMixedMessages();
    const result = getRangeIndicesByRole(messages, 'user', 1, 1);
    expect(result).toEqual([]);
  });

  it('应该处理空消息数组', () => {
    const result = getRangeIndicesByRole([], 'user', 0, 2);
    expect(result).toEqual([]);
  });

  it('应该处理角色不存在的情况', () => {
    const messages = createMixedMessages();
    const result = getRangeIndicesByRole(messages, 'tool', 0, 2);
    expect(result).toEqual([5]);
  });
});

describe('getCountByRole', () => {
  it('应该返回指定角色的消息数量', () => {
    const messages = createMixedMessages();
    const result = getCountByRole(messages, 'user');
    expect(result).toBe(2);
  });

  it('应该返回 assistant 角色的消息数量', () => {
    const messages = createMixedMessages();
    const result = getCountByRole(messages, 'assistant');
    expect(result).toBe(2);
  });

  it('应该返回 system 角色的消息数量', () => {
    const messages = createMixedMessages();
    const result = getCountByRole(messages, 'system');
    expect(result).toBe(1);
  });

  it('应该返回 tool 角色的消息数量', () => {
    const messages = createMixedMessages();
    const result = getCountByRole(messages, 'tool');
    expect(result).toBe(1);
  });

  it('当角色不存在时应该返回0', () => {
    const messages = createMixedMessages();
    const noUserMessages = messages.filter(m => m.role !== 'user');
    const result = getCountByRole(noUserMessages, 'user');
    expect(result).toBe(0);
  });

  it('应该处理空消息数组', () => {
    const result = getCountByRole([], 'user');
    expect(result).toBe(0);
  });

  it('应该处理所有消息都是同一角色的情况', () => {
    const messages = createMockMessages(5, 'user');
    const result = getCountByRole(messages, 'user');
    expect(result).toBe(5);
  });
});

describe('getVisibleIndicesByRole', () => {
  it('应该返回可见消息中指定角色的索引', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleIndicesByRole(messages, markMap, 'user');
    expect(result).toEqual([1, 3]);
  });

  it('应该只返回大于等于boundary的索引', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [2]);
    const result = getVisibleIndicesByRole(messages, markMap, 'user');
    expect(result).toEqual([3]);
  });

  it('应该处理boundary为0的情况', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleIndicesByRole(messages, markMap, 'system');
    expect(result).toEqual([0]);
  });

  it('当boundary大于所有消息索引时应该返回空数组', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [10]);
    const result = getVisibleIndicesByRole(messages, markMap, 'user');
    expect(result).toEqual([]);
  });

  it('当boundary未定义时应该返回空数组', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(1, [0]); // currentBatch=1, 但batchBoundaries只有[0]
    const result = getVisibleIndicesByRole(messages, markMap, 'user');
    expect(result).toEqual([]);
  });

  it('应该处理空消息数组', () => {
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleIndicesByRole([], markMap, 'user');
    expect(result).toEqual([]);
  });

  it('应该处理角色不存在的情况', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleIndicesByRole(messages, markMap, 'tool');
    expect(result).toEqual([5]);
  });
});

describe('getVisibleRecentIndicesByRole', () => {
  it('应该返回可见消息中指定角色的最近N条消息索引', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRecentIndicesByRole(messages, markMap, 'user', 1);
    expect(result).toEqual([3]);
  });

  it('应该返回可见消息中指定角色的最近2条消息索引', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRecentIndicesByRole(messages, markMap, 'user', 2);
    expect(result).toEqual([1, 3]);
  });

  it('应该考虑boundary的影响', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [2]);
    const result = getVisibleRecentIndicesByRole(messages, markMap, 'user', 2);
    expect(result).toEqual([3]);
  });

  it('当N大于可见角色消息数量时应该返回所有可见索引', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRecentIndicesByRole(messages, markMap, 'user', 10);
    expect(result).toEqual([1, 3]);
  });

  it('当N为0时应该返回所有可见索引（slice(-0)返回整个数组）', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRecentIndicesByRole(messages, markMap, 'user', 0);
    // slice(-0) 在 JavaScript 中等同于 slice(0)，返回整个数组
    expect(result).toEqual([1, 3]);
  });

  it('当boundary未定义时应该返回空数组', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(1, [0]);
    const result = getVisibleRecentIndicesByRole(messages, markMap, 'user', 2);
    expect(result).toEqual([]);
  });

  it('应该处理空消息数组', () => {
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRecentIndicesByRole([], markMap, 'user', 2);
    expect(result).toEqual([]);
  });
});

describe('getVisibleRangeIndicesByRole', () => {
  it('应该返回可见消息中指定角色的索引范围', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRangeIndicesByRole(messages, markMap, 'user', 0, 1);
    expect(result).toEqual([1]);
  });

  it('应该返回可见消息中指定角色的索引范围（多个）', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRangeIndicesByRole(messages, markMap, 'user', 0, 2);
    expect(result).toEqual([1, 3]);
  });

  it('应该考虑boundary的影响', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [2]);
    const result = getVisibleRangeIndicesByRole(messages, markMap, 'user', 0, 2);
    expect(result).toEqual([3]);
  });

  it('当start >= end时应该返回空数组', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRangeIndicesByRole(messages, markMap, 'user', 1, 1);
    expect(result).toEqual([]);
  });

  it('当boundary未定义时应该返回空数组', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(1, [0]);
    const result = getVisibleRangeIndicesByRole(messages, markMap, 'user', 0, 2);
    expect(result).toEqual([]);
  });

  it('应该处理空消息数组', () => {
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRangeIndicesByRole([], markMap, 'user', 0, 2);
    expect(result).toEqual([]);
  });

  it('应该处理end超出范围的情况', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleRangeIndicesByRole(messages, markMap, 'user', 0, 10);
    expect(result).toEqual([1, 3]);
  });
});

describe('getVisibleCountByRole', () => {
  it('应该返回可见消息中指定角色的消息数量', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleCountByRole(messages, markMap, 'user');
    expect(result).toBe(2);
  });

  it('应该考虑boundary的影响', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [2]);
    const result = getVisibleCountByRole(messages, markMap, 'user');
    expect(result).toBe(1);
  });

  it('当boundary为0时应该返回所有消息数量', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleCountByRole(messages, markMap, 'system');
    expect(result).toBe(1);
  });

  it('当boundary大于所有消息索引时应该返回0', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [10]);
    const result = getVisibleCountByRole(messages, markMap, 'user');
    expect(result).toBe(0);
  });

  it('当boundary未定义时应该返回0', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(1, [0]);
    const result = getVisibleCountByRole(messages, markMap, 'user');
    expect(result).toBe(0);
  });

  it('应该处理空消息数组', () => {
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleCountByRole([], markMap, 'user');
    expect(result).toBe(0);
  });

  it('应该处理角色不存在的情况', () => {
    const messages = createMixedMessages();
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleCountByRole(messages, markMap, 'tool');
    expect(result).toBe(1);
  });

  it('应该处理所有可见消息都是同一角色的情况', () => {
    const messages = createMockMessages(5, 'user');
    const markMap = createMockMarkMap(0, [0]);
    const result = getVisibleCountByRole(messages, markMap, 'user');
    expect(result).toBe(5);
  });
});

describe('集成测试', () => {
  it('应该正确处理复杂的消息场景', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'System' },
      { role: 'user', content: 'User 1' },
      { role: 'assistant', content: 'Assistant 1' },
      { role: 'user', content: 'User 2' },
      { role: 'assistant', content: 'Assistant 2' },
      { role: 'user', content: 'User 3' },
      { role: 'assistant', content: 'Assistant 3' }
    ];

    // 测试 getIndicesByRole
    const userIndices = getIndicesByRole(messages, 'user');
    expect(userIndices).toEqual([1, 3, 5]);

    // 测试 getRecentIndicesByRole
    const recentUserIndices = getRecentIndicesByRole(messages, 'user', 2);
    expect(recentUserIndices).toEqual([3, 5]);

    // 测试 getRangeIndicesByRole
    const rangeUserIndices = getRangeIndicesByRole(messages, 'user', 0, 2);
    expect(rangeUserIndices).toEqual([1, 3]);

    // 测试 getCountByRole
    const userCount = getCountByRole(messages, 'user');
    expect(userCount).toBe(3);

    // 测试可见消息相关函数
    const markMap = createMockMarkMap(0, [2]);
    const visibleUserIndices = getVisibleIndicesByRole(messages, markMap, 'user');
    expect(visibleUserIndices).toEqual([3, 5]);

    const visibleRecentUserIndices = getVisibleRecentIndicesByRole(messages, markMap, 'user', 1);
    expect(visibleRecentUserIndices).toEqual([5]);

    const visibleRangeUserIndices = getVisibleRangeIndicesByRole(messages, markMap, 'user', 0, 1);
    expect(visibleRangeUserIndices).toEqual([3]);

    const visibleUserCount = getVisibleCountByRole(messages, markMap, 'user');
    expect(visibleUserCount).toBe(2);
  });

  it('应该正确处理边界情况', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'User 1' },
      { role: 'user', content: 'User 2' },
      { role: 'user', content: 'User 3' }
    ];

    const markMap = createMockMarkMap(0, [1]);

    // 测试边界值
    expect(getIndicesByRole(messages, 'user')).toEqual([0, 1, 2]);
    // slice(-0) 返回整个数组，这是 JavaScript 的标准行为
    expect(getRecentIndicesByRole(messages, 'user', 0)).toEqual([0, 1, 2]);
    expect(getRangeIndicesByRole(messages, 'user', 0, 0)).toEqual([]);
    expect(getCountByRole(messages, 'user')).toBe(3);
    expect(getVisibleIndicesByRole(messages, markMap, 'user')).toEqual([1, 2]);
    expect(getVisibleRecentIndicesByRole(messages, markMap, 'user', 1)).toEqual([2]);
    expect(getVisibleRangeIndicesByRole(messages, markMap, 'user', 0, 1)).toEqual([1]);
    expect(getVisibleCountByRole(messages, markMap, 'user')).toBe(2);
  });
});