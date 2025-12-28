import { PromptContext } from '../value-objects/context';

/**
 * 上下文处理器函数类型
 *
 * @param context 提示词上下文
 * @param config 处理器配置（可选）
 * @returns 处理后的提示词上下文
 */
export type ContextProcessor = (
  context: PromptContext,
  config?: Record<string, unknown>
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

/**
 * 上下文处理器服务接口
 *
 * 定义上下文处理器管理的业务契约
 * 具体实现在基础设施层提供
 */
export interface ContextProcessorService {
  /**
   * 注册上下文处理器
   * @param name 处理器名称
   * @param processor 处理器函数
   * @param metadata 处理器元数据
   */
  register(
    name: string,
    processor: ContextProcessor,
    metadata?: Partial<ContextProcessorMetadata>
  ): void;

  /**
   * 获取上下文处理器
   * @param name 处理器名称
   * @returns 处理器函数或undefined
   */
  get(name: string): ContextProcessor | undefined;

  /**
   * 检查处理器是否存在
   * @param name 处理器名称
   * @returns 是否存在
   */
  has(name: string): boolean;

  /**
   * 获取处理器元数据
   * @param name 处理器名称
   * @returns 处理器元数据或undefined
   */
  getMetadata(name: string): ContextProcessorMetadata | undefined;

  /**
   * 获取所有处理器名称
   * @returns 处理器名称数组
   */
  getProcessorNames(): string[];

  /**
   * 获取所有处理器元数据
   * @returns 处理器元数据映射
   */
  getAllMetadata(): Map<string, ContextProcessorMetadata>;

  /**
   * 注销上下文处理器
   * @param name 处理器名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean;

  /**
   * 清空所有非内置处理器
   */
  clear(): void;

  /**
   * 执行上下文处理器
   * @param name 处理器名称
   * @param context 提示词上下文
   * @param config 处理器配置
   * @returns 处理后的提示词上下文
   */
  execute(
    name: string,
    context: PromptContext,
    config?: Record<string, unknown>
  ): PromptContext;
}