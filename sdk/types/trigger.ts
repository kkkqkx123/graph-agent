/**
 * Trigger类型定义
 * 定义触发器的类型和结构，用于实现基于事件的触发器机制
 *
 * 设计原则：
 * - Trigger 专用于事件监听
 * - 不涉及时间触发和状态触发
 * - 使用类型别名和接口，保持简单性
 * - 便于序列化和反序列化
 */

import type { ID, Timestamp, Metadata } from './common';
import type { EventType } from './events';

/**
 * 触发器类型枚举
 */
export enum TriggerType {
  /** 事件触发器 - 监听 SDK 现有事件 */
  EVENT = 'event'
}

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
 * 触发器状态枚举
 */
export enum TriggerStatus {
  /** 已启用 */
  ENABLED = 'enabled',
  /** 已禁用 */
  DISABLED = 'disabled',
  /** 已触发 */
  TRIGGERED = 'triggered'
}

/**
 * 触发器定义接口
 */
export interface Trigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发器类型 */
  type: TriggerType;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 触发器状态 */
  status: TriggerStatus;
  /** 关联的工作流 ID（可选） */
  workflowId?: ID;
  /** 关联的线程 ID（可选） */
  threadId?: ID;
  /** 触发次数限制（0 表示无限制） */
  maxTriggers?: number;
  /** 已触发次数 */
  triggerCount: number;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 触发器元数据 */
  metadata?: Metadata;
  /** 触发时是否创建检查点（新增） */
  createCheckpoint?: boolean;
  /** 检查点描述（新增） */
  checkpointDescription?: string;
}

/**
 * 触发器执行结果接口
 */
export interface TriggerExecutionResult {
  /** 触发器 ID */
  triggerId: ID;
  /** 是否成功执行 */
  success: boolean;
  /** 执行的动作 */
  action: TriggerAction;
  /** 执行时间 */
  executionTime: Timestamp;
  /** 执行结果数据 */
  result?: any;
  /** 错误信息（如果失败） */
  error?: any;
  /** 执行元数据 */
  metadata?: Metadata;
}

/**
 * Workflow触发器定义
 * 在workflow定义阶段声明，用于静态检查和类型安全
 */
export interface WorkflowTrigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 触发次数限制（0表示无限制） */
  maxTriggers?: number;
  /** 触发器元数据 */
  metadata?: Metadata;
  /** 触发时是否创建检查点（新增） */
  createCheckpoint?: boolean;
  /** 检查点描述（新增） */
  checkpointDescription?: string;
}

/**
 * 将WorkflowTrigger转换为Trigger
 * @param workflowTrigger workflow触发器定义
 * @param workflowId 工作流ID
 * @returns 运行时触发器实例
 */
export function convertToTrigger(
  workflowTrigger: WorkflowTrigger,
  workflowId: ID
): Trigger {
  return {
    id: workflowTrigger.id,
    name: workflowTrigger.name,
    description: workflowTrigger.description,
    type: TriggerType.EVENT,
    condition: workflowTrigger.condition,
    action: workflowTrigger.action,
    status: workflowTrigger.enabled !== false ? TriggerStatus.ENABLED : TriggerStatus.DISABLED,
    workflowId: workflowId,
    maxTriggers: workflowTrigger.maxTriggers,
    triggerCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: workflowTrigger.metadata
  };
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
  /** 数据合并选项 */
  mergeOptions?: {
    /** 要传递的变量名称列表，undefined表示传递所有变量 */
    includeVariables?: string[];
    /** 是否传递对话历史（提示词消息数组） */
    includeConversationHistory?: boolean;
  };
}