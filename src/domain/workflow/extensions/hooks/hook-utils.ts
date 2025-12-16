import { HookPoint } from '../../value-objects/hook-point';
import { BaseHook } from './base-hook';
import { HookContext } from './hook-context';
import { HookExecutionResult } from './hook-execution-result';
import { HookChain, HookChainExecutionMode, HookChainErrorHandlingStrategy } from './hook-chain';
import { LoggingHook, ValidationHook, CacheHook, PerformanceHook, TransformHook, FilterHook } from './predefined-hooks';

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
        this.setEnabled(options.enabled !== false);
        this.setPriority(options.priority || 0);
        if (options.metadata) {
          this.setMetadata(options.metadata);
        }
      }

      protected async onExecute(context: HookContext): Promise<any> {
        return await executor(context);
      }

      public override shouldExecute(context: HookContext): boolean {
        if (options.condition) {
          try {
            const result = options.condition(context);
            return result instanceof Promise ? false : result;
          } catch {
            return false;
          }
        }
        return super.shouldExecute(context);
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
              if (hook.shouldExecute(context)) {
                const result = await hook.execute(context);
                results.push(result);
              }
            }
            break;

          case HookChainExecutionMode.PARALLEL:
            const promises = hooks
              .filter(hook => hook.shouldExecute(context))
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

      public override shouldExecute(context: HookContext): boolean {
        try {
          const result = condition(context);
          return result instanceof Promise ? true : result;
        } catch {
          return false;
        }
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
  public static validateHookChain(chain: HookChain): boolean {
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
    const failed = results.filter(r => !r.success && !r.result?.skipped).length;
    const skipped = results.filter(r => r.result?.skipped).length;
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
      report += `   应重试: ${result.shouldRetry ? '是' : '否'}\n`;
      if (result.error) {
        report += `   错误: ${result.error.message}\n`;
      }
      report += '\n';
    });

    return report;
  }
}