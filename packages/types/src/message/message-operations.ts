/**
 * 消息操作类型定义
 * 定义所有消息操作的配置和结果类型
 */

import type { Message } from './message';
import type { MessageArrayState, MessageArrayStats } from './message-array';

/**
 * 消息操作类型
 */
export type MessageOperationType = 
  | 'APPEND'      // 尾插消息（不创建新批次）
  | 'INSERT'      // 中间插入消息（创建新批次）
  | 'REPLACE'     // 替换消息（创建新批次）
  | 'TRUNCATE'    // 截断消息（创建新批次）
  | 'CLEAR'       // 清空消息（创建新批次，快照为空）
  | 'FILTER'      // 过滤消息（创建新批次）
  | 'ROLLBACK';   // 回退到指定批次

/**
 * 消息操作配置基础接口
 */
export interface MessageOperationConfig {
  /** 操作类型 */
  operation: MessageOperationType;
}

/**
 * APPEND 操作配置
 */
export interface AppendMessageOperation extends MessageOperationConfig {
  operation: 'APPEND';
  /** 要追加的消息数组 */
  messages: Message[];
}

/**
 * INSERT 操作配置
 */
export interface InsertMessageOperation extends MessageOperationConfig {
  operation: 'INSERT';
  /** 插入位置（相对于当前批次，0 <= position <= currentBatchMessages.length） */
  position: number;
  /** 要插入的消息数组 */
  messages: Message[];
}

/**
 * REPLACE 操作配置
 */
export interface ReplaceMessageOperation extends MessageOperationConfig {
  operation: 'REPLACE';
  /** 要替换的消息索引（相对于当前批次） */
  index: number;
  /** 新的消息内容 */
  message: Message;
}

/**
 * TRUNCATE 操作配置
 */
export interface TruncateMessageOperation extends MessageOperationConfig {
  operation: 'TRUNCATE';
  /** 保留前N条消息 */
  keepFirst?: number;
  /** 保留后N条消息 */
  keepLast?: number;
  /** 删除前N条消息 */
  removeFirst?: number;
  /** 删除后N条消息 */
  removeLast?: number;
  /** 保留消息的索引范围 [start, end) */
  range?: { start: number; end: number };
  /** 按角色过滤后再截断 */
  role?: Message['role'];
}

/**
 * CLEAR 操作配置
 */
export interface ClearMessageOperation extends MessageOperationConfig {
  operation: 'CLEAR';
  /** 是否保留系统消息 */
  keepSystemMessage?: boolean;
}

/**
 * FILTER 操作配置
 */
export interface FilterMessageOperation extends MessageOperationConfig {
  operation: 'FILTER';
  /** 按角色过滤 */
  roles?: Message['role'][];
  /** 按内容关键词过滤（包含指定关键词的消息） */
  contentContains?: string[];
  /** 按内容关键词排除（不包含指定关键词的消息） */
  contentExcludes?: string[];
}

/**
 * ROLLBACK 操作配置
 */
export interface RollbackMessageOperation extends MessageOperationConfig {
  operation: 'ROLLBACK';
  /** 目标批次索引 */
  targetBatchIndex: number;
}

/**
 * 消息操作结果
 */
export interface MessageOperationResult {
  /** 操作后的消息数组状态 */
  state: MessageArrayState;
  /** 操作影响的批次索引 */
  affectedBatchIndex: number;
  /** 操作统计信息 */
  stats: MessageArrayStats;
}