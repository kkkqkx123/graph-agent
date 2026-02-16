/**
 * 线程状态类型定义
 */

/**
 * 线程状态
 */
export type ThreadStatus =
  /** 已创建 */
  'CREATED' |
  /** 正在运行 */
  'RUNNING' |
  /** 已暂停 */
  'PAUSED' |
  /** 已完成 */
  'COMPLETED' |
  /** 已失败 */
  'FAILED' |
  /** 已取消 */
  'CANCELLED' |
  /** 超时 */
  'TIMEOUT';

/**
 * 线程类型
 */
export type ThreadType =
  /** 主线程 */
  'MAIN' |
  /** FORK/JOIN子线程 */
  'FORK_JOIN' |
  /** Triggered子工作流线程 */
  'TRIGGERED_SUBWORKFLOW' |
  /** 动态子线程 */
  'DYNAMIC_CHILD';