/**
 * CLI 应用专用类型定义
 */

/**
 * 命令选项接口
 */
export interface CommandOptions {
  verbose?: boolean;
  debug?: boolean;
  output?: 'json' | 'table' | 'plain';
  table?: boolean;
  params?: string;
}

/**
 * 工作流命令选项
 */
export interface WorkflowCommandOptions extends CommandOptions {
  name?: string;
  tags?: string[];
  version?: string;
}

/**
 * 线程命令选项
 */
export interface ThreadCommandOptions extends CommandOptions {
  input?: string;
  detached?: boolean;
  timeout?: number;
}

/**
 * 检查点命令选项
 */
export interface CheckpointCommandOptions extends CommandOptions {
  name?: string;
  description?: string;
}

/**
 * 模板命令选项
 */
export interface TemplateCommandOptions extends CommandOptions {
  type?: 'node' | 'workflow' | 'trigger';
  category?: string;
}

/**
 * 文件解析结果
 */
export interface FileParseResult<T = unknown> {
  content: T;
  format: 'json' | 'yaml' | 'toml';
  path: string;
}

/**
 * CLI 错误类型
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * 验证错误类型
 */
export class ValidationError extends CLIError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 2);
    this.name = 'ValidationError';
  }
}

/**
 * 文件操作错误类型
 */
export class FileOperationError extends CLIError {
  constructor(message: string, public filePath?: string) {
    super(message, 'FILE_ERROR', 3);
    this.name = 'FileOperationError';
  }
}

/**
 * API 错误类型
 */
export class APIError extends CLIError {
  constructor(
    message: string,
    public statusCode?: number,
    public apiEndpoint?: string
  ) {
    super(message, 'API_ERROR', 4);
    this.name = 'APIError';
  }
}