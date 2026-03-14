/**
 * MCP 客户端实现
 * 精简版 - 提供核心的 MCP 客户端 API
 * 支持工具、资源、提示操作
 */

import { NetworkError, ConfigurationError } from '@modular-agent/types';
import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  RequestId,
  ClientCapabilities,
  ServerCapabilities,
  Tool,
  Resource,
  ResourceTemplate,
  Prompt,
  InitializeRequestParams,
  InitializeResult,
  ListToolsResult,
  CallToolResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ReadResourceResult,
  ListPromptsResult,
  GetPromptResult,
} from '../types-protocol.js';
import { LATEST_PROTOCOL_VERSION } from '../types-protocol.js';
import type { IMcpTransport } from '../transport/types.js';
import { logger as pkgLogger } from '../../index.js';

const logger = pkgLogger.child('mcp-client');

/**
 * MCP 客户端配置
 */
export interface ClientConfig {
  /**
   * 客户端信息
   */
  clientInfo: {
    name: string;
    version: string;
  };

  /**
   * 客户端能力
   */
  capabilities?: ClientCapabilities;
}

/**
 * MCP 客户端
 * 提供高级 MCP 客户端 API
 */
export class Client {
  private transport: IMcpTransport;
  private config: ClientConfig;
  private capabilities?: ServerCapabilities;
  private initialized = false;
  private messageIdCounter = 0;
  private pendingRequests = new Map<RequestId, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor(transport: IMcpTransport, config: ClientConfig) {
    this.transport = transport;
    this.config = config;

    // 设置传输层回调
    this.transport.onmessage = (message: JSONRPCMessage) => {
      this.handleMessage(message);
    };

    this.transport.onerror = (error: Error) => {
      logger.error('Transport error', { error });
      this.handleTransportError(error);
    };

    this.transport.onclose = () => {
      logger.info('Transport closed');
      this.handleTransportClose();
    };

    logger.info('MCP client created', {
      clientInfo: config.clientInfo,
    });
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<InitializeResult> {
    if (this.initialized) {
      logger.warn('Client already initialized');
      return {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: this.capabilities!,
        serverInfo: {
          name: 'unknown',
          version: 'unknown',
        },
      };
    }

    logger.info('Connecting to MCP server');

    try {
      // 启动传输层
      await this.transport.start();

      // 发送初始化请求
      const initResult = await this.initialize();

      this.capabilities = initResult.capabilities;
      this.initialized = true;

      // 设置协议版本
      if (this.transport.setProtocolVersion) {
        this.transport.setProtocolVersion(initResult.protocolVersion);
      }

      logger.info('MCP client initialized', {
        protocolVersion: initResult.protocolVersion,
        capabilities: this.capabilities,
      });

      return initResult;
    } catch (error) {
      logger.error('Failed to connect to MCP server', { error });
      throw error;
    }
  }

  /**
   * 初始化 MCP 会话
   */
  private async initialize(): Promise<InitializeResult> {
    const params: InitializeRequestParams = {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: this.config.capabilities || this.getDefaultCapabilities(),
      clientInfo: this.config.clientInfo,
    };

    const result = await this.request<InitializeResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'initialize',
      params,
    });

    // 发送 initialized 通知
    await this.notification({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    return result;
  }

  /**
   * 列出可用工具
   */
  async listTools(): Promise<Tool[]> {
    this.ensureInitialized();

    const result = await this.request<ListToolsResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/list',
    });

    return result.tools;
  }

  /**
   * 调用工具
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult> {
    this.ensureInitialized();

    logger.debug('Calling tool', { name, args });

    const result = await this.request<CallToolResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    });

    return result;
  }

  /**
   * 列出可用资源
   */
  async listResources(): Promise<Resource[]> {
    this.ensureInitialized();

    const result = await this.request<ListResourcesResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/list',
    });

    return result.resources;
  }

  /**
   * 列出资源模板
   */
  async listResourceTemplates(): Promise<ResourceTemplate[]> {
    this.ensureInitialized();

    const result = await this.request<ListResourceTemplatesResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/templates/list',
    });

    return result.resourceTemplates;
  }

  /**
   * 读取资源
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    this.ensureInitialized();

    const result = await this.request<ReadResourceResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/read',
      params: { uri },
    });

    return result;
  }

  /**
   * 订阅资源
   */
  async subscribeResource(uri: string): Promise<void> {
    this.ensureInitialized();

    await this.request({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/subscribe',
      params: { uri },
    });
  }

  /**
   * 取消订阅资源
   */
  async unsubscribeResource(uri: string): Promise<void> {
    this.ensureInitialized();

    await this.request({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'resources/unsubscribe',
      params: { uri },
    });
  }

  /**
   * 列出可用提示
   */
  async listPrompts(): Promise<Prompt[]> {
    this.ensureInitialized();

    const result = await this.request<ListPromptsResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'prompts/list',
    });

    return result.prompts;
  }

  /**
   * 获取提示
   */
  async getPrompt(name: string, args?: Record<string, unknown>): Promise<GetPromptResult> {
    this.ensureInitialized();

    const result = await this.request<GetPromptResult>({
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'prompts/get',
      params: {
        name,
        arguments: args,
      },
    });

    return result;
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    logger.info('Closing MCP client');

    await this.transport.close();

    // 清理待处理的请求
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new NetworkError('Client closed'));
    }
    this.pendingRequests.clear();

    this.initialized = false;

    logger.info('MCP client closed');
  }

  /**
   * 发送请求
   */
  private async request<T>(request: JSONRPCRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = request.id;

      this.pendingRequests.set(id, { resolve, reject });

      this.transport.send(request).catch((error) => {
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  /**
   * 发送通知
   */
  private async notification(notification: JSONRPCMessage): Promise<void> {
    await this.transport.send(notification);
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: JSONRPCMessage): void {
    // 处理响应消息
    if ('id' in message && ('result' in message || 'error' in message)) {
      const response = message as JSONRPCResponse;
      const pending = this.pendingRequests.get(response.id);

      if (pending) {
        this.pendingRequests.delete(response.id);

        if ('error' in response) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
    }
  }

  /**
   * 处理传输层错误
   */
  private handleTransportError(error: Error): void {
    // 拒绝所有待处理的请求
    for (const [id, { reject }] of this.pendingRequests) {
      reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * 处理传输层关闭
   */
  private handleTransportClose(): void {
    // 拒绝所有待处理的请求
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new NetworkError('Transport closed'));
    }
    this.pendingRequests.clear();
  }

  /**
   * 确保客户端已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ConfigurationError(
        'Client not initialized. Call connect() first.',
        'connect',
        {}
      );
    }
  }

  /**
   * 获取默认客户端能力
   */
  private getDefaultCapabilities(): ClientCapabilities {
    return {
      tools: {},
      resources: {},
      prompts: {},
    };
  }

  /**
   * 生成下一个消息 ID
   */
  private generateId(): RequestId {
    return ++this.messageIdCounter;
  }

  /**
   * 获取服务器能力
   */
  getCapabilities(): ServerCapabilities | undefined {
    return this.capabilities;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}