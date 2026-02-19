/**
 * 核心类型定义
 */

import type { Script, ScriptType, ScriptExecutionOptions, ScriptExecutionResult } from '@modular-agent/types';

/**
 * 执行器类型
 */
export type ExecutorType =
  | 'SHELL'       /** Shell执行器 */
  | 'CMD'         /** CMD执行器 */
  | 'POWERSHELL'  /** PowerShell执行器 */
  | 'PYTHON'      /** Python执行器 */
  | 'JAVASCRIPT'; /** JavaScript执行器 */

/**
 * 执行器配置
 */
export interface ExecutorConfig {
  /** 执行器类型 */
  type: ExecutorType;
  /** 是否启用重试 */
  enableRetry?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  /** 线程ID（用于线程隔离） */
  threadId?: string;
  /** 工作目录 */
  workingDirectory?: string;
  /** 环境变量 */
  environment?: Record<string, string>;
  /** 中止信号 */
  signal?: AbortSignal;
}

/**
 * 执行输出
 */
export interface ExecutionOutput {
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
  /** 退出码 */
  exitCode: number;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息数组 */
  errors: string[];
}

/**
 * 执行器元数据
 */
export interface ExecutorMetadata {
  /** 执行器类型 */
  type: ExecutorType;
  /** 执行器名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 支持的脚本类型 */
  supportedScriptTypes: ScriptType[];
}