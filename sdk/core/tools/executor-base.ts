/**
 * 工具执行器基类
 * 定义执行器的通用接口和实现
 */

import type { Tool } from '../../types/tool';
import { ToolError, TimeoutError, ValidationError } from '../../types/errors';

/**
 * 工具执行选项
 */
export interface ToolExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用指数退避 */
  exponentialBackoff?: boolean;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 工具执行器基类
 */
export abstract class BaseToolExecutor {
  /**
   * 执行工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const {
      timeout = 30000,
      retries = 0,
      retryDelay = 1000,
      exponentialBackoff = true
    } = options;

    // 验证参数
    this.validateParameters(tool, parameters);

    // 执行工具（带重试）
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let i = 0; i <= retries; i++) {
      try {
        // 执行工具（带超时）
        const result = await this.executeWithTimeout(
          () => this.doExecute(tool, parameters),
          timeout
        );

        const executionTime = Date.now() - startTime;

        return {
          success: true,
          result,
          executionTime,
          retryCount
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = i;

        // 检查是否应该重试
        if (i < retries && this.shouldRetry(lastError, i)) {
          // 计算重试延迟
          const delay = exponentialBackoff
            ? this.getRetryDelay(i, retryDelay)
            : retryDelay;

          // 等待重试延迟
          await this.sleep(delay);
          continue;
        }

        // 不重试或重试次数用尽，抛出错误
        break;
      }
    }

    // 执行失败
    const executionTime = Date.now() - startTime;
    const errorMessage = lastError?.message || 'Unknown error';

    return {
      success: false,
      error: errorMessage,
      executionTime,
      retryCount
    };
  }

  /**
   * 执行工具的具体实现（由子类实现）
   * @param tool 工具定义
   * @param parameters 工具参数
   * @returns 执行结果
   */
  protected abstract doExecute(
    tool: Tool,
    parameters: Record<string, any>
  ): Promise<any>;

  /**
   * 验证工具参数
   * @param tool 工具定义
   * @param parameters 工具参数
   * @throws ValidationError 如果参数验证失败
   */
  protected validateParameters(
    tool: Tool,
    parameters: Record<string, any>
  ): void {
    // 验证必需参数
    for (const requiredParam of tool.parameters.required) {
      if (!(requiredParam in parameters) || parameters[requiredParam] === undefined) {
        throw new ValidationError(
          `Required parameter '${requiredParam}' is missing`,
          requiredParam,
          parameters
        );
      }
    }

    // 验证参数类型
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const paramSchema = tool.parameters.properties[paramName];
      if (!paramSchema) {
        continue; // 忽略未定义的参数
      }

      // 验证类型
      if (!this.validateType(paramValue, paramSchema.type)) {
        throw new ValidationError(
          `Parameter '${paramName}' must be of type '${paramSchema.type}'`,
          paramName,
          paramValue
        );
      }

      // 验证枚举值
      if (paramSchema.enum && !paramSchema.enum.includes(paramValue)) {
        throw new ValidationError(
          `Parameter '${paramName}' must be one of: ${paramSchema.enum.join(', ')}`,
          paramName,
          paramValue
        );
      }

      // 验证格式
      if (paramSchema.format && typeof paramValue === 'string') {
        if (!this.validateFormat(paramValue, paramSchema.format)) {
          throw new ValidationError(
            `Parameter '${paramName}' must match format '${paramSchema.format}'`,
            paramName,
            paramValue
          );
        }
      }
    }
  }

  /**
   * 判断是否应该重试
   * @param error 错误对象
   * @param retries 当前重试次数
   * @returns 是否应该重试
   */
  protected shouldRetry(error: Error, retries: number): boolean {
    // 超时错误可以重试
    if (error instanceof TimeoutError) {
      return true;
    }

    // 网络错误可以重试
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('EAI_AGAIN')) {
      return true;
    }

    // HTTP 5xx错误可以重试
    if (error.message.includes('5')) {
      return true;
    }

    // 速率限制错误（429）可以重试
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return true;
    }

    return false;
  }

  /**
   * 获取重试延迟时间
   * @param retries 当前重试次数
   * @param baseDelay 基础延迟时间
   * @returns 延迟时间（毫秒）
   */
  protected getRetryDelay(retries: number, baseDelay: number): number {
    // 指数退避：baseDelay * 2^retries
    return baseDelay * Math.pow(2, retries);
  }

  /**
   * 带超时的执行
   * @param fn 要执行的函数
   * @param timeout 超时时间（毫秒）
   * @returns 执行结果
   * @throws TimeoutError 如果超时
   */
  protected async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new TimeoutError(
          `Tool execution timeout after ${timeout}ms`,
          timeout
        ));
      }, timeout);
    });

    try {
      return await Promise.race([fn(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * 睡眠指定时间
   * @param ms 睡眠时间（毫秒）
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证参数类型
   * @param value 参数值
   * @param type 期望的类型
   * @returns 是否匹配
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 验证参数格式
   * @param value 参数值
   * @param format 格式类型
   * @returns 是否匹配
   */
  private validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'uri':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
      case 'date-time':
        return !isNaN(Date.parse(value));
      default:
        return true;
    }
  }
}