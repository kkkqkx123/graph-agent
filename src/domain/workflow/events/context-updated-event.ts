import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';
import { PromptContext } from '../value-objects/prompt-context';

/**
 * 上下文更新事件数据接口
 */
export interface ContextUpdatedEventData {
  executionId: string;
  workflowId: string;
  threadId: string;
  nodeId?: string;
  updateType: 'variable' | 'prompt' | 'metadata';
  changes: Record<string, unknown>;
  timestamp: string;
}

/**
 * 上下文更新事件
 *
 * 当执行上下文（变量、提示词、元数据）发生变化时触发此事件
 */
export class ContextUpdatedEvent extends DomainEvent {
  private readonly data: ContextUpdatedEventData;

  /**
   * 构造函数
   * @param executionId 执行ID
   * @param workflowId 工作流ID
   * @param threadId 线程ID
   * @param updateType 更新类型
   * @param changes 变更内容
   * @param nodeId 节点ID（可选）
   */
  constructor(
    executionId: ID,
    workflowId: ID,
    threadId: ID,
    updateType: 'variable' | 'prompt' | 'metadata',
    changes: Record<string, unknown>,
    nodeId?: ID
  ) {
    super(executionId);
    this.data = {
      executionId: executionId.toString(),
      workflowId: workflowId.toString(),
      threadId: threadId.toString(),
      nodeId: nodeId?.toString(),
      updateType,
      changes,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'ContextUpdated';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): ContextUpdatedEventData {
    return { ...this.data };
  }

  /**
   * 获取执行ID
   * @returns 执行ID
   */
  public getExecutionId(): string {
    return this.data.executionId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public getWorkflowId(): string {
    return this.data.workflowId;
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public getThreadId(): string {
    return this.data.threadId;
  }

  /**
   * 获取节点ID
   * @returns 节点ID
   */
  public getNodeId(): string | undefined {
    return this.data.nodeId;
  }

  /**
   * 获取更新类型
   * @returns 更新类型
   */
  public getUpdateType(): 'variable' | 'prompt' | 'metadata' {
    return this.data.updateType;
  }

  /**
   * 获取变更内容
   * @returns 变更内容
   */
  public getChanges(): Record<string, unknown> {
    return { ...this.data.changes };
  }

  /**
   * 获取时间戳
   * @returns 时间戳
   */
  public getTimestamp(): string {
    return this.data.timestamp;
  }
}