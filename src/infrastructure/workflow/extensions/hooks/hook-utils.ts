import { HookPoint, HookContext } from './hook-context';
import { BaseHook } from './base-hook';
import { HookExecutionResult, HookExecutionResultBuilder } from './hook-execution-result';

/**
 * 钩子链执行模式
 */
export enum HookChainExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel'
}

/**
 * 钩子链错误处理策略
 */
export enum HookChainErrorHandlingStrategy {
  STOP_ON_ERROR = 'stop_on_error',
  CONTINUE_ON_ERROR = 'continue_on_error',
  SKIP_ON_ERROR = 'skip_on_error'
}

/**
 * 预定义钩子类
 */
export class LoggingHook extends BaseHook {
  constructor(
    id: string,
    hookPoint: HookPoint,
    private logger?: (message: string, context?: any) => void
  ) {
    super(id, hookPoint);
  }


  protected async onExecute(context: HookContext): Promise<any> {
    this.logger?.(`执行日志钩子: ${this.getId()}`, context);
    return { logged: true };
  }

}

export class ValidationHook extends BaseHook {
  constructor(
    id: string,
    hookPoint: HookPoint,
    private validator: (context: HookContext) => boolean | Promise<boolean>,
    private errorMessage?: string
  ) {
    super(id, hookPoint);
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const isValid = await this.validator(context);
    return { isValid };
  }
}

export class CacheHook extends BaseHook {
  constructor(
    id: string,
    hookPoint: HookPoint,
    private keyGenerator: (context: HookContext) => string,
    private ttl?: number
  ) {
    super(id, hookPoint);
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const key = this.keyGenerator(context);
    // 简化的缓存实现
    return { cacheKey: key };
  }
}

export class PerformanceHook extends BaseHook {
  constructor(id: string, hookPoint: HookPoint) {
    super(id, hookPoint);
  }

  protected async onExecute(context: HookContext): Promise<any> {
    // 简化的性能监控实现
    return { performanceMetrics: { timestamp: Date.now() } };
  }
}

export class TransformHook extends BaseHook {
  constructor(
    id: string,
    hookPoint: HookPoint,
    private transformer: (context: HookContext) => Promise<HookContext> | HookContext
  ) {
    super(id, hookPoint);
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const transformedContext = await this.transformer(context);
    return { transformedContext };
  }
}

export class FilterHook extends BaseHook {
  constructor(
    id: string,
    hookPoint: HookPoint,
    private filter: (context: HookContext) => boolean | Promise<boolean>
  ) {
    super(id, hookPoint);
  }

  protected async onExecute(context: HookContext): Promise<any> {
    const shouldPass = await this.filter(context);
    return { shouldPass };
  }
}

/**
 * 钩子工具类
 * 
 * 提供钩子系统的实用方法
 */
export class HookUtils {
  /**
   * 创建日志钩子
   */
  public static createLoggingHook(
    hookPoint: HookPoint,
    logger?: (message: string, context?: any) => void
  ): BaseHook {
    const id = `logging_${hookPoint}_${Date.now()}`;
    return new LoggingHook(id, hookPoint, logger);
  }

  /**
   * 创建验证钩子
   */
  public static createValidationHook(
    hookPoint: HookPoint,
    validator: (context: HookContext) => boolean | Promise<boolean>,
    errorMessage?: string
  ): BaseHook {
    const id = `validation_${hookPoint}_${Date.now()}`;
    return new ValidationHook(id, hookPoint, validator, errorMessage);
  }

  /**
   * 创建缓存钩子
   */
  public static createCacheHook(
    hookPoint: HookPoint,
    keyGenerator?: (context: HookContext) => string,
    ttl?: number
  ): BaseHook {
    const id = `cache_${hookPoint}_${Date.now()}`;
    // 如果没有提供 keyGenerator，使用默认的键生成函数
    const defaultKeyGenerator = (context: HookContext) =>
      `${context.workflowId?.toString() || 'unknown'}_${context.nodeId || 'unknown'}`;
    return new CacheHook(id, hookPoint, keyGenerator || defaultKeyGenerator, ttl);
  }

  /**
   * 创建性能监控钩子
   */
  public static createPerformanceHook(hookPoint: HookPoint): BaseHook {
    const id = `performance_${hookPoint}_${Date.now()}`;
    return new PerformanceHook(id, hookPoint);
  }

  /**
   * 创建转换钩子
   */
  public static createTransformHook(
    hookPoint: HookPoint,
    transformer: (context: HookContext) => Promise<HookContext> | HookContext
  ): BaseHook {
    const id = `transform_${hookPoint}_${Date.now()}`;
    return new TransformHook(id, hookPoint, transformer);
  }

  /**
   * 创建过滤钩子
   */
  public static createFilterHook(
    hookPoint: HookPoint,
    filter: (context: HookContext) => boolean | Promise<boolean>
  ): BaseHook {
    const id = `filter_${hookPoint}_${Date.now()}`;
    return new FilterHook(id, hookPoint, filter);
  }

  /**
   * 创建自定义钩子
   */
  public static createCustomHook(
    hookPoint: HookPoint,
    executor: (context: HookContext) => Promise<any> | any,
    options: {
      id?: string;
      enabled?: boolean;
      condition?: (context: HookContext) => boolean | Promise<boolean>;
      priority?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): BaseHook {
    const id = options.id || `custom_${hookPoint}_${Date.now()}`;

    return new class extends BaseHook {
       constructor() {
         super(id, hookPoint);
         if (options.enabled === false) {
           this.setEnabled(false);
         }
         if (options.priority !== undefined) {
           this.setPriority(options.priority);
         }
         if (options.metadata) {
           this.setMetadata(options.metadata);
         }
       }

       protected async onExecute(context: HookContext): Promise<any> {
         if (options.condition) {
           const shouldExecute = await options.condition(context);
           if (!shouldExecute) {
             return { conditionNotMet: true };
           }
         }
         return await executor(context);
       }
     }();
  }

  /**
   * 创建组合钩子
   */
  public static createCompositeHook(
    hookPoint: HookPoint,
    hooks: BaseHook[],
    executionMode: HookChainExecutionMode = HookChainExecutionMode.SEQUENTIAL
  ): BaseHook {
    const id = `composite_${hookPoint}_${Date.now()}`;

    return new class extends BaseHook {
       constructor() {
         super(id, hookPoint);
       }

       protected async onExecute(context: HookContext): Promise<any> {
         const results: any[] = [];

         switch (executionMode) {
           case HookChainExecutionMode.SEQUENTIAL:
             for (const hook of hooks) {
               if (hook.isEnabled()) {
                 const result = await hook.execute(context);
                 results.push(result);
               }
             }
             break;

           case HookChainExecutionMode.PARALLEL:
             const promises = hooks
               .filter(hook => hook.isEnabled())
               .map(hook => hook.execute(context));
             const parallelResults = await Promise.all(promises);
             results.push(...parallelResults);
             break;

           default:
             throw new Error(`不支持的执行模式: ${executionMode}`);
         }

         return { compositeResults: results };
       }
     }();
  }

  /**
   * 创建条件钩子
   */
  public static createConditionalHook(
    hookPoint: HookPoint,
    condition: (context: HookContext) => boolean | Promise<boolean>,
    trueHook: BaseHook,
    falseHook?: BaseHook
  ): BaseHook {
    const id = `conditional_${hookPoint}_${Date.now()}`;

    return new class extends BaseHook {
       constructor() {
         super(id, hookPoint);
       }

       protected async onExecute(context: HookContext): Promise<any> {
         const shouldExecuteTrue = await condition(context);

         if (shouldExecuteTrue) {
           return await trueHook.execute(context);
         } else if (falseHook) {
           return await falseHook.execute(context);
         }

         return { conditionMet: shouldExecuteTrue, executed: false };
       }
     }();
  }

  /**
   * 验证钩子配置
   */
  public static validateHook(hook: BaseHook): boolean {
    try {
      // 检查基本属性
      if (!hook.getId() || !hook.getHookPoint()) {
        return false;
      }

      // 检查钩子点是否有效
      if (!Object.values(HookPoint).includes(hook.getHookPoint())) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证钩子链配置
   */
  public static validateHookChain(chain: any): boolean {
    try {
      // 检查基本属性
      if (!chain.hookPoint || !chain.hooks || chain.hooks.length === 0) {
        return false;
      }

      // 检查钩子点是否有效
      if (!Object.values(HookPoint).includes(chain.hookPoint)) {
        return false;
      }

      // 检查所有钩子是否有效
      for (const hook of chain.hooks) {
        if (!this.validateHook(hook)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取钩子执行摘要
   */
  public static getHookExecutionSummary(results: HookExecutionResult[]): {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    errors: string[];
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = 0;
    const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = total > 0 ? totalExecutionTime / total : 0;
    const errors = results
      .filter(r => r.error)
      .map(r => r.error?.message || 'Unknown error');

    return {
      total,
      successful,
      failed,
      skipped,
      totalExecutionTime,
      averageExecutionTime,
      errors
    };
  }

  /**
   * 创建钩子执行报告
   */
  public static createHookExecutionReport(
    hookPoint: HookPoint,
    results: HookExecutionResult[],
    context: HookContext
  ): string {
    const summary = this.getHookExecutionSummary(results);

    let report = `钩子执行报告\n`;
    report += `=============\n`;
    report += `钩子点: ${hookPoint}\n`;
    report += `图ID: ${context.workflowId?.toString() || 'N/A'}\n`;
    report += `节点ID: ${context.nodeId || 'N/A'}\n`;
    report += `执行时间: ${context.timestamp.toISOString()}\n\n`;

    report += `执行摘要:\n`;
    report += `- 总数: ${summary.total}\n`;
    report += `- 成功: ${summary.successful}\n`;
    report += `- 失败: ${summary.failed}\n`;
    report += `- 跳过: ${summary.skipped}\n`;
    report += `- 总执行时间: ${summary.totalExecutionTime}ms\n`;
    report += `- 平均执行时间: ${summary.averageExecutionTime.toFixed(2)}ms\n\n`;

    if (summary.errors.length > 0) {
      report += `错误信息:\n`;
      summary.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    report += `详细结果:\n`;
    results.forEach((result, index) => {
      report += `${index + 1}. 钩子ID: ${result.hookId}\n`;
      report += `   状态: ${result.success ? '成功' : '失败'}\n`;
      report += `   执行时间: ${result.executionTime}ms\n`;
      report += `   应继续: ${result.shouldContinue ? '是' : '否'}\n`;
      if (result.error) {
        report += `   错误: ${result.error.message}\n`;
      }
      report += '\n';
    });

    return report;
  }
}