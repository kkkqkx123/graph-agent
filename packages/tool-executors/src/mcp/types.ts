/**
 * MCP执行器类型定义
 */

/**
 * MCP工具定义接口
 */
export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

/**
 * MCP工具调用结果接口
 */
export interface McpToolResult {
  content: Array<{ text?: string;[key: string]: any }>;
  isError?: boolean;
}

/**
 * MCP服务器配置
 */
export interface McpServerConfig {
  /** 服务器名称 */
  name: string;
  /** 传输类型 */
  transportType?: 'stdio' | 'http';
  /** 命令（用于 stdio 传输） */
  command: string;
  /** 命令参数（用于 stdio 传输） */
  args: string[];
  /** 环境变量（用于 stdio 传输） */
  env?: Record<string, string>;
  /** 工作目录（用于 stdio 传输） */
  cwd?: string;
  /** 服务器URL（用于 http 传输） */
  serverUrl?: string;
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

/**
 * MCP会话状态
 */
export type McpSessionState =
  | 'DISCONNECTED' /** 已断开连接 */
  | 'CONNECTING'   /** 连接中 */
  | 'CONNECTED'    /** 已连接 */
  | 'INITIALIZING' /** 初始化中 */
  | 'READY'        /** 就绪 */
  | 'ERROR';       /** 错误 */

/**
 * MCP会话信息
 */
export interface McpSessionInfo {
  /** 会话ID */
  sessionId: string;
  /** 服务器名称 */
  serverName: string;
  /** 会话状态 */
  state: McpSessionState;
  /** 连接时间 */
  connectedAt?: Date;
  /** 最后活动时间 */
  lastActivityAt?: Date;
  /** 错误信息 */
  error?: string;
}

/**
 * MCP消息接口
 */
export interface McpMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP传输层接口
 */
export interface IMcpTransport {
  /** 连接到MCP服务器 */
  connect(): Promise<boolean>;
  /** 断开连接 */
  disconnect(): Promise<void>;
  /** 发送消息 */
  sendMessage(method: string, params?: any): Promise<any>;
  /** 调用MCP工具 */
  callTool(toolName: string, parameters: Record<string, any>): Promise<any>;
  /** 检查是否已连接 */
  isConnected(): boolean;
  /** 获取会话信息 */
  getSessionInfo(): McpSessionInfo | null;
  /** 释放资源 */
  dispose(): Promise<void>;
}