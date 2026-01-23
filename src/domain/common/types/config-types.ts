/**
 * 配置系统类型定义
 * 从shared/types/config.ts迁移而来
 */

/**
 * 配置源类型
 */
export enum ConfigSourceType {
  FILE = 'file',
  ENVIRONMENT = 'environment',
  REMOTE = 'remote',
  MEMORY = 'memory',
}

/**
 * 配置格式类型
 */
export enum ConfigFormat {
  TOML = 'toml',
}

/**
 * 配置源接口
 */
export interface IConfigSource {
  readonly type: ConfigSourceType;
  readonly priority: number;
  load(): Promise<Record<string, any>>;
  watch?(callback: (config: Record<string, any>) => void): void;
  unwatch?(): void;
}

/**
 * 配置处理器接口
 */
export interface IConfigProcessor {
  process(config: Record<string, any>): Record<string, any>;
}

/**
 * 配置验证器接口
 */
export interface IConfigValidator {
  validate(config: Record<string, any>): ConfigValidationResult;
}

/**
 * 配置缓存接口
 */
export interface IConfigCache {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

/**
 * 配置管理器接口
 */
export interface IConfigManager {
  get<T = any>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): void;
  getAll(): Record<string, any>;
  reload(): Promise<void>;
  watch(key: string, callback: (value: any) => void): () => void;
  unwatch(key: string): void;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
}

/**
 * 配置验证错误
 */
export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * 配置源配置
 */
export interface ConfigSourceConfig {
  type: ConfigSourceType;
  priority: number;
  options: Record<string, any>;
}

/**
 * 文件配置源选项
 */
export interface FileConfigSourceOptions {
  path: string;
  format?: ConfigFormat;
  encoding?: string;
  watch?: boolean;
}

/**
 * 环境变量配置源选项
 */
export interface EnvironmentConfigSourceOptions {
  prefix?: string;
  separator?: string;
  transform?: 'lowercase' | 'uppercase' | 'none';
}

/**
 * 远程配置源选项
 */
export interface RemoteConfigSourceOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  interval?: number;
  timeout?: number;
  retries?: number;
}

/**
 * 配置管理器配置
 */
export interface ConfigManagerConfig {
  sources: ConfigSourceConfig[];
  processors?: ConfigProcessorConfig[];
  validators?: ConfigValidatorConfig[];
  cache?: ConfigCacheConfig;
  watch?: boolean;
}

/**
 * 配置处理器配置
 */
export interface ConfigProcessorConfig {
  type: 'environment' | 'inheritance' | 'transformation' | 'custom';
  options: Record<string, any>;
}

/**
 * 配置验证器配置
 */
export interface ConfigValidatorConfig {
  type: 'schema' | 'business' | 'custom';
  options: Record<string, any>;
}

/**
 * 配置缓存配置
 */
export interface ConfigCacheConfig {
  type: 'memory' | 'redis' | 'custom';
  options: Record<string, any>;
}

/**
 * 环境变量处理器选项
 */
export interface EnvironmentProcessorOptions {
  pattern?: RegExp;
}

/**
 * 继承处理器选项
 */
export interface InheritanceProcessorOptions {
  separator?: string;
  maxDepth?: number;
}

/**
 * 转换处理器选项
 */
export interface TransformationProcessorOptions {
  transformations: TransformationRule[];
}

/**
 * 转换规则
 */
export interface TransformationRule {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean;
  default?: any;
  transform?: (value: any) => any;
}

/**
 * Schema验证器选项
 */
export interface SchemaValidatorOptions {
  schema: Record<string, any>;
  strict?: boolean;
}

/**
 * 业务验证器选项
 */
export interface BusinessValidatorOptions {
  rules: BusinessValidationRule[];
}

/**
 * 业务验证规则
 */
export interface BusinessValidationRule {
  path: string;
  validator: (value: any) => boolean;
  message: string;
}

/**
 * 内存缓存选项
 */
export interface MemoryCacheOptions {
  maxSize?: number;
  ttl?: number;
}

/**
 * Redis缓存选项
 */
export interface RedisCacheOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number;
}
