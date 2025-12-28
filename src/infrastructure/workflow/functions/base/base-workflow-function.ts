import { WorkflowFunctionType } from '../../../../domain/workflow/value-objects/workflow-function-type';

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
  type: WorkflowFunctionType;
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
  type: WorkflowFunctionType;
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

/**
 * 工作流函数基础抽象类
 * 使用类型安全的execute方法
 */
export abstract class BaseWorkflowFunction implements IWorkflowFunction {
  protected _initialized: boolean = false;
  public readonly metadata?: Record<string, any>;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string,
    public readonly type: WorkflowFunctionType,
    public readonly isAsync: boolean,
    public readonly category: string = 'builtin',
    metadata?: Record<string, any>
  ) {
    this.metadata = metadata;
  }

  getParameters(): FunctionParameter[] {
    return [
      {
        name: 'context',
        type: 'WorkflowExecutionContext',
        required: true,
        description: '执行上下文'
      },
      {
        name: 'config',
        type: 'any',
        required: false,
        description: '函数配置',
        defaultValue: {}
      }
    ];
  }

  getReturnType(): string {
    switch (this.type) {
      case WorkflowFunctionType.CONDITION:
      case WorkflowFunctionType.TRIGGER:
        return 'boolean';
      case WorkflowFunctionType.ROUTING:
        return 'boolean';
      case WorkflowFunctionType.NODE:
        return 'NodeFunctionResult';
      default:
        return 'any';
    }
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    if (config && typeof config !== 'object') {
      errors.push('配置必须是对象类型');
    }

    // 子类可以重写此方法进行特定验证
    const customErrors = this.validateCustomConfig(config);
    errors.push(...customErrors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getMetadata(): FunctionMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      type: this.type,
      isAsync: this.isAsync,
      category: this.category,
      parameters: this.getParameters(),
      returnType: this.getReturnType()
    };
  }

  /**
   * 子类可以重写此方法进行自定义配置验证
   */
  protected validateCustomConfig(config: any): string[] {
    return [];
  }

  /**
   * 初始化函数
   */
  initialize(config?: any): boolean {
    this._initialized = true;
    return true;
  }

  /**
   * 清理函数资源
   */
  cleanup(): boolean {
    this._initialized = false;
    return true;
  }

  /**
   * 检查函数是否已初始化
   */
  protected checkInitialized(): void {
    if (!this._initialized) {
      throw new Error(`函数 ${this.name} 尚未初始化`);
    }
  }

  /**
   * 执行函数（抽象方法，子类必须实现）
   * 使用类型安全的参数
   */
  abstract execute(context: WorkflowExecutionContext, config: any): Promise<any>;

  /**
   * 验证参数
   */
  validateParameters(...args: any[]): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }
}

/**
 * 节点函数基类
 * 专门用于节点类型的函数，返回NodeFunctionResult
 */
export abstract class BaseNodeFunction<TConfig extends NodeFunctionConfig = NodeFunctionConfig>
  extends BaseWorkflowFunction {

  constructor(
    id: string,
    name: string,
    description: string,
    version: string = '1.0.0',
    category: string = 'builtin'
  ) {
    super(
      id,
      name,
      description,
      version,
      WorkflowFunctionType.NODE,
      true,
      category
    );
  }

  override getReturnType(): string {
    return 'NodeFunctionResult';
  }

  /**
   * 类型安全的执行方法
   */
  abstract override execute(context: WorkflowExecutionContext, config: TConfig): Promise<NodeFunctionResult>;
}

/**
 * 条件函数基类
 * 专门用于条件类型的函数，返回boolean
 */
export abstract class BaseConditionFunction<TConfig extends ConditionFunctionConfig = ConditionFunctionConfig>
  extends BaseWorkflowFunction {

  constructor(
    id: string,
    name: string,
    description: string,
    version: string = '1.0.0',
    category: string = 'builtin'
  ) {
    super(
      id,
      name,
      description,
      version,
      WorkflowFunctionType.CONDITION,
      true,
      category
    );
  }

  override getReturnType(): string {
    return 'boolean';
  }

  /**
   * 类型安全的执行方法
   */
  abstract override execute(context: WorkflowExecutionContext, config: TConfig): Promise<boolean>;
}

/**
 * 路由函数基类
 * 专门用于路由类型的函数，返回boolean
 */
export abstract class BaseRoutingFunction<TConfig extends RoutingFunctionConfig = RoutingFunctionConfig>
  extends BaseWorkflowFunction {

  constructor(
    id: string,
    name: string,
    description: string,
    version: string = '1.0.0',
    category: string = 'builtin'
  ) {
    super(
      id,
      name,
      description,
      version,
      WorkflowFunctionType.ROUTING,
      true,
      category
    );
  }

  override getReturnType(): string {
    return 'boolean';
  }

  /**
   * 类型安全的执行方法
   */
  abstract override execute(context: WorkflowExecutionContext, config: TConfig): Promise<boolean>;
}

/**
 * 触发器函数基类
 * 专门用于触发器类型的函数，返回boolean
 */
export abstract class BaseTriggerFunction<TConfig extends TriggerFunctionConfig = TriggerFunctionConfig>
  extends BaseWorkflowFunction {

  constructor(
    id: string,
    name: string,
    description: string,
    version: string = '1.0.0',
    category: string = 'builtin'
  ) {
    super(
      id,
      name,
      description,
      version,
      WorkflowFunctionType.TRIGGER,
      true,
      category
    );
  }

  override getReturnType(): string {
    return 'boolean';
  }

  /**
   * 类型安全的执行方法
   */
  abstract override execute(context: WorkflowExecutionContext, config: TConfig): Promise<boolean>;
}

/**
 * 钩子函数基类
 * 专门用于钩子类型的函数，返回NodeFunctionResult
 */
export abstract class BaseHookFunction<TConfig extends NodeFunctionConfig = NodeFunctionConfig>
  extends BaseWorkflowFunction {

  constructor(
    id: string,
    name: string,
    description: string,
    version: string = '1.0.0',
    category: string = 'builtin'
  ) {
    super(
      id,
      name,
      description,
      version,
      WorkflowFunctionType.HOOK,
      true,
      category
    );
  }

  override getReturnType(): string {
    return 'NodeFunctionResult';
  }

  /**
   * 类型安全的执行方法
   */
  abstract override execute(context: WorkflowExecutionContext, config: TConfig): Promise<NodeFunctionResult>;
}