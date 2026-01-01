import { injectable } from 'inversify';
import { IWorkflowFunction, WorkflowFunctionType } from './types';

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
 * 函数注册表实现
 * 支持分层函数类型：CONDITION、ROUTING、TRIGGER、HOOK
 * 提供类型安全的函数注册和获取方法
 */
@injectable()
export class FunctionRegistry {
  private functions: Map<string, IWorkflowFunction> = new Map();
  private functionsByName: Map<string, IWorkflowFunction> = new Map();
  private typedFunctions: TypedFunctionRegistry = {
    condition: new Map(),
    routing: new Map(),
    trigger: new Map(),
    hook: new Map(),
    contextProcessor: new Map()
  };

  /**
   * 注册函数
   * @param func 工作流函数
   */
  registerFunction(func: IWorkflowFunction): void {
    if (this.functions.has(func.id)) {
      throw new Error(`函数ID ${func.id} 已存在`);
    }

    if (this.functionsByName.has(func.name)) {
      throw new Error(`函数名称 ${func.name} 已存在`);
    }

    // 验证函数类型
    const functionType = this.extractFunctionType(func.id);
    if (!functionType) {
      throw new Error(`无法从函数ID ${func.id} 提取函数类型`);
    }

    // 注册到类型化映射
    this.registerTypedFunction(functionType, func);

    this.functions.set(func.id, func);
    this.functionsByName.set(func.name, func);
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
   * 获取函数
   * @param id 函数ID
   * @returns 工作流函数
   */
  getFunction(id: string): IWorkflowFunction | null {
    return this.functions.get(id) || null;
  }

  /**
   * 根据名称获取函数
   * @param name 函数名称
   * @returns 工作流函数
   */
  getFunctionByName(name: string): IWorkflowFunction | null {
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
    return this.functions.has(id);
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