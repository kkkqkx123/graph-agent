import { ValueObject } from '../../common/value-objects';
import { VariableScope } from './variable-scope';

/**
 * VariableManager属性接口
 */
export interface VariableManagerProps {
  /** 全局执行变量 */
  readonly globalVariables: Map<string, unknown>;
  /** 节点执行结果 */
  readonly nodeResults: Map<string, unknown>;
  /** 节点局部变量 */
  readonly localVariables: Map<string, unknown>;
}

/**
 * 变量管理器值对象
 *
 * 负责统一管理不同作用域的变量，提供：
 * - 统一的变量查找逻辑（按作用域顺序）
 * - 统一的变量设置逻辑（支持指定作用域）
 * - 统一的变量验证逻辑
 * - 统一的变量序列化逻辑
 */
export class VariableManager extends ValueObject<VariableManagerProps> {
  private constructor(props: VariableManagerProps) {
    super(props);
  }

  /**
   * 创建变量管理器
   * @param props 变量管理器属性
   * @returns 变量管理器实例
   */
  public static create(props: VariableManagerProps): VariableManager {
    return new VariableManager(props);
  }

  /**
   * 创建空的变量管理器
   * @returns 空的变量管理器实例
   */
  public static createEmpty(): VariableManager {
    return new VariableManager({
      globalVariables: new Map(),
      nodeResults: new Map(),
      localVariables: new Map(),
    });
  }

  /**
   * 从已有属性重建变量管理器
   * @param props 变量管理器属性
   * @returns 变量管理器实例
   */
  public static fromProps(props: VariableManagerProps): VariableManager {
    return new VariableManager({
      globalVariables: new Map(props.globalVariables),
      nodeResults: new Map(props.nodeResults),
      localVariables: new Map(props.localVariables),
    });
  }

  /**
   * 获取全局变量
   * @returns 全局变量映射
   */
  public get globalVariables(): Map<string, unknown> {
    return new Map(this.props.globalVariables);
  }

  /**
   * 获取节点执行结果
   * @returns 节点执行结果映射
   */
  public get nodeResults(): Map<string, unknown> {
    return new Map(this.props.nodeResults);
  }

  /**
   * 获取节点局部变量
   * @returns 节点局部变量映射
   */
  public get localVariables(): Map<string, unknown> {
    return new Map(this.props.localVariables);
  }

  /**
   * 获取变量（按作用域顺序查找）
   * 查找顺序：局部变量 -> 全局变量 -> 节点执行结果
   * @param key 变量名
   * @returns 变量值
   */
  public getVariable(key: string): unknown | undefined {
    // 1. 查找节点局部变量
    if (this.props.localVariables.has(key)) {
      return this.props.localVariables.get(key);
    }
    // 2. 查找全局变量
    if (this.props.globalVariables.has(key)) {
      return this.props.globalVariables.get(key);
    }
    // 3. 查找节点执行结果
    return this.props.nodeResults.get(key);
  }

  /**
   * 检查变量是否存在
   * @param key 变量名
   * @returns 是否存在
   */
  public hasVariable(key: string): boolean {
    return (
      this.props.localVariables.has(key) ||
      this.props.globalVariables.has(key) ||
      this.props.nodeResults.has(key)
    );
  }

  /**
   * 检查变量在指定作用域中是否存在
   * @param key 变量名
   * @param scope 作用域
   * @returns 是否存在
   */
  public hasVariableInScope(key: string, scope: VariableScope): boolean {
    switch (scope) {
      case VariableScope.LOCAL:
        return this.props.localVariables.has(key);
      case VariableScope.GLOBAL:
        return this.props.globalVariables.has(key);
      case VariableScope.NODE_RESULT:
        return this.props.nodeResults.has(key);
    }
  }

  /**
   * 设置变量（指定作用域）
   * @param key 变量名
   * @param value 变量值
   * @param scope 作用域
   * @returns 新的变量管理器实例
   */
  public setVariable(
    key: string,
    value: unknown,
    scope: VariableScope
  ): VariableManager {
    switch (scope) {
      case VariableScope.LOCAL:
        return this.setLocalVariable(key, value);
      case VariableScope.GLOBAL:
        return this.setGlobalVariable(key, value);
      case VariableScope.NODE_RESULT:
        return this.setNodeResult(key, value);
    }
  }

  /**
   * 设置全局变量
   * @param key 变量名
   * @param value 变量值
   * @returns 新的变量管理器实例
   */
  public setGlobalVariable(key: string, value: unknown): VariableManager {
    const newVariables = new Map(this.props.globalVariables);
    newVariables.set(key, value);
    return new VariableManager({
      ...this.props,
      globalVariables: newVariables,
    });
  }

  /**
   * 批量设置全局变量
   * @param variables 变量映射
   * @returns 新的变量管理器实例
   */
  public setGlobalVariables(variables: Map<string, unknown>): VariableManager {
    const newVariables = new Map(this.props.globalVariables);
    for (const [key, value] of variables.entries()) {
      newVariables.set(key, value);
    }
    return new VariableManager({
      ...this.props,
      globalVariables: newVariables,
    });
  }

  /**
   * 设置节点执行结果
   * @param nodeId 节点ID
   * @param result 执行结果
   * @returns 新的变量管理器实例
   */
  public setNodeResult(nodeId: string, result: unknown): VariableManager {
    const newResults = new Map(this.props.nodeResults);
    newResults.set(nodeId, result);
    return new VariableManager({
      ...this.props,
      nodeResults: newResults,
    });
  }

  /**
   * 设置节点局部变量
   * @param key 变量名
   * @param value 变量值
   * @returns 新的变量管理器实例
   */
  public setLocalVariable(key: string, value: unknown): VariableManager {
    const newVariables = new Map(this.props.localVariables);
    newVariables.set(key, value);
    return new VariableManager({
      ...this.props,
      localVariables: newVariables,
    });
  }

  /**
   * 批量设置节点局部变量
   * @param variables 变量映射
   * @returns 新的变量管理器实例
   */
  public setLocalVariables(variables: Map<string, unknown>): VariableManager {
    const newVariables = new Map(this.props.localVariables);
    for (const [key, value] of variables.entries()) {
      newVariables.set(key, value);
    }
    return new VariableManager({
      ...this.props,
      localVariables: newVariables,
    });
  }

  /**
   * 删除变量（从所有作用域）
   * @param key 变量名
   * @returns 新的变量管理器实例
   */
  public deleteVariable(key: string): VariableManager {
    let newGlobalVariables = this.props.globalVariables;
    let newLocalVariables = this.props.localVariables;
    let newNodeResults = this.props.nodeResults;

    if (this.props.globalVariables.has(key)) {
      newGlobalVariables = new Map(this.props.globalVariables);
      newGlobalVariables.delete(key);
    }

    if (this.props.localVariables.has(key)) {
      newLocalVariables = new Map(this.props.localVariables);
      newLocalVariables.delete(key);
    }

    if (this.props.nodeResults.has(key)) {
      newNodeResults = new Map(this.props.nodeResults);
      newNodeResults.delete(key);
    }

    return new VariableManager({
      globalVariables: newGlobalVariables,
      nodeResults: newNodeResults,
      localVariables: newLocalVariables,
    });
  }

  /**
   * 删除指定作用域的变量
   * @param key 变量名
   * @param scope 作用域
   * @returns 新的变量管理器实例
   */
  public deleteVariableInScope(key: string, scope: VariableScope): VariableManager {
    switch (scope) {
      case VariableScope.LOCAL:
        if (!this.props.localVariables.has(key)) {
          return this;
        }
        const newLocalVariables = new Map(this.props.localVariables);
        newLocalVariables.delete(key);
        return new VariableManager({
          ...this.props,
          localVariables: newLocalVariables,
        });
      case VariableScope.GLOBAL:
        if (!this.props.globalVariables.has(key)) {
          return this;
        }
        const newGlobalVariables = new Map(this.props.globalVariables);
        newGlobalVariables.delete(key);
        return new VariableManager({
          ...this.props,
          globalVariables: newGlobalVariables,
        });
      case VariableScope.NODE_RESULT:
        if (!this.props.nodeResults.has(key)) {
          return this;
        }
        const newNodeResults = new Map(this.props.nodeResults);
        newNodeResults.delete(key);
        return new VariableManager({
          ...this.props,
          nodeResults: newNodeResults,
        });
    }
  }

  /**
   * 验证变量名
   * @param key 变量名
   * @returns 验证结果
   */
  public validateVariableName(key: string): { valid: boolean; error?: string } {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: '变量名不能为空' };
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return { valid: false, error: '变量名格式不正确' };
    }

    return { valid: true };
  }

  /**
   * 获取所有变量（按作用域分组）
   * @returns 所有变量
   */
  public getAllVariables(): {
    local: Map<string, unknown>;
    global: Map<string, unknown>;
    nodeResults: Map<string, unknown>;
  } {
    return {
      local: new Map(this.props.localVariables),
      global: new Map(this.props.globalVariables),
      nodeResults: new Map(this.props.nodeResults),
    };
  }

  /**
   * 获取所有变量名
   * @returns 所有变量名
   */
  public getAllVariableNames(): string[] {
    const names = new Set<string>();
    this.props.localVariables.forEach((_, key) => names.add(key));
    this.props.globalVariables.forEach((_, key) => names.add(key));
    this.props.nodeResults.forEach((_, key) => names.add(key));
    return Array.from(names);
  }

  /**
   * 清空所有变量
   * @returns 新的变量管理器实例
   */
  public clearAll(): VariableManager {
    return new VariableManager({
      globalVariables: new Map(),
      nodeResults: new Map(),
      localVariables: new Map(),
    });
  }

  /**
   * 清空指定作用域的变量
   * @param scope 作用域
   * @returns 新的变量管理器实例
   */
  public clearScope(scope: VariableScope): VariableManager {
    switch (scope) {
      case VariableScope.LOCAL:
        return new VariableManager({
          ...this.props,
          localVariables: new Map(),
        });
      case VariableScope.GLOBAL:
        return new VariableManager({
          ...this.props,
          globalVariables: new Map(),
        });
      case VariableScope.NODE_RESULT:
        return new VariableManager({
          ...this.props,
          nodeResults: new Map(),
        });
    }
  }

  /**
   * 克隆变量管理器
   * @returns 新的变量管理器实例
   */
  public clone(): VariableManager {
    return new VariableManager({
      globalVariables: new Map(this.props.globalVariables),
      nodeResults: new Map(this.props.nodeResults),
      localVariables: new Map(this.props.localVariables),
    });
  }

  /**
   * 序列化为对象
   * @returns 序列化后的对象
   */
  public toObject(): {
    globalVariables: Record<string, unknown>;
    nodeResults: Record<string, unknown>;
    localVariables: Record<string, unknown>;
  } {
    return {
      globalVariables: Object.fromEntries(this.props.globalVariables),
      nodeResults: Object.fromEntries(this.props.nodeResults),
      localVariables: Object.fromEntries(this.props.localVariables),
    };
  }

  /**
   * 从对象反序列化
   * @param obj 序列化对象
   * @returns 变量管理器实例
   */
  public static fromObject(obj: {
    globalVariables?: Record<string, unknown>;
    nodeResults?: Record<string, unknown>;
    localVariables?: Record<string, unknown>;
  }): VariableManager {
    return new VariableManager({
      globalVariables: new Map(Object.entries(obj.globalVariables || {})),
      nodeResults: new Map(Object.entries(obj.nodeResults || {})),
      localVariables: new Map(Object.entries(obj.localVariables || {})),
    });
  }

  /**
   * 验证值对象的有效性
   */
  public override validate(): void {
    // VariableManager本身不需要验证
  }
}