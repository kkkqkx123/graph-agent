import { injectable, inject } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';
import { ToolExecutorBase, ToolExecutorConfigSchema, ToolExecutorCapabilities, ToolExecutorHealthCheck } from './tool-executor-base';

// 简化的 MCP 客户端类
class McpClient {
  async callTool(toolName: string, parameters: any): Promise<any> {
    // 简化实现
    return { result: `Called ${toolName} with ${JSON.stringify(parameters)}` };
  }

  async listTools(): Promise<any[]> {
    return [];
  }

  async getToolSchema(toolName: string): Promise<any> {
    return {};
  }

  async disconnect(): Promise<void> {
    // 简化实现
  }
}

@injectable()
export class McpExecutor extends ToolExecutorBase {
  private mcpClients: Map<string, McpClient> = new Map();

  constructor(
    @inject('McpClientFactory') private mcpClientFactory: any
  ) {
    super();
  }

  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      const serverName = config.getValue('serverName') as string;
      const toolName = config.getValue('toolName') as string;
      
      // Get or create MCP client for the server
      const client = await this.getMcpClient(serverName);
      
      // Execute the tool through MCP
      const result = await client.callTool(toolName, execution.parameters);
      
      return ToolResult.createSuccess(
        execution.id,
        result,
        Date.now() - execution.startedAt.toDate().getTime()
      );
    } catch (error) {
      return ToolResult.createFailure(
        execution.id,
        error instanceof Error ? error.message : String(error),
        Date.now() - execution.startedAt.toDate().getTime()
      );
    }
  }

  private async getMcpClient(serverName: string): Promise<McpClient> {
    if (this.mcpClients.has(serverName)) {
      return this.mcpClients.get(serverName)!;
    }

    // Create new MCP client
    const client = new McpClient();
    this.mcpClients.set(serverName, client);
    
    return client;
  }

  async validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tool.config.getValue('serverName')) {
      errors.push('MCP tool requires serverName');
    }

    if (!tool.config.getValue('toolName')) {
      errors.push('MCP tool requires toolName');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateParameters(tool: Tool, parameters: Record<string, unknown>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  getType(): string {
    return 'mcp';
  }

  getName(): string {
    return 'MCP Executor';
  }

  getVersion(): string {
    return '1.0.0';
  }

  getDescription(): string {
    return 'Executes tools through MCP (Model Context Protocol)';
  }

  getSupportedToolTypes(): string[] {
    return ['mcp'];
  }

  override supportsTool(tool: Tool): boolean {
    return tool.type.value === 'mcp';
  }

  getConfigSchema(): ToolExecutorConfigSchema {
    return {
      type: 'object',
      properties: {
        serverName: {
          type: 'string',
          description: 'Name of the MCP server'
        },
        toolName: {
          type: 'string',
          description: 'Name of the tool on the MCP server'
        }
      },
      required: ['serverName', 'toolName']
    };
  }

  getCapabilities(): ToolExecutorCapabilities {
    return {
      streaming: false,
      async: true,
      batch: false,
      retry: false,
      timeout: false,
      cancellation: false
    };
  }

  async healthCheck(): Promise<ToolExecutorHealthCheck> {
    return {
      status: 'healthy',
      message: 'MCP executor is operational',
      lastChecked: new Date()
    };
  }

  async listAvailableTools(serverName: string): Promise<any[]> {
    try {
      const client = await this.getMcpClient(serverName);
      return await client.listTools();
    } catch (error) {
      throw new Error(`Failed to list tools for MCP server '${serverName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getToolSchema(serverName: string, toolName: string): Promise<any> {
    try {
      const client = await this.getMcpClient(serverName);
      return await client.getToolSchema(toolName);
    } catch (error) {
      throw new Error(`Failed to get schema for tool '${toolName}' on MCP server '${serverName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(serverName: string): Promise<void> {
    if (this.mcpClients.has(serverName)) {
      const client = this.mcpClients.get(serverName)!;
      await client.disconnect();
      this.mcpClients.delete(serverName);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.mcpClients.keys()).map(serverName =>
      this.disconnect(serverName)
    );
    
    await Promise.all(disconnectPromises);
  }
}