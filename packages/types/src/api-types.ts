/**
 * API类型定义
 * 定义SDK API层使用的过滤器和摘要类型
 */

import type { ID, Timestamp } from './common';
import type { WorkflowStatus } from './workflow';
import type { ThreadStatus } from './thread';
import type { ToolType } from './tool';
import type { ScriptType } from './code';
import type { CheckpointTriggerType } from './checkpoint';
import type { EventType } from './events';

// ============================================================================
// SDK配置类型
// ============================================================================

/**
 * SDK选项
 */
export interface SDKOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 检查点存储配置 */
  checkpointStorage?: any;
  /** 是否启用验证 */
  enableValidation?: boolean;
}

/**
 * SDK依赖项
 */
export interface SDKDependencies {
  /** 工作流注册表 */
  workflowRegistry?: any;
  /** 线程注册表 */
  threadRegistry?: any;
  /** 工具注册表 */
  toolRegistry?: any;
  /** 脚本注册表 */
  scriptRegistry?: any;
  /** 事件管理器 */
  eventManager?: any;
  /** 检查点存储 */
  checkpointStorage?: any;
}

// ============================================================================
// 过滤器类型
// ============================================================================

/**
 * 工作流过滤器
 */
export interface WorkflowFilter {
  /** 工作流ID列表 */
  ids?: ID[];
  /** 工作流名称（支持模糊匹配） */
  name?: string;
  /** 工作流状态 */
  status?: WorkflowStatus;
  /** 标签数组 */
  tags?: string[];
  /** 作者 */
  author?: string;
  /** 分类 */
  category?: string;
  /** 版本 */
  version?: string;
  /** 创建时间范围 */
  createdAtRange?: { start?: Timestamp; end?: Timestamp };
  /** 更新时间范围 */
  updatedAtRange?: { start?: Timestamp; end?: Timestamp };
}

/**
 * 线程过滤器
 */
export interface ThreadFilter {
  /** 线程ID列表 */
  ids?: ID[];
  /** 工作流ID */
  workflowId?: ID;
  /** 线程状态 */
  status?: ThreadStatus;
  /** 线程类型 */
  threadType?: 'MAIN' | 'FORK_JOIN' | 'TRIGGERED_SUBWORKFLOW';
  /** 创建时间范围 */
  createdAtRange?: { start?: Timestamp; end?: Timestamp };
  /** 更新时间范围 */
  updatedAtRange?: { start?: Timestamp; end?: Timestamp };
}

/**
 * 工具过滤器
 */
export interface ToolFilter {
  /** 工具ID列表 */
  ids?: ID[];
  /** 工具名称（支持模糊匹配） */
  name?: string;
  /** 工具类型 */
  type?: ToolType;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 工具选项
 */
export interface ToolOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用指数退避 */
  exponentialBackoff?: boolean;
  /** 最大重试次数（别名） */
  maxRetries?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 工具测试结果
 */
export interface ToolTestResult {
  /** 工具ID */
  toolId: ID;
  /** 工具名称 */
  toolName: string;
  /** 测试是否成功 */
  success: boolean;
  /** 测试结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 测试时间戳 */
  timestamp: Timestamp;
}

/**
 * 脚本过滤器
 */
export interface ScriptFilter {
  /** 脚本ID列表 */
  ids?: ID[];
  /** 脚本名称（支持模糊匹配） */
  name?: string;
  /** 脚本类型 */
  type?: ScriptType;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 脚本选项
 */
export interface ScriptOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 工作目录 */
  workingDirectory?: string;
  /** 环境变量 */
  environment?: Record<string, string>;
  /** 是否启用沙箱 */
  sandbox?: boolean;
}

/**
 * 脚本测试结果
 */
export interface ScriptTestResult {
  /** 脚本ID */
  scriptId: ID;
  /** 脚本名称 */
  scriptName: string;
  /** 测试是否成功 */
  success: boolean;
  /** 标准输出 */
  stdout?: string;
  /** 标准错误 */
  stderr?: string;
  /** 退出码 */
  exitCode?: number;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 测试时间戳 */
  timestamp: Timestamp;
}

/**
 * 脚本执行日志
 */
export interface ScriptExecutionLog {
  /** 日志ID */
  id: ID;
  /** 脚本ID */
  scriptId: ID;
  /** 脚本名称 */
  scriptName: string;
  /** 执行是否成功 */
  success: boolean;
  /** 标准输出 */
  stdout?: string;
  /** 标准错误 */
  stderr?: string;
  /** 退出码 */
  exitCode?: number;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息 */
  error?: string;
  /** 执行时间戳 */
  timestamp: Timestamp;
}

/**
 * 脚本统计信息
 */
export interface ScriptStatistics {
  /** 脚本ID */
  scriptId: ID;
  /** 脚本名称 */
  scriptName: string;
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime?: Timestamp;
  /** 成功率 */
  successRate: number;
}

/**
 * 脚本注册配置
 */
export interface ScriptRegistrationConfig {
  /** 脚本ID */
  id?: ID;
  /** 脚本名称 */
  name: string;
  /** 脚本类型 */
  type: ScriptType;
  /** 脚本描述 */
  description: string;
  /** 脚本内容（内联代码） */
  content?: string;
  /** 脚本文件路径（外部文件） */
  filePath?: string;
  /** 脚本执行选项 */
  options?: any;
  /** 脚本元数据 */
  metadata?: any;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 脚本批量执行配置
 */
export interface ScriptBatchExecutionConfig {
  /** 脚本ID列表 */
  scriptIds: ID[];
  /** 执行选项（覆盖脚本默认选项） */
  options?: any;
  /** 是否并行执行 */
  parallel?: boolean;
  /** 并行执行时的最大并发数 */
  maxConcurrency?: number;
}

/**
 * 事件过滤器
 */
export interface EventFilter {
  /** 事件ID列表 */
  ids?: ID[];
  /** 事件类型 */
  eventType?: EventType;
  /** 线程ID */
  threadId?: ID;
  /** 工作流ID */
  workflowId?: ID;
  /** 节点ID */
  nodeId?: ID;
  /** 创建时间范围 */
  timestampRange?: { start?: Timestamp; end?: Timestamp };
}

/**
 * 检查点过滤器
 */
export interface CheckpointFilter {
  /** 检查点ID列表 */
  ids?: ID[];
  /** 线程ID */
  threadId?: ID;
  /** 工作流ID */
  workflowId?: ID;
  /** 触发类型 */
  triggerType?: CheckpointTriggerType;
  /** 创建者 */
  creator?: string;
  /** 标签数组 */
  tags?: string[];
  /** 创建时间范围 */
  timestampRange?: { start?: Timestamp; end?: Timestamp };
  /** 开始时间（从） */
  startTimeFrom?: Timestamp;
  /** 开始时间（到） */
  startTimeTo?: Timestamp;
}

/**
 * 检查点摘要
 */
export interface CheckpointSummary {
  /** 检查点ID */
  id: ID;
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 线程状态 */
  threadStatus: ThreadStatus;
  /** 当前节点ID */
  currentNodeId: ID;
  /** 创建时间戳 */
  timestamp: Timestamp;
  /** 检查点描述 */
  description?: string;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 变量更新选项
 */
export interface VariableUpdateOptions {
  /** 是否覆盖已存在的变量 */
  overwrite?: boolean;
  /** 是否验证变量值 */
  validate?: boolean;
  /** 是否触发事件 */
  triggerEvent?: boolean;
}

/**
 * 变量过滤器
 */
export interface VariableFilter {
  /** 变量名称（支持模糊匹配） */
  name?: string;
  /** 变量作用域 */
  scope?: 'global' | 'thread' | 'subgraph' | 'loop';
  /** 变量类型 */
  type?: string;
  /** 线程ID */
  threadId?: ID;
  /** 工作流ID */
  workflowId?: ID;
}

/**
 * 节点模板过滤器
 */
export interface NodeTemplateFilter {
  /** 模板名称（支持模糊匹配） */
  name?: string;
  /** 节点类型 */
  nodeType?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 触发器过滤器
 */
export interface TriggerFilter {
  /** 触发器ID列表 */
  ids?: ID[];
  /** 触发器名称（支持模糊匹配） */
  name?: string;
  /** 工作流ID */
  workflowId?: ID;
  /** 是否启用 */
  enabled?: boolean;
}

// ============================================================================
// 摘要类型
// ============================================================================

/**
 * 工作流摘要
 */
export interface WorkflowSummary {
  /** 工作流ID */
  id: ID;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 工作流状态 */
  status: WorkflowStatus;
  /** 版本 */
  version: string;
  /** 节点数量 */
  nodeCount: number;
  /** 边数量 */
  edgeCount: number;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 标签数组 */
  tags?: string[];
  /** 分类 */
  category?: string;
}

/**
 * 线程摘要
 */
export interface ThreadSummary {
  /** 线程ID */
  id: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 工作流名称 */
  workflowName: string;
  /** 线程状态 */
  status: ThreadStatus;
  /** 线程类型 */
  threadType?: 'MAIN' | 'FORK_JOIN' | 'TRIGGERED_SUBWORKFLOW';
  /** 当前节点ID */
  currentNodeId: ID;
  /** 开始时间 */
  startTime: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 执行时间（毫秒） */
  executionTime?: number;
  /** 错误数量 */
  errorCount: number;
}