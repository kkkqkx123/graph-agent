/**
 * MCP工具执行器
 * 执行MCP协议工具，支持会话池管理、健康检查、自动重连
 */

import type { Tool } from '@modular-agent/types';
import type { McpToolConfig } from '@modular-agent/types';
import { NetworkError, ToolError, ConfigurationError } from '@modular-agent/types';
import { BaseExecutor } from '../core/base/BaseExecutor';
import { ExecutorType } from '../core/types';
import { SessionPool } from './session/SessionPool';
import type { McpServerConfig } from './types';

/**
 * MCP执行器配置
 */
export interface McpExecutorConfig {
  /** 会话池配置 */
  sessionPool?: {
    maxConnections?: number;
    minConnections?: number;
    connectionTimeout?: number;
    idleTimeout?: number;
    healthCheckInterval?: number;
  };
}

/**
 * MCP工具执行器
 */
export class McpExecutor extends BaseExecutor {
  private sessionPool: SessionPool;
  private serverConfigs: Map<string, McpServerConfig> = new Map();

  constructor(config: McpExecutorConfig = {}) {
    super();
    this.sessionPool = new SessionPool(config.sessionPool);
  }

  /**
   * 执行MCP工具的具体实现
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadContext 线程上下文（可选，MCP工具不使用）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: any
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
      // 获取或创建服务器配置
      const serverConfig = this.getOrCreateServerConfig(serverName, config);

      // 获取传输层
      const transport = await this.sessionPool.getTransport(serverName, serverConfig);

      // 调用MCP工具
      const result = await transport.callTool(mcpToolName, parameters);

      return {
        serverName,
        toolName: mcpToolName,
        result,
        sessionInfo: transport.getSessionInfo()
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
   * 获取或创建服务器配置
   */
  private getOrCreateServerConfig(serverName: string, config: McpToolConfig): McpServerConfig {
    // 如果已存在，直接返回
    if (this.serverConfigs.has(serverName)) {
      return this.serverConfigs.get(serverName)!;
    }

    // 创建新的服务器配置
    let serverConfig: McpServerConfig;

    if (config.serverUrl) {
      // 解析serverUrl
      const [command, ...args] = config.serverUrl.split(' ');
      serverConfig = {
        name: serverName,
        command: command || 'npx',
        args,
        env: Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      };
    } else {
      // 默认配置
      serverConfig = {
        name: serverName,
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
        env: Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      };
    }

    // 缓存配置
    this.serverConfigs.set(serverName, serverConfig);

    return serverConfig;
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

    const transport = await this.sessionPool.getTransport(serverName, serverConfig);
    
    // 检查是否是StdioTransport
    if ('listTools' in transport && typeof transport.listTools === 'function') {
      return await transport.listTools();
    }

    return [];
  }

  /**
   * 获取所有会话状态
   */
  getAllSessionStatus(): Map<string, any> {
    return this.sessionPool.getAllSessionInfo();
  }

  /**
   * 获取指定服务器的会话状态
   */
  getSessionStatus(serverName: string): any | null {
    return this.sessionPool.getSessionInfo(serverName);
  }

  /**
   * 关闭指定服务器的会话
   */
  async closeSession(serverName: string): Promise<void> {
    await this.sessionPool.close(serverName);
  }

  /**
   * 关闭所有会话
   */
  async closeAllSessions(): Promise<void> {
    await this.sessionPool.closeAll();
  }

  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.sessionPool.getConnectionCount();
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.sessionPool.destroy();
    this.serverConfigs.clear();
  }

  /**
   * 获取执行器类型
   */
  getExecutorType(): string {
    return ExecutorType.MCP;
  }
}