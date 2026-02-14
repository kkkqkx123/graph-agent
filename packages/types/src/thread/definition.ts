/**
 * 线程定义类型
 */

import type { ID, Timestamp, Version, Metadata } from '../common';
import type { PreprocessedGraph } from '../graph';
import type { ThreadStatus, ThreadType } from './status';
import type { ForkJoinContext, TriggeredSubworkflowContext } from './context';
import type { ThreadVariable } from './variables';
import type { NodeExecutionResult } from './history';

/**
 * 线程定义类型（执行实例）
 * Thread 作为纯数据对象，不包含方法，方法由 ThreadContext 提供
 */
export interface Thread {
  /** 线程唯一标识符 */
  id: ID;
  /** 关联的工作流ID */
  workflowId: ID;
  /** 工作流版本 */
  workflowVersion: Version;
  /** 线程状态 */
  status: ThreadStatus;
  /** 当前执行节点ID */
  currentNodeId: ID;
  /** 预处理后的工作流图结构（使用 PreprocessedGraph 接口） */
  graph: PreprocessedGraph;
  /** 变量数组（用于持久化和元数据） */
  variables: ThreadVariable[];
  /** 四级作用域变量存储 */
  variableScopes: {
    /** 全局作用域 - 多线程共享 */
    global: Record<string, any>;
    /** 线程作用域 - 单线程内部 */
    thread: Record<string, any>;
    /** 本地作用域栈 - 支持嵌套 */
    local: Record<string, any>[];
    /** 循环作用域栈 - 支持嵌套循环 */
    loop: Record<string, any>[];
  };
  /**
   * 输入数据（作为特殊变量，可通过路径访问）
   *
   * 说明：存储工作流的输入数据
   * - 在 START 节点执行时初始化
   * - 可通过表达式解析访问（使用 input. 路径）
   * - 在整个工作流执行过程中保持不变
   * - 用于传递外部输入到工作流
   *
   * 示例：
   * ```typescript
   * thread.input = {
   *   userName: 'Alice',
   *   userAge: 25,
   *   config: { timeout: 5000 }
   * }
   *
   * // 在表达式中访问
   * {{input.userName}}  // 'Alice'
   * {{input.config.timeout}}  // 5000
   * ```
   *
   * 注意：此字段与 variables 的区别
   * - Thread.input: 工作流的初始输入，只读
   * - Thread.variableScopes.thread: 工作流执行过程中的变量，可变
   */
  input: Record<string, any>;
  /**
   * 输出数据（作为特殊变量，可通过路径访问）
   *
   * 说明：存储工作流的最终输出数据
   * - 在 END 节点执行时设置
   * - 可通过表达式解析访问（使用 output. 路径）
   * - 默认为空对象，由 END 节点或最后一个节点填充
   * - 用于返回工作流执行结果
   *
   * 示例：
   * ```typescript
   * thread.output = {
   *   result: 'Task completed',
   *   status: 'success',
   *   data: { count: 10 }
   * }
   *
   * // 在表达式中访问
   * {{output.result}}  // 'Task completed'
   * {{output.data.count}}  // 10
   * ```
   *
   * 注意：此字段与 variables 的区别
   * - Thread.output: 工作流的最终输出，只读
   * - Thread.variableScopes.thread: 工作流执行过程中的变量，可变
   */
  output: Record<string, any>;
  /** 执行历史记录（按执行顺序存储） */
  nodeResults: NodeExecutionResult[];
  /** 开始时间 */
  startTime: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 错误信息数组 */
  errors: any[];
  /** 上下文数据（用于存储 Conversation 等实例） */
  contextData?: Record<string, any>;
  /** 暂停标志（运行时控制）*/
  shouldPause?: boolean;
  /** 停止标志（运行时控制）*/
  shouldStop?: boolean;

  // ========== Thread类型和关系管理 ==========
  /** 线程类型 */
  threadType?: ThreadType;

  /** FORK/JOIN上下文（仅当threadType为FORK_JOIN时存在） */
  forkJoinContext?: ForkJoinContext;

  /** Triggered子工作流上下文（仅当threadType为TRIGGERED_SUBWORKFLOW时存在） */
  triggeredSubworkflowContext?: TriggeredSubworkflowContext;
}