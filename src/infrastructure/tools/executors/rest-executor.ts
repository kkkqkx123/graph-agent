/**
 * REST 工具执行器
 * 
 * 执行 REST API 工具
 */

import { injectable, inject } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';
import { HttpClient } from '../../common/http/http-client';
import { ToolExecutorBase, ToolExecutorConfigSchema, ToolExecutorCapabilities, ToolExecutorHealthCheck } from './tool-executor-base';

@injectable()
export class RestExecutor extends ToolExecutorBase {
  constructor(
    @inject('HttpClient') private httpClient: HttpClient
  ) {
    super();
  }

  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      
      // Prepare request
      const request = this.prepareRequest(config, execution);
      
      // Make HTTP call
      const response = await this.httpClient.request(request);
      
      // Process response
      const result = this.processResponse(response, config);
      
      return ToolResult.createSuccess(
        execution.id,
        result,
        Date.now() - execution.startedAt.getTime()
      );
    } catch (error) {
      return ToolResult.createFailure(
        execution.id,
        error instanceof Error ? error.message : String(error),
        Date.now() - execution.startedAt.getTime()
      );
    }
  }

  private prepareRequest(config: any, execution: ToolExecution): any {
    const url = this.interpolateUrl(config.getValue('url') as string, execution.parameters);
    const method = config.getValue('method') as string || 'GET';
    const headers = this.prepareHeaders(config.getValue('headers') || {}, execution.parameters);
    const body = this.prepareBody(config, execution.parameters);
    const params = this.prepareParams(config.getValue('params') || {}, execution.parameters);

    const request: any = {
      url,
      method,
      headers
    };

    if (method !== 'GET' && body !== undefined) {
      request.body = body;
    }

    if (Object.keys(params).length > 0) {
      request.params = params;
    }

    // Add timeout if specified
    if (config.getValue('timeout')) {
      request.timeout = config.getValue('timeout');
    }

    return request;
  }

  private interpolateUrl(url: string, parameters: any): string {
    return url.replace(/\{(\w+)\}/g, (match, key) => {
      if (parameters[key] !== undefined) {
        return encodeURIComponent(String(parameters[key]));
      }
      return match;
    });
  }

  private prepareHeaders(templateHeaders: any, parameters: any): any {
    const headers: any = {};

    for (const [key, value] of Object.entries(templateHeaders)) {
      if (typeof value === 'string') {
        headers[key] = this.interpolateString(value, parameters);
      } else {
        headers[key] = value;
      }
    }

    // Set default content-type if not provided and we have a body
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private prepareBody(config: any, parameters: any): any {
    if (!config.body) {
      return undefined;
    }

    if (typeof config.body === 'string') {
      return this.interpolateString(config.body, parameters);
    }

    if (config.body.type === 'json') {
      return this.adaptParameters(config.body.template, parameters);
    }

    if (config.body.type === 'form') {
      const formData: any = {};
      for (const [key, value] of Object.entries(config.body.fields)) {
        if (typeof value === 'string') {
          formData[key] = this.interpolateString(value, parameters);
        } else {
          formData[key] = value;
        }
      }
      return formData;
    }

    if (config.body.type === 'raw') {
      return config.body.content;
    }

    // Default: treat as JSON template
    return this.adaptParameters(config.body, parameters);
  }

  private prepareParams(templateParams: any, parameters: any): any {
    const params: any = {};

    for (const [key, value] of Object.entries(templateParams)) {
      if (typeof value === 'string') {
        params[key] = this.interpolateString(value, parameters);
      } else if (typeof value === 'object' && value !== null && 'source' in value) {
        // Handle parameter mapping
        params[key] = this.getParameterValue((value as any).source, parameters);
      } else {
        params[key] = value;
      }
    }

    return params;
  }

  private interpolateString(template: string, parameters: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return this.getParameterValue(path, parameters);
    });
  }

  private getParameterValue(path: string, parameters: any): string {
    const keys = path.split('.');
    let current = parameters;
    
    for (const key of keys) {
      if (current === null || current === undefined || current[key] === undefined) {
        return path; // Return original placeholder if not found
      }
      current = current[key];
    }
    
    return String(current);
  }

  private adaptParameters(template: any, parameters: any): any {
    // Simple parameter adaptation
    if (typeof template === 'object' && template !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        if (typeof value === 'string') {
          result[key] = this.interpolateString(value, parameters);
        } else if (typeof value === 'object') {
          result[key] = this.adaptParameters(value, parameters);
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    return template;
  }

  private processResponse(response: any, config: any): any {
    const result: any = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };

    // Process response body based on configuration
    if (config.responseProcessing) {
      const processing = config.responseProcessing;
      
      if (processing.extract) {
        // Extract specific data from response
        result.data = this.extractData(response.data, processing.extract);
      } else if (processing.transform) {
        // Apply transformation function
        result.data = this.transformData(response.data, processing.transform);
      } else {
        // Default: use raw response data
        result.data = response.data;
      }
    } else {
      // Default: use raw response data
      result.data = response.data;
    }

    // Add metadata if configured
    if (config.includeMetadata) {
      result.metadata = {
        url: response.config?.url,
        method: response.config?.method,
        duration: response.duration,
        timestamp: new Date().toISOString()
      };
    }

    return result;
  }

  private extractData(data: any, extractConfig: any): any {
    if (extractConfig.path) {
      // Extract data using JSON path
      const keys = extractConfig.path.split('.');
      let current = data;
      
      for (const key of keys) {
        if (current === null || current === undefined || current[key] === undefined) {
          return undefined;
        }
        current = current[key];
      }
      
      return current;
    }
    
    if (extractConfig.field) {
      // Extract specific field
      return data[extractConfig.field];
    }
    
    if (extractConfig.index !== undefined) {
      // Extract array element by index
      if (Array.isArray(data) && data[extractConfig.index] !== undefined) {
        return data[extractConfig.index];
      }
      return undefined;
    }
    
    return data;
  }

  private transformData(data: any, transformConfig: any): any {
    if (transformConfig.type === 'map') {
      // Apply field mapping
      const result: any = {};
      for (const [targetField, sourceField] of Object.entries(transformConfig.mapping)) {
        result[targetField] = this.extractData(data, { path: sourceField as string });
      }
      return result;
    }
    
    if (transformConfig.type === 'filter') {
      // Filter array data
      if (Array.isArray(data)) {
        return data.filter(item => this.evaluateCondition(item, transformConfig.condition));
      }
      return data;
    }
    
    return data;
  }

  private evaluateCondition(item: any, condition: any): boolean {
    // Simple condition evaluation
    if (condition.field && condition.operator && condition.value) {
      const fieldValue = item[condition.field];
      
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

  async validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tool.config.getValue('url')) {
      errors.push('REST工具必须配置URL');
    }

    if (!tool.config.getValue('method')) {
      warnings.push('未指定HTTP方法，将使用默认GET');
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
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本参数验证
    if (!parameters || typeof parameters !== 'object') {
      errors.push('参数必须是对象');
      return { isValid: false, errors, warnings };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getType(): string {
    return 'rest';
  }

  getName(): string {
    return 'REST Executor';
  }

  getVersion(): string {
    return '1.0.0';
  }

  getDescription(): string {
    return 'REST API工具执行器，支持HTTP请求执行';
  }

  getSupportedToolTypes(): string[] {
    return ['rest', 'http', 'api'];
  }

  override supportsTool(tool: Tool): boolean {
    return tool.type.value === 'rest' || tool.type.value === 'http' || tool.type.value === 'api';
  }

  getConfigSchema(): ToolExecutorConfigSchema {
    return {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'REST API的URL'
        },
        method: {
          type: 'string',
          description: 'HTTP方法'
        },
        headers: {
          type: 'object',
          description: 'HTTP请求头'
        },
        timeout: {
          type: 'number',
          description: '请求超时时间（毫秒）'
        }
      },
      required: ['url']
    };
  }

  getCapabilities(): ToolExecutorCapabilities {
    return {
      streaming: false,
      async: true,
      batch: true,
      retry: false,
      timeout: true,
      cancellation: false
    };
  }

  async healthCheck(): Promise<ToolExecutorHealthCheck> {
    try {
      // 简单的健康检查
      await this.httpClient.request({
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        timeout: 5000
      });
      
      return {
        status: 'healthy',
        message: 'REST执行器运行正常',
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `健康检查失败: ${error}`,
        lastChecked: new Date()
      };
    }
  }
}