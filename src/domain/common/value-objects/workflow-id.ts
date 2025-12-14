import { ID } from './id';

/**
 * 工作流ID值对象
 * 
 * 表示工作流的唯一标识符
 */
export class WorkflowId {
  /**
   * 工作流ID值
   */
  readonly value: ID;

  /**
   * 构造函数
   * 
   * @param value 工作流ID值
   */
  constructor(value: ID) {
    this.value = value;
  }

  /**
   * 从ID创建工作流ID
   * 
   * @param id ID
   * @returns 工作流ID
   */
  static fromId(id: ID): WorkflowId {
    return new WorkflowId(id);
  }

  /**
   * 从字符串创建工作流ID
   * 
   * @param value 字符串值
   * @returns 工作流ID
   */
  static fromString(value: string): WorkflowId {
    return new WorkflowId(ID.fromString(value));
  }

  /**
   * 生成新的工作流ID
   * 
   * @returns 新工作流ID
   */
  static generate(): WorkflowId {
    return new WorkflowId(ID.generate());
  }

  /**
   * 获取显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    return `Workflow-${this.value.toShort()}`;
  }

  /**
   * 转换为字符串
   * 
   * @returns 字符串表示
   */
  toString(): string {
    return this.value.toString();
  }

  /**
   * 转换为JSON
   * 
   * @returns JSON表示
   */
  toJSON(): string {
    return this.value.toJSON();
  }

  /**
   * 检查是否相等
   * 
   * @param other 另一个工作流ID
   * @returns 是否相等
   */
  equals(other: WorkflowId): boolean {
    return this.value.equals(other.value);
  }

  /**
   * 哈希值
   * 
   * @returns 哈希值
   */
  hashCode(): number {
    return this.value.hashCode();
  }

  /**
   * 比较两个工作流ID
   * 
   * @param other 另一个工作流ID
   * @returns 比较结果
   */
  compareTo(other: WorkflowId): number {
    return this.value.compareTo(other.value);
  }

  /**
   * 检查是否为空工作流ID
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.value.isEmpty();
  }

  /**
   * 创建空工作流ID
   * 
   * @returns 空工作流ID
   */
  static empty(): WorkflowId {
    return new WorkflowId(ID.empty());
  }

  /**
   * 检查是否为空工作流ID
   * 
   * @param workflowId 工作流ID
   * @returns 是否为空
   */
  static isEmpty(workflowId: WorkflowId): boolean {
    return workflowId.isEmpty();
  }

  /**
   * 获取ID的短表示
   * 
   * @returns 短表示
   */
  toShort(): string {
    return this.value.toShort();
  }

  /**
   * 克隆工作流ID
   * 
   * @returns 新工作流ID
   */
  clone(): WorkflowId {
    return new WorkflowId(this.value.clone());
  }

  /**
   * 获取工作流ID的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `WorkflowId(${this.value.toDebugString()})`;
  }
}