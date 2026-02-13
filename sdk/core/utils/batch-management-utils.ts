/**
 * 批次管理工具函数
 * 负责管理消息的批次，包括创建新批次、回退到历史批次等操作
 * 
 * 所有函数都是纯函数，不持有任何状态
 */

import type { MessageMarkMap } from '@modular-agent/types/llm';
import { ExecutionError } from '@modular-agent/types/errors';

/**
 * 开始新批次
 * @param markMap 消息标记映射
 * @param boundaryIndex 边界索引
 * @returns 更新后的消息标记映射
 * @throws ExecutionError 当边界索引无效时抛出异常
 */
export function startNewBatch(
  markMap: MessageMarkMap,
  boundaryIndex: number
): MessageMarkMap {
  // 验证边界索引
  if (boundaryIndex < 0 || boundaryIndex > markMap.originalIndices.length) {
    throw new ExecutionError(`Invalid boundary index: ${boundaryIndex}. Must be between 0 and ${markMap.originalIndices.length}`);
  }

  // 创建新的标记映射副本
  const newMarkMap: MessageMarkMap = {
    ...markMap,
    originalIndices: [...markMap.originalIndices],
    typeIndices: {
      system: [...markMap.typeIndices.system],
      user: [...markMap.typeIndices.user],
      assistant: [...markMap.typeIndices.assistant],
      tool: [...markMap.typeIndices.tool]
    },
    batchBoundaries: [...markMap.batchBoundaries],
    boundaryToBatch: [...markMap.boundaryToBatch]
  };

  // 添加新边界
  newMarkMap.batchBoundaries.push(boundaryIndex);
  
  // 分配新批次号
  const newBatch = markMap.currentBatch + 1;
  newMarkMap.boundaryToBatch.push(newBatch);
  newMarkMap.currentBatch = newBatch;

  return newMarkMap;
}

/**
 * 回退到指定批次
 * @param markMap 消息标记映射
 * @param targetBatch 目标批次号
 * @returns 更新后的消息标记映射
 * @throws ExecutionError 当目标批次不存在时抛出异常
 */
export function rollbackToBatch(
  markMap: MessageMarkMap,
  targetBatch: number
): MessageMarkMap {
  if (!markMap.boundaryToBatch.includes(targetBatch)) {
    throw new ExecutionError(`Target batch ${targetBatch} not found. Available batches: ${markMap.boundaryToBatch.join(', ')}`);
  }

  const targetBoundaryIndex = markMap.boundaryToBatch.indexOf(targetBatch);
  
  const newMarkMap: MessageMarkMap = {
    ...markMap,
    originalIndices: [...markMap.originalIndices],
    typeIndices: {
      system: [...markMap.typeIndices.system],
      user: [...markMap.typeIndices.user],
      assistant: [...markMap.typeIndices.assistant],
      tool: [...markMap.typeIndices.tool]
    },
    batchBoundaries: markMap.batchBoundaries.slice(0, targetBoundaryIndex + 1),
    boundaryToBatch: markMap.boundaryToBatch.slice(0, targetBoundaryIndex + 1),
    currentBatch: targetBatch
  };

  return newMarkMap;
}

/**
 * 合并批次
 * @param markMap 消息标记映射
 * @param fromBatch 起始批次号
 * @param toBatch 结束批次号
 * @returns 更新后的消息标记映射
 * @throws ExecutionError 当批次不存在或无效时抛出异常
 */
export function mergeBatches(
  markMap: MessageMarkMap,
  fromBatch: number,
  toBatch: number
): MessageMarkMap {
  if (!markMap.boundaryToBatch.includes(fromBatch)) {
    throw new ExecutionError(`Source batch ${fromBatch} not found`);
  }

  if (!markMap.boundaryToBatch.includes(toBatch)) {
    throw new ExecutionError(`Target batch ${toBatch} not found`);
  }

  const fromIndex = markMap.boundaryToBatch.indexOf(fromBatch);
  const toIndex = markMap.boundaryToBatch.indexOf(toBatch);

  if (fromIndex >= toIndex) {
    throw new ExecutionError(`Invalid batch range: fromBatch (${fromBatch}) must be before toBatch (${toBatch})`);
  }

  // 移除中间的批次边界
  const newMarkMap: MessageMarkMap = {
    ...markMap,
    originalIndices: [...markMap.originalIndices],
    typeIndices: {
      system: [...markMap.typeIndices.system],
      user: [...markMap.typeIndices.user],
      assistant: [...markMap.typeIndices.assistant],
      tool: [...markMap.typeIndices.tool]
    },
    batchBoundaries: [
      ...markMap.batchBoundaries.slice(0, fromIndex + 1),
      ...markMap.batchBoundaries.slice(toIndex)
    ],
    boundaryToBatch: [
      ...markMap.boundaryToBatch.slice(0, fromIndex + 1),
      ...markMap.boundaryToBatch.slice(toIndex)
    ],
    currentBatch: markMap.currentBatch
  };

  return newMarkMap;
}

/**
 * 获取批次信息
 * @param markMap 消息标记映射
 * @param batchId 批次号
 * @returns 批次信息，包含边界索引和可见消息数量
 * @throws ExecutionError 当批次不存在时抛出异常
 */
export function getBatchInfo(
  markMap: MessageMarkMap,
  batchId: number
): {
  boundaryIndex: number;
  visibleMessageCount: number;
  isCurrentBatch: boolean;
} {
  if (!markMap.boundaryToBatch.includes(batchId)) {
    throw new ExecutionError(`Batch ${batchId} not found`);
  }

  const boundaryIndex = markMap.batchBoundaries[batchId];
  if (boundaryIndex === undefined) {
    throw new ExecutionError(`Boundary index for batch ${batchId} is undefined`);
  }
  
  const visibleMessageCount = markMap.originalIndices.filter(
    index => index >= boundaryIndex
  ).length;
  const isCurrentBatch = batchId === markMap.currentBatch;

  return {
    boundaryIndex,
    visibleMessageCount,
    isCurrentBatch
  };
}

/**
 * 获取所有批次信息
 * @param markMap 消息标记映射
 * @returns 所有批次信息的数组
 */
export function getAllBatchesInfo(markMap: MessageMarkMap): Array<{
  batchId: number;
  boundaryIndex: number;
  visibleMessageCount: number;
  isCurrentBatch: boolean;
}> {
  return markMap.boundaryToBatch.map(batchId => {
    const boundaryIndex = markMap.batchBoundaries[batchId];
    if (boundaryIndex === undefined) {
      throw new ExecutionError(`Boundary index for batch ${batchId} is undefined`);
    }
    
    const visibleMessageCount = markMap.originalIndices.filter(
      index => index >= boundaryIndex
    ).length;
    const isCurrentBatch = batchId === markMap.currentBatch;

    return {
      batchId,
      boundaryIndex,
      visibleMessageCount,
      isCurrentBatch
    };
  });
}