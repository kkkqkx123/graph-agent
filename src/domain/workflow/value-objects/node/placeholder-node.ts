import { NodeId } from './node-id';

/**
 * 占位符节点类型
 * 
 * 占位符节点是特殊的节点，它们不执行实际的业务逻辑，
 * 只是存储配置信息，由 Thread 服务根据配置执行相应的操作。
 */
export enum PlaceholderNodeType {
  /** LLM交互节点 */
  LLM = 'llm',
  /** 工具调用节点 */
  TOOL = 'tool',
  /** 上下文处理器节点 */
  CONTEXT_PROCESSOR = 'context_processor',
}

/**
 * LLM节点配置接口
 */
export interface LLMNodeConfig {
  /** LLM提供商 */
  provider: string;
  /** 模型名称 */
  model: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大token数 */
  maxTokens?: number;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 用户提示词 */
  userPrompt?: string;
  /** 是否流式输出 */
  stream?: boolean;
  /** 工具模式 */
  toolMode?: 'none' | 'auto' | 'required';
  /** 可用工具列表 */
  availableTools?: string[];
  /** 最大迭代次数（用于工具调用循环） */
  maxIterations?: number;
}

/**
 * 工具节点配置接口
 */
export interface ToolNodeConfig {
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  parameters?: Record<string, any>;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 上下文处理器配置接口
 */
export interface ContextProcessorConfig {
  /** 处理器名称 */
  processorName: string;
  /** 处理器配置 */
  processorConfig?: Record<string, any>;
}

/**
 * 占位符节点值对象
 * 
 * 占位符节点是工作流中的特殊节点，用于存储配置信息而不执行业务逻辑。
 * 占位符节点只负责：
 * 1. 存储节点配置信息
 * 2. 提供类型安全的配置访问
 * 3. 标记节点类型
 * 
 * 占位符节点与普通节点的区别：
 * - 占位符节点是值对象，不可变，没有身份标识
 * - 占位符节点不执行业务逻辑，只存储配置
 * - 占位符节点的执行由 Thread 服务处理
 * 
 * 使用场景：
 * - LLMNode: 存储LLM交互配置，由 Thread 调用 InteractionEngine 执行
 * - ToolNode: 存储工具调用配置，由 Thread 调用 ToolExecutor 执行
 * - ContextProcessorNode: 存储上下文处理配置，由 Thread 调用 ContextManager 执行
 */
export class PlaceholderNode {
  private readonly _id: NodeId;
  private readonly _type: PlaceholderNodeType;
  private readonly _name: string;
  private readonly _description: string;
  private readonly _config: Record<string, any>;

  private constructor(
    id: NodeId,
    type: PlaceholderNodeType,
    name: string,
    description: string,
    config: Record<string, any>
  ) {
    this._id = id;
    this._type = type;
    this._name = name;
    this._description = description;
    this._config = { ...config };
  }

  /**
   * 获取节点ID
   */
  get id(): NodeId {
    return this._id;
  }

  /**
   * 获取占位符节点类型
   */
  get type(): PlaceholderNodeType {
    return this._type;
  }

  /**
   * 获取节点名称
   */
  get name(): string {
    return this._name;
  }

  /**
   * 获取节点描述
   */
  get description(): string {
    return this._description;
  }

  /**
   * 获取配置
   */
  get config(): Record<string, any> {
    return { ...this._config };
  }

  /**
   * 判断是否为LLM节点
   */
  isLLM(): boolean {
    return this._type === PlaceholderNodeType.LLM;
  }

  /**
   * 判断是否为工具节点
   */
  isTool(): boolean {
    return this._type === PlaceholderNodeType.TOOL;
  }

  /**
   * 判断是否为上下文处理器节点
   */
  isContextProcessor(): boolean {
    return this._type === PlaceholderNodeType.CONTEXT_PROCESSOR;
  }

  /**
   * 获取LLM节点配置（仅LLM节点）
   */
  getLLMConfig(): LLMNodeConfig {
    if (!this.isLLM()) {
      throw new Error('只有LLM节点才能获取LLM配置');
    }
    return {
      provider: this._config['provider'],
      model: this._config['model'],
      temperature: this._config['temperature'],
      maxTokens: this._config['maxTokens'],
      systemPrompt: this._config['systemPrompt'],
      userPrompt: this._config['userPrompt'],
      stream: this._config['stream'],
      toolMode: this._config['toolMode'],
      availableTools: this._config['availableTools'],
      maxIterations: this._config['maxIterations'],
    };
  }

  /**
   * 获取工具节点配置（仅工具节点）
   */
  getToolConfig(): ToolNodeConfig {
    if (!this.isTool()) {
      throw new Error('只有工具节点才能获取工具配置');
    }
    return {
      toolName: this._config['toolName'],
      parameters: this._config['parameters'],
      timeout: this._config['timeout'],
    };
  }

  /**
   * 获取上下文处理器配置（仅上下文处理器节点）
   */
  getContextProcessorConfig(): ContextProcessorConfig {
    if (!this.isContextProcessor()) {
      throw new Error('只有上下文处理器节点才能获取上下文处理器配置');
    }
    return {
      processorName: this._config['processorName'],
      processorConfig: this._config['processorConfig'],
    };
  }

  /**
   * 创建LLM占位符节点
   */
  static llm(id: NodeId, config: LLMNodeConfig, name?: string, description?: string): PlaceholderNode {
    if (!config.provider || typeof config.provider !== 'string') {
      throw new Error('provider必须是非空字符串');
    }
    if (!config.model || typeof config.model !== 'string') {
      throw new Error('model必须是非空字符串');
    }

    return new PlaceholderNode(
      id,
      PlaceholderNodeType.LLM,
      name || 'LLM',
      description || 'LLM交互节点',
      config
    );
  }

  /**
   * 创建工具占位符节点
   */
  static tool(id: NodeId, config: ToolNodeConfig, name?: string, description?: string): PlaceholderNode {
    if (!config.toolName || typeof config.toolName !== 'string') {
      throw new Error('toolName必须是非空字符串');
    }

    return new PlaceholderNode(
      id,
      PlaceholderNodeType.TOOL,
      name || 'Tool',
      description || '工具调用节点',
      config
    );
  }

  /**
   * 创建上下文处理器占位符节点
   */
  static contextProcessor(
    id: NodeId,
    config: ContextProcessorConfig,
    name?: string,
    description?: string
  ): PlaceholderNode {
    if (!config.processorName || typeof config.processorName !== 'string') {
      throw new Error('processorName必须是非空字符串');
    }

    return new PlaceholderNode(
      id,
      PlaceholderNodeType.CONTEXT_PROCESSOR,
      name || 'ContextProcessor',
      description || '上下文处理器节点',
      config
    );
  }

  /**
   * 从属性创建占位符节点
   */
  static fromProps(props: {
    id: NodeId;
    type: PlaceholderNodeType;
    name?: string;
    description?: string;
    config: Record<string, any>;
  }): PlaceholderNode {
    return new PlaceholderNode(
      props.id,
      props.type,
      props.name || props.type,
      props.description || `${props.type}节点`,
      props.config
    );
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this._id.toString(),
      type: this._type,
      name: this._name,
      description: this._description,
      config: this._config,
    };
  }

  /**
   * 从JSON创建占位符节点
   */
  static fromJSON(json: Record<string, any>): PlaceholderNode {
    return new PlaceholderNode(
      NodeId.fromString(json['id']),
      json['type'] as PlaceholderNodeType,
      json['name'],
      json['description'],
      json['config']
    );
  }

  /**
   * 判断两个占位符节点是否相等
   */
  equals(other: PlaceholderNode): boolean {
    return (
      this._id.equals(other._id) &&
      this._type === other._type &&
      this._name === other._name &&
      JSON.stringify(this._config) === JSON.stringify(other._config)
    );
  }
}