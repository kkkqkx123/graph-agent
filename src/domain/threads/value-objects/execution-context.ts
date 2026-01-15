import { ValueObject, ID, Timestamp } from '../../common/value-objects';
import { NodeId } from '../../workflow/value-objects';

/**
 * 节点上下文接口
 */
export interface NodeContext {
  readonly nodeId: NodeId;
  readonly localVariables: Map<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly lastAccessedAt: Timestamp;
}

/**
 * 执行配置接口
 */
export interface ExecutionConfig {
  readonly timeout?: number;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly enableCaching?: boolean;
  readonly enableLogging?: boolean;
  readonly customSettings?: Record<string, unknown>;
}

/**
 * 上下文快照接口
 */
export interface ContextSnapshot {
  readonly variables: Map<string, unknown>;
  readonly nodeResults: Map<string, unknown>;
  readonly nodeContexts: Map<string, NodeContext>;
  readonly metadata: Record<string, unknown>;
  readonly snapshotAt: Timestamp;
}

/**
 * ExecutionContext值对象属性接口
 */
export interface ExecutionContextProps {
  readonly variables: Map<string, unknown>;
  readonly nodeResults: Map<string, unknown>;
  readonly nodeContexts: Map<string, NodeContext>;
  readonly metadata: Record<string, unknown>;
}

/**
 * ExecutionContext值对象
 *
 * 表示线程执行的上下文，包含全局变量、节点执行结果和节点上下文
 */
export class ExecutionContext extends ValueObject<ExecutionContextProps> {
  /**
   * 创建执行上下文
   * @returns 执行上下文实例
   */
  public static create(): ExecutionContext {
    return new ExecutionContext({
      variables: new Map(),
      nodeResults: new Map(),
      nodeContexts: new Map(),
      metadata: {},
    });
  }

  /**
   * 从已有属性重建执行上下文
   * @param props 执行上下文属性
   * @returns 执行上下文实例
   */
  public static fromProps(props: ExecutionContextProps): ExecutionContext {
    return new ExecutionContext(props);
  }

  /**
   * 获取变量
   * @returns 变量映射
   */
  public get variables(): Map<string, unknown> {
    return new Map(this.props.variables);
  }

  /**
   * 获取节点执行结果
   * @returns 节点执行结果映射
   */
  public get nodeResults(): Map<string, unknown> {
    return new Map(this.props.nodeResults);
  }

  /**
   * 获取节点上下文
   * @returns 节点上下文映射
   */
  public get nodeContexts(): Map<string, NodeContext> {
    return new Map(this.props.nodeContexts);
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取变量值
   * @param key 变量名
   * @returns 变量值
   */
  public getVariable(key: string): unknown | undefined {
    return this.props.variables.get(key);
  }

  /**
   * 检查变量是否存在
   * @param key 变量名
   * @returns 是否存在
   */
  public hasVariable(key: string): boolean {
    return this.props.variables.has(key);
  }

  /**
   * 设置变量
   * @param key 变量名
   * @param value 变量值
   * @returns 新的执行上下文实例
   */
  public setVariable(key: string, value: unknown): ExecutionContext {
    const newVariables = new Map(this.props.variables);
    newVariables.set(key, value);

    return new ExecutionContext({
      ...this.props,
      variables: newVariables,
    });
  }

  /**
   * 批量设置变量
   * @param variables 变量映射
   * @returns 新的执行上下文实例
   */
  public setVariables(variables: Map<string, unknown>): ExecutionContext {
    const newVariables = new Map(this.props.variables);
    for (const [key, value] of variables.entries()) {
      newVariables.set(key, value);
    }

    return new ExecutionContext({
      ...this.props,
      variables: newVariables,
    });
  }

  /**
   * 删除变量
   * @param key 变量名
   * @returns 新的执行上下文实例
   */
  public deleteVariable(key: string): ExecutionContext {
    const newVariables = new Map(this.props.variables);
    newVariables.delete(key);

    return new ExecutionContext({
      ...this.props,
      variables: newVariables,
    });
  }

  /**
   * 获取节点上下文
   * @param nodeId 节点ID
   * @returns 节点上下文
   */
  public getNodeContext(nodeId: NodeId): NodeContext | undefined {
    return this.props.nodeContexts.get(nodeId.toString());
  }

  /**
   * 设置节点上下文
   * @param nodeId 节点ID
   * @param context 节点上下文
   * @returns 新的执行上下文实例
   */
  public setNodeContext(nodeId: NodeId, context: NodeContext): ExecutionContext {
    const newNodeContexts = new Map(this.props.nodeContexts);
    newNodeContexts.set(nodeId.toString(), context);

    return new ExecutionContext({
      ...this.props,
      nodeContexts: newNodeContexts,
    });
  }

  /**
   * 更新节点上下文变量
   * @param nodeId 节点ID
   * @param variables 变量映射
   * @returns 新的执行上下文实例
   */
  public updateNodeContextVariables(
    nodeId: NodeId,
    variables: Map<string, unknown>
  ): ExecutionContext {
    const existingContext = this.props.nodeContexts.get(nodeId.toString());

    if (!existingContext) {
      throw new Error(`节点上下文不存在: ${nodeId.toString()}`);
    }

    const newVariables = new Map(existingContext.localVariables);
    for (const [key, value] of variables.entries()) {
      newVariables.set(key, value);
    }

    const newContext: NodeContext = {
      ...existingContext,
      localVariables: newVariables,
      lastAccessedAt: Timestamp.now(),
    };

    const newNodeContexts = new Map(this.props.nodeContexts);
    newNodeContexts.set(nodeId.toString(), newContext);

    return new ExecutionContext({
      ...this.props,
      nodeContexts: newNodeContexts,
    });
  }

  /**
   * 设置节点执行结果
   * @param nodeId 节点ID
   * @param result 执行结果
   * @returns 新的执行上下文实例
   */
  public setNodeResult(nodeId: NodeId, result: unknown): ExecutionContext {
    const newNodeResults = new Map(this.props.nodeResults);
    newNodeResults.set(nodeId.toString(), result);

    return new ExecutionContext({
      ...this.props,
      nodeResults: newNodeResults,
    });
  }

  /**
   * 获取节点执行结果
   * @param nodeId 节点ID
   * @returns 节点执行结果
   */
  public getNodeResult(nodeId: NodeId): unknown | undefined {
    return this.props.nodeResults.get(nodeId.toString());
  }

  /**
   * 更新元数据
   * @param metadata 新的元数据
   * @returns 新的执行上下文实例
   */
  public updateMetadata(metadata: Record<string, unknown>): ExecutionContext {
    return new ExecutionContext({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
    });
  }

  /**
   * 验证变量
   * @param key 变量名
   * @returns 验证结果
   */
  public validateVariable(key: string): { valid: boolean; error?: string } {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: '变量名不能为空' };
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return { valid: false, error: '变量名格式不正确' };
    }

    return { valid: true };
  }

  /**
   * 计算内存使用量
   * @returns 内存使用量（字节）
   */
  public calculateMemoryUsage(): number {
    let totalSize = 0;

    // 计算变量大小
    for (const [key, value] of this.props.variables.entries()) {
      totalSize += key.length * 2; // UTF-16
      totalSize += this.calculateValueSize(value);
    }

    // 计算节点执行结果大小
    for (const [nodeId, result] of this.props.nodeResults.entries()) {
      totalSize += nodeId.length * 2;
      totalSize += this.calculateValueSize(result);
    }

    // 计算节点上下文大小
    for (const [nodeId, context] of this.props.nodeContexts.entries()) {
      totalSize += nodeId.length * 2;
      for (const [key, value] of context.localVariables.entries()) {
        totalSize += key.length * 2;
        totalSize += this.calculateValueSize(value);
      }
    }

    return totalSize;
  }

  /**
   * 创建快照
   * @returns 上下文快照
   */
  public createSnapshot(): ContextSnapshot {
    return {
      variables: new Map(this.props.variables),
      nodeResults: new Map(this.props.nodeResults),
      nodeContexts: new Map(this.props.nodeContexts),
      metadata: { ...this.props.metadata },
      snapshotAt: Timestamp.now(),
    };
  }

  /**
   * 从快照恢复
   * @param snapshot 上下文快照
   * @returns 执行上下文实例
   */
  public static restoreFromSnapshot(snapshot: ContextSnapshot): ExecutionContext {
    return new ExecutionContext({
      variables: new Map(snapshot.variables),
      nodeResults: new Map(snapshot.nodeResults),
      nodeContexts: new Map(snapshot.nodeContexts),
      metadata: { ...snapshot.metadata },
    });
  }

  /**
   * 计算值的大小
   * @param value 值
   * @returns 大小（字节）
   */
  private calculateValueSize(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }

    if (typeof value === 'number') {
      return 8; // 64位数字
    }

    if (typeof value === 'boolean') {
      return 1;
    }

    if (value instanceof Date) {
      return 8; // 时间戳
    }

    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.calculateValueSize(item), 0);
    }

    if (typeof value === 'object') {
      let size = 0;
      for (const [key, val] of Object.entries(value)) {
        size += key.length * 2;
        size += this.calculateValueSize(val);
      }
      return size;
    }

    return 0;
  }

  /**
   * 验证执行上下文的有效性
   */
  public validate(): void {
    // ExecutionContext现在不包含promptContext，无需验证
  }
}
