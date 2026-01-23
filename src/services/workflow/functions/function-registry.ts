import { injectable } from 'inversify';
import { IWorkflowFunction } from './types';
import { WorkflowFunctionType } from '../../../domain/workflow/value-objects/function-type';

/**
 * 函数类型映射接口
 * 为每种函数类型提供类型安全的访问
 */
export interface TypedFunctionRegistry {
  condition: Map<string, IWorkflowFunction>;
  routing: Map<string, IWorkflowFunction>;
  trigger: Map<string, IWorkflowFunction>;
  hook: Map<string, IWorkflowFunction>;
  contextProcessor: Map<string, IWorkflowFunction>;
}

/**
 * 函数工厂接口
 * 用于创建动态配置的函数实例
 */
export interface FunctionFactory {
  create(config?: Record<string, any>): IWorkflowFunction;
}

/**
 * 函数注册表实现
 * 支持分层函数类型：CONDITION、ROUTING、TRIGGER、HOOK等。见doamin层的定义。
 * 提供类型安全的函数注册和获取方法
 *
 * 支持两种注册模式：
 * 1. 单例模式：注册预实例化的函数（静态函数）
 * 2. 工厂模式：注册函数工厂，支持动态配置（动态函数）
 */
@injectable()
export class FunctionRegistry {
  // 单例函数（静态函数）
  private singletonFunctions: Map<string, IWorkflowFunction> = new Map();
  private singletonFunctionsByName: Map<string, IWorkflowFunction> = new Map();

  // 动态函数工厂（动态函数）
  private functionFactories: Map<string, FunctionFactory> = new Map();

  // 类型化映射（保持向后兼容）
  private functions: Map<string, IWorkflowFunction> = new Map();
  private functionsByName: Map<string, IWorkflowFunction> = new Map();
  private typedFunctions: TypedFunctionRegistry = {
    condition: new Map(),
    routing: new Map(),
    trigger: new Map(),
    hook: new Map(),
    contextProcessor: new Map(),
  };

  constructor() {}

  /**
   * 注册单例函数（静态函数）
   * 适用于逻辑完全固定、无需配置的函数
   * @param func 工作流函数
   */
  registerSingleton(func: IWorkflowFunction): void {
    if (this.singletonFunctions.has(func.id)) {
      throw new Error(`单例函数ID ${func.id} 已存在`);
    }

    if (this.singletonFunctionsByName.has(func.name)) {
      throw new Error(`单例函数名称 ${func.name} 已存在`);
    }

    // 验证函数类型
    const functionType = this.extractFunctionType(func.id);
    if (!functionType) {
      throw new Error(`无法从函数ID ${func.id} 提取函数类型`);
    }

    // 注册到类型化映射
    this.registerTypedFunction(functionType, func);

    this.singletonFunctions.set(func.id, func);
    this.singletonFunctionsByName.set(func.name, func);

    // 同时注册到旧的映射以保持向后兼容
    this.functions.set(func.id, func);
    this.functionsByName.set(func.name, func);
  }

  /**
   * 注册函数工厂（动态函数）
   * 适用于需要从配置文件加载参数的函数
   * @param type 函数类型ID
   * @param factory 函数工厂
   */
  registerFactory(type: string, factory: FunctionFactory): void {
    if (this.functionFactories.has(type)) {
      throw new Error(`函数工厂 ${type} 已存在`);
    }
    this.functionFactories.set(type, factory);
  }

  /**
   * 注册函数（向后兼容）
   * @param func 工作流函数
   */
  registerFunction(func: IWorkflowFunction): void {
    // 默认作为单例函数注册
    this.registerSingleton(func);
  }

  /**
   * 从函数ID提取函数类型
   * @param id 函数ID
   * @returns 函数类型
   */
  private extractFunctionType(id: string): WorkflowFunctionType | null {
    if (id.startsWith('condition:')) {
      return WorkflowFunctionType.CONDITION;
    } else if (id.startsWith('route:')) {
      return WorkflowFunctionType.ROUTING;
    } else if (id.startsWith('trigger:')) {
      return WorkflowFunctionType.TRIGGER;
    } else if (id.startsWith('hook:')) {
      return WorkflowFunctionType.HOOK;
    } else if (id.startsWith('context:')) {
      return WorkflowFunctionType.CONTEXT_PROCESSOR;
    }
    return null;
  }

  /**
   * 注册类型化函数
   * @param type 函数类型
   * @param func 工作流函数
   */
  private registerTypedFunction(type: WorkflowFunctionType, func: IWorkflowFunction): void {
    switch (type) {
      case WorkflowFunctionType.CONDITION:
        this.typedFunctions.condition.set(func.id, func);
        break;
      case WorkflowFunctionType.ROUTING:
        this.typedFunctions.routing.set(func.id, func);
        break;
      case WorkflowFunctionType.TRIGGER:
        this.typedFunctions.trigger.set(func.id, func);
        break;
      case WorkflowFunctionType.HOOK:
        this.typedFunctions.hook.set(func.id, func);
        break;
      case WorkflowFunctionType.CONTEXT_PROCESSOR:
        this.typedFunctions.contextProcessor.set(func.id, func);
        break;
    }
  }

  /**
   * 获取函数（统一接口）
   * @param id 函数ID
   * @param config 运行时配置（仅动态函数需要）
   * @returns 工作流函数
   */
  getFunction(id: string, config?: Record<string, any>): IWorkflowFunction | null {
    // 1. 先查找单例函数
    if (this.singletonFunctions.has(id)) {
      return this.singletonFunctions.get(id)!;
    }

    // 2. 通过工厂创建动态函数
    const factory = this.functionFactories.get(id);
    if (factory) {
      const func = factory.create(config);
      return func;
    }

    // 3. 查找旧的映射（向后兼容）
    return this.functions.get(id) || null;
  }

  /**
   * 根据名称获取函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getFunctionByName(name: string): IWorkflowFunction | null {
    // 1. 先查找单例函数
    if (this.singletonFunctionsByName.has(name)) {
      return this.singletonFunctionsByName.get(name)!;
    }

    // 2. 查找旧的映射（向后兼容）
    return this.functionsByName.get(name) || null;
  }

  /**
   * 获取所有函数
   * @returns 工作流函数列表
   */
  getAllFunctions(): IWorkflowFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * 检查函数是否存在
   * @param id 函数ID
   * @returns 是否存在
   */
  hasFunction(id: string): boolean {
    return this.singletonFunctions.has(id) || this.functionFactories.has(id) || this.functions.has(id);
  }

  /**
   * 获取所有函数ID
   * @returns 函数ID列表
   */
  getAllFunctionIds(): string[] {
    return [
      ...Array.from(this.singletonFunctions.keys()),
      ...Array.from(this.functionFactories.keys()),
      ...Array.from(this.functions.keys())
    ];
  }

  /**
   * 注销函数
   * @param id 函数ID
   * @returns 是否成功
   */
  unregisterFunction(id: string): boolean {
    const func = this.functions.get(id);
    if (!func) {
      return false;
    }

    // 从类型化映射中移除
    const functionType = this.extractFunctionType(id);
    if (functionType) {
      this.unregisterTypedFunction(functionType, id);
    }

    this.functions.delete(id);
    this.functionsByName.delete(func.name);
    return true;
  }

  /**
   * 注销类型化函数
   * @param type 函数类型
   * @param id 函数ID
   */
  private unregisterTypedFunction(type: WorkflowFunctionType, id: string): void {
    switch (type) {
      case WorkflowFunctionType.CONDITION:
        this.typedFunctions.condition.delete(id);
        break;
      case WorkflowFunctionType.ROUTING:
        this.typedFunctions.routing.delete(id);
        break;
      case WorkflowFunctionType.TRIGGER:
        this.typedFunctions.trigger.delete(id);
        break;
      case WorkflowFunctionType.HOOK:
        this.typedFunctions.hook.delete(id);
        break;
      case WorkflowFunctionType.CONTEXT_PROCESSOR:
        this.typedFunctions.contextProcessor.delete(id);
        break;
    }
  }

  // 类型安全的便捷方法
  /**
   * 获取条件函数（类型安全）
   * @param name 函数名称或ID
   * @returns 条件函数
   */
  getConditionFunction(name: string): IWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (!func) return null;

    // 验证函数类型
    const functionType = this.extractFunctionType(func.id);
    if (functionType !== WorkflowFunctionType.CONDITION) {
      console.warn(`函数 ${name} 不是条件函数，实际类型: ${functionType}`);
    }

    return func;
  }

  /**
   * 获取所有条件函数
   * @returns 条件函数列表
   */
  getAllConditionFunctions(): IWorkflowFunction[] {
    return Array.from(this.typedFunctions.condition.values());
  }

  /**
   * 获取路由函数（类型安全）
   * @param name 函数名称或ID
   * @returns 路由函数
   */
  getRoutingFunction(name: string): IWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (!func) return null;

    // 验证函数类型
    const functionType = this.extractFunctionType(func.id);
    if (functionType !== WorkflowFunctionType.ROUTING) {
      console.warn(`函数 ${name} 不是路由函数，实际类型: ${functionType}`);
    }

    return func;
  }

  /**
   * 获取所有路由函数
   * @returns 路由函数列表
   */
  getAllRoutingFunctions(): IWorkflowFunction[] {
    return Array.from(this.typedFunctions.routing.values());
  }

  /**
   * 获取触发器函数（类型安全）
   * @param name 函数名称或ID
   * @returns 触发器函数
   */
  getTriggerFunction(name: string): IWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (!func) return null;

    // 验证函数类型
    const functionType = this.extractFunctionType(func.id);
    if (functionType !== WorkflowFunctionType.TRIGGER) {
      console.warn(`函数 ${name} 不是触发器函数，实际类型: ${functionType}`);
    }

    return func;
  }

  /**
   * 获取所有触发器函数
   * @returns 触发器函数列表
   */
  getAllTriggerFunctions(): IWorkflowFunction[] {
    return Array.from(this.typedFunctions.trigger.values());
  }

  /**
   * 获取钩子函数（类型安全）
   * @param name 函数名称或ID
   * @returns 钩子函数
   */
  getHookFunction(name: string): IWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (!func) return null;

    // 验证函数类型
    const functionType = this.extractFunctionType(func.id);
    if (functionType !== WorkflowFunctionType.HOOK) {
      console.warn(`函数 ${name} 不是钩子函数，实际类型: ${functionType}`);
    }

    return func;
  }

  /**
   * 获取所有钩子函数
   * @returns 钩子函数列表
   */
  getAllHookFunctions(): IWorkflowFunction[] {
    return Array.from(this.typedFunctions.hook.values());
  }

  /**
   * 获取上下文处理器函数（类型安全）
   * @param name 函数名称或ID
   * @returns 上下文处理器函数
   */
  getContextProcessorFunction(name: string): IWorkflowFunction | null {
    const func = this.getFunctionByName(name);
    if (!func) return null;

    // 验证函数类型
    const functionType = this.extractFunctionType(func.id);
    if (functionType !== WorkflowFunctionType.CONTEXT_PROCESSOR) {
      console.warn(`函数 ${name} 不是上下文处理器函数，实际类型: ${functionType}`);
    }

    return func;
  }

  /**
   * 获取所有上下文处理器函数
   * @returns 上下文处理器函数列表
   */
  getAllContextProcessorFunctions(): IWorkflowFunction[] {
    return Array.from(this.typedFunctions.contextProcessor.values());
  }

  /**
   * 获取类型化函数注册表
   * @returns 类型化函数注册表
   */
  getTypedRegistry(): TypedFunctionRegistry {
    return this.typedFunctions;
  }
}
