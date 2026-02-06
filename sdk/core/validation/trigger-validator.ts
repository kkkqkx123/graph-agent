/**
 * Trigger验证函数
 * 提供Trigger配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { WorkflowTrigger, TriggerCondition, TriggerAction, ExecuteTriggeredSubgraphActionConfig } from '../../types/trigger';
import type { TriggerReference } from '../../types/trigger-template';
import { TriggerActionType } from '../../types/trigger';
import { EventType } from '../../types/events';
import { ValidationError, type ValidationResult } from '../../types/errors';

/**
 * 触发条件schema
 */
const triggerConditionSchema = z.object({
  eventType: z.nativeEnum(EventType),
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
 * 触发子工作流动作配置schema
 */
const executeTriggeredSubgraphActionConfigSchema = z.object({
  triggeredWorkflowId: z.string().min(1, 'Triggered workflow ID is required'),
  waitForCompletion: z.boolean().optional()
});

/**
 * 触发动作schema
 */
const triggerActionSchema = z.object({
  type: z.nativeEnum(TriggerActionType),
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
    eventType: z.nativeEnum(EventType).optional(),
    eventName: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }).optional(),
  action: z.object({
    type: z.nativeEnum(TriggerActionType).optional(),
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
export function validateTriggerCondition(condition: TriggerCondition, path: string = 'condition'): ValidationResult {
  const result = triggerConditionSchema.safeParse(condition);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return {
        valid: false,
        errors: [new ValidationError('Invalid trigger condition', path)],
        warnings: []
      };
    }
    return {
      valid: false,
      errors: [new ValidationError(error.message, `${path}.${error.path.join('.')}`)],
      warnings: []
    };
  }
  return {
    valid: true,
    errors: [],
    warnings: []
  };
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
): ValidationResult {
  const result = executeTriggeredSubgraphActionConfigSchema.safeParse(config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return {
        valid: false,
        errors: [new ValidationError('Invalid execute triggered subgraph action config', path)],
        warnings: []
      };
    }
    return {
      valid: false,
      errors: [new ValidationError(error.message, `${path}.${error.path.join('.')}`)],
      warnings: []
    };
  }
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

/**
 * 验证触发动作
 * @param action 触发动作
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerAction(action: TriggerAction, path: string = 'action'): ValidationResult {
  const result = triggerActionSchema.safeParse(action);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return {
        valid: false,
        errors: [new ValidationError('Invalid trigger action', path)],
        warnings: []
      };
    }
    return {
      valid: false,
      errors: [new ValidationError(error.message, `${path}.${error.path.join('.')}`)],
      warnings: []
    };
  }

  // 特殊处理：当 action.type 为 EXECUTE_TRIGGERED_SUBGRAPH 时，验证 parameters
  if (action.type === TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH) {
    const paramResult = validateExecuteTriggeredSubgraphActionConfig(
      action.parameters as ExecuteTriggeredSubgraphActionConfig,
      `${path}.parameters`
    );
    if (!paramResult.valid) {
      return paramResult;
    }
  }
  
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

/**
 * 验证WorkflowTrigger
 * @param trigger WorkflowTrigger对象
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateWorkflowTrigger(trigger: WorkflowTrigger, path: string = 'triggers'): ValidationResult {
  const result = workflowTriggerSchema.safeParse(trigger);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return {
        valid: false,
        errors: [new ValidationError('Invalid workflow trigger', path)],
        warnings: []
      };
    }
    return {
      valid: false,
      errors: [new ValidationError(error.message, `${path}.${error.path.join('.')}`)],
      warnings: []
    };
  }
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

/**
 * 验证TriggerReference
 * @param reference TriggerReference对象
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerReference(reference: TriggerReference, path: string = 'triggers'): ValidationResult {
  const result = triggerReferenceSchema.safeParse(reference);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return {
        valid: false,
        errors: [new ValidationError('Invalid trigger reference', path)],
        warnings: []
      };
    }
    return {
      valid: false,
      errors: [new ValidationError(error.message, `${path}.${error.path.join('.')}`)],
      warnings: []
    };
  }
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

/**
 * 验证触发器数组（包含 WorkflowTrigger 和 TriggerReference）
 * @param triggers 触发器数组
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggers(
  triggers: (WorkflowTrigger | TriggerReference)[],
  path: string = 'triggers'
): ValidationResult {
  if (!triggers || !Array.isArray(triggers)) {
    return {
      valid: false,
      errors: [new ValidationError('Triggers must be an array', path)],
      warnings: []
    };
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
    let result: ValidationResult;
    if ('templateName' in trigger) {
      // TriggerReference
      result = validateTriggerReference(trigger, itemPath);
    } else {
      // WorkflowTrigger
      result = validateWorkflowTrigger(trigger, itemPath);
    }
    
    if (!result.valid) {
      errors.push(...result.errors);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}