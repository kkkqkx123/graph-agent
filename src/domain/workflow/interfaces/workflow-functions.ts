/**
 * 工作流函数接口定义
 */

/**
 * 工作流函数类型枚举
 */
export enum WorkflowFunctionType {
  NODE = 'node',
  CONDITION = 'condition',
  ROUTING = 'routing',
  TRIGGER = 'trigger',
  TRANSFORM = 'transform'
}

/**
 * 函数参数定义
 */
export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
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
  category?: string;
  parameters: FunctionParameter[];
  returnType: string;
}

/**
 * 工作流函数基础接口
 */
export interface IWorkflowFunction {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly type: WorkflowFunctionType;
  readonly isAsync: boolean;
  
  getParameters(): FunctionParameter[];
  getReturnType(): string;
  validateConfig(config: any): ValidationResult;
  getMetadata(): FunctionMetadata;
  initialize(config?: any): boolean;
  cleanup(): boolean;
}

/**
 * 条件函数接口
 */
export interface IConditionFunction extends IWorkflowFunction {
  evaluate(context: any, config: any): Promise<boolean>;
}

/**
 * 节点执行函数接口
 */
export interface INodeFunction extends IWorkflowFunction {
  execute(context: any, config: any): Promise<any>;
}

/**
 * 路由函数接口
 */
export interface IRoutingFunction extends IWorkflowFunction {
  route(context: any, config: any): Promise<string | string[]>;
}

/**
 * 触发器函数接口
 */
export interface ITriggerFunction extends IWorkflowFunction {
  check(context: any, config: any): Promise<boolean>;
}

/**
 * 函数工厂接口
 */
export interface IWorkflowFunctionFactory {
  createFunction(functionId: string, config?: any): IWorkflowFunction;
  createConditionFunction(name: string, config?: any): IConditionFunction;
  createNodeFunction(name: string, config?: any): INodeFunction;
  createRoutingFunction(name: string, config?: any): IRoutingFunction;
  createTriggerFunction(name: string, config?: any): ITriggerFunction;
}

/**
 * 函数加载器接口
 */
export interface IWorkflowFunctionLoader {
  loadFunctions(type?: WorkflowFunctionType): Promise<IWorkflowFunction[]>;
  loadFunctionById(functionId: string): Promise<IWorkflowFunction | null>;
  loadFunctionByName(name: string): Promise<IWorkflowFunction | null>;
}

/**
 * 函数集合接口
 */
export interface IWorkflowFunctionCollection {
  getConditionFunctions(): IConditionFunction[];
  getNodeFunctions(): INodeFunction[];
  getRoutingFunctions(): IRoutingFunction[];
  getTriggerFunctions(): ITriggerFunction[];
  getFunctionByName(name: string): IWorkflowFunction | null;
}
