/**
 * 脚本模块类型定义
 * 定义脚本API相关的类型和接口
 */

import type { Script, ScriptType, ScriptExecutionOptions, ScriptExecutionResult } from '@modular-agent/types';

/**
 * 脚本过滤条件
 */
export interface ScriptFilter {
  /** 脚本名称（模糊匹配） */
  name?: string;
  /** 脚本类型 */
  type?: ScriptType;
  /** 脚本分类 */
  category?: string;
  /** 标签数组（必须包含所有标签） */
  tags?: string[];
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 脚本执行选项（API层）
 */
export interface ScriptOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 工作目录 */
  workingDirectory?: string;
  /** 环境变量 */
  environment?: Record<string, string>;
  /** 是否启用沙箱 */
  sandbox?: boolean;
  /** 是否启用执行日志 */
  enableLogging?: boolean;
}

/**
 * 脚本测试结果
 */
export interface ScriptTestResult {
  /** 测试是否通过 */
  passed: boolean;
  /** 测试结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 测试时间（毫秒） */
  testTime: number;
  /** 脚本名称 */
  scriptName: string;
}

/**
 * 脚本执行日志条目
 */
export interface ScriptExecutionLog {
  /** 脚本名称 */
  scriptName: string;
  /** 执行选项 */
  options: ScriptExecutionOptions;
  /** 执行结果 */
  result: ScriptExecutionResult;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 脚本统计信息
 */
export interface ScriptStatistics {
  /** 脚本总数 */
  totalScripts: number;
  /** 按类型统计 */
  byType: Record<ScriptType, number>;
  /** 按分类统计 */
  byCategory: Record<string, number>;
  /** 执行次数统计 */
  executionCount: number;
  /** 成功执行次数 */
  successCount: number;
  /** 失败执行次数 */
  failureCount: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
}

/**
 * 脚本注册配置
 */
export interface ScriptRegistrationConfig {
  /** 是否覆盖已存在的脚本 */
  overwrite?: boolean;
  /** 是否验证脚本 */
  validate?: boolean;
  /** 是否启用脚本 */
  enable?: boolean;
}

/**
 * 脚本批量执行配置
 */
export interface ScriptBatchExecutionConfig {
  /** 是否并行执行 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 是否继续执行失败的任务 */
  continueOnFailure?: boolean;
  /** 是否启用执行日志 */
  enableLogging?: boolean;
}