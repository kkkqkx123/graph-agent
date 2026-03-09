/**
 * AgentLoopState - Agent Loop 执行状态管理器
 *
 * 管理 Agent Loop 执行过程中的临时状态，与持久化数据分离。
 * 参考 ExecutionState 的设计模式。
 *
 * 注意：快照功能已移至 snapshot/agent-loop-snapshot.ts
 */

import { now } from '@modular-agent/common-utils';
import { AgentLoopStatus, type ToolCallRecord, type IterationRecord } from '@modular-agent/types';

// 重新导出类型以保持向后兼容
export { AgentLoopStatus, type ToolCallRecord, type IterationRecord } from '@modular-agent/types';

/**
 * AgentLoopState - Agent Loop 执行状态管理器
 *
 * 核心职责：
 * - 管理执行状态转换
 * - 记录迭代和工具调用历史
 *
 * 设计原则：
 * - 与持久化数据分离
 * - 生命周期与执行周期绑定
 * - 纯状态管理，不包含业务逻辑
 * - 快照功能由 AgentLoopSnapshotManager 提供
 */
export class AgentLoopState {
  /** 当前状态 */
  private _status: AgentLoopStatus = AgentLoopStatus.CREATED;

  /** 当前迭代次数 */
  private _currentIteration: number = 0;

  /** 工具调用总次数 */
  private _toolCallCount: number = 0;

  /** 迭代历史记录 */
  private _iterationHistory: IterationRecord[] = [];

  /** 当前迭代记录 */
  private _currentIterationRecord: IterationRecord | null = null;

  /** 开始时间 */
  private _startTime: number | null = null;

  /** 结束时间 */
  private _endTime: number | null = null;

  /** 错误信息 */
  private _error: any = null;

  /** 暂停标志 */
  private _shouldPause: boolean = false;

  /** 停止标志 */
  private _shouldStop: boolean = false;

  /**
   * 获取当前状态
   */
  get status(): AgentLoopStatus {
    return this._status;
  }

  /**
   * 设置状态
   */
  set status(value: AgentLoopStatus) {
    this._status = value;
  }

  /**
   * 获取当前迭代次数
   */
  get currentIteration(): number {
    return this._currentIteration;
  }

  /**
   * 获取工具调用总次数
   */
  get toolCallCount(): number {
    return this._toolCallCount;
  }

  /**
   * 获取开始时间
   */
  get startTime(): number | null {
    return this._startTime;
  }

  /**
   * 获取结束时间
   */
  get endTime(): number | null {
    return this._endTime;
  }

  /**
   * 获取错误信息
   */
  get error(): any {
    return this._error;
  }

  /**
   * 获取迭代历史
   */
  get iterationHistory(): IterationRecord[] {
    return [...this._iterationHistory];
  }

  /**
   * 检查是否应该暂停
   */
  shouldPause(): boolean {
    return this._shouldPause;
  }

  /**
   * 设置暂停标志
   */
  setShouldPause(value: boolean): void {
    this._shouldPause = value;
  }

  /**
   * 检查是否应该停止
   */
  shouldStop(): boolean {
    return this._shouldStop;
  }

  /**
   * 设置停止标志
   */
  setShouldStop(value: boolean): void {
    this._shouldStop = value;
  }

  /**
   * 开始执行
   */
  start(): void {
    this._status = AgentLoopStatus.RUNNING;
    this._startTime = now();
  }

  /**
   * 开始新迭代
   */
  startIteration(): void {
    this._currentIteration++;
    this._currentIterationRecord = {
      iteration: this._currentIteration,
      startTime: now(),
      toolCalls: [],
    };
  }

  /**
   * 结束当前迭代
   * @param responseContent LLM 响应内容
   */
  endIteration(responseContent?: string): void {
    if (this._currentIterationRecord) {
      this._currentIterationRecord.endTime = now();
      this._currentIterationRecord.responseContent = responseContent;
      this._iterationHistory.push(this._currentIterationRecord);
      this._currentIterationRecord = null;
    }
  }

  /**
   * 记录工具调用开始
   * @param id 工具调用 ID
   * @param name 工具名称
   * @param args 调用参数
   */
  recordToolCallStart(id: string, name: string, args: any): ToolCallRecord {
    const record: ToolCallRecord = {
      id,
      name,
      arguments: args,
      startTime: now(),
    };

    if (this._currentIterationRecord) {
      this._currentIterationRecord.toolCalls.push(record);
    }

    return record;
  }

  /**
   * 记录工具调用结束
   * @param id 工具调用 ID
   * @param result 执行结果
   * @param error 错误信息
   */
  recordToolCallEnd(id: string, result?: any, error?: string): void {
    if (this._currentIterationRecord) {
      const record = this._currentIterationRecord.toolCalls.find(tc => tc.id === id);
      if (record) {
        record.endTime = now();
        record.result = result;
        record.error = error;
      }
    }
    this._toolCallCount++;
  }

  /**
   * 暂停执行
   */
  pause(): void {
    this._status = AgentLoopStatus.PAUSED;
    this._shouldPause = false;
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this._status = AgentLoopStatus.RUNNING;
    this._shouldPause = false;
  }

  /**
   * 完成执行
   */
  complete(): void {
    this._status = AgentLoopStatus.COMPLETED;
    this._endTime = now();
  }

  /**
   * 执行失败
   * @param error 错误信息
   */
  fail(error: any): void {
    this._status = AgentLoopStatus.FAILED;
    this._error = error;
    this._endTime = now();
  }

  /**
   * 取消执行
   */
  cancel(): void {
    this._status = AgentLoopStatus.CANCELLED;
    this._endTime = now();
  }

  /**
   * 中断执行
   * @param type 中断类型
   */
  interrupt(type: 'PAUSE' | 'STOP'): void {
    if (type === 'PAUSE') {
      this._shouldPause = true;
    } else {
      this._shouldStop = true;
    }
  }

  /**
   * 重置中断标志
   */
  resetInterrupt(): void {
    this._shouldPause = false;
    this._shouldStop = false;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this._iterationHistory = [];
    this._currentIterationRecord = null;
    this._error = null;
  }

  /**
   * 克隆状态
   */
  clone(): AgentLoopState {
    const cloned = new AgentLoopState();
    cloned._status = this._status;
    cloned._currentIteration = this._currentIteration;
    cloned._toolCallCount = this._toolCallCount;
    cloned._startTime = this._startTime;
    cloned._endTime = this._endTime;
    cloned._error = this._error;
    cloned._shouldPause = this._shouldPause;
    cloned._shouldStop = this._shouldStop;
    cloned._iterationHistory = this._iterationHistory.map(record => ({
      ...record,
      toolCalls: record.toolCalls.map(tc => ({ ...tc })),
    }));
    return cloned;
  }
}
