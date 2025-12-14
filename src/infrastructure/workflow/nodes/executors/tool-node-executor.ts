import { injectable, inject } from 'inversify';
import { INodeExecutor } from '../../../../domain/workflow/graph/interfaces/node-executor.interface';
import { IExecutionContext } from '../../../../domain/workflow/graph/interfaces/execution-context.interface';
import { Node } from '../../../../domain/workflow/graph/entities/node';
import { ExecutionContext } from '../../engine/execution-context';
import { IToolExecutor } from '../../../../domain/tools/interfaces/tool-executor.interface';
import { Tool } from '../../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../../domain/tools/entities/tool-execution';
import { ToolExecutionId } from '../../../../domain/tools/value-objects/tool-execution-id';
import { ToolRegistry } from '../../../external/tools/registries/tool-registry';

@injectable()
export class ToolNodeExecutor implements INodeExecutor {
  constructor(
    @inject('ToolRegistry') private toolRegistry: ToolRegistry,
    @inject('ToolExecutorFactory') private toolExecutorFactory: any
  ) {}

  async execute(node: Node, context: IExecutionContext): Promise<any> {
    try {
      // Get tool
      const tool = await this.getTool(node);
      
      // Prepare tool execution
      const execution = this.prepareExecution(node, context);
      
      // Get tool executor
      const executor = await this.getToolExecutor(tool);
      
      // Execute tool
      const result = await executor.execute(tool, execution);
      
      // Process result
      const processedResult = this.processResult(result, node, context);
      
      // Store result in context
      context.setVariable(`tool_result_${node.id.value}`, processedResult);
      
      // Store execution metadata
      context.setVariable(`tool_execution_${node.id.value}`, {
        toolId: tool.id.value,
        toolName: tool.name,
        executionTime: result.executionTime,
        success: result.success,
        error: result.error
      });
      
      if (!result.success) {
        throw new Error(`Tool execution failed: ${result.error}`);
      }
      
      return processedResult;
    } catch (error) {
      throw new Error(`Tool node execution failed: ${error.message}`);
    }
  }

  private async getTool(node: Node): Promise<Tool> {
    const config = node.config;
    const toolId = config.toolId;
    const toolName = config.toolName;
    
    if (toolId) {
      const tool = this.toolRegistry.getTool(new ToolId(toolId));
      if (!tool) {
        throw new Error(`Tool with ID '${toolId}' not found`);
      }
      return tool;
    }
    
    if (toolName) {
      const tool = this.toolRegistry.getToolByName(toolName);
      if (!tool) {
        throw new Error(`Tool with name '${toolName}' not found`);
      }
      return tool;
    }
    
    throw new Error('Tool node requires either toolId or toolName configuration');
  }

  private prepareExecution(node: Node, context: IExecutionContext): ToolExecution {
    const config = node.config;
    
    // Prepare parameters
    const parameters = this.prepareParameters(node, context);
    
    // Create tool execution
    return new ToolExecution(
      new ToolExecutionId(this.generateExecutionId()),
      parameters,
      new Date()
    );
  }

  private prepareParameters(node: Node, context: IExecutionContext): any {
    const config = node.config;
    let parameters: any = {};
    
    // Use static parameters if provided
    if (config.parameters) {
      parameters = { ...config.parameters };
    }
    
    // Override with dynamic parameters from context
    if (config.parameterMappings) {
      for (const [targetParam, sourcePath] of Object.entries(config.parameterMappings)) {
        const value = this.getContextValue(sourcePath as string, context);
        if (value !== undefined) {
          parameters[targetParam] = value;
        }
      }
    }
    
    // Apply parameter transformations if configured
    if (config.parameterTransformations) {
      parameters = this.applyParameterTransformations(parameters, config.parameterTransformations);
    }
    
    // Validate parameters if schema is provided
    if (config.parameterSchema) {
      const validation = this.validateParameters(parameters, config.parameterSchema);
      if (!validation.valid) {
        throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
      }
    }
    
    return parameters;
  }

  private getContextValue(path: string, context: IExecutionContext): any {
    const parts = path.split('.');
    let current: any = context;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Try to get from variables
        current = context.getVariable(part);
        if (current === undefined) {
          return undefined;
        }
      }
    }
    
    return current;
  }

  private applyParameterTransformations(parameters: any, transformations: any[]): any {
    let result = { ...parameters };
    
    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'map':
          result = this.applyMapTransformation(result, transformation);
          break;
        case 'filter':
          result = this.applyFilterTransformation(result, transformation);
          break;
        case 'format':
          result = this.applyFormatTransformation(result, transformation);
          break;
        case 'custom':
          result = this.applyCustomTransformation(result, transformation);
          break;
      }
    }
    
    return result;
  }

  private applyMapTransformation(data: any, transformation: any): any {
    const mapping = transformation.mapping;
    const result: any = {};
    
    for (const [targetField, sourceField] of Object.entries(mapping)) {
      result[targetField] = this.getNestedValue(data, sourceField as string);
    }
    
    return result;
  }

  private applyFilterTransformation(data: any, transformation: any): any {
    if (!Array.isArray(data)) {
      return data;
    }
    
    return data.filter(item => this.evaluateCondition(item, transformation.condition));
  }

  private applyFormatTransformation(data: any, transformation: any): any {
    const format = transformation.format;
    
    switch (format) {
      case 'json':
        return JSON.stringify(data);
      case 'string':
        return String(data);
      case 'number':
        return Number(data);
      case 'boolean':
        return Boolean(data);
      case 'date':
        return new Date(data);
      default:
        return data;
    }
  }

  private applyCustomTransformation(data: any, transformation: any): any {
    // Apply custom transformation logic
    // This would typically involve calling a custom function
    return data;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private evaluateCondition(item: any, condition: any): boolean {
    if (condition.field && condition.operator && condition.value) {
      const fieldValue = this.getNestedValue(item, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'greater_than':
          return fieldValue > condition.value;
        case 'less_than':
          return fieldValue < condition.value;
        case 'contains':
          return String(fieldValue).includes(condition.value);
        case 'matches':
          return new RegExp(condition.value).test(String(fieldValue));
        default:
          return true;
      }
    }
    
    return true;
  }

  private validateParameters(parameters: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required parameters
    if (schema.required) {
      for (const requiredParam of schema.required) {
        if (!(requiredParam in parameters)) {
          errors.push(`Required parameter '${requiredParam}' is missing`);
        }
      }
    }
    
    // Check parameter types
    if (schema.properties) {
      for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
        if (paramName in parameters) {
          const typeError = this.validateParameterType(
            paramName,
            parameters[paramName],
            paramSchema as any
          );
          
          if (typeError) {
            errors.push(typeError);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateParameterType(paramName: string, value: any, schema: any): string | null {
    const { type, enum: enumValues } = schema;
    
    if (enumValues && !enumValues.includes(value)) {
      return `Parameter '${paramName}' must be one of: ${enumValues.join(', ')}`;
    }
    
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Parameter '${paramName}' must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return `Parameter '${paramName}' must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Parameter '${paramName}' must be a boolean`;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return `Parameter '${paramName}' must be an array`;
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `Parameter '${paramName}' must be an object`;
        }
        break;
    }
    
    return null;
  }

  private async getToolExecutor(tool: Tool): Promise<IToolExecutor> {
    return this.toolExecutorFactory.createExecutor(tool.config.type);
  }

  private processResult(result: any, node: Node, context: IExecutionContext): any {
    const config = node.config;
    let processedResult = result.data;
    
    // Extract specific fields if configured
    if (config.outputFields) {
      processedResult = this.extractFields(processedResult, config.outputFields);
    }
    
    // Apply result transformations if configured
    if (config.outputTransformations) {
      processedResult = this.applyResultTransformations(processedResult, config.outputTransformations);
    }
    
    // Store raw result if configured
    if (config.storeRawResult) {
      context.setVariable(`tool_raw_result_${node.id.value}`, result.data);
    }
    
    // Store execution metadata if configured
    if (config.storeExecutionMetadata) {
      context.setVariable(`tool_metadata_${node.id.value}`, {
        executionTime: result.executionTime,
        success: result.success,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
    return processedResult;
  }

  private extractFields(data: any, fields: string[]): any {
    const result: any = {};
    
    for (const field of fields) {
      if (field in data) {
        result[field] = data[field];
      }
    }
    
    return result;
  }

  private applyResultTransformations(data: any, transformations: any[]): any {
    let result = data;
    
    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'map':
          result = this.applyMapTransformation(result, transformation);
          break;
        case 'filter':
          result = this.applyFilterTransformation(result, transformation);
          break;
        case 'format':
          result = this.applyFormatTransformation(result, transformation);
          break;
        case 'custom':
          result = this.applyCustomTransformation(result, transformation);
          break;
      }
    }
    
    return result;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async canExecute(node: Node, context: IExecutionContext): Promise<boolean> {
    // Check if node has required configuration
    const config = node.config;
    
    if (!config.toolId && !config.toolName) {
      return false;
    }
    
    // Check if tool exists
    if (config.toolId) {
      const tool = this.toolRegistry.getTool(new ToolId(config.toolId));
      if (!tool) {
        return false;
      }
    }
    
    if (config.toolName) {
      const tool = this.toolRegistry.getToolByName(config.toolName);
      if (!tool) {
        return false;
      }
    }
    
    return true;
  }

  async validate(node: Node): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = node.config;
    
    // Check required fields
    if (!config.toolId && !config.toolName) {
      errors.push('Tool node requires either toolId or toolName configuration');
    }
    
    // Validate tool exists
    if (config.toolId) {
      const tool = this.toolRegistry.getTool(new ToolId(config.toolId));
      if (!tool) {
        errors.push(`Tool with ID '${config.toolId}' not found`);
      }
    }
    
    if (config.toolName) {
      const tool = this.toolRegistry.getToolByName(config.toolName);
      if (!tool) {
        errors.push(`Tool with name '${config.toolName}' not found`);
      }
    }
    
    // Validate parameter mappings
    if (config.parameterMappings) {
      for (const [targetParam, sourcePath] of Object.entries(config.parameterMappings)) {
        if (typeof sourcePath !== 'string') {
          errors.push(`Parameter mapping for '${targetParam}' must be a string`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  getSupportedNodeTypes(): string[] {
    return ['tool'];
  }
}