/**
 * MCP协议工具执行器
 * 执行MCP协议工具
 */

import type { Tool } from '../../../types/tool';
import type { McpToolConfig } from '../../../types/tool';
import type { ThreadContext } from '../../execution/context/thread-context';
import { BaseToolExecutor } from '../base-tool-executor';
import { NetworkError, ToolError, ConfigurationError } from '../../../types/errors';
import { StdioTransport } from '../../http/transport';

/**
 * MCP工具执行器
 */
export class McpToolExecutor extends BaseToolExecutor {
  private transports: Map<string, StdioTransport> = new Map();

  /**
   * 执行MCP工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadContext 线程上下文（可选，MCP工具不使用）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
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
        result
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
      transport.disconnect ? transport.disconnect() : Promise.resolve()
    );
    await Promise.all(disconnectPromises);
    this.transports.clear();
  }

  /**
   * 关闭指定服务器的MCP transport
   */
  async closeTransport(serverName: string): Promise<void> {
    const transport = this.transports.get(serverName);
    if (transport && transport.disconnect) {
      await transport.disconnect();
    }
    this.transports.delete(serverName);
  }
}