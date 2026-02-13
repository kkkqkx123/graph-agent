/**
 * LLM类型定义
 * 定义LLM配置文件（Profile），支持独立配置和复用
 */

import type { ToolSchema } from './tool';
import type { ID, Timestamp, Metadata } from './common';

/**
 * LLM提供商枚举
 */
export enum LLMProvider {
  /** OpenAI Chat API */
  OPENAI_CHAT = 'OPENAI_CHAT',
  /** OpenAI Response API */
  OPENAI_RESPONSE = 'OPENAI_RESPONSE',
  /** Anthropic */
  ANTHROPIC = 'ANTHROPIC',
  /** Gemini Native API */
  GEMINI_NATIVE = 'GEMINI_NATIVE',
  /** Gemini OpenAI Compatible API */
  GEMINI_OPENAI = 'GEMINI_OPENAI',
  /** 人工中继 */
  HUMAN_RELAY = 'HUMAN_RELAY'
}

/**
 * LLM配置文件类型，用于独立配置和复用
 */
export interface LLMProfile {
  /** Profile唯一标识符 */
  id: ID;
  /** Profile名称 */
  name: string;
  /** LLM提供商 */
  provider: LLMProvider;
  /** 模型名称 */
  model: string;
  /** API密钥 */
  apiKey: string;
  /** 可选的基础URL（用于第三方API渠道） */
  baseUrl?: string;
  /** 模型参数对象（temperature、maxTokens等，不强制类型） */
  parameters: Record<string, any>;
  /** 自定义HTTP请求头（用于第三方API渠道） */
  headers?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 可选的元数据 */
  metadata?: Metadata;
}

/**
 * LLM消息角色
 */
export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * LLM工具调用类型
 */
export interface LLMToolCall {
  /** 工具调用ID */
  id: ID;
  /** 类型（function） */
  type: 'function';
  /** 函数调用信息 */
  function: {
    /** 函数名称 */
    name: string;
    /** 函数参数（JSON字符串） */
    arguments: string;
  };
}

/**
 * LLM消息类型
 */
export interface LLMMessage {
  /** 角色（system、user、assistant、tool） */
  role: LLMMessageRole;
  /** 消息内容（字符串或对象） */
  content: string | any[];
  /** 思考内容（Extended Thinking，仅用于assistant角色） */
  thinking?: string;
  /** 工具调用数组（assistant角色） */
  toolCalls?: LLMToolCall[];
  /** 工具调用ID（tool角色） */
  toolCallId?: string;
}

/**
 * LLM请求类型
 */
export interface LLMRequest {
  /** 引用的LLM Profile ID（可选，如果不提供则使用默认配置） */
  profileId?: ID;
  /** 消息数组 */
  messages: LLMMessage[];
  /** 请求参数对象（覆盖Profile中的parameters） */
  parameters?: Record<string, any>;
  /** 可用的工具定义 */
  tools?: ToolSchema[];
  /** 是否流式传输 */
  stream?: boolean;
  /** AbortSignal 用于中断请求 */
  signal?: AbortSignal;
}

/**
 * LLM Token使用类型
 */
export interface LLMUsage {
  /** 提示token数 */
  promptTokens: number;
  /** 完成token数 */
  completionTokens: number;
  /** 总token数 */
  totalTokens: number;
  /** 提示token成本（可选） */
  promptTokensCost?: number;
  /** 完成token成本（可选） */
  completionTokensCost?: number;
  /** 总成本（可选） */
  totalCost?: number;
}

/**
 * Token使用历史记录
 * 记录每次API调用的详细token使用情况
 */
export interface TokenUsageHistory {
  /** 请求ID */
  requestId: string;
  /** 时间戳 */
  timestamp: number;
  /** 提示token数 */
  promptTokens: number;
  /** 完成token数 */
  completionTokens: number;
  /** 总token数 */
  totalTokens: number;
  /** 成本（可选） */
  cost?: number;
  /** 模型名称（可选） */
  model?: string;
  /** 原始usage数据 */
  rawUsage?: LLMUsage;
}

/**
 * Token使用统计
 * 包含单次API调用的token使用信息
 */
export interface TokenUsageStats {
  /** 提示 Token 数 */
  promptTokens: number;
  /** 完成 Token 数 */
  completionTokens: number;
  /** 总 Token 数 */
  totalTokens: number;
  /** 原始 API 响应的详细信息 */
  rawUsage?: any;
}

/**
 * Token使用统计信息
 * 提供历史记录的统计分析
 */
export interface TokenUsageStatistics {
  /** 总请求数 */
  totalRequests: number;
  /** 平均token数 */
  averageTokens: number;
  /** 最大token数 */
  maxTokens: number;
  /** 最小token数 */
  minTokens: number;
  /** 总成本 */
  totalCost: number;
  /** 总提示token数 */
  totalPromptTokens: number;
  /** 总完成token数 */
  totalCompletionTokens: number;
}

/**
 * LLM响应结果类型（整合choices和finishReason）
 */
export interface LLMResult {
  /** 响应ID */
  id: ID;
  /** 模型名称 */
  model: string;
  /** 响应内容文本 */
  content: string;
  /** 完整的LLMMessage对象 */
  message: LLMMessage;
  /** 工具调用数组 */
  toolCalls?: LLMToolCall[];
  /** Token使用情况 */
  usage?: LLMUsage;
  /** 完成原因 */
  finishReason: string;
  /** 响应时间（毫秒） */
  duration: Timestamp;
  /** 响应元数据 */
  metadata?: Metadata;
}

/**
 * LLM客户端接口
 */
export interface LLMClient {
  /**
   * 非流式生成
   */
  generate(request: LLMRequest): Promise<LLMResult>;

  /**
   * 流式生成
   */
  generateStream(request: LLMRequest): AsyncIterable<LLMResult>;
}

/**
 * LLM客户端配置类型
 */
export interface LLMClientConfig {
  /** LLM提供商 */
  provider: LLMProvider;
  /** API密钥 */
  apiKey: string;
  /** 基础URL */
  baseUrl?: string;
  /** 超时时间 */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟 */
  retryDelay?: number;
}

/**
 * 消息标记映射
 * 维护消息索引的映射关系，支持多次压缩和回退
 */
export interface MessageMarkMap {
  /** 消息原始索引列表 */
  originalIndices: number[];
  /** 按类型分组的索引列表 */
  typeIndices: {
    system: number[];
    user: number[];
    assistant: number[];
    tool: number[];
  };
  /** 修改边界索引数组（记录被压缩/修改的消息的原始索引。第0个索引默认填上） */
  batchBoundaries: number[];
  /** 边界对应批次数组（记录每个边界是哪个batch的开始，允许重新使用旧的batch） */
  boundaryToBatch: number[];
  /** 当前批次 */
  currentBatch: number;
}

/**
 * 上下文压缩配置
 */
export interface ContextCompressionConfig {
  /** 是否启用压缩 */
  enabled: boolean;
  /** 压缩阈值（token 数量） */
  threshold: number;
  /** 压缩后的目标 token 数量 */
  targetTokens: number;
}

/**
 * 上下文压缩策略接口
 */
export interface CompressionStrategy {
  /**
   * 压缩消息
   * @param messages 消息数组
   * @param markMap 标记映射
   * @param config 压缩配置
   * @returns 压缩后的消息数组和新的标记映射
   */
  compress(
    messages: LLMMessage[],
    markMap: MessageMarkMap,
    config: ContextCompressionConfig
  ): Promise<{
    messages: LLMMessage[];
    markMap: MessageMarkMap;
  }>;
}

/**
 * 上下文修改操作类型
 */
export type ContextModificationOperation =
  | 'insert'      // 插入消息
  | 'delete'      // 删除消息
  | 'replace'     // 替换消息
  | 'compress'    // 压缩消息
  | 'batch_start' // 开始新批次
  | 'batch_end';  // 结束批次

/**
 * 上下文修改配置
 */
export interface ContextModificationConfig {
  /** 操作类型 */
  operation: ContextModificationOperation;
  /** 消息索引数组 */
  indices: number[];
  /** 操作数据（用于 insert 和 replace） */
  data?: LLMMessage | LLMMessage[];
  /** 批次号（用于 batch_start 和 batch_end） */
  batch?: number;
}

// ============================================================================
// 统一消息操作接口（批次感知）
// ============================================================================

/**
 * 消息操作上下文
 * 包含完整的消息状态信息
 */
export interface MessageOperationContext {
  /** 完整的消息数组（包含已压缩和可见消息） */
  messages: LLMMessage[];
  /** 消息标记映射 */
  markMap: MessageMarkMap;
  /** 操作选项 */
  options?: MessageOperationOptions;
}

/**
 * 消息操作选项
 */
export interface MessageOperationOptions {
  /** 是否只操作可见消息（默认true） */
  visibleOnly?: boolean;
  /** 是否自动创建新批次（默认false） */
  autoCreateBatch?: boolean;
  /** 批次ID（用于指定操作的批次） */
  batchId?: number;
}

/**
 * 消息操作配置基础接口
 */
export interface MessageOperationConfig {
  /** 操作类型 */
  operation: string;
}

/**
 * 截断操作配置（批次感知）
 */
export interface TruncateMessageOperation extends MessageOperationConfig {
  operation: 'TRUNCATE';
  /** 保留前N条可见消息 */
  keepFirst?: number;
  /** 保留后N条可见消息 */
  keepLast?: number;
  /** 删除前N条可见消息 */
  removeFirst?: number;
  /** 删除后N条可见消息 */
  removeLast?: number;
  /** 保留可见消息的索引范围 [start, end) */
  range?: { start: number; end: number };
  /** 按角色过滤后再截断 */
  role?: LLMMessageRole;
  /** 截断后是否开始新批次 */
  createNewBatch?: boolean;
}

/**
 * 插入操作配置（批次感知）
 */
export interface InsertMessageOperation extends MessageOperationConfig {
  operation: 'INSERT';
  /** 插入位置（相对于可见消息的索引，-1表示末尾） */
  position: number;
  /** 要插入的消息数组 */
  messages: LLMMessage[];
  /** 插入后是否开始新批次 */
  createNewBatch?: boolean;
}

/**
 * 替换操作配置（批次感知）
 */
export interface ReplaceMessageOperation extends MessageOperationConfig {
  operation: 'REPLACE';
  /** 要替换的可见消息索引 */
  index: number;
  /** 新的消息内容 */
  message: LLMMessage;
  /** 替换后是否开始新批次 */
  createNewBatch?: boolean;
}

/**
 * 清空操作配置（批次感知）
 */
export interface ClearMessageOperation extends MessageOperationConfig {
  operation: 'CLEAR';
  /** 是否保留系统消息 */
  keepSystemMessage?: boolean;
  /** 是否保留工具描述消息 */
  keepToolDescription?: boolean;
  /** 清空后是否开始新批次 */
  createNewBatch?: boolean;
}

/**
 * 过滤操作配置（批次感知）
 */
export interface FilterMessageOperation extends MessageOperationConfig {
  operation: 'FILTER';
  /** 按角色过滤 */
  roles?: LLMMessageRole[];
  /** 按内容关键词过滤（包含指定关键词的消息） */
  contentContains?: string[];
  /** 按内容关键词排除（不包含指定关键词的消息） */
  contentExcludes?: string[];
  /** 过滤后是否开始新批次 */
  createNewBatch?: boolean;
}

/**
 * 批次管理操作配置
 */
export interface BatchManagementOperation extends MessageOperationConfig {
  operation: 'BATCH_MANAGEMENT';
  /** 批次操作类型 */
  batchOperation: 'START_NEW_BATCH' | 'ROLLBACK_TO_BATCH' | 'MERGE_BATCHES';
  /** 目标批次ID（用于回退或合并） */
  targetBatchId?: number;
  /** 边界索引（用于开始新批次） */
  boundaryIndex?: number;
}

/**
 * 消息操作结果
 */
export interface MessageOperationResult {
  /** 操作后的完整消息数组 */
  messages: LLMMessage[];
  /** 更新后的消息标记映射 */
  markMap: MessageMarkMap;
  /** 操作影响的可见消息索引 */
  affectedVisibleIndices?: number[];
  /** 新创建的批次ID（如果有） */
  newBatchId?: number;
  /** 操作统计信息 */
  stats?: {
    originalMessageCount: number;
    visibleMessageCount: number;
    compressedMessageCount: number;
  };
}