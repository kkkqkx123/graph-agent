import { Graph } from '../entities/graph';
import { CompiledGraph, GraphCompilationConfig } from './graph-execution-engine';

/**
 * 编译配置
 */
export interface CompilationConfig extends GraphCompilationConfig {
  optimize?: boolean;
  validateOnly?: boolean;
  targetPlatform?: 'default' | 'optimized' | 'debug';
}

/**
 * 验证结果
 */
export interface GraphCompilerValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'critical';
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

/**
 * 优化选项
 */
export interface OptimizationOptions {
  enableNodeMerging?: boolean;
  enableEdgePruning?: boolean;
  enablePathOptimization?: boolean;
  maxOptimizationTime?: number;
}

/**
 * 编译统计信息
 */
export interface CompilationStats {
  nodeCount: number;
  edgeCount: number;
  compilationTime: number;
  optimizationTime: number;
  validationTime: number;
  memoryUsage: number;
}

/**
 * 图编译器接口
 * 
 * 负责将图结构编译为可执行的形式，包括验证、优化和代码生成
 */
export interface IGraphCompiler {
  /**
   * 编译图结构
   * 
   * @param graph 要编译的图
   * @param config 编译配置
   * @returns 编译后的图
   */
  compile(graph: Graph, config?: CompilationConfig): Promise<CompiledGraph>;

  /**
   * 验证图结构
   *
   * @param graph 要验证的图
   * @returns 验证结果
   */
  validate(graph: Graph): Promise<GraphCompilerValidationResult>;

  /**
   * 优化图结构
   * 
   * @param graph 要优化的图
   * @param options 优化选项
   * @returns 优化后的图
   */
  optimize(graph: Graph, options?: OptimizationOptions): Promise<Graph>;

  /**
   * 生成执行计划
   * 
   * @param graph 图结构
   * @returns 执行计划
   */
  generateExecutionPlan(graph: Graph): Promise<ExecutionPlan>;

  /**
   * 获取编译统计信息
   * 
   * @returns 编译统计信息
   */
  getCompilationStats(): CompilationStats;

  /**
   * 重置编译器状态
   */
  reset(): void;

  /**
   * 设置编译选项
   * 
   * @param options 编译选项
   */
  setCompilationOptions(options: CompilationConfig): void;
}

/**
 * 执行计划
 */
export interface ExecutionPlan {
  graphId: string;
  steps: ExecutionStep[];
  dependencies: Map<string, string[]>;
  estimatedTime: number;
  parallelizableSteps: string[];
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  stepId: string;
  nodeId: string;
  type: 'sequential' | 'parallel' | 'conditional';
  dependencies: string[];
  estimatedDuration: number;
  retryPolicy?: GraphCompilerRetryPolicy;
}

/**
 * 重试策略
 */
export interface GraphCompilerRetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}