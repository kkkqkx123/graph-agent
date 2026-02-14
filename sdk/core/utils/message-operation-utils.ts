/**
 * 统一消息操作工具函数（批次感知）
 * 提供统一的消息操作接口，支持可见范围和批次管理
 * 
 * 所有函数都是纯函数，不持有任何状态
 */

import type {
  MessageOperationContext,
  MessageOperationConfig,
  MessageOperationResult,
  TruncateMessageOperation,
  InsertMessageOperation,
  ReplaceMessageOperation,
  ClearMessageOperation,
  FilterMessageOperation,
  BatchManagementOperation,
  LLMMessage,
  MessageMarkMap
} from '@modular-agent/types';
import { getCurrentBoundary, getVisibleOriginalIndices, visibleIndexToOriginal, getVisibleMessages } from './visible-range-calculator';
import { startNewBatch } from './batch-management-utils';
import { MessageArrayUtils } from './message-array-utils';

/**
 * 执行消息操作
 * @param context 消息操作上下文
 * @param operation 操作配置
 * @returns 操作结果
 */
export function executeOperation(
  context: MessageOperationContext,
  operation: MessageOperationConfig
): MessageOperationResult {
  const { messages, markMap, options = {} } = context;
  const visibleOnly = options.visibleOnly ?? true;

  switch (operation.operation) {
    case 'TRUNCATE':
      return executeTruncateOperation(messages, markMap, operation as TruncateMessageOperation, visibleOnly);
    case 'INSERT':
      return executeInsertOperation(messages, markMap, operation as InsertMessageOperation, visibleOnly);
    case 'REPLACE':
      return executeReplaceOperation(messages, markMap, operation as ReplaceMessageOperation, visibleOnly);
    case 'CLEAR':
      return executeClearOperation(messages, markMap, operation as ClearMessageOperation, visibleOnly);
    case 'FILTER':
      return executeFilterOperation(messages, markMap, operation as FilterMessageOperation, visibleOnly);
    case 'BATCH_MANAGEMENT':
      return executeBatchManagementOperation(messages, markMap, operation as BatchManagementOperation);
    default:
      throw new Error(`Unsupported operation type: ${(operation as any).operation}`);
  }
}

/**
 * 执行截断操作
 */
function executeTruncateOperation(
  messages: LLMMessage[],
  markMap: MessageMarkMap,
  operation: TruncateMessageOperation,
  visibleOnly: boolean
): MessageOperationResult {
  let workingMessages = messages;
  let workingMarkMap = markMap;
  let affectedVisibleIndices: number[] = [];
  
  // 如果只操作可见消息，先获取可见消息
  if (visibleOnly) {
    const visibleIndices = getVisibleOriginalIndices(markMap);
    const visibleMessages = visibleIndices
      .map(idx => messages[idx])
      .filter((msg): msg is LLMMessage => msg !== undefined);
    
    // 执行截断操作
    const truncateOptions = convertStrategyToOptions(operation.strategy);
    const truncatedMessages = MessageArrayUtils.truncateMessages(visibleMessages, {
      ...truncateOptions,
      role: operation.role
    });
    
    // 计算需要保留的原始索引
    const keptVisibleIndices = getKeptVisibleIndices(visibleMessages, truncatedMessages);
    const keptOriginalIndices = keptVisibleIndices
      .map(idx => visibleIndices[idx])
      .filter((idx): idx is number => idx !== undefined);
    
    // 记录受影响的索引
    affectedVisibleIndices = visibleIndices.filter(idx => !keptOriginalIndices.includes(idx));
    
    // 更新标记映射，只保留需要的消息
    workingMarkMap = updateMarkMapForKeptIndices(markMap, keptOriginalIndices);
    
    // 重建完整消息数组（保持原始顺序）
    workingMessages = rebuildMessagesArray(messages, keptOriginalIndices);
  } else {
    // 操作完整消息数组
    const truncateOptions = convertStrategyToOptions(operation.strategy);
    workingMessages = MessageArrayUtils.truncateMessages(messages, {
      ...truncateOptions,
      role: operation.role
    });
    
    // 重建标记映射
    workingMarkMap = rebuildMarkMap(workingMessages);
  }
  
  // 如果需要创建新批次
  if (operation.createNewBatch) {
    const boundaryIndex = workingMessages.length;
    workingMarkMap = startNewBatch(workingMarkMap, boundaryIndex);
  }
  
  return {
    messages: workingMessages,
    markMap: workingMarkMap,
    affectedBatchIndex: workingMarkMap.currentBatch,
    stats: calculateStats(workingMessages, workingMarkMap)
  };
}

/**
 * 执行插入操作
 */
function executeInsertOperation(
  messages: LLMMessage[],
  markMap: MessageMarkMap,
  operation: InsertMessageOperation,
  visibleOnly: boolean
): MessageOperationResult {
  let workingMessages = [...messages];
  let workingMarkMap = { ...markMap };
  let affectedVisibleIndices: number[] = [];
  
  if (visibleOnly && operation.position !== -1) {
    // 将可见位置转换为原始位置
    const visibleIndices = getVisibleOriginalIndices(markMap);
    if (operation.position >= 0 && operation.position <= visibleIndices.length) {
      let insertAtOriginalIndex: number;
      if (operation.position === visibleIndices.length) {
        insertAtOriginalIndex = visibleIndices.length > 0 
          ? ((visibleIndices[visibleIndices.length - 1] ?? 0) + 1) 
          : 0;
      } else {
        const idx = visibleIndices[operation.position];
        if (idx === undefined) {
          throw new Error(`Visible index at position ${operation.position} is undefined`);
        }
        insertAtOriginalIndex = idx;
      }
      
      // 在原始位置插入消息
      workingMessages.splice(insertAtOriginalIndex, 0, ...operation.messages);
      
      // 记录受影响的索引
      affectedVisibleIndices = Array.from({ length: operation.messages.length }, (_, i) => insertAtOriginalIndex + i);
      
      // 更新标记映射
      workingMarkMap = updateMarkMapAfterInsert(
        markMap, 
        insertAtOriginalIndex, 
        operation.messages.length,
        workingMessages
      );
    }
  } else {
    // 在末尾插入或操作完整数组
    const insertPosition = operation.position === -1 ? workingMessages.length : operation.position;
    workingMessages.splice(insertPosition, 0, ...operation.messages);
    
    // 记录受影响的索引
    affectedVisibleIndices = Array.from({ length: operation.messages.length }, (_, i) => insertPosition + i);
    
    workingMarkMap = updateMarkMapAfterInsert(markMap, insertPosition, operation.messages.length, workingMessages);
  }
  
  // 如果需要创建新批次
  if (operation.createNewBatch) {
    const boundaryIndex = workingMessages.length;
    workingMarkMap = startNewBatch(workingMarkMap, boundaryIndex);
  }
  
  return {
    messages: workingMessages,
    markMap: workingMarkMap,
    affectedBatchIndex: workingMarkMap.currentBatch,
    stats: calculateStats(workingMessages, workingMarkMap)
  };
}

/**
 * 执行替换操作
 */
function executeReplaceOperation(
  messages: LLMMessage[],
  markMap: MessageMarkMap,
  operation: ReplaceMessageOperation,
  visibleOnly: boolean
): MessageOperationResult {
  let workingMessages = [...messages];
  let workingMarkMap = { ...markMap };
  let affectedVisibleIndices: number[] = [];
  
  if (visibleOnly) {
    // 将可见索引转换为原始索引
    const originalIndex = visibleIndexToOriginal(operation.index, markMap);
    workingMessages[originalIndex] = operation.message;
    affectedVisibleIndices = [originalIndex];
  } else {
    // 直接替换
    if (operation.index < 0 || operation.index >= workingMessages.length) {
      throw new Error(`Index ${operation.index} is out of bounds`);
    }
    workingMessages[operation.index] = operation.message;
    affectedVisibleIndices = [operation.index];
  }
  
  // 如果需要创建新批次
  if (operation.createNewBatch) {
    const boundaryIndex = workingMessages.length;
    workingMarkMap = startNewBatch(workingMarkMap, boundaryIndex);
  }
  
  return {
    messages: workingMessages,
    markMap: workingMarkMap,
    affectedBatchIndex: workingMarkMap.currentBatch,
    stats: calculateStats(workingMessages, workingMarkMap)
  };
}

/**
 * 执行清空操作
 */
function executeClearOperation(
  messages: LLMMessage[],
  markMap: MessageMarkMap,
  operation: ClearMessageOperation,
  visibleOnly: boolean
): MessageOperationResult {
  let workingMessages: LLMMessage[];
  let workingMarkMap = { ...markMap };
  let affectedVisibleIndices: number[] = [];
  
  const keepSystemMessage = operation.keepSystemMessage ?? true;
  const keepToolDescription = operation.keepToolDescription ?? false;
  
  if (visibleOnly) {
    // 只清空可见消息
    const visibleIndices = getVisibleOriginalIndices(markMap);
    const visibleMessages = visibleIndices
      .map(idx => messages[idx])
      .filter((msg): msg is LLMMessage => msg !== undefined);
    
    let clearedMessages = visibleMessages;
    if (keepSystemMessage) {
      clearedMessages = MessageArrayUtils.clearMessages(visibleMessages, true);
    } else {
      clearedMessages = [];
    }
    
    // 记录受影响的索引
    affectedVisibleIndices = visibleIndices.filter(idx => {
      const msg = messages[idx];
      if (keepSystemMessage && msg && msg.role === 'system') {
        return false;
      }
      return true;
    });
    
    // 重建消息数组
    const keptIndices = clearedMessages
      .map(msg => messages.indexOf(msg))
      .filter((idx): idx is number => idx !== -1);
    workingMessages = rebuildMessagesArray(messages, keptIndices);
    workingMarkMap = updateMarkMapForKeptIndices(markMap, keptIndices);
  } else {
    // 清空所有消息
    workingMessages = MessageArrayUtils.clearMessages(messages, keepSystemMessage);
    workingMarkMap = rebuildMarkMap(workingMessages);
    affectedVisibleIndices = markMap.originalIndices.filter(idx => {
      const msg = messages[idx];
      if (keepSystemMessage && msg && msg.role === 'system') {
        return false;
      }
      return true;
    });
  }
  
  // 如果需要创建新批次
  if (operation.createNewBatch) {
    const boundaryIndex = workingMessages.length;
    workingMarkMap = startNewBatch(workingMarkMap, boundaryIndex);
  }
  
  return {
    messages: workingMessages,
    markMap: workingMarkMap,
    affectedBatchIndex: workingMarkMap.currentBatch,
    stats: calculateStats(workingMessages, workingMarkMap)
  };
}

/**
 * 执行过滤操作
 */
function executeFilterOperation(
  messages: LLMMessage[],
  markMap: MessageMarkMap,
  operation: FilterMessageOperation,
  visibleOnly: boolean
): MessageOperationResult {
  let workingMessages: LLMMessage[];
  let workingMarkMap = { ...markMap };
  let affectedVisibleIndices: number[] = [];
  
  if (visibleOnly) {
    // 只过滤可见消息
    const visibleIndices = getVisibleOriginalIndices(markMap);
    const visibleMessages = visibleIndices
      .map(idx => messages[idx])
      .filter((msg): msg is LLMMessage => msg !== undefined);
    
    let filteredMessages = visibleMessages;
    
    // 按角色过滤
    if (operation.roles && operation.roles.length > 0) {
      filteredMessages = MessageArrayUtils.filterMessagesByRole(filteredMessages, operation.roles);
    }
    
    // 按内容关键词过滤
    if (operation.contentContains || operation.contentExcludes) {
      filteredMessages = MessageArrayUtils.filterMessagesByContent(filteredMessages, {
        contains: operation.contentContains,
        excludes: operation.contentExcludes
      });
    }
    
    // 记录受影响的索引
    const keptMessages = new Set(filteredMessages);
    affectedVisibleIndices = visibleIndices.filter(idx => {
      const msg = messages[idx];
      return msg !== undefined && !keptMessages.has(msg);
    });
    
    // 重建消息数组
    const keptIndices = filteredMessages
      .map(msg => messages.indexOf(msg))
      .filter((idx): idx is number => idx !== -1);
    workingMessages = rebuildMessagesArray(messages, keptIndices);
    workingMarkMap = updateMarkMapForKeptIndices(markMap, keptIndices);
  } else {
    // 过滤所有消息
    workingMessages = messages;
    
    // 按角色过滤
    if (operation.roles && operation.roles.length > 0) {
      workingMessages = MessageArrayUtils.filterMessagesByRole(workingMessages, operation.roles);
    }
    
    // 按内容关键词过滤
    if (operation.contentContains || operation.contentExcludes) {
      workingMessages = MessageArrayUtils.filterMessagesByContent(workingMessages, {
        contains: operation.contentContains,
        excludes: operation.contentExcludes
      });
    }
    
    workingMarkMap = rebuildMarkMap(workingMessages);
    affectedVisibleIndices = markMap.originalIndices.filter(idx => {
      const msg = messages[idx];
      return msg !== undefined && !workingMessages.includes(msg);
    });
  }
  
  // 如果需要创建新批次
  if (operation.createNewBatch) {
    const boundaryIndex = workingMessages.length;
    workingMarkMap = startNewBatch(workingMarkMap, boundaryIndex);
  }
  
  return {
    messages: workingMessages,
    markMap: workingMarkMap,
    affectedBatchIndex: workingMarkMap.currentBatch,
    stats: calculateStats(workingMessages, workingMarkMap)
  };
}

/**
 * 执行批次管理操作
 */
function executeBatchManagementOperation(
  messages: LLMMessage[],
  markMap: MessageMarkMap,
  operation: BatchManagementOperation
): MessageOperationResult {
  let workingMarkMap = { ...markMap };
  
  switch (operation.batchOperation) {
    case 'START_NEW_BATCH':
      if (operation.boundaryIndex === undefined) {
        throw new Error('boundaryIndex is required for START_NEW_BATCH operation');
      }
      workingMarkMap = startNewBatch(workingMarkMap, operation.boundaryIndex);
      break;
      
    case 'ROLLBACK_TO_BATCH':
      if (operation.targetBatch === undefined) {
        throw new Error('targetBatch is required for ROLLBACK_TO_BATCH operation');
      }
      const { rollbackToBatch } = require('./batch-management-utils');
      workingMarkMap = rollbackToBatch(workingMarkMap, operation.targetBatch);
      break;
      
    default:
      throw new Error(`Unsupported batch operation: ${operation.batchOperation}`);
  }
  
  return {
    messages,
    markMap: workingMarkMap,
    affectedBatchIndex: workingMarkMap.currentBatch,
    stats: calculateStats(messages, workingMarkMap)
  };
}

/**
 * 获取保留的可见索引
 */
function getKeptVisibleIndices(
  originalMessages: LLMMessage[],
  keptMessages: LLMMessage[]
): number[] {
  const keptSet = new Set(keptMessages);
  return originalMessages
    .map((msg, idx) => keptSet.has(msg) ? idx : -1)
    .filter(idx => idx !== -1);
}

/**
 * 更新标记映射以反映保留的索引
 */
function updateMarkMapForKeptIndices(
  markMap: MessageMarkMap,
  keptIndices: number[]
): MessageMarkMap {
  const newMarkMap: MessageMarkMap = {
    ...markMap,
    originalIndices: [...keptIndices],
    typeIndices: {
      system: [],
      user: [],
      assistant: [],
      tool: []
    },
    batchBoundaries: [...markMap.batchBoundaries],
    boundaryToBatch: [...markMap.boundaryToBatch]
  };
  
  // 重新计算类型索引
  keptIndices.forEach(originalIndex => {
    const role = markMap.typeIndices.system.includes(originalIndex) ? 'system' :
                 markMap.typeIndices.user.includes(originalIndex) ? 'user' :
                 markMap.typeIndices.assistant.includes(originalIndex) ? 'assistant' : 'tool';
    newMarkMap.typeIndices[role].push(originalIndex);
  });
  
  return newMarkMap;
}

/**
 * 更新标记映射以反映插入操作
 */
function updateMarkMapAfterInsert(
  markMap: MessageMarkMap,
  insertIndex: number,
  insertCount: number,
  messages: LLMMessage[]
): MessageMarkMap {
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
  
  // 更新原始索引
  newMarkMap.originalIndices = newMarkMap.originalIndices.map(idx => 
    idx >= insertIndex ? idx + insertCount : idx
  );
  newMarkMap.originalIndices.push(...Array.from({ length: insertCount }, (_, i) => insertIndex + i));
  
  // 更新批次边界
  newMarkMap.batchBoundaries = newMarkMap.batchBoundaries.map(boundary => 
    boundary >= insertIndex ? boundary + insertCount : boundary
  );
  
  // 更新类型索引
  newMarkMap.typeIndices = recalculateTypeIndices(newMarkMap.originalIndices, messages);
  
  return newMarkMap;
}

/**
 * 重建消息数组
 */
function rebuildMessagesArray(
  originalMessages: LLMMessage[],
  keptIndices: number[]
): LLMMessage[] {
  return keptIndices
    .map(idx => originalMessages[idx])
    .filter((msg): msg is LLMMessage => msg !== undefined);
}

/**
 * 重建标记映射
 */
function rebuildMarkMap(messages: LLMMessage[]): MessageMarkMap {
  const originalIndices = messages.map((_, idx) => idx);
  const typeIndices = {
    system: [] as number[],
    user: [] as number[],
    assistant: [] as number[],
    tool: [] as number[]
  };
  
  messages.forEach((msg, idx) => {
    typeIndices[msg.role].push(idx);
  });
  
  return {
    originalIndices,
    typeIndices,
    batchBoundaries: [0],
    boundaryToBatch: [0],
    currentBatch: 0
  };
}

/**
 * 重新计算类型索引
 */
function recalculateTypeIndices(
  originalIndices: number[],
  messages: LLMMessage[]
): {
  system: number[];
  user: number[];
  assistant: number[];
  tool: number[];
} {
  const typeIndices = {
    system: [] as number[],
    user: [] as number[],
    assistant: [] as number[],
    tool: [] as number[]
  };
  
  originalIndices.forEach(idx => {
    if (idx < messages.length) {
      const msg = messages[idx];
      if (msg) {
        typeIndices[msg.role].push(idx);
      }
    }
  });
  
  return typeIndices;
}

/**
 * 计算操作统计信息
 */
function calculateStats(messages: LLMMessage[], markMap: MessageMarkMap): {
  originalMessageCount: number;
  visibleMessageCount: number;
  compressedMessageCount: number;
} {
  const totalMessages = messages.length;
  const visibleMessageCount = getVisibleOriginalIndices(markMap).length;
  const compressedMessageCount = totalMessages - visibleMessageCount;
  
  return {
    originalMessageCount: totalMessages,
    visibleMessageCount,
    compressedMessageCount
  };
}

/**
 * 将截断策略转换为选项
 */
function convertStrategyToOptions(
  strategy: TruncateMessageOperation['strategy']
): Record<string, number | { start: number; end: number }> {
  switch (strategy.type) {
    case 'KEEP_FIRST':
      return { keepFirst: strategy.count };
    case 'KEEP_LAST':
      return { keepLast: strategy.count };
    case 'REMOVE_FIRST':
      return { removeFirst: strategy.count };
    case 'REMOVE_LAST':
      return { removeLast: strategy.count };
    case 'RANGE':
      return { range: { start: strategy.start, end: strategy.end } };
    default:
      throw new Error(`Unsupported strategy type: ${(strategy as any).type}`);
  }
}