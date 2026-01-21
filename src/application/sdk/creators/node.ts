/**
 * createNode 函数集合
 *
 * 提供简化的对象创建 API 用于创建各种类型的节点配置
 */

import type {
  StartNodeConfig,
  EndNodeConfig,
  LLMNodeConfig,
  ToolCallNodeConfig,
  ConditionNodeConfig,
  DataTransformNodeConfig,
  ContextProcessorNodeConfig,
  NodeConfig,
  PromptSource,
} from '../types';

/**
 * createNode 函数集合
 * 提供创建各种类型节点的函数
 */
export const createNode = {
  /**
   * 创建开始节点
   * @param id 节点 ID
   * @param config 节点配置
   * @returns StartNodeConfig 对象
   */
  start: (id: string, config?: Partial<StartNodeConfig>): StartNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    return {
      type: 'start',
      id,
      name: config?.name,
      description: config?.description,
      position: config?.position,
      initialVariables: config?.initialVariables,
      initializeContext: config?.initializeContext,
    };
  },

  /**
   * 创建结束节点
   * @param id 节点 ID
   * @param config 节点配置
   * @returns EndNodeConfig 对象
   */
  end: (id: string, config?: Partial<EndNodeConfig>): EndNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    return {
      type: 'end',
      id,
      name: config?.name,
      description: config?.description,
      position: config?.position,
      collectResults: config?.collectResults,
      cleanupResources: config?.cleanupResources,
      returnVariables: config?.returnVariables,
    };
  },

  /**
   * 创建 LLM 节点
   * @param id 节点 ID
   * @param config 节点配置
   * @returns LLMNodeConfig 对象
   */
  llm: (id: string, config: Partial<LLMNodeConfig>): LLMNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!config.prompt) {
      throw new Error('LLM 节点必须包含 prompt 配置');
    }
    return {
      type: 'llm',
      id,
      name: config.name,
      description: config.description,
      position: config.position,
      wrapperConfig: config.wrapperConfig,
      wrapper_type: config.wrapper_type,
      wrapper_name: config.wrapper_name,
      wrapper_provider: config.wrapper_provider,
      wrapper_model: config.wrapper_model,
      prompt: config.prompt,
      systemPrompt: config.systemPrompt,
      contextProcessorName: config.contextProcessorName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      stream: config.stream,
    };
  },

  /**
   * 创建工具调用节点
   * @param id 节点 ID
   * @param config 节点配置
   * @returns ToolCallNodeConfig 对象
   */
  tool: (id: string, config: Partial<ToolCallNodeConfig>): ToolCallNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!config.toolName) {
      throw new Error('工具调用节点必须包含 toolName 配置');
    }
    return {
      type: 'tool',
      id,
      name: config.name,
      description: config.description,
      position: config.position,
      toolName: config.toolName,
      toolParameters: config.toolParameters,
      timeout: config.timeout,
    };
  },

  /**
   * 创建条件节点
   * @param id 节点 ID
   * @param config 节点配置
   * @returns ConditionNodeConfig 对象
   */
  condition: (id: string, config: Partial<ConditionNodeConfig>): ConditionNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!config.condition) {
      throw new Error('条件节点必须包含 condition 配置');
    }
    return {
      type: 'condition',
      id,
      name: config.name,
      description: config.description,
      position: config.position,
      condition: config.condition,
      variables: config.variables,
    };
  },

  /**
   * 创建数据转换节点
   * @param id 节点 ID
   * @param config 节点配置
   * @returns DataTransformNodeConfig 对象
   */
  transform: (id: string, config: Partial<DataTransformNodeConfig>): DataTransformNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!config.transformType) {
      throw new Error('数据转换节点必须包含 transformType 配置');
    }
    if (!config.sourceData) {
      throw new Error('数据转换节点必须包含 sourceData 配置');
    }
    if (!config.targetVariable) {
      throw new Error('数据转换节点必须包含 targetVariable 配置');
    }
    return {
      type: 'data-transform',
      id,
      name: config.name,
      description: config.description,
      position: config.position,
      transformType: config.transformType,
      sourceData: config.sourceData,
      targetVariable: config.targetVariable,
      transformConfig: config.transformConfig,
    };
  },

  /**
   * 创建上下文处理器节点
   * @param id 节点 ID
   * @param config 节点配置
   * @returns ContextProcessorNodeConfig 对象
   */
  contextProcessor: (id: string, config: Partial<ContextProcessorNodeConfig>): ContextProcessorNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!config.processorName) {
      throw new Error('上下文处理器节点必须包含 processorName 配置');
    }
    return {
      type: 'context-processor',
      id,
      name: config.name,
      description: config.description,
      position: config.position,
      processorName: config.processorName,
      processorConfig: config.processorConfig,
    };
  },

  // ============================================================================
  // 快速创建方法
  // ============================================================================

  /**
   * 快速创建 LLM 节点
   * @param id 节点 ID
   * @param prompt 提示词
   * @param config 可选配置
   * @returns LLMNodeConfig 对象
   *
   * @example
   * ```typescript
   * const llmNode = createNode.quickLLM('llm', '你好', {
   *   provider: 'openai',
   *   model: 'gpt-4',
   *   temperature: 0.7
   * });
   * ```
   */
  quickLLM: (
    id: string,
    prompt: string | PromptSource,
    config?: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      systemPrompt?: string | PromptSource;
    }
  ): LLMNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }

    const promptSource: PromptSource =
      typeof prompt === 'string'
        ? { type: 'direct', content: prompt }
        : prompt;

    const systemPromptSource: PromptSource | undefined = config?.systemPrompt
      ? typeof config.systemPrompt === 'string'
        ? { type: 'direct', content: config.systemPrompt }
        : config.systemPrompt
      : undefined;

    return {
      type: 'llm',
      id,
      name: config?.provider ? `${config.provider} LLM` : 'LLM 节点',
      wrapper_type: 'direct',
      wrapper_provider: config?.provider || 'openai',
      wrapper_model: config?.model || 'gpt-4',
      prompt: promptSource,
      systemPrompt: systemPromptSource,
      temperature: config?.temperature,
      maxTokens: config?.maxTokens,
      stream: config?.stream,
    };
  },

  /**
   * 快速创建工具调用节点
   * @param id 节点 ID
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @returns ToolCallNodeConfig 对象
   *
   * @example
   * ```typescript
   * const toolNode = createNode.quickTool('tool', 'search', {
   *   query: 'TypeScript'
   * });
   * ```
   */
  quickTool: (
    id: string,
    toolName: string,
    parameters?: Record<string, unknown>
  ): ToolCallNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!toolName || toolName.trim() === '') {
      throw new Error('工具名称不能为空');
    }

    return {
      type: 'tool',
      id,
      name: toolName,
      toolName,
      toolParameters: parameters || {},
      timeout: 30000,
    };
  },

  /**
   * 快速创建条件分支节点
   * @param id 节点 ID
   * @param condition 条件表达式
   * @param trueBranch 条件为真时的目标节点 ID
   * @param falseBranch 条件为假时的目标节点 ID
   * @param variables 可选的变量
   * @returns ConditionNodeConfig 对象
   *
   * @example
   * ```typescript
   * const branchNode = createNode.quickBranch(
   *   'branch',
   *   'count > 10',
   *   'process-large',
   *   'process-small',
   *   { count: 5 }
   * );
   * ```
   */
  quickBranch: (
    id: string,
    condition: string,
    trueBranch: string,
    falseBranch: string,
    variables?: Record<string, unknown>
  ): ConditionNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!condition || condition.trim() === '') {
      throw new Error('条件表达式不能为空');
    }
    if (!trueBranch || trueBranch.trim() === '') {
      throw new Error('真分支目标节点 ID 不能为空');
    }
    if (!falseBranch || falseBranch.trim() === '') {
      throw new Error('假分支目标节点 ID 不能为空');
    }

    return {
      type: 'condition',
      id,
      name: `条件分支: ${condition}`,
      condition,
      variables: variables || {},
    };
  },

  /**
   * 快速创建数据转换节点
   * @param id 节点 ID
   * @param transformType 转换类型
   * @param sourceData 源数据变量名
   * @param targetVariable 目标变量名
   * @param transformConfig 转换配置
   * @returns DataTransformNodeConfig 对象
   *
   * @example
   * ```typescript
   * const transformNode = createNode.quickTransform(
   *   'transform',
   *   'map',
   *   'items',
   *   'processedItems',
   *   { fn: 'x => x * 2' }
   * );
   * ```
   */
  quickTransform: (
    id: string,
    transformType: 'map' | 'filter' | 'reduce' | 'sort' | 'group',
    sourceData: string,
    targetVariable: string,
    transformConfig?: Record<string, unknown>
  ): DataTransformNodeConfig => {
    if (!id || id.trim() === '') {
      throw new Error('节点 ID 不能为空');
    }
    if (!sourceData || sourceData.trim() === '') {
      throw new Error('源数据变量名不能为空');
    }
    if (!targetVariable || targetVariable.trim() === '') {
      throw new Error('目标变量名不能为空');
    }

    return {
      type: 'data-transform',
      id,
      name: `${transformType} 转换`,
      transformType,
      sourceData,
      targetVariable,
      transformConfig: transformConfig || {},
    };
  },
};

/**
 * createNodeFromConfig 函数
 * 从配置对象创建节点
 *
 * @param config 节点配置对象
 * @returns NodeConfig 对象
 *
 * @example
 * ```typescript
 * const node = createNodeFromConfig({
 *   id: 'my-node',
 *   type: 'llm',
 *   prompt: { type: 'direct', content: 'Hello' }
 * });
 * ```
 */
export function createNodeFromConfig(config: NodeConfig): NodeConfig {
  if (!config || !config.type) {
    throw new Error('节点配置无效');
  }

  if (!config.id || config.id.trim() === '') {
    throw new Error('节点 ID 不能为空');
  }

  // 返回深拷贝
  return JSON.parse(JSON.stringify(config));
}