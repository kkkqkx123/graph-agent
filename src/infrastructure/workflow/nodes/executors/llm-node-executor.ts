import { injectable, inject } from 'inversify';
import { INodeExecutor } from '../../../../domain/workflow/submodules/graph/interfaces/node-executor.interface';
import { Node } from '../../../../domain/workflow/submodules/graph/entities/node';
import { ExecutionContext } from '../../engine/execution-context';
import { ILLMClient } from '../../../../domain/llm/interfaces/llm-client.interface';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../domain/llm/entities/llm-request';
import { LLMRequestId } from '../../../../domain/llm/value-objects/llm-request-id';

@injectable()
export class LLMNodeExecutor implements INodeExecutor {
  constructor(
    @inject('LLMClientFactory') private llmClientFactory: any
  ) {}

  async execute(node: Node, context: ExecutionContext): Promise<any> {
    try {
      // Get LLM client
      const client = await this.getLLMClient(node);
      
      // Prepare LLM request
      const request = this.prepareRequest(node, context);
      
      // Execute LLM request
      const response = await client.generateResponse(request);
      
      // Process response
      const result = this.processResponse(response, node, context);
      
      // Store response in context
      context.setVariable(`llm_response_${node.id.value}`, result);
      context.setVariable(`llm_tokens_${node.id.value}`, response.tokenUsage);
      
      return result;
    } catch (error) {
      throw new Error(`LLM node execution failed: ${error.message}`);
    }
  }

  private async getLLMClient(node: Node): Promise<ILLMClient> {
    const config = node.config;
    const provider = config.provider || 'openai';
    
    return this.llmClientFactory.getClient(provider);
  }

  private prepareRequest(node: Node, context: ExecutionContext): LLMRequest {
    const config = node.config;
    
    // Prepare messages
    const messages = this.prepareMessages(node, context);
    
    // Create LLM request
    return new LLMRequest(
      new LLMRequestId(this.generateRequestId()),
      messages,
      config.model || 'gpt-3.5-turbo',
      config.temperature,
      config.maxTokens,
      config.stop
    );
  }

  private prepareMessages(node: Node, context: ExecutionContext): any[] {
    const config = node.config;
    const messages: any[] = [];
    
    // Add system message if provided
    if (config.systemMessage) {
      messages.push({
        role: 'system',
        content: this.interpolateTemplate(config.systemMessage, context)
      });
    }
    
    // Add conversation history if configured
    if (config.includeHistory) {
      const historyMessages = this.getHistoryMessages(context, config.historyLimit || 10);
      messages.push(...historyMessages);
    }
    
    // Add user message
    if (config.userMessage) {
      messages.push({
        role: 'user',
        content: this.interpolateTemplate(config.userMessage, context)
      });
    }
    
    // Add context from previous nodes if configured
    if (config.includeContext) {
      const contextMessages = this.getContextMessages(node, context);
      messages.push(...contextMessages);
    }
    
    return messages;
  }

  private interpolateTemplate(template: string, context: ExecutionContext): string {
    // Replace variables in template with context values
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getContextValue(path, context);
      return value !== undefined ? String(value) : match;
    });
  }

  private getContextValue(path: string, context: ExecutionContext): any {
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

  private getHistoryMessages(context: ExecutionContext, limit: number): any[] {
    // Get conversation history from context
    const history = context.getVariable('conversation_history') || [];
    const recentHistory = history.slice(-limit);
    
    return recentHistory.map((entry: any) => ({
      role: entry.role,
      content: entry.content
    }));
  }

  private getContextMessages(node: Node, context: ExecutionContext): any[] {
    const messages: any[] = [];
    const config = node.config;
    
    // Get results from previous nodes
    const executedNodes = context.getExecutedNodes();
    const contextNodes = config.contextNodes || [];
    
    for (const nodeId of contextNodes) {
      if (executedNodes.has(nodeId)) {
        const nodeResult = context.getNodeResult(new NodeId(nodeId));
        if (nodeResult) {
          messages.push({
            role: 'system',
            content: `Result from node ${nodeId}: ${JSON.stringify(nodeResult)}`
          });
        }
      }
    }
    
    return messages;
  }

  private processResponse(response: LLMResponse, node: Node, context: ExecutionContext): any {
    const config = node.config;
    
    // Parse response based on expected format
    let parsedResponse = response.content;
    
    if (config.outputFormat === 'json') {
      try {
        parsedResponse = JSON.parse(response.content);
      } catch (error) {
        throw new Error(`Failed to parse JSON response: ${error.message}`);
      }
    }
    
    // Extract specific fields if configured
    if (config.outputFields) {
      parsedResponse = this.extractFields(parsedResponse, config.outputFields);
    }
    
    // Apply transformations if configured
    if (config.outputTransformations) {
      parsedResponse = this.applyTransformations(parsedResponse, config.outputTransformations);
    }
    
    // Store raw response if configured
    if (config.storeRawResponse) {
      context.setVariable(`llm_raw_response_${node.id.value}`, response.content);
    }
    
    // Store token usage if configured
    if (config.storeTokenUsage) {
      context.setVariable(`llm_token_usage_${node.id.value}`, response.tokenUsage);
    }
    
    return parsedResponse;
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

  private applyTransformations(data: any, transformations: any[]): any {
    let result = data;
    
    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'map':
          result = this.applyMapTransformation(result, transformation);
          break;
        case 'filter':
          result = this.applyFilterTransformation(result, transformation);
          break;
        case 'reduce':
          result = this.applyReduceTransformation(result, transformation);
          break;
        case 'custom':
          result = this.applyCustomTransformation(result, transformation);
          break;
      }
    }
    
    return result;
  }

  private applyMapTransformation(data: any, transformation: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.transformItem(item, transformation.mapping));
    }
    
    return this.transformItem(data, transformation.mapping);
  }

  private applyFilterTransformation(data: any, transformation: any): any {
    if (!Array.isArray(data)) {
      return data;
    }
    
    return data.filter(item => this.evaluateCondition(item, transformation.condition));
  }

  private applyReduceTransformation(data: any, transformation: any): any {
    if (!Array.isArray(data)) {
      return data;
    }
    
    return data.reduce((acc, item) => {
      // Apply reduction logic
      return acc; // Simplified for now
    }, transformation.initialValue);
  }

  private applyCustomTransformation(data: any, transformation: any): any {
    // Apply custom transformation logic
    // This would typically involve calling a custom function
    return data;
  }

  private transformItem(item: any, mapping: any): any {
    const result: any = {};
    
    for (const [targetField, sourceField] of Object.entries(mapping)) {
      result[targetField] = this.getNestedValue(item, sourceField as string);
    }
    
    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private evaluateCondition(item: any, condition: any): boolean {
    // Simple condition evaluation
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
        default:
          return true;
      }
    }
    
    return true;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async validate(node: Node): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = node.config;
    
    // Check required fields
    if (!config.provider && !config.model) {
      errors.push('LLM node requires either provider or model configuration');
    }
    
    if (!config.userMessage && !config.systemMessage) {
      errors.push('LLM node requires at least a user message or system message');
    }
    
    // Validate message templates
    if (config.userMessage && typeof config.userMessage !== 'string') {
      errors.push('User message must be a string');
    }
    
    if (config.systemMessage && typeof config.systemMessage !== 'string') {
      errors.push('System message must be a string');
    }
    
    // Validate output format
    if (config.outputFormat && !['text', 'json'].includes(config.outputFormat)) {
      errors.push('Output format must be either "text" or "json"');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}