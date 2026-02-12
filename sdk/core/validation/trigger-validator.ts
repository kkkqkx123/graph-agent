/**
 * Trigger验证函数
 * 提供Trigger配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { WorkflowTrigger, TriggerCondition, TriggerAction, ExecuteTriggeredSubgraphActionConfig } from '@modular-agent/types/trigger';
import type { TriggerReference } from '@modular-agent/types/trigger-template';
import { TriggerActionType } from '@modular-agent/types/trigger';
import { EventType } from '@modular-agent/types/events';
import { ValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';
import { LLMMessageRole } from '@modular-agent/types/llm';

/**
 * 触发条件schema
 */
const triggerConditionSchema = z.object({
  eventType: z.custom<EventType>((val): val is EventType =>
    Object.values(EventType).includes(val as EventType)
  ),
  eventName: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
}).refine(
  (data) => {
    // 当 eventType 为 NODE_CUSTOM_EVENT 时，eventName 必填
    if (data.eventType === EventType.NODE_CUSTOM_EVENT && !data.eventName) {
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
    Object.values(TriggerActionType).includes(val as TriggerActionType)
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
      Object.values(EventType).includes(val as EventType)
    ).optional(),
    eventName: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }).optional(),
  action: z.object({
    type: z.custom<TriggerActionType>((val): val is TriggerActionType =>
      Object.values(TriggerActionType).includes(val as TriggerActionType)
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
export function validateTriggerCondition(condition: TriggerCondition, path: string = 'condition'): Result<TriggerCondition, ValidationError[]> {
  const result = triggerConditionSchema.safeParse(condition);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid trigger condition', path)]);
    }
    return err([new ValidationError(error.message, `${path}.${error.path.join('.')}`)]);
  }
  return ok(condition);
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
): Result<ExecuteTriggeredSubgraphActionConfig, ValidationError[]> {
  const result = executeTriggeredSubgraphActionConfigSchema.safeParse(config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid execute triggered subgraph action config', path)]);
    }
    return err([new ValidationError(error.message, `${path}.${error.path.join('.')}`)]);
  }
  return ok(config);
}

/**
 * 验证触发动作
 * @param action 触发动作
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerAction(action: TriggerAction, path: string = 'action'): Result<TriggerAction, ValidationError[]> {
  const result = triggerActionSchema.safeParse(action);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid trigger action', path)]);
    }
    return err([new ValidationError(error.message, `${path}.${error.path.join('.')}`)]);
  }

  // 特殊处理：当 action.type 为 EXECUTE_TRIGGERED_SUBGRAPH 时，验证 parameters
  if (action.type === TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH) {
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
export function validateWorkflowTrigger(trigger: WorkflowTrigger, path: string = 'triggers'): Result<WorkflowTrigger, ValidationError[]> {
  const result = workflowTriggerSchema.safeParse(trigger);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid workflow trigger', path)]);
    }
    return err([new ValidationError(error.message, `${path}.${error.path.join('.')}`)]);
  }
  return ok(trigger);
}

/**
 * 验证TriggerReference
 * @param reference TriggerReference对象
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerReference(reference: TriggerReference, path: string = 'triggers'): Result<TriggerReference, ValidationError[]> {
  const result = triggerReferenceSchema.safeParse(reference);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid trigger reference', path)]);
    }
    return err([new ValidationError(error.message, `${path}.${error.path.join('.')}`)]);
  }
  return ok(reference);
}

/**
 * 验证触发器数组（包含 WorkflowTrigger 和 TriggerReference）
 * @param triggers 触发器数组
 * @param path 字段路径（用于错误路径）
 * @returns Result<(WorkflowTrigger | TriggerReference)[], ValidationError[]>
 */
export function validateTriggers(
  triggers: (WorkflowTrigger | TriggerReference)[],
  path: string = 'triggers'
): Result<(WorkflowTrigger | TriggerReference)[], ValidationError[]> {
  if (!triggers || !Array.isArray(triggers)) {
    return err([new ValidationError('Triggers must be an array', path)]);
  }

  // 检查触发器ID唯一性
  const triggerIds = new Set<string>();
  const errors: ValidationError[] = [];
  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i];
    if (!trigger) continue;

    const itemPath = `${path}[${i}]`;

    // 检查ID唯一性
    const triggerId = 'id' in trigger ? trigger.id : trigger.triggerId;
    if (triggerIds.has(triggerId)) {
      errors.push(new ValidationError(`Trigger ID must be unique: ${triggerId}`, `${itemPath}.id`));
      continue;
    }
    triggerIds.add(triggerId);

    // 根据类型验证
    let result: Result<WorkflowTrigger | TriggerReference, ValidationError[]>;
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