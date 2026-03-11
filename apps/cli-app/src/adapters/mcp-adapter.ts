/**
 * MCP Adapter
 * Manages MCP tool integration with CLI-App
 */

import type { McpToolConfig } from '@modular-agent/types';
import { McpExecutor, type ToolDefinitionLike } from '@modular-agent/tool-executors';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();

/**
 * MCP server configuration
 */
export interface McpServerDefinition {
  /** Server name */
  name: string;
  /** Description */
  description?: string;
  /** Transport type */
  transportType?: 'stdio' | 'http';
  /** Command (for stdio) */
  command?: string;
  /** Command arguments (for stdio) */
  args?: string[];
  /** Environment variables (for stdio) */
  env?: Record<string, string>;
  /** Working directory (for stdio) */
  cwd?: string;
  /** Server URL (for http) */
  serverUrl?: string;
  /** Session ID (for http) */
  sessionId?: string;
  /** Disabled flag */
  disabled?: boolean;
}

/**
 * MCP configuration file format
 */
export interface McpConfig {
  mcpServers: Record<string, McpServerDefinition>;
}

/**
 * MCP Adapter
 * Manages MCP executor and tool registration
 */
export class McpAdapter {
  private executor: McpExecutor;
  private loadedTools: Map<string, ToolDefinitionLike> = new Map();
  private serverConfigs: Map<string, McpServerDefinition> = new Map();

  constructor() {
    this.executor = new McpExecutor();
  }

  /**
   * Load MCP tools from configuration file
   */
  async loadFromConfig(configPath: string): Promise<ToolDefinitionLike[]> {
    logger.info(`Loading MCP config from: ${configPath}`);

    try {
      const fs = await import('fs/promises');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config: McpConfig = JSON.parse(configContent);

      const servers = config.mcpServers || {};
      const tools: ToolDefinitionLike[] = [];

      for (const [serverName, serverConfig] of Object.entries(servers)) {
        if (serverConfig.disabled) {
          logger.info(`Skipping disabled server: ${serverName}`);
          continue;
        }

        const serverTools = await this.loadServerTools(serverName, serverConfig);
        tools.push(...serverTools);
      }

      logger.info(`Loaded ${tools.length} MCP tools from ${configPath}`);
      return tools;
    } catch (error) {
      logger.error(`Failed to load MCP config: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Load tools from a single MCP server
   */
  async loadServerTools(
    serverName: string,
    serverConfig: McpServerDefinition
  ): Promise<ToolDefinitionLike[]> {
    logger.info(`Connecting to MCP server: ${serverName}`);

    try {
      // Store server configuration
      this.serverConfigs.set(serverName, serverConfig);

      // Create MCP tool configuration
      const mcpConfig: McpToolConfig = {
        serverName,
        transportType: serverConfig.transportType || 'stdio',
        serverUrl: serverConfig.serverUrl,
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
        cwd: serverConfig.cwd,
        sessionId: serverConfig.sessionId,
      };

      // List available tools from the server
      const rawTools = await this.executor.listTools(serverName);
      const tools: ToolDefinitionLike[] = [];

      for (const rawTool of rawTools) {
        const toolDef = this.createToolDefinition(rawTool, serverName, mcpConfig);
        tools.push(toolDef);
        this.loadedTools.set(toolDef.id, toolDef);
      }

      logger.info(`Loaded ${tools.length} tools from server: ${serverName}`);
      return tools;
    } catch (error) {
      logger.error(`Failed to load tools from server '${serverName}': ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Create ToolDefinition from raw MCP tool
   */
  private createToolDefinition(
    rawTool: any,
    serverName: string,
    mcpConfig: McpToolConfig
  ): ToolDefinitionLike {
    const toolId = `mcp:${serverName}:${rawTool.name}`;

    return {
      id: toolId,
      name: rawTool.name,
      description: rawTool.description || '',
      parameters: rawTool.inputSchema || {},
      type: 'MCP',
      config: mcpConfig,
    };
  }

  /**
   * Get loaded tool by ID
   */
  getTool(toolId: string): ToolDefinitionLike | undefined {
    return this.loadedTools.get(toolId);
  }

  /**
   * Get all loaded tools
   */
  getAllTools(): ToolDefinitionLike[] {
    return Array.from(this.loadedTools.values());
  }

  /**
   * Get MCP executor for tool execution
   */
  getExecutor(): McpExecutor {
    return this.executor;
  }

  /**
   * Get server configurations
   */
  getServerConfigs(): Map<string, McpServerDefinition> {
    return this.serverConfigs;
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverName: string): Promise<void> {
    logger.info(`Disconnecting from MCP server: ${serverName}`);

    try {
      await this.executor.closeSession(serverName);
      this.serverConfigs.delete(serverName);

      // Remove tools from this server
      for (const [toolId, tool] of this.loadedTools) {
        const config = tool.config as McpToolConfig;
        if (config.serverName === serverName) {
          this.loadedTools.delete(toolId);
        }
      }

      logger.info(`Disconnected from server: ${serverName}`);
    } catch (error) {
      logger.error(`Failed to disconnect from server '${serverName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    logger.info('Disconnecting from all MCP servers');

    for (const serverName of this.serverConfigs.keys()) {
      await this.disconnectServer(serverName);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Map<string, any> {
    const sessions = this.executor.getAllSessionStatus();
    return sessions;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.disconnectAll();
  }
}

/**
 * Create MCP adapter instance
 */
export function createMcpAdapter(): McpAdapter {
  return new McpAdapter();
}
