/**
 * Thread类型定义
 * 定义工作流执行线程的结构（执行实例）
 * Thread包含完整的图结构信息，使其成为自包含的执行单元
 */

import type { ID, Timestamp, Version, Metadata, VariableScope } from './common';
import type { Graph } from './graph';

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

/**
 * FORK/JOIN上下文
 * 用于FORK/JOIN场景的线程关系管理
 */
export interface ForkJoinContext {
  /** Fork操作ID */
  forkId: string;
  /** Fork路径ID（用于Join时识别主线程） */
  forkPathId: string;
}

/**
 * Triggered子工作流上下文
 * 用于Triggered子工作流场景的线程关系管理
 */
export interface TriggeredSubworkflowContext {
  /** 父线程ID */
  parentThreadId: ID;
  /** 子线程ID数组 */
  childThreadIds: ID[];
  /** 触发的子工作流ID */
  triggeredSubworkflowId: ID;
}

/**
 * 线程变量类型
 */
export interface ThreadVariable {
  /** 变量名称 */
  name: string;
  /** 变量值 */
  value: any;
  /** 变量类型 */
  type: string;
  /** 变量作用域 */
  scope: VariableScope;
  /** 是否只读 */
  readonly: boolean;
  /** 变量元数据 */
  metadata?: Metadata;
}

/**
 * 节点执行结果类型
 */
export interface NodeExecutionResult {
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
  /** 执行状态 */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  /** 执行步骤序号 */
  step: number;
  /** 错误信息 */
  error?: any;
  /** 执行时间（毫秒） */
  executionTime?: Timestamp;
  /** 开始时间 */
  startTime?: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 时间戳 */
  timestamp?: Timestamp;
}

/**
 * 执行历史条目类型
 */
export interface ExecutionHistoryEntry {
  /** 执行步骤序号 */
  step: number;
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
  /** 执行状态 */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  /** 时间戳 */
  timestamp: Timestamp;
  /** 执行数据（用于追踪和调试） */
  data?: any;
  /** 错误信息 */
  error?: any;
}

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
  /** 工作流图结构（使用 Graph 接口） */
  graph: Graph;
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

/**
 * 线程执行选项类型
 */
export interface ThreadOptions {
  /** 输入数据对象 */
  input?: Record<string, any>;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** Token 限制阈值 */
  tokenLimit?: number;
  /** 节点执行完成回调 */
  onNodeExecuted?: (result: NodeExecutionResult) => void | Promise<void>;
  /** 工具调用回调 */
  onToolCalled?: (toolName: string, parameters: any) => void | Promise<void>;
  /** 错误回调 */
  onError?: (error: any) => void | Promise<void>;
}

/**
 * 线程执行结果类型
 *
 * 设计原则：
 * - 使用 status 字段表示执行状态，而非冗余的 success 字段
 * - 错误通过 errors 数组存储，metadata 中提供错误计数
 * - 调用方通过 status 判断成功/失败
 */
export interface ThreadResult {
  /** 线程ID */
  threadId: ID;
  /** 输出数据 */
  output: Record<string, any>;
  /** 执行时间（毫秒） */
  executionTime: Timestamp;
  /** 节点执行结果数组 */
  nodeResults: NodeExecutionResult[];
  /** 执行元数据 */
  metadata: ThreadResultMetadata;
}

/**
 * 线程执行结果元数据
 */
export interface ThreadResultMetadata {
  /** 线程状态 */
  status: ThreadStatus;
  /** 开始时间 */
  startTime: Timestamp;
  /** 结束时间 */
  endTime: Timestamp;
  /** 执行时间（毫秒） */
  executionTime: Timestamp;
  /** 节点数量 */
  nodeCount: number;
  /** 错误数量 */
  errorCount: number;
}