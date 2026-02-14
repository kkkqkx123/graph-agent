/**
 * MCP Stdio传输实现
 * 通过stdio与MCP服务器通信
 */

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';
import type { IMcpTransport, McpServerConfig, McpSessionInfo, McpMessage, McpSessionState } from '../types';
import { McpSessionState as SessionState } from '../types';
import { NetworkError, ConfigurationError } from '@modular-agent/types';

/**
 * Stdio传输实现
 */
export class StdioTransport extends EventEmitter implements IMcpTransport {
  private process: ChildProcessWithoutNullStreams | null = null;
  private reader: Readable | null = null;
  private writer: Writable | null = null;
  private sessionId: string | null = null;
  private messageIdCounter = 0;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
  private state: McpSessionState = SessionState.DISCONNECTED;
  private connectedAt: Date | null = null;
  private lastActivityAt: Date | null = null;
  private isDisposed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(private config: McpServerConfig) {
    super();
  }

  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<boolean> {
    if (this.isDisposed) {
      throw new NetworkError('Transport has been disposed');
    }

    if (this.state === SessionState.CONNECTED || this.state === SessionState.READY) {
      return true;
    }

    this.state = SessionState.CONNECTING;

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
        console.error(`MCP Server Error [${this.config.name}]: ${data.toString()}`);
        this.emit('error', new Error(data.toString()));
      });

      this.process.on('error', (error) => {
        console.error(`MCP Process Error [${this.config.name}]: ${error.message}`);
        this.state = SessionState.ERROR;
        this.emit('error', error);
      });

      this.process.on('close', (code) => {
        console.log(`MCP Process closed [${this.config.name}] with code: ${code}`);
        this.state = SessionState.DISCONNECTED;
        this.emit('close', code);
        
        // 尝试自动重连
        if (!this.isDisposed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        }
      });

      // 开始读取消息
      this.startReadingMessages();

      // 初始化会话
      await this.initialize();

      this.state = SessionState.READY;
      this.connectedAt = new Date();
      this.lastActivityAt = new Date();
      this.reconnectAttempts = 0;

      return true;
    } catch (error) {
      this.state = SessionState.ERROR;
      console.error(`Failed to connect to MCP server [${this.config.name}]: ${error}`);
      await this.cleanup();
      return false;
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
            const message: McpMessage = JSON.parse(line.trim());
            this.handleMessage(message);
          } catch (error) {
            console.error(`Failed to parse MCP message: ${error}`);
          }
        }
      }
    });
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: McpMessage): void {
    this.lastActivityAt = new Date();

    if (message.id !== undefined) {
      // 这是一个响应消息
      const request = this.pendingRequests.get(message.id);
      if (request) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          request.reject(new Error(message.error.message || 'Unknown error'));
        } else {
          request.resolve(message.result);
        }
      }
    } else {
      // 这可能是一个通知或其他消息
      this.emit('notification', message);
    }
  }

  /**
   * 发送消息到MCP服务器
   */
  async sendMessage(method: string, params?: any): Promise<any> {
    if (this.isDisposed) {
      throw new NetworkError('Transport has been disposed');
    }

    if (this.state !== SessionState.READY) {
      throw new NetworkError(`Transport is not ready. Current state: ${this.state}`);
    }

    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      const message: McpMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      if (!this.writer) {
        reject(new Error('Writer not available'));
        return;
      }

      this.pendingRequests.set(id, { resolve, reject });

      try {
        this.writer.write(JSON.stringify(message) + '\n');
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  /**
   * 初始化MCP会话
   */
  private async initialize(): Promise<void> {
    this.state = SessionState.INITIALIZING;

    // 发送初始化请求
    const result = await this.sendMessage('initialize', {
      protocolVersion: '2.0',
      capabilities: {
        experimental: {},
        tools: {
          listChanged: false
        }
      }
    });

    this.sessionId = result.serverInfo?.name || this.config.name;

    // 发送initialized通知
    await this.sendMessage('notifications/initialized', {});
  }

  /**
   * 列出可用的工具
   */
  async listTools(): Promise<any[]> {
    if (this.state !== SessionState.READY) {
      throw new NetworkError('Session is not ready');
    }

    const result = await this.sendMessage('tools/list');

    if (result && Array.isArray(result.tools)) {
      return result.tools;
    }

    return [];
  }

  /**
   * 调用MCP工具
   */
  async callTool(toolName: string, argumentsMap: Record<string, any>): Promise<any> {
    if (this.state !== SessionState.READY) {
      throw new NetworkError('Session is not ready');
    }

    const result = await this.sendMessage('tools/call', {
      name: toolName,
      arguments: argumentsMap
    });

    return result;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.state === SessionState.DISCONNECTED) {
      return;
    }

    await this.cleanup();
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    if (this.writer) {
      try {
        // 发送退出通知
        this.writer.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/exit'
        }) + '\n');
      } catch (error) {
        console.error('Error sending exit notification:', error);
      }
    }

    if (this.process) {
      this.process.kill();
    }

    // 清理待处理的请求
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new NetworkError('Client disconnected'));
    }
    this.pendingRequests.clear();

    this.state = SessionState.DISCONNECTED;
    this.sessionId = null;
    this.connectedAt = null;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state === SessionState.READY;
  }

  /**
   * 获取会话信息
   */
  getSessionInfo(): McpSessionInfo | null {
    if (!this.sessionId) {
      return null;
    }

    return {
      sessionId: this.sessionId,
      serverName: this.config.name,
      state: this.state,
      connectedAt: this.connectedAt || undefined,
      lastActivityAt: this.lastActivityAt || undefined
    };
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    this.isDisposed = true;
    await this.disconnect();
    this.removeAllListeners();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (this.state !== SessionState.READY) {
      return false;
    }

    try {
      // 发送ping请求
      await this.sendMessage('ping', {});
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}