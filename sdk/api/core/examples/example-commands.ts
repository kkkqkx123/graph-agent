/**
 * Command模式使用示例
 * 展示如何创建和使用自定义Command
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../command';
import { success, failure, ExecutionResult } from '../../types/execution-result';

/**
 * 示例1: 简单的问候命令
 */
export class GreetingCommand extends BaseCommand<string> {
  constructor(private readonly name: string) {
    super();
  }

  async execute(): Promise<ExecutionResult<string>> {
    const result = `Hello, ${this.name}!`;
    return success(result, this.getExecutionTime());
  }

  validate(): CommandValidationResult {
    if (!this.name || this.name.trim().length === 0) {
      return validationFailure(['Name cannot be empty']);
    }
    return validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'GreetingCommand',
      description: 'Greets the user by name',
      category: 'execution',
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}

/**
 * 示例2: 带参数的计算命令
 */
export class CalculateCommand extends BaseCommand<number> {
  constructor(
    private readonly a: number,
    private readonly b: number,
    private readonly operation: 'add' | 'subtract' | 'multiply' | 'divide'
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<number>> {
    let result: number;
    
    switch (this.operation) {
      case 'add':
        result = this.a + this.b;
        break;
      case 'subtract':
        result = this.a - this.b;
        break;
      case 'multiply':
        result = this.a * this.b;
        break;
      case 'divide':
        if (this.b === 0) {
          return failure<number>('Division by zero', this.getExecutionTime());
        }
        result = this.a / this.b;
        break;
      default:
        return failure<number>('Invalid operation', this.getExecutionTime());
    }

    return success(result, this.getExecutionTime());
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (typeof this.a !== 'number') {
      errors.push('First operand must be a number');
    }
    if (typeof this.b !== 'number') {
      errors.push('Second operand must be a number');
    }
    if (this.operation === 'divide' && this.b === 0) {
      errors.push('Cannot divide by zero');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'CalculateCommand',
      description: 'Performs basic arithmetic operations',
      category: 'execution',
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}

/**
 * 示例3: 模拟工作流执行命令
 */
export interface WorkflowExecutionParams {
  workflowId: string;
  input: Record<string, any>;
}

export interface WorkflowExecutionResult {
  threadId: string;
  status: 'completed' | 'failed' | 'cancelled';
  output: Record<string, any>;
}

export class ExecuteWorkflowCommand extends BaseCommand<WorkflowExecutionResult> {
  constructor(private readonly params: WorkflowExecutionParams) {
    super();
  }

  async execute(): Promise<ExecutionResult<WorkflowExecutionResult>> {
    // 模拟工作流执行
    await this.delay(100); // 模拟异步操作

    const result: WorkflowExecutionResult = {
      threadId: `thread-${Date.now()}`,
      status: 'completed',
      output: {
        ...this.params.input,
        processed: true,
        timestamp: new Date().toISOString()
      }
    };

    return success(result, this.getExecutionTime());
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.workflowId || this.params.workflowId.trim().length === 0) {
      errors.push('Workflow ID cannot be empty');
    }
    if (!this.params.input) {
      errors.push('Input cannot be null');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteWorkflowCommand',
      description: 'Executes a workflow with given input',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 示例4: 支持撤销的命令
 */
export class CounterCommand extends BaseCommand<number> {
  private static counter = 0;

  async execute(): Promise<ExecutionResult<number>> {
    CounterCommand.counter++;
    return success(CounterCommand.counter, this.getExecutionTime());
  }

  override async undo(): Promise<ExecutionResult<void>> {
    CounterCommand.counter--;
    return success<void>(undefined, this.getExecutionTime());
  }

  validate(): CommandValidationResult {
    return validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'CounterCommand',
      description: 'Increments a counter and supports undo',
      category: 'execution',
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  static getCounter(): number {
    return CounterCommand.counter;
  }

  static resetCounter(): void {
    CounterCommand.counter = 0;
  }
}

/**
 * 示例5: 同步命令
 */
import { BaseSyncCommand } from '../command';

export class SyncAddCommand extends BaseSyncCommand<number> {
  constructor(
    private readonly a: number,
    private readonly b: number
  ) {
    super();
  }

  executeSync(): ExecutionResult<number> {
    const result = this.a + this.b;
    return success(result, this.getExecutionTime());
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (typeof this.a !== 'number') {
      errors.push('First operand must be a number');
    }
    if (typeof this.b !== 'number') {
      errors.push('Second operand must be a number');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'SyncAddCommand',
      description: 'Synchronously adds two numbers',
      category: 'execution',
      requiresAuth: false,
      version: '1.0.0'
    };
  }
}