/**
 * 消息验证器
 * 负责消息格式、内容类型、工具调用的验证
 */

import type { LLMMessage, LLMMessageRole, LLMToolCall } from '../../types/llm';
import { ValidationError, type ValidationResult } from '../../types/errors';

/**
 * 消息验证器
 */
export class MessageValidator {
  /**
   * 有效的消息角色
   */
  private static readonly VALID_ROLES: LLMMessageRole[] = ['system', 'user', 'assistant', 'tool'];

  /**
   * 验证消息对象
   * @param message 消息对象
   * @returns 验证结果
   */
  validateMessage(message: LLMMessage): ValidationResult {
    const errors: ValidationError[] = [];

    // 验证消息角色
    const roleResult = this.validateRole(message.role);
    errors.push(...roleResult.errors);

    // 验证消息内容
    const contentResult = this.validateContent(message.content, message.role);
    errors.push(...contentResult.errors);

    // 验证工具调用（仅 assistant 角色）
    if (message.role === 'assistant') {
      const toolCallsResult = this.validateToolCalls(message.toolCalls);
      errors.push(...toolCallsResult.errors);
    }

    // 验证工具调用 ID（仅 tool 角色）
    if (message.role === 'tool') {
      const toolCallIdResult = this.validateToolCallId(message.toolCallId);
      errors.push(...toolCallIdResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证消息角色
   * @param role 消息角色
   * @returns 验证结果
   */
  validateRole(role: LLMMessageRole): ValidationResult {
    const errors: ValidationError[] = [];

    if (!role) {
      errors.push(new ValidationError(
        'Message role is required',
        'message.role'
      ));
      return { valid: false, errors, warnings: [] };
    }

    if (!MessageValidator.VALID_ROLES.includes(role)) {
      errors.push(new ValidationError(
        `Invalid message role: ${role}. Must be one of: ${MessageValidator.VALID_ROLES.join(', ')}`,
        'message.role'
      ));
    }

    return {
      valid: errors.length === 0,
      errors,
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
    const errors: ValidationError[] = [];

    // 检查内容是否存在
    if (content === undefined || content === null) {
      errors.push(new ValidationError(
        'Message content is required',
        'message.content'
      ));
      return { valid: false, errors, warnings: [] };
    }

    // 检查内容类型
    if (typeof content !== 'string' && !Array.isArray(content)) {
      errors.push(new ValidationError(
        `Invalid content type: ${typeof content}. Must be string or array`,
        'message.content'
      ));
      return { valid: false, errors, warnings: [] };
    }

    // 如果是字符串，检查是否为空
    if (typeof content === 'string' && content.trim() === '') {
      errors.push(new ValidationError(
        'Message content cannot be empty',
        'message.content'
      ));
    }

    // 如果是数组，验证数组元素
    if (Array.isArray(content)) {
      if (content.length === 0) {
        errors.push(new ValidationError(
          'Message content array cannot be empty',
          'message.content'
        ));
      } else {
        content.forEach((item, index) => {
          const itemResult = this.validateContentItem(item, index);
          errors.push(...itemResult.errors);
        });
      }
    }

    // tool 角色的内容可以是字符串或数组（包含 tool_result）
    if (role === 'tool' && typeof content !== 'string' && !Array.isArray(content)) {
      errors.push(new ValidationError(
        'Tool message content must be a string or array',
        'message.content'
      ));
    }
    
    // 如果 tool 角色使用数组内容，验证所有内容项都是 tool_result 类型
    if (role === 'tool' && Array.isArray(content)) {
      content.forEach((item, index) => {
        if (item.type !== 'tool_result') {
          errors.push(new ValidationError(
            `Tool message content item at index ${index} must have type 'tool_result'`,
            `message.content[${index}].type`
          ));
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证内容数组中的元素
   * @param item 内容元素
   * @param index 元素索引
   * @returns 验证结果
   */
  private validateContentItem(item: any, index: number): ValidationResult {
    const errors: ValidationError[] = [];
    const path = `message.content[${index}]`;

    // 检查元素是否为对象
    if (typeof item !== 'object' || item === null) {
      errors.push(new ValidationError(
        `Content item at index ${index} must be an object`,
        path
      ));
      return { valid: false, errors, warnings: [] };
    }

    // 检查是否有 type 属性
    if (!item.type) {
      errors.push(new ValidationError(
        `Content item at index ${index} must have a type property`,
        `${path}.type`
      ));
    }

    // 根据 type 验证内容
    if (item.type === 'text') {
      if (!item.text || typeof item.text !== 'string') {
        errors.push(new ValidationError(
          `Text content item at index ${index} must have a text property of type string`,
          `${path}.text`
        ));
      }
    } else if (item.type === 'image_url') {
      if (!item.image_url || typeof item.image_url !== 'object') {
        errors.push(new ValidationError(
          `Image content item at index ${index} must have an image_url property`,
          `${path}.image_url`
        ));
      } else if (!item.image_url.url || typeof item.image_url.url !== 'string') {
        errors.push(new ValidationError(
          `Image content item at index ${index} must have image_url.url property of type string`,
          `${path}.image_url.url`
        ));
      }
    } else if (item.type === 'tool_use') {
      if (!item.id || typeof item.id !== 'string') {
        errors.push(new ValidationError(
          `Tool use content item at index ${index} must have an id property of type string`,
          `${path}.id`
        ));
      }
      if (!item.name || typeof item.name !== 'string') {
        errors.push(new ValidationError(
          `Tool use content item at index ${index} must have a name property of type string`,
          `${path}.name`
        ));
      }
      if (!item.input || typeof item.input !== 'object') {
        errors.push(new ValidationError(
          `Tool use content item at index ${index} must have an input property of type object`,
          `${path}.input`
        ));
      }
    } else if (item.type === 'tool_result') {
      if (!item.tool_use_id || typeof item.tool_use_id !== 'string') {
        errors.push(new ValidationError(
          `Tool result content item at index ${index} must have a tool_use_id property of type string`,
          `${path}.tool_use_id`
        ));
      }
      if (item.content === undefined || item.content === null) {
        errors.push(new ValidationError(
          `Tool result content item at index ${index} must have a content property`,
          `${path}.content`
        ));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证工具调用
   * @param toolCalls 工具调用数组
   * @returns 验证结果
   */
  validateToolCalls(toolCalls?: LLMToolCall[]): ValidationResult {
    const errors: ValidationError[] = [];

    // toolCalls 是可选的，如果不存在则跳过验证
    if (toolCalls === undefined || toolCalls === null) {
      return { valid: true, errors: [], warnings: [] };
    }

    // 检查是否为数组
    if (!Array.isArray(toolCalls)) {
      errors.push(new ValidationError(
        'toolCalls must be an array',
        'message.toolCalls'
      ));
      return { valid: false, errors, warnings: [] };
    }

    // 验证每个工具调用
    toolCalls.forEach((toolCall, index) => {
      const toolCallResult = this.validateToolCall(toolCall, index);
      errors.push(...toolCallResult.errors);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证单个工具调用
   * @param toolCall 工具调用对象
   * @param index 工具调用索引
   * @returns 验证结果
   */
  private validateToolCall(toolCall: LLMToolCall, index: number): ValidationResult {
    const errors: ValidationError[] = [];
    const path = `message.toolCalls[${index}]`;

    // 检查 id
    if (!toolCall.id || typeof toolCall.id !== 'string') {
      errors.push(new ValidationError(
        `Tool call at index ${index} must have an id property of type string`,
        `${path}.id`
      ));
    }

    // 检查 type
    if (!toolCall.type || toolCall.type !== 'function') {
      errors.push(new ValidationError(
        `Tool call at index ${index} must have type property set to 'function'`,
        `${path}.type`
      ));
    }

    // 检查 function
    if (!toolCall.function || typeof toolCall.function !== 'object') {
      errors.push(new ValidationError(
        `Tool call at index ${index} must have a function property`,
        `${path}.function`
      ));
    } else {
      // 检查 function.name
      if (!toolCall.function.name || typeof toolCall.function.name !== 'string') {
        errors.push(new ValidationError(
          `Tool call at index ${index} must have function.name property of type string`,
          `${path}.function.name`
        ));
      }

      // 检查 function.arguments
      if (toolCall.function.arguments === undefined || toolCall.function.arguments === null) {
        errors.push(new ValidationError(
          `Tool call at index ${index} must have function.arguments property`,
          `${path}.function.arguments`
        ));
      } else if (typeof toolCall.function.arguments !== 'string') {
        errors.push(new ValidationError(
          `Tool call at index ${index} must have function.arguments property of type string`,
          `${path}.function.arguments`
        ));
      } else {
        // 尝试解析 JSON
        try {
          JSON.parse(toolCall.function.arguments);
        } catch (e) {
          errors.push(new ValidationError(
            `Tool call at index ${index} has invalid JSON in function.arguments: ${(e as Error).message}`,
            `${path}.function.arguments`
          ));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证工具调用 ID
   * @param toolCallId 工具调用 ID
   * @returns 验证结果
   */
  validateToolCallId(toolCallId?: string): ValidationResult {
    const errors: ValidationError[] = [];

    // toolCallId 是可选的，但 tool 角色通常需要
    if (toolCallId === undefined || toolCallId === null) {
      errors.push(new ValidationError(
        'Tool message must have a toolCallId',
        'message.toolCallId'
      ));
      return { valid: false, errors, warnings: [] };
    }

    // 检查类型
    if (typeof toolCallId !== 'string') {
      errors.push(new ValidationError(
        'toolCallId must be a string',
        'message.toolCallId'
      ));
      return { valid: false, errors, warnings: [] };
    }

    // 检查是否为空
    if (toolCallId.trim() === '') {
      errors.push(new ValidationError(
        'toolCallId cannot be empty',
        'message.toolCallId'
      ));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 批量验证消息
   * @param messages 消息数组
   * @returns 验证结果
   */
  validateMessages(messages: LLMMessage[]): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Array.isArray(messages)) {
      errors.push(new ValidationError(
        'Messages must be an array',
        'messages'
      ));
      return { valid: false, errors, warnings: [] };
    }

    messages.forEach((message, index) => {
      const result = this.validateMessage(message);
      // 为每个错误添加路径前缀
      result.errors.forEach(error => {
        errors.push(new ValidationError(
          error.message,
          `messages[${index}].${error.field}`
        ));
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}