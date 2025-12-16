import { HookPoint } from '../../value-objects/hook-point';
import { BaseHook } from './base-hook';
import { HookContext } from './hook-context';
import { HookExecutionResult } from './hook-execution-result';

/**
 * 钩子链接口
 * 
 * 表示一组按顺序执行的钩子
 */
export interface HookChain {
  /**
   * 钩子点
   */
  hookPoint: HookPoint;

  /**
   * 钩子列表
   */
  hooks: BaseHook[];

  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * 执行模式
   */
  executionMode: HookChainExecutionMode;

  /**
   * 错误处理策略
   */
  errorHandlingStrategy: HookChainErrorHandlingStrategy;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 最大重试次数
   */
  maxRetries: number;
}

/**
 * 钩子链执行模式
 */
export enum HookChainExecutionMode {
  /**
   * 顺序执行
   */
  SEQUENTIAL = 'sequential',

  /**
   * 并行执行
   */
  PARALLEL = 'parallel',

  /**
   * 管道执行（前一个钩子的输出作为后一个钩子的输入）
   */
  PIPELINE = 'pipeline'
}

/**
 * 钩子链错误处理策略
 */
export enum HookChainErrorHandlingStrategy {
  /**
   * 遇到错误立即停止
   */
  STOP_ON_ERROR = 'stop_on_error',

  /**
   * 忽略错误继续执行
   */
  CONTINUE_ON_ERROR = 'continue_on_error',

  /**
   * 记录错误但继续执行
   */
  LOG_AND_CONTINUE = 'log_and_continue'
}

/**
 * 钩子链执行结果
 */
export interface HookChainExecutionResult {
  /**
   * 钩子点
   */
  hookPoint: HookPoint;

  /**
   * 执行是否成功
   */
  success: boolean;

  /**
   * 钩子执行结果列表
   */
  hookResults: HookExecutionResult[];

  /**
   * 总执行时间（毫秒）
   */
  totalExecutionTime: number;

  /**
   * 执行的钩子数量
   */
  executedHookCount: number;

  /**
   * 成功的钩子数量
   */
  successfulHookCount: number;

  /**
   * 失败的钩子数量
   */
  failedHookCount: number;

  /**
   * 跳过的钩子数量
   */
  skippedHookCount: number;

  /**
   * 最终结果数据
   */
  finalResult?: any;

  /**
   * 错误信息
   */
  error?: Error;
}

/**
 * 钩子链构建器
 * 
 * 用于构建钩子链
 */
export class HookChainBuilder {
  private chain: Partial<HookChain> = {};

  /**
   * 设置钩子点
   */
  public setHookPoint(hookPoint: HookPoint): HookChainBuilder {
    this.chain.hookPoint = hookPoint;
    return this;
  }

  /**
   * 添加钩子
   */
  public addHook(hook: BaseHook): HookChainBuilder {
    if (!this.chain.hooks) {
      this.chain.hooks = [];
    }
    this.chain.hooks.push(hook);
    return this;
  }

  /**
   * 添加多个钩子
   */
  public addHooks(hooks: BaseHook[]): HookChainBuilder {
    if (!this.chain.hooks) {
      this.chain.hooks = [];
    }
    this.chain.hooks.push(...hooks);
    return this;
  }

  /**
   * 设置钩子列表
   */
  public setHooks(hooks: BaseHook[]): HookChainBuilder {
    this.chain.hooks = hooks;
    return this;
  }

  /**
   * 设置是否启用
   */
  public setEnabled(enabled: boolean): HookChainBuilder {
    this.chain.enabled = enabled;
    return this;
  }

  /**
   * 设置执行模式
   */
  public setExecutionMode(executionMode: HookChainExecutionMode): HookChainBuilder {
    this.chain.executionMode = executionMode;
    return this;
  }

  /**
   * 设置错误处理策略
   */
  public setErrorHandlingStrategy(strategy: HookChainErrorHandlingStrategy): HookChainBuilder {
    this.chain.errorHandlingStrategy = strategy;
    return this;
  }

  /**
   * 设置超时时间
   */
  public setTimeout(timeout: number): HookChainBuilder {
    this.chain.timeout = timeout;
    return this;
  }

  /**
   * 设置最大重试次数
   */
  public setMaxRetries(maxRetries: number): HookChainBuilder {
    this.chain.maxRetries = maxRetries;
    return this;
  }

  /**
   * 构建钩子链
   */
  public build(): HookChain {
    // 设置默认值
    if (this.chain.enabled === undefined) {
      this.chain.enabled = true;
    }

    if (!this.chain.executionMode) {
      this.chain.executionMode = HookChainExecutionMode.SEQUENTIAL;
    }

    if (!this.chain.errorHandlingStrategy) {
      this.chain.errorHandlingStrategy = HookChainErrorHandlingStrategy.STOP_ON_ERROR;
    }

    if (this.chain.maxRetries === undefined) {
      this.chain.maxRetries = 0;
    }

    // 验证必需字段
    if (!this.chain.hookPoint) {
      throw new Error('钩子点不能为空');
    }

    if (!this.chain.hooks || this.chain.hooks.length === 0) {
      throw new Error('钩子列表不能为空');
    }

    return this.chain as HookChain;
  }

  /**
   * 从现有钩子链创建构建器
   */
  public static from(chain: Partial<HookChain>): HookChainBuilder {
    const builder = new HookChainBuilder();
    builder.chain = { ...chain };
    return builder;
  }

  /**
   * 创建新的钩子链
   */
  public static create(hookPoint: HookPoint): HookChainBuilder {
    return new HookChainBuilder().setHookPoint(hookPoint);
  }

  /**
   * 创建顺序执行的钩子链
   */
  public static sequential(hookPoint: HookPoint, hooks: BaseHook[]): HookChainBuilder {
    return HookChainBuilder
      .create(hookPoint)
      .setHooks(hooks)
      .setExecutionMode(HookChainExecutionMode.SEQUENTIAL);
  }

  /**
   * 创建并行执行的钩子链
   */
  public static parallel(hookPoint: HookPoint, hooks: BaseHook[]): HookChainBuilder {
    return HookChainBuilder
      .create(hookPoint)
      .setHooks(hooks)
      .setExecutionMode(HookChainExecutionMode.PARALLEL);
  }

  /**
   * 创建管道执行的钩子链
   */
  public static pipeline(hookPoint: HookPoint, hooks: BaseHook[]): HookChainBuilder {
    return HookChainBuilder
      .create(hookPoint)
      .setHooks(hooks)
      .setExecutionMode(HookChainExecutionMode.PIPELINE);
  }
}

/**
 * 钩子链工具类
 * 
 * 提供钩子链的实用方法
 */
export class HookChainUtils {
  /**
   * 检查钩子链是否有效
   */
  public static isValid(chain: HookChain): boolean {
    return !!(
      chain &&
      chain.hookPoint &&
      chain.hooks &&
      chain.hooks.length > 0 &&
      Object.values(HookPoint).includes(chain.hookPoint)
    );
  }

  /**
   * 检查钩子链是否启用
   */
  public static isEnabled(chain: HookChain): boolean {
    return chain.enabled !== false;
  }

  /**
   * 获取钩子链中的钩子数量
   */
  public static getHookCount(chain: HookChain): number {
    return chain.hooks ? chain.hooks.length : 0;
  }

  /**
   * 获取钩子链中的钩子ID列表
   */
  public static getHookIds(chain: HookChain): string[] {
    return chain.hooks ? chain.hooks.map(hook => hook.getId()) : [];
  }

  /**
   * 检查钩子链是否包含特定钩子
   */
  public static containsHook(chain: HookChain, hookId: string): boolean {
    return chain.hooks ? chain.hooks.some(hook => hook.getId() === hookId) : false;
  }

  /**
   * 获取钩子链中的特定钩子
   */
  public static getHook(chain: HookChain, hookId: string): BaseHook | undefined {
    return chain.hooks ? chain.hooks.find(hook => hook.getId() === hookId) : undefined;
  }

  /**
   * 克隆钩子链
   */
  public static clone(chain: HookChain): HookChain {
    return HookChainBuilder
      .from(chain)
      .setHooks([...chain.hooks])
      .build();
  }

  /**
   * 创建钩子链执行结果
   */
  public static createExecutionResult(
    hookPoint: HookPoint,
    hookResults: HookExecutionResult[],
    totalExecutionTime: number,
    finalResult?: any,
    error?: Error
  ): HookChainExecutionResult {
    const executedHookCount = hookResults.length;
    const successfulHookCount = hookResults.filter(r => r.success).length;
    const failedHookCount = hookResults.filter(r => !r.success && !r.result?.skipped).length;
    const skippedHookCount = hookResults.filter(r => r.result?.skipped).length;
    const success = failedHookCount === 0;

    return {
      hookPoint,
      success,
      hookResults,
      totalExecutionTime,
      executedHookCount,
      successfulHookCount,
      failedHookCount,
      skippedHookCount,
      finalResult,
      error
    };
  }

  /**
   * 获取钩子链执行结果摘要
   */
  public static getExecutionResultSummary(result: HookChainExecutionResult): Record<string, unknown> {
    return {
      hookPoint: result.hookPoint,
      success: result.success,
      totalExecutionTime: result.totalExecutionTime,
      executedHookCount: result.executedHookCount,
      successfulHookCount: result.successfulHookCount,
      failedHookCount: result.failedHookCount,
      skippedHookCount: result.skippedHookCount,
      hasFinalResult: !!result.finalResult,
      hasError: !!result.error,
      errorMessage: result.error?.message,
      hookResultSummaries: result.hookResults.map(r => ({
        hookId: r.hookId,
        success: r.success,
        executionTime: r.executionTime,
        shouldContinue: r.shouldContinue,
        shouldRetry: r.shouldRetry
      }))
    };
  }
}