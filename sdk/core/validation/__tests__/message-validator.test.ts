/**
 * 消息验证器单元测试
 */

import { MessageValidator } from '../message-validator';
import type { LLMMessage, LLMMessageRole } from '../../../types/llm';

describe('MessageValidator', () => {
  let validator: MessageValidator;

  beforeEach(() => {
    validator = new MessageValidator();
  });

  describe('validateMessage', () => {
    it('should validate a valid system message', () => {
      const message: LLMMessage = {
        role: 'system',
        content: 'You are a helpful assistant'
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid user message with string content', () => {
      const message: LLMMessage = {
        role: 'user',
        content: 'Hello, how are you?'
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid user message with array content', () => {
      const message: LLMMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'image_url', image_url: { url: 'https://example.com/image.png' } }
        ]
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid assistant message', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'I am doing well, thank you!'
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid assistant message with tool calls', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'I will call a tool',
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"location": "Beijing"}'
            }
          }
        ]
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid tool message', () => {
      const message: LLMMessage = {
        role: 'tool',
        content: 'Tool execution result',
        toolCallId: 'call_123'
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for message with missing role', () => {
      const message = {
        content: 'Hello'
      } as LLMMessage;
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for message with invalid role', () => {
      const message = {
        role: 'invalid' as any,
        content: 'Hello'
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for message with missing content', () => {
      const message = {
        role: 'user'
      } as LLMMessage;
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for message with empty string content', () => {
      const message: LLMMessage = {
        role: 'user',
        content: '   '
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for message with invalid content type', () => {
       const message: LLMMessage = {
         role: 'user',
         content: 123 as any
       };
       const result = validator.validateMessage(message);
       expect(result.valid).toBe(false);
       expect(result.errors.length).toBeGreaterThan(0);
     });

    it('should return errors for assistant message with invalid tool calls', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'Hello',
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: 'invalid json'
            }
          }
        ]
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for tool message with missing toolCallId', () => {
      const message: LLMMessage = {
        role: 'tool',
        content: 'Result'
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for tool message with non-string content', () => {
      const message: LLMMessage = {
        role: 'tool',
        content: ['not', 'string'] as any,
        toolCallId: 'call_123'
      };
      const result = validator.validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateRole', () => {
    it('should validate valid roles', () => {
      const validRoles: LLMMessage['role'][] = ['system', 'user', 'assistant', 'tool'];
      validRoles.forEach(role => {
        const result = validator.validateRole(role);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should return error for missing role', () => {
      const result = validator.validateRole(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('required');
    });

    it('should return error for invalid role', () => {
      const result = validator.validateRole('invalid' as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('Invalid message role');
    });
  });

  describe('validateContent', () => {
    it('should validate valid string content', () => {
      const result = validator.validateContent('Hello world', 'user');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid array content', () => {
      const content = [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'https://example.com/image.png' } }
      ];
      const result = validator.validateContent(content, 'user');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for null content', () => {
      const result = validator.validateContent(null as any, 'user');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for undefined content', () => {
      const result = validator.validateContent(undefined as any, 'user');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for empty string content', () => {
      const result = validator.validateContent('   ', 'user');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for invalid content type', () => {
      const result = validator.validateContent(123 as any, 'user');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for empty array content', () => {
      const result = validator.validateContent([], 'user');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for tool role with non-string content', () => {
      const result = validator.validateContent(['not', 'string'], 'tool');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate text content item', () => {
      const content = [{ type: 'text', text: 'Hello' }];
      const result = validator.validateContent(content, 'user');
      expect(result.valid).toBe(true);
    });

    it('should return error for text content item without text property', () => {
      const content = [{ type: 'text' }];
      const result = validator.validateContent(content, 'user');
      expect(result.valid).toBe(false);
    });

    it('should validate image_url content item', () => {
      const content = [{ type: 'image_url', image_url: { url: 'https://example.com/image.png' } }];
      const result = validator.validateContent(content, 'user');
      expect(result.valid).toBe(true);
    });

    it('should return error for image_url content item without url', () => {
      const content = [{ type: 'image_url', image_url: {} }];
      const result = validator.validateContent(content, 'user');
      expect(result.valid).toBe(false);
    });

    it('should validate tool_use content item', () => {
      const content = [{ type: 'tool_use', id: 'call_123', name: 'get_weather', input: { location: 'Beijing' } }];
      const result = validator.validateContent(content, 'assistant');
      expect(result.valid).toBe(true);
    });

    it('should return error for tool_use content item without id', () => {
      const content = [{ type: 'tool_use', name: 'get_weather', input: {} }];
      const result = validator.validateContent(content, 'assistant');
      expect(result.valid).toBe(false);
    });

    it('should validate tool_result content item', () => {
      const content = [{ type: 'tool_result', tool_use_id: 'call_123', content: 'Result' }];
      const result = validator.validateContent(content, 'tool');
      expect(result.valid).toBe(true);
    });

    it('should return error for tool_result content item without tool_use_id', () => {
      const content = [{ type: 'tool_result', content: 'Result' }];
      const result = validator.validateContent(content, 'tool');
      expect(result.valid).toBe(false);
    });

    it('should return error for content item that is not an object', () => {
      const content = ['not an object'];
      const result = validator.validateContent(content, 'user');
      expect(result.valid).toBe(false);
    });

    it('should return error for content item without type', () => {
      const content = [{ text: 'Hello' }];
      const result = validator.validateContent(content, 'user');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateToolCalls', () => {
    it('should validate when toolCalls is undefined', () => {
      const result = validator.validateToolCalls(undefined);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate when toolCalls is null', () => {
       const result = validator.validateToolCalls(null as any);
       expect(result.valid).toBe(true);
       expect(result.errors).toHaveLength(0);
     });

    it('should validate valid tool calls', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: '{"location": "Beijing"}'
          }
        }
      ];
      const result = validator.validateToolCalls(toolCalls);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when toolCalls is not an array', () => {
      const result = validator.validateToolCalls('not an array' as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for tool call without id', () => {
      const toolCalls = [
        {
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: '{}'
          }
        } as any
      ];
      const result = validator.validateToolCalls(toolCalls);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for tool call with invalid type', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'invalid' as any,
          function: {
            name: 'get_weather',
            arguments: '{}'
          }
        }
      ];
      const result = validator.validateToolCalls(toolCalls);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for tool call without function', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const
        } as any
      ];
      const result = validator.validateToolCalls(toolCalls);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for tool call without function.name', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            arguments: '{}'
          }
        } as any
      ];
      const result = validator.validateToolCalls(toolCalls);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for tool call without function.arguments', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'get_weather'
          }
        } as any
      ];
      const result = validator.validateToolCalls(toolCalls);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for tool call with invalid JSON in arguments', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: 'invalid json'
          }
        }
      ];
      const result = validator.validateToolCalls(toolCalls);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateToolCallId', () => {
    it('should validate valid tool call id', () => {
      const result = validator.validateToolCallId('call_123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for undefined tool call id', () => {
      const result = validator.validateToolCallId(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for null tool call id', () => {
      const result = validator.validateToolCallId(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for non-string tool call id', () => {
      const result = validator.validateToolCallId(123 as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for empty tool call id', () => {
      const result = validator.validateToolCallId('   ');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateMessages', () => {
    it('should validate valid messages array', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];
      const result = validator.validateMessages(messages);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when messages is not an array', () => {
      const result = validator.validateMessages('not an array' as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for invalid message in array', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'invalid' as any, content: 'Test' }
      ];
      const result = validator.validateMessages(messages);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include path prefix for errors in array', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'invalid' as any, content: 'Test' }
      ];
      const result = validator.validateMessages(messages);
      expect(result.errors.some(e => e.field?.includes('messages[1]'))).toBe(true);
    });

    it('should validate empty messages array', () => {
      const result = validator.validateMessages([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});