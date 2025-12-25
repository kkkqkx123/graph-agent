/**
 * 配置加载模块类型定义
 */

import { JSONSchemaType } from 'ajv';

// 使用 JSONSchemaType 作为 JSONSchema 的别名
type JSONSchema = JSONSchemaType<any>;

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
 * 模块元数据
 */
export interface ModuleMetadata {
  name: string;
  version: string;
  description: string;
  registry?: string;
}

/**
 * 模块配置
 */
export interface ModuleConfig {
  type: string;
  configs: Record<string, any>;
  metadata: ModuleMetadata;
  dependencies: string[];
}

/**
 * 加载顺序
 */
export interface LoadingOrder {
  orderedModules: string[];
  parallelGroups: string[][];
}

/**
 * 依赖错误
 */
export interface DependencyError {
  module: string;
  dependency: string;
  message: string;
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
 * 模块规则接口
 */
export interface IModuleRule {
  moduleType: string;
  patterns: string[];
  priority: number;
  loader: IModuleLoader;
  schema: JSONSchema;
  dependencies?: string[];
  mergeStrategy: MergeStrategy;
}

/**
 * 配置发现器接口
 */
export interface IConfigDiscovery {
  discoverConfigs(basePath: string): Promise<ConfigFile[]>;
  discoverModuleConfigs(modulePath: string, moduleType: string): Promise<ConfigFile[]>;
}

/**
 * 模块加载器接口
 */
export interface IModuleLoader {
  readonly moduleType: string;
  loadModule(configFiles: ConfigFile[]): Promise<ModuleConfig>;
  supports(moduleType: string): boolean;
}

/**
 * 依赖解析器接口
 */
export interface IDependencyResolver {
  resolveDependencies(modules: Map<string, ModuleConfig>): Promise<LoadingOrder>;
  checkCircularDependency(modules: Map<string, ModuleConfig>): DependencyError[];
}

/**
 * Schema注册表接口
 */
export interface ISchemaRegistry {
  registerSchema(moduleType: string, schema: JSONSchema, version?: string, description?: string): void;
  getSchema(moduleType: string): JSONSchema | undefined;
  validateConfig(moduleType: string, config: any): ValidationResult;
  preValidate(config: any, moduleType: string): PreValidationResult;
  validateSchemaCompatibility(newSchema: JSONSchema, oldSchema: JSONSchema): boolean;
  getSchemaHistory(moduleType: string): SchemaVersion[];
  hasModuleType(moduleType: string): boolean;
  getRegisteredTypes(): string[];
}

/**
 * 类型注册表接口（兼容性保持）
 */
export interface ITypeRegistry extends ISchemaRegistry {
  registerModuleType(moduleType: string, schema: JSONSchema): void;
}

/**
 * Schema版本信息
 */
export interface SchemaVersion {
  version: string;
  schema: JSONSchema;
  description: string;
  createdAt: Date;
  compatibleWith?: string[];
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
 * 预验证结果接口
 */
export interface PreValidationResult {
  isValid: boolean;
  errors: string[];
  severity: ValidationSeverity;
}

/**
 * 加载缓存接口
 */
export interface ILoadingCache {
  get(key: string): any;
  set(key: string, value: any): void;
  has(key: string): boolean;
  clear(): void;
  store(configs: Record<string, any>): Promise<void>;
  getAllConfigs(): Record<string, any> | undefined;
  getModuleConfig(moduleType: string): any;
  setModuleConfig(moduleType: string, config: any): void;
  getStats(): { size: number; keys: string[]; memoryUsage: number };
  cleanup(): number;
}

/**
 * 合并策略接口
 */
export interface IMergeStrategy {
  merge(target: any, source: any): any;
}
