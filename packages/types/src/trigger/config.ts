/**
 * 触发器配置类型定义
 */

import type { ID, Metadata } from '../common';
import { EventType } from '../events';
import type { LLMMessageRole } from '../llm';

/**
 * 触发条件接口
 * 由于是事件判断，不需要使用condition类型
 */
export interface TriggerCondition {
  /** 事件类型 */
  eventType: EventType;
  /** 自定义事件名称（仅用于 NODE_CUSTOM_EVENT 事件） */
  eventName?: string;
  /** 条件元数据 */
  metadata?: Metadata;
}

/**
 * 触发动作类型枚举（后续需要重新设计）
 */
export enum TriggerActionType {
  /** 启动工作流 */
  START_WORKFLOW = 'start_workflow',
  /** 停止工作流 */
  STOP_THREAD = 'stop_workflow',
  /** 暂停线程 */
  PAUSE_THREAD = 'pause_thread',
  /** 恢复线程 */
  RESUME_THREAD = 'resume_thread',
  /** 跳过节点 */
  SKIP_NODE = 'skip_node',
  /** 设置变量 */
  SET_VARIABLE = 'set_variable',
  /** 发送通知 */
  SEND_NOTIFICATION = 'send_notification',
  /** 自定义动作 */
  CUSTOM = 'custom',
  /** 执行触发子工作流 */
  EXECUTE_TRIGGERED_SUBGRAPH = 'execute_triggered_subgraph'
}

/**
 * 触发动作接口
 */
export interface TriggerAction {
  /** 动作类型 */
  type: TriggerActionType;
  /** 动作参数 */
  parameters: Record<string, any>;
  /** 动作元数据 */
  metadata?: Metadata;
}

/**
 * 执行触发子工作流动作配置
 * 用于触发器启动孤立的子工作流执行
 */
export interface ExecuteTriggeredSubgraphActionConfig {
  /** 触发子工作流ID（包含 START_FROM_TRIGGER 节点的工作流） */
  triggeredWorkflowId: ID;
  /** 是否等待完成（默认true，同步执行） */
  waitForCompletion?: boolean;
}

/**
 * 对话历史回传配置选项
 * 用于控制从主工作流向触发子工作流传递哪些消息
 */
export interface ConversationHistoryOptions {
  /** 回传最后N条消息 */
  lastN?: number;
  /** 回传最后N条指定角色的消息 */
  lastNByRole?: {
    role: LLMMessageRole;
    count: number;
  };
  /** 回传指定角色的所有消息 */
  byRole?: LLMMessageRole;
  /** 回传指定范围的消息（基于完整消息列表） */
  range?: {
    start: number;
    end: number;
  };
  /** 回传指定范围的指定角色消息 */
  rangeByRole?: {
    role: LLMMessageRole;
    start: number;
    end: number;
  };
}