/**
 * 消息验证器
 * 负责消息格式、内容类型、工具调用的验证
 * 使用zod进行声明式验证
 */

import { z } from 'zod';
import type { LLMMessage, LLMMessageRole, LLMToolCall } from '@modular-agent/types/llm';
import { SchemaValidationError } from '@modular-agent/types/errors';
import { ok, err } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types/result';

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
  validateMessage(message: LLMMessage): Result<LLMMessage, SchemaValidationError[]> {
    const result = messageSchema.safeParse(message);
    if (result.success) {
      return ok(message);
    }
    return err(this.convertZodErrorToErrors(result.error));
  }

  /**
   * 验证消息角色
   * @param role 消息角色
   * @returns 验证结果
   */
  validateRole(role: LLMMessageRole): Result<LLMMessageRole, SchemaValidationError[]> {
    if (!role) {
      return err([new SchemaValidationError('Message role is required', { field: 'role' })]);
    }
    const roleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
    const result = roleSchema.safeParse(role);
    if (result.success) {
      return ok(role);
    }
    return err([new SchemaValidationError('Invalid message role', { field: 'role' })]);
  }

  /**
   * 验证消息内容
   * @param content 消息内容
   * @param role 消息角色
   * @returns 验证结果
   */
  validateContent(content: string | any[], role: LLMMessageRole): Result<string | any[], SchemaValidationError[]> {
    const result = messageContentSchema.safeParse(content);
    if (result.success) {
      // 对于tool角色，如果内容是数组，验证所有内容项都是tool_result类型
      if (role === 'tool' && Array.isArray(content)) {
        for (let i = 0; i < content.length; i++) {
          const item = content[i];
          if (item.type !== 'tool_result') {
            return err([
              new SchemaValidationError(
                `Tool message content item at index ${i} must have type 'tool_result'`,
                { field: `content[${i}].type` }
              )
            ]);
          }
        }
      }
      return ok(content);
    }
    return err(this.convertZodErrorToErrors(result.error));
  }

  /**
   * 验证工具调用
   * @param toolCalls 工具调用数组
   * @returns 验证结果
   */
  validateToolCalls(toolCalls?: LLMToolCall[]): Result<LLMToolCall[] | undefined, SchemaValidationError[]> {
    if (toolCalls === undefined || toolCalls === null) {
      return ok(undefined);
    }
    const result = z.array(toolCallSchema).safeParse(toolCalls);
    if (result.success) {
      return ok(toolCalls);
    }
    return err(this.convertZodErrorToErrors(result.error));
  }

  /**
   * 验证工具调用ID
   * @param toolCallId 工具调用ID
   * @returns 验证结果
   */
  validateToolCallId(toolCallId?: string): Result<string | undefined, SchemaValidationError[]> {
    if (toolCallId === undefined || toolCallId === null) {
      return err([new SchemaValidationError('Tool message must have a toolCallId', { field: 'toolCallId' })]);
    }
    const result = z.string().min(1, 'Tool call ID cannot be empty').transform((val) => val.trim()).refine((val) => val.length > 0, 'Tool call ID cannot be empty').safeParse(toolCallId);
    if (result.success) {
      return ok(toolCallId);
    }
    return err(this.convertZodErrorToErrors(result.error));
  }

  /**
   * 批量验证消息
   * @param messages 消息数组
   * @returns 验证结果
   */
  validateMessages(messages: LLMMessage[]): Result<LLMMessage[], SchemaValidationError[]> {
    if (!Array.isArray(messages)) {
      return err([new SchemaValidationError('Messages must be an array', { field: 'messages' })]);
    }

    const allErrors: SchemaValidationError[] = [];
    messages.forEach((message, index) => {
      const result = this.validateMessage(message);
      if (result.isErr()) {
        result.error.forEach((error) => {
          const field = error.field ? `messages[${index}].${error.field}` : `messages[${index}]`;
          allErrors.push(new SchemaValidationError(error.message, { field, value: error.value }));
        });
      }
    });
    if (allErrors.length === 0) {
      return ok(messages);
    }
    return err(allErrors);

  }

  /**
   * 将zod错误转换为ValidationResult
   * @param error zod错误
   * @returns ValidationResult
   */
  private convertZodErrorToErrors(error: z.ZodError): SchemaValidationError[] {
    return error.issues.map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : undefined;
      return new SchemaValidationError(issue.message, { field });
    });
  }
}