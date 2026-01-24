/**
 * 工作流函数类型枚举
 * 从领域层重新导出，保持单一数据源
 */
export { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/function-type';

/**
 * 工作流执行上下文接口
 * 从领域层重新导出，保持单一数据源
 */
export type { WorkflowExecutionContext } from '../../../../domain/workflow/entities/node';

// 导入WorkflowExecutionContext类型供内部使用
import type { WorkflowExecutionContext } from '../../../../domain/workflow/entities/node';

/**
 * 函数参数接口
 */
export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 函数元数据接口
 */
export interface FunctionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  isAsync: boolean;
  category: string;
  parameters: FunctionParameter[];
  returnType: string;
}

/**
 * 节点函数配置接口
 */
export interface NodeFunctionConfig {
  [key: string]: any;
}

/**
 * 节点函数执行结果接口
 */
export interface NodeFunctionResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 条件函数配置接口
 */
export interface ConditionFunctionConfig {
  [key: string]: any;
}

/**
 * 路由函数配置接口
 */
export interface RoutingFunctionConfig {
  edge?: {
    fromNodeId?: string;
    toNodeId?: string;
    properties?: Record<string, any>;
  };
  nodeStates?: Map<string, any>;
  [key: string]: any;
}

/**
 * 触发器函数配置接口
 */
export interface TriggerFunctionConfig {
  [key: string]: any;
}

/**
 * 工作流函数接口
 */
export interface IWorkflowFunction {
  id: string;
  name: string;
  description?: string;
  version: string;
  getParameters(): FunctionParameter[];
  getReturnType(): string;
  validateConfig(config: any): ValidationResult;
  getMetadata(): FunctionMetadata;
  execute(context: WorkflowExecutionContext, config: any): Promise<any>;
  validateParameters(...args: any[]): { isValid: boolean; errors: string[] };
}
