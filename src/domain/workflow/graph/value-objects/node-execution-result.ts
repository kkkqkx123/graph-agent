import { ValueObject } from '../../../common/value-objects/value-object';
import { ID } from '../../../common/value-objects/id';
import { DomainError } from '../../../common/errors/domain-error';

/**
 * 节点执行结果属性接口
 */
export interface NodeExecutionResultProps {
  nodeId: ID;
  state: any;
  nextNodeId?: ID;
  metadata: Record<string, unknown>;
  executionTime: number;
  success: boolean;
  error?: Error;
}

/**
 * 节点执行结果值对象
 * 
 * 表示节点执行的结果
 */
export class NodeExecutionResultValue extends ValueObject<NodeExecutionResultProps> {
  constructor(props: NodeExecutionResultProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证节点执行结果
   */
  public validate(): void {
    if (!this.props.nodeId) {
      throw new DomainError('节点ID不能为空');
    }
    if (!this.props.state) {
      throw new DomainError('状态不能为空');
    }
    if (this.props.executionTime < 0) {
      throw new DomainError('执行时间不能为负数');
    }
    if (this.props.executionTime > Number.MAX_SAFE_INTEGER) {
      throw new DomainError('执行时间超出有效范围');
    }
  }

  /**
   * 获取节点ID
   */
  public get nodeId(): ID {
    return this.props.nodeId;
  }

  /**
   * 获取状态
   */
  public get state(): any {
    return this.props.state;
  }

  /**
   * 获取下一个节点ID
   */
  public get nextNodeId(): ID | undefined {
    return this.props.nextNodeId;
  }

  /**
   * 获取元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取执行时间
   */
  public get executionTime(): number {
    return this.props.executionTime;
  }

  /**
   * 获取是否成功
   */
  public get success(): boolean {
    return this.props.success;
  }

  /**
   * 获取错误信息
   */
  public get error(): Error | undefined {
    return this.props.error;
  }

  /**
   * 检查是否有下一个节点
   */
  public hasNextNode(): boolean {
    return this.props.nextNodeId !== undefined;
  }

  /**
   * 检查是否执行失败
   */
  public isFailed(): boolean {
    return !this.props.success;
  }

  /**
   * 检查是否有错误
   */
  public hasError(): boolean {
    return this.props.error !== undefined;
  }

  /**
   * 获取错误消息
   */
  public getErrorMessage(): string | undefined {
    return this.props.error?.message;
  }

  /**
   * 获取元数据值
   */
  public getMetadataValue(key: string): unknown {
    return this.props.metadata[key];
  }

  /**
   * 检查是否有指定的元数据
   */
  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  /**
   * 创建成功的执行结果
   */
  public static success(
    nodeId: ID,
    state: any,
    executionTime: number,
    nextNodeId?: ID,
    metadata?: Record<string, unknown>
  ): NodeExecutionResultValue {
    return new NodeExecutionResultValue({
      nodeId,
      state,
      nextNodeId,
      metadata: metadata || {},
      executionTime,
      success: true
    });
  }

  /**
   * 创建失败的执行结果
   */
  public static failure(
    nodeId: ID,
    state: any,
    executionTime: number,
    error: Error,
    metadata?: Record<string, unknown>
  ): NodeExecutionResultValue {
    return new NodeExecutionResultValue({
      nodeId,
      state,
      metadata: metadata || {},
      executionTime,
      success: false,
      error
    });
  }

  /**
   * 创建带下一个节点的成功结果
   */
  public static withNextNode(
    nodeId: ID,
    state: any,
    nextNodeId: ID,
    executionTime: number,
    metadata?: Record<string, unknown>
  ): NodeExecutionResultValue {
    return new NodeExecutionResultValue({
      nodeId,
      state,
      nextNodeId,
      metadata: metadata || {},
      executionTime,
      success: true
    });
  }

  /**
   * 复制并修改执行结果
   */
  public withChanges(changes: Partial<NodeExecutionResultProps>): NodeExecutionResultValue {
    return new NodeExecutionResultValue({
      ...this.props,
      ...changes
    });
  }

  /**
   * 复制并添加元数据
   */
  public withMetadata(key: string, value: unknown): NodeExecutionResultValue {
    return new NodeExecutionResultValue({
      ...this.props,
      metadata: {
        ...this.props.metadata,
        [key]: value
      }
    });
  }

  /**
   * 复制并移除元数据
   */
  public withoutMetadata(key: string): NodeExecutionResultValue {
    const newMetadata = { ...this.props.metadata };
    delete newMetadata[key];
    return new NodeExecutionResultValue({
      ...this.props,
      metadata: newMetadata
    });
  }

  /**
   * 复制并设置下一个节点
   */
  public withNextNode(nextNodeId: ID): NodeExecutionResultValue {
    return new NodeExecutionResultValue({
      ...this.props,
      nextNodeId
    });
  }

  /**
   * 复制并清除下一个节点
   */
  public withoutNextNode(): NodeExecutionResultValue {
    return new NodeExecutionResultValue({
      ...this.props,
      nextNodeId: undefined
    });
  }

  /**
   * 比较两个执行结果是否相等
   */
  public override equals(vo?: ValueObject<NodeExecutionResultProps>): boolean {
    if (!vo) return false;
    const other = vo as NodeExecutionResultValue;
    return (
      this.props.nodeId.equals(other.props.nodeId) &&
      this.props.success === other.props.success &&
      this.props.executionTime === other.props.executionTime &&
      this.props.nextNodeId?.equals(other.props.nextNodeId ?? ID.generate()) === true
    );
  }

  /**
   * 转换为JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      nodeId: this.props.nodeId.toString(),
      state: this.props.state,
      nextNodeId: this.props.nextNodeId?.toString(),
      metadata: this.props.metadata,
      executionTime: this.props.executionTime,
      success: this.props.success,
      error: this.props.error ? {
        message: this.props.error.message,
        stack: this.props.error.stack
      } : undefined
    };
  }

  /**
   * 从JSON对象创建执行结果
   */
  public static fromJSON(json: Record<string, unknown>): NodeExecutionResultValue {
    try {
      return new NodeExecutionResultValue({
        nodeId: ID.fromString(json['nodeId'] as string),
        state: json['state'],
        nextNodeId: json['nextNodeId'] ? ID.fromString(json['nextNodeId'] as string) : undefined,
        metadata: json['metadata'] as Record<string, unknown>,
        executionTime: json['executionTime'] as number,
        success: json['success'] as boolean,
        error: json['error'] ? new Error((json['error'] as any).message) : undefined
      });
    } catch (error) {
      throw new DomainError(`无法从JSON创建节点执行结果: ${error}`);
    }
  }
}