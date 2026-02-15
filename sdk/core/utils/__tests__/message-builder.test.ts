/**
 * MessageBuilder 测试
 */

import { MessageBuilder } from '../../messages/message-builder';
import type { LLMToolCall } from '@modular-agent/types';

describe('MessageBuilder', () => {
  describe('buildUserMessage', () => {
    it('should build user message correctly', () => {
      const content = 'Hello, world!';
      const message = MessageBuilder.buildUserMessage(content);
      
      expect(message).toEqual({
        role: 'user',
        content: 'Hello, world!'
      });
    });
  });

  describe('buildAssistantMessage', () => {
    it('should build assistant message without tool calls or thinking', () => {
      const content = 'Hello, I am an assistant!';
      const message = MessageBuilder.buildAssistantMessage(content);
      
      expect(message).toEqual({
        role: 'assistant',
        content: 'Hello, I am an assistant!'
      });
    });

    it('should build assistant message with tool calls', () => {
      const toolCalls: LLMToolCall[] = [
        {
          id: 'tool1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"expression": "2+2"}'
          }
        }
      ];
      
      const message = MessageBuilder.buildAssistantMessage('Using calculator', toolCalls);
      
      expect(message).toEqual({
        role: 'assistant',
        content: 'Using calculator',
        toolCalls: toolCalls
      });
    });

    it('should build assistant message with thinking', () => {
      const message = MessageBuilder.buildAssistantMessage(
        'Final answer',
        undefined,
        'I need to calculate this first'
      );
      
      expect(message).toEqual({
        role: 'assistant',
        content: 'Final answer',
        thinking: 'I need to calculate this first'
      });
    });

    it('should build assistant message with both tool calls and thinking', () => {
      const toolCalls: LLMToolCall[] = [
        {
          id: 'tool1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"expression": "2+2"}'
          }
        }
      ];
      
      const message = MessageBuilder.buildAssistantMessage(
        'Using calculator',
        toolCalls,
        'I need to calculate this first'
      );
      
      expect(message).toEqual({
        role: 'assistant',
        content: 'Using calculator',
        toolCalls: toolCalls,
        thinking: 'I need to calculate this first'
      });
    });
  });

  describe('buildToolMessage', () => {
    it('should build tool message for successful result', () => {
      const result = {
        success: true,
        result: '4',
        error: undefined,
        executionTime: 100,
        retryCount: 0
      };
      
      const message = MessageBuilder.buildToolMessage('tool1', result);
      
      expect(message).toEqual({
        role: 'tool',
        content: '"4"',
        toolCallId: 'tool1'
      });
    });

    it('should build tool message for error result', () => {
      const result = {
        success: false,
        result: undefined,
        error: 'Division by zero',
        executionTime: 50,
        retryCount: 1
      };
      
      const message = MessageBuilder.buildToolMessage('tool1', result);
      
      expect(message).toEqual({
        role: 'tool',
        content: '{"error":"Division by zero"}',
        toolCallId: 'tool1'
      });
    });
  });

  describe('buildSystemMessage', () => {
    it('should build system message correctly', () => {
      const content = 'You are a helpful assistant';
      const message = MessageBuilder.buildSystemMessage(content);
      
      expect(message).toEqual({
        role: 'system',
        content: 'You are a helpful assistant'
      });
    });
  });

  describe('buildToolDescriptionMessage', () => {
    it('should build tool description message correctly', () => {
      const descriptionText = '可用工具:\n- calculator: A calculator tool';
      const message = MessageBuilder.buildToolDescriptionMessage(descriptionText);
      
      expect(message).toEqual({
        role: 'system',
        content: '可用工具:\n- calculator: A calculator tool'
      });
    });

    it('should return null for empty description', () => {
      const message = MessageBuilder.buildToolDescriptionMessage('');
      expect(message).toBeNull();
    });
  });
});