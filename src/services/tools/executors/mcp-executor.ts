import { injectable, inject } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';
import {
  ToolExecutorBase,
  ToolExecutorConfigSchema,
  ToolExecutorCapabilities,
  ToolExecutorHealthCheck,
} from './tool-executor-base';

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

  constructor(@inject('McpClientFactory') private mcpClientFactory: any) {
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
      warnings,
    };
  }

  async validateParameters(
    tool: Tool,
    parameters: Record<string, unknown>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const schema = tool.parameters;
    const requiredParams = schema.required || [];
    const properties = schema.properties || {};

    // 1. 检查必需参数
    for (const paramName of requiredParams) {
      if (!(paramName in parameters)) {
        errors.push(`缺少必需参数: ${paramName}`);
      }
    }

    // 2. 验证参数类型和值
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const paramSchema = properties[paramName];
      
      if (!paramSchema) {
        warnings.push(`未知参数: ${paramName}`);
        continue;
      }

      // 类型验证
      const typeError = this.validateParameterType(paramName, paramValue, paramSchema, warnings);
      if (typeError) {
        errors.push(typeError);
      }

      // 枚举值验证
      if (paramSchema.enum && Array.isArray(paramSchema.enum)) {
        if (!paramSchema.enum.includes(paramValue as any)) {
          errors.push(
            `参数 ${paramName} 的值 ${paramValue} 不在允许的枚举值中: [${paramSchema.enum.join(', ')}]`
          );
        }
      }

      // 数值范围验证
      if (typeof paramValue === 'number') {
        const schemaWithRange = paramSchema as any;
        if (schemaWithRange.minimum !== undefined && paramValue < schemaWithRange.minimum) {
          errors.push(`参数 ${paramName} 的值 ${paramValue} 小于最小值 ${schemaWithRange.minimum}`);
        }
        if (schemaWithRange.maximum !== undefined && paramValue > schemaWithRange.maximum) {
          errors.push(`参数 ${paramName} 的值 ${paramValue} 大于最大值 ${schemaWithRange.maximum}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证参数类型
   */
  private validateParameterType(
    paramName: string,
    paramValue: unknown,
    paramSchema: any,
    warnings: string[]
  ): string | null {
    const expectedType = paramSchema.type;

    switch (expectedType) {
      case 'string':
        if (typeof paramValue !== 'string') {
          return `参数 ${paramName} 应为 string 类型，实际为 ${typeof paramValue}`;
        }
        break;

      case 'number':
      case 'integer':
        if (typeof paramValue !== 'number') {
          return `参数 ${paramName} 应为 ${expectedType} 类型，实际为 ${typeof paramValue}`;
        }
        if (expectedType === 'integer' && !Number.isInteger(paramValue)) {
          return `参数 ${paramName} 应为 integer 类型，实际为浮点数`;
        }
        break;

      case 'boolean':
        if (typeof paramValue !== 'boolean') {
          return `参数 ${paramName} 应为 boolean 类型，实际为 ${typeof paramValue}`;
        }
        break;

      case 'array':
        if (!Array.isArray(paramValue)) {
          return `参数 ${paramName} 应为 array 类型，实际为 ${typeof paramValue}`;
        }
        break;

      case 'object':
        if (typeof paramValue !== 'object' || paramValue === null || Array.isArray(paramValue)) {
          return `参数 ${paramName} 应为 object 类型，实际为 ${typeof paramValue}`;
        }
        break;

      default:
        warnings.push(`参数 ${paramName} 有未知类型: ${expectedType}`);
    }

    return null;
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
          description: 'Name of the MCP server',
        },
        toolName: {
          type: 'string',
          description: 'Name of the tool on the MCP server',
        },
      },
      required: ['serverName', 'toolName'],
    };
  }

  getCapabilities(): ToolExecutorCapabilities {
    return {
      streaming: false,
      async: true,
      batch: false,
      retry: false,
      timeout: false,
      cancellation: false,
    };
  }

  async healthCheck(): Promise<ToolExecutorHealthCheck> {
    return {
      status: 'healthy',
      message: 'MCP executor is operational',
      lastChecked: new Date(),
    };
  }

  async listAvailableTools(serverName: string): Promise<any[]> {
    try {
      const client = await this.getMcpClient(serverName);
      return await client.listTools();
    } catch (error) {
      throw new Error(
        `Failed to list tools for MCP server '${serverName}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getToolSchema(serverName: string, toolName: string): Promise<any> {
    try {
      const client = await this.getMcpClient(serverName);
      return await client.getToolSchema(toolName);
    } catch (error) {
      throw new Error(
        `Failed to get schema for tool '${toolName}' on MCP server '${serverName}': ${error instanceof Error ? error.message : String(error)}`
      );
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
