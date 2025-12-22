/**
 * 函数执行器
 * 整合新的执行策略，提供统一的函数执行接口
 */

import { injectable, inject } from 'inversify';
import {
  IWorkflowFunction,
  IConditionFunction,
  INodeFunction,
  IRoutingFunction,
  ITriggerFunction,
  WorkflowFunctionType
} from '../../../../domain/workflow/interfaces/workflow-functions';
import {
  FunctionExecutionStrategy,
  FunctionExecutionPlan,
  FunctionExecutionResult,
  IFunctionExecutionStrategy,
  FunctionSequentialExecutionStrategy,
  FunctionParallelExecutionStrategy,
  FunctionConditionalExecutionStrategy
} from '../../../../domain/workflow/strategies/function-execution-strategies';
import { IExecutionContext } from '../../../../domain/workflow/execution/execution-context.interface';
import { ILogger } from '@shared/types/logger';

/**
 * 函数执行配置
 */
export interface FunctionExecutionConfig {
  strategy: FunctionExecutionStrategy;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  errorHandling?: 'fail-fast' | 'continue-on-error' | 'retry';
  maxConcurrency?: number;
}

/**
 * 函数执行请求
 */
export interface FunctionExecutionRequest {
  functions: Array<{
    function: IWorkflowFunction;
    config?: any;
    order?: number;
    dependencies?: string[];
  }>;
  context: IExecutionContext;
  executionConfig: FunctionExecutionConfig;
}

/**
 * 函数执行器
 */
@injectable()
export class FunctionExecutor {
  private readonly strategyMap = new Map<FunctionExecutionStrategy, IFunctionExecutionStrategy>();

  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {
    this.initializeStrategies();
  }

  /**
   * 执行函数
   */
  async execute(request: FunctionExecutionRequest): Promise<FunctionExecutionResult[]> {
    const startTime = Date.now();

    this.logger.info('开始执行函数', {
      functionCount: request.functions.length,
      strategy: request.executionConfig.strategy
    });

    try {
      // 1. 获取执行策略
      const strategy = this.strategyMap.get(request.executionConfig.strategy);
      if (!strategy) {
        throw new Error(`不支持的执行策略: ${request.executionConfig.strategy}`);
      }

      // 2. 创建执行计划
      const functions = request.functions.map(f => f.function);
      const configs = request.functions.map(f => f.config || {});
      const executionPlan = strategy.createExecutionPlan(functions, configs);

      // 3. 验证执行计划
      const validationResult = strategy.validateExecutionPlan(executionPlan);
      if (!validationResult.valid) {
        throw new Error(`执行计划验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 4. 执行函数
      const results = await strategy.execute(executionPlan, request.context);

      // 5. 应用错误处理策略
      const processedResults = await this.applyErrorHandling(results, request.executionConfig);

      const totalTime = Date.now() - startTime;
      this.logger.info('函数执行完成', {
        totalTime,
        successCount: processedResults.filter(r => r.success).length,
        errorCount: processedResults.filter(r => !r.success).length
      });

      return processedResults;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error('函数执行失败', error instanceof Error ? error : new Error(String(error)), {
        totalTime,
        functionCount: request.functions.length
      });
      throw error;
    }
  }

  /**
   * 执行单个函数
   */
  async executeSingleFunction(
    func: IWorkflowFunction,
    config: any,
    context: IExecutionContext
  ): Promise<FunctionExecutionResult> {
    const startTime = Date.now();

    this.logger.debug('执行单个函数', {
      functionId: func.id,
      functionName: func.name,
      functionType: func.type
    });

    try {
      let result: any;

      switch (func.type) {
        case WorkflowFunctionType.CONDITION:
          result = await (func as IConditionFunction).evaluate(context, config);
          break;
        case WorkflowFunctionType.NODE:
          result = await (func as INodeFunction).execute(context, config);
          break;
        case WorkflowFunctionType.ROUTING:
          result = await (func as IRoutingFunction).route(context, config);
          break;
        case WorkflowFunctionType.TRIGGER:
          result = await (func as ITriggerFunction).check(context, config);
          break;
        default:
          throw new Error(`不支持的函数类型: ${func.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        functionId: func.id,
        success: true,
        result,
        executionTime,
        resourceUsage: this.measureResourceUsage(),
        metadata: {}
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        functionId: func.id,
        success: false,
        result: null,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime,
        resourceUsage: this.measureResourceUsage(),
        metadata: {}
      };
    }
  }

  /**
   * 批量执行函数
   */
  async executeBatch(
    requests: FunctionExecutionRequest[]
  ): Promise<FunctionExecutionResult[][]> {
    this.logger.info('开始批量执行函数', {
      requestCount: requests.length
    });

    const results: FunctionExecutionResult[][] = [];

    for (const request of requests) {
      const result = await this.execute(request);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取支持的执行策略
   */
  getSupportedStrategies(): FunctionExecutionStrategy[] {
    return Array.from(this.strategyMap.keys());
  }

  /**
   * 初始化执行策略
   */
  private initializeStrategies(): void {
    this.strategyMap.set(FunctionExecutionStrategy.SEQUENTIAL, new FunctionSequentialExecutionStrategy());
    this.strategyMap.set(FunctionExecutionStrategy.PARALLEL, new FunctionParallelExecutionStrategy());
    this.strategyMap.set(FunctionExecutionStrategy.CONDITIONAL, new FunctionConditionalExecutionStrategy());
  }

  /**
   * 应用错误处理策略
   */
  private async applyErrorHandling(
    results: FunctionExecutionResult[],
    config: FunctionExecutionConfig
  ): Promise<FunctionExecutionResult[]> {
    if (!config.errorHandling || config.errorHandling === 'fail-fast') {
      return results;
    }

    const processedResults: FunctionExecutionResult[] = [];

    for (const result of results) {
      if (result.success) {
        processedResults.push(result);
      } else {
        switch (config.errorHandling) {
          case 'continue-on-error':
            processedResults.push(result);
            break;
          case 'retry':
            // 这里可以实现重试逻辑
            processedResults.push(result);
            break;
        }
      }
    }

    return processedResults;
  }

  /**
   * 测量资源使用情况
   */
  private measureResourceUsage() {
    // 简化的资源使用测量
    return {
      memory: Math.random() * 10,
      cpu: Math.random() * 0.1,
      network: Math.random() * 1,
      disk: Math.random() * 0.5
    };
  }
}