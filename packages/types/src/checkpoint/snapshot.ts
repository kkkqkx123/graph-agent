/**
 * 线程状态快照类型定义
 */

import type { ID } from '../common';
import { ThreadStatus } from '../thread';
import type { NodeExecutionResult } from '../thread';
import type { TriggerRuntimeState } from '../trigger';
import type { TokenUsageStats } from '../llm';

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
    /** 本地作用域变量值栈 */
    local: Record<string, any>[];
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
    /** 消息数组状态 */
    messageArrayState?: any;
    /** Token使用统计 */
    tokenUsage: TokenUsageStats | null;
    /** 当前请求Token使用 */
    currentRequestUsage: TokenUsageStats | null;
  };
  /** 工具审批状态（用于恢复等待审批的工具调用） */
  toolApprovalState?: {
    /** 当前等待审批的工具调用 */
    pendingToolCall?: {
      /** 工具调用ID */
      id: string;
      /** 工具名称 */
      name: string;
      /** 工具参数 */
      arguments: string;
    };
    /** 交互ID */
    interactionId: string;
    /** 审批超时时间 */
    timeout: number;
  };
  /** 触发器状态快照（用于恢复 TriggerStateManager） */
  triggerStates?: Map<ID, TriggerRuntimeState>;
  /** FORK/JOIN上下文（主从分离模式） */
  forkJoinContext?: {
    forkId: string;
    forkPathId: string;
  };
  /** Triggered子工作流上下文（主从分离模式） */
  triggeredSubworkflowContext?: {
    parentThreadId: ID;
    childThreadIds: ID[];
    triggeredSubworkflowId: ID;
  };
}