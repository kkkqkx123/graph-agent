/**
 * 工作流函数领域服务接口
 * 定义函数编排和管理的领域规则
 */

import {
  IWorkflowFunction,
  IConditionFunction,
  INodeFunction,
  IRoutingFunction,
  ITriggerFunction,
  WorkflowFunctionType,
  ValidationResult
} from '../interfaces/workflow-functions';
import { IExecutionContext } from '../execution/execution-context.interface';
import {
  FunctionExecutionStrategy as ExecutionStrategy,
  FunctionExecutionPlan as StrategyExecutionPlan,
  FunctionExecutionResult as StrategyExecutionResult
} from '../strategies/function-execution-strategies';

/**
 * 函数执行计划
 */
export interface FunctionExecutionPlan {
  function: IWorkflowFunction;
  config: any;
  dependencies: string[];
  executionOrder: number;
}

/**
 * 函数依赖关系
 */
export interface FunctionDependency {
  functionId: string;
  dependsOn: string[];
  dependencyType: 'data' | 'control' | 'resource';
}

/**
 * 函数执行上下文
 */
export interface FunctionExecutionContext extends IExecutionContext {
  functionId: string;
  functionType: WorkflowFunctionType;
  executionStrategy: ExecutionStrategy;
  parentContext?: IExecutionContext;
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
  metadata: Record<string, any>;
}

/**
 * 工作流函数领域服务接口
 */
export interface IWorkflowFunctionDomainService {
  /**
   * 验证函数执行序列的有效性
   */
  validateFunctionSequence(functions: IWorkflowFunction[]): ValidationResult;

  /**
   * 解析函数依赖关系
   */
  resolveFunctionDependencies(workflowFunction: IWorkflowFunction): FunctionDependency[];

  /**
   * 确定函数执行策略
   */
  determineExecutionStrategy(functions: IWorkflowFunction[]): ExecutionStrategy;

  /**
   * 创建函数执行计划
   */
  createExecutionPlan(functions: IWorkflowFunction[], configs: any[]): FunctionExecutionPlan[];

  /**
   * 验证函数配置的领域规则
   */
  validateFunctionConfiguration(workflowFunction: IWorkflowFunction, config: any): ValidationResult;

  /**
   * 检查函数兼容性
   */
  checkFunctionCompatibility(function1: IWorkflowFunction, function2: IWorkflowFunction): boolean;

  /**
   * 计算函数执行顺序
   */
  calculateExecutionOrder(functions: IWorkflowFunction[]): number[];

  /**
   * 验证函数执行上下文
   */
  validateExecutionContext(context: FunctionExecutionContext): ValidationResult;

  /**
   * 处理函数执行结果
   */
  processExecutionResult(result: FunctionExecutionResult): void;
}

/**
 * 函数验证领域服务接口
 */
export interface IFunctionValidationDomainService {
  /**
   * 验证函数配置的领域规则
   */
  validateFunctionConfiguration(workflowFunction: IWorkflowFunction, config: any): ValidationResult;

  /**
   * 检查函数兼容性
   */
  checkFunctionCompatibility(function1: IWorkflowFunction, function2: IWorkflowFunction): boolean;

  /**
   * 验证函数参数类型
   */
  validateParameterTypes(workflowFunction: IWorkflowFunction, parameters: any[]): ValidationResult;

  /**
   * 验证函数返回值类型
   */
  validateReturnType(workflowFunction: IWorkflowFunction, returnValue: any): ValidationResult;

  /**
   * 验证函数资源需求
   */
  validateResourceRequirements(workflowFunction: IWorkflowFunction, availableResources: any): ValidationResult;

  /**
   * 验证函数安全约束
   */
  validateSecurityConstraints(workflowFunction: IWorkflowFunction, context: IExecutionContext): ValidationResult;
}

/**
 * 函数执行策略领域服务接口
 */
export interface IFunctionExecutionStrategyService {
  /**
   * 确定函数执行策略
   */
  determineExecutionStrategy(functions: IWorkflowFunction[]): ExecutionStrategy;

  /**
   * 创建执行策略配置
   */
  createStrategyConfiguration(strategy: ExecutionStrategy, functions: IWorkflowFunction[]): any;

  /**
   * 验证执行策略的有效性
   */
  validateExecutionStrategy(strategy: ExecutionStrategy, functions: IWorkflowFunction[]): ValidationResult;

  /**
   * 优化执行策略
   */
  optimizeExecutionStrategy(strategy: ExecutionStrategy, functions: IWorkflowFunction[]): ExecutionStrategy;

  /**
   * 处理执行策略异常
   */
  handleStrategyException(strategy: ExecutionStrategy, error: Error): void;
}