import { PromptContext } from '../value-objects/context/prompt-context';
import {
  ContextProcessor,
  ContextProcessorConfig,
  ContextProcessorMetadata,
  ContextProcessorRegistration
} from '../types/context-processor';

/**
 * 上下文处理器注册表
 * 
 * 用于管理和注册自定义上下文处理器
 */
export class ContextProcessorRegistry {
  private static instance: ContextProcessorRegistry;
  private processors: Map<string, ContextProcessorRegistration>;

  private constructor() {
    this.processors = new Map();
    this.registerBuiltinProcessors();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ContextProcessorRegistry {
    if (!ContextProcessorRegistry.instance) {
      ContextProcessorRegistry.instance = new ContextProcessorRegistry();
    }
    return ContextProcessorRegistry.instance;
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
    context: PromptContext,
    config?: ContextProcessorConfig
  ): PromptContext {
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
      this.llmContextProcessor,
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
      this.toolContextProcessor,
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
      this.humanContextProcessor,
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
      this.systemContextProcessor,
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
      this.passThroughProcessor,
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
      this.isolateProcessor,
      {
        name: 'isolate',
        description: '隔离上下文，只保留模板',
        version: '1.0.0',
        createdAt: new Date(),
        isBuiltin: true
      }
    );
  }

  /**
   * LLM上下文处理器
   * 过滤掉工具调用历史，只保留LLM相关变量
   */
  private llmContextProcessor: ContextProcessor = (
    context: PromptContext,
    config?: ContextProcessorConfig
  ): PromptContext => {
    // 过滤掉工具调用历史
    const filteredHistory = context.history.filter(entry =>
      !entry.metadata?.['toolCall']
    );

    // 只保留LLM相关变量
    const filteredVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('llm.') || key.startsWith('prompt.') || key.startsWith('model.')) {
        filteredVariables.set(key, value);
      }
    }

    return PromptContext.create(
      context.template,
      filteredVariables,
      filteredHistory,
      context.metadata
    );
  };

  /**
   * 工具上下文处理器
   * 提取工具相关变量
   */
  private toolContextProcessor: ContextProcessor = (
    context: PromptContext,
    config?: ContextProcessorConfig
  ): PromptContext => {
    // 提取工具相关变量
    const toolVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('tool.') || key.startsWith('function.')) {
        toolVariables.set(key, value);
      }
    }

    return PromptContext.create(
      context.template,
      toolVariables,
      context.history,
      context.metadata
    );
  };

  /**
   * 人工交互上下文处理器
   * 保留用户交互相关数据
   */
  private humanContextProcessor: ContextProcessor = (
    context: PromptContext,
    config?: ContextProcessorConfig
  ): PromptContext => {
    // 保留用户交互相关变量
    const humanVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('user.') || key.startsWith('human.') || key.startsWith('input.')) {
        humanVariables.set(key, value);
      }
    }

    // 保留人工交互相关历史
    const humanHistory = context.history.filter(entry =>
      entry.metadata?.['humanInteraction']
    );

    return PromptContext.create(
      context.template,
      humanVariables,
      humanHistory,
      context.metadata
    );
  };

  /**
   * 系统上下文处理器
   * 保留系统级变量和元数据
   */
  private systemContextProcessor: ContextProcessor = (
    context: PromptContext,
    config?: ContextProcessorConfig
  ): PromptContext => {
    // 保留系统级变量
    const systemVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('system.') || key.startsWith('config.') || key.startsWith('env.')) {
        systemVariables.set(key, value);
      }
    }

    // 保留系统元数据
    const systemMetadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context.metadata)) {
      if (key.startsWith('system.') || key.startsWith('config.')) {
        systemMetadata[key] = value;
      }
    }

    return PromptContext.create(
      context.template,
      systemVariables,
      [],
      systemMetadata
    );
  };

  /**
   * 直接传递处理器
   * 不做任何过滤，直接传递上下文
   */
  private passThroughProcessor: ContextProcessor = (
    context: PromptContext,
    config?: ContextProcessorConfig
  ): PromptContext => {
    return context.clone();
  };

  /**
   * 隔离上下文处理器
   * 只保留模板，清空其他所有内容
   */
  private isolateProcessor: ContextProcessor = (
    context: PromptContext,
    config?: ContextProcessorConfig
  ): PromptContext => {
    return PromptContext.create(
      context.template,
      new Map(),
      [],
      {}
    );
  };
}