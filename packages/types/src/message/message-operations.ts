/**
 * 消息操作类型定义
 * 定义所有消息操作的配置和结果类型
 */

import type { Message } from './message';
import type { MessageMarkMap } from './message-mark-map';
import { MessageRole } from './message';

/**
 * 消息操作类型
 */
export type MessageOperationType =
  | 'APPEND'             // 尾插消息（不创建新批次）
  | 'INSERT'             // 中间插入消息（创建新批次）
  | 'REPLACE'            // 替换消息（创建新批次）
  | 'TRUNCATE'           // 截断消息（创建新批次）
  | 'CLEAR'              // 清空消息（创建新批次，快照为空）
  | 'FILTER'             // 过滤消息（创建新批次）
  | 'ROLLBACK'           // 回退到指定批次
  | 'BATCH_MANAGEMENT';  // 批次管理操作

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
  /** 插入后是否开始新批次 */
  createNewBatch?: boolean;
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
  /** 替换后是否开始新批次 */
  createNewBatch?: boolean;
}

/**
 * TRUNCATE 操作配置
 */
export interface TruncateMessageOperation extends MessageOperationConfig {
  operation: 'TRUNCATE';

  /** 截断策略（枚举） */
  strategy:
  | { type: 'KEEP_FIRST'; count: number }
  | { type: 'KEEP_LAST'; count: number }
  | { type: 'REMOVE_FIRST'; count: number }
  | { type: 'REMOVE_LAST'; count: number }
  | { type: 'RANGE'; start: number; end: number };

  /** 角色过滤（在执行截断前先过滤出指定角色的消息） */
  role?: MessageRole;

  /** 截断后是否开始新批次 */
  createNewBatch?: boolean;
}

/**
 * CLEAR 操作配置
 * 注意：SDK 提供的是完全清空的原子操作。
 * 如需保留特定消息（如系统消息），应在应用层用 FILTER 先过滤后再 CLEAR
 */
export interface ClearMessageOperation extends MessageOperationConfig {
  operation: 'CLEAR';
  /** 清空后是否开始新批次 */
  createNewBatch?: boolean;
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
  /** 过滤后是否开始新批次 */
  createNewBatch?: boolean;
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
  /** 操作后的消息数组 */
  messages: Message[];
  /** 操作后的标记映射 */
  markMap: MessageMarkMap;
  /** 操作影响的批次索引 */
  affectedBatchIndex: number;
  /** 操作统计信息 */
  stats: {
    originalMessageCount: number;
    visibleMessageCount: number;
    compressedMessageCount: number;
  };
}