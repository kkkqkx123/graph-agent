/**
 * MCP Stdio传输实现
 * 通过stdio与MCP服务器通信
 */

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';
import type { IMcpTransport } from './types.js';
import type { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse, RequestId } from '../types-protocol.js';
import { NetworkError } from '@modular-agent/types';
import { logger as pkgLogger } from '../../index.js';

const logger = pkgLogger.child('mcp-transport-stdio');

/**
 * Stdio传输配置
 */
export interface StdioTransportConfig {
  /** 服务器名称 */
  name: string;
  /** 命令 */
  command: string;
  /** 命令参数 */
  args: string[];
  /** 环境变量 */
  env?: Record<string, string>;
  /** 工作目录 */
  cwd?: string;
}

/**
 * Stdio传输实现
 */
export class StdioTransport extends EventEmitter implements IMcpTransport {
  private process: ChildProcessWithoutNullStreams | null = null;
  private reader: Readable | null = null;
  private writer: Writable | null = null;
  private messageIdCounter = 0;
  private pendingRequests = new Map<RequestId, {
    resolve: (value: JSONRPCResponse) => void;
    reject: (error: Error) => void;
  }>();
  private isStarted = false;
  private isClosed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;
  setProtocolVersion?: (version: string) => void;

  constructor(private config: StdioTransportConfig) {
    super();
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

    logger.info('Starting Stdio transport', { name: this.config.name });

    try {
      // 启动MCP服务器进程
      this.process = spawn(this.config.command, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.config.env },
        cwd: this.config.cwd
      });

      this.reader = this.process.stdout;
      this.writer = this.process.stdin;

      // 设置错误处理
      this.process.stderr.on('data', (data) => {
        logger.error(`MCP Server Error [${this.config.name}]: ${data.toString()}`);
        this.onerror?.(new Error(data.toString()));
      });

      this.process.on('error', (error) => {
        logger.error(`MCP Process Error [${this.config.name}]: ${error.message}`);
        this.onerror?.(error);
      });

      this.process.on('close', (code) => {
        logger.info(`MCP Process closed [${this.config.name}] with code: ${code}`);
        this.handleConnectionError(new NetworkError('Process closed'));
      });

      // 开始读取消息
      this.startReadingMessages();

      this.isStarted = true;

      logger.info('Stdio transport started');
    } catch (error) {
      logger.error('Failed to start Stdio transport', { error });
      throw error;
    }
  }

  /**
   * 开始读取来自MCP服务器的消息
   */
  private startReadingMessages(): void {
    if (!this.reader) return;

    let buffer = '';
    this.reader.on('data', (chunk) => {
      buffer += chunk.toString();

      // 按行分割消息
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留未完成的行

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message: JSONRPCMessage = JSON.parse(line.trim());
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse MCP message', { error, line });
          }
        }
      }
    });
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
      this.sendRequest(message);

      // 等待响应
      return responsePromise.then(() => {
        // 响应已在 handleMessage 中处理
      });
    }

    // 发送通知消息
    this.sendRequest(message);
  }

  /**
   * 发送请求到进程
   */
  private sendRequest(message: JSONRPCMessage): void {
    if (!this.writer) {
      throw new Error('Writer not available');
    }

    try {
      this.writer.write(JSON.stringify(message) + '\n');
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

    logger.info('Closing Stdio transport');

    this.isClosed = true;
    this.isStarted = false;

    // 清理待处理的请求
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new NetworkError('Transport closed'));
    }
    this.pendingRequests.clear();

    // 清理进程
    if (this.writer) {
      try {
        this.writer.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/exit'
        }) + '\n');
      } catch (error) {
        logger.error('Error sending exit notification', { error });
      }
    }

    if (this.process) {
      this.process.kill();
    }

    // 通知关闭
    this.onclose?.();

    logger.info('Stdio transport closed');
  }

  /**
   * 生成下一个消息 ID
   */
  private generateId(): RequestId {
    return ++this.messageIdCounter;
  }
}