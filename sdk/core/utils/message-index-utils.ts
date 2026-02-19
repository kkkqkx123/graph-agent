/**
 * 消息索引工具函数
 * 提供类型索引查询和计算功能
 *
 * 设计说明：
 * - 使用缓存机制优化性能
 * - 缓存基于消息数组的引用和长度
 * - 当消息数组变化时，缓存自动失效
 * - 纯函数，无副作用
 */

import type { LLMMessage } from '@modular-agent/types';
import type { MessageMarkMap } from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';

/**
 * 索引缓存项
 */
interface IndexCacheItem {
  /** 消息数组引用 */
  messagesRef: LLMMessage[];
  /** 消息数组长度 */
  messagesLength: number;
  /** 按角色分组的索引 */
  indicesByRole: Map<MessageRole, number[]>;
  /** 缓存时间戳 */
  timestamp: number;
}

/**
 * 索引缓存
 */
class IndexCache {
  private cache: Map<string, IndexCacheItem> = new Map();
  private maxCacheSize: number = 100;
  private cacheTTL: number = 60000; // 60秒

  /**
   * 生成缓存键
   */
  private generateKey(messages: LLMMessage[]): string {
    return `${messages.length}_${messages.length > 0 ? messages[0]?.role : 'empty'}`;
  }

  /**
   * 获取缓存
   */
  get(messages: LLMMessage[]): Map<MessageRole, number[]> | null {
    const key = this.generateKey(messages);
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查缓存是否过期
    if (Date.now() - item.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    // 检查消息数组是否变化
    if (item.messagesRef !== messages || item.messagesLength !== messages.length) {
      this.cache.delete(key);
      return null;
    }

    return item.indicesByRole;
  }

  /**
   * 设置缓存
   */
  set(messages: LLMMessage[], indicesByRole: Map<MessageRole, number[]>): void {
    const key = this.generateKey(messages);

    // 如果缓存已满，删除最旧的缓存
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      messagesRef: messages,
      messagesLength: messages.length,
      indicesByRole,
      timestamp: Date.now()
    });
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

// 全局索引缓存实例
const indexCache = new IndexCache();

/**
 * 获取指定角色的消息索引（带缓存）
 * @param messages 消息数组
 * @param role 消息角色
 * @returns 指定角色的消息索引数组
 */
export function getIndicesByRole(messages: LLMMessage[], role: MessageRole): number[] {
  // 尝试从缓存获取
  const cachedIndices = indexCache.get(messages);
  if (cachedIndices) {
    const indices = cachedIndices.get(role);
    if (indices) {
      return [...indices]; // 返回副本，避免外部修改
    }
  }

  // 缓存未命中，计算索引
  const indices = messages
    .map((msg, index) => (msg.role === role ? index : -1))
    .filter(index => index !== -1);

  // 更新缓存
  if (!cachedIndices) {
    const indicesByRole = new Map<MessageRole, number[]>();
    indicesByRole.set(role, indices);
    indexCache.set(messages, indicesByRole);
  } else {
    cachedIndices.set(role, indices);
    indexCache.set(messages, cachedIndices);
  }

  return indices;
}

/**
 * 获取指定角色的最近N条消息索引
 * @param messages 消息数组
 * @param role 消息角色
 * @param n 消息数量
 * @returns 指定角色的最近N条消息索引数组
 */
export function getRecentIndicesByRole(messages: LLMMessage[], role: MessageRole, n: number): number[] {
  const indices = getIndicesByRole(messages, role);
  return indices.slice(-n);
}

/**
 * 清空索引缓存
 * 用于在消息数组发生重大变化时手动清空缓存
 */
export function clearIndexCache(): void {
  indexCache.clear();
}

/**
 * 获取指定角色的索引范围
 * @param messages 消息数组
 * @param role 消息角色
 * @param start 起始位置（在类型数组中的位置）
 * @param end 结束位置（在类型数组中的位置）
 * @returns 指定角色的索引范围
 */
export function getRangeIndicesByRole(messages: LLMMessage[], role: MessageRole, start: number, end: number): number[] {
  const indices = getIndicesByRole(messages, role);
  return indices.slice(start, end);
}

/**
 * 获取指定角色的消息数量
 * @param messages 消息数组
 * @param role 消息角色
 * @returns 指定角色的消息数量
 */
export function getCountByRole(messages: LLMMessage[], role: MessageRole): number {
  return messages.filter(msg => msg.role === role).length;
}

/**
 * 获取可见消息中指定角色的索引
 * @param messages 消息数组
 * @param markMap 消息标记映射
 * @param role 消息角色
 * @returns 可见消息中指定角色的索引数组
 */
export function getVisibleIndicesByRole(messages: LLMMessage[], markMap: MessageMarkMap, role: MessageRole): number[] {
  const boundary = markMap.batchBoundaries[markMap.currentBatch];
  if (boundary === undefined) {
    return [];
  }
  return messages
    .map((msg, index) => {
      if (msg.role === role && index >= boundary) {
        return index;
      }
      return -1;
    })
    .filter(index => index !== -1);
}

/**
 * 获取可见消息中指定角色的最近N条消息索引
 * @param messages 消息数组
 * @param markMap 消息标记映射
 * @param role 消息角色
 * @param n 消息数量
 * @returns 可见消息中指定角色的最近N条消息索引数组
 */
export function getVisibleRecentIndicesByRole(messages: LLMMessage[], markMap: MessageMarkMap, role: MessageRole, n: number): number[] {
  const indices = getVisibleIndicesByRole(messages, markMap, role);
  return indices.slice(-n);
}

/**
 * 获取可见消息中指定角色的索引范围
 * @param messages 消息数组
 * @param markMap 消息标记映射
 * @param role 消息角色
 * @param start 起始位置（在类型数组中的位置）
 * @param end 结束位置（在类型数组中的位置）
 * @returns 可见消息中指定角色的索引范围
 */
export function getVisibleRangeIndicesByRole(messages: LLMMessage[], markMap: MessageMarkMap, role: MessageRole, start: number, end: number): number[] {
  const indices = getVisibleIndicesByRole(messages, markMap, role);
  return indices.slice(start, end);
}

/**
 * 获取可见消息中指定角色的消息数量
 * @param messages 消息数组
 * @param markMap 消息标记映射
 * @param role 消息角色
 * @returns 可见消息中指定角色的消息数量
 */
export function getVisibleCountByRole(messages: LLMMessage[], markMap: MessageMarkMap, role: MessageRole): number {
  const boundary = markMap.batchBoundaries[markMap.currentBatch];
  if (boundary === undefined) {
    return 0;
  }
  return messages.filter(msg => msg.role === role && messages.indexOf(msg) >= boundary).length;
}