import { ExecutionContext as IExecutionContext } from './base-executor.interface';

/**
 * 基础执行上下文实现
 */
export class BaseExecutionContext implements IExecutionContext {
  private variables: Map<string, unknown> = new Map();

  constructor(
    public readonly executionId: string,
    public readonly executionType: string,
    public readonly parameters: Record<string, unknown> = {},
    public readonly configuration: Record<string, unknown> = {},
    public readonly startedAt: Date = new Date()
  ) {}

  /**
   * 获取变量值
   */
  getVariable(key: string): unknown {
    return this.variables.get(key);
  }

  /**
   * 设置变量值
   */
  setVariable(key: string, value: unknown): void {
    this.variables.set(key, value);
  }

  /**
   * 获取所有变量
   */
  getVariables(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.variables.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 检查变量是否存在
   */
  hasVariable(key: string): boolean {
    return this.variables.has(key);
  }

  /**
   * 删除变量
   */
  deleteVariable(key: string): boolean {
    return this.variables.delete(key);
  }

  /**
   * 清空所有变量
   */
  clearVariables(): void {
    this.variables.clear();
  }

  /**
   * 获取参数值
   */
  getParameter(key: string): unknown {
    return this.parameters[key];
  }

  /**
   * 获取配置值
   */
  getConfig(key: string): unknown {
    return this.configuration[key];
  }

  /**
   * 获取执行时长（毫秒）
   */
  getDuration(): number {
    return new Date().getTime() - this.startedAt.getTime();
  }

  /**
   * 创建子上下文
   */
  createChildContext(executionId: string, executionType: string, parameters?: Record<string, unknown>): BaseExecutionContext {
    const childContext = new BaseExecutionContext(
      executionId,
      executionType,
      parameters || {},
      this.configuration,
      new Date()
    );

    // 继承父上下文的变量
    this.variables.forEach((value, key) => {
      childContext.setVariable(key, value);
    });

    return childContext;
  }

  /**
   * 克隆上下文
   */
  clone(): BaseExecutionContext {
    const clonedContext = new BaseExecutionContext(
      this.executionId,
      this.executionType,
      JSON.parse(JSON.stringify(this.parameters)), // 深拷贝参数
      JSON.parse(JSON.stringify(this.configuration)), // 深拷贝配置
      new Date(this.startedAt)
    );

    // 深拷贝变量
    this.variables.forEach((value, key) => {
      const clonedValue = typeof value === 'object' && value !== null
        ? JSON.parse(JSON.stringify(value))
        : value;
      clonedContext.setVariable(key, clonedValue);
    });

    return clonedContext;
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): Record<string, unknown> {
    return {
      executionId: this.executionId,
      executionType: this.executionType,
      parameters: this.parameters,
      configuration: this.configuration,
      startedAt: this.startedAt.toISOString(),
      variables: this.getVariables(),
      duration: this.getDuration()
    };
  }

  /**
   * 从JSON创建上下文
   */
  static fromJSON(data: Record<string, unknown>): BaseExecutionContext {
    const context = new BaseExecutionContext(
      data['executionId'] as string,
      data['executionType'] as string,
      data['parameters'] as Record<string, unknown>,
      data['configuration'] as Record<string, unknown>,
      new Date(data['startedAt'] as string)
    );

    // 设置变量
    const variables = data['variables'] as Record<string, unknown>;
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        context.setVariable(key, value);
      });
    }

    return context;
  }
}