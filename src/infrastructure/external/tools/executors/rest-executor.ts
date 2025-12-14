import { injectable, inject } from 'inversify';
import { IToolExecutor } from '../../../../domain/tools/interfaces/tool-executor.interface';
import { Tool } from '../../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../../domain/tools/entities/tool-result';
import { HttpClient } from '../../../common/http/http-client';
import { ParameterAdapter } from '../adapters/parameter-adapter';

@injectable()
export class RestExecutor implements IToolExecutor {
  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('ParameterAdapter') private parameterAdapter: ParameterAdapter
  ) {}

  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      
      // Prepare request
      const request = this.prepareRequest(config, execution);
      
      // Make HTTP call
      const response = await this.httpClient.request(request);
      
      // Process response
      const result = this.processResponse(response, config);
      
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

  private prepareRequest(config: any, execution: ToolExecution): any {
    const url = this.interpolateUrl(config.url, execution.parameters);
    const method = config.method || 'GET';
    const headers = this.prepareHeaders(config.headers || {}, execution.parameters);
    const body = this.prepareBody(config, execution.parameters);
    const params = this.prepareParams(config.params || {}, execution.parameters);

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
    if (config.timeout) {
      request.timeout = config.timeout;
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
      return this.parameterAdapter.adaptParameters(config.body.template, parameters);
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
    return this.parameterAdapter.adaptParameters(config.body, parameters);
  }

  private prepareParams(templateParams: any, parameters: any): any {
    const params: any = {};

    for (const [key, value] of Object.entries(templateParams)) {
      if (typeof value === 'string') {
        params[key] = this.interpolateString(value, parameters);
      } else if (typeof value === 'object' && value.source) {
        // Handle parameter mapping
        params[key] = this.getParameterValue(value.source, parameters);
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
        return match; // Return original placeholder if not found
      }
      current = current[key];
    }
    
    return String(current);
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
    
    if (transformConfig.type === 'function') {
      // Apply custom transformation function (if available)
      // This would require a function registry or sandboxed execution
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
}