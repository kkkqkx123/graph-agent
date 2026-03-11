/**
 * 脚本模块类型定义
 * 定义脚本执行的基本信息和配置
 */

import type { ID, Metadata } from '../common.js';

/**
 * 脚本类型
 */
export type ScriptType =
  /** Shell脚本 */
  'SHELL' |
  /** CMD脚本 */
  'CMD' |
  /** PowerShell脚本 */
  'POWERSHELL' |
  /** Python脚本 */
  'PYTHON' |
  /** JavaScript脚本 */
  'JAVASCRIPT';

/**
 * 脚本执行选项
 */
export interface ScriptExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用指数退避 */
  exponentialBackoff?: boolean;
  /** 工作目录 */
  workingDirectory?: string;
  /** 环境变量 */
  environment?: Record<string, string>;
  /** 是否启用沙箱 */
  sandbox?: boolean;
  /** 沙箱配置 */
  sandboxConfig?: SandboxConfig;
  /** 中止信号（用于取消执行） */
  signal?: AbortSignal;
}

/**
 * 沙箱配置
 */
export interface SandboxConfig {
  /** 沙箱类型 */
  type: 'docker' | 'nodejs' | 'python' | 'custom';
  /** 沙箱镜像或环境 */
  image?: string;
  /** 资源限制 */
  resourceLimits?: {
    /** 内存限制（MB） */
    memory?: number;
    /** CPU限制（核心数） */
    cpu?: number;
    /** 磁盘限制（MB） */
    disk?: number;
  };
  /** 网络配置 */
  network?: {
    /** 是否启用网络 */
    enabled: boolean;
    /** 允许的域名列表 */
    allowedDomains?: string[];
  };
  /** 文件系统访问配置 */
  filesystem?: {
    /** 允许访问的路径列表 */
    allowedPaths?: string[];
    /** 是否只读 */
    readOnly?: boolean;
  };
}

/**
 * 脚本执行结果
 */
export interface ScriptExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 脚本名称 */
  scriptName: string;
  /** 脚本类型 */
  scriptType: ScriptType;
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
  /** 执行环境信息 */
  environment?: Record<string, any>;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 脚本定义
 */
export interface Script {
  /** 脚本唯一标识符 */
  id: ID;
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
  options: ScriptExecutionOptions;
  /** 脚本元数据 */
  metadata?: ScriptMetadata;
  /** 是否启用（默认为 true） */
  enabled?: boolean;
}

/**
 * 脚本元数据
 */
export interface ScriptMetadata {
  /** 脚本分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 作者 */
  author?: string;
  /** 版本 */
  version?: string;
  /** 文档URL */
  documentationUrl?: string;
  /** 自定义字段 */
  customFields?: Metadata;
}
