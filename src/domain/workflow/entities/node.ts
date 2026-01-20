import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { NodeId } from '../value-objects/node/node-id';
import { NodeType } from '../value-objects/node/node-type';
import { NodeStatus } from '../value-objects/node/node-status';

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
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, any>;
  readonly status: NodeStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * Node聚合根实体
 *
 * 根据DDD原则，Node是工作流的核心组件，负责：
 * 1. 在工作流中执行特定任务
 * 2. 验证自身配置
 * 3. 管理自己的状态
 * 4. 提供元数据信息
 *
 * 不负责：
 * - Node的调度和执行顺序（由WorkflowExecutor负责）
 * - Node的持久化细节
 */
export abstract class Node extends Entity {
  protected readonly props: NodeProps;

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
    propsOrId: NodeProps | NodeId,
    type?: NodeType,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    if (type === undefined) {
      // 完整版本：使用NodeProps
      const props = propsOrId as NodeProps;
      super(props.id, props.createdAt, props.updatedAt, props.version);
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
        position,
        properties: {},
        status: NodeStatus.pending(),
        createdAt: now,
        updatedAt: now,
        version: Version.initial(),
      };
      super(props.id, props.createdAt, props.updatedAt, props.version);
      this.props = Object.freeze(props);
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
   * 获取Node位置
   * @returns Node位置
   */
  public get position(): { x: number; y: number } | undefined {
    return this.props.position;
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
   * 执行Node
   * @param context Node上下文
   * @returns 执行结果
   */
  public abstract execute(context: NodeContext): Promise<NodeExecutionResult>;

  /**
   * 验证Node配置
   * @returns 验证结果
   */
  public abstract validate(): ValidationResult;

  /**
   * 获取Node元数据
   * @returns Node元数据
   */
  public abstract getMetadata(): NodeMetadata;

  /**
   * 获取输入Schema
   * @returns 输入Schema
   */
  public abstract getInputSchema(): Record<string, any>;

  /**
   * 获取输出Schema
   * @returns 输出Schema
   */
  public abstract getOutputSchema(): Record<string, any>;

  /**
   * 检查Node是否可以执行
   * @returns 是否可以执行
   */
  public canExecute(): boolean {
    const validation = this.validate();
    return validation.valid && this.props.status.isReady();
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
  public updateProperties(properties: Record<string, any>): Node {
    const newProps: NodeProps = {
      ...this.props,
      properties: { ...this.props.properties, ...properties },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createNodeFromProps(newProps);
  }

  /**
   * 更新Node位置
   * @param position 新位置
   * @returns 新Node实例
   */
  public updatePosition(position: { x: number; y: number }): Node {
    const newProps: NodeProps = {
      ...this.props,
      position,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createNodeFromProps(newProps);
  }

  /**
   * 更新Node状态
   * @param status 新状态
   * @returns 新Node实例
   */
  public updateStatus(status: NodeStatus): Node {
    const newProps: NodeProps = {
      ...this.props,
      status,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createNodeFromProps(newProps);
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
  public toProps(): NodeProps {
    return this.props;
  }

  /**
   * 从属性创建Node实例（由子类实现）
   * @param props Node属性
   * @returns Node实例
   */
  protected abstract createNodeFromProps(props: NodeProps): Node;

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  public override toString(): string {
    return `Node(id=${this.props.id.toString()}, type=${this.props.type.toString()}, name=${this.props.name || 'unnamed'}, status=${this.props.status.toString()})`;
  }
}
