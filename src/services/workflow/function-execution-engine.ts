/**
 * 函数执行引擎
 *
 * 负责函数级别的执行，包括：
 * - 函数执行策略（顺序、并行、条件）
 * - 上下文处理
 * - 执行结果收集
 * - 错误处理
 *
 * 属于基础设施层，提供技术性的函数执行支持
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../domain/workflow/entities/node';
import { WorkflowExecutionContext } from '../../domain/workflow/entities/node';
import { NodeExecutor } from './nodes/node-executor';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 函数执行策略枚举
 */
export enum FunctionExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
}

/**
 * 函数执行结果接口
 */
export interface FunctionExecutionResult {
  /** 函数ID */
  functionId: string;
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  executionTime: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 函数执行计划接口
 */
export interface FunctionExecutionPlan {
  /** 计划ID */
  id: string;
  /** 函数列表 */
  functions: Node[];
  /** 配置 */
  config: {
    /** 执行策略 */
    strategy: FunctionExecutionStrategy;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 重试次数 */
    retryCount?: number;
    /** 重试延迟（毫秒） */
    retryDelay?: number;
  };
  /** 依赖关系 */
  dependencies: Array<{
    /** 从函数ID */
    from: string;
    /** 到函数ID */
    to: string;
  }>;
}

/**
 * 函数执行配置
 */
export interface FunctionExecutionConfig {
  /** 执行策略 */
  strategy: FunctionExecutionStrategy;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 错误处理策略 */
  errorHandling?: 'fail-fast' | 'continue-on-error' | 'retry';
  /** 最大并发数 */
  maxConcurrency?: number;
}

/**
 * 函数执行引擎
 */
@injectable()
export class FunctionExecutionEngine {
  constructor(
    @inject('NodeExecutor') private readonly nodeExecutor: NodeExecutor,
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 执行函数
   *
   * @param functions 函数列表
   * @param context 执行上下文
   * @param config 执行配置
   * @returns 执行结果列表
   */
  async execute(
    functions: Node[],
    context: WorkflowExecutionContext,
    config: FunctionExecutionConfig
  ): Promise<FunctionExecutionResult[]> {
    this.logger.info('开始执行函数', {
      functionCount: functions.length,
      strategy: config.strategy,
    });

    switch (config.strategy) {
      case FunctionExecutionStrategy.SEQUENTIAL:
        return this.executeSequential(functions, context, config);
      case FunctionExecutionStrategy.PARALLEL:
        return this.executeParallel(functions, context, config);
      case FunctionExecutionStrategy.CONDITIONAL:
        return this.executeConditional(functions, context, config);
      default:
        throw new Error(`不支持的执行策略: ${config.strategy}`);
    }
  }

  /**
   * 顺序执行函数
   *
   * @param functions 函数列表
   * @param context 执行上下文
   * @param config 执行配置
   * @returns 执行结果列表
   */
  private async executeSequential(
    functions: Node[],
    context: WorkflowExecutionContext,
    config: FunctionExecutionConfig
  ): Promise<FunctionExecutionResult[]> {
    const results: FunctionExecutionResult[] = [];

    for (const func of functions) {
      const result = await this.executeFunction(func, context, config);
      results.push(result);

      // 如果配置为快速失败且执行失败，则停止执行
      if (config.errorHandling === 'fail-fast' && !result.success) {
        this.logger.warn('快速失败策略，停止执行', {
          functionId: func.id.toString(),
          error: result.error,
        });
        break;
      }
    }

    return results;
  }

  /**
   * 并行执行函数
   *
   * @param functions 函数列表
   * @param context 执行上下文
   * @param config 执行配置
   * @returns 执行结果列表
   */
  private async executeParallel(
    functions: Node[],
    context: WorkflowExecutionContext,
    config: FunctionExecutionConfig
  ): Promise<FunctionExecutionResult[]> {
    const maxConcurrency = config.maxConcurrency || functions.length;
    const results: FunctionExecutionResult[] = [];

    // 分批执行
    for (let i = 0; i < functions.length; i += maxConcurrency) {
      const batch = functions.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map(func => this.executeFunction(func, context, config))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 条件执行函数
   *
   * @param functions 函数列表
   * @param context 执行上下文
   * @param config 执行配置
   * @returns 执行结果列表
   */
  private async executeConditional(
    functions: Node[],
    context: WorkflowExecutionContext,
    config: FunctionExecutionConfig
  ): Promise<FunctionExecutionResult[]> {
    const results: FunctionExecutionResult[] = [];

    for (const func of functions) {
      // 检查是否可以执行
      const canExecute = await this.nodeExecutor.canExecute(func, context);
      if (!canExecute) {
        this.logger.debug('函数不满足执行条件，跳过', {
          functionId: func.id.toString(),
        });
        continue;
      }

      const result = await this.executeFunction(func, context, config);
      results.push(result);

      // 如果配置为快速失败且执行失败，则停止执行
      if (config.errorHandling === 'fail-fast' && !result.success) {
        this.logger.warn('快速失败策略，停止执行', {
          functionId: func.id.toString(),
          error: result.error,
        });
        break;
      }
    }

    return results;
  }

  /**
   * 执行单个函数
   *
   * @param func 函数
   * @param context 执行上下文
   * @param config 执行配置
   * @returns 执行结果
   */
  private async executeFunction(
    func: Node,
    context: WorkflowExecutionContext,
    config: FunctionExecutionConfig
  ): Promise<FunctionExecutionResult> {
    const startTime = Date.now();
    const functionId = func.nodeId.toString();

    this.logger.debug('开始执行函数', {
      functionId,
      functionName: func.name,
      functionType: func.type.toString(),
    });

    try {
      // 应用上下文处理器
      const processedContext = this.applyContextProcessor(func, context);

      // 执行函数（带重试）
      const result = await this.executeWithRetry(func, processedContext, config);

      const executionTime = Date.now() - startTime;

      this.logger.info('函数执行完成', {
        functionId,
        success: result.success,
        executionTime,
      });

      return {
        functionId,
        success: result.success,
        result: result.output,
        executionTime,
        metadata: {
          functionName: func.name,
          functionType: func.type.toString(),
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('函数执行失败', error instanceof Error ? error : new Error(String(error)), {
        functionId,
        executionTime,
      });

      return {
        functionId,
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          functionName: func.name,
          functionType: func.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 带重试的执行
   *
   * @param func 函数
   * @param context 执行上下文
   * @param config 执行配置
   * @returns 执行结果
   */
  private async executeWithRetry(
    func: Node,
    context: WorkflowExecutionContext,
    config: FunctionExecutionConfig
  ): Promise<any> {
    const retryCount = config.retryCount || 0;
    const retryDelay = config.retryDelay || 1000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // 执行函数
        const result = await this.nodeExecutor.execute(func, context);

        // 如果执行成功，返回结果
        if (result.success) {
          return result;
        }

        // 如果执行失败且不是最后一次尝试，记录错误并重试
        if (attempt < retryCount) {
          lastError = new Error(result.error || '函数执行失败');
          this.logger.warn('函数执行失败，准备重试', {
            functionId: func.nodeId.toString(),
            attempt: attempt + 1,
            maxAttempts: retryCount + 1,
            error: result.error,
          });

          // 等待重试延迟
          await this.sleep(retryDelay);
        } else {
          // 最后一次尝试失败，返回错误结果
          return result;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retryCount) {
          this.logger.warn('函数执行异常，准备重试', {
            functionId: func.nodeId.toString(),
            attempt: attempt + 1,
            maxAttempts: retryCount + 1,
            error: lastError.message,
          });

          // 等待重试延迟
          await this.sleep(retryDelay);
        } else {
          // 最后一次尝试失败，抛出错误
          throw lastError;
        }
      }
    }

    // 理论上不会到达这里
    throw lastError || new Error('函数执行失败');
  }

  /**
   * 应用上下文处理器
   *
   * @param func 函数
   * @param context 执行上下文
   * @returns 处理后的上下文
   */
  private applyContextProcessor(
    func: Node,
    context: WorkflowExecutionContext
  ): WorkflowExecutionContext {
    // 简化实现：暂时不应用上下文处理器
    // TODO: 根据实际需求实现上下文处理逻辑
    return context;
  }

  /**
   * 睡眠指定时间
   *
   * @param ms 毫秒数
   * @returns Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建执行计划
   *
   * @param functions 函数列表
   * @param config 执行配置
   * @returns 执行计划
   */
  createExecutionPlan(functions: Node[], config: FunctionExecutionConfig): FunctionExecutionPlan {
    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      functions,
      config: {
        strategy: config.strategy,
        timeout: config.timeout,
        retryCount: config.retryCount,
        retryDelay: config.retryDelay,
      },
      dependencies: [],
    };
  }

  /**
   * 验证执行计划
   *
   * @param plan 执行计划
   * @returns 是否有效
   */
  validateExecutionPlan(plan: FunctionExecutionPlan): boolean {
    if (!plan.id || plan.id.trim().length === 0) {
      return false;
    }

    if (plan.functions.length === 0) {
      return false;
    }

    if (!Object.values(FunctionExecutionStrategy).includes(plan.config.strategy)) {
      return false;
    }

    return true;
  }
}
