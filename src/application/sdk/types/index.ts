/**
 * Graph Agent SDK 类型定义模块
 *
 * 本模块直接复用 Service 层的配置类型，避免重复定义
 * SDK 特有的类型在此模块中定义
 */

// ============================================================================
// 从 Service 层导入配置类型
// ============================================================================

/**
 * 节点配置类型
 * 从 Service 层的 NodeFactory 导入
 */
export type {
  BaseNodeConfig,
  StartNodeConfig,
  EndNodeConfig,
  LLMNodeConfig,
  ToolCallNodeConfig,
  ConditionNodeConfig,
  DataTransformNodeConfig,
  ContextProcessorNodeConfig,
  NodeConfig,
} from '../../../services/workflow/nodes/node-factory';

/**
 * 工作流配置数据类型
 * 从 Service 层的 ConfigParser 导入
 */
import type {
  WorkflowConfigData,
  EdgeConfig,
  EdgeConditionConfig,
  SubWorkflowReferenceConfig,
} from '../../../services/workflow/config-parser';

/**
 * PromptSource 类型
 * 从 Service 层的 PromptBuilder 导入
 */
import type { PromptSource } from '../../../services/prompts/prompt-builder';

/**
 * WrapperConfig 类型
 * 从 Domain 层的 WrapperReference 导入
 */
import type { WrapperConfig } from '../../../domain/llm/value-objects/wrapper-reference';

// 重新导出类型以供外部使用
export type {
  WorkflowConfigData,
  EdgeConfig,
  EdgeConditionConfig,
  SubWorkflowReferenceConfig,
  PromptSource,
  WrapperConfig,
};

// ============================================================================
// SDK 特有类型定义
// ============================================================================

/**
 * SDK 全局配置接口
 *
 * 用于配置 SDK 的全局行为和默认值
 */
export interface SDKConfig {
  /**
   * 是否启用日志记录
   * @default false
   */
  enableLogging?: boolean;

  /**
   * 默认执行超时时间（毫秒）
   * @default 300000 (5分钟)
   */
  defaultTimeout?: number;

  /**
   * 默认检查点间隔（毫秒）
   * @default 10000 (10秒)
   */
  defaultCheckpointInterval?: number;

  /**
   * 默认最大执行步数
   * @default 1000
   */
  defaultMaxSteps?: number;

  /**
   * 是否启用性能监控
   * @default false
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * 是否启用调试模式
   * @default false
   */
  enableDebugMode?: boolean;
}

/**
 * Thread 执行选项接口
 */
export interface ThreadExecutionOptions {
  /**
   * 是否启用检查点
   * @default false
   */
  enableCheckpoints?: boolean;

  /**
   * 检查点间隔（毫秒）
   * @default 10000
   */
  checkpointInterval?: number;

  /**
   * 执行超时时间（毫秒）
   * @default 300000
   */
  timeout?: number;

  /**
   * 最大执行步数
   * @default 1000
   */
  maxSteps?: number;

  /**
   * 是否启用流式输出
   * @default false
   */
  enableStream?: boolean;

  /**
   * 是否启用错误恢复
   * @default true
   */
  enableErrorRecovery?: boolean;

  /**
   * 自定义执行参数
   */
  customParameters?: Record<string, unknown>;
}

/**
 * Thread 执行配置接口
 *
 * 用于配置工作流线程的执行参数
 */
export interface ThreadConfig {
  /**
   * 线程唯一标识符
   */
  id: string;

  /**
   * 工作流配置
   */
  workflow: WorkflowConfigData;

  /**
   * 输入数据
   * @default {}
   */
  inputData?: Record<string, unknown>;

  /**
   * 执行选项
   */
  options?: ThreadExecutionOptions;
}

/**
 * 工作流执行结果接口
 */
export interface WorkflowExecutionResult {
  /**
   * 执行是否成功
   */
  success: boolean;

  /**
   * 执行结果数据
   */
  result?: Record<string, unknown>;

  /**
   * 执行错误信息
   */
  error?: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };

  /**
   * 执行统计信息
   */
  statistics?: {
    executionTime: number;
    nodesExecuted: number;
    stepsExecuted: number;
    memoryUsage?: number;
  };

  /**
   * 执行元数据
   */
  metadata?: {
    executionId: string;
    workflowId: string;
    startTime: Date;
    endTime: Date;
  };
}

/**
 * Thread 执行结果接口
 */
export interface ThreadExecutionResult {
  /**
   * 执行是否成功
   */
  success: boolean;

  /**
   * 执行结果数据
   */
  result?: Record<string, unknown>;

  /**
   * 执行错误信息
   */
  error?: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };

  /**
   * 检查点列表
   */
  checkpoints?: CheckpointInfo[];

  /**
   * 执行统计信息
   */
  statistics?: {
    executionTime: number;
    nodesExecuted: number;
    stepsExecuted: number;
    checkpointsCreated: number;
    memoryUsage?: number;
  };

  /**
   * 执行元数据
   */
  metadata?: {
    threadId: string;
    workflowId: string;
    executionId: string;
    startTime: Date;
    endTime: Date;
  };
}

/**
 * 检查点信息接口
 */
export interface CheckpointInfo {
  /**
   * 检查点 ID
   */
  id: string;

  /**
   * 检查点创建时间
   */
  timestamp: Date;

  /**
   * 当前执行的节点 ID
   */
  currentNodeId: string;

  /**
   * 当前执行步数
   */
  step: number;

  /**
   * 当前状态数据
   */
  state?: Record<string, unknown>;

  /**
   * 检查点元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /**
   * 验证是否通过
   */
  isValid: boolean;

  /**
   * 错误信息列表
   */
  errors: string[];

  /**
   * 警告信息列表
   */
  warnings: string[];
}

/**
 * 节点位置信息接口
 */
export interface NodePosition {
  /**
   * X 坐标
   */
  x: number;

  /**
   * Y 坐标
   */
  y: number;
}

/**
 * 工作流元数据接口
 */
export interface WorkflowMetadata {
  /**
   * 创建者
   */
  createdBy?: string;

  /**
   * 创建时间
   */
  createdAt?: Date;

  /**
   * 最后修改者
   */
  lastModifiedBy?: string;

  /**
   * 最后修改时间
   */
  lastModifiedAt?: Date;

  /**
   * 版本号
   */
  version?: string;

  /**
   * 自定义元数据
   */
  custom?: Record<string, unknown>;
}

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  /**
   * 执行 ID
   */
  executionId: string;

  /**
   * 工作流 ID
   */
  workflowId: string;

  /**
   * 线程 ID
   */
  threadId?: string;

  /**
   * 当前节点 ID
   */
  currentNodeId?: string;

  /**
   * 当前步数
   */
  currentStep: number;

  /**
   * 变量存储
   */
  variables: Record<string, unknown>;

  /**
   * 开始时间
   */
  startTime: Date;

  /**
   * 执行选项
   */
  options: ThreadExecutionOptions;
}

/**
 * SDK 事件类型
 */
export type SDKEventType =
  | 'workflow.created'
  | 'workflow.executed'
  | 'workflow.failed'
  | 'thread.created'
  | 'thread.started'
  | 'thread.completed'
  | 'thread.failed'
  | 'thread.paused'
  | 'thread.resumed'
  | 'node.started'
  | 'node.completed'
  | 'node.failed'
  | 'checkpoint.created'
  | 'error.occurred';

/**
 * SDK 事件接口
 */
export interface SDKEvent {
  /**
   * 事件类型
   */
  type: SDKEventType;

  /**
   * 事件时间戳
   */
  timestamp: Date;

  /**
   * 事件数据
   */
  data: Record<string, unknown>;

  /**
   * 事件元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * SDK 事件监听器类型
 */
export type SDKEventListener = (event: SDKEvent) => void | Promise<void>;