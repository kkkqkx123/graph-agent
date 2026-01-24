import { Entity } from '../../common/base/entity';
import { Timestamp, Version } from '../../common/value-objects';
import { NodeId } from '../value-objects/node/node-id';
import { NodeType } from '../value-objects/node/node-type';
import { NodeStatus } from '../value-objects/node/node-status';
import { NodeRetryStrategy } from '../value-objects/node/node-retry-strategy';

/**
 * 节点执行结果接口
 */
export interface NodeExecutionResult {
  readonly success: boolean;
  readonly output?: any;
  readonly error?: string;
  readonly metadata?: Record<string, any>;
  readonly executionTime?: number;
}

/**
 * 节点元数据接口
 */
export interface NodeMetadata {
  readonly id: string;
  readonly type: string;
  readonly name?: string;
  readonly description?: string;
  readonly parameters: NodeParameter[];
  readonly status?: string;
}

/**
 * 节点参数接口
 */
export interface NodeParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  readonly defaultValue?: any;
}

/**
 * 节点上下文接口
 */
export interface NodeContext {
  readonly workflowId?: string;
  readonly executionId?: string;
  readonly localVariables: Map<string, any>;
  readonly metadata?: Record<string, any>;
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getAllVariables(): Record<string, any>;
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
  getExecutionId(): string;
  getWorkflowId(): string;
  getService<T>(serviceName: string): T;
}

/**
 * 工作流执行上下文接口（兼容infrastructure层）
 * WorkflowExecutionContext是NodeContext的扩展，增加了getService方法
 *
 * 注意：此接口现在兼容WorkflowContext，支持不可变更新模式
 */
export interface WorkflowExecutionContext extends NodeContext {
  /**
   * 获取变量
   */
  getVariable(key: string): any;

  /**
   * 设置变量（注意：在WorkflowContext中，此方法不会修改原上下文）
   */
  setVariable(key: string, value: any): void;

  /**
   * 获取所有变量
   */
  getAllVariables(): Record<string, any>;

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
   * 设置节点结果（注意：在WorkflowContext中，此方法不会修改原上下文）
   */
  setNodeResult(nodeId: string, result: any): void;

  /**
   * 获取服务（用于依赖注入）
   */
  getService<T>(serviceName: string): T;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Node聚合根属性接口
 */
export interface NodeProps {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly properties: Record<string, any>;
  readonly status: NodeStatus;
  readonly retryStrategy: NodeRetryStrategy;
}

/**
 * Node聚合根实体（简化版）
 *
 * 根据DDD原则，Node是工作流的核心组件，负责：
 * 1. 节点状态管理
 * 2. 节点属性管理
 * 3. 节点重试策略管理
 *
 * 不负责：
 * - 节点执行（由 Thread 层的 NodeExecutionHandler 负责）
 * - 节点验证（由配置验证负责）
 * - 节点元数据（由配置负责）
 *
 * @template TProps 节点属性类型，默认为 NodeProps
 */
export abstract class Node<TProps extends NodeProps = NodeProps> extends Entity {
  protected readonly props: TProps;

  /**
   * 构造函数（完整版本，使用NodeProps）
   * @param props Node属性
   */
  protected constructor(props: NodeProps);

  /**
   * 构造函数（简化版本，用于infrastructure层）
   * @param id Node ID
   * @param type Node类型
   * @param name Node名称
   * @param description Node描述
   * @param position Node位置
   */
  protected constructor(
    id: NodeId,
    type: NodeType,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  );

  /**
   * 构造函数实现
   */
  protected constructor(
    propsOrId: TProps | NodeId,
    type?: NodeType,
    name?: string,
    description?: string
  ) {
    if (type === undefined) {
      // 完整版本：使用NodeProps
      const props = propsOrId as TProps;
      const now = Timestamp.now();
      super(props.id, now, now, Version.initial());
      this.props = Object.freeze(props);
    } else {
      // 简化版本：用于infrastructure层
      const id = propsOrId as NodeId;
      const now = Timestamp.now();
      const props: NodeProps = {
        id,
        type,
        name,
        description,
        properties: {},
        status: NodeStatus.pending(),
        retryStrategy: NodeRetryStrategy.disabled(),
      };
      super(props.id, now, now, Version.initial());
      this.props = Object.freeze(props as TProps);
    }
  }

  /**
   * 获取Node ID
   * @returns Node ID
   */
  public get nodeId(): NodeId {
    return this.props.id;
  }

  /**
   * 获取Node类型
   * @returns Node类型
   */
  public get type(): NodeType {
    return this.props.type;
  }

  /**
   * 获取Node名称
   * @returns Node名称
   */
  public get name(): string | undefined {
    return this.props.name;
  }

  /**
   * 获取Node描述
   * @returns Node描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取Node属性
   * @returns Node属性
   */
  public get properties(): Record<string, any> {
    return this.props.properties;
  }

  /**
   * 获取Node状态
   * @returns Node状态
   */
  public get status(): NodeStatus {
    return this.props.status;
  }

  /**
   * 获取Node重试策略
   * @returns Node重试策略
   */
  public get retryStrategy(): NodeRetryStrategy {
    return this.props.retryStrategy;
  }

  /**
   * 检查是否为控制流节点
   * @returns 是否为控制流节点
   */
  public isControlFlow(): boolean {
    return this.props.type.isControlFlow();
  }

  /**
   * 检查是否为执行节点
   * @returns 是否为执行节点
   */
  public isExecutable(): boolean {
    return this.props.type.isExecutable();
  }

  /**
   * 检查是否可以有多个输入边
   * @returns 是否可以有多个输入边
   */
  public canHaveMultipleInputs(): boolean {
    return this.props.type.canHaveMultipleInputs();
  }

  /**
   * 检查是否可以有多个输出边
   * @returns 是否可以有多个输出边
   */
  public canHaveMultipleOutputs(): boolean {
    return this.props.type.canHaveMultipleOutputs();
  }

  /**
   * 更新Node属性
   * @param properties 新属性
   * @returns 新Node实例
   */
  public updateProperties(properties: Record<string, any>): Node<TProps> {
    const newProps: TProps = {
      ...this.props,
      properties: { ...this.props.properties, ...properties },
    } as TProps;
    return this.createNodeFromProps(newProps);
  }

  /**
   * 更新Node状态
   * @param status 新状态
   * @returns 新Node实例
   */
  public updateStatus(status: NodeStatus): Node<TProps> {
    const newProps: TProps = {
      ...this.props,
      status,
    } as TProps;
    return this.createNodeFromProps(newProps);
  }

  /**
   * 更新Node重试策略
   * @param retryStrategy 新重试策略
   * @returns 新Node实例
   */
  public updateRetryStrategy(retryStrategy: NodeRetryStrategy): Node<TProps> {
    const newProps: TProps = {
      ...this.props,
      retryStrategy,
    } as TProps;
    return this.createNodeFromProps(newProps);
  }

  /**
   * 获取属性值（类型安全）
   * @param key 属性键
   * @returns 属性值
   */
  protected getProperty<K extends string>(key: K): any {
    return this.props.properties[key];
  }

  /**
   * 获取属性值（带默认值）
   * @param key 属性键
   * @param defaultValue 默认值
   * @returns 属性值
   */
  protected getPropertyOrDefault<K extends string>(key: K, defaultValue: any): any {
    return this.props.properties[key] ?? defaultValue;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `node:${this.props.id.toString()}`;
  }

  /**
   * 获取Node属性（用于持久化）
   * @returns Node属性
   */
  public toProps(): TProps {
    return this.props;
  }

  /**
   * 从属性创建Node实例（由子类实现）
   * @param props Node属性
   * @returns Node实例
   */
  protected abstract createNodeFromProps(props: TProps): Node<TProps>;

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  public override toString(): string {
    return `Node(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name || 'unnamed'}, status=${this.props.status.toString()})`;
  }
}
