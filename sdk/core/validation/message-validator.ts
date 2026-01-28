/**
 * 消息验证器
 * 负责消息格式、内容类型、工具调用的验证
 * 使用zod进行声明式验证
 */

import { z } from 'zod';
import type { LLMMessage, LLMMessageRole, LLMToolCall } from '../../types/llm';
import { ValidationError, type ValidationResult } from '../../types/errors';

/**
 * 文本内容项schema
 */
const textContentSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1, 'Text content cannot be empty')
});

/**
 * 图片URL内容项schema
 */
const imageUrlContentSchema = z.object({
  type: z.literal('image_url'),
  image_url: z.object({
    url: z.string().url('Image URL must be a valid URL')
  })
});

/**
 * 工具使用内容项schema
 */
const toolUseContentSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string().min(1, 'Tool use ID cannot be empty'),
  name: z.string().min(1, 'Tool use name cannot be empty'),
  input: z.record(z.string(), z.any())
});

/**
 * 工具结果内容项schema
 */
const toolResultContentSchema = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string().min(1, 'Tool result tool_use_id cannot be empty'),
  content: z.any()
});

/**
 * 内容项schema（联合类型）
 */
const contentItemSchema = z.union([
  textContentSchema,
  imageUrlContentSchema,
  toolUseContentSchema,
  toolResultContentSchema
]);

/**
 * 消息内容schema
 */
const messageContentSchema = z.union([
  z.string().min(1, 'Message content cannot be empty').transform((val) => val.trim()).refine((val) => val.length > 0, 'Message content cannot be empty'),
  z.array(contentItemSchema).min(1, 'Message content array cannot be empty')
]);

/**
 * 工具调用函数schema
 */
const toolCallFunctionSchema = z.object({
  name: z.string().min(1, 'Tool call function name cannot be empty'),
  arguments: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Tool call function arguments must be valid JSON' }
  )
});

/**
 * 工具调用schema
 */
const toolCallSchema: z.ZodType<LLMToolCall> = z.object({
  id: z.string().min(1, 'Tool call ID cannot be empty'),
  type: z.literal('function'),
  function: toolCallFunctionSchema
});

/**
 * 消息schema
 */
const messageSchema: z.ZodType<LLMMessage> = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: messageContentSchema,
  toolCalls: z.array(toolCallSchema).optional(),
  toolCallId: z.string().min(1, 'Tool call ID cannot be empty').optional().refine((val) => val === undefined || val.trim().length > 0, 'Tool call ID cannot be empty')
}).refine(
  (data) => {
    // tool角色必须有toolCallId
    if (data.role === 'tool' && !data.toolCallId) {
      return false;
    }
    return true;
  },
  { message: 'Tool message must have a toolCallId', path: ['toolCallId'] }
);

/**
 * 消息验证器类
 */
export class MessageValidator {
  /**
   * 验证消息对象
   * @param message 消息对象
   * @returns 验证结果
   */
  validateMessage(message: LLMMessage): ValidationResult {
    const result = messageSchema.safeParse(message);
    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }
    return this.convertZodError(result.error);
  }

  /**
   * 验证消息角色
   * @param role 消息角色
   * @returns 验证结果
   */
  validateRole(role: LLMMessageRole): ValidationResult {
    if (!role) {
      return {
        valid: false,
        errors: [new ValidationError('Message role is required', 'role')],
        warnings: []
      };
    }
    const roleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
    const result = roleSchema.safeParse(role);
    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }
    return {
      valid: false,
      errors: [new ValidationError('Invalid message role', 'role')],
      warnings: []
    };
  }

  /**
   * 验证消息内容
   * @param content 消息内容
   * @param role 消息角色
   * @returns 验证结果
   */
  validateContent(content: string | any[], role: LLMMessageRole): ValidationResult {
    const result = messageContentSchema.safeParse(content);
    if (result.success) {
      // 对于tool角色，如果内容是数组，验证所有内容项都是tool_result类型
      if (role === 'tool' && Array.isArray(content)) {
        for (let i = 0; i < content.length; i++) {
          const item = content[i];
          if (item.type !== 'tool_result') {
            return {
              valid: false,
              errors: [
                new ValidationError(
                  `Tool message content item at index ${i} must have type 'tool_result'`,
                  `content[${i}].type`
                )
              ],
              warnings: []
            };
          }
        }
      }
      return { valid: true, errors: [], warnings: [] };
    }
    return this.convertZodError(result.error);
  }

  /**
   * 验证工具调用
   * @param toolCalls 工具调用数组
   * @returns 验证结果
   */
  validateToolCalls(toolCalls?: LLMToolCall[]): ValidationResult {
    if (toolCalls === undefined || toolCalls === null) {
      return { valid: true, errors: [], warnings: [] };
    }
    const result = z.array(toolCallSchema).safeParse(toolCalls);
    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }
    return this.convertZodError(result.error);
  }

  /**
   * 验证工具调用ID
   * @param toolCallId 工具调用ID
   * @returns 验证结果
   */
  validateToolCallId(toolCallId?: string): ValidationResult {
    if (toolCallId === undefined || toolCallId === null) {
      return {
        valid: false,
        errors: [new ValidationError('Tool message must have a toolCallId', 'toolCallId')],
        warnings: []
      };
    }
    const result = z.string().min(1, 'Tool call ID cannot be empty').transform((val) => val.trim()).refine((val) => val.length > 0, 'Tool call ID cannot be empty').safeParse(toolCallId);
    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }
    return this.convertZodError(result.error);
  }

  /**
   * 批量验证消息
   * @param messages 消息数组
   * @returns 验证结果
   */
  validateMessages(messages: LLMMessage[]): ValidationResult {
    if (!Array.isArray(messages)) {
      return {
        valid: false,
        errors: [new ValidationError('Messages must be an array', 'messages')],
        warnings: []
      };
    }

    const allErrors: ValidationError[] = [];
    messages.forEach((message, index) => {
      const result = this.validateMessage(message);
      result.errors.forEach((error) => {
        const field = error.field ? `messages[${index}].${error.field}` : `messages[${index}]`;
        allErrors.push(new ValidationError(error.message, field, error.value));
      });
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: []
    };
  }

  /**
   * 将zod错误转换为ValidationResult
   * @param error zod错误
   * @returns ValidationResult
   */
  private convertZodError(error: z.ZodError): ValidationResult {
    const errors: ValidationError[] = error.issues.map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : undefined;
      return new ValidationError(issue.message, field);
    });
    return {
      valid: false,
      errors,
      warnings: []
    };
  }
}