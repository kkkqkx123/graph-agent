/**
 * 工具执行器基类
 * 提供通用的执行逻辑：参数验证、重试机制、超时控制、标准化结果格式
 */

import { z } from 'zod';
import type { Tool, ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types/tool';
import { TimeoutError, ValidationError, NetworkError, HttpError } from '@modular-agent/types/errors';
import { RateLimitError } from '@modular-agent/common-utils/http/errors';
import { now, diffTimestamp } from '@modular-agent/common-utils';

/**
 * 工具执行器基类
 * 所有具体执行器都应该继承此类
 */
export abstract class BaseToolExecutor {
  /**
   * 执行工具（带验证、重试、超时）
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadContext 线程上下文（可选）
   * @returns 标准化的执行结果
   */
  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {},
    threadContext?: any
  ): Promise<ToolExecutionResult> {
    const startTime = now();
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
          () => this.doExecute(tool, parameters, threadContext),
          timeout
        );

        const executionTime = diffTimestamp(startTime, now());

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
    const executionTime = diffTimestamp(startTime, now());
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
   * @param threadContext 线程上下文（可选）
   * @returns 执行结果
   */
  protected abstract doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: any
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
    // 构建zod schema
    const schema = this.buildParameterSchema(tool);
    
    // 验证参数
    const result = schema.safeParse(parameters);
    if (!result.success) {
      const firstError = result.error.issues[0];
      if (!firstError) {
        throw new ValidationError('Parameter validation failed', 'parameters', parameters);
      }
      const field = firstError.path.join('.');
      throw new ValidationError(
        firstError.message,
        field,
        parameters
      );
    }
  }

  /**
   * 构建参数验证schema
   * @param tool 工具定义
   * @returns zod schema
   */
  private buildParameterSchema(tool: Tool): z.ZodType<Record<string, any>> {
    const shape: Record<string, z.ZodTypeAny> = {};

    // 为每个参数构建schema
    for (const [paramName, paramSchema] of Object.entries(tool.parameters.properties)) {
      let zodSchema = this.buildTypeSchema(paramSchema.type);

      // 添加枚举验证
      if (paramSchema.enum && paramSchema.enum.length > 0) {
        zodSchema = zodSchema.pipe(z.enum(paramSchema.enum as [string, ...string[]]));
      }

      // 添加格式验证
      if (paramSchema.format && typeof paramSchema.format === 'string') {
        zodSchema = zodSchema.pipe(this.buildFormatSchema(paramSchema.format));
      }

      // 设置是否必需
      if (tool.parameters.required.includes(paramName)) {
        shape[paramName] = zodSchema;
      } else {
        shape[paramName] = zodSchema.optional();
      }
    }

    return z.object(shape);
  }

  /**
   * 构建类型schema
   * @param type 类型字符串
   * @returns zod schema
   */
  private buildTypeSchema(type: string): z.ZodTypeAny {
    switch (type) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'array':
        return z.array(z.any());
      case 'object':
        return z.record(z.string(), z.any());
      default:
        return z.any();
    }
  }

  /**
   * 构建格式schema
   * @param format 格式字符串
   * @returns zod schema
   */
  private buildFormatSchema(format: string): z.ZodTypeAny {
    switch (format) {
      case 'uri':
        return z.string().url();
      case 'email':
        return z.string().email();
      case 'uuid':
        return z.string().uuid();
      case 'date-time':
        return z.string().datetime();
      default:
        return z.any();
    }
  }

  /**
   * 判断是否应该重试
   * @param error 错误对象
   * @param retries 当前重试次数
   * @returns 是否应该重试
   */
  protected shouldRetry(error: Error, retries: number): boolean {
    // TimeoutError - 超时重试
    if (error instanceof TimeoutError) {
      return true;
    }

    // HttpError - 精确判断状态码
    if (error instanceof HttpError) {
      return error.statusCode === 429 || (error.statusCode != null && error.statusCode >= 500 && error.statusCode < 600);
    }

    // NetworkError - 其他网络错误重试
    if (error instanceof NetworkError) {
      return true;
    }

    // RateLimitError - 限流重试
    if (error instanceof RateLimitError) {
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
}