/**
 * 配置加载模块类型定义
 * 简化后的核心类型定义
 */

/**
 * 配置文件信息
 */
export interface ConfigFile {
  path: string;
  type: string;
  moduleType: string;
  priority: number;
  metadata: Record<string, any>;
}

/**
 * 配置发现器接口
 */
export interface IConfigDiscovery {
  discoverConfigs(basePath: string): Promise<ConfigFile[]>;
  discoverModuleConfigs(modulePath: string, moduleType: string): Promise<ConfigFile[]>;
}

/**
 * 合并策略枚举
 */
export enum MergeStrategy {
  OVERRIDE = 'override',
  MERGE_DEEP = 'merge_deep',
  MERGE_SHALLOW = 'merge_shallow',
  ARRAY_APPEND = 'array_append'
}

/**
 * 验证严重性枚举
 */
export type ValidationSeverity = 'error' | 'warning' | 'info' | 'success';

/**
 * 验证错误接口
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: ValidationSeverity;
  suggestions?: string[];
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  severity: ValidationSeverity;
}

/**
 * 合并策略接口
 */
export interface IMergeStrategy {
  merge(target: any, source: any): any;
}
