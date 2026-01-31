/**
 * 传输协议抽象层
 * 定义各种传输协议的统一接口
 * 主要用于MCP工具
 */

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';

/**
 * 传输响应接口
 */
export interface TransportResponse<T = any> {
  data: T;
  status?: number;
  headers?: Record<string, string>;
  requestId?: string;
}

/**
 * 传输选项接口
 */
export interface TransportOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  timeout?: number;
  stream?: boolean;
}

/**
 * 传输协议接口
 */
export interface Transport {
  execute<T = any>(url: string, options?: TransportOptions): Promise<TransportResponse<T>>;
  executeStream?(url: string, options?: TransportOptions): AsyncIterable<any>;
}

/**
 * HTTP传输实现
 */
export class HttpTransport implements Transport {
  constructor(
    private baseUrl?: string,
    private defaultHeaders?: Record<string, string>,
    private timeout?: number
  ) { }

  async execute<T = any>(url: string, options?: TransportOptions): Promise<TransportResponse<T>> {
    // 构建完整URL
    let fullUrl = url;
    if (this.baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
      const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
      const cleanUrl = url.replace(/^\//, '');
      fullUrl = `${cleanBaseUrl}/${cleanUrl}`;
    }

    // 添加查询参数
    if (options?.query) {
      const queryString = new URLSearchParams(
        Object.entries(options.query)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString();

      fullUrl += `?${queryString}`;
    }

    // 合并请求头
    const headers = {
      ...(this.defaultHeaders || {}),
      ...(options?.headers || {})
    };

    // 创建AbortController用于超时
    const controller = new AbortController();
    const timeoutId = options?.timeout || this.timeout
      ? setTimeout(() => controller.abort(), options?.timeout || this.timeout)
      : null;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET', // Simplified for example, could extend to support other methods
        headers,
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 如果请求流式响应，返回流
      if (options?.stream) {
        return {
          data: response.body as T,
          status: response.status,
          headers: this.headersToObject(response.headers),
          requestId: response.headers.get('x-request-id') || undefined,
        };
      }

      // 解析响应
      const contentType = response.headers.get('content-type');
      let data: T;
      if (contentType && contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        headers: this.headersToObject(response.headers),
        requestId: response.headers.get('x-request-id') || undefined,
      };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 将Headers转换为对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
}

/**
 * SSE传输实现
 */
export class SseTransport implements Transport {
  constructor(
    private baseUrl?: string,
    private defaultHeaders?: Record<string, string>,
    private timeout?: number
  ) { }

  async execute<T = any>(url: string, options?: TransportOptions): Promise<TransportResponse<T>> {
    // 对于SSE，我们返回一个可迭代的流
    const fullUrl = this.buildFullUrl(url, options?.query);
    const headers = {
      Accept: 'text/event-stream, text/plain, */*',
      ...(this.defaultHeaders || {}),
      ...(options?.headers || {})
    };

    const response = await fetch(fullUrl, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      data: response.body as T,
      status: response.status,
      headers: this.headersToObject(response.headers),
      requestId: response.headers.get('x-request-id') || undefined,
    };
  }

  async *executeStream(url: string, options?: TransportOptions): AsyncIterable<any> {
    const fullUrl = this.buildFullUrl(url, options?.query);
    const headers = {
      Accept: 'text/event-stream, text/plain, */*',
      ...(this.defaultHeaders || {}),
      ...(options?.headers || {})
    };

    const response = await fetch(fullUrl, {
      headers,
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 将新数据添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 按行分割缓冲区内容
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ''; // 保留不完整的最后一行

        // 处理每一行
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            // 这是SSE数据行
            const data = line.substring(6); // 移除 "data: " 前缀

            if (data === '[DONE]' || data.trim() === '') {
              // 特殊标记表示流结束或空行
              continue;
            }

            try {
              // 尝试解析JSON数据
              yield JSON.parse(data);
            } catch (e) {
              // 如果不是JSON，作为普通字符串处理
              yield data;
            }
          }
          // 其他SSE字段如 event:, id:, retry: 可以在这里处理
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer.trim());
        } catch (e) {
          yield buffer.trim();
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 构建完整URL
   */
  private buildFullUrl(url: string, query?: Record<string, string | number | boolean>): string {
    let fullUrl = url;

    if (this.baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
      const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
      const cleanUrl = url.replace(/^\//, '');
      fullUrl = `${cleanBaseUrl}/${cleanUrl}`;
    }

    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(query)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString();

      fullUrl += `?${queryString}`;
    }

    return fullUrl;
  }

  /**
   * 将Headers转换为对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
}

/**
 * MCP工具定义接口
 */
interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

/**
 * MCP工具调用结果接口
 */
interface McpToolResult {
  content: Array<{ text?: string;[key: string]: any }>;
  isError?: boolean;
}

/**
 * MCP客户端类，使用stdio通信
 */
class StdioMcpClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private reader: Readable | null = null;
  private writer: Writable | null = null;
  private sessionId: string | null = null;
  private messageIdCounter = 0;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
  private eventEmitter = new EventEmitter();

  constructor(private serverConfig: { command: string; args: string[]; env?: Record<string, string> }) { }

  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<boolean> {
    try {
      // 启动MCP服务器进程
      this.process = spawn(this.serverConfig.command, this.serverConfig.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.serverConfig.env }
      });

      this.reader = this.process.stdout;
      this.writer = this.process.stdin;

      // 设置错误处理
      this.process.stderr.on('data', (data) => {
        console.error(`MCP Server Error: ${data.toString()}`);
      });

      this.process.on('error', (error) => {
        console.error(`MCP Process Error: ${error.message}`);
      });

      this.process.on('close', (code) => {
        console.log(`MCP Process closed with code: ${code}`);
        this.eventEmitter.emit('close', code);
      });

      // 开始读取消息
      this.startReadingMessages();

      // 初始化会话
      await this.initialize();

      return true;
    } catch (error) {
      console.error(`Failed to connect to MCP server: ${error}`);
      return false;
    }
  }

  /**
   * 开始读取来自MCP服务器的消息
   */
  private startReadingMessages() {
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
            const message = JSON.parse(line.trim());
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
  private handleMessage(message: any) {
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
      this.eventEmitter.emit('notification', message);
    }
  }

  /**
   * 发送消息到MCP服务器
   */
  private sendMessage(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      const message = {
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

    this.sessionId = result.serverInfo?.name || 'unknown';
  }

  /**
   * 列出可用的工具
   */
  async listTools(): Promise<McpToolDefinition[]> {
    const result = await this.sendMessage('tools/list');

    if (result && Array.isArray(result.tools)) {
      return result.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
    }

    return [];
  }

  /**
   * 调用MCP工具
   */
  async callTool(toolName: string, argumentsMap: Record<string, any>): Promise<McpToolResult> {
    const result = await this.sendMessage('tools/call', {
      name: toolName,
      arguments: argumentsMap
    });

    // 根据MCP协议规范处理结果
    return {
      content: result.content || [],
      isError: result.isError || false
    };
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
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
      reject(new Error('Client disconnected'));
    }
    this.pendingRequests.clear();
  }
}

/**
 * Stdio传输实现
 */
export class StdioTransport implements Transport {
  private client: StdioMcpClient | null = null;
  private connectingPromise: Promise<boolean> | null = null;

  constructor(private config: { command: string; args: string[]; env?: Record<string, string> }) { }

  async execute<T = any>(url: string, options?: TransportOptions): Promise<TransportResponse<T>> {
    // 在stdio传输中，URL通常是工具名
    const toolName = url;
    const parameters = options?.query || {}; // 参数通过query传递

    // 确保客户端已连接
    await this.ensureConnected();

    if (!this.client) {
      throw new Error('Failed to connect to MCP server');
    }

    // 调用MCP工具
    const result = await this.client.callTool(toolName, parameters);

    return {
      data: result as T,
      requestId: 'stdio-transport'
    };
  }

  /**
   * 确保客户端已连接
   */
  private async ensureConnected(): Promise<void> {
    if (this.client) {
      return; // 已经连接
    }

    // 防止并发连接尝试
    if (this.connectingPromise) {
      await this.connectingPromise;
      return;
    }

    this.connectingPromise = this.connect();
    await this.connectingPromise;
    this.connectingPromise = null;
  }

  /**
   * 连接到MCP服务器
   */
  private async connect(): Promise<boolean> {
    this.client = new StdioMcpClient(this.config);
    const connected = await this.client.connect();

    if (!connected) {
      this.client = null;
      return false;
    }

    return true;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }
}