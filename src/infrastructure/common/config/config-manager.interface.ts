/**
 * 配置管理器接口
 *
 * 提供统一的配置管理功能，支持类型安全的配置访问
 */

// 基础配置类型定义
export interface BaseConfig {
  [key: string]: any;
}

// 模型配置接口
export interface ModelConfig {
  maxTokens: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  promptTokenPrice: number;
  completionTokenPrice: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  metadata?: Record<string, any>;
}

// 提供商配置接口
export interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  models: Record<string, ModelConfig>;
  timeout: number;
  retryCount: number;
}

// LLM配置接口
export interface LLMConfig {
  openai: ProviderConfig;
  anthropic: ProviderConfig;
  gemini: ProviderConfig;
  mock: {
    models: Record<string, ModelConfig>;
    timeout: number;
  };
  rateLimit: {
    maxRequests: number;
    windowSizeMs: number;
  };
}

// 验证规则接口
export interface ValidationRule<T> {
  validate: (value: T) => ValidationResult;
  message?: string;
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 配置模式接口
export interface ConfigSchema {
  [key: string]: {
    required: boolean;
    type: string;
    min?: number;
    max?: number;
    rules?: ValidationRule<any>[];
    children?: Record<string, ConfigSchema>;
  };
}

export interface ConfigManager {
  /**
   * 获取配置值 - 类型安全版本
   * @param key 配置键
   * @param defaultValue 默认值（可选）
   * @returns 配置值
   */
  get<T>(key: string, defaultValue?: T): T;

  /**
   * 获取嵌套配置值 - 类型安全版本
   * @param key 配置键
   * @returns 配置值
   */
  getNested<K extends keyof LLMConfig>(key: K): LLMConfig[K];

  /**
   * 获取模型配置
   * @param provider 提供商
   * @param model 模型名称
   * @returns 模型配置
   */
  getModelConfig(provider: keyof Pick<LLMConfig, 'openai' | 'anthropic' | 'gemini' | 'mock'>, model: string): ModelConfig;

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<T>(key: string, value: T): void;

  /**
   * 设置嵌套配置值
   * @param key 配置键
   * @param value 配置值
   */
  setNested<K extends keyof LLMConfig>(key: K, value: LLMConfig[K]): void;

  /**
   * 检查配置键是否存在
   * @param key 配置键
   * @returns 是否存在
   */
  has(key: string): boolean;

  /**
   * 删除配置
   * @param key 配置键
   * @returns 是否删除成功
   */
  delete(key: string): boolean;

  /**
   * 重新加载配置
   */
  reload(): Promise<void>;

  /**
   * 获取所有配置键
   * @returns 配置键列表
   */
  keys(): string[];

  /**
   * 获取配置快照
   * @returns 配置对象
   */
  snapshot(): LLMConfig;

  /**
   * 监听配置变化
   * @param key 配置键
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  watch<T>(key: string, callback: (newValue: T, oldValue: T) => void): () => void;

  /**
   * 验证配置
   * @param schema 配置模式
   * @returns 验证结果
   */
  validate(schema?: ConfigSchema): ValidationResult;

  /**
   * 获取配置结构
   * @returns 配置结构
   */
  getConfigStructure(): LLMConfig;
}