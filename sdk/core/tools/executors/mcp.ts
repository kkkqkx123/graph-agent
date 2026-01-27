/**
 * MCP协议工具执行器
 * 执行MCP协议工具
 */

import type { Tool } from '../../../types/tool';
import { BaseToolExecutor } from '../base-tool-executor';
import { NetworkError } from '../../../types/errors';

/**
 * MCP客户端接口
 */
interface MCPClient {
  callTool(serverName: string, toolName: string, parameters: Record<string, any>): Promise<any>;
  close(): Promise<void>;
}

/**
 * MCP工具执行器
 */
export class McpToolExecutor extends BaseToolExecutor {
  private clients: Map<string, MCPClient> = new Map();

  /**
   * 执行MCP工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>
  ): Promise<any> {
    // 从metadata中获取MCP配置
    const serverName = tool.metadata?.customFields?.['serverName'];
    const mcpToolName = tool.metadata?.customFields?.['toolName'] || tool.name;
    const serverUrl = tool.metadata?.customFields?.['serverUrl'];

    if (!serverName) {
      throw new Error(`Tool '${tool.name}' does not have a serverName in metadata`);
    }

    try {
      // 获取或创建MCP客户端
      const client = await this.getOrCreateClient(serverName, serverUrl);

      // 调用MCP工具
      const result = await client.callTool(serverName, mcpToolName, parameters);

      return {
        serverName,
        toolName: mcpToolName,
        result
      };
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }

      throw new Error(
        `MCP tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 获取或创建MCP客户端
   */
  private async getOrCreateClient(serverName: string, serverUrl?: string): Promise<MCPClient> {
    // 如果客户端已存在，直接返回
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }

    // 创建新的MCP客户端
    const client = await this.createMCPClient(serverName, serverUrl);

    // 缓存客户端
    this.clients.set(serverName, client);

    return client;
  }

  /**
   * 创建MCP客户端
   */
  private async createMCPClient(serverName: string, serverUrl?: string): Promise<MCPClient> {
    // 注意：这里需要根据实际的MCP客户端实现进行调整
    // 目前提供一个模拟实现

    const client: MCPClient = {
      callTool: async (server: string, toolName: string, parameters: Record<string, any>) => {
        // 模拟MCP调用
        // 实际实现应该连接到MCP服务器并调用工具

        if (serverUrl) {
          try {
            // 尝试通过HTTP调用MCP服务器
            const response = await fetch(`${serverUrl}/tools/${toolName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(parameters)
            });

            if (!response.ok) {
              throw new NetworkError(
                `MCP server returned status ${response.status}`,
                response.status,
                { url: serverUrl }
              );
            }

            return await response.json();
          } catch (error) {
            throw new NetworkError(
              `Failed to call MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`,
              undefined,
              { url: serverUrl },
              error instanceof Error ? error : undefined
            );
          }
        }

        // 如果没有serverUrl，返回模拟结果
        return {
          server,
          toolName,
          parameters,
          message: 'MCP client not fully implemented. Please provide serverUrl in tool metadata.'
        };
      },

      close: async () => {
        // 清理客户端资源
        this.clients.delete(serverName);
      }
    };

    return client;
  }

  /**
   * 关闭所有MCP客户端
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients.values()).map(client => client.close());
    await Promise.all(closePromises);
    this.clients.clear();
  }

  /**
   * 关闭指定服务器的MCP客户端
   */
  async closeClient(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      await client.close();
      this.clients.delete(serverName);
    }
  }
}