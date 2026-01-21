/**
 * edge 函数
 *
 * 提供函数式 API 用于创建边配置
 */

import type {
  EdgeConfig,
  EdgeConditionConfig,
} from '../types';

/**
 * edge 函数
 * 创建边配置对象
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param config 边配置
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const simpleEdge = edge('node1', 'node2');
 * const conditionalEdge = edge('node1', 'node2', {
 *   condition: { type: 'function', value: 'checkCondition' }
 * });
 * const weightedEdge = edge('node1', 'node2', { weight: 0.5 });
 * ```
 */
export function edge(
  from: string,
  to: string,
  config?: {
    type?: string;
    condition?: EdgeConditionConfig;
    weight?: number;
    properties?: Record<string, unknown>;
  }
): EdgeConfig {
  // 验证必需参数
  if (!from || from.trim() === '') {
    throw new Error('边必须包含源节点 ID (from)');
  }

  if (!to || to.trim() === '') {
    throw new Error('边必须包含目标节点 ID (to)');
  }

  if (from === to) {
    throw new Error('边的源节点和目标节点不能相同');
  }

  // 验证权重
  if (config?.weight !== undefined) {
    if (typeof config.weight !== 'number') {
      throw new Error('边权重必须是数字');
    }
    if (config.weight < 0) {
      throw new Error('边权重不能为负数');
    }
  }

  // 验证条件配置
  if (config?.condition) {
    const validTypes = ['function', 'expression', 'script'];
    if (!validTypes.includes(config.condition.type)) {
      throw new Error(`无效的条件类型: ${config.condition.type}`);
    }
    if (!config.condition.value || config.condition.value.trim() === '') {
      throw new Error('条件配置必须包含 value 字段');
    }
  }

  return {
    from,
    to,
    type: config?.type,
    condition: config?.condition,
    weight: config?.weight,
    properties: config?.properties,
  };
}

/**
 * 创建简单边（无条件和权重）
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @returns EdgeConfig 对象
 */
export function simpleEdge(from: string, to: string): EdgeConfig {
  return edge(from, to);
}

/**
 * 创建条件边
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param condition 条件配置
 * @returns EdgeConfig 对象
 */
export function conditionalEdge(
  from: string,
  to: string,
  condition: EdgeConditionConfig
): EdgeConfig {
  return edge(from, to, { condition });
}

/**
 * 创建函数类型条件边
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param functionId 函数 ID
 * @param config 函数配置
 * @returns EdgeConfig 对象
 */
export function functionEdge(
  from: string,
  to: string,
  functionId: string,
  config?: Record<string, unknown>
): EdgeConfig {
  return edge(from, to, {
    condition: {
      type: 'function',
      value: functionId,
      parameters: config,
    },
  });
}

/**
 * 创建表达式类型条件边
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param expression 表达式字符串
 * @returns EdgeConfig 对象
 */
export function expressionEdge(from: string, to: string, expression: string): EdgeConfig {
  return edge(from, to, {
    condition: {
      type: 'expression',
      value: expression,
    },
  });
}

/**
 * 创建脚本类型条件边
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param script 脚本字符串
 * @param language 脚本语言
 * @returns EdgeConfig 对象
 */
export function scriptEdge(
  from: string,
  to: string,
  script: string,
  language?: string
): EdgeConfig {
  return edge(from, to, {
    condition: {
      type: 'script',
      value: script,
      language,
    },
  });
}

/**
 * 创建带权重的边
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param weight 权重值
 * @returns EdgeConfig 对象
 */
export function weightedEdge(from: string, to: string, weight: number): EdgeConfig {
  return edge(from, to, { weight });
}