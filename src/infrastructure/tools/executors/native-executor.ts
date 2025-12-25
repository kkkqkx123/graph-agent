import { injectable, inject } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../domain/tools/entities/tool-result';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { ToolExecutorBase, ToolExecutorConfigSchema, ToolExecutorCapabilities, ToolExecutorHealthCheck } from './tool-executor-base';

@injectable()
export class NativeExecutor extends ToolExecutorBase {
  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const config = tool.config;
      const command = config['command'] as string;
      const args = this.prepareArgs(config['args'] as string[] || [], execution.parameters);
      const options = this.prepareOptions(config['options'] || {});

      const result = await this.executeCommand(command, args, options);
      
      this.updateExecutionStats(true, Date.now() - execution.startedAt.getTime());
      return ToolResult.createSuccess(
        execution.id,
        result,
        Date.now() - execution.startedAt.getTime()
      );
    } catch (error) {
      this.updateExecutionStats(false, Date.now() - execution.startedAt.getTime());
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

  override async preprocessParameters(tool: Tool, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
    return parameters;
  }

  override async postprocessResult(tool: Tool, result: unknown): Promise<unknown> {
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

  override supportsTool(tool: Tool): boolean {
    return tool.type.toString() === 'native';
  }

  override getConfigSchema(): ToolExecutorConfigSchema {
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

  override getCapabilities(): ToolExecutorCapabilities {
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

  override async healthCheck(): Promise<ToolExecutorHealthCheck> {
    return {
      status: 'healthy',
      message: 'Native executor is operational',
      lastChecked: new Date()
    };
  }
}