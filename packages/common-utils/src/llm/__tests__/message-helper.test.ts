/**
 * LLM 消息辅助工具单元测试
 */

import { describe, it, expect } from '@jest/globals';
import type { LLMMessage } from '@modular-agent/types/llm';
import {
  extractSystemMessage,
  filterSystemMessages,
  extractAndFilterSystemMessages,
  isEmptyMessages,
  getLastMessage,
  getLastUserMessage,
  getLastAssistantMessage,
  countMessagesByRole
} from '../message-helper';

describe('message-helper', () => {
  const mockMessages: LLMMessage[] = [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I am doing well, thank you!' }
  ];

  const mockMessagesWithTool: LLMMessage[] = [
    { role: 'system', content: 'System message' },
    { role: 'user', content: 'User message' },
    { 
      role: 'assistant', 
      content: '',
      toolCalls: [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'search',
            arguments: '{"query": "test"}'
          }
        }
      ]
    },
    { 
      role: 'tool', 
      content: 'Search result',
      toolCallId: 'call_123'
    }
  ];

  describe('extractSystemMessage', () => {
    it('应该提取第一条系统消息', () => {
      const result = extractSystemMessage(mockMessages);
      expect(result).toEqual({ role: 'system', content: 'You are a helpful assistant' });
    });

    it('应该返回null当没有系统消息时', () => {
      const messages = mockMessages.filter(msg => msg.role !== 'system');
      const result = extractSystemMessage(messages);
      expect(result).toBeNull();
    });

    it('应该返回null当消息数组为空时', () => {
      const result = extractSystemMessage([]);
      expect(result).toBeNull();
    });

    it('应该返回null当消息数组为null或undefined时', () => {
      expect(extractSystemMessage(null as any)).toBeNull();
      expect(extractSystemMessage(undefined as any)).toBeNull();
    });

    it('应该提取多个系统消息中的第一条', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'First system' },
        { role: 'user', content: 'User message' },
        { role: 'system', content: 'Second system' }
      ];
      const result = extractSystemMessage(messages);
      expect(result).toEqual({ role: 'system', content: 'First system' });
    });
  });

  describe('filterSystemMessages', () => {
    it('应该过滤掉所有系统消息', () => {
      const result = filterSystemMessages(mockMessages);
      expect(result).toHaveLength(4);
      expect(result.every(msg => msg.role !== 'system')).toBe(true);
    });

    it('应该返回空数组当没有系统消息时', () => {
      const messages = mockMessages.filter(msg => msg.role !== 'system');
      const result = filterSystemMessages(messages);
      expect(result).toHaveLength(4);
      expect(result.every(msg => msg.role !== 'system')).toBe(true);
    });

    it('应该返回空数组当消息数组为空时', () => {
      const result = filterSystemMessages([]);
      expect(result).toEqual([]);
    });

    it('应该返回空数组当消息数组为null或undefined时', () => {
      expect(filterSystemMessages(null as any)).toEqual([]);
      expect(filterSystemMessages(undefined as any)).toEqual([]);
    });

    it('应该保留所有非系统消息', () => {
      const result = filterSystemMessages(mockMessages);
      const expected = mockMessages.filter(msg => msg.role !== 'system');
      expect(result).toEqual(expected);
    });
  });

  describe('extractAndFilterSystemMessages', () => {
    it('应该提取系统消息并过滤剩余消息', () => {
      const result = extractAndFilterSystemMessages(mockMessages);
      expect(result.systemMessage).toEqual({ role: 'system', content: 'You are a helpful assistant' });
      expect(result.filteredMessages).toHaveLength(4);
      expect(result.filteredMessages.every(msg => msg.role !== 'system')).toBe(true);
    });

    it('应该处理没有系统消息的情况', () => {
      const messages = mockMessages.filter(msg => msg.role !== 'system');
      const result = extractAndFilterSystemMessages(messages);
      expect(result.systemMessage).toBeNull();
      expect(result.filteredMessages).toHaveLength(4);
    });

    it('应该处理空消息数组', () => {
      const result = extractAndFilterSystemMessages([]);
      expect(result.systemMessage).toBeNull();
      expect(result.filteredMessages).toEqual([]);
    });
  });

  describe('isEmptyMessages', () => {
    it('应该返回true当消息数组为空时', () => {
      expect(isEmptyMessages([])).toBe(true);
    });

    it('应该返回true当消息数组为null或undefined时', () => {
      expect(isEmptyMessages(null as any)).toBe(true);
      expect(isEmptyMessages(undefined as any)).toBe(true);
    });

    it('应该返回false当消息数组不为空时', () => {
      expect(isEmptyMessages(mockMessages)).toBe(false);
    });

    it('应该返回false当有单个消息时', () => {
      expect(isEmptyMessages([{ role: 'user', content: 'test' }])).toBe(false);
    });
  });

  describe('getLastMessage', () => {
    it('应该返回最后一条消息', () => {
      const result = getLastMessage(mockMessages);
      expect(result).toEqual({ role: 'assistant', content: 'I am doing well, thank you!' });
    });

    it('应该返回null当消息数组为空时', () => {
      expect(getLastMessage([])).toBeNull();
    });

    it('应该返回null当消息数组为null或undefined时', () => {
      expect(getLastMessage(null as any)).toBeNull();
      expect(getLastMessage(undefined as any)).toBeNull();
    });

    it('应该正确处理单条消息', () => {
      const messages: LLMMessage[] = [{ role: 'user', content: 'single message' }];
      const result = getLastMessage(messages);
      expect(result).toEqual(messages[0]);
    });
  });

  describe('getLastUserMessage', () => {
    it('应该返回最后一条用户消息', () => {
      const result = getLastUserMessage(mockMessages);
      expect(result).toEqual({ role: 'user', content: 'How are you?' });
    });

    it('应该返回null当没有用户消息时', () => {
      const messages = mockMessages.filter(msg => msg.role !== 'user');
      const result = getLastUserMessage(messages);
      expect(result).toBeNull();
    });

    it('应该返回null当消息数组为空时', () => {
      expect(getLastUserMessage([])).toBeNull();
    });

    it('应该正确处理只有用户消息的情况', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'first' },
        { role: 'user', content: 'last' }
      ];
      const result = getLastUserMessage(messages);
      expect(result).toEqual({ role: 'user', content: 'last' });
    });
  });

  describe('getLastAssistantMessage', () => {
    it('应该返回最后一条助手消息', () => {
      const result = getLastAssistantMessage(mockMessages);
      expect(result).toEqual({ role: 'assistant', content: 'I am doing well, thank you!' });
    });

    it('应该返回null当没有助手消息时', () => {
      const messages = mockMessages.filter(msg => msg.role !== 'assistant');
      const result = getLastAssistantMessage(messages);
      expect(result).toBeNull();
    });

    it('应该返回null当消息数组为空时', () => {
      expect(getLastAssistantMessage([])).toBeNull();
    });

    it('应该正确处理只有助手消息的情况', () => {
      const messages: LLMMessage[] = [
        { role: 'assistant', content: 'first' },
        { role: 'assistant', content: 'last' }
      ];
      const result = getLastAssistantMessage(messages);
      expect(result).toEqual({ role: 'assistant', content: 'last' });
    });
  });

  describe('countMessagesByRole', () => {
    it('应该正确统计各角色消息数量', () => {
      const result = countMessagesByRole(mockMessages);
      expect(result).toEqual({
        system: 1,
        user: 2,
        assistant: 2,
        tool: 0
      });
    });

    it('应该处理包含工具消息的情况', () => {
      const result = countMessagesByRole(mockMessagesWithTool);
      expect(result).toEqual({
        system: 1,
        user: 1,
        assistant: 1,
        tool: 1
      });
    });

    it('应该返回零计数当消息数组为空时', () => {
      const result = countMessagesByRole([]);
      expect(result).toEqual({
        system: 0,
        user: 0,
        assistant: 0,
        tool: 0
      });
    });

    it('应该返回零计数当消息数组为null或undefined时', () => {
      expect(countMessagesByRole(null as any)).toEqual({
        system: 0,
        user: 0,
        assistant: 0,
        tool: 0
      });
      expect(countMessagesByRole(undefined as any)).toEqual({
        system: 0,
        user: 0,
        assistant: 0,
        tool: 0
      });
    });

    it('应该忽略未知角色的消息', () => {
      const messages = [
        ...mockMessages,
        { role: 'unknown' as any, content: 'unknown message' }
      ];
      const result = countMessagesByRole(messages);
      expect(result).toEqual({
        system: 1,
        user: 2,
        assistant: 2,
        tool: 0
      });
    });
  });
});