import { ValueObject } from '../../common/value-objects';
/**
 * 历史类型枚举
 */
export enum HistoryTypeValue {
  WORKFLOW_CREATED = 'workflow_created',
  WORKFLOW_UPDATED = 'workflow_updated',
  WORKFLOW_DELETED = 'workflow_deleted',
  WORKFLOW_EXECUTED = 'workflow_executed',
  WORKFLOW_FAILED = 'workflow_failed',
  WORKFLOW_COMPLETED = 'workflow_completed',
  SESSION_CREATED = 'session_created',
  SESSION_UPDATED = 'session_updated',
  SESSION_DELETED = 'session_deleted',
  SESSION_CLOSED = 'session_closed',
  THREAD_CREATED = 'thread_created',
  THREAD_UPDATED = 'thread_updated',
  THREAD_DELETED = 'thread_deleted',
  THREAD_STARTED = 'thread_started',
  THREAD_PAUSED = 'thread_paused',
  THREAD_RESUMED = 'thread_resumed',
  THREAD_COMPLETED = 'thread_completed',
  THREAD_FAILED = 'thread_failed',
  THREAD_CANCELLED = 'thread_cancelled',
  CHECKPOINT_CREATED = 'checkpoint_created',
  CHECKPOINT_UPDATED = 'checkpoint_updated',
  CHECKPOINT_DELETED = 'checkpoint_deleted',
  CHECKPOINT_RESTORED = 'checkpoint_restored',
  NODE_EXECUTED = 'node_executed',
  NODE_FAILED = 'node_failed',
  EDGE_TRAVERSED = 'edge_traversed',
  TOOL_EXECUTED = 'tool_executed',
  TOOL_FAILED = 'tool_failed',
  LLM_CALLED = 'llm_called',
  LLM_FAILED = 'llm_failed',
  STATE_CHANGED = 'state_changed',
  ERROR_OCCURRED = 'error_occurred',
  WARNING_OCCURRED = 'warning_occurred',
  INFO_OCCURRED = 'info_occurred',
}

/**
 * 历史类型值对象接口
 */
export interface HistoryTypeProps {
  value: HistoryTypeValue;
}

/**
 * 历史类型值对象
 *
 * 用于表示历史记录的类型
 */
export class HistoryType extends ValueObject<HistoryTypeProps> {
  /**
   * 创建工作流相关历史类型
   */
  public static workflowCreated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.WORKFLOW_CREATED });
  }

  public static workflowUpdated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.WORKFLOW_UPDATED });
  }

  public static workflowDeleted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.WORKFLOW_DELETED });
  }

  public static workflowExecuted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.WORKFLOW_EXECUTED });
  }

  public static workflowFailed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.WORKFLOW_FAILED });
  }

  public static workflowCompleted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.WORKFLOW_COMPLETED });
  }

  /**
   * 创建会话相关历史类型
   */
  public static sessionCreated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.SESSION_CREATED });
  }

  public static sessionUpdated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.SESSION_UPDATED });
  }

  public static sessionDeleted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.SESSION_DELETED });
  }

  public static sessionClosed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.SESSION_CLOSED });
  }

  /**
   * 创建线程相关历史类型
   */
  public static threadCreated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_CREATED });
  }

  public static threadUpdated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_UPDATED });
  }

  public static threadDeleted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_DELETED });
  }

  public static threadStarted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_STARTED });
  }

  public static threadPaused(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_PAUSED });
  }

  public static threadResumed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_RESUMED });
  }

  public static threadCompleted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_COMPLETED });
  }

  public static threadFailed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_FAILED });
  }

  public static threadCancelled(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.THREAD_CANCELLED });
  }

  /**
   * 创建检查点相关历史类型
   */
  public static checkpointCreated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.CHECKPOINT_CREATED });
  }

  public static checkpointUpdated(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.CHECKPOINT_UPDATED });
  }

  public static checkpointDeleted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.CHECKPOINT_DELETED });
  }

  public static checkpointRestored(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.CHECKPOINT_RESTORED });
  }

  /**
   * 创建图执行相关历史类型
   */
  public static nodeExecuted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.NODE_EXECUTED });
  }

  public static nodeFailed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.NODE_FAILED });
  }

  public static edgeTraversed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.EDGE_TRAVERSED });
  }

  /**
   * 创建工具相关历史类型
   */
  public static toolExecuted(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.TOOL_EXECUTED });
  }

  public static toolFailed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.TOOL_FAILED });
  }

  /**
   * 创建LLM相关历史类型
   */
  public static llmCalled(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.LLM_CALLED });
  }

  public static llmFailed(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.LLM_FAILED });
  }

  /**
   * 创建状态相关历史类型
   */
  public static stateChanged(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.STATE_CHANGED });
  }

  /**
   * 创建事件相关历史类型
   */
  public static errorOccurred(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.ERROR_OCCURRED });
  }

  public static warningOccurred(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.WARNING_OCCURRED });
  }

  public static infoOccurred(): HistoryType {
    return new HistoryType({ value: HistoryTypeValue.INFO_OCCURRED });
  }

  /**
   * 从字符串创建历史类型
   * @param type 类型字符串
   * @returns 历史类型实例
   */
  public static fromString(type: string): HistoryType {
    if (!Object.values(HistoryTypeValue).includes(type as HistoryTypeValue)) {
      throw new Error(`无效的历史类型: ${type}`);
    }
    return new HistoryType({ value: type as HistoryTypeValue });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): HistoryTypeValue {
    return this.props.value;
  }

  /**
   * 检查是否为工作流相关类型
   * @returns 是否为工作流相关类型
   */
  public isWorkflowRelated(): boolean {
    return this.props.value.startsWith('workflow_');
  }

  /**
   * 检查是否为会话相关类型
   * @returns 是否为会话相关类型
   */
  public isSessionRelated(): boolean {
    return this.props.value.startsWith('session_');
  }

  /**
   * 检查是否为线程相关类型
   * @returns 是否为线程相关类型
   */
  public isThreadRelated(): boolean {
    return this.props.value.startsWith('thread_');
  }

  /**
   * 检查是否为检查点相关类型
   * @returns 是否为检查点相关类型
   */
  public isCheckpointRelated(): boolean {
    return this.props.value.startsWith('checkpoint_');
  }

  /**
   * 检查是否为图执行相关类型
   * @returns 是否为图执行相关类型
   */
  public isWorkflowExecutionRelated(): boolean {
    return (
      this.props.value === HistoryTypeValue.NODE_EXECUTED ||
      this.props.value === HistoryTypeValue.NODE_FAILED ||
      this.props.value === HistoryTypeValue.EDGE_TRAVERSED
    );
  }

  /**
   * 检查是否为工具相关类型
   * @returns 是否为工具相关类型
   */
  public isToolRelated(): boolean {
    return this.props.value.startsWith('tool_');
  }

  /**
   * 检查是否为LLM相关类型
   * @returns 是否为LLM相关类型
   */
  public isLLMRelated(): boolean {
    return this.props.value.startsWith('llm_');
  }

  /**
   * 检查是否为状态相关类型
   * @returns 是否为状态相关类型
   */
  public isStateRelated(): boolean {
    return this.props.value === HistoryTypeValue.STATE_CHANGED;
  }

  /**
   * 检查是否为事件相关类型
   * @returns 是否为事件相关类型
   */
  public isEventRelated(): boolean {
    return this.props.value.endsWith('_occurred');
  }

  /**
   * 检查是否为错误类型
   * @returns 是否为错误类型
   */
  public isErrorType(): boolean {
    return (
      this.props.value.endsWith('_failed') || this.props.value === HistoryTypeValue.ERROR_OCCURRED
    );
  }

  /**
   * 检查是否为警告类型
   * @returns 是否为警告类型
   */
  public isWarningType(): boolean {
    return this.props.value === HistoryTypeValue.WARNING_OCCURRED;
  }

  /**
   * 检查是否为信息类型
   * @returns 是否为信息类型
   */
  public isInfoType(): boolean {
    return this.props.value === HistoryTypeValue.INFO_OCCURRED;
  }

  /**
   * 比较两个历史类型是否相等
   * @param type 另一个历史类型
   * @returns 是否相等
   */
  public override equals(type?: HistoryType): boolean {
    if (type === null || type === undefined) {
      return false;
    }
    return this.props.value === type.getValue();
  }

  /**
   * 验证历史类型的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('历史类型不能为空');
    }

    if (!Object.values(HistoryTypeValue).includes(this.props.value)) {
      throw new Error(`无效的历史类型: ${this.props.value}`);
    }
  }

  /**
   * 获取历史类型的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取历史类型的描述
   * @returns 类型描述
   */
  public getDescription(): string {
    const descriptions: Record<HistoryTypeValue, string> = {
      [HistoryTypeValue.WORKFLOW_CREATED]: '工作流创建',
      [HistoryTypeValue.WORKFLOW_UPDATED]: '工作流更新',
      [HistoryTypeValue.WORKFLOW_DELETED]: '工作流删除',
      [HistoryTypeValue.WORKFLOW_EXECUTED]: '工作流执行',
      [HistoryTypeValue.WORKFLOW_FAILED]: '工作流失败',
      [HistoryTypeValue.WORKFLOW_COMPLETED]: '工作流完成',
      [HistoryTypeValue.SESSION_CREATED]: '会话创建',
      [HistoryTypeValue.SESSION_UPDATED]: '会话更新',
      [HistoryTypeValue.SESSION_DELETED]: '会话删除',
      [HistoryTypeValue.SESSION_CLOSED]: '会话关闭',
      [HistoryTypeValue.THREAD_CREATED]: '线程创建',
      [HistoryTypeValue.THREAD_UPDATED]: '线程更新',
      [HistoryTypeValue.THREAD_DELETED]: '线程删除',
      [HistoryTypeValue.THREAD_STARTED]: '线程启动',
      [HistoryTypeValue.THREAD_PAUSED]: '线程暂停',
      [HistoryTypeValue.THREAD_RESUMED]: '线程恢复',
      [HistoryTypeValue.THREAD_COMPLETED]: '线程完成',
      [HistoryTypeValue.THREAD_FAILED]: '线程失败',
      [HistoryTypeValue.THREAD_CANCELLED]: '线程取消',
      [HistoryTypeValue.CHECKPOINT_CREATED]: '检查点创建',
      [HistoryTypeValue.CHECKPOINT_UPDATED]: '检查点更新',
      [HistoryTypeValue.CHECKPOINT_DELETED]: '检查点删除',
      [HistoryTypeValue.CHECKPOINT_RESTORED]: '检查点恢复',
      [HistoryTypeValue.NODE_EXECUTED]: '节点执行',
      [HistoryTypeValue.NODE_FAILED]: '节点失败',
      [HistoryTypeValue.EDGE_TRAVERSED]: '边遍历',
      [HistoryTypeValue.TOOL_EXECUTED]: '工具执行',
      [HistoryTypeValue.TOOL_FAILED]: '工具失败',
      [HistoryTypeValue.LLM_CALLED]: 'LLM调用',
      [HistoryTypeValue.LLM_FAILED]: 'LLM失败',
      [HistoryTypeValue.STATE_CHANGED]: '状态变更',
      [HistoryTypeValue.ERROR_OCCURRED]: '错误发生',
      [HistoryTypeValue.WARNING_OCCURRED]: '警告发生',
      [HistoryTypeValue.INFO_OCCURRED]: '信息发生',
    };

    return descriptions[this.props.value];
  }
}
