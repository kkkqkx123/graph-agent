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

@injectable()
export class BuiltinExecutor extends ToolExecutorBase {
  private builtinFunctions: Map<string, Function> = new Map();

  constructor() {
    super();
    this.registerBuiltinFunctions();
  }

  async execute(tool: Tool, execution: ToolExecution): Promise<ToolResult> {
    try {
      const functionName = tool.config.getValue('functionName') as string;
      const func = this.builtinFunctions.get(functionName);

      if (!func) {
        throw new Error(`Builtin function '${functionName}' not found`);
      }

      // Execute the builtin function
      const result = await func(execution.parameters);

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

  async validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tool.config.getValue('functionName')) {
      errors.push('Builtin tool requires functionName');
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
    // 简单验证
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
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

  override supportsTool(tool: Tool): boolean {
    return tool.type.value === 'builtin';
  }

  getConfigSchema(): ToolExecutorConfigSchema {
    return {
      type: 'object',
      properties: {
        functionName: {
          type: 'string',
          description: 'Name of the builtin function to execute',
        },
      },
      required: ['functionName'],
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
      message: 'Builtin executor is operational',
      lastChecked: new Date(),
    };
  }

  private registerBuiltinFunctions(): void {
    // Math functions
    this.builtinFunctions.set('add', (params: { a: number; b: number }) => params.a + params.b);
    this.builtinFunctions.set(
      'subtract',
      (params: { a: number; b: number }) => params.a - params.b
    );
    this.builtinFunctions.set(
      'multiply',
      (params: { a: number; b: number }) => params.a * params.b
    );
    this.builtinFunctions.set('divide', (params: { a: number; b: number }) => {
      if (params.b === 0) throw new Error('Division by zero');
      return params.a / params.b;
    });
    this.builtinFunctions.set('pow', (params: { base: number; exponent: number }) =>
      Math.pow(params.base, params.exponent)
    );
    this.builtinFunctions.set('sqrt', (params: { value: number }) => Math.sqrt(params.value));
    this.builtinFunctions.set('round', (params: { value: number; precision?: number }) => {
      const precision = params.precision || 0;
      const factor = Math.pow(10, precision);
      return Math.round(params.value * factor) / factor;
    });

    // String functions
    this.builtinFunctions.set('concat', (params: { strings: string[] }) => params.strings.join(''));
    this.builtinFunctions.set('split', (params: { text: string; delimiter: string }) =>
      params.text.split(params.delimiter)
    );
    this.builtinFunctions.set('length', (params: { text: string }) => params.text.length);
    this.builtinFunctions.set('toUpperCase', (params: { text: string }) =>
      params.text.toUpperCase()
    );
    this.builtinFunctions.set('toLowerCase', (params: { text: string }) =>
      params.text.toLowerCase()
    );
    this.builtinFunctions.set('trim', (params: { text: string }) => params.text.trim());
    this.builtinFunctions.set(
      'replace',
      (params: { text: string; search: string; replace: string }) =>
        params.text.replace(new RegExp(params.search, 'g'), params.replace)
    );

    // Array functions
    this.builtinFunctions.set('arrayLength', (params: { array: any[] }) => params.array.length);
    this.builtinFunctions.set('arraySum', (params: { array: number[] }) =>
      params.array.reduce((sum, val) => sum + val, 0)
    );
    this.builtinFunctions.set('arrayAverage', (params: { array: number[] }) => {
      if (params.array.length === 0) throw new Error('Cannot calculate average of empty array');
      return params.array.reduce((sum, val) => sum + val, 0) / params.array.length;
    });
    this.builtinFunctions.set('arrayMax', (params: { array: number[] }) =>
      Math.max(...params.array)
    );
    this.builtinFunctions.set('arrayMin', (params: { array: number[] }) =>
      Math.min(...params.array)
    );
    this.builtinFunctions.set('arraySort', (params: { array: any[]; ascending?: boolean }) => {
      const ascending = params.ascending !== false;
      return [...params.array].sort((a, b) => (ascending ? a - b : b - a));
    });

    // Date functions
    this.builtinFunctions.set('currentDate', () => new Date().toISOString());
    this.builtinFunctions.set('currentTimestamp', () => Date.now());
    this.builtinFunctions.set('formatDate', (params: { date: string; format: string }) => {
      const date = new Date(params.date);
      // Simple format implementation - in real world, use a library like date-fns
      return date.toISOString();
    });
    this.builtinFunctions.set('parseDate', (params: { dateString: string }) =>
      new Date(params.dateString).getTime()
    );

    // Logic functions
    this.builtinFunctions.set(
      'if',
      (params: { condition: boolean; thenValue: any; elseValue: any }) =>
        params.condition ? params.thenValue : params.elseValue
    );
    this.builtinFunctions.set('and', (params: { values: boolean[] }) =>
      params.values.every(v => v)
    );
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
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    });

    // JSON functions
    this.builtinFunctions.set('jsonParse', (params: { jsonString: string }) =>
      JSON.parse(params.jsonString)
    );
    this.builtinFunctions.set('jsonStringify', (params: { value: any; pretty?: boolean }) =>
      JSON.stringify(params.value, null, params.pretty ? 2 : 0)
    );
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
