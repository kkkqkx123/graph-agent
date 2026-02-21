/**
 * MCP工具执行器
 * 执行MCP协议工具，支持会话管理、自动重连
 * 支持多种传输层：Stdio 和 StreamableHTTP
 */

import type { Tool } from '@modular-agent/types';
import type { McpToolConfig } from '@modular-agent/types';
import { NetworkError, ToolError, ConfigurationError } from '@modular-agent/types';
import { BaseExecutor } from '../core/base/BaseExecutor.js';
import type { McpServerConfig } from './types.js';
import { Client } from './client/Client.js';
import type { IMcpTransport } from './transport/types.js';
import { StreamableHttpTransport } from './transport/StreamableHttpTransport.js';
import { StdioTransport } from './transport/StdioTransport.js';

/**
 * MCP工具执行器
 */
export class McpExecutor extends BaseExecutor {
  private serverConfigs: Map<string, McpServerConfig> = new Map();
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, IMcpTransport> = new Map();

  constructor(config?: {
    maxConnections?: number;
    minConnections?: number;
    connectionTimeout?: number;
    idleTimeout?: number;
    healthCheckInterval?: number;
  }) {
    super();
    // 配置参数保留用于未来扩展
  }

  /**
   * 执行MCP工具的具体实现
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadId 线程ID（可选，MCP工具不使用）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadId?: string
  ): Promise<any> {
    // 从config中获取MCP配置
    const config = tool.config as McpToolConfig;
    const serverName = config?.serverName;
    const mcpToolId = tool.id;

    if (!serverName) {
      throw new ConfigurationError(
        `Tool '${tool.name}' does not have a serverName in config`,
        'serverName',
        { toolId: tool.id, toolName: tool.name, config }
      );
    }

    try {
      // 获取或创建服务器配置
      const serverConfig = this.getOrCreateServerConfig(serverName, config);

      // 获取或创建客户端
      const client = await this.getOrCreateClient(serverName, serverConfig);

      // 调用MCP工具
      const result = await client.callTool(mcpToolId, parameters);

      return {
        serverName,
        toolId: mcpToolId,
        result,
        capabilities: client.getCapabilities(),
      };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ConfigurationError) {
        throw error;
      }

      throw new ToolError(
        `MCP tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tool.id,
        'MCP',
        { serverName, mcpToolId },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 获取或创建服务器配置
   */
  private getOrCreateServerConfig(serverName: string, config: McpToolConfig): McpServerConfig {
    // 如果已存在，直接返回
    if (this.serverConfigs.has(serverName)) {
      return this.serverConfigs.get(serverName)!;
    }

    // 创建新的服务器配置
    const transportType = config.transportType || 'stdio';
    let serverConfig: McpServerConfig;

    if (transportType === 'http') {
      // HTTP 传输配置
      if (!config.serverUrl) {
        throw new ConfigurationError(
          `serverUrl is required for HTTP transport`,
          'serverUrl',
          { serverName }
        );
      }

      serverConfig = {
        name: serverName,
        command: config.serverUrl, // 使用 serverUrl 作为命令标识
        args: [],
        env: {},
        transportType: 'http',
        serverUrl: config.serverUrl,
        sessionId: config.sessionId,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
        enableCircuitBreaker: config.enableCircuitBreaker,
        enableRateLimiter: config.enableRateLimiter,
      };
    } else {
      // Stdio 传输配置
      if (config.serverUrl) {
        // 解析serverUrl
        const [command, ...args] = config.serverUrl.split(' ');
        serverConfig = {
          name: serverName,
          command: command || 'npx',
          args,
          env: config.env || Object.fromEntries(
            Object.entries(process.env).filter(([, v]) => v !== undefined)
          ) as Record<string, string>,
          cwd: config.cwd,
          transportType: 'stdio',
        };
      } else {
        // 默认配置
        serverConfig = {
          name: serverName,
          command: config.command || 'npx',
          args: config.args || ['-y', '@modelcontextprotocol/server-filesystem'],
          env: config.env || Object.fromEntries(
            Object.entries(process.env).filter(([, v]) => v !== undefined)
          ) as Record<string, string>,
          cwd: config.cwd,
          transportType: 'stdio',
        };
      }
    }

    // 缓存配置
    this.serverConfigs.set(serverName, serverConfig);

    return serverConfig;
  }

  /**
   * 获取或创建客户端
   */
  private async getOrCreateClient(serverName: string, serverConfig: McpServerConfig): Promise<Client> {
    // 如果已存在，直接返回
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }

    // 创建传输层
    const transportType = serverConfig.transportType || 'stdio';
    let transport: IMcpTransport;

    if (transportType === 'http') {
      // 创建 StreamableHTTP 传输层
      transport = new StreamableHttpTransport({
        url: serverConfig.serverUrl!,
        sessionId: serverConfig.sessionId,
        timeout: serverConfig.timeout,
        maxRetries: serverConfig.maxRetries,
        retryDelay: serverConfig.retryDelay,
        enableCircuitBreaker: serverConfig.enableCircuitBreaker,
        enableRateLimiter: serverConfig.enableRateLimiter,
      });
    } else {
      // 创建 Stdio 传输层
      transport = new StdioTransport({
        name: serverConfig.name,
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
        cwd: serverConfig.cwd,
      });
    }

    // 启动传输层
    await transport.start();

    // 缓存传输层
    this.transports.set(serverName, transport);

    // 创建客户端
    const client = new Client(transport, {
      clientInfo: {
        name: 'modular-agent',
        version: '1.0.0',
      },
    });

    // 连接到服务器
    await client.connect();

    // 缓存客户端
    this.clients.set(serverName, client);

    return client;
  }

  /**
   * 列出指定服务器的可用工具
   */
  async listTools(serverName: string): Promise<any[]> {
    const serverConfig = this.serverConfigs.get(serverName);
    if (!serverConfig) {
      throw new ConfigurationError(
        `Server '${serverName}' not configured`,
        'serverName',
        { serverName }
      );
    }

    const client = await this.getOrCreateClient(serverName, serverConfig);
    return await client.listTools();
  }

  /**
   * 获取所有会话状态
   */
  getAllSessionStatus(): Map<string, any> {
    const sessions = new Map();
    for (const [name, client] of this.clients) {
      sessions.set(name, {
        serverName: name,
        initialized: client.isInitialized(),
        capabilities: client.getCapabilities(),
      });
    }
    return sessions;
  }

  /**
   * 获取指定服务器的会话状态
   */
  getSessionStatus(serverName: string): any | null {
    const client = this.clients.get(serverName);
    if (!client) {
      return null;
    }

    return {
      serverName,
      initialized: client.isInitialized(),
      capabilities: client.getCapabilities(),
    };
  }

  /**
   * 关闭指定服务器的会话
   */
  async closeSession(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      await client.close();
      this.clients.delete(serverName);
    }

    const transport = this.transports.get(serverName);
    if (transport) {
      await transport.close();
      this.transports.delete(serverName);
    }

    this.serverConfigs.delete(serverName);
  }

  /**
   * 关闭所有会话
   */
  async closeAllSessions(): Promise<void> {
    // 关闭所有客户端
    for (const [name, client] of this.clients) {
      await client.close();
    }
    this.clients.clear();

    // 关闭所有传输层
    for (const [name, transport] of this.transports) {
      await transport.close();
    }
    this.transports.clear();

    // 清除配置
    this.serverConfigs.clear();
  }

  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.transports.size;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.closeAllSessions();
  }

  /**
   * 获取执行器类型
   */
  getExecutorType(): string {
    return 'MCP';
  }
}