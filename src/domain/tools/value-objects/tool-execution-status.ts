/**
 * 工具执行状态值对象
 *
 * 表示工具执行的状态
 */
export class ToolExecutionStatus {
  /**
   * 状态值
   */
  readonly value: string;

  /**
   * 状态常量
   */
  static readonly PENDING = new ToolExecutionStatus('pending');
  static readonly RUNNING = new ToolExecutionStatus('running');
  static readonly COMPLETED = new ToolExecutionStatus('completed');
  static readonly FAILED = new ToolExecutionStatus('failed');
  static readonly CANCELLED = new ToolExecutionStatus('cancelled');
  static readonly TIMEOUT = new ToolExecutionStatus('timeout');

  /**
   * 所有有效状态
   */
  private static readonly VALID_STATUSES = [
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'timeout',
  ];

  /**
   * 构造函数
   *
   * @param value 状态值
   */
  constructor(value: string) {
    if (!ToolExecutionStatus.isValid(value)) {
      throw new Error(`Invalid tool execution status: ${value}`);
    }

    this.value = value;
  }

  /**
   * 检查状态值是否有效
   *
   * @param value 状态值
   * @returns 是否有效
   */
  static isValid(value: string): boolean {
    return ToolExecutionStatus.VALID_STATUSES.includes(value);
  }

  /**
   * 从字符串创建工具执行状态
   *
   * @param value 字符串值
   * @returns 工具执行状态
   */
  static fromString(value: string): ToolExecutionStatus {
    return new ToolExecutionStatus(value);
  }

  /**
   * 检查是否为待执行状态
   *
   * @returns 是否为待执行状态
   */
  isPending(): boolean {
    return this.value === ToolExecutionStatus.PENDING.value;
  }

  /**
   * 检查是否为运行中状态
   *
   * @returns 是否为运行中状态
   */
  isRunning(): boolean {
    return this.value === ToolExecutionStatus.RUNNING.value;
  }

  /**
   * 检查是否为已完成状态
   *
   * @returns 是否为已完成状态
   */
  isCompleted(): boolean {
    return this.value === ToolExecutionStatus.COMPLETED.value;
  }

  /**
   * 检查是否为失败状态
   *
   * @returns 是否为失败状态
   */
  isFailed(): boolean {
    return this.value === ToolExecutionStatus.FAILED.value;
  }

  /**
   * 检查是否为已取消状态
   *
   * @returns 是否为已取消状态
   */
  isCancelled(): boolean {
    return this.value === ToolExecutionStatus.CANCELLED.value;
  }

  /**
   * 检查是否为超时状态
   *
   * @returns 是否为超时状态
   */
  isTimeout(): boolean {
    return this.value === ToolExecutionStatus.TIMEOUT.value;
  }

  /**
   * 检查是否为进行中状态（待执行或运行中）
   *
   * @returns 是否为进行中状态
   */
  isInProgress(): boolean {
    return this.isPending() || this.isRunning();
  }

  /**
   * 检查是否为终止状态（已完成、失败、已取消或超时）
   *
   * @returns 是否为终止状态
   */
  isTerminated(): boolean {
    return this.isCompleted() || this.isFailed() || this.isCancelled() || this.isTimeout();
  }

  /**
   * 检查是否为成功状态（已完成）
   *
   * @returns 是否为成功状态
   */
  isSuccessful(): boolean {
    return this.isCompleted();
  }

  /**
   * 检查是否为错误状态（失败、已取消或超时）
   *
   * @returns 是否为错误状态
   */
  isError(): boolean {
    return this.isFailed() || this.isCancelled() || this.isTimeout();
  }

  /**
   * 检查是否可以重试
   *
   * @returns 是否可以重试
   */
  canRetry(): boolean {
    return this.isFailed() || this.isTimeout();
  }

  /**
   * 检查是否可以取消
   *
   * @returns 是否可以取消
   */
  canCancel(): boolean {
    return this.isPending() || this.isRunning();
  }

  /**
   * 获取状态的显示名称
   *
   * @returns 显示名称
   */
  getDisplayName(): string {
    switch (this.value) {
      case 'pending':
        return '待执行';
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      case 'timeout':
        return '超时';
      default:
        return this.value;
    }
  }

  /**
   * 获取状态的描述
   *
   * @returns 描述
   */
  getDescription(): string {
    switch (this.value) {
      case 'pending':
        return '工具执行已排队，等待开始';
      case 'running':
        return '工具正在执行中';
      case 'completed':
        return '工具执行成功完成';
      case 'failed':
        return '工具执行失败';
      case 'cancelled':
        return '工具执行被取消';
      case 'timeout':
        return '工具执行超时';
      default:
        return '未知状态';
    }
  }

  /**
   * 获取状态的颜色代码
   *
   * @returns 颜色代码
   */
  getColorCode(): string {
    switch (this.value) {
      case 'pending':
        return '#6c757d'; // 灰色
      case 'running':
        return '#007bff'; // 蓝色
      case 'completed':
        return '#28a745'; // 绿色
      case 'failed':
        return '#dc3545'; // 红色
      case 'cancelled':
        return '#fd7e14'; // 橙色
      case 'timeout':
        return '#6f42c1'; // 紫色
      default:
        return '#6c757d'; // 默认灰色
    }
  }

  /**
   * 获取状态图标
   *
   * @returns 图标名称
   */
  getIcon(): string {
    switch (this.value) {
      case 'pending':
        return 'clock';
      case 'running':
        return 'play-circle';
      case 'completed':
        return 'check-circle';
      case 'failed':
        return 'x-circle';
      case 'cancelled':
        return 'stop-circle';
      case 'timeout':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  }

  /**
   * 获取所有有效的工具执行状态
   *
   * @returns 所有有效的工具执行状态
   */
  static getAllStatuses(): ToolExecutionStatus[] {
    return ToolExecutionStatus.VALID_STATUSES.map(value => new ToolExecutionStatus(value));
  }

  /**
   * 获取进行中的状态（待执行和运行中）
   *
   * @returns 进行中的状态
   */
  static getInProgressStatuses(): ToolExecutionStatus[] {
    return [ToolExecutionStatus.PENDING, ToolExecutionStatus.RUNNING];
  }

  /**
   * 获取终止状态（已完成、失败、已取消和超时）
   *
   * @returns 终止状态
   */
  static getTerminatedStatuses(): ToolExecutionStatus[] {
    return [
      ToolExecutionStatus.COMPLETED,
      ToolExecutionStatus.FAILED,
      ToolExecutionStatus.CANCELLED,
      ToolExecutionStatus.TIMEOUT,
    ];
  }

  /**
   * 获取成功状态（已完成）
   *
   * @returns 成功状态
   */
  static getSuccessStatuses(): ToolExecutionStatus[] {
    return [ToolExecutionStatus.COMPLETED];
  }

  /**
   * 获取错误状态（失败、已取消和超时）
   *
   * @returns 错误状态
   */
  static getErrorStatuses(): ToolExecutionStatus[] {
    return [ToolExecutionStatus.FAILED, ToolExecutionStatus.CANCELLED, ToolExecutionStatus.TIMEOUT];
  }

  /**
   * 获取可重试状态（失败和超时）
   *
   * @returns 可重试状态
   */
  static getRetryableStatuses(): ToolExecutionStatus[] {
    return [ToolExecutionStatus.FAILED, ToolExecutionStatus.TIMEOUT];
  }

  /**
   * 获取可取消状态（待执行和运行中）
   *
   * @returns 可取消状态
   */
  static getCancellableStatuses(): ToolExecutionStatus[] {
    return [ToolExecutionStatus.PENDING, ToolExecutionStatus.RUNNING];
  }

  /**
   * 转换为字符串
   *
   * @returns 字符串表示
   */
  toString(): string {
    return this.value;
  }

  /**
   * 转换为JSON
   *
   * @returns JSON表示
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * 检查是否相等
   *
   * @param other 另一个工具执行状态
   * @returns 是否相等
   */
  equals(other: ToolExecutionStatus): boolean {
    return this.value === other.value;
  }

  /**
   * 哈希值
   *
   * @returns 哈希值
   */
  hashCode(): number {
    return this.value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
}
