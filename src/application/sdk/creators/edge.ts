/**
 * createEdge 函数
 *
 * 提供简化的对象创建 API 用于创建边配置
 */

import type {
  EdgeConfig,
  EdgeConditionConfig,
} from '../types';

/**
 * createEdge 函数
 * 创建边配置对象
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param config 边配置
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createEdge('node1', 'node2', {
 *   weight: 0.5,
 *   properties: { label: '连接' }
 * });
 * ```
 */
export function createEdge(
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
 * createEdgeFromConfig 函数
 * 从配置对象创建边
 *
 * @param config 边配置对象
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createEdgeFromConfig({
 *   from: 'node1',
 *   to: 'node2',
 *   weight: 0.5
 * });
 * ```
 */
export function createEdgeFromConfig(config: EdgeConfig): EdgeConfig {
  if (!config || !config.from || !config.to) {
    throw new Error('边配置无效');
  }

  if (!config.from || config.from.trim() === '') {
    throw new Error('源节点 ID 不能为空');
  }

  if (!config.to || config.to.trim() === '') {
    throw new Error('目标节点 ID 不能为空');
  }

  // 返回深拷贝
  return JSON.parse(JSON.stringify(config));
}

/**
 * createSimpleEdge 函数
 * 创建简单边（无条件和权重）
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createSimpleEdge('node1', 'node2');
 * ```
 */
export function createSimpleEdge(from: string, to: string): EdgeConfig {
  return createEdge(from, to);
}

/**
 * createConditionalEdge 函数
 * 创建条件边
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param condition 条件配置
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createConditionalEdge('node1', 'node2', {
 *   type: 'function',
 *   value: 'checkCondition'
 * });
 * ```
 */
export function createConditionalEdge(
  from: string,
  to: string,
  condition: EdgeConditionConfig
): EdgeConfig {
  return createEdge(from, to, { condition });
}

/**
 * createWeightedEdge 函数
 * 创建带权重的边
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param weight 权重值
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createWeightedEdge('node1', 'node2', 0.5);
 * ```
 */
export function createWeightedEdge(from: string, to: string, weight: number): EdgeConfig {
  return createEdge(from, to, { weight });
}

/**
 * createFunctionEdge 函数
 * 创建函数类型条件边
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param functionId 函数 ID
 * @param config 函数配置
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createFunctionEdge('node1', 'node2', 'checkCondition', {
 *   threshold: 10
 * });
 * ```
 */
export function createFunctionEdge(
  from: string,
  to: string,
  functionId: string,
  config?: Record<string, unknown>
): EdgeConfig {
  return createEdge(from, to, {
    condition: {
      type: 'function',
      value: functionId,
      parameters: config,
    },
  });
}

/**
 * createExpressionEdge 函数
 * 创建表达式类型条件边
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param expression 表达式字符串
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createExpressionEdge('node1', 'node2', 'count > 10');
 * ```
 */
export function createExpressionEdge(from: string, to: string, expression: string): EdgeConfig {
  return createEdge(from, to, {
    condition: {
      type: 'expression',
      value: expression,
    },
  });
}

/**
 * createScriptEdge 函数
 * 创建脚本类型条件边
 *
 * @param from 源节点 ID
 * @param to 目标节点 ID
 * @param script 脚本字符串
 * @param language 脚本语言
 * @returns EdgeConfig 对象
 *
 * @example
 * ```typescript
 * const edge = createScriptEdge('node1', 'node2', 'return count > 10', 'javascript');
 * ```
 */
export function createScriptEdge(
  from: string,
  to: string,
  script: string,
  language?: string
): EdgeConfig {
  return createEdge(from, to, {
    condition: {
      type: 'script',
      value: script,
      language,
    },
  });
}