/**
 * 可见范围计算器
 * 负责计算当前批次的消息可见范围，提供索引转换功能
 *
 * 核心概念：
 * - 可见消息：当前批次边界之后的消息，会被发送给LLM
 * - 不可见消息：当前批次边界之前的消息，仅存储但不发送给LLM
 * - 批次边界：通过 startNewBatch() 设置，控制消息可见性
 *
 * 所有函数都是纯函数，不持有任何状态
 */

import type { LLMMessage } from '@modular-agent/types';
import type { MessageMarkMap } from '@modular-agent/types';

/**
 * 获取当前批次的边界索引
 * @param markMap 消息标记映射
 * @returns 当前批次的边界索引
 * @throws Error 当当前批次不存在时抛出异常
 */
export function getCurrentBoundary(markMap: MessageMarkMap): number {
  const boundary = markMap.batchBoundaries[markMap.currentBatch];
  if (boundary === undefined) {
    throw new Error(`Current batch ${markMap.currentBatch} not found in batch boundaries`);
  }
  return boundary;
}

/**
 * 获取可见消息的原始索引
 * @param markMap 消息标记映射
 * @returns 可见消息的原始索引数组
 */
export function getVisibleOriginalIndices(markMap: MessageMarkMap): number[] {
  const boundary = getCurrentBoundary(markMap);
  return markMap.originalIndices.filter(index => index >= boundary);
}

/**
 * 将可见索引转换为原始索引
 * @param visibleIndex 可见消息索引
 * @param markMap 消息标记映射
 * @returns 原始消息索引
 * @throws Error 当可见索引越界时抛出异常
 */
export function visibleIndexToOriginal(
  visibleIndex: number, 
  markMap: MessageMarkMap
): number {
  const visibleIndices = getVisibleOriginalIndices(markMap);
  if (visibleIndex < 0 || visibleIndex >= visibleIndices.length) {
    throw new Error(`Visible index ${visibleIndex} out of bounds. Visible messages count: ${visibleIndices.length}`);
  }
  const originalIndex = visibleIndices[visibleIndex];
  if (originalIndex === undefined) {
    throw new Error(`Original index at visible position ${visibleIndex} is undefined`);
  }
  return originalIndex;
}

/**
 * 将原始索引转换为可见索引
 * @param originalIndex 原始消息索引
 * @param markMap 消息标记映射
 * @returns 可见消息索引，如果消息不可见则返回 null
 */
export function originalIndexToVisible(
  originalIndex: number,
  markMap: MessageMarkMap
): number | null {
  const boundary = getCurrentBoundary(markMap);
  if (originalIndex < boundary) {
    return null; // 已压缩，不可见
  }
  
  const visibleIndices = getVisibleOriginalIndices(markMap);
  const visibleIndex = visibleIndices.indexOf(originalIndex);
  return visibleIndex === -1 ? null : visibleIndex;
}

/**
 * 获取可见消息
 * @param messages 完整消息数组
 * @param markMap 消息标记映射
 * @returns 可见消息数组
 */
export function getVisibleMessages(
  messages: LLMMessage[],
  markMap: MessageMarkMap
): LLMMessage[] {
  const visibleIndices = getVisibleOriginalIndices(markMap);
  return visibleIndices
    .map(index => messages[index])
    .filter((msg): msg is LLMMessage => msg !== undefined);
}

/**
 * 获取不可见消息（批次边界之前的消息）
 * @param messages 完整消息数组
 * @param markMap 消息标记映射
 * @returns 不可见消息数组
 */
export function getInvisibleMessages(
  messages: LLMMessage[],
  markMap: MessageMarkMap
): LLMMessage[] {
  const boundary = getCurrentBoundary(markMap);
  const invisibleIndices = markMap.originalIndices.filter(index => index < boundary);
  return invisibleIndices
    .map(index => messages[index])
    .filter((msg): msg is LLMMessage => msg !== undefined);
}

/**
 * 检查消息是否可见（在当前批次边界之后）
 * @param originalIndex 原始消息索引
 * @param markMap 消息标记映射
 * @returns 如果消息可见返回 true，否则返回 false
 */
export function isMessageVisible(
  originalIndex: number,
  markMap: MessageMarkMap
): boolean {
  return originalIndexToVisible(originalIndex, markMap) !== null;
}

/**
 * 获取可见消息数量
 * @param markMap 消息标记映射
 * @returns 可见消息数量
 */
export function getVisibleMessageCount(markMap: MessageMarkMap): number {
  return getVisibleOriginalIndices(markMap).length;
}

/**
 * 获取不可见消息数量（批次边界之前的消息数量）
 * @param markMap 消息标记映射
 * @returns 不可见消息数量
 */
export function getInvisibleMessageCount(markMap: MessageMarkMap): number {
  const boundary = getCurrentBoundary(markMap);
  return markMap.originalIndices.filter(index => index < boundary).length;
}