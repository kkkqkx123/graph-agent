/**
 * Thread类型定义
 * 定义工作流执行线程的结构（执行实例）
 * Thread包含完整的图结构信息，使其成为自包含的执行单元
 */

import type { ID, Timestamp, Version, Metadata, VariableScope } from './common';
import type { Graph } from './graph';
import type { WorkflowConfig, WorkflowMetadata } from './workflow';
import type { GraphAnalysisResult } from './graph';
import type { PreprocessValidationResult, SubgraphMergeLog } from './workflow';

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
 * 线程元数据类型
 */
export interface ThreadMetadata {
  /** 创建者 */
  creator?: string;
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Metadata;
  /** 父线程ID（用于fork场景） */
  parentThreadId?: ID;
  /** 子线程ID数组（用于fork场景） */
  childThreadIds?: ID[];
  
  /** 工作流配置快照 */
  workflowConfig?: WorkflowConfig;
  /** 工作流元数据快照 */
  workflowMetadata?: WorkflowMetadata;
  /** 图分析结果（仅预处理路径） */
  graphAnalysis?: GraphAnalysisResult;
  /** 预处理验证结果（仅预处理路径） */
  preprocessValidation?: PreprocessValidationResult;
  /** 子图合并日志（仅预处理路径） */
  subgraphMergeLogs?: SubgraphMergeLog[];
  /** 拓扑排序结果（仅预处理路径） */
  topologicalOrder?: ID[];
  /** 构建路径标识 */
  buildPath?: 'processed' | 'definition';
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
  /**
   * 执行数据（用于追踪和调试）
   *
   * 说明：记录节点执行时的相关数据
   * - 用于执行追踪和调试
   * - 不参与表达式解析
   * - 可选字段，某些节点类型可能不需要
   * - Hook 可以修改此字段（可选操作）
   *
   * 示例：
   * - TOOL 节点：包含工具调用参数和结果
   * - CODE 节点：包含脚本执行结果
   * - LOOP 节点：包含循环状态信息
   * - ROUTE 节点：包含路由决策信息
   *
   * 注意：此字段与 Thread.output 不同
   * - NodeExecutionResult.data: 单个节点的执行数据（用于追踪）
   * - Thread.output: 整个工作流的最终输出（用于返回结果）
   */
  data?: any;
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
    /** 子图作用域栈 - 支持嵌套子图 */
    subgraph: Record<string, any>[];
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
   * 注意：此字段与 NodeExecutionResult.data 的区别
   * - Thread.output: 整个工作流的最终输出
   * - NodeExecutionResult.data: 单个节点的执行数据
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
  /** 线程元数据 */
  metadata?: ThreadMetadata;
  /** 上下文数据（用于存储 Conversation 等实例） */
  contextData?: Record<string, any>;
  /** 暂停标志（运行时控制）*/
  shouldPause?: boolean;
  /** 停止标志（运行时控制）*/
  shouldStop?: boolean;
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
  /** 用户交互处理器 */
  userInteractionHandler?: any;
}

/**
 * 线程执行结果类型
 */
export interface ThreadResult {
  /** 线程ID */
  threadId: ID;
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  output: Record<string, any>;
  /** 错误信息（如果有） */
  error?: any;
  /** 执行时间（毫秒） */
  executionTime: Timestamp;
  /** 节点执行结果数组 */
  nodeResults: NodeExecutionResult[];
  /** 执行元数据 */
  metadata?: Metadata;
}