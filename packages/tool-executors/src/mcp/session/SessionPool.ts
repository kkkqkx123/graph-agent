/**
 * MCP会话池
 * 管理多个MCP会话，提供连接池功能
 */

import type { IMcpTransport, McpServerConfig, McpSessionInfo } from '../types';
import { StdioTransport } from '../transport/StdioTransport';
import { NetworkError, ConfigurationError } from '@modular-agent/types/errors';

/**
 * 会话池配置
 */
export interface SessionPoolConfig {
  /** 最大连接数 */
  maxConnections: number;
  /** 最小连接数 */
  minConnections: number;
  /** 连接超时时间（毫秒） */
  connectionTimeout: number;
  /** 空闲超时时间（毫秒） */
  idleTimeout: number;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
}

/**
 * 会话池
 */
export class SessionPool {
  private transports: Map<string, IMcpTransport> = new Map();
  private configs: Map<string, McpServerConfig> = new Map();
  private config: SessionPoolConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<SessionPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections ?? 10,
      minConnections: config.minConnections ?? 1,
      connectionTimeout: config.connectionTimeout ?? 30000,
      idleTimeout: config.idleTimeout ?? 300000,
      healthCheckInterval: config.healthCheckInterval ?? 60000
    };

    // 启动健康检查
    this.startHealthCheck();
  }

  /**
   * 获取或创建传输层
   */
  async getTransport(serverName: string, serverConfig: McpServerConfig): Promise<IMcpTransport> {
    // 检查是否已存在
    if (this.transports.has(serverName)) {
      const transport = this.transports.get(serverName)!;
      
      // 检查连接状态
      if (transport.isConnected()) {
        return transport;
      }
      
      // 重新连接
      await transport.disconnect();
      this.transports.delete(serverName);
    }

    // 检查连接数限制
    if (this.transports.size >= this.config.maxConnections) {
      throw new NetworkError(
        `Maximum connections (${this.config.maxConnections}) reached`
      );
    }

    // 创建新的传输层
    const transport = new StdioTransport(serverConfig);
    const connected = await transport.connect();

    if (!connected) {
      throw new NetworkError(
        `Failed to connect to MCP server: ${serverName}`
      );
    }

    this.transports.set(serverName, transport);
    this.configs.set(serverName, serverConfig);

    return transport;
  }

  /**
   * 释放传输层
   */
  async releaseTransport(serverName: string): Promise<void> {
    const transport = this.transports.get(serverName);
    if (transport) {
      await transport.disconnect();
      this.transports.delete(serverName);
      this.configs.delete(serverName);
    }
  }

  /**
   * 获取所有会话信息
   */
  getAllSessionInfo(): Map<string, McpSessionInfo> {
    const info = new Map<string, McpSessionInfo>();
    for (const [serverName, transport] of this.transports) {
      const sessionInfo = transport.getSessionInfo();
      if (sessionInfo) {
        info.set(serverName, sessionInfo);
      }
    }
    return info;
  }

  /**
   * 获取指定服务器的会话信息
   */
  getSessionInfo(serverName: string): McpSessionInfo | null {
    const transport = this.transports.get(serverName);
    return transport?.getSessionInfo() || null;
  }

  /**
   * 关闭所有会话
   */
  async closeAll(): Promise<void> {
    const disconnectPromises = Array.from(this.transports.values()).map(transport =>
      transport.dispose()
    );
    await Promise.all(disconnectPromises);
    this.transports.clear();
    this.configs.clear();
  }

  /**
   * 关闭指定服务器的会话
   */
  async close(serverName: string): Promise<void> {
    const transport = this.transports.get(serverName);
    if (transport) {
      await transport.dispose();
      this.transports.delete(serverName);
      this.configs.delete(serverName);
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    for (const [serverName, transport] of this.transports) {
      try {
        if (transport.isConnected()) {
          // 检查是否是StdioTransport，如果是则调用healthCheck
          if (transport instanceof StdioTransport) {
            const isHealthy = await transport.healthCheck();
            if (!isHealthy) {
              console.warn(`MCP server [${serverName}] health check failed, reconnecting...`);
              await this.reconnect(serverName);
            }
          }
        }
      } catch (error) {
        console.error(`Health check error for [${serverName}]:`, error);
        await this.reconnect(serverName);
      }
    }
  }

  /**
   * 重新连接
   */
  private async reconnect(serverName: string): Promise<void> {
    const config = this.configs.get(serverName);
    if (config) {
      await this.close(serverName);
      await this.getTransport(serverName, config);
    }
  }

  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.transports.size;
  }

  /**
   * 销毁会话池
   */
  async destroy(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    await this.closeAll();
  }
}