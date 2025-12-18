import { injectable, inject } from 'inversify';
import { IToolExecutor } from '../../../domain/tools/interfaces/tool-executor.interface';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';

@injectable()
export class BuiltinExecutor implements IToolExecutor {
  private builtinFunctions: Map<string, Function> = new Map();

  constructor() {
    this.registerBuiltinFunctions();
  }

  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const functionName = tool.config['functionName'] as string;
      const func = this.builtinFunctions.get(functionName);
      
      if (!func) {
        throw new Error(`Builtin function '${functionName}' not found`);
      }

      // Execute the builtin function
      const result = await func(execution.parameters);
      
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

  async validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tool.config['functionName']) {
      errors.push('Builtin tool requires functionName');
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
    // 简单验证
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  async preprocessParameters(tool: Tool, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
    return parameters;
  }

  async postprocessResult(tool: Tool, result: unknown): Promise<unknown> {
    return result;
  }

  getType(): string {
    return 'builtin';
  }

  getName(): string {
    return 'Builtin Executor';
  }

  getVersion(): string {
    return '1.0.0';
  }

  getDescription(): string {
    return 'Executes builtin functions';
  }

  getSupportedToolTypes(): string[] {
    return ['builtin'];
  }

  supportsTool(tool: Tool): boolean {
    return tool.type.value === 'builtin';
  }

  getConfigSchema(): {
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
        functionName: {
          type: 'string',
          description: 'Name of the builtin function to execute'
        }
      },
      required: ['functionName']
    };
  }

  getCapabilities(): {
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
      batch: false,
      retry: false,
      timeout: false,
      cancellation: false,
      progress: false,
      metrics: false
    };
  }

  async getStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    details?: Record<string, unknown>;
    lastChecked: Date;
  }> {
    return {
      status: 'healthy',
      message: 'Builtin executor is operational',
      lastChecked: new Date()
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }> {
    return {
      status: 'healthy',
      message: 'Builtin executor is operational',
      lastChecked: new Date()
    };
  }

  async initialize(config: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  async configure(config: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  async getConfiguration(): Promise<Record<string, unknown>> {
    return {};
  }

  async resetConfiguration(): Promise<boolean> {
    return true;
  }

  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<boolean> {
    return true;
  }

  async restart(): Promise<boolean> {
    return true;
  }

  async isRunning(): Promise<boolean> {
    return true;
  }

  async getExecutionStatistics(startTime?: Date, endTime?: Date): Promise<{
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
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      cancelledExecutions: 0,
      timeoutExecutions: 0,
      averageExecutionTime: 0,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      successRate: 0,
      failureRate: 0,
      cancellationRate: 0,
      timeoutRate: 0
    };
  }

  async getPerformanceStatistics(startTime?: Date, endTime?: Date): Promise<{
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
    return {
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  async getErrorStatistics(startTime?: Date, endTime?: Date): Promise<{
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
      totalErrors: 0,
      byType: {},
      byTool: {},
      averageRetryCount: 0,
      maxRetryCount: 0,
      mostCommonErrors: []
    };
  }

  async getResourceUsage(): Promise<{
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

  async getConcurrencyStatistics(): Promise<{
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

  async cancelExecution(executionId: any, reason?: string): Promise<boolean> {
    return false;
  }

  async getExecutionStatus(executionId: any): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
    progress?: number;
    message?: string;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
  }> {
    return {
      status: 'completed'
    };
  }

  async getExecutionLogs(
    executionId: any,
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

  async executeStream(tool: Tool, execution: ToolExecution): Promise<AsyncIterable<{
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
    // 简单实现，返回单个完成事件
    const self = this;
    async function* streamGenerator() {
      const result = await self.execute(tool, execution);
      yield {
        type: 'complete' as const,
        data: result
      };
    }
    return streamGenerator();
  }

  async executeBatch(tools: Tool[], executions: ToolExecution[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const execution = executions[i];
      if (tool && execution) {
        results.push(await this.execute(tool, execution));
      }
    }
    return results;
  }

  async cleanup(): Promise<boolean> {
    return true;
  }

  async reset(): Promise<boolean> {
    return true;
  }

  async close(): Promise<boolean> {
    return true;
  }

  private registerBuiltinFunctions(): void {
    // Math functions
    this.builtinFunctions.set('add', (params: { a: number; b: number }) => params.a + params.b);
    this.builtinFunctions.set('subtract', (params: { a: number; b: number }) => params.a - params.b);
    this.builtinFunctions.set('multiply', (params: { a: number; b: number }) => params.a * params.b);
    this.builtinFunctions.set('divide', (params: { a: number; b: number }) => {
      if (params.b === 0) throw new Error('Division by zero');
      return params.a / params.b;
    });
    this.builtinFunctions.set('pow', (params: { base: number; exponent: number }) => Math.pow(params.base, params.exponent));
    this.builtinFunctions.set('sqrt', (params: { value: number }) => Math.sqrt(params.value));
    this.builtinFunctions.set('round', (params: { value: number; precision?: number }) => {
      const precision = params.precision || 0;
      const factor = Math.pow(10, precision);
      return Math.round(params.value * factor) / factor;
    });

    // String functions
    this.builtinFunctions.set('concat', (params: { strings: string[] }) => params.strings.join(''));
    this.builtinFunctions.set('split', (params: { text: string; delimiter: string }) => params.text.split(params.delimiter));
    this.builtinFunctions.set('length', (params: { text: string }) => params.text.length);
    this.builtinFunctions.set('toUpperCase', (params: { text: string }) => params.text.toUpperCase());
    this.builtinFunctions.set('toLowerCase', (params: { text: string }) => params.text.toLowerCase());
    this.builtinFunctions.set('trim', (params: { text: string }) => params.text.trim());
    this.builtinFunctions.set('replace', (params: { text: string; search: string; replace: string }) => 
      params.text.replace(new RegExp(params.search, 'g'), params.replace));

    // Array functions
    this.builtinFunctions.set('arrayLength', (params: { array: any[] }) => params.array.length);
    this.builtinFunctions.set('arraySum', (params: { array: number[] }) => params.array.reduce((sum, val) => sum + val, 0));
    this.builtinFunctions.set('arrayAverage', (params: { array: number[] }) => {
      if (params.array.length === 0) throw new Error('Cannot calculate average of empty array');
      return params.array.reduce((sum, val) => sum + val, 0) / params.array.length;
    });
    this.builtinFunctions.set('arrayMax', (params: { array: number[] }) => Math.max(...params.array));
    this.builtinFunctions.set('arrayMin', (params: { array: number[] }) => Math.min(...params.array));
    this.builtinFunctions.set('arraySort', (params: { array: any[]; ascending?: boolean }) => {
      const ascending = params.ascending !== false;
      return [...params.array].sort((a, b) => ascending ? a - b : b - a);
    });

    // Date functions
    this.builtinFunctions.set('currentDate', () => new Date().toISOString());
    this.builtinFunctions.set('currentTimestamp', () => Date.now());
    this.builtinFunctions.set('formatDate', (params: { date: string; format: string }) => {
      const date = new Date(params.date);
      // Simple format implementation - in real world, use a library like date-fns
      return date.toISOString();
    });
    this.builtinFunctions.set('parseDate', (params: { dateString: string }) => new Date(params.dateString).getTime());

    // Logic functions
    this.builtinFunctions.set('if', (params: { condition: boolean; thenValue: any; elseValue: any }) => 
      params.condition ? params.thenValue : params.elseValue);
    this.builtinFunctions.set('and', (params: { values: boolean[] }) => params.values.every(v => v));
    this.builtinFunctions.set('or', (params: { values: boolean[] }) => params.values.some(v => v));
    this.builtinFunctions.set('not', (params: { value: boolean }) => !params.value);

    // Utility functions
    this.builtinFunctions.set('sleep', async (params: { milliseconds: number }) => {
      await new Promise(resolve => setTimeout(resolve, params.milliseconds));
      return `Slept for ${params.milliseconds}ms`;
    });
    this.builtinFunctions.set('random', (params: { min?: number; max?: number }) => {
      const min = params.min || 0;
      const max = params.max || 1;
      return Math.random() * (max - min) + min;
    });
    this.builtinFunctions.set('randomInt', (params: { min?: number; max?: number }) => {
      const min = params.min || 0;
      const max = params.max || 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    });
    this.builtinFunctions.set('uuid', () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    });

    // JSON functions
    this.builtinFunctions.set('jsonParse', (params: { jsonString: string }) => JSON.parse(params.jsonString));
    this.builtinFunctions.set('jsonStringify', (params: { value: any; pretty?: boolean }) => 
      JSON.stringify(params.value, null, params.pretty ? 2 : 0));
    this.builtinFunctions.set('jsonGet', (params: { jsonObject: any; path: string }) => {
      const keys = params.path.split('.');
      let current = params.jsonObject;
      for (const key of keys) {
        if (current === null || current === undefined) {
          return undefined;
        }
        current = current[key];
      }
      return current;
    });
  }

  getAvailableFunctions(): string[] {
    return Array.from(this.builtinFunctions.keys());
  }

  hasFunction(functionName: string): boolean {
    return this.builtinFunctions.has(functionName);
  }
}