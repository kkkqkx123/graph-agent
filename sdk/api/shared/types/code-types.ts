/**
 * 脚本模块类型定义
 * 定义脚本API相关的类型和接口
 */

import type { ScriptType } from '@modular-agent/types';
import type { Timestamp } from '@modular-agent/types';

/**
 * 脚本过滤器
 */
export interface ScriptFilter {
  /** 脚本ID列表 */
  ids?: string[];
  /** 脚本名称（支持模糊匹配） */
  name?: string;
  /** 脚本类型 */
  type?: ScriptType;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 脚本选项
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
}

/**
 * 脚本测试结果
 */
export interface ScriptTestResult {
  /** 脚本ID */
  scriptId: string;
  /** 脚本名称 */
  scriptName: string;
  /** 测试是否成功 */
  success: boolean;
  /** 标准输出 */
  stdout?: string;
  /** 标准错误 */
  stderr?: string;
  /** 退出码 */
  exitCode?: number;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 测试时间戳 */
  timestamp: Timestamp;
}

/**
 * 脚本执行日志
 */
export interface ScriptExecutionLog {
  /** 日志ID */
  id: string;
  /** 脚本ID */
  scriptId: string;
  /** 脚本名称 */
  scriptName: string;
  /** 执行是否成功 */
  success: boolean;
  /** 标准输出 */
  stdout?: string;
  /** 标准错误 */
  stderr?: string;
  /** 退出码 */
  exitCode?: number;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息 */
  error?: string;
  /** 执行时间戳 */
  timestamp: Timestamp;
}

/**
 * 脚本统计信息
 */
export interface ScriptStatistics {
  /** 脚本ID */
  scriptId: string;
  /** 脚本名称 */
  scriptName: string;
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime?: Timestamp;
  /** 成功率 */
  successRate: number;
}

/**
 * 脚本注册配置
 */
export interface ScriptRegistrationConfig {
  /** 脚本ID */
  id?: string;
  /** 脚本名称 */
  name: string;
  /** 脚本类型 */
  type: ScriptType;
  /** 脚本描述 */
  description: string;
  /** 脚本内容（内联代码） */
  content?: string;
  /** 脚本文件路径（外部文件） */
  filePath?: string;
  /** 脚本执行选项 */
  options?: any;
  /** 脚本元数据 */
  metadata?: any;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 脚本批量执行配置
 */
export interface ScriptBatchExecutionConfig {
  /** 脚本ID列表 */
  scriptIds: string[];
  /** 执行选项（覆盖脚本默认选项） */
  options?: any;
  /** 是否并行执行 */
  parallel?: boolean;
  /** 并行执行时的最大并发数 */
  maxConcurrency?: number;
}
