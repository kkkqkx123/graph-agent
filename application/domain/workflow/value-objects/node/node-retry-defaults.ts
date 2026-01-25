import { NodeRetryStrategy } from './node-retry-strategy';
import { NodeTypeValue } from './node-type';

/**
 * 节点类型默认重试策略映射
 *
 * 为每种节点类型提供合理的默认重试策略
 */
export const NODE_TYPE_RETRY_DEFAULTS: Record<NodeTypeValue, NodeRetryStrategy> = {
  /**
   * LLM节点：支持重试
   * 原因：网络问题、限流等临时性错误
   */
  [NodeTypeValue.LLM]: NodeRetryStrategy.withExponentialBackoff(3, 1000, 2, 60000),

  /**
   * TOOL节点：支持重试
   * 原因：外部服务调用可能失败
   */
  [NodeTypeValue.TOOL]: NodeRetryStrategy.enabled(2, 500, false),

  /**
   * DATA_TRANSFORM节点：不重试
   * 原因：数据处理失败通常是逻辑错误，重试无意义
   */
  [NodeTypeValue.DATA_TRANSFORM]: NodeRetryStrategy.disabled(),

  /**
   * FORK节点：不重试
   * 原因：控制流错误通常表示严重问题
   */
  [NodeTypeValue.FORK]: NodeRetryStrategy.disabled(),

  /**
   * JOIN节点：不重试
   * 原因：控制流错误通常表示严重问题
   */
  [NodeTypeValue.JOIN]: NodeRetryStrategy.disabled(),

  /**
   * CONDITION节点：不重试
   * 原因：条件判断错误无法继续
   */
  [NodeTypeValue.CONDITION]: NodeRetryStrategy.disabled(),

  /**
   * USER_INTERACTION节点：不重试
   * 原因：用户交互失败可以跳过，重试无意义
   */
  [NodeTypeValue.USER_INTERACTION]: NodeRetryStrategy.disabled(),

  /**
   * CONTEXT_PROCESSOR节点：不重试
   * 原因：上下文处理失败可以使用默认值，重试无意义
   */
  [NodeTypeValue.CONTEXT_PROCESSOR]: NodeRetryStrategy.disabled(),

  /**
   * START节点：不重试
   * 原因：起始节点错误必须停止
   */
  [NodeTypeValue.START]: NodeRetryStrategy.disabled(),

  /**
   * END节点：不重试
   * 原因：结束节点错误必须停止
   */
  [NodeTypeValue.END]: NodeRetryStrategy.disabled(),

  /**
   * LOOP_START节点：不重试
   * 原因：循环控制错误必须停止
   */
  [NodeTypeValue.LOOP_START]: NodeRetryStrategy.disabled(),

  /**
   * LOOP_END节点：不重试
   * 原因：循环控制错误必须停止
   */
  [NodeTypeValue.LOOP_END]: NodeRetryStrategy.disabled(),

  /**
   * MERGE节点：不重试
   * 原因：合并节点错误通常表示数据问题，重试无意义
   */
  [NodeTypeValue.MERGE]: NodeRetryStrategy.disabled(),

  /**
   * SUBGRAPH节点：不重试
   * 原因：子图执行失败通常表示配置问题，重试无意义
   */
  [NodeTypeValue.SUBGRAPH]: NodeRetryStrategy.disabled(),

  /**
   * CUSTOM节点：不重试
   * 原因：自定义节点由用户控制，默认不重试
   */
  [NodeTypeValue.CUSTOM]: NodeRetryStrategy.disabled(),
};

/**
 * 获取节点类型的默认重试策略
 * @param nodeType 节点类型
 * @returns 默认重试策略
 */
export function getDefaultRetryStrategy(nodeType: NodeTypeValue): NodeRetryStrategy {
  return NODE_TYPE_RETRY_DEFAULTS[nodeType] || NodeRetryStrategy.disabled();
}

/**
 * 检查节点类型是否支持重试
 * @param nodeType 节点类型
 * @returns 是否支持重试
 */
export function isRetrySupported(nodeType: NodeTypeValue): boolean {
  return getDefaultRetryStrategy(nodeType).isEnabled();
}

/**
 * 获取所有支持重试的节点类型
 * @returns 支持重试的节点类型列表
 */
export function getRetrySupportedNodeTypes(): NodeTypeValue[] {
  return Object.values(NodeTypeValue).filter(type => isRetrySupported(type));
}