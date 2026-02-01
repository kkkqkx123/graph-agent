/**
 * Checkpoint类型定义
 * 定义检查点的结构和内容
 */

import { ThreadStatus } from './thread';
import type { NodeExecutionResult } from './thread';
import type { ID, Timestamp, Metadata } from './common';
import type { TriggerRuntimeState } from '../core/execution/managers/trigger-state-manager';
import type { MessageMarkMap } from './llm';
import type { TokenUsageStats } from '../core/execution/token-usage-tracker';

/**
 * 线程状态快照类型
 */
export interface ThreadStateSnapshot {
  /** 线程状态 */
  status: ThreadStatus;
  /** 当前节点ID */
  currentNodeId: ID;
  /** 变量数组 */
  variables: any[];
  /** 变量作用域快照（用于恢复运行时状态） */
  variableScopes: {
    /** 全局作用域变量值 */
    global: Record<string, any>;
    /** 线程作用域变量值 */
    thread: Record<string, any>;
    /** 子图作用域变量值栈 */
    subgraph: Record<string, any>[];
    /** 循环作用域变量值栈 */
    loop: Record<string, any>[];
  };
  /** 输入数据 */
  input: Record<string, any>;
  /** 输出数据 */
  output: Record<string, any>;
  /** 节点执行结果映射 */
  nodeResults: Record<string, NodeExecutionResult>;
  /** 错误信息数组 */
  errors: any[];
  /** 对话状态（仅存储索引信息，用于恢复 ConversationManager） */
  conversationState?: {
    /** 消息索引映射 */
    markMap: MessageMarkMap;
    /** Token使用统计 */
    tokenUsage: TokenUsageStats | null;
    /** 当前请求Token使用 */
    currentRequestUsage: TokenUsageStats | null;
  };
  /** 触发器状态快照（用于恢复 TriggerStateManager） */
  triggerStates?: Map<ID, TriggerRuntimeState>;
}

/**
 * 检查点元数据类型
 */
export interface CheckpointMetadata {
  /** 创建者 */
  creator?: string;
  /** 检查点描述 */
  description?: string;
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Metadata;
}

/**
 * 检查点类型
 */
export interface Checkpoint {
  /** 检查点唯一标识符 */
  id: ID;
  /** 关联的线程ID */
  threadId: ID;
  /** 关联的工作流ID */
  workflowId: ID;
  /** 创建时间戳 */
  timestamp: Timestamp;
  /** 线程状态快照 */
  threadState: ThreadStateSnapshot;
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}