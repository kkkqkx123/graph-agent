/**
 * 消息索引工具函数
 * 提供类型索引查询和计算功能
 *
 * 设计说明：
 * - 纯函数，无副作用
 */

import type { LLMMessage } from '@modular-agent/types';
import type { MessageMarkMap } from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';

/**
 * 获取指定角色的消息索引
 * @param messages 消息数组
 * @param role 消息角色
 * @returns 指定角色的消息索引数组
 */
export function getIndicesByRole(messages: LLMMessage[], role: MessageRole): number[] {
  return messages
    .map((msg, index) => (msg.role === role ? index : -1))
    .filter(index => index !== -1);
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
