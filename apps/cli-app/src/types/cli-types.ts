/**
 * CLI 应用专用类型定义
 */

/**
 * 错误码常量
 */
export const ErrorCode = {
  UNKNOWN: 'UNKNOWN_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  FILE_OPERATION: 'FILE_ERROR',
  API: 'API_ERROR',
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  ADAPTER: 'ADAPTER_ERROR',
  CONFIGURATION: 'CONFIGURATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
} as const;

/**
 * 错误码类型
 */
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

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
 * CLI 基础错误类
 * 所有 CLI 错误的基类，提供统一的错误处理接口
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public code: ErrorCodeType = ErrorCode.UNKNOWN,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
    Object.setPrototypeOf(this, CLIError.prototype);
  }
}

/**
 * 验证错误类
 * 用于输入验证失败的场景
 */
export class CLIValidationError extends CLIError {
  constructor(message: string, public field?: string) {
    super(message, ErrorCode.VALIDATION, 2);
    this.name = 'CLIValidationError';
    Object.setPrototypeOf(this, CLIValidationError.prototype);
  }
}

/**
 * 文件操作错误类
 * 用于文件读写、解析等操作失败的场景
 */
export class CLIFileOperationError extends CLIError {
  constructor(message: string, public filePath?: string) {
    super(message, ErrorCode.FILE_OPERATION, 3);
    this.name = 'CLIFileOperationError';
    Object.setPrototypeOf(this, CLIFileOperationError.prototype);
  }
}

/**
 * API 错误类
 * 用于 API 调用失败的场景
 */
export class CLIAPIError extends CLIError {
  constructor(
    message: string,
    public statusCode?: number,
    public apiEndpoint?: string
  ) {
    super(message, ErrorCode.API, 4);
    this.name = 'CLIAPIError';
    Object.setPrototypeOf(this, CLIAPIError.prototype);
  }
}

/**
 * 网络错误类
 * 用于网络连接失败、DNS 解析失败等场景
 */
export class CLINetworkError extends CLIError {
  constructor(message: string, public url?: string) {
    super(message, ErrorCode.NETWORK, 5);
    this.name = 'CLINetworkError';
    Object.setPrototypeOf(this, CLINetworkError.prototype);
  }
}

/**
 * 超时错误类
 * 用于操作超时的场景
 */
export class CLITimeoutError extends CLIError {
  constructor(message: string, public timeout?: number) {
    super(message, ErrorCode.TIMEOUT, 6);
    this.name = 'CLITimeoutError';
    Object.setPrototypeOf(this, CLITimeoutError.prototype);
  }
}

/**
 * 未找到错误类
 * 用于资源未找到的场景
 */
export class CLINotFoundError extends CLIError {
  constructor(message: string, public resourceType?: string, public resourceId?: string) {
    super(message, ErrorCode.NOT_FOUND, 7);
    this.name = 'CLINotFoundError';
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

/**
 * 权限错误类
 * 用于权限不足的场景
 */
export class CLIPermissionError extends CLIError {
  constructor(message: string, public requiredPermission?: string) {
    super(message, ErrorCode.PERMISSION, 8);
    this.name = 'CLIPermissionError';
    Object.setPrototypeOf(this, CLIPermissionError.prototype);
  }
}

/**
 * 配置错误类
 * 用于配置加载、解析失败的场景
 */
export class CLIConfigurationError extends CLIError {
  constructor(message: string, public configPath?: string) {
    super(message, ErrorCode.CONFIGURATION, 9);
    this.name = 'CLIConfigurationError';
    Object.setPrototypeOf(this, CLIConfigurationError.prototype);
  }
}