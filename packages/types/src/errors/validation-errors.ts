/**
 * 验证相关错误类型定义
 * 定义配置验证、运行时验证和Schema验证相关的错误类型
 */

import { ValidationError, ErrorSeverity } from './base';

/**
 * 配置验证错误选项
 */
export interface ConfigurationValidationErrorOptions {
  /** 配置路径 */
  configPath?: string;
  /** 配置类型 */
  configType?: 'workflow' | 'node' | 'trigger' | 'edge' | 'variable' | 'tool' | 'script' | 'schema' | 'llm';
  /** 字段名称 */
  field?: string;
  /** 字段值 */
  value?: any;
  /** 额外上下文 */
  context?: Record<string, any>;
  /** 错误严重程度 */
  severity?: ErrorSeverity;
}

/**
 * 配置验证错误类型
 *
 * 专门用于工作流、节点、触发器等静态配置的验证错误
 * 继承自 ValidationError
 */
export class ConfigurationValidationError extends ValidationError {
  constructor(
    message: string,
    options?: ConfigurationValidationErrorOptions
  ) {
    const { configPath, configType, field, value, context, severity } = options || {};
    super(message, field, value, { ...context, configPath, configType }, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 运行时验证错误选项
 */
export interface RuntimeValidationErrorOptions {
  /** 操作名称 */
  operation?: string;
  /** 字段名称 */
  field?: string;
  /** 字段值 */
  value?: any;
  /** 额外上下文 */
  context?: Record<string, any>;
  /** 错误严重程度 */
  severity?: ErrorSeverity;
}

/**
 * 运行时验证错误类型
 *
 * 专门用于运行时参数和状态的验证错误
 * 继承自 ValidationError
 */
export class RuntimeValidationError extends ValidationError {
  constructor(
    message: string,
    options?: RuntimeValidationErrorOptions
  ) {
    const { operation, field, value, context, severity } = options || {};
    super(message, field, value, { ...context, operation }, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * Schema验证错误选项
 */
export interface SchemaValidationErrorOptions {
  /** Schema路径 */
  schemaPath?: string;
  /** 验证错误列表 */
  validationErrors?: Array<{ path: string; message: string }>;
  /** 字段名称 */
  field?: string;
  /** 字段值 */
  value?: any;
  /** 额外上下文 */
  context?: Record<string, any>;
  /** 错误严重程度 */
  severity?: ErrorSeverity;
}

/**
 * Schema验证错误类型
 *
 * 专门用于JSON Schema验证失败
 * 继承自 ValidationError
 */
export class SchemaValidationError extends ValidationError {
  constructor(
    message: string,
    options?: SchemaValidationErrorOptions
  ) {
    const { schemaPath, validationErrors, field, value, context, severity } = options || {};
    super(message, field, value, { ...context, schemaPath, validationErrors }, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}