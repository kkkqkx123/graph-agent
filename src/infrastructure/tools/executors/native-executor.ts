import { injectable, inject } from 'inversify';
import { IToolExecutor } from '../../../../domain/tools/interfaces/tool-executor.interface';
import { Tool } from '../../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../../domain/tools/entities/tool-result';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

@injectable()
export class NativeExecutor implements IToolExecutor {
  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      const command = config['command'] as string;
      const args = this.prepareArgs(config['args'] as string[] || [], execution.parameters);
      const options = this.prepareOptions(config['options'] || {});

      const result = await this.executeCommand(command, args, options);
      
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

  private prepareArgs(templateArgs: string[], parameters: any): string[] {
    return templateArgs.map(arg => this.interpolateString(arg, parameters));
  }

  private prepareOptions(templateOptions: any): any {
    const options: any = {
      cwd: templateOptions.cwd || process.cwd(),
      env: { ...process.env, ...templateOptions.env },
      timeout: templateOptions.timeout || 30000, // 30 seconds default
      shell: templateOptions.shell || false
    };

    return options;
  }

  private interpolateString(template: string, parameters: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (parameters[key] !== undefined) {
        return String(parameters[key]);
      }
      return match;
    });
  }

  private async executeCommand(command: string, args: string[], options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const childProcess: ChildProcess = spawn(command, args, options);

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      childProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Try to parse JSON output
            const result = this.parseOutput(stdout);
            resolve(result);
          } catch (parseError) {
            // If parsing fails, return raw output
            resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code
            });
          }
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr.trim()}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          childProcess.kill();
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  private parseOutput(output: string): any {
    const trimmed = output.trim();
    
    // Try to parse as JSON
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      // Not JSON, return as string
      return trimmed;
    }
  }

  async executeScript(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      const script = config['script'] as string;
      const interpreter = config['interpreter'] as string || 'node';
      const options = this.prepareOptions(config['options'] || {});

      // Create temporary script file
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const tempDir = os.tmpdir();
      const scriptFileName = `script_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const scriptPath = path.join(tempDir, scriptFileName);

      // Write script to temporary file
      fs.writeFileSync(scriptPath, script);

      try {
        // Execute the script
        const result = await this.executeCommand(interpreter, [scriptPath], options);
        
        return ToolResult.createSuccess(
          execution.id,
          result,
          Date.now() - execution.startedAt.getTime()
        );
      } finally {
        // Clean up temporary file
        try {
          fs.unlinkSync(scriptPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      return ToolResult.createFailure(
        execution.id,
        error instanceof Error ? error.message : String(error),
        Date.now() - execution.startedAt.getTime()
      );
    }
  }

  async executeShellCommand(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      const command = this.interpolateString(config['command'] as string, execution.parameters);
      const baseOptions = config['options'] as Record<string, any> || {};
      const options = this.prepareOptions({ ...baseOptions, shell: true });

      const result = await this.executeCommand(command, [], options);
      
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

    if (!tool.config['command'] && !tool.config['script']) {
      errors.push('Native tool requires either command or script');
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

  async preprocessParameters(tool: Tool, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
    return parameters;
  }

  async postprocessResult(tool: Tool, result: unknown): Promise<unknown> {
    return result;
  }

  getType(): string {
    return 'native';
  }

  getName(): string {
    return 'Native Executor';
  }

  getVersion(): string {
    return '1.0.0';
  }

  getDescription(): string {
    return 'Executes native commands and scripts';
  }

  getSupportedToolTypes(): string[] {
    return ['native'];
  }

  supportsTool(tool: Tool): boolean {
    return tool.type.value === 'native';
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
        command: {
          type: 'string',
          description: 'Command to execute'
        },
        script: {
          type: 'string',
          description: 'Script content to execute'
        },
        interpreter: {
          type: 'string',
          description: 'Script interpreter (e.g., node, python)'
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Command arguments'
        },
        options: {
          type: 'object',
          description: 'Execution options'
        }
      },
      required: []
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
      timeout: true,
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
      message: 'Native executor is operational',
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
      message: 'Native executor is operational',
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
}