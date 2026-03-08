/**
 * Trigger验证函数
 * 提供Trigger配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { WorkflowTrigger, TriggerCondition, TriggerAction, ExecuteTriggeredSubgraphActionConfig } from '@modular-agent/types';
import type { TriggerReference } from '@modular-agent/types';
import { TriggerActionType } from '@modular-agent/types';
import { EventType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { validateConfig } from './utils.js';

/**
 * 触发条件schema
 */
const triggerConditionSchema = z.object({
  eventType: z.custom<EventType>((val): val is EventType =>
    ['THREAD_STARTED', 'THREAD_COMPLETED', 'THREAD_FAILED', 'THREAD_PAUSED', 'THREAD_RESUMED', 'THREAD_CANCELLED', 'THREAD_STATE_CHANGED', 'THREAD_FORK_STARTED', 'THREAD_FORK_COMPLETED', 'THREAD_JOIN_STARTED', 'THREAD_JOIN_CONDITION_MET', 'THREAD_COPY_STARTED', 'THREAD_COPY_COMPLETED', 'NODE_STARTED', 'NODE_COMPLETED', 'NODE_FAILED', 'NODE_CUSTOM_EVENT', 'TOKEN_LIMIT_EXCEEDED', 'TOKEN_USAGE_WARNING', 'MESSAGE_ADDED', 'TOOL_CALL_STARTED', 'TOOL_CALL_COMPLETED', 'TOOL_CALL_FAILED', 'TOOL_ADDED', 'CONVERSATION_STATE_CHANGED', 'ERROR', 'CHECKPOINT_CREATED', 'CHECKPOINT_RESTORED', 'CHECKPOINT_DELETED', 'CHECKPOINT_FAILED', 'SUBGRAPH_STARTED', 'SUBGRAPH_COMPLETED', 'TRIGGERED_SUBGRAPH_STARTED', 'TRIGGERED_SUBGRAPH_COMPLETED', 'TRIGGERED_SUBGRAPH_FAILED', 'VARIABLE_CHANGED', 'USER_INTERACTION_REQUESTED', 'USER_INTERACTION_RESPONDED', 'USER_INTERACTION_PROCESSED', 'USER_INTERACTION_FAILED', 'HUMAN_RELAY_REQUESTED', 'HUMAN_RELAY_RESPONDED', 'HUMAN_RELAY_PROCESSED', 'HUMAN_RELAY_FAILED', 'LLM_STREAM_ABORTED', 'LLM_STREAM_ERROR', 'DYNAMIC_THREAD_SUBMITTED', 'DYNAMIC_THREAD_COMPLETED', 'DYNAMIC_THREAD_FAILED', 'DYNAMIC_THREAD_CANCELLED'].includes(val as EventType)
  ),
  eventName: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
}).refine(
  (data) => {
    // 当 eventType 为 NODE_CUSTOM_EVENT 时，eventName 必填
    if (data.eventType === 'NODE_CUSTOM_EVENT' && !data.eventName) {
      return false;
    }
    return true;
  },
  {
    message: 'eventName is required when eventType is NODE_CUSTOM_EVENT',
    path: ['eventName']
  }
);

/**
 * 对话历史回传配置schema
 */
const conversationHistoryOptionsSchema = z.object({
  lastN: z.number().int().positive('lastN must be a positive integer').optional(),
  lastNByRole: z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    count: z.number().int().positive('count must be a positive integer')
  }).optional(),
  byRole: z.enum(['system', 'user', 'assistant', 'tool']).optional(),
  range: z.object({
    start: z.number().int().min(0, 'start must be a non-negative integer'),
    end: z.number().int().positive('end must be a positive integer')
  }).refine(
    (data) => data.start < data.end,
    {
      message: 'start must be less than end',
      path: ['start']
    }
  ).optional(),
  rangeByRole: z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    start: z.number().int().min(0, 'start must be a non-negative integer'),
    end: z.number().int().positive('end must be a positive integer')
  }).refine(
    (data) => data.start < data.end,
    {
      message: 'start must be less than end',
      path: ['start']
    }
  ).optional()
}).refine(
  (data) => {
    // 至少需要指定一个选项
    const hasOption = data.lastN !== undefined ||
      data.lastNByRole !== undefined ||
      data.byRole !== undefined ||
      data.range !== undefined ||
      data.rangeByRole !== undefined;
    return hasOption;
  },
  {
    message: 'At least one conversation history option must be specified',
    path: []
  }
);

/**
 * 触发子工作流动作配置schema
 */
const executeTriggeredSubgraphActionConfigSchema = z.object({
  triggeredWorkflowId: z.string().min(1, 'Triggered workflow ID is required'),
  waitForCompletion: z.boolean().optional(),
  mergeOptions: z.object({
    includeVariables: z.array(z.string()).optional(),
    includeConversationHistory: conversationHistoryOptionsSchema.optional()
  }).optional()
});

/**
 * 触发动作schema
 */
const triggerActionSchema = z.object({
  type: z.custom<TriggerActionType>((val): val is TriggerActionType =>
    ['start_workflow', 'stop_workflow', 'pause_thread', 'resume_thread', 'skip_node', 'set_variable', 'send_notification', 'custom', 'execute_triggered_subgraph'].includes(val as TriggerActionType)
  ),
  parameters: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * WorkflowTrigger schema
 */
const workflowTriggerSchema = z.object({
  id: z.string().min(1, 'Trigger ID is required'),
  name: z.string().min(1, 'Trigger name is required'),
  description: z.string().optional(),
  condition: triggerConditionSchema,
  action: triggerActionSchema,
  enabled: z.boolean().optional(),
  maxTriggers: z.number().int().min(0, 'Max triggers must be a non-negative integer').optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * TriggerConfigOverride schema
 */
const triggerConfigOverrideSchema = z.object({
  condition: z.object({
    eventType: z.custom<EventType>((val): val is EventType =>
      ['THREAD_STARTED', 'THREAD_COMPLETED', 'THREAD_FAILED', 'THREAD_PAUSED', 'THREAD_RESUMED', 'THREAD_CANCELLED', 'THREAD_STATE_CHANGED', 'THREAD_FORK_STARTED', 'THREAD_FORK_COMPLETED', 'THREAD_JOIN_STARTED', 'THREAD_JOIN_CONDITION_MET', 'THREAD_COPY_STARTED', 'THREAD_COPY_COMPLETED', 'NODE_STARTED', 'NODE_COMPLETED', 'NODE_FAILED', 'NODE_CUSTOM_EVENT', 'TOKEN_LIMIT_EXCEEDED', 'TOKEN_USAGE_WARNING', 'MESSAGE_ADDED', 'TOOL_CALL_STARTED', 'TOOL_CALL_COMPLETED', 'TOOL_CALL_FAILED', 'TOOL_ADDED', 'CONVERSATION_STATE_CHANGED', 'ERROR', 'CHECKPOINT_CREATED', 'CHECKPOINT_RESTORED', 'CHECKPOINT_DELETED', 'CHECKPOINT_FAILED', 'SUBGRAPH_STARTED', 'SUBGRAPH_COMPLETED', 'TRIGGERED_SUBGRAPH_STARTED', 'TRIGGERED_SUBGRAPH_COMPLETED', 'TRIGGERED_SUBGRAPH_FAILED', 'VARIABLE_CHANGED', 'USER_INTERACTION_REQUESTED', 'USER_INTERACTION_RESPONDED', 'USER_INTERACTION_PROCESSED', 'USER_INTERACTION_FAILED', 'HUMAN_RELAY_REQUESTED', 'HUMAN_RELAY_RESPONDED', 'HUMAN_RELAY_PROCESSED', 'HUMAN_RELAY_FAILED', 'LLM_STREAM_ABORTED', 'LLM_STREAM_ERROR', 'DYNAMIC_THREAD_SUBMITTED', 'DYNAMIC_THREAD_COMPLETED', 'DYNAMIC_THREAD_FAILED', 'DYNAMIC_THREAD_CANCELLED'].includes(val as EventType)
    ).optional(),
    eventName: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }).optional(),
  action: z.object({
    type: z.custom<TriggerActionType>((val): val is TriggerActionType =>
      ['start_workflow', 'stop_workflow', 'pause_thread', 'resume_thread', 'skip_node', 'set_variable', 'send_notification', 'custom', 'execute_triggered_subgraph'].includes(val as TriggerActionType)
    ).optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }).optional(),
  enabled: z.boolean().optional(),
  maxTriggers: z.number().int().min(0, 'Max triggers must be a non-negative integer').optional()
});

/**
 * TriggerReference schema
 */
const triggerReferenceSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  triggerId: z.string().min(1, 'Trigger ID is required'),
  triggerName: z.string().optional(),
  configOverride: triggerConfigOverrideSchema.optional()
});

/**
 * 验证触发条件
 * @param condition 触发条件
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerCondition(condition: TriggerCondition, path: string = 'condition'): Result<TriggerCondition, ConfigurationValidationError[]> {
  return validateConfig(condition, triggerConditionSchema, path, 'trigger');
}

/**
 * 验证触发子工作流动作配置
 * @param config 触发子工作流动作配置
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateExecuteTriggeredSubgraphActionConfig(
  config: ExecuteTriggeredSubgraphActionConfig,
  path: string = 'action.parameters'
): Result<ExecuteTriggeredSubgraphActionConfig, ConfigurationValidationError[]> {
  return validateConfig(config, executeTriggeredSubgraphActionConfigSchema, path, 'trigger');
}

/**
 * 验证触发动作
 * @param action 触发动作
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerAction(action: TriggerAction, path: string = 'action'): Result<TriggerAction, ConfigurationValidationError[]> {
  const result = validateConfig(action, triggerActionSchema, path, 'trigger');
  if (result.isErr()) {
    return result;
  }

  // 特殊处理：当 action.type 为 EXECUTE_TRIGGERED_SUBGRAPH 时，验证 parameters
  if (action.type === 'execute_triggered_subgraph') {
    const paramResult = validateExecuteTriggeredSubgraphActionConfig(
      action.parameters as ExecuteTriggeredSubgraphActionConfig,
      `${path}.parameters`
    );
    if (paramResult.isErr()) {
      return err(paramResult.error);
    }
  }

  return ok(action);
}

/**
 * 验证WorkflowTrigger
 * @param trigger WorkflowTrigger对象
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateWorkflowTrigger(trigger: WorkflowTrigger, path: string = 'triggers'): Result<WorkflowTrigger, ConfigurationValidationError[]> {
  return validateConfig(trigger, workflowTriggerSchema, path, 'trigger');
}

/**
 * 验证TriggerReference
 * @param reference TriggerReference对象
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerReference(reference: TriggerReference, path: string = 'triggers'): Result<TriggerReference, ConfigurationValidationError[]> {
  return validateConfig(reference, triggerReferenceSchema, path, 'trigger');
}

/**
 * 验证触发器数组（包含 WorkflowTrigger 和 TriggerReference）
 * @param triggers 触发器数组
 * @param path 字段路径（用于错误路径）
 * @returns Result<(WorkflowTrigger | TriggerReference)[], ConfigurationValidationError[]>
 */
export function validateTriggers(
  triggers: (WorkflowTrigger | TriggerReference)[],
  path: string = 'triggers'
): Result<(WorkflowTrigger | TriggerReference)[], ConfigurationValidationError[]> {
  if (!triggers || !Array.isArray(triggers)) {
    return err([new ConfigurationValidationError('Triggers must be an array', {
      configType: 'trigger',
      configPath: path
    })]);
  }

  // 检查触发器ID唯一性
  const triggerIds = new Set<string>();
  const errors: ConfigurationValidationError[] = [];
  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i];
    if (!trigger) continue;

    const itemPath = `${path}[${i}]`;

    // 检查ID唯一性
    const triggerId = 'id' in trigger ? trigger.id : trigger.triggerId;
    if (triggerIds.has(triggerId)) {
      errors.push(new ConfigurationValidationError(`Trigger ID must be unique: ${triggerId}`, {
        configType: 'trigger',
        configPath: `${itemPath}.id`
      }));
      continue;
    }
    triggerIds.add(triggerId);

    // 根据类型验证
    let result: Result<WorkflowTrigger | TriggerReference, ConfigurationValidationError[]>;
    if ('templateName' in trigger) {
      // TriggerReference
      result = validateTriggerReference(trigger, itemPath);
    } else {
      // WorkflowTrigger
      result = validateWorkflowTrigger(trigger, itemPath);
    }

    if (result.isErr()) {
      errors.push(...result.error);
    }
  }

  if (errors.length === 0) {
    return ok(triggers);
  }
  return err(errors);
}
