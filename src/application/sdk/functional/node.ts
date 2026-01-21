/**
 * node 函数集合
 *
 * 提供函数式 API 用于创建各种类型的节点配置
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
  WrapperConfig,
  PromptSource,
} from '../types';

/**
 * node 函数集合
 * 提供创建各种类型节点的函数
 */
export const node = {
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
};

/**
 * 类型守卫：检查节点是否为开始节点
 */
export function isStartNode(node: NodeConfig): node is StartNodeConfig {
  return node.type === 'start';
}

/**
 * 类型守卫：检查节点是否为结束节点
 */
export function isEndNode(node: NodeConfig): node is EndNodeConfig {
  return node.type === 'end';
}

/**
 * 类型守卫：检查节点是否为 LLM 节点
 */
export function isLLMNode(node: NodeConfig): node is LLMNodeConfig {
  return node.type === 'llm';
}

/**
 * 类型守卫：检查节点是否为工具调用节点
 */
export function isToolNode(node: NodeConfig): node is ToolCallNodeConfig {
  return node.type === 'tool' || node.type === 'tool-call';
}

/**
 * 类型守卫：检查节点是否为条件节点
 */
export function isConditionNode(node: NodeConfig): node is ConditionNodeConfig {
  return node.type === 'condition';
}

/**
 * 类型守卫：检查节点是否为数据转换节点
 */
export function isTransformNode(node: NodeConfig): node is DataTransformNodeConfig {
  return node.type === 'data-transform';
}

/**
 * 类型守卫：检查节点是否为上下文处理器节点
 */
export function isContextProcessorNode(node: NodeConfig): node is ContextProcessorNodeConfig {
  return node.type === 'context-processor';
}