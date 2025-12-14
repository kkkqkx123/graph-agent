import { IExecutionContext } from '../../graph/interfaces/execution-context.interface';

/**
 * 工作流函数基础接口
 * 
 * 定义了所有工作流函数的通用契约
 */
export interface IWorkflowFunction {
  /**
   * 函数唯一标识符
   */
  readonly id: string;

  /**
   * 函数名称
   */
  readonly name: string;

  /**
   * 函数描述
   */
  readonly description: string;

  /**
   * 函数版本
   */
  readonly version: string;

  /**
   * 函数类型
   */
  readonly type: WorkflowFunctionType;

  /**
   * 是否为异步函数
   */
  readonly isAsync: boolean;

  /**
   * 获取函数参数定义
   */
  getParameters(): FunctionParameter[];

  /**
   * 获取返回类型
   */
  getReturnType(): string;

  /**
   * 验证函数配置
   */
  validateConfig(config: any): ValidationResult;

  /**
   * 获取函数元数据
   */
  getMetadata(): FunctionMetadata;
}

/**
 * 工作流函数类型枚举
 */
export enum WorkflowFunctionType {
  CONDITION = 'condition',
  NODE = 'node',
  ROUTING = 'routing',
  TRIGGER = 'trigger'
}

/**
 * 函数参数定义
 */
export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 函数元数据
 */
export interface FunctionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  type: WorkflowFunctionType;
  isAsync: boolean;
  category: string;
  parameters: FunctionParameter[];
  returnType: string;
}