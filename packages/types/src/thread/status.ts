/**
 * 线程状态类型定义
 */

/**
 * 线程状态枚举
 */
export enum ThreadStatus {
  /** 已创建 */
  CREATED = 'CREATED',
  /** 正在运行 */
  RUNNING = 'RUNNING',
  /** 已暂停 */
  PAUSED = 'PAUSED',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 已失败 */
  FAILED = 'FAILED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
  /** 超时 */
  TIMEOUT = 'TIMEOUT'
}

/**
 * 线程类型枚举
 */
export enum ThreadType {
  /** 主线程 */
  MAIN = 'MAIN',
  /** FORK/JOIN子线程 */
  FORK_JOIN = 'FORK_JOIN',
  /** Triggered子工作流线程 */
  TRIGGERED_SUBWORKFLOW = 'TRIGGERED_SUBWORKFLOW'
}