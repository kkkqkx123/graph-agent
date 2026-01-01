import { injectable } from 'inversify';
import { PromptContext } from '../../../domain/workflow/value-objects/context';
import {
  llmContextProcessor,
  toolContextProcessor,
  humanContextProcessor,
  systemContextProcessor,
  passThroughProcessor,
  isolateProcessor
} from '../functions/context-processors';

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
   * 注销上下文处理器
   * @param name 处理器名称
   */
  unregister(name: string): void;

  /**
   * 获取所有处理器名称
   * @returns 处理器名称列表
   */
  getProcessorNames(): string[];

  /**
   * 获取处理器元数据
   * @param name 处理器名称
   * @returns 处理器元数据或undefined
   */
  getMetadata(name: string): ContextProcessorMetadata | undefined;

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

/**
 * 上下文处理器服务实现
 *
 * 基础设施层实现，提供具体的上下文处理器管理功能：
 * 1. 处理器注册和注销
 * 2. 处理器执行
 * 3. 内置处理器管理
 * 4. 自定义处理器支持
 */
@injectable()
export class ContextProcessorServiceImpl implements ContextProcessorService {
  private processors: Map<string, ContextProcessorRegistration>;

  constructor() {
    this.processors = new Map();
    this.registerBuiltinProcessors();
  }

  /**
   * 注册上下文处理器
   * @param name 处理器名称
   * @param processor 处理器函数
   * @param metadata 处理器元数据
   */
  public register(
    name: string,
    processor: ContextProcessor,
    metadata?: Partial<ContextProcessorMetadata>
  ): void {
    if (this.processors.has(name)) {
      throw new Error(`上下文处理器 "${name}" 已存在`);
    }

    const registration: ContextProcessorRegistration = {
      processor,
      metadata: {
        name,
        description: metadata?.description,
        version: metadata?.version || '1.0.0',
        createdAt: metadata?.createdAt || new Date(),
        isBuiltin: metadata?.isBuiltin || false
      }
    };

    this.processors.set(name, registration);
  }

  /**
   * 获取上下文处理器
   * @param name 处理器名称
   * @returns 处理器函数或undefined
   */
  public get(name: string): ContextProcessor | undefined {
    const registration = this.processors.get(name);
    return registration?.processor;
  }

  /**
   * 检查处理器是否存在
   * @param name 处理器名称
   * @returns 是否存在
   */
  public has(name: string): boolean {
    return this.processors.has(name);
  }

  /**
   * 获取处理器元数据
   * @param name 处理器名称
   * @returns 处理器元数据或undefined
   */
  public getMetadata(name: string): ContextProcessorMetadata | undefined {
    const registration = this.processors.get(name);
    return registration?.metadata;
  }

  /**
   * 获取所有处理器名称
   * @returns 处理器名称数组
   */
  public getProcessorNames(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * 获取所有处理器元数据
   * @returns 处理器元数据映射
   */
  public getAllMetadata(): Map<string, ContextProcessorMetadata> {
    const metadata = new Map<string, ContextProcessorMetadata>();
    for (const [name, registration] of this.processors.entries()) {
      metadata.set(name, registration.metadata);
    }
    return metadata;
  }

  /**
   * 注销上下文处理器
   * @param name 处理器名称
   * @returns 是否成功注销
   */
  public unregister(name: string): boolean {
    const registration = this.processors.get(name);
    if (registration && registration.metadata.isBuiltin) {
      throw new Error(`无法注销内置处理器 "${name}"`);
    }
    return this.processors.delete(name);
  }

  /**
   * 清空所有非内置处理器
   */
  public clear(): void {
    for (const [name, registration] of this.processors.entries()) {
      if (!registration.metadata.isBuiltin) {
        this.processors.delete(name);
      }
    }
  }

  /**
   * 执行上下文处理器
   * @param name 处理器名称
   * @param context 提示词上下文
   * @param config 处理器配置
   * @returns 处理后的提示词上下文
   */
  public execute(
    name: string,
    context: any,
    config?: Record<string, unknown>
  ): any {
    const processor = this.get(name);
    if (!processor) {
      throw new Error(`上下文处理器 "${name}" 不存在`);
    }
    return processor(context, config);
  }

  /**
   * 注册内置处理器
   */
  private registerBuiltinProcessors(): void {
    // LLM上下文处理器
    this.register(
      'llm_context',
      llmContextProcessor,
      {
        name: 'llm_context',
        description: 'LLM专用上下文处理器，过滤工具调用历史',
        version: '1.0.0',
        createdAt: new Date(),
        isBuiltin: true
      }
    );

    // 工具上下文处理器
    this.register(
      'tool_context',
      toolContextProcessor,
      {
        name: 'tool_context',
        description: '工具调用上下文处理器，提取工具相关变量',
        version: '1.0.0',
        createdAt: new Date(),
        isBuiltin: true
      }
    );

    // 人工交互上下文处理器
    this.register(
      'human_context',
      humanContextProcessor,
      {
        name: 'human_context',
        description: '人工交互上下文处理器，保留用户交互相关数据',
        version: '1.0.0',
        createdAt: new Date(),
        isBuiltin: true
      }
    );

    // 系统上下文处理器
    this.register(
      'system_context',
      systemContextProcessor,
      {
        name: 'system_context',
        description: '系统上下文处理器，保留系统级变量和元数据',
        version: '1.0.0',
        createdAt: new Date(),
        isBuiltin: true
      }
    );

    // 直接传递处理器
    this.register(
      'pass_through',
      passThroughProcessor,
      {
        name: 'pass_through',
        description: '直接传递上下文，不做任何过滤',
        version: '1.0.0',
        createdAt: new Date(),
        isBuiltin: true
      }
    );

    // 隔离上下文处理器
    this.register(
      'isolate',
      isolateProcessor,
      {
        name: 'isolate',
        description: '隔离上下文，只保留模板',
        version: '1.0.0',
        createdAt: new Date(),
        isBuiltin: true
      }
    );
  }
}