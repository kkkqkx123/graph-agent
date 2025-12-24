/**
 * 函数执行策略定义
 * 定义不同类型函数的执行策略和优化规则
 */

import {
  IWorkflowFunction,
  WorkflowFunctionType,
  IConditionFunction,
  INodeFunction,
  IRoutingFunction,
  ITriggerFunction
} from '../interfaces/workflow-functions';
import { IExecutionContext } from '../execution/execution-context.interface';
import { ValidationResult } from '../interfaces/workflow-functions';

/**
 * 函数执行策略枚举
 */
export enum FunctionExecutionStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  PIPELINE = 'pipeline',
  BATCH = 'batch',
  STREAMING = 'streaming'
}

/**
 * 执行模式
 */
export enum ExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  FIRE_AND_FORGET = 'fire_and_forget'
}

/**
 * 执行优先级
 */
export enum ExecutionPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * 函数执行配置
 */
export interface FunctionExecutionConfig {
  strategy: FunctionExecutionStrategy;
  mode: ExecutionMode;
  priority: ExecutionPriority;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  maxConcurrency?: number;
  resourceLimits?: ResourceLimits;
}

/**
 * 资源限制
 */
export interface ResourceLimits {
  maxMemory?: number;
  maxCpu?: number;
  maxNetwork?: number;
  maxDisk?: number;
}

/**
 * 函数执行计划
 */
export interface FunctionExecutionPlan {
  id: string;
  functions: PlannedFunction[];
  config: FunctionExecutionConfig;
  dependencies: DependencyMap;
  estimatedDuration: number;
  estimatedResources: ResourceLimits;
}

/**
 * 计划函数
 */
export interface PlannedFunction {
  function: IWorkflowFunction;
  config: any;
  order: number;
  dependencies: string[];
  parallelGroup?: string;
  condition?: string;
}

/**
 * 依赖映射
 */
export interface DependencyMap {
  [functionId: string]: string[];
}

/**
 * 函数执行结果
 */
export interface FunctionExecutionResult {
  functionId: string;
  success: boolean;
  result: any;
  error?: Error;
  executionTime: number;
  resourceUsage: ResourceUsage;
  metadata: Record<string, any>;
}

/**
 * 资源使用情况
 */
export interface ResourceUsage {
  memory: number;
  cpu: number;
  network: number;
  disk: number;
}

/**
 * 执行策略接口
 */
export interface IFunctionExecutionStrategy {
  /**
   * 策略名称
   */
  readonly name: string;

  /**
   * 策略描述
   */
  readonly description: string;

  /**
   * 支持的函数类型
   */
  readonly supportedTypes: WorkflowFunctionType[];

  /**
   * 创建执行计划
   */
  createExecutionPlan(functions: IWorkflowFunction[], configs: any[]): FunctionExecutionPlan;

  /**
   * 验证执行计划
   */
  validateExecutionPlan(plan: FunctionExecutionPlan): boolean;

  /**
   * 执行函数
   */
  execute(plan: FunctionExecutionPlan, context: IExecutionContext): Promise<FunctionExecutionResult[]>;

  /**
   * 优化执行计划
   */
  optimizeExecutionPlan(plan: FunctionExecutionPlan): FunctionExecutionPlan;

  /**
   * 处理执行异常
   */
  handleExecutionError(error: Error, context: IExecutionContext): void;
}

/**
 * 顺序执行策略
 */
export class FunctionSequentialExecutionStrategy implements IFunctionExecutionStrategy {
  readonly name = 'sequential';
  readonly description = '按顺序执行函数，每个函数执行完成后再执行下一个';
  readonly supportedTypes = [WorkflowFunctionType.NODE, WorkflowFunctionType.CONDITION, WorkflowFunctionType.TRIGGER];

  createExecutionPlan(functions: IWorkflowFunction[], configs: any[]): FunctionExecutionPlan {
    const plannedFunctions: PlannedFunction[] = functions.map((func, index) => ({
      function: func,
      config: configs[index] || {},
      order: index,
      dependencies: index > 0 && functions[index - 1] ? [functions[index - 1]!.id] : []
    }));

    return {
      id: `sequential_${Date.now()}`,
      functions: plannedFunctions,
      config: {
        strategy: FunctionExecutionStrategy.SEQUENTIAL,
        mode: ExecutionMode.SYNC,
        priority: ExecutionPriority.NORMAL
      },
      dependencies: this.buildDependencyMap(plannedFunctions),
      estimatedDuration: this.estimateDuration(plannedFunctions),
      estimatedResources: this.estimateResources(plannedFunctions)
    };
  }

  validateExecutionPlan(plan: FunctionExecutionPlan): boolean {
    // 检查是否有循环依赖
    if (this.hasCyclicDependencies(plan.dependencies)) {
      return false;
    }

    // 检查执行顺序
    for (let i = 0; i < plan.functions.length; i++) {
      const func = plan.functions[i];
      if (func && func.order !== i) {
        return false;
      }
    }

    return true;
  }

  async execute(plan: FunctionExecutionPlan, context: IExecutionContext): Promise<FunctionExecutionResult[]> {
    const results: FunctionExecutionResult[] = [];
    const sortedFunctions = plan.functions.sort((a, b) => a.order - b.order);

    for (const plannedFunc of sortedFunctions) {
      const startTime = Date.now();
      
      try {
        const result = await this.executeFunction(plannedFunc.function, plannedFunc.config, context);
        const executionTime = Date.now() - startTime;

        results.push({
          functionId: plannedFunc.function.id,
          success: true,
          result,
          executionTime,
          resourceUsage: this.measureResourceUsage(),
          metadata: {}
        });
      } catch (error) {
        const executionTime = Date.now() - startTime;
        results.push({
          functionId: plannedFunc.function.id,
          success: false,
          result: null,
          error: error as Error,
          executionTime,
          resourceUsage: this.measureResourceUsage(),
          metadata: {}
        });
        break; // 顺序执行时遇到错误就停止
      }
    }

    return results;
  }

  optimizeExecutionPlan(plan: FunctionExecutionPlan): FunctionExecutionPlan {
    // 顺序执行策略的优化空间有限
    return plan;
  }

  handleExecutionError(error: Error, context: IExecutionContext): void {
    console.error('顺序执行策略执行错误:', error);
  }

  private buildDependencyMap(functions: PlannedFunction[]): DependencyMap {
    const map: DependencyMap = {};
    for (const func of functions) {
      map[func.function.id] = func.dependencies;
    }
    return map;
  }

  private estimateDuration(functions: PlannedFunction[]): number {
    // 简单估算：每个函数平均100ms
    return functions.length * 100;
  }

  private estimateResources(functions: PlannedFunction[]): ResourceLimits {
    return {
      maxMemory: functions.length * 10, // MB
      maxCpu: functions.length * 0.1,
      maxNetwork: functions.length * 1, // MB
      maxDisk: functions.length * 0.5 // MB
    };
  }

  private hasCyclicDependencies(dependencies: DependencyMap): boolean {
    // 简单的循环依赖检测
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const dep of dependencies[nodeId] || []) {
        if (hasCycle(dep)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Object.keys(dependencies)) {
      if (hasCycle(nodeId)) return true;
    }

    return false;
  }

  private async executeFunction(func: IWorkflowFunction, config: any, context: IExecutionContext): Promise<any> {
    // 根据函数类型执行不同的逻辑
    switch (func.type) {
      case WorkflowFunctionType.CONDITION:
        return await (func as IConditionFunction).evaluate(context, config);
      case WorkflowFunctionType.NODE:
        return await (func as INodeFunction).execute(context, config);
      case WorkflowFunctionType.TRIGGER:
        return await (func as ITriggerFunction).check(context, config);
      default:
        throw new Error(`不支持的函数类型: ${func.type}`);
    }
  }

  private measureResourceUsage(): ResourceUsage {
    // 简化的资源使用测量
    return {
      memory: Math.random() * 10,
      cpu: Math.random() * 0.1,
      network: Math.random() * 1,
      disk: Math.random() * 0.5
    };
  }
}

/**
 * 并行执行策略
 */
export class FunctionParallelExecutionStrategy implements IFunctionExecutionStrategy {
  readonly name = 'parallel';
  readonly description = '并行执行无依赖关系的函数';
  readonly supportedTypes = [WorkflowFunctionType.NODE, WorkflowFunctionType.CONDITION, WorkflowFunctionType.TRIGGER];

  createExecutionPlan(functions: IWorkflowFunction[], configs: any[]): FunctionExecutionPlan {
    const plannedFunctions: PlannedFunction[] = functions.map((func, index) => ({
      function: func,
      config: configs[index] || {},
      order: 0, // 并行执行时顺序不重要
      dependencies: [], // 并行执行时无依赖
      parallelGroup: 'default'
    }));

    return {
      id: `parallel_${Date.now()}`,
      functions: plannedFunctions,
      config: {
        strategy: FunctionExecutionStrategy.PARALLEL,
        mode: ExecutionMode.ASYNC,
        priority: ExecutionPriority.NORMAL,
        maxConcurrency: functions.length
      },
      dependencies: {},
      estimatedDuration: this.estimateDuration(plannedFunctions),
      estimatedResources: this.estimateResources(plannedFunctions)
    };
  }

  validateExecutionPlan(plan: FunctionExecutionPlan): boolean {
    // 检查是否有依赖关系（并行执行不应该有依赖）
    for (const func of plan.functions) {
      if (func.dependencies.length > 0) {
        return false;
      }
    }

    return true;
  }

  async execute(plan: FunctionExecutionPlan, context: IExecutionContext): Promise<FunctionExecutionResult[]> {
    const promises = plan.functions.map(async (plannedFunc) => {
      const startTime = Date.now();
      
      try {
        const result = await this.executeFunction(plannedFunc.function, plannedFunc.config, context);
        const executionTime = Date.now() - startTime;

        return {
          functionId: plannedFunc.function.id,
          success: true,
          result,
          executionTime,
          resourceUsage: this.measureResourceUsage(),
          metadata: {}
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;
        return {
          functionId: plannedFunc.function.id,
          success: false,
          result: null,
          error: error as Error,
          executionTime,
          resourceUsage: this.measureResourceUsage(),
          metadata: {}
        };
      }
    });

    return await Promise.all(promises);
  }

  optimizeExecutionPlan(plan: FunctionExecutionPlan): FunctionExecutionPlan {
    // 并行执行策略的优化
    const optimizedConfig = { ...plan.config };
    
    // 根据函数数量调整并发数
    if (plan.functions.length > 10) {
      optimizedConfig.maxConcurrency = Math.min(plan.functions.length, 10);
    }

    return {
      ...plan,
      config: optimizedConfig
    };
  }

  handleExecutionError(error: Error, context: IExecutionContext): void {
    console.error('并行执行策略执行错误:', error);
  }

  private estimateDuration(functions: PlannedFunction[]): number {
    // 并行执行时间取决于最慢的函数
    return 100; // 假设平均100ms
  }

  private estimateResources(functions: PlannedFunction[]): ResourceLimits {
    return {
      maxMemory: functions.length * 10, // 并行执行需要更多内存
      maxCpu: functions.length * 0.1, // 并行执行需要更多CPU
      maxNetwork: functions.length * 1,
      maxDisk: functions.length * 0.5
    };
  }

  private async executeFunction(func: IWorkflowFunction, config: any, context: IExecutionContext): Promise<any> {
    switch (func.type) {
      case WorkflowFunctionType.CONDITION:
        return await (func as IConditionFunction).evaluate(context, config);
      case WorkflowFunctionType.NODE:
        return await (func as INodeFunction).execute(context, config);
      case WorkflowFunctionType.TRIGGER:
        return await (func as ITriggerFunction).check(context, config);
      default:
        throw new Error(`不支持的函数类型: ${func.type}`);
    }
  }

  private measureResourceUsage(): ResourceUsage {
    return {
      memory: Math.random() * 10,
      cpu: Math.random() * 0.1,
      network: Math.random() * 1,
      disk: Math.random() * 0.5
    };
  }
}

/**
 * 条件执行策略
 */
export class FunctionConditionalExecutionStrategy implements IFunctionExecutionStrategy {
  readonly name = 'conditional';
  readonly description = '根据条件执行不同的函数分支';
  readonly supportedTypes = [WorkflowFunctionType.CONDITION, WorkflowFunctionType.ROUTING, WorkflowFunctionType.NODE];

  createExecutionPlan(functions: IWorkflowFunction[], configs: any[]): FunctionExecutionPlan {
    const plannedFunctions: PlannedFunction[] = functions.map((func, index) => ({
      function: func,
      config: configs[index] || {},
      order: index,
      dependencies: index > 0 && functions[index - 1] ? [functions[index - 1]!.id] : [],
      condition: func.type === WorkflowFunctionType.CONDITION ? `condition_${index}` : undefined
    }));

    return {
      id: `conditional_${Date.now()}`,
      functions: plannedFunctions,
      config: {
        strategy: FunctionExecutionStrategy.CONDITIONAL,
        mode: ExecutionMode.ASYNC,
        priority: ExecutionPriority.NORMAL
      },
      dependencies: this.buildDependencyMap(plannedFunctions),
      estimatedDuration: this.estimateDuration(plannedFunctions),
      estimatedResources: this.estimateResources(plannedFunctions)
    };
  }

  validateExecutionPlan(plan: FunctionExecutionPlan): boolean {
    // 检查是否有条件函数
    const hasCondition = plan.functions.some(f => f.function.type === WorkflowFunctionType.CONDITION);
    if (!hasCondition) {
      return false;
    }

    return true;
  }

  async execute(plan: FunctionExecutionPlan, context: IExecutionContext): Promise<FunctionExecutionResult[]> {
    const results: FunctionExecutionResult[] = [];
    
    for (const plannedFunc of plan.functions) {
      const startTime = Date.now();
      
      try {
        // 如果是条件函数，根据结果决定是否继续
        if (plannedFunc.function.type === WorkflowFunctionType.CONDITION) {
          const conditionResult = await (plannedFunc.function as IConditionFunction).evaluate(context, plannedFunc.config);
          
          results.push({
            functionId: plannedFunc.function.id,
            success: true,
            result: conditionResult,
            executionTime: Date.now() - startTime,
            resourceUsage: this.measureResourceUsage(),
            metadata: { conditionResult }
          });

          // 如果条件为false，跳过后续函数
          if (!conditionResult) {
            break;
          }
        } else {
          const result = await this.executeFunction(plannedFunc.function, plannedFunc.config, context);
          results.push({
            functionId: plannedFunc.function.id,
            success: true,
            result,
            executionTime: Date.now() - startTime,
            resourceUsage: this.measureResourceUsage(),
            metadata: {}
          });
        }
      } catch (error) {
        results.push({
          functionId: plannedFunc.function.id,
          success: false,
          result: null,
          error: error as Error,
          executionTime: Date.now() - startTime,
          resourceUsage: this.measureResourceUsage(),
          metadata: {}
        });
        break;
      }
    }

    return results;
  }

  optimizeExecutionPlan(plan: FunctionExecutionPlan): FunctionExecutionPlan {
    return plan;
  }

  handleExecutionError(error: Error, context: IExecutionContext): void {
    console.error('条件执行策略执行错误:', error);
  }

  private buildDependencyMap(functions: PlannedFunction[]): DependencyMap {
    const map: DependencyMap = {};
    for (const func of functions) {
      map[func.function.id] = func.dependencies;
    }
    return map;
  }

  private estimateDuration(functions: PlannedFunction[]): number {
    return functions.length * 100;
  }

  private estimateResources(functions: PlannedFunction[]): ResourceLimits {
    return {
      maxMemory: functions.length * 10,
      maxCpu: functions.length * 0.1,
      maxNetwork: functions.length * 1,
      maxDisk: functions.length * 0.5
    };
  }

  private async executeFunction(func: IWorkflowFunction, config: any, context: IExecutionContext): Promise<any> {
    switch (func.type) {
      case WorkflowFunctionType.NODE:
        return await (func as INodeFunction).execute(context, config);
      case WorkflowFunctionType.ROUTING:
        return await (func as IRoutingFunction).route(context, config);
      default:
        throw new Error(`不支持的函数类型: ${func.type}`);
    }
  }

  private measureResourceUsage(): ResourceUsage {
    return {
      memory: Math.random() * 10,
      cpu: Math.random() * 0.1,
      network: Math.random() * 1,
      disk: Math.random() * 0.5
    };
  }
}