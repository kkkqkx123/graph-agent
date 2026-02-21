/**
 * 工具配置类型（类型特定）
 */

/**
 * 工具配置类型（类型特定）
 */
export type ToolConfig =
  | StatelessToolConfig
  | StatefulToolConfig
  | RestToolConfig
  | McpToolConfig;

/**
 * 无状态工具配置
 */
export interface StatelessToolConfig {
  /** 执行函数 */
  execute: (parameters: Record<string, any>) => Promise<any>;
  /** 版本 */
  version?: string;
  /** 描述 */
  description?: string;
}

/**
 * 有状态工具工厂
 */
export interface StatefulToolFactory {
  /** 创建工具实例 */
  create(): any;
}

/**
 * 有状态工具配置
 */
export interface StatefulToolConfig {
  /** 工厂函数 */
  factory: StatefulToolFactory;
}

/**
 * REST工具配置
 */
export interface RestToolConfig {
  /** 基础URL */
  baseUrl?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * MCP工具配置
 */
export interface McpToolConfig {
  /** 服务器名称 */
  serverName: string;
  /** 传输类型：stdio 或 http */
  transportType?: 'stdio' | 'http';
  /** 服务器URL（用于 http 传输） */
  serverUrl?: string;
  /** 命令（用于 stdio 传输） */
  command?: string;
  /** 命令参数（用于 stdio 传输） */
  args?: string[];
  /** 环境变量（用于 stdio 传输） */
  env?: Record<string, string>;
  /** 工作目录（用于 stdio 传输） */
  cwd?: string;
  /** 会话ID（用于 http 传输） */
  sessionId?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用熔断器 */
  enableCircuitBreaker?: boolean;
  /** 是否启用限流器 */
  enableRateLimiter?: boolean;
}