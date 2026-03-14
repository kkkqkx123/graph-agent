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
 * 触发动作类型
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

// ============================================================================
// 各动作类型的参数定义
// ============================================================================

/**
 * 启动工作流动作参数
 */
export interface StartWorkflowActionParameters {
  /** 工作流ID */
  workflowId: ID;
  /** 输入参数 */
  input?: Record<string, any>;
  /** 是否等待完成 */
  waitForCompletion?: boolean;
}

/**
 * 停止工作流动作参数
 */
export interface StopWorkflowActionParameters {
  /** 工作流ID */
  workflowId: ID;
  /** 是否强制停止 */
  force?: boolean;
}

/**
 * 停止线程动作参数
 */
export interface StopThreadActionParameters {
  /** 线程ID */
  threadId: ID;
  /** 是否强制停止 */
  force?: boolean;
}

/**
 * 暂停线程动作参数
 */
export interface PauseThreadActionParameters {
  /** 线程ID */
  threadId: ID;
  /** 暂停原因 */
  reason?: string;
}

/**
 * 恢复线程动作参数
 */
export interface ResumeThreadActionParameters {
  /** 线程ID */
  threadId: ID;
}

/**
 * 跳过节点动作参数
 */
export interface SkipNodeActionParameters {
  /** 线程ID */
  threadId: ID;
  /** 节点ID */
  nodeId: ID;
}

/**
 * 设置变量动作参数
 */
export interface SetVariableActionParameters {
  /** 线程ID */
  threadId: ID;
  /** 变量键值对 */
  variables: Record<string, any>;
  /** 变量作用域 */
  scope?: 'global' | 'thread' | 'local' | 'loop';
}

/**
 * 发送通知动作参数
 */
export interface SendNotificationActionParameters {
  /** 通知消息 */
  message: string;
  /** 接收者列表 */
  recipients?: string[];
  /** 通知级别 */
  level?: 'info' | 'warning' | 'error' | 'success';
  /** 通知渠道 */
  channel?: 'email' | 'sms' | 'push' | 'webhook' | 'in_app';
}

/**
 * 自定义动作参数
 */
export interface CustomActionParameters {
  /** 自定义处理器名称 */
  handlerName: string;
  /** 自定义参数 */
  data?: Record<string, any>;
}

/**
 * 应用消息操作动作参数
 */
export interface ApplyMessageOperationActionParameters {
  /** 线程ID */
  threadId: ID;
  /** 操作类型 */
  operationType: 'compress' | 'truncate' | 'summarize' | 'mark' | 'unmark';
  /** 操作配置 */
  config?: Record<string, any>;
}

/**
 * 执行脚本动作参数
 */
export interface ExecuteScriptActionParameters {
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

// ============================================================================
// 触发动作可辨识联合类型
// ============================================================================

/**
 * 触发动作基接口
 */
interface BaseTriggerAction {
  /** 动作元数据 */
  metadata?: Metadata;
}

/**
 * 启动工作流动作
 */
export interface StartWorkflowAction extends BaseTriggerAction {
  type: 'start_workflow';
  parameters: StartWorkflowActionParameters;
}

/**
 * 停止工作流动作
 */
export interface StopWorkflowAction extends BaseTriggerAction {
  type: 'stop_workflow';
  parameters: StopWorkflowActionParameters;
}

/**
 * 停止线程动作
 */
export interface StopThreadAction extends BaseTriggerAction {
  type: 'stop_thread';
  parameters: StopThreadActionParameters;
}

/**
 * 暂停线程动作
 */
export interface PauseThreadAction extends BaseTriggerAction {
  type: 'pause_thread';
  parameters: PauseThreadActionParameters;
}

/**
 * 恢复线程动作
 */
export interface ResumeThreadAction extends BaseTriggerAction {
  type: 'resume_thread';
  parameters: ResumeThreadActionParameters;
}

/**
 * 跳过节点动作
 */
export interface SkipNodeAction extends BaseTriggerAction {
  type: 'skip_node';
  parameters: SkipNodeActionParameters;
}

/**
 * 设置变量动作
 */
export interface SetVariableAction extends BaseTriggerAction {
  type: 'set_variable';
  parameters: SetVariableActionParameters;
}

/**
 * 发送通知动作
 */
export interface SendNotificationAction extends BaseTriggerAction {
  type: 'send_notification';
  parameters: SendNotificationActionParameters;
}

/**
 * 自定义动作
 */
export interface CustomAction extends BaseTriggerAction {
  type: 'custom';
  parameters: CustomActionParameters;
}

/**
 * 应用消息操作动作
 */
export interface ApplyMessageOperationAction extends BaseTriggerAction {
  type: 'apply_message_operation';
  parameters: ApplyMessageOperationActionParameters;
}

/**
 * 执行触发子工作流动作
 */
export interface ExecuteTriggeredSubgraphAction extends BaseTriggerAction {
  type: 'execute_triggered_subgraph';
  parameters: ExecuteTriggeredSubgraphActionConfig;
}

/**
 * 执行脚本动作
 */
export interface ExecuteScriptAction extends BaseTriggerAction {
  type: 'execute_script';
  parameters: ExecuteScriptActionParameters;
}

/**
 * 触发动作联合类型
 * 使用可辨识联合实现类型安全
 */
export type TriggerAction =
  | StartWorkflowAction
  | StopWorkflowAction
  | StopThreadAction
  | PauseThreadAction
  | ResumeThreadAction
  | SkipNodeAction
  | SetVariableAction
  | SendNotificationAction
  | CustomAction
  | ApplyMessageOperationAction
  | ExecuteTriggeredSubgraphAction
  | ExecuteScriptAction;

/**
 * 类型守卫：检查是否为特定类型的触发动作
 */
export function isTriggerActionType<T extends TriggerActionType>(
  action: TriggerAction,
  type: T
): action is TriggerAction & { type: T } {
  return action.type === type;
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