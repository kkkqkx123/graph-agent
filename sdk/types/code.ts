/**
 * 脚本模块类型定义
 * 定义脚本执行的基本信息和配置
 */

import type { ID, Timestamp, Metadata } from './common';

/**
 * 脚本类型枚举
 */
export enum ScriptType {
  /** Shell脚本 */
  SHELL = 'SHELL',
  /** CMD脚本 */
  CMD = 'CMD',
  /** PowerShell脚本 */
  POWERSHELL = 'POWERSHELL',
  /** Python脚本 */
  PYTHON = 'PYTHON',
  /** JavaScript脚本 */
  JAVASCRIPT = 'JAVASCRIPT'
}

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
  /** 工作目录 */
  workingDirectory?: string;
  /** 环境变量 */
  environment?: Record<string, string>;
  /** 是否启用沙箱 */
  sandbox?: boolean;
  /** 沙箱配置 */
  sandboxConfig?: SandboxConfig;
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

/**
 * 脚本执行器接口
 */
export interface ScriptExecutor {
  /**
   * 执行脚本
   * @param script 脚本定义
   * @param options 执行选项（覆盖脚本默认选项）
   * @returns 执行结果
   */
  execute(script: Script, options?: Partial<ScriptExecutionOptions>): Promise<ScriptExecutionResult>;

  /**
   * 验证脚本
   * @param script 脚本定义
   * @returns 验证结果
   */
  validate(script: Script): { valid: boolean; errors: string[] };

  /**
   * 获取支持的脚本类型
   * @returns 支持的脚本类型数组
   */
  getSupportedTypes(): ScriptType[];
}

/**
 * 脚本执行器工厂接口
 */
export interface ScriptExecutorFactory {
  /**
   * 创建脚本执行器
   * @param scriptType 脚本类型
   * @returns 脚本执行器
   */
  create(scriptType: ScriptType): ScriptExecutor;
}

/**
 * 脚本执行器配置
 */
export interface ScriptExecutorConfig {
  /** 执行器类型 */
  type: ScriptType;
  /** 执行器工厂 */
  factory: ScriptExecutorFactory;
  /** 默认执行选项 */
  defaultOptions?: ScriptExecutionOptions;
}