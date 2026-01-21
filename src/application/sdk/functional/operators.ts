/**
 * operators 模块
 *
 * 提供函数式操作符，包括 pipe 和高阶函数
 */

import type {
  WorkflowConfigData,
  NodeConfig,
  EdgeConfig,
} from '../types';
import { workflow } from './workflow';
import { edge } from './edge';

/**
 * pipe 函数
 * 将多个节点按顺序连接，形成线性工作流
 *
 * @param nodes 节点配置数组
 * @param options 可选配置
 * @returns WorkflowConfigData 对象
 *
 * @example
 * ```typescript
 * const workflow = pipe(
 *   node.start('start'),
 *   node.llm('llm', { prompt: { type: 'direct', content: 'Hello' } }),
 *   node.end('end')
 * );
 * ```
 */
export function pipe(
  ...nodes: NodeConfig[]
): WorkflowConfigData;
export function pipe(
  options: { id: string; name?: string; description?: string },
  ...nodes: NodeConfig[]
): WorkflowConfigData;
export function pipe(
  first: NodeConfig | { id: string; name?: string; description?: string },
  ...rest: NodeConfig[]
): WorkflowConfigData {
  let workflowId: string;
  let workflowName: string | undefined;
  let workflowDescription: string | undefined;
  let nodes: NodeConfig[];

  // 判断第一个参数是配置对象还是节点
  if ('type' in first) {
    // 第一个参数是节点
    workflowId = `pipe-workflow-${Date.now()}`;
    workflowName = undefined;
    workflowDescription = undefined;
    nodes = [first, ...rest];
  } else {
    // 第一个参数是配置对象
    workflowId = first.id;
    workflowName = first.name;
    workflowDescription = first.description;
    nodes = rest;
  }

  // 验证节点数量
  if (nodes.length < 2) {
    throw new Error('pipe 至少需要 2 个节点');
  }

  // 自动创建边，连接相邻节点
  const edges: EdgeConfig[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const fromNode = nodes[i];
    const toNode = nodes[i + 1];

    if (!fromNode || !fromNode.id) {
      throw new Error(`第 ${i + 1} 个节点缺少 ID`);
    }
    if (!toNode || !toNode.id) {
      throw new Error(`第 ${i + 2} 个节点缺少 ID`);
    }

    edges.push(edge(fromNode.id, toNode.id));
  }

  return workflow(workflowId, {
    name: workflowName,
    description: workflowDescription,
    nodes,
    edges,
  });
}

/**
 * map 高阶函数
 * 对数组进行映射操作
 *
 * @param items 原始数组
 * @param fn 映射函数
 * @returns 映射后的数组
 *
 * @example
 * ```typescript
 * const nodes = map([1, 2, 3], (item) => node.llm(`llm-${item}`, { ... }));
 * ```
 */
export function map<T, R>(items: T[], fn: (item: T, index: number) => R): R[] {
  return items.map(fn);
}

/**
 * filter 高阶函数
 * 对数组进行过滤操作
 *
 * @param items 原始数组
 * @param predicate 过滤谓词函数
 * @returns 过滤后的数组
 *
 * @example
 * ```typescript
 * const nodes = filter(allNodes, (node) => node.type === 'llm');
 * ```
 */
export function filter<T>(items: T[], predicate: (item: T, index: number) => boolean): T[] {
  return items.filter(predicate);
}

/**
 * reduce 高阶函数
 * 对数组进行归约操作
 *
 * @param items 原始数组
 * @param initial 初始值
 * @param fn 归约函数
 * @returns 归约结果
 *
 * @example
 * ```typescript
 * const result = reduce(nodes, {} as Record<string, NodeConfig>, (acc, node) => {
 *   if (node.id) acc[node.id] = node;
 *   return acc;
 * });
 * ```
 */
export function reduce<T, R>(
  items: T[],
  initial: R,
  fn: (acc: R, item: T, index: number) => R
): R {
  return items.reduce(fn, initial);
}

/**
 * forEach 高阶函数
 * 对数组中的每个元素执行操作
 *
 * @param items 原始数组
 * @param fn 执行函数
 *
 * @example
 * ```typescript
 * forEach(nodes, (node) => console.log(node.id));
 * ```
 */
export function forEach<T>(items: T[], fn: (item: T, index: number) => void): void {
  items.forEach(fn);
}

/**
 * find 高阶函数
 * 查找数组中满足条件的第一个元素
 *
 * @param items 原始数组
 * @param predicate 查找谓词函数
 * @returns 找到的元素或 undefined
 *
 * @example
 * ```typescript
 * const llmNode = find(nodes, (node) => node.type === 'llm');
 * ```
 */
export function find<T>(items: T[], predicate: (item: T, index: number) => boolean): T | undefined {
  return items.find(predicate);
}

/**
 * some 高阶函数
 * 检查数组中是否有元素满足条件
 *
 * @param items 原始数组
 * @param predicate 检查谓词函数
 * @returns 是否有元素满足条件
 *
 * @example
 * ```typescript
 * const hasLLMNode = some(nodes, (node) => node.type === 'llm');
 * ```
 */
export function some<T>(items: T[], predicate: (item: T, index: number) => boolean): boolean {
  return items.some(predicate);
}

/**
 * every 高阶函数
 * 检查数组中是否所有元素都满足条件
 *
 * @param items 原始数组
 * @param predicate 检查谓词函数
 * @returns 是否所有元素都满足条件
 *
 * @example
 * ```typescript
 * const allHaveIds = every(nodes, (node) => !!node.id);
 * ```
 */
export function every<T>(items: T[], predicate: (item: T, index: number) => boolean): boolean {
  return items.every(predicate);
}

/**
 * groupBy 高阶函数
 * 根据键函数对数组进行分组
 *
 * @param items 原始数组
 * @param keyFn 键函数
 * @returns 分组后的对象
 *
 * @example
 * ```typescript
 * const grouped = groupBy(nodes, (node) => node.type);
 * // 结果: { start: [...], llm: [...], end: [...] }
 * ```
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * sortBy 高阶函数
 * 根据比较函数对数组进行排序
 *
 * @param items 原始数组
 * @param compareFn 比较函数
 * @returns 排序后的数组
 *
 * @example
 * ```typescript
 * const sorted = sortBy(nodes, (a, b) => (a.id || '').localeCompare(b.id || ''));
 * ```
 */
export function sortBy<T>(items: T[], compareFn: (a: T, b: T) => number): T[] {
  return [...items].sort(compareFn);
}

/**
 * chunk 高阶函数
 * 将数组分割成指定大小的块
 *
 * @param items 原始数组
 * @param size 块大小
 * @returns 分割后的数组
 *
 * @example
 * ```typescript
 * const chunks = chunk(nodes, 3);
 * // 结果: [[node1, node2, node3], [node4, node5, node6]]
 * ```
 */
export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/**
 * flatten 高阶函数
 * 将嵌套数组展平
 *
 * @param items 嵌套数组
 * @returns 展平后的数组
 *
 * @example
 * ```typescript
 * const flattened = flatten([[1, 2], [3, 4], [5, 6]]);
 * // 结果: [1, 2, 3, 4, 5, 6]
 * ```
 */
export function flatten<T>(items: T[][]): T[] {
  return items.flat();
}

/**
 * flatMap 高阶函数
 * 先映射再展平
 *
 * @param items 原始数组
 * @param fn 映射函数
 * @returns 展平后的数组
 *
 * @example
 * ```typescript
 * const result = flatMap(nodes, (node) => [node, node]);
 * // 结果: [node1, node1, node2, node2, ...]
 * ```
 */
export function flatMap<T, R>(items: T[], fn: (item: T, index: number) => R[]): R[] {
  return items.flatMap(fn);
}

/**
 * unique 高阶函数
 * 去除数组中的重复元素
 *
 * @param items 原始数组
 * @param keyFn 可选的键函数
 * @returns 去重后的数组
 *
 * @example
 * ```typescript
 * const uniqueNodes = unique(nodes, (node) => node.id);
 * ```
 */
export function unique<T>(items: T[], keyFn?: (item: T) => unknown): T[] {
  if (!keyFn) {
    return [...new Set(items)];
  }
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * partition 高阶函数
 * 根据谓词函数将数组分成两组
 *
 * @param items 原始数组
 * @param predicate 谓词函数
 * @returns 包含两组元素的元组
 *
 * @example
 * ```typescript
 * const [llmNodes, otherNodes] = partition(nodes, (node) => node.type === 'llm');
 * ```
 */
export function partition<T>(
  items: T[],
  predicate: (item: T, index: number) => boolean
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  items.forEach((item, index) => {
    if (predicate(item, index)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  });
  return [truthy, falsy];
}