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
 * ThreadExecutionContext值对象属性接口
 */
export interface ThreadExecutionContextProps {
  readonly variables: Map<string, unknown>;
  readonly nodeContexts: Map<string, NodeContext>;
  readonly metadata: Record<string, unknown>;
  readonly executionConfig?: ExecutionConfig;
}

/**
 * ThreadExecutionContext值对象
 *
 * 表示线程执行的上下文，专注于线程层实际使用的功能：
 * - 全局变量存储
 * - 节点上下文管理（用于线程分叉）
 * - 元数据和执行配置
 */
export class ThreadExecutionContext extends ValueObject<ThreadExecutionContextProps> {
  /**
   * 创建线程执行上下文
   * @returns 线程执行上下文实例
   */
  public static create(): ThreadExecutionContext {
    const props: ThreadExecutionContextProps = {
      variables: new Map(),
      nodeContexts: new Map(),
      metadata: {},
    };
    return new ThreadExecutionContext(props);
  }

  /**
   * 从已有属性重建线程执行上下文
   * @param props 线程执行上下文属性
   * @returns 线程执行上下文实例
   */
  public static fromProps(props: ThreadExecutionContextProps): ThreadExecutionContext {
    return new ThreadExecutionContext(props);
  }

  /**
   * 从对象反序列化
   * @param obj 序列化对象
   * @returns 线程执行上下文实例
   */
  public static fromObject(obj: {
    variables?: Record<string, unknown>;
    nodeContexts?: Record<string, any>;
    metadata?: Record<string, unknown>;
    executionConfig?: ExecutionConfig;
  }): ThreadExecutionContext {
    return new ThreadExecutionContext({
      variables: new Map(Object.entries(obj.variables || {})),
      nodeContexts: new Map(
        Object.entries(obj.nodeContexts || {}).map(([nodeId, data]) => [
          nodeId,
          {
            nodeId: NodeId.fromString(data.nodeId),
            localVariables: new Map(Object.entries(data.localVariables || {})),
            metadata: data.metadata || {},
            lastAccessedAt: Timestamp.fromString(data.lastAccessedAt),
          },
        ])
      ),
      metadata: obj.metadata || {},
      executionConfig: obj.executionConfig,
    });
  }

  /**
   * 私有构造函数
   */
  private constructor(props: ThreadExecutionContextProps) {
    super(props);
  }

  /**
   * 获取变量
   * @returns 变量映射
   */
  public get variables(): Map<string, unknown> {
    return new Map(this.props.variables);
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
   * 获取执行配置
   * @returns 执行配置
   */
  public get executionConfig(): ExecutionConfig | undefined {
    return this.props.executionConfig;
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
   * @returns 新的线程执行上下文实例
   */
  public setVariable(key: string, value: unknown): ThreadExecutionContext {
    const newVariables = new Map(this.props.variables);
    newVariables.set(key, value);
    return new ThreadExecutionContext({
      ...this.props,
      variables: newVariables,
    });
  }

  /**
   * 批量设置变量
   * @param variables 变量映射
   * @returns 新的线程执行上下文实例
   */
  public setVariables(variables: Map<string, unknown>): ThreadExecutionContext {
    const newVariables = new Map(this.props.variables);
    for (const [key, value] of variables.entries()) {
      newVariables.set(key, value);
    }
    return new ThreadExecutionContext({
      ...this.props,
      variables: newVariables,
    });
  }

  /**
   * 删除变量
   * @param key 变量名
   * @returns 新的线程执行上下文实例
   */
  public deleteVariable(key: string): ThreadExecutionContext {
    const newVariables = new Map(this.props.variables);
    newVariables.delete(key);
    return new ThreadExecutionContext({
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
   * @returns 新的线程执行上下文实例
   */
  public setNodeContext(nodeId: NodeId, context: NodeContext): ThreadExecutionContext {
    const newNodeContexts = new Map(this.props.nodeContexts);
    newNodeContexts.set(nodeId.toString(), context);
    return new ThreadExecutionContext({
      ...this.props,
      nodeContexts: newNodeContexts,
    });
  }

  /**
   * 更新节点上下文变量
   * @param nodeId 节点ID
   * @param variables 变量映射
   * @returns 新的线程执行上下文实例
   */
  public updateNodeContextVariables(
    nodeId: NodeId,
    variables: Map<string, unknown>
  ): ThreadExecutionContext {
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

    return new ThreadExecutionContext({
      ...this.props,
      nodeContexts: newNodeContexts,
    });
  }

  /**
   * 更新元数据
   * @param metadata 新的元数据
   * @returns 新的线程执行上下文实例
   */
  public updateMetadata(metadata: Record<string, unknown>): ThreadExecutionContext {
    return new ThreadExecutionContext({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
    });
  }

  /**
   * 更新执行配置
   * @param config 新的执行配置
   * @returns 新的线程执行上下文实例
   */
  public updateExecutionConfig(config: ExecutionConfig): ThreadExecutionContext {
    return new ThreadExecutionContext({
      ...this.props,
      executionConfig: { ...this.props.executionConfig, ...config },
    });
  }

  /**
   * 序列化为对象
   * @returns 序列化后的对象
   */
  public toObject(): {
    variables: Record<string, unknown>;
    nodeContexts: Record<string, any>;
    metadata: Record<string, unknown>;
    executionConfig?: ExecutionConfig;
  } {
    return {
      variables: Object.fromEntries(this.props.variables),
      nodeContexts: Object.fromEntries(
        Array.from(this.props.nodeContexts.entries()).map(([nodeId, context]) => [
          nodeId,
          {
            nodeId: context.nodeId.toString(),
            localVariables: Object.fromEntries(context.localVariables),
            metadata: context.metadata,
            lastAccessedAt: context.lastAccessedAt.toISOString(),
          },
        ])
      ),
      metadata: this.props.metadata,
      executionConfig: this.props.executionConfig,
    };
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    // ThreadExecutionContext 不需要特殊验证
  }
}