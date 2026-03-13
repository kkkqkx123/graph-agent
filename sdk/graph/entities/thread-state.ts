/**
 * ThreadState - Thread 执行状态管理器
 *
 * 管理 Thread 执行过程中的临时状态，与持久化数据分离。
 * 参考 AgentLoopState 的设计模式。
 */

import { now } from '@modular-agent/common-utils';
import type { ThreadStatus } from '@modular-agent/types';

/**
 * ThreadState - Thread 执行状态管理器
 *
 * 核心职责：
 * - 管理执行状态转换
 * - 管理中断控制标志
 *
 * 设计原则：
 * - 与持久化数据分离
 * - 生命周期与执行周期绑定
 * - 纯状态管理，不包含业务逻辑
 */
export class ThreadState {
  /** 当前状态 */
  private _status: ThreadStatus = 'CREATED';

  /** 暂停标志 */
  private _shouldPause: boolean = false;

  /** 停止标志 */
  private _shouldStop: boolean = false;

  /** 开始时间 */
  private _startTime: number | null = null;

  /** 结束时间 */
  private _endTime: number | null = null;

  /** 错误信息 */
  private _error: any = null;

  /**
   * 获取当前状态
   */
  get status(): ThreadStatus {
    return this._status;
  }

  /**
   * 设置状态
   */
  set status(value: ThreadStatus) {
    this._status = value;
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
    this._status = 'RUNNING';
    this._startTime = now();
  }

  /**
   * 暂停执行
   */
  pause(): void {
    this._status = 'PAUSED';
    this._shouldPause = false;
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this._status = 'RUNNING';
    this._shouldPause = false;
  }

  /**
   * 完成执行
   */
  complete(): void {
    this._status = 'COMPLETED';
    this._endTime = now();
  }

  /**
   * 执行失败
   * @param error 错误信息
   */
  fail(error: any): void {
    this._status = 'FAILED';
    this._error = error;
    this._endTime = now();
  }

  /**
   * 取消执行
   */
  cancel(): void {
    this._status = 'CANCELLED';
    this._endTime = now();
  }

  /**
   * 超时
   */
  timeout(): void {
    this._status = 'TIMEOUT';
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
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this._status === 'RUNNING';
  }

  /**
   * 检查是否已暂停
   */
  isPaused(): boolean {
    return this._status === 'PAUSED';
  }

  /**
   * 检查是否已完成
   */
  isCompleted(): boolean {
    return this._status === 'COMPLETED';
  }

  /**
   * 检查是否失败
   */
  isFailed(): boolean {
    return this._status === 'FAILED';
  }

  /**
   * 检查是否已取消
   */
  isCancelled(): boolean {
    return this._status === 'CANCELLED';
  }

  /**
   * 检查是否超时
   */
  isTimeout(): boolean {
    return this._status === 'TIMEOUT';
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this._error = null;
  }

  /**
   * 克隆状态
   */
  clone(): ThreadState {
    const cloned = new ThreadState();
    cloned._status = this._status;
    cloned._shouldPause = this._shouldPause;
    cloned._shouldStop = this._shouldStop;
    cloned._startTime = this._startTime;
    cloned._endTime = this._endTime;
    cloned._error = this._error;
    return cloned;
  }
}
