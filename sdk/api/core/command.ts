/**
 * Command模式核心接口
 * 定义统一的命令执行接口
 */

import type { ExecutionResult } from '../types/execution-result';

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
   * 执行命令
   */
  abstract execute(): Promise<ExecutionResult<T>>;
  
  /**
   * 撤销命令（默认不支持）
   */
  async undo(): Promise<ExecutionResult<void>> {
    throw new Error(`Command ${this.getMetadata().name} does not support undo`);
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
  async execute(): Promise<ExecutionResult<T>> {
    return this.executeSync();
  }
  
  abstract executeSync(): ExecutionResult<T>;
}