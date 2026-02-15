/**
 * Command模式核心接口
 * 定义统一的命令执行接口
 */

import type { ExecutionResult } from './execution-result';
import { SDKError, ExecutionError as SDKExecutionError } from '@modular-agent/types';
import { CommandValidator } from '../utils/command-validator';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 命令元数据
 */
export interface CommandMetadata {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 命令分类 */
  category: 'execution' | 'monitoring' | 'management';
  /** 是否需要认证 */
  requiresAuth: boolean;
  /** 命令版本 */
  version: string;
}

/**
 * 命令验证结果
 */
export interface CommandValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 创建成功验证结果
 */
export function validationSuccess(): CommandValidationResult {
  return { valid: true, errors: [] };
}

/**
 * 创建失败验证结果
 */
export function validationFailure(errors: string[]): CommandValidationResult {
  return { valid: false, errors };
}

/**
 * Command接口
 * 所有命令都需要实现此接口
 */
export interface Command<T> {
  /**
   * 执行命令
   * @returns 执行结果
   */
  execute(): Promise<ExecutionResult<T>>;

  /**
   * 撤销命令（可选）
   * @returns 撤销结果
   */
  undo?(): Promise<ExecutionResult<void>>;

  /**
   * 验证命令参数
   * @returns 验证结果
   */
  validate(): CommandValidationResult;

  /**
   * 获取命令元数据
   * @returns 命令元数据
   */
  getMetadata(): CommandMetadata;
}

/**
 * 抽象命令基类
 * 提供通用的命令实现
 */
export abstract class BaseCommand<T> implements Command<T> {
  protected readonly startTime: number = Date.now();

  /**
   * 执行命令 - 统一错误处理入口
   */
  async execute(): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    try {
      const result = await this.executeInternal();
      return this.success(result, Date.now() - startTime);
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  /**
   * 内部执行方法 - 子类实现具体的执行逻辑
   */
  protected abstract executeInternal(): Promise<T>;

  /**
   * 撤销命令（默认不支持）
   */
  async undo(): Promise<ExecutionResult<void>> {
    const startTime = Date.now();
    try {
      throw new Error(`Command ${this.getMetadata().name} does not support undo`);
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  /**
   * 验证命令参数
   */
  abstract validate(): CommandValidationResult;

  /**
   * 获取命令元数据
   */
  abstract getMetadata(): CommandMetadata;

  /**
   * 获取执行时间
   */
  protected getExecutionTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 统一错误处理方法
   * @param error 错误对象
   * @param startTime 开始时间
   * @returns 执行结果
   */
  protected handleError(error: unknown, startTime: number): ExecutionResult<any> {
    let sdkError: SDKError;
    
    // 如果已经是 SDKError（包括所有子类），直接使用
    if (error instanceof SDKError) {
      sdkError = error;
    }
    // 如果是普通 Error，转换为 SDKExecutionError
    else if (error instanceof Error) {
      sdkError = new SDKExecutionError(
        error.message,
        undefined,
        undefined,
        {
          originalError: error.name,
          stack: error.stack
        },
        error
      );
    }
    // 其他类型，转换为 SDKExecutionError
    else {
      sdkError = new SDKExecutionError(
        String(error),
        undefined,
        undefined,
        undefined,
        undefined
      );
    }
    
    // 返回包含详细错误信息的失败结果
    return this.failure(sdkError, Date.now() - startTime);
  }

  /**
   * 创建成功结果
   */
  protected success<T>(data: T, executionTime: number): ExecutionResult<T> {
    return {
      result: ok(data),
      executionTime
    };
  }

  /**
   * 创建失败结果
   */
  protected failure<T>(error: SDKError, executionTime: number): ExecutionResult<T> {
    return {
      result: err(error),
      executionTime
    };
  }

  /**
   * 获取验证器实例
   * @returns CommandValidator 实例
   */
  protected createValidator(): CommandValidator {
    return new CommandValidator();
  }
}

/**
 * 同步命令接口
 * 用于不需要异步执行的命令
 */
export interface SyncCommand<T> extends Command<T> {
  executeSync(): ExecutionResult<T>;
}

/**
 * 抽象同步命令基类
 */
export abstract class BaseSyncCommand<T> extends BaseCommand<T> implements SyncCommand<T> {
  /**
   * 异步执行 - 调用同步执行方法
   */
  override async execute(): Promise<ExecutionResult<T>> {
    return this.executeSync();
  }

  /**
   * 同步执行方法 - 子类实现具体的执行逻辑
   */
  abstract executeSync(): ExecutionResult<T>;

  /**
   * 内部执行方法 - 同步命令不需要实现
   */
  protected async executeInternal(): Promise<T> {
    throw new Error('Sync commands should implement executeSync() instead of executeInternal()');
  }
}