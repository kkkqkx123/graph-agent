/**
 * MCP 传输层接口定义
 */

import type { JSONRPCMessage, RequestId } from '../types-protocol.js';

/**
 * 传输层接口
 * 所有 MCP 传输层实现必须实现此接口
 */
export interface IMcpTransport {
  /**
   * 启动传输层
   */
  start(): Promise<void>;

  /**
   * 发送 JSON-RPC 消息
   */
  send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;

  /**
   * 关闭传输层
   */
  close(): Promise<void>;

  /**
   * 连接关闭回调
   */
  onclose?: () => void;

  /**
   * 错误回调
   */
  onerror?: (error: Error) => void;

  /**
   * 消息接收回调
   */
  onmessage?: (message: JSONRPCMessage) => void;

  /**
   * 会话 ID
   */
  sessionId?: string;

  /**
   * 设置协议版本
   */
  setProtocolVersion?(version: string): void;
}

/**
 * 传输发送选项
 */
export interface TransportSendOptions {
  /**
   * 关联的请求 ID
   */
  relatedRequestId?: RequestId;

  /**
   * 恢复令牌
   */
  resumptionToken?: string;

  /**
   * 恢复令牌变更回调
   */
  onresumptiontoken?: (token: string) => void;
}

/**
 * 传输层配置
 */
export interface TransportConfig {
  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 最大重试次数
   */
  maxRetries?: number;

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number;

  /**
   * 是否启用熔断器
   */
  enableCircuitBreaker?: boolean;

  /**
   * 是否启用限流器
   */
  enableRateLimiter?: boolean;
}