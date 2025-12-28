import { PromptContext } from '../value-objects/context/prompt-context';

/**
 * 上下文处理器配置
 */
export interface ContextProcessorConfig {
  /** 处理器名称 */
  readonly name: string;
  /** 处理器描述 */
  readonly description?: string;
  /** 处理器版本 */
  readonly version?: string;
  /** 自定义配置 */
  readonly config?: Record<string, unknown>;
}

/**
 * 上下文处理器函数类型
 * 
 * @param context 提示词上下文
 * @param config 处理器配置
 * @returns 处理后的提示词上下文
 */
export type ContextProcessor = (
  context: PromptContext,
  config?: ContextProcessorConfig
) => PromptContext;

/**
 * 上下文处理器元数据
 */
export interface ContextProcessorMetadata {
  /** 处理器名称 */
  readonly name: string;
  /** 处理器描述 */
  readonly description?: string;
  /** 处理器版本 */
  readonly version?: string;
  /** 创建时间 */
  readonly createdAt: Date;
  /** 是否为内置处理器 */
  readonly isBuiltin: boolean;
}

/**
 * 上下文处理器注册项
 */
export interface ContextProcessorRegistration {
  /** 处理器函数 */
  readonly processor: ContextProcessor;
  /** 处理器元数据 */
  readonly metadata: ContextProcessorMetadata;
}