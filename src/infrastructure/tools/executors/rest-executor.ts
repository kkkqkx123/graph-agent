import { injectable, inject } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';
import { HttpClient } from '../../common/http/http-client';
import { ParameterAdapter } from '../adapters/parameter-adapter';
import { ID } from '../../../domain/common/value-objects/id';
import { ToolExecutorBase } from './tool-executor-base';

@injectable()
export class RestExecutor extends ToolExecutorBase {
  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('ParameterAdapter') private parameterAdapter: ParameterAdapter
  ) {
    super();
  }

  override async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      this.executionStats.totalExecutions++;
      const startTime = Date.now();
      
      const config = tool.config;
      
      // Prepare request
      const request = this.prepareRequest(config, execution);
      
      // Make HTTP call
      const response = await this.httpClient.request(request);
      
      // Process response
      const result = this.processResponse(response, config);
      
      this.executionStats.successfulExecutions++;
      this.executionStats.totalExecutionTime += Date.now() - startTime;
      
      this.updateExecutionStats(true, Date.now() - execution.startedAt.getTime());
      return new ToolResult(
        ID.generate(),
        execution.id,
        true,
        result,
        undefined,
        Date.now() - execution.startedAt.getTime()
      );
    } catch (error) {
      this.executionStats.failedExecutions++;
      this.updateExecutionStats(false, Date.now() - execution.startedAt.getTime());
      return new ToolResult(
        ID.generate(),
        execution.id,
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
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

  // IToolExecutor 接口实现
  override async validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tool.config['url']) {
      errors.push('REST工具必须配置URL');
    }

    if (!tool.config['method']) {
      warnings.push('未指定HTTP方法，将使用默认GET');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  override async validateParameters(tool: Tool, parameters: Record<string, unknown>): Promise<{
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

  override async preprocessParameters(tool: Tool, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
    // 基本参数预处理
    return { ...parameters };
  }

  override async postprocessResult(tool: Tool, result: unknown): Promise<unknown> {
    // 基本结果后处理
    return result;
  }

  override getType(): string {
    return 'rest';
  }

  override getName(): string {
    return 'REST Executor';
  }

  override getVersion(): string {
    return '1.0.0';
  }

  override getDescription(): string {
    return 'REST API工具执行器，支持HTTP请求执行';
  }

  override getSupportedToolTypes(): string[] {
    return ['rest', 'http', 'api'];
  }

  override supportsTool(tool: Tool): boolean {
    return tool.type.toString() === 'rest' || tool.type.toString() === 'http' || tool.type.toString() === 'api';
  }

  override getConfigSchema(): {
    type: string;
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
      required?: string[];
      default?: any;
    }>;
    required: string[];
  } {
    return {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'REST API的URL'
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'GET',
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

  override getCapabilities(): {
    streaming: boolean;
    async: boolean;
    batch: boolean;
    retry: boolean;
    timeout: boolean;
    cancellation: boolean;
    progress: boolean;
    metrics: boolean;
  } {
    return {
      streaming: false,
      async: true,
      batch: true,
      retry: false,
      timeout: true,
      cancellation: false,
      progress: false,
      metrics: true
    };
  }

  override async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }> {
    const startTime = Date.now();
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
        latency: Date.now() - startTime,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `健康检查失败: ${error}`,
        latency: Date.now() - startTime,
        lastChecked: new Date()
      };
    }
  }

  override async initialize(config: Record<string, unknown>): Promise<boolean> {
    try {
      this.config = config;
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('初始化REST执行器失败:', error);
      return false;
    }
  }

  override async configure(config: Record<string, unknown>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...config };
      return true;
    } catch (error) {
      console.error('配置REST执行器失败:', error);
      return false;
    }
  }

  override async getConfiguration(): Promise<Record<string, unknown>> {
    return { ...this.config };
  }

  override async resetConfiguration(): Promise<boolean> {
    this.config = {};
    return true;
  }

  override async start(): Promise<boolean> {
    this.isRunningFlag = true;
    return true;
  }

  override async stop(): Promise<boolean> {
    this.isRunningFlag = false;
    return true;
  }

  override async restart(): Promise<boolean> {
    await this.stop();
    await this.start();
    return true;
  }

  override async isRunning(): Promise<boolean> {
    return this.isRunningFlag;
  }

  override async getExecutionStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
    timeoutExecutions: number;
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    successRate: number;
    failureRate: number;
    cancellationRate: number;
    timeoutRate: number;
  }> {
    const total = this.executionStats.totalExecutions;
    const successRate = total > 0 ? (this.executionStats.successfulExecutions / total) * 100 : 0;
    const failureRate = total > 0 ? (this.executionStats.failedExecutions / total) * 100 : 0;
    const cancellationRate = total > 0 ? (this.executionStats.cancelledExecutions / total) * 100 : 0;
    const timeoutRate = total > 0 ? (this.executionStats.timeoutExecutions / total) * 100 : 0;
    const averageExecutionTime = total > 0 ? this.executionStats.totalExecutionTime / total : 0;

    return {
      totalExecutions: this.executionStats.totalExecutions,
      successfulExecutions: this.executionStats.successfulExecutions,
      failedExecutions: this.executionStats.failedExecutions,
      cancelledExecutions: this.executionStats.cancelledExecutions,
      timeoutExecutions: this.executionStats.timeoutExecutions,
      averageExecutionTime,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      successRate,
      failureRate,
      cancellationRate,
      timeoutRate
    };
  }

  override async getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<{
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    const stats = await this.getExecutionStatistics();
    return {
      averageLatency: stats.averageExecutionTime,
      medianLatency: stats.averageExecutionTime,
      p95Latency: stats.averageExecutionTime,
      p99Latency: stats.averageExecutionTime,
      maxLatency: stats.maxExecutionTime,
      minLatency: stats.minExecutionTime,
      throughput: stats.totalExecutions,
      errorRate: stats.failureRate,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  override async getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
    totalErrors: number;
    byType: Record<string, number>;
    byTool: Record<string, number>;
    averageRetryCount: number;
    maxRetryCount: number;
    mostCommonErrors: Array<{
      error: string;
      count: number;
      percentage: number;
    }>;
  }> {
    return {
      totalErrors: this.executionStats.failedExecutions,
      byType: {},
      byTool: {},
      averageRetryCount: 0,
      maxRetryCount: 0,
      mostCommonErrors: []
    };
  }

  override async getResourceUsage(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkUsage: number;
    activeConnections: number;
    maxConnections: number;
  }> {
    return {
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      networkUsage: 0,
      activeConnections: 0,
      maxConnections: 0
    };
  }

  override async getConcurrencyStatistics(): Promise<{
    currentExecutions: number;
    maxConcurrentExecutions: number;
    averageConcurrentExecutions: number;
    queuedExecutions: number;
    maxQueueSize: number;
    averageQueueSize: number;
  }> {
    return {
      currentExecutions: 0,
      maxConcurrentExecutions: 0,
      averageConcurrentExecutions: 0,
      queuedExecutions: 0,
      maxQueueSize: 0,
      averageQueueSize: 0
    };
  }

  override async cancelExecution(executionId: ID, reason?: string): Promise<boolean> {
    // REST执行器不支持取消执行
    return false;
  }

  override async getExecutionStatus(executionId: ID): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
    progress?: number;
    message?: string;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
  }> {
    return {
      status: 'completed',
      message: '执行已完成'
    };
  }

  override async getExecutionLogs(
    executionId: ID,
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit?: number
  ): Promise<Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
  }>> {
    return [];
  }

  override async executeStream(tool: Tool, execution: ToolExecution): Promise<AsyncIterable<{
    type: 'data' | 'progress' | 'log' | 'error' | 'complete';
    data?: unknown;
    progress?: number;
    log?: {
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      data?: unknown;
    };
    error?: string;
  }>> {
    // REST执行器不支持流式执行
    throw new Error('REST执行器不支持流式执行');
  }

  override async executeBatch(tools: Tool[], executions: ToolExecution[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const execution = executions[i];
      if (tool && execution) {
        const result = await this.execute(tool, execution);
        results.push(result);
      }
    }
    return results;
  }

  override async cleanup(): Promise<boolean> {
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      cancelledExecutions: 0,
      timeoutExecutions: 0,
      totalExecutionTime: 0
    };
    return true;
  }

  override async reset(): Promise<boolean> {
    await this.cleanup();
    return true;
  }

  override async close(): Promise<boolean> {
    await this.stop();
    await this.cleanup();
    return true;
  }
}