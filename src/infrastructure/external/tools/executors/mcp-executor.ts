import { injectable, inject } from 'inversify';
import { IToolExecutor } from '../../../../domain/tools/interfaces/tool-executor.interface';
import { Tool } from '../../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../../domain/tools/entities/tool-result';
import { McpClient } from '../mcp/mcp-client';

@injectable()
export class McpExecutor implements IToolExecutor {
  private mcpClients: Map<string, McpClient> = new Map();

  constructor(
    @inject('McpClientFactory') private mcpClientFactory: any
  ) {}

  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      const serverName = config.serverName;
      const toolName = config.toolName;
      
      // Get or create MCP client for the server
      const client = await this.getMcpClient(serverName);
      
      // Execute the tool through MCP
      const result = await client.callTool(toolName, execution.parameters);
      
      return new ToolResult(
        execution.id,
        true,
        result,
        null,
        Date.now() - execution.startedAt.getTime()
      );
    } catch (error) {
      return new ToolResult(
        execution.id,
        false,
        null,
        error.message,
        Date.now() - execution.startedAt.getTime()
      );
    }
  }

  private async getMcpClient(serverName: string): Promise<McpClient> {
    if (this.mcpClients.has(serverName)) {
      return this.mcpClients.get(serverName)!;
    }

    // Create new MCP client
    const client = await this.mcpClientFactory.createClient(serverName);
    this.mcpClients.set(serverName, client);
    
    return client;
  }

  async listAvailableTools(serverName: string): Promise<any[]> {
    try {
      const client = await this.getMcpClient(serverName);
      return await client.listTools();
    } catch (error) {
      throw new Error(`Failed to list tools for MCP server '${serverName}': ${error.message}`);
    }
  }

  async getToolSchema(serverName: string, toolName: string): Promise<any> {
    try {
      const client = await this.getMcpClient(serverName);
      return await client.getToolSchema(toolName);
    } catch (error) {
      throw new Error(`Failed to get schema for tool '${toolName}' on MCP server '${serverName}': ${error.message}`);
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