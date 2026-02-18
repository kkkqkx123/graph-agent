/**
 * 脚本执行器抽象基类
 * 提供通用的执行逻辑：验证、重试、超时、沙箱、标准化结果格式
 */

import type { Script, ScriptExecutionOptions, ScriptExecutionResult } from '@modular-agent/types';
import { IScriptExecutor } from '../interfaces/IScriptExecutor.js';
import { ParameterValidator } from './ParameterValidator.js';
import { RetryStrategy } from './RetryStrategy.js';
import { TimeoutController } from './TimeoutController.js';
import { SandboxManager } from './SandboxManager.js';
import type { ExecutionContext, ExecutionOutput, ValidationResult, ExecutorConfig } from '../types.js';
import { now, diffTimestamp } from '@modular-agent/common-utils';

/**
 * 脚本执行器抽象基类
 * 所有具体执行器都应该继承此类
 */
export abstract class BaseScriptExecutor implements IScriptExecutor {
  protected validator: ParameterValidator;
  protected retryStrategy: RetryStrategy;
  protected timeoutController: TimeoutController;
  protected sandboxManager?: SandboxManager;
  protected config: ExecutorConfig;

  constructor(config?: ExecutorConfig) {
    this.config = config ?? { type: 'SHELL' };
    this.validator = new ParameterValidator();
    this.retryStrategy = new RetryStrategy({
      maxRetries: config?.maxRetries,
      baseDelay: config?.retryDelay,
      exponentialBackoff: config?.exponentialBackoff
    });
    this.timeoutController = new TimeoutController({
      defaultTimeout: config?.timeout
    });
    this.sandboxManager = config?.sandbox ? new SandboxManager(config.sandbox) : undefined;
  }

  /**
   * 执行脚本（带验证、重试、超时、沙箱）
   * @param script 脚本定义
   * @param options 执行选项
   * @param context 执行上下文
   * @returns 标准化的执行结果
   */
  async execute(
    script: Script,
    options: ScriptExecutionOptions = {},
    context?: ExecutionContext
  ): Promise<ScriptExecutionResult> {
    const startTime = now();
    const {
      timeout = this.config.timeout ?? 30000,
      retries = this.config.maxRetries ?? 3,
      retryDelay = this.config.retryDelay ?? 1000,
      exponentialBackoff = this.config.exponentialBackoff ?? true
    } = options;

    // 验证脚本
    const validationResult = this.validate(script);
    if (!validationResult.valid) {
      const executionTime = diffTimestamp(startTime, now());
      return {
        success: false,
        scriptName: script.name,
        scriptType: script.type,
        error: `Script validation failed: ${validationResult.errors.join(', ')}`,
        executionTime
      };
    }

    // 准备沙箱环境（如果启用）
    let sandboxId = 'no-sandbox';
    if (this.sandboxManager && (options.sandbox ?? false)) {
      try {
        const sandboxInfo = await this.sandboxManager.prepareSandbox();
        sandboxId = sandboxInfo.sandboxId;
      } catch (error) {
        const executionTime = diffTimestamp(startTime, now());
        return {
          success: false,
          scriptName: script.name,
          scriptType: script.type,
          error: `Failed to prepare sandbox: ${error instanceof Error ? error.message : String(error)}`,
          executionTime
        };
      }
    }

    // 创建临时重试策略（使用选项中的配置）
    const tempRetryStrategy = new RetryStrategy({
      maxRetries: retries,
      baseDelay: retryDelay,
      exponentialBackoff
    });

    // 执行脚本（带重试）
    let lastError: Error | undefined;
    let retryCount = 0;

    try {
      for (let i = 0; i <= retries; i++) {
        try {
          // 执行脚本（带超时和中止信号）
          const output = await this.timeoutController.executeWithTimeout(
            () => this.doExecute(script, context),
            timeout,
            options.signal
          );

          const executionTime = diffTimestamp(startTime, now());

          // 清理沙箱环境
          if (sandboxId !== 'no-sandbox' && this.sandboxManager) {
            await this.sandboxManager.cleanupSandbox(sandboxId);
          }

          return {
            success: output.exitCode === 0,
            scriptName: script.name,
            scriptType: script.type,
            stdout: output.stdout,
            stderr: output.stderr,
            exitCode: output.exitCode,
            executionTime,
            error: output.exitCode !== 0 ? output.stderr : undefined
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

      // 清理沙箱环境
      if (sandboxId !== 'no-sandbox' && this.sandboxManager) {
        await this.sandboxManager.cleanupSandbox(sandboxId);
      }

      return {
        success: false,
        scriptName: script.name,
        scriptType: script.type,
        error: errorMessage,
        executionTime,
        retryCount
      };
    } catch (error) {
      // 清理沙箱环境（在异常情况下）
      if (sandboxId !== 'no-sandbox' && this.sandboxManager) {
        try {
          await this.sandboxManager.cleanupSandbox(sandboxId);
        } catch (cleanupError) {
          // 忽略清理错误
        }
      }

      const executionTime = diffTimestamp(startTime, now());
      return {
        success: false,
        scriptName: script.name,
        scriptType: script.type,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  /**
   * 验证脚本配置
   * @param script 脚本定义
   * @returns 验证结果
   */
  validate(script: Script): ValidationResult {
    return this.validator.validate(script);
  }

  /**
   * 执行脚本的具体实现（由子类实现）
   * @param script 脚本定义
   * @param context 执行上下文
   * @returns 执行输出
   */
  protected abstract doExecute(
    script: Script,
    context?: ExecutionContext
  ): Promise<ExecutionOutput>;

  /**
   * 睡眠指定时间
   * @param ms 睡眠时间（毫秒）
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 子类可以覆盖此方法以实现特定的清理逻辑
  }

  /**
   * 获取执行器类型（由子类实现）
   */
  abstract getExecutorType(): string;

  /**
   * 获取支持的脚本类型（由子类实现）
   * @returns 支持的脚本类型数组
   */
  abstract getSupportedTypes(): import('@modular-agent/types').ScriptType[];
}