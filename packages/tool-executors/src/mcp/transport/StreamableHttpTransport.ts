/**
 * MCP StreamableHTTP 传输层实现
 * 基于 HttpClient 和 SseTransport
 * 支持 HTTP POST 发送消息和 SSE 接收消息
 */

import { HttpClient, SseTransport } from '@modular-agent/common-utils';
import { NetworkError, TimeoutError } from '@modular-agent/types';
import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  RequestId,
} from '../types-protocol.js';
import type { IMcpTransport, TransportConfig } from './types.js';
import { logger as pkgLogger } from '../../index.js';

const logger = pkgLogger.child('mcp-transport-http');

/**
 * StreamableHTTP 传输层配置
 */
export interface StreamableHttpTransportConfig extends TransportConfig {
  /**
   * 服务器 URL
   */
  url: string;

  /**
   * 会话 ID（可选）
   */
  sessionId?: string;

  /**
   * 自定义请求头
   */
  headers?: Record<string, string>;
}

/**
 * StreamableHTTP 传输层
 * 实现 MCP Streamable HTTP 协议
 */
export class StreamableHttpTransport implements IMcpTransport {
  private httpClient: HttpClient;
  private sseTransport: SseTransport;
  private abortController: AbortController | null = null;
  private pendingRequests = new Map<RequestId, {
    resolve: (value: JSONRPCResponse) => void;
    reject: (error: Error) => void;
  }>();
  private messageIdCounter = 0;
  private isStarted = false;
  private isClosed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;
  setProtocolVersion?: (version: string) => void;

  constructor(config: StreamableHttpTransportConfig) {
    this.sessionId = config.sessionId;

    // 创建 HTTP 客户端
    this.httpClient = new HttpClient({
      baseURL: config.url,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      enableCircuitBreaker: config.enableCircuitBreaker || false,
      enableRateLimiter: config.enableRateLimiter || false,
      defaultHeaders: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      logger: {
        info: (msg, ctx) => logger.info(msg, ctx),
        warn: (msg, ctx) => logger.warn(msg, ctx),
        error: (msg, ctx) => logger.error(msg, ctx),
        debug: (msg, ctx) => logger.debug(msg, ctx),
      },
    });

    // 创建 SSE 传输
    this.sseTransport = new SseTransport(
      config.url,
      {
        'Accept': 'text/event-stream, text/plain, */*',
        ...config.headers,
      },
      config.timeout
    );

    logger.info('StreamableHTTP transport created', {
      url: config.url,
      sessionId: this.sessionId,
    });
  }

  /**
   * 启动传输层
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('Transport already started');
      return;
    }

    if (this.isClosed) {
      throw new NetworkError('Transport has been closed');
    }

    logger.info('Starting StreamableHTTP transport');

    this.abortController = new AbortController();
    this.isStarted = true;

    // 启动 SSE 消息接收
    this.startSseReceiver();

    logger.info('StreamableHTTP transport started');
  }

  /**
   * 启动 SSE 消息接收器
   */
  private async startSseReceiver(): Promise<void> {
    try {
      // 构建 SSE URL
      const sseUrl = this.buildSseUrl();

      logger.debug('Starting SSE receiver', { url: sseUrl });

      // 使用 SseTransport 接收消息
      for await (const message of this.sseTransport.executeStream(sseUrl)) {
        if (this.isClosed) {
          break;
        }

        try {
          const jsonrpcMessage = this.parseSseMessage(message);
          if (jsonrpcMessage) {
            this.handleMessage(jsonrpcMessage);
          }
        } catch (error) {
          logger.error('Failed to parse SSE message', { error, message });
          this.onerror?.(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // SSE 流结束
      if (!this.isClosed) {
        logger.warn('SSE stream ended unexpectedly');
        this.handleConnectionError(new NetworkError('SSE stream ended unexpectedly'));
      }
    } catch (error) {
      logger.error('SSE receiver error', { error });
      this.handleConnectionError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 构建 SSE URL
   */
  private buildSseUrl(): string {
    const url = new URL('', this.httpClient['config'].baseURL || '');
    if (this.sessionId) {
      url.searchParams.set('sessionId', this.sessionId);
    }
    return url.pathname + url.search;
  }

  /**
   * 解析 SSE 消息
   */
  private parseSseMessage(data: any): JSONRPCMessage | null {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: JSONRPCMessage): void {
    logger.debug('Received message', { message });

    // 通知外部监听器
    this.onmessage?.(message);

    // 处理响应消息
    if ('id' in message && ('result' in message || 'error' in message)) {
      const response = message as JSONRPCResponse;
      const pending = this.pendingRequests.get(response.id);

      if (pending) {
        this.pendingRequests.delete(response.id);
        pending.resolve(response);
      }
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: Error): void {
    logger.error('Connection error', { error });

    // 拒绝所有待处理的请求
    for (const [id, { reject }] of this.pendingRequests) {
      reject(error);
    }
    this.pendingRequests.clear();

    // 通知错误
    this.onerror?.(error);

    // 通知关闭
    this.onclose?.();
  }

  /**
   * 发送 JSON-RPC 消息
   */
  async send(message: JSONRPCMessage, options?: any): Promise<void> {
    if (this.isClosed) {
      throw new NetworkError('Transport has been closed');
    }

    if (!this.isStarted) {
      throw new NetworkError('Transport not started. Call start() first.');
    }

    // 如果是请求消息，添加到待处理列表
    if ('id' in message && 'method' in message) {
      const request = message as JSONRPCRequest;

      // 生成响应 Promise
      const responsePromise = new Promise<JSONRPCResponse>((resolve, reject) => {
        this.pendingRequests.set(request.id, { resolve, reject });
      });

      // 发送请求
      await this.sendRequest(request);

      // 等待响应
      return responsePromise.then(() => {
        // 响应已在 handleMessage 中处理
      });
    }

    // 发送通知消息
    await this.sendRequest(message);
  }

  /**
   * 发送 HTTP POST 请求
   */
  private async sendRequest(message: JSONRPCMessage): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }

      await this.httpClient.post('', message, {
        headers,
      });

      logger.debug('Message sent', { message });
    } catch (error) {
      logger.error('Failed to send message', { error, message });
      throw error;
    }
  }

  /**
   * 关闭传输层
   */
  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    logger.info('Closing StreamableHTTP transport');

    this.isClosed = true;
    this.isStarted = false;

    // 取消 SSE 接收
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // 拒绝所有待处理的请求
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new NetworkError('Transport closed'));
    }
    this.pendingRequests.clear();

    // 通知关闭
    this.onclose?.();

    logger.info('StreamableHTTP transport closed');
  }

  /**
   * 生成下一个消息 ID
   */
  private generateId(): RequestId {
    return ++this.messageIdCounter;
  }
}