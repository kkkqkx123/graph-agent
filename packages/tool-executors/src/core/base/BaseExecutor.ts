/**
 * 工具执行器抽象基类
 * 提供通用的执行逻辑：参数验证、重试机制、超时控制、标准化结果格式
 */

import type { Tool, ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types';
import { IToolExecutor } from '../interfaces/IToolExecutor';
import { ParameterValidator } from './ParameterValidator';
import { RetryStrategy } from './RetryStrategy';
import { TimeoutController } from './TimeoutController';
import { now, diffTimestamp } from '@modular-agent/common-utils';

/**
 * 工具执行器抽象基类
 * 所有具体执行器都应该继承此类
 */
export abstract class BaseExecutor implements IToolExecutor {
  protected validator: ParameterValidator;
  protected retryStrategy: RetryStrategy;
  protected timeoutController: TimeoutController;

  constructor(
    validator?: ParameterValidator,
    retryStrategy?: RetryStrategy,
    timeoutController?: TimeoutController
  ) {
    this.validator = validator ?? new ParameterValidator();
    this.retryStrategy = retryStrategy ?? RetryStrategy.createDefault();
    this.timeoutController = timeoutController ?? TimeoutController.createDefault();
  }

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
      retries = 3,
      retryDelay = 1000,
      exponentialBackoff = true
    } = options;

    // 验证参数
    this.validateParameters(tool, parameters);

    // 创建临时重试策略（使用选项中的配置）
    const tempRetryStrategy = new RetryStrategy({
      maxRetries: retries,
      baseDelay: retryDelay,
      exponentialBackoff
    });

    // 执行工具（带重试）
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let i = 0; i <= retries; i++) {
      try {
        // 执行工具（带超时）
        const result = await this.timeoutController.executeWithTimeout(
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
        if (i < retries && tempRetryStrategy.shouldRetry(lastError, i)) {
          // 计算重试延迟
          const delay = tempRetryStrategy.getRetryDelay(i);

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
   * 验证工具参数
   * @param tool 工具定义
   * @param parameters 工具参数
   * @throws ValidationError 如果参数验证失败
   */
  validateParameters(tool: Tool, parameters: Record<string, any>): void {
    this.validator.validate(tool, parameters);
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
   * 睡眠指定时间
   * @param ms 睡眠时间（毫秒）
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取执行器类型（由子类实现）
   */
  abstract getExecutorType(): string;
}