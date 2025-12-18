import { injectable, inject } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';
import { ParameterAdapter } from './parameter-adapter';

@injectable()
export class ToolAdapter {
  constructor(
    @inject('ParameterAdapter') private parameterAdapter: ParameterAdapter
  ) {}

  adaptToolConfig(toolConfig: any): any {
    // Adapt tool configuration to standard format
    const adaptedConfig = { ...toolConfig };

    // Ensure required fields exist
    if (!adaptedConfig.type) {
      adaptedConfig.type = this.inferToolType(adaptedConfig);
    }

    if (!adaptedConfig.name) {
      adaptedConfig.name = this.generateToolName(adaptedConfig);
    }

    // Normalize parameter schema
    if (adaptedConfig.parameters) {
      adaptedConfig.parameters = this.normalizeParameterSchema(adaptedConfig.parameters);
    }

    // Add default values
    adaptedConfig.timeout = adaptedConfig.timeout || 30000;
    adaptedConfig.retries = adaptedConfig.retries || 3;

    return adaptedConfig;
  }

  adaptExecutionParameters(tool: Tool, rawParameters: any): any {
    const adaptedParameters = { ...rawParameters };

    // Apply parameter transformations if configured
    if (tool.config['parameterTransformations']) {
      return this.parameterAdapter.transformParameters(
        adaptedParameters,
        tool.config['parameterTransformations']
      );
    }

    return adaptedParameters;
  }

  adaptExecutionResult(tool: Tool, rawResult: any): ToolResult {
    // Apply result transformations if configured
    if (tool.config['resultTransformations']) {
      const transformedResult = this.parameterAdapter.transformParameters(
        rawResult,
        tool.config['resultTransformations']
      );
      
      return new ToolResult(
        rawResult.id,
        rawResult.success,
        transformedResult,
        rawResult.error,
        rawResult.executionTime
      );
    }

    return rawResult;
  }

  validateToolConfiguration(toolConfig: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!toolConfig.type) {
      errors.push('Tool type is required');
    }

    if (!toolConfig.name) {
      errors.push('Tool name is required');
    }

    // Validate type-specific configuration
    switch (toolConfig.type) {
      case 'builtin':
        this.validateBuiltinToolConfig(toolConfig, errors);
        break;
      case 'native':
        this.validateNativeToolConfig(toolConfig, errors);
        break;
      case 'rest':
        this.validateRestToolConfig(toolConfig, errors);
        break;
      case 'mcp':
        this.validateMcpToolConfig(toolConfig, errors);
        break;
      default:
        errors.push(`Unknown tool type: ${toolConfig.type}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private inferToolType(toolConfig: any): string {
    if (toolConfig['functionName']) {
      return 'builtin';
    }

    if (toolConfig.command || toolConfig.script) {
      return 'native';
    }

    if (toolConfig.url || toolConfig.endpoint) {
      return 'rest';
    }

    if (toolConfig.serverName && toolConfig.toolName) {
      return 'mcp';
    }

    return 'builtin'; // Default type
  }

  private generateToolName(toolConfig: any): string {
    if (toolConfig['functionName']) {
      return toolConfig['functionName'];
    }

    if (toolConfig.command) {
      return toolConfig.command.split(' ')[0];
    }

    if (toolConfig.url) {
      const url = new URL(toolConfig.url);
      return `${url.hostname}_${url.pathname.replace(/\//g, '_')}`;
    }

    if (toolConfig.serverName && toolConfig.toolName) {
      return `${toolConfig.serverName}_${toolConfig.toolName}`;
    }

    return `tool_${Date.now()}`;
  }

  private normalizeParameterSchema(parameters: any): any {
    if (!parameters) {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    // Ensure schema has required structure
    const normalizedSchema = {
      type: parameters.type || 'object',
      properties: parameters.properties || {},
      required: parameters.required || []
    };

    // Normalize each property
    for (const [propName, propSchema] of Object.entries(normalizedSchema.properties)) {
      normalizedSchema.properties[propName] = this.normalizePropertySchema(propSchema as any);
    }

    return normalizedSchema;
  }

  private normalizePropertySchema(propSchema: any): any {
    const normalized = { ...propSchema };

    // Ensure type is specified
    if (!normalized.type) {
      normalized.type = this.inferPropertyType(normalized);
    }

    // Add default values for common properties
    if (normalized.type === 'string' && !normalized.default) {
      normalized.default = '';
    }

    if (normalized.type === 'number' && !normalized.default) {
      normalized.default = 0;
    }

    if (normalized.type === 'boolean' && !normalized.default) {
      normalized.default = false;
    }

    if (normalized.type === 'array' && !normalized.default) {
      normalized.default = [];
    }

    if (normalized.type === 'object' && !normalized.default) {
      normalized.default = {};
    }

    return normalized;
  }

  private inferPropertyType(propSchema: any): string {
    if (propSchema.enum) {
      return 'string';
    }

    if (propSchema.minimum !== undefined || propSchema.maximum !== undefined) {
      return 'number';
    }

    if (propSchema.minLength !== undefined || propSchema.maxLength !== undefined) {
      return 'string';
    }

    if (propSchema.pattern) {
      return 'string';
    }

    return 'string'; // Default type
  }

  private validateBuiltinToolConfig(toolConfig: any, errors: string[]): void {
    if (!toolConfig['functionName']) {
      errors.push('Builtin tool requires functionName');
    }
  }

  private validateNativeToolConfig(toolConfig: any, errors: string[]): void {
    if (!toolConfig.command && !toolConfig.script) {
      errors.push('Native tool requires either command or script');
    }

    if (toolConfig.command && typeof toolConfig.command !== 'string') {
      errors.push('Native tool command must be a string');
    }

    if (toolConfig.script && typeof toolConfig.script !== 'string') {
      errors.push('Native tool script must be a string');
    }
  }

  private validateRestToolConfig(toolConfig: any, errors: string[]): void {
    if (!toolConfig.url) {
      errors.push('REST tool requires url');
    }

    try {
      new URL(toolConfig.url);
    } catch (e) {
      errors.push('REST tool url must be a valid URL');
    }

    if (toolConfig.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(toolConfig.method)) {
      errors.push('REST tool method must be one of: GET, POST, PUT, DELETE, PATCH');
    }
  }

  private validateMcpToolConfig(toolConfig: any, errors: string[]): void {
    if (!toolConfig.serverName) {
      errors.push('MCP tool requires serverName');
    }

    if (!toolConfig.toolName) {
      errors.push('MCP tool requires toolName');
    }
  }
}