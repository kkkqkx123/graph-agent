import { HookPoint, HookContext } from './hook-context';

/**
 * 基础钩子接口
 */
export interface BaseHook {
  getId(): string;
  getHookPoint(): HookPoint;
  execute(context: HookContext): Promise<HookExecutionResult>;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
}

/**
 * 钩子执行结果接口
 */
export interface HookExecutionResult {
  hookId: string;
  success: boolean;
  result?: any;
  error?: Error;
  executionTime: number;
  shouldContinue: boolean;
}

/**
 * 钩子链执行模式枚举
 */
export enum HookChainExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  PIPELINE = 'pipeline'
}

/**
 * 钩子链错误处理策略枚举
 */
export enum HookChainErrorHandlingStrategy {
  STOP_ON_ERROR = 'stop_on_error',
  CONTINUE_ON_ERROR = 'continue_on_error',
  RETRY = 'retry'
}

/**
 * 钩子链接口
 */
export interface HookChain {
  hookPoint: HookPoint;
  hooks: BaseHook[];
  enabled: boolean;
  executionMode: HookChainExecutionMode;
  errorHandlingStrategy: HookChainErrorHandlingStrategy;
  maxRetries: number;
}

/**
 * 钩子链工具类
 */
export class HookChainUtils {
  static createExecutionResult(
    hookPoint: HookPoint,
    hookResults: HookExecutionResult[],
    totalExecutionTime: number,
    finalResult?: any,
    error?: Error
  ): HookChainExecutionResult {
    return {
      hookPoint,
      success: !error,
      hookResults,
      totalExecutionTime,
      executedHookCount: hookResults.length,
      successfulHookCount: hookResults.filter(r => r.success).length,
      failedHookCount: hookResults.filter(r => !r.success).length,
      skippedHookCount: 0,
      finalResult,
      error
    };
  }
}

/**
 * 钩子执行管理器接口
 * 
 * 负责管理和执行钩子链
 */
export interface HookExecutionManager {
  /**
   * 注册钩子
   */
  registerHook(hook: BaseHook): void;

  /**
   * 注销钩子
   */
  unregisterHook(hookId: string): void;

  /**
   * 获取钩子
   */
  getHook(hookId: string): BaseHook | undefined;

  /**
   * 获取所有钩子
   */
  getAllHooks(): BaseHook[];

  /**
   * 获取指定钩子点的钩子
   */
  getHooksByPoint(hookPoint: HookPoint): BaseHook[];

  /**
   * 创建钩子链
   */
  createHookChain(hookPoint: HookPoint, hookIds?: string[]): HookChain;

  /**
   * 执行钩子链
   */
  executeHookChain(chain: HookChain, context: HookContext): Promise<HookChainExecutionResult>;

  /**
   * 执行指定钩子点的所有钩子
   */
  executeHooks(hookPoint: HookPoint, context: HookContext): Promise<HookChainExecutionResult>;

  /**
   * 执行单个钩子
   */
  executeHook(hook: BaseHook, context: HookContext): Promise<HookExecutionResult>;

  /**
   * 启用/禁用钩子
   */
  setHookEnabled(hookId: string, enabled: boolean): void;

  /**
   * 检查钩子是否启用
   */
  isHookEnabled(hookId: string): boolean;

  /**
   * 清空所有钩子
   */
  clearHooks(): void;
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
 * 默认钩子执行管理器实现
 */
export class DefaultHookExecutionManager implements HookExecutionManager {
  private hooks: Map<string, BaseHook> = new Map();
  private hooksByPoint: Map<HookPoint, BaseHook[]> = new Map();

  /**
   * 注册钩子
   */
  public registerHook(hook: BaseHook): void {
    this.hooks.set(hook.getId(), hook);

    // 按钩子点分组
    const hookPoint = hook.getHookPoint();
    if (!this.hooksByPoint.has(hookPoint)) {
      this.hooksByPoint.set(hookPoint, []);
    }
    this.hooksByPoint.get(hookPoint)!.push(hook);
  }

  /**
   * 注销钩子
   */
  public unregisterHook(hookId: string): void {
    const hook = this.hooks.get(hookId);
    if (!hook) {
      return;
    }

    this.hooks.delete(hookId);

    // 从钩子点分组中移除
    const hookPoint = hook.getHookPoint();
    const hooks = this.hooksByPoint.get(hookPoint);
    if (hooks) {
      const index = hooks.findIndex(h => h.getId() === hookId);
      if (index >= 0) {
        hooks.splice(index, 1);
      }
    }
  }

  /**
   * 获取钩子
   */
  public getHook(hookId: string): BaseHook | undefined {
    return this.hooks.get(hookId);
  }

  /**
   * 获取所有钩子
   */
  public getAllHooks(): BaseHook[] {
    return Array.from(this.hooks.values());
  }

  /**
   * 获取指定钩子点的钩子
   */
  public getHooksByPoint(hookPoint: HookPoint): BaseHook[] {
    return this.hooksByPoint.get(hookPoint) || [];
  }

  /**
   * 创建钩子链
   */
  public createHookChain(hookPoint: HookPoint, hookIds?: string[]): HookChain {
    const hooks = hookIds 
      ? hookIds.map(id => this.hooks.get(id)).filter(Boolean) as BaseHook[]
      : this.getHooksByPoint(hookPoint);

    return {
      hookPoint,
      hooks,
      enabled: true,
      executionMode: HookChainExecutionMode.SEQUENTIAL,
      errorHandlingStrategy: HookChainErrorHandlingStrategy.STOP_ON_ERROR,
      maxRetries: 0
    };
  }

  /**
   * 执行钩子链
   */
  public async executeHookChain(chain: HookChain, context: HookContext): Promise<HookChainExecutionResult> {
    const startTime = Date.now();
    const hookResults: HookExecutionResult[] = [];

    try {
      // 根据执行模式执行钩子
      switch (chain.executionMode) {
        case HookChainExecutionMode.SEQUENTIAL:
          await this.executeSequential(chain, context, hookResults);
          break;
        case HookChainExecutionMode.PARALLEL:
          await this.executeParallel(chain, context, hookResults);
          break;
        case HookChainExecutionMode.PIPELINE:
          await this.executePipeline(chain, context, hookResults);
          break;
        default:
          throw new Error(`不支持的执行模式: ${chain.executionMode}`);
      }

      const totalExecutionTime = Date.now() - startTime;
      return HookChainUtils.createExecutionResult(
        chain.hookPoint,
        hookResults,
        totalExecutionTime
      );
    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;
      return HookChainUtils.createExecutionResult(
        chain.hookPoint,
        hookResults,
        totalExecutionTime,
        undefined,
        error as Error
      );
    }
  }

  /**
   * 执行指定钩子点的所有钩子
   */
  public async executeHooks(hookPoint: HookPoint, context: HookContext): Promise<HookChainExecutionResult> {
    const chain = this.createHookChain(hookPoint);
    return this.executeHookChain(chain, context);
  }

  /**
   * 执行单个钩子
   */
  public async executeHook(hook: BaseHook, context: HookContext): Promise<HookExecutionResult> {
    return await hook.execute(context);
  }

  /**
   * 启用/禁用钩子
   */
  public setHookEnabled(hookId: string, enabled: boolean): void {
    const hook = this.hooks.get(hookId);
    if (hook) {
      hook.setEnabled(enabled);
    }
  }

  /**
   * 检查钩子是否启用
   */
  public isHookEnabled(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    return hook ? hook.isEnabled() : false;
  }

  /**
   * 清空所有钩子
   */
  public clearHooks(): void {
    this.hooks.clear();
    this.hooksByPoint.clear();
  }

  /**
   * 顺序执行钩子
   */
  private async executeSequential(
    chain: HookChain,
    context: HookContext,
    hookResults: HookExecutionResult[]
  ): Promise<void> {
    for (const hook of chain.hooks) {
      const result = await this.executeHook(hook, context);
      hookResults.push(result);

      // 根据错误处理策略决定是否继续
      if (!result.success && !result.shouldContinue) {
        if (chain.errorHandlingStrategy === HookChainErrorHandlingStrategy.STOP_ON_ERROR) {
          throw result.error || new Error('钩子执行失败');
        }
      }
    }
  }

  /**
   * 并行执行钩子
   */
  private async executeParallel(
    chain: HookChain,
    context: HookContext,
    hookResults: HookExecutionResult[]
  ): Promise<void> {
    const promises = chain.hooks.map(hook => this.executeHook(hook, context));
    const results = await Promise.all(promises);
    hookResults.push(...results);

    // 检查是否有失败的钩子
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0 && chain.errorHandlingStrategy === HookChainErrorHandlingStrategy.STOP_ON_ERROR) {
      const firstError = failedResults[0]?.error;
      throw firstError || new Error('钩子执行失败');
    }
  }

  /**
   * 管道执行钩子
   */
  private async executePipeline(
    chain: HookChain,
    context: HookContext,
    hookResults: HookExecutionResult[]
  ): Promise<void> {
    let pipelineContext = context;

    for (const hook of chain.hooks) {
      const result = await this.executeHook(hook, pipelineContext);
      hookResults.push(result);

      // 将前一个钩子的结果作为下一个钩子的上下文
      if (result.success && result.result) {
        pipelineContext = {
          ...pipelineContext,
          metadata: {
            ...pipelineContext.metadata,
            previousResult: result.result
          }
        };
      }

      // 根据错误处理策略决定是否继续
      if (!result.success && !result.shouldContinue) {
        if (chain.errorHandlingStrategy === HookChainErrorHandlingStrategy.STOP_ON_ERROR) {
          throw result.error || new Error('钩子执行失败');
        }
      }
    }
  }
}