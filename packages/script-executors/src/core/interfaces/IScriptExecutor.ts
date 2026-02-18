/**
 * 脚本执行器接口
 * 定义所有执行器必须实现的核心契约
 */

import type { Script, ScriptType, ScriptExecutionOptions, ScriptExecutionResult } from '@modular-agent/types';
import type { ExecutionContext, ValidationResult } from '../types.js';

/**
 * 脚本执行器接口
 */
export interface IScriptExecutor {
  /**
   * 执行脚本
   * @param script 脚本定义
   * @param options 执行选项
   * @param context 执行上下文（线程隔离等）
   * @returns 执行结果
   */
  execute(
    script: Script,
    options?: ScriptExecutionOptions,
    context?: ExecutionContext
  ): Promise<ScriptExecutionResult>;

  /**
   * 验证脚本配置
   * @param script 脚本定义
   * @returns 验证结果
   */
  validate(script: Script): ValidationResult;

  /**
   * 获取支持的脚本类型
   * @returns 支持的脚本类型数组
   */
  getSupportedTypes(): ScriptType[];

  /**
   * 清理资源（可选）
   * @returns Promise
   */
  cleanup?(): Promise<void>;

  /**
   * 获取执行器类型
   * @returns 执行器类型字符串
   */
  getExecutorType(): string;
}