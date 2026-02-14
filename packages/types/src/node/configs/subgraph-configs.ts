/**
 * 子图节点配置类型定义
 */

import type { ID } from '../../common';
import type { LLMMessageRole } from '../../llm';

/**
 * 子图节点配置
 */
export interface SubgraphNodeConfig {
  /** 子工作流ID */
  subgraphId: ID;
  /** 是否异步执行 */
  async: boolean;
}

/**
 * 从触发器开始的节点配置
 * 专门用于标识由触发器启动的孤立子工作流的起始点
 * 空配置，仅作为标识
 */
export interface StartFromTriggerNodeConfig {
  // 空配置，仅作为标识
}

/**
 * 从触发器继续的节点配置（批次感知）
 * 用于在子工作流执行完成后将数据回调到主工作流
 */
export interface ContinueFromTriggerNodeConfig {
  /** 变量回调配置 */
  variableCallback?: {
    /** 要回传的变量名称列表 */
    includeVariables?: string[];
    /** 是否回传所有变量（默认false） */
    includeAll?: boolean;
  };
  /** 对话历史回调配置（批次感知） */
  conversationHistoryCallback?: {
    /** 操作类型 */
    operation: 'TRUNCATE' | 'FILTER';
    
    /** 截断操作配置 */
    truncate?: {
      /** 回传最后N条可见消息 */
      lastN?: number;
      /** 回传最后N条指定角色的可见消息 */
      lastNByRole?: {
        role: LLMMessageRole;
        count: number;
      };
    };
    
    /** 过滤操作配置 */
    filter?: {
      /** 回传指定角色的所有可见消息 */
      byRole?: LLMMessageRole;
      /** 回传指定范围的可见消息 */
      range?: {
        start: number;
        end: number;
      };
      /** 按内容关键词过滤（包含指定关键词的消息） */
      contentContains?: string[];
      /** 按内容关键词排除（不包含指定关键词的消息） */
      contentExcludes?: string[];
    };
  };
  /** 回调选项 */
  callbackOptions?: {
    /** 是否只回传可见消息 */
    visibleOnly?: boolean;
  };
}