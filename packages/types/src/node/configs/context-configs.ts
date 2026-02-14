/**
 * 上下文处理器节点配置类型定义（批次感知）
 * 用于直接操作提示词消息数组，支持截断、插入、替换、过滤、清空等操作
 */

import type { LLMMessage } from '../../llm';
import type { LLMMessageRole } from '../../llm';

/**
 * 上下文处理器节点配置（批次感知）
 * 用于直接操作提示词消息数组，支持截断、插入、替换、过滤、清空等操作
 */
export interface ContextProcessorNodeConfig {
  /** 配置版本（可选，默认为4） */
  version?: number;
  /** 消息操作配置（批次感知） */
  operationConfig: {
    /** 操作类型 */
    operation: 'TRUNCATE' | 'INSERT' | 'REPLACE' | 'CLEAR' | 'FILTER';
    
    /** 截断操作配置 */
    truncate?: {
      /** 保留前N条可见消息 */
      keepFirst?: number;
      /** 保留后N条可见消息 */
      keepLast?: number;
      /** 删除前N条可见消息 */
      removeFirst?: number;
      /** 删除后N条可见消息 */
      removeLast?: number;
      /** 保留可见消息的索引范围 [start, end) */
      range?: { start: number; end: number };
      /** 按角色过滤后再截断 */
      role?: LLMMessageRole;
      /** 截断后是否开始新批次 */
      createNewBatch?: boolean;
    };

    /** 插入操作配置 */
    insert?: {
      /** 插入位置（相对于可见消息的索引，-1表示末尾） */
      position: number;
      /** 要插入的消息数组 */
      messages: LLMMessage[];
      /** 插入后是否开始新批次 */
      createNewBatch?: boolean;
    };

    /** 替换操作配置 */
    replace?: {
      /** 要替换的可见消息索引 */
      index: number;
      /** 新的消息内容 */
      message: LLMMessage;
      /** 替换后是否开始新批次 */
      createNewBatch?: boolean;
    };

    /** 过滤操作配置 */
    filter?: {
      /** 按角色过滤 */
      roles?: LLMMessageRole[];
      /** 按内容关键词过滤（包含指定关键词的消息） */
      contentContains?: string[];
      /** 按内容关键词排除（不包含指定关键词的消息） */
      contentExcludes?: string[];
      /** 过滤后是否开始新批次 */
      createNewBatch?: boolean;
    };

    /** 清空操作配置 */
    clear?: {
      /** 是否保留系统消息 */
      keepSystemMessage?: boolean;
      /** 是否保留工具描述消息 */
      keepToolDescription?: boolean;
      /** 清空后是否开始新批次 */
      createNewBatch?: boolean;
    };
  };
  /** 操作选项 */
  operationOptions?: {
    /** 是否只操作可见消息 */
    visibleOnly?: boolean;
    /** 是否自动创建新批次 */
    autoCreateBatch?: boolean;
  };
}