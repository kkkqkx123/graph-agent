/**
 * NodeBuilder 类
 *
 * 提供流式 API 用于构建各种类型的节点配置
 * 支持链式调用，提供流畅的开发体验
 */

import type {
  BaseNodeConfig,
  StartNodeConfig,
  EndNodeConfig,
  LLMNodeConfig,
  ToolCallNodeConfig,
  ConditionNodeConfig,
  DataTransformNodeConfig,
  ContextProcessorNodeConfig,
  NodeConfig,
  WrapperConfig,
  PromptSource,
} from '../types';

/**
 * NodeBuilder 类
 * 用于构建节点配置的流式 API
 */
export class NodeBuilder {
  private config: Partial<BaseNodeConfig> & { type: string };

  private constructor(type: string, id: string) {
    this.config = {
      id,
      type,
    };
  }

  /**
   * 创建开始节点构建器
   * @param id 节点 ID
   * @returns NodeBuilder 实例
   */
  public static start(id: string): NodeBuilder {
    return new NodeBuilder('start', id);
  }

  /**
   * 创建结束节点构建器
   * @param id 节点 ID
   * @returns NodeBuilder 实例
   */
  public static end(id: string): NodeBuilder {
    return new NodeBuilder('end', id);
  }

  /**
   * 创建 LLM 节点构建器
   * @param id 节点 ID
   * @returns NodeBuilder 实例
   */
  public static llm(id: string): NodeBuilder {
    return new NodeBuilder('llm', id);
  }

  /**
   * 创建工具调用节点构建器
   * @param id 节点 ID
   * @returns NodeBuilder 实例
   */
  public static tool(id: string): NodeBuilder {
    return new NodeBuilder('tool', id);
  }

  /**
   * 创建条件节点构建器
   * @param id 节点 ID
   * @returns NodeBuilder 实例
   */
  public static condition(id: string): NodeBuilder {
    return new NodeBuilder('condition', id);
  }

  /**
   * 创建数据转换节点构建器
   * @param id 节点 ID
   * @returns NodeBuilder 实例
   */
  public static transform(id: string): NodeBuilder {
    return new NodeBuilder('data-transform', id);
  }

  /**
   * 创建上下文处理器节点构建器
   * @param id 节点 ID
   * @returns NodeBuilder 实例
   */
  public static contextProcessor(id: string): NodeBuilder {
    return new NodeBuilder('context-processor', id);
  }

  // ============================================================================
  // 通用配置方法
  // ============================================================================

  /**
   * 设置节点名称
   * @param name 节点名称
   * @returns this
   */
  public name(name: string): NodeBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * 设置节点描述
   * @param description 节点描述
   * @returns this
   */
  public description(description: string): NodeBuilder {
    this.config.description = description;
    return this;
  }

  /**
   * 设置节点位置
   * @param x X 坐标
   * @param y Y 坐标
   * @returns this
   */
  public position(x: number, y: number): NodeBuilder {
    this.config.position = { x, y };
    return this;
  }

  // ============================================================================
  // 开始节点配置方法
  // ============================================================================

  /**
   * 设置初始变量
   * @param variables 初始变量对象
   * @returns this
   */
  public initialVariables(variables: Record<string, unknown>): NodeBuilder {
    if (this.config.type !== 'start') {
      throw new Error('initialVariables 只能用于开始节点');
    }
    (this.config as Partial<StartNodeConfig>).initialVariables = variables;
    return this;
  }

  /**
   * 设置是否初始化上下文
   * @param initialize 是否初始化上下文
   * @returns this
   */
  public initializeContext(initialize: boolean): NodeBuilder {
    if (this.config.type !== 'start') {
      throw new Error('initializeContext 只能用于开始节点');
    }
    (this.config as Partial<StartNodeConfig>).initializeContext = initialize;
    return this;
  }

  // ============================================================================
  // 结束节点配置方法
  // ============================================================================

  /**
   * 设置是否收集结果
   * @param collect 是否收集结果
   * @returns this
   */
  public collectResults(collect: boolean): NodeBuilder {
    if (this.config.type !== 'end') {
      throw new Error('collectResults 只能用于结束节点');
    }
    (this.config as Partial<EndNodeConfig>).collectResults = collect;
    return this;
  }

  /**
   * 设置是否清理资源
   * @param cleanup 是否清理资源
   * @returns this
   */
  public cleanupResources(cleanup: boolean): NodeBuilder {
    if (this.config.type !== 'end') {
      throw new Error('cleanupResources 只能用于结束节点');
    }
    (this.config as Partial<EndNodeConfig>).cleanupResources = cleanup;
    return this;
  }

  /**
   * 设置返回变量列表
   * @param variables 返回变量数组
   * @returns this
   */
  public returnVariables(variables: string[]): NodeBuilder {
    if (this.config.type !== 'end') {
      throw new Error('returnVariables 只能用于结束节点');
    }
    (this.config as Partial<EndNodeConfig>).returnVariables = variables;
    return this;
  }

  // ============================================================================
  // LLM 节点配置方法
  // ============================================================================

  /**
   * 设置 Wrapper 配置
   * @param wrapper Wrapper 配置对象
   * @returns this
   */
  public wrapperConfig(wrapper: WrapperConfig): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('wrapperConfig 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).wrapperConfig = wrapper;
    return this;
  }

  /**
   * 设置 Wrapper 类型
   * @param type Wrapper 类型
   * @returns this
   */
  public wrapperType(type: 'pool' | 'group' | 'direct'): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('wrapperType 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).wrapper_type = type;
    return this;
  }

  /**
   * 设置 Wrapper 名称
   * @param name Wrapper 名称
   * @returns this
   */
  public wrapperName(name: string): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('wrapperName 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).wrapper_name = name;
    return this;
  }

  /**
   * 设置 Wrapper 提供商
   * @param provider 提供商名称
   * @returns this
   */
  public wrapperProvider(provider: string): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('wrapperProvider 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).wrapper_provider = provider;
    return this;
  }

  /**
   * 设置 Wrapper 模型
   * @param model 模型名称
   * @returns this
   */
  public wrapperModel(model: string): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('wrapperModel 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).wrapper_model = model;
    return this;
  }

  /**
   * 设置提示词
   * @param prompt 提示词对象
   * @returns this
   */
  public prompt(prompt: PromptSource): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('prompt 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).prompt = prompt;
    return this;
  }

  /**
   * 设置系统提示词
   * @param prompt 系统提示词对象
   * @returns this
   */
  public systemPrompt(prompt: PromptSource): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('systemPrompt 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).systemPrompt = prompt;
    return this;
  }

  /**
   * 设置上下文处理器名称
   * @param name 上下文处理器名称
   * @returns this
   */
  public contextProcessorName(name: string): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('contextProcessorName 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).contextProcessorName = name;
    return this;
  }

  /**
   * 设置温度参数
   * @param temperature 温度值
   * @returns this
   */
  public temperature(temperature: number): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('temperature 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).temperature = temperature;
    return this;
  }

  /**
   * 设置最大 Token 数
   * @param maxTokens 最大 Token 数
   * @returns this
   */
  public maxTokens(maxTokens: number): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('maxTokens 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).maxTokens = maxTokens;
    return this;
  }

  /**
   * 设置是否流式输出
   * @param stream 是否流式输出
   * @returns this
   */
  public stream(stream: boolean): NodeBuilder {
    if (this.config.type !== 'llm') {
      throw new Error('stream 只能用于 LLM 节点');
    }
    (this.config as Partial<LLMNodeConfig>).stream = stream;
    return this;
  }

  // ============================================================================
  // 工具调用节点配置方法
  // ============================================================================

  /**
   * 设置工具名称
   * @param toolName 工具名称
   * @returns this
   */
  public toolName(toolName: string): NodeBuilder {
    if (this.config.type !== 'tool' && this.config.type !== 'tool-call') {
      throw new Error('toolName 只能用于工具调用节点');
    }
    (this.config as Partial<ToolCallNodeConfig>).toolName = toolName;
    return this;
  }

  /**
   * 设置工具参数
   * @param parameters 工具参数对象
   * @returns this
   */
  public toolParameters(parameters: Record<string, unknown>): NodeBuilder {
    if (this.config.type !== 'tool' && this.config.type !== 'tool-call') {
      throw new Error('toolParameters 只能用于工具调用节点');
    }
    (this.config as Partial<ToolCallNodeConfig>).toolParameters = parameters;
    return this;
  }

  /**
   * 设置超时时间
   * @param timeout 超时时间（毫秒）
   * @returns this
   */
  public timeout(timeout: number): NodeBuilder {
    if (this.config.type !== 'tool' && this.config.type !== 'tool-call') {
      throw new Error('timeout 只能用于工具调用节点');
    }
    (this.config as Partial<ToolCallNodeConfig>).timeout = timeout;
    return this;
  }

  // ============================================================================
  // 条件节点配置方法
  // ============================================================================

  /**
   * 设置条件表达式
   * @param condition 条件表达式
   * @returns this
   */
  public condition(condition: string): NodeBuilder {
    if (this.config.type !== 'condition') {
      throw new Error('condition 只能用于条件节点');
    }
    (this.config as Partial<ConditionNodeConfig>).condition = condition;
    return this;
  }

  /**
   * 设置条件变量
   * @param variables 变量对象
   * @returns this
   */
  public variables(variables: Record<string, unknown>): NodeBuilder {
    if (this.config.type !== 'condition') {
      throw new Error('variables 只能用于条件节点');
    }
    (this.config as Partial<ConditionNodeConfig>).variables = variables;
    return this;
  }

  // ============================================================================
  // 数据转换节点配置方法
  // ============================================================================

  /**
   * 设置转换类型
   * @param type 转换类型
   * @returns this
   */
  public transformType(type: 'map' | 'filter' | 'reduce' | 'sort' | 'group'): NodeBuilder {
    if (this.config.type !== 'data-transform') {
      throw new Error('transformType 只能用于数据转换节点');
    }
    (this.config as Partial<DataTransformNodeConfig>).transformType = type;
    return this;
  }

  /**
   * 设置源数据
   * @param sourceData 源数据变量名
   * @returns this
   */
  public sourceData(sourceData: string): NodeBuilder {
    if (this.config.type !== 'data-transform') {
      throw new Error('sourceData 只能用于数据转换节点');
    }
    (this.config as Partial<DataTransformNodeConfig>).sourceData = sourceData;
    return this;
  }

  /**
   * 设置目标变量
   * @param targetVariable 目标变量名
   * @returns this
   */
  public targetVariable(targetVariable: string): NodeBuilder {
    if (this.config.type !== 'data-transform') {
      throw new Error('targetVariable 只能用于数据转换节点');
    }
    (this.config as Partial<DataTransformNodeConfig>).targetVariable = targetVariable;
    return this;
  }

  /**
   * 设置转换配置
   * @param config 转换配置对象
   * @returns this
   */
  public transformConfig(config: Record<string, unknown>): NodeBuilder {
    if (this.config.type !== 'data-transform') {
      throw new Error('transformConfig 只能用于数据转换节点');
    }
    (this.config as Partial<DataTransformNodeConfig>).transformConfig = config;
    return this;
  }

  // ============================================================================
  // 上下文处理器节点配置方法
  // ============================================================================

  /**
   * 设置处理器名称
   * @param name 处理器名称
   * @returns this
   */
  public processorName(name: string): NodeBuilder {
    if (this.config.type !== 'context-processor') {
      throw new Error('processorName 只能用于上下文处理器节点');
    }
    (this.config as Partial<ContextProcessorNodeConfig>).processorName = name;
    return this;
  }

  /**
   * 设置处理器配置
   * @param config 处理器配置对象
   * @returns this
   */
  public processorConfig(config: Record<string, unknown>): NodeBuilder {
    if (this.config.type !== 'context-processor') {
      throw new Error('processorConfig 只能用于上下文处理器节点');
    }
    (this.config as Partial<ContextProcessorNodeConfig>).processorConfig = config;
    return this;
  }

  // ============================================================================
  // 构建方法
  // ============================================================================

  /**
   * 构建最终的节点配置对象
   * @returns NodeConfig 对象
   * @throws Error 如果配置无效
   */
  public build(): NodeConfig {
    this.validate();
    return this.config as NodeConfig;
  }

  /**
   * 验证节点配置
   * @throws Error 如果配置无效
   */
  private validate(): void {
    if (!this.config.id || this.config.id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }

    // 根据节点类型验证必需字段
    switch (this.config.type) {
      case 'llm':
        if (!(this.config as Partial<LLMNodeConfig>).prompt) {
          throw new Error('LLM 节点必须包含 prompt 配置');
        }
        break;

      case 'tool':
      case 'tool-call':
        if (!(this.config as Partial<ToolCallNodeConfig>).toolName) {
          throw new Error('工具调用节点必须包含 toolName 配置');
        }
        break;

      case 'condition':
        if (!(this.config as Partial<ConditionNodeConfig>).condition) {
          throw new Error('条件节点必须包含 condition 配置');
        }
        break;

      case 'data-transform':
        const transformConfig = this.config as Partial<DataTransformNodeConfig>;
        if (!transformConfig.transformType) {
          throw new Error('数据转换节点必须包含 transformType 配置');
        }
        if (!transformConfig.sourceData) {
          throw new Error('数据转换节点必须包含 sourceData 配置');
        }
        if (!transformConfig.targetVariable) {
          throw new Error('数据转换节点必须包含 targetVariable 配置');
        }
        break;

      case 'context-processor':
        if (!(this.config as Partial<ContextProcessorNodeConfig>).processorName) {
          throw new Error('上下文处理器节点必须包含 processorName 配置');
        }
        break;
    }
  }
}