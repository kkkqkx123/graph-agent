/**
 * 触发器配置类型定义
 */

import type { ID, Metadata } from '../common.js';
import { EventType } from '../events/index.js';
import type { MessageRole } from '../message/index.js';

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
 * 触发动作类型（后续需要重新设计）
 */
export type TriggerActionType =
  /** 启动工作流 */
  'start_workflow' |
  /** 停止工作流 */
  'stop_workflow' |
  /** 停止线程 */
  'stop_thread' |
  /** 暂停线程 */
  'pause_thread' |
  /** 恢复线程 */
  'resume_thread' |
  /** 跳过节点 */
  'skip_node' |
  /** 设置变量 */
  'set_variable' |
  /** 发送通知 */
  'send_notification' |
  /** 自定义动作 */
  'custom' |
  /** 应用消息操作（上下文压缩等） */
  'apply_message_operation' |
  /** 执行触发子工作流 */
  'execute_triggered_subgraph' |
  /** 执行脚本 */
  'execute_script';

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
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否记录历史 */
  recordHistory?: boolean;
}

/**
 * 执行脚本动作配置
 * 用于触发器执行已注册的脚本
 */
export interface ExecuteScriptActionConfig {
  /** 脚本名称（必须在 ScriptService 中已注册） */
  scriptName: string;
  /** 传递给脚本的参数（可在脚本内通过环境变量访问） */
  parameters?: Record<string, any>;
  /** 执行超时时间（毫秒，覆盖脚本默认配置） */
  timeout?: number;
  /** 脚本执行失败时是否忽略错误（不影响触发器执行结果，默认false） */
  ignoreError?: boolean;
  /** 执行前是否验证脚本存在性（默认true） */
  validateExistence?: boolean;
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
    role: MessageRole;
    count: number;
  };
  /** 回传指定角色的所有消息 */
  byRole?: MessageRole;
  /** 回传指定范围的消息（基于完整消息列表） */
  range?: {
    start: number;
    end: number;
  };
  /** 回传指定范围的指定角色消息 */
  rangeByRole?: {
    role: MessageRole;
    start: number;
    end: number;
  };
}