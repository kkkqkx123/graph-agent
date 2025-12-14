import { ID } from '../../../common/value-objects/id';

/**
 * 插件上下文接口
 * 
 * 包含插件执行时需要的所有上下文信息
 */
export interface PluginContext {
  /**
   * 插件ID
   */
  pluginId: string;

  /**
   * 图ID
   */
  graphId?: ID;

  /**
   * 节点ID
   */
  nodeId?: string;

  /**
   * 边ID
   */
  edgeId?: string;

  /**
   * 执行ID
   */
  executionId?: string;

  /**
   * 线程ID
   */
  threadId?: string;

  /**
   * 会话ID
   */
  sessionId?: string;

  /**
   * 用户ID
   */
  userId?: ID;

  /**
   * 插件配置
   */
  config?: Record<string, unknown>;

  /**
   * 全局配置
   */
  globalConfig?: Record<string, unknown>;

  /**
   * 插件元数据
   */
  metadata?: Record<string, unknown>;

  /**
   * 执行参数
   */
  parameters?: Record<string, unknown>;

  /**
   * 输入数据
   */
  inputData?: any;

  /**
   * 输出数据
   */
  outputData?: any;

  /**
   * 状态数据
   */
  stateData?: Record<string, unknown>;

  /**
   * 共享数据
   */
  sharedData?: Record<string, unknown>;

  /**
   * 时间戳
   */
  timestamp: Date;

  /**
   * 环境变量
   */
  environment?: Record<string, string>;
}

/**
 * 插件上下文构建器
 * 
 * 用于构建插件上下文
 */
export class PluginContextBuilder {
  private context: Partial<PluginContext> = {};

  /**
   * 设置插件ID
   */
  public setPluginId(pluginId: string): PluginContextBuilder {
    this.context.pluginId = pluginId;
    return this;
  }

  /**
   * 设置图ID
   */
  public setGraphId(graphId: ID): PluginContextBuilder {
    this.context.graphId = graphId;
    return this;
  }

  /**
   * 设置节点ID
   */
  public setNodeId(nodeId: string): PluginContextBuilder {
    this.context.nodeId = nodeId;
    return this;
  }

  /**
   * 设置边ID
   */
  public setEdgeId(edgeId: string): PluginContextBuilder {
    this.context.edgeId = edgeId;
    return this;
  }

  /**
   * 设置执行ID
   */
  public setExecutionId(executionId: string): PluginContextBuilder {
    this.context.executionId = executionId;
    return this;
  }

  /**
   * 设置线程ID
   */
  public setThreadId(threadId: string): PluginContextBuilder {
    this.context.threadId = threadId;
    return this;
  }

  /**
   * 设置会话ID
   */
  public setSessionId(sessionId: string): PluginContextBuilder {
    this.context.sessionId = sessionId;
    return this;
  }

  /**
   * 设置用户ID
   */
  public setUserId(userId: ID): PluginContextBuilder {
    this.context.userId = userId;
    return this;
  }

  /**
   * 设置插件配置
   */
  public setConfig(config: Record<string, unknown>): PluginContextBuilder {
    this.context.config = config;
    return this;
  }

  /**
   * 设置全局配置
   */
  public setGlobalConfig(globalConfig: Record<string, unknown>): PluginContextBuilder {
    this.context.globalConfig = globalConfig;
    return this;
  }

  /**
   * 设置元数据
   */
  public setMetadata(metadata: Record<string, unknown>): PluginContextBuilder {
    this.context.metadata = metadata;
    return this;
  }

  /**
   * 设置参数
   */
  public setParameters(parameters: Record<string, unknown>): PluginContextBuilder {
    this.context.parameters = parameters;
    return this;
  }

  /**
   * 设置输入数据
   */
  public setInputData(inputData: any): PluginContextBuilder {
    this.context.inputData = inputData;
    return this;
  }

  /**
   * 设置输出数据
   */
  public setOutputData(outputData: any): PluginContextBuilder {
    this.context.outputData = outputData;
    return this;
  }

  /**
   * 设置状态数据
   */
  public setStateData(stateData: Record<string, unknown>): PluginContextBuilder {
    this.context.stateData = stateData;
    return this;
  }

  /**
   * 设置共享数据
   */
  public setSharedData(sharedData: Record<string, unknown>): PluginContextBuilder {
    this.context.sharedData = sharedData;
    return this;
  }

  /**
   * 设置时间戳
   */
  public setTimestamp(timestamp: Date): PluginContextBuilder {
    this.context.timestamp = timestamp;
    return this;
  }

  /**
   * 设置环境变量
   */
  public setEnvironment(environment: Record<string, string>): PluginContextBuilder {
    this.context.environment = environment;
    return this;
  }

  /**
   * 添加配置项
   */
  public addConfig(key: string, value: unknown): PluginContextBuilder {
    if (!this.context.config) {
      this.context.config = {};
    }
    this.context.config[key] = value;
    return this;
  }

  /**
   * 添加全局配置项
   */
  public addGlobalConfig(key: string, value: unknown): PluginContextBuilder {
    if (!this.context.globalConfig) {
      this.context.globalConfig = {};
    }
    this.context.globalConfig[key] = value;
    return this;
  }

  /**
   * 添加元数据
   */
  public addMetadata(key: string, value: unknown): PluginContextBuilder {
    if (!this.context.metadata) {
      this.context.metadata = {};
    }
    this.context.metadata[key] = value;
    return this;
  }

  /**
   * 添加参数
   */
  public addParameter(key: string, value: unknown): PluginContextBuilder {
    if (!this.context.parameters) {
      this.context.parameters = {};
    }
    this.context.parameters[key] = value;
    return this;
  }

  /**
   * 添加状态数据
   */
  public addStateData(key: string, value: unknown): PluginContextBuilder {
    if (!this.context.stateData) {
      this.context.stateData = {};
    }
    this.context.stateData[key] = value;
    return this;
  }

  /**
   * 添加共享数据
   */
  public addSharedData(key: string, value: unknown): PluginContextBuilder {
    if (!this.context.sharedData) {
      this.context.sharedData = {};
    }
    this.context.sharedData[key] = value;
    return this;
  }

  /**
   * 添加环境变量
   */
  public addEnvironment(key: string, value: string): PluginContextBuilder {
    if (!this.context.environment) {
      this.context.environment = {};
    }
    this.context.environment[key] = value;
    return this;
  }

  /**
   * 构建插件上下文
   */
  public build(): PluginContext {
    // 设置默认时间戳
    if (!this.context.timestamp) {
      this.context.timestamp = new Date();
    }

    // 验证必需字段
    if (!this.context.pluginId) {
      throw new Error('插件ID不能为空');
    }

    return this.context as PluginContext;
  }

  /**
   * 从现有上下文创建构建器
   */
  public static from(context: Partial<PluginContext>): PluginContextBuilder {
    const builder = new PluginContextBuilder();
    builder.context = { ...context };
    return builder;
  }

  /**
   * 创建新的插件上下文
   */
  public static create(pluginId: string): PluginContextBuilder {
    return new PluginContextBuilder().setPluginId(pluginId);
  }

  /**
   * 从插件创建上下文
   */
  public static fromPlugin(plugin: any, config?: Record<string, unknown>): PluginContextBuilder {
    return PluginContextBuilder
      .create(plugin.getId())
      .setConfig(config || plugin.getConfig() || {})
      .setMetadata(plugin.getMetadata() || {});
  }
}

/**
 * 插件上下文工具类
 * 
 * 提供插件上下文的实用方法
 */
export class PluginContextUtils {
  /**
   * 创建执行上下文
   */
  public static createExecutionContext(
    pluginId: string,
    graphId?: ID,
    nodeId?: string,
    executionId?: string,
    inputData?: any
  ): PluginContext {
    const builder = PluginContextBuilder
      .create(pluginId)
      .setGraphId(graphId!)
      .setExecutionId(executionId!)
      .setInputData(inputData);
    
    if (nodeId) builder.setNodeId(nodeId);
    
    return builder.build();
  }

  /**
   * 创建初始化上下文
   */
  public static createInitializationContext(
    pluginId: string,
    config?: Record<string, unknown>,
    globalConfig?: Record<string, unknown>
  ): PluginContext {
    return PluginContextBuilder
      .create(pluginId)
      .setConfig(config || {})
      .setGlobalConfig(globalConfig || {})
      .build();
  }

  /**
   * 克隆插件上下文
   */
  public static clone(context: PluginContext): PluginContext {
    return PluginContextBuilder
      .from(context)
      .setTimestamp(new Date())
      .build();
  }

  /**
   * 检查上下文是否有效
   */
  public static isValid(context: PluginContext): boolean {
    return !!(context && context.pluginId);
  }

  /**
   * 获取上下文摘要
   */
  public static getSummary(context: PluginContext): Record<string, unknown> {
    return {
      pluginId: context.pluginId,
      graphId: context.graphId?.toString(),
      nodeId: context.nodeId,
      edgeId: context.edgeId,
      executionId: context.executionId,
      threadId: context.threadId,
      sessionId: context.sessionId,
      userId: context.userId?.toString(),
      hasConfig: !!context.config,
      hasGlobalConfig: !!context.globalConfig,
      hasMetadata: !!context.metadata,
      hasParameters: !!context.parameters,
      hasInputData: !!context.inputData,
      hasOutputData: !!context.outputData,
      hasStateData: !!context.stateData,
      hasSharedData: !!context.sharedData,
      timestamp: context.timestamp.toISOString(),
      hasEnvironment: !!context.environment
    };
  }
}