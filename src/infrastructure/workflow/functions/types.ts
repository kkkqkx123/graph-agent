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
 * 工作流执行上下文接口
 * 提供统一的上下文访问方式
 */
export interface WorkflowExecutionContext {
  /**
   * 获取变量
   */
  getVariable(key: string): any;

  /**
   * 设置变量
   */
  setVariable(key: string, value: any): void;

  /**
   * 获取执行ID
   */
  getExecutionId(): string;

  /**
   * 获取工作流ID
   */
  getWorkflowId(): string;

  /**
   * 获取节点结果
   */
  getNodeResult(nodeId: string): any;

  /**
   * 设置节点结果
   */
  setNodeResult(nodeId: string, result: any): void;
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
  initialize(config?: any): boolean;
  cleanup(): boolean;
  execute(context: WorkflowExecutionContext, config: any): Promise<any>;
  validateParameters(...args: any[]): { isValid: boolean; errors: string[] };
}