/**
 * LLM Token使用统计类型定义
 */

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