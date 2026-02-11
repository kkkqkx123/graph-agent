/**
 * MCP协议工具执行器
 * 执行MCP协议工具
 * 目前使用stdio
 */

import type { Tool } from '@modular-agent/types/tool';
import type { McpToolConfig } from '@modular-agent/types/tool';
import type { ThreadContext } from '@modular-agent/types/common';
import { NetworkError, ToolError, ConfigurationError } from '@modular-agent/types/errors';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';
import type { IToolExecutor } from '@modular-agent/types/tool';

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
 * MCP会话类，管理MCP连接和协议交互
 */
class McpSession {
  private process: ChildProcessWithoutNullStreams | null = null;
  private reader: Readable | null = null;
  private writer: Writable | null = null;
  private sessionId: string | null = null;
  private messageIdCounter = 0;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
  private eventEmitter = new EventEmitter();
  private isInitialized = false;
  private cleanupCallbacks: Array<() => Promise<void>> = [];

  constructor(private serverConfig: { command: string; args: string[]; env?: Record<string, string> }) { }

  /**
   * 连接到MCP服务器并初始化会话
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

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error(`Failed to connect to MCP server: ${error}`);
      await this.cleanup();
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

    // 发送initialized通知
    await this.sendMessage('notifications/initialized', {});
  }

  /**
   * 列出可用的工具
   */
  async listTools(): Promise<McpToolDefinition[]> {
    if (!this.isInitialized) {
      throw new Error('Session not initialized');
    }

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
    if (!this.isInitialized) {
      throw new Error('Session not initialized');
    }

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
   * 添加清理回调
   */
  onCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    // 执行所有清理回调
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    }
    this.cleanupCallbacks = [];
  }

  /**
   * 断开连接并清理资源
   */
  async disconnect(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    await this.cleanup();

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

    this.isInitialized = false;
    this.sessionId = null;
  }

  /**
   * 获取会话ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * 检查会话是否已初始化
   */
  isSessionInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Stdio传输实现，使用MCP会话管理连接
 */
class StdioTransport {
  private session: McpSession | null = null;
  private connectingPromise: Promise<boolean> | null = null;
  private isDisposed = false;

  constructor(private config: { command: string; args: string[]; env?: Record<string, string> }) { }

  async execute<T = any>(url: string, options?: any): Promise<{ data: T; requestId?: string }> {
    if (this.isDisposed) {
      throw new Error('Transport has been disposed');
    }

    // 在stdio传输中，URL通常是工具名
    const toolName = url;
    const parameters = options?.query || {}; // 参数通过query传递

    // 确保会话已连接
    await this.ensureConnected();

    if (!this.session || !this.session.isSessionInitialized()) {
      throw new Error('Failed to connect to MCP server');
    }

    // 调用MCP工具
    const result = await this.session.callTool(toolName, parameters);

    return {
      data: result as T,
      requestId: this.session.getSessionId() || 'stdio-transport'
    };
  }

  /**
   * 确保会话已连接
   */
  private async ensureConnected(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Transport has been disposed');
    }

    if (this.session?.isSessionInitialized()) {
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
    this.session = new McpSession(this.config);
    const connected = await this.session.connect();

    if (!connected) {
      this.session = null;
      return false;
    }

    return true;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.disconnect();
      this.session = null;
    }
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    this.isDisposed = true;
    await this.disconnect();
  }

  /**
   * 获取会话状态
   */
  getSessionStatus(): { isConnected: boolean; sessionId: string | null } {
    return {
      isConnected: this.session?.isSessionInitialized() || false,
      sessionId: this.session?.getSessionId() || null
    };
  }
}

/**
 * MCP工具执行器
 */
export class McpExecutor implements IToolExecutor {
  private transports: Map<string, StdioTransport> = new Map();

  /**
   * 执行MCP工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadContext 线程上下文（可选，MCP工具不使用）
   * @returns 执行结果
   */
  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: any,
    threadContext?: ThreadContext
  ): Promise<any> {
    // 从config中获取MCP配置
    const config = tool.config as McpToolConfig;
    const serverName = config?.serverName;
    const mcpToolName = tool.name;

    if (!serverName) {
      throw new ConfigurationError(
        `Tool '${tool.name}' does not have a serverName in config`,
        'serverName',
        { toolName: tool.name, config }
      );
    }

    try {
      // 获取或创建StdioTransport
      const transport = await this.getOrCreateTransport(serverName, config);

      // 调用MCP工具
      const result = await transport.execute(mcpToolName, { query: parameters });

      return {
        serverName,
        toolName: mcpToolName,
        result,
        sessionStatus: transport.getSessionStatus()
      };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ConfigurationError) {
        throw error;
      }

      throw new ToolError(
        `MCP tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tool.name,
        'MCP',
        { serverName, mcpToolName },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 获取或创建StdioTransport
   */
  private async getOrCreateTransport(serverName: string, config: McpToolConfig): Promise<StdioTransport> {
    // 如果transport已存在，直接返回
    if (this.transports.has(serverName)) {
      return this.transports.get(serverName)!;
    }

    // Extract server configuration from tool config
    // The config could contain command, args, and env for the MCP server
    let serverConfig: { command: string; args: string[]; env?: Record<string, string> };

    // If serverUrl is provided, treat it as a command
    if (config.serverUrl) {
      // Parse serverUrl to extract command and args if it's in a specific format
      // For example, if serverUrl is "npx -y @modelcontextprotocol/server-filesystem"
      const [command, ...args] = config.serverUrl.split(' ');
      serverConfig = {
        command: command || 'npx',
        args,
        env: Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      };
    } else {
      // Default to a common MCP server setup
      serverConfig = {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
        env: Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      };
    }

    // Create new StdioTransport
    const transport = new StdioTransport(serverConfig);

    // Cache the transport
    this.transports.set(serverName, transport);

    return transport;
  }

  /**
   * 关闭所有MCP transports
   */
  async closeAll(): Promise<void> {
    const disconnectPromises = Array.from(this.transports.values()).map(transport =>
      transport.dispose()
    );
    await Promise.all(disconnectPromises);
    this.transports.clear();
  }

  /**
   * 关闭指定服务器的MCP transport
   */
  async closeTransport(serverName: string): Promise<void> {
    const transport = this.transports.get(serverName);
    if (transport) {
      await transport.dispose();
    }
    this.transports.delete(serverName);
  }

  /**
   * 获取所有会话状态
   */
  getAllSessionStatus(): Map<string, { isConnected: boolean; sessionId: string | null }> {
    const status = new Map<string, { isConnected: boolean; sessionId: string | null }>();
    for (const [serverName, transport] of this.transports) {
      status.set(serverName, transport.getSessionStatus());
    }
    return status;
  }
}