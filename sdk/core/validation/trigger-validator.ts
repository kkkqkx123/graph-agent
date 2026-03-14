/**
 * Trigger验证函数
 * 提供Trigger配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { WorkflowTrigger, TriggerCondition, TriggerAction, ExecuteTriggeredSubgraphActionConfig, ExecuteScriptActionConfig } from '@modular-agent/types';
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
 * 执行脚本动作配置schema
 */
const executeScriptActionConfigSchema = z.object({
  scriptName: z.string().min(1, 'Script name is required'),
  parameters: z.record(z.string(), z.any()).optional(),
  timeout: z.number().int().positive('Timeout must be a positive integer').optional(),
  ignoreError: z.boolean().optional(),
  validateExistence: z.boolean().optional()
});

// ============================================================================
// 各动作类型参数的专门 schema
// ============================================================================

/**
 * 启动动态子线程动作参数 schema
 */
const startDynamicChildActionParametersSchema = z.object({
  graphId: z.string().min(1, 'Graph ID is required'),
  input: z.record(z.string(), z.any()).optional(),
  waitForCompletion: z.boolean().optional(),
  timeout: z.number().int().positive('Timeout must be a positive integer').optional()
});

/**
 * 停止线程动作参数 schema
 */
const stopThreadActionParametersSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  force: z.boolean().optional()
});

/**
 * 暂停线程动作参数 schema
 */
const pauseThreadActionParametersSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  reason: z.string().optional()
});

/**
 * 恢复线程动作参数 schema
 */
const resumeThreadActionParametersSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required')
});

/**
 * 跳过节点动作参数 schema
 */
const skipNodeActionParametersSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  nodeId: z.string().min(1, 'Node ID is required')
});

/**
 * 设置变量动作参数 schema
 */
const setVariableActionParametersSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  variables: z.record(z.string(), z.any()).refine(
    (vars) => Object.keys(vars).length > 0,
    'At least one variable must be specified'
  ),
  scope: z.enum(['global', 'thread', 'local', 'loop']).optional()
});

/**
 * 发送通知动作参数 schema
 */
const sendNotificationActionParametersSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  recipients: z.array(z.string()).optional(),
  level: z.enum(['info', 'warning', 'error', 'success']).optional(),
  channel: z.enum(['email', 'sms', 'push', 'webhook', 'in_app']).optional()
});

/**
 * 自定义动作参数 schema
 */
const customActionParametersSchema = z.object({
  handlerName: z.string().min(1, 'Handler name is required'),
  data: z.record(z.string(), z.any()).optional()
});

/**
 * 应用消息操作动作参数 schema
 */
const applyMessageOperationActionParametersSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  operationType: z.enum(['compress', 'truncate', 'summarize', 'mark', 'unmark']),
  config: z.record(z.string(), z.any()).optional()
});

/**
 * 触发动作schema - 使用 discriminatedUnion 实现类型安全
 */
const triggerActionSchema = z.discriminatedUnion('type', [
  // start_dynamic_child
  z.object({
    type: z.literal('start_dynamic_child'),
    parameters: startDynamicChildActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // stop_thread
  z.object({
    type: z.literal('stop_thread'),
    parameters: stopThreadActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // pause_thread
  z.object({
    type: z.literal('pause_thread'),
    parameters: pauseThreadActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // resume_thread
  z.object({
    type: z.literal('resume_thread'),
    parameters: resumeThreadActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // skip_node
  z.object({
    type: z.literal('skip_node'),
    parameters: skipNodeActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // set_variable
  z.object({
    type: z.literal('set_variable'),
    parameters: setVariableActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // send_notification
  z.object({
    type: z.literal('send_notification'),
    parameters: sendNotificationActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // custom
  z.object({
    type: z.literal('custom'),
    parameters: customActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // apply_message_operation
  z.object({
    type: z.literal('apply_message_operation'),
    parameters: applyMessageOperationActionParametersSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // execute_triggered_subgraph
  z.object({
    type: z.literal('execute_triggered_subgraph'),
    parameters: executeTriggeredSubgraphActionConfigSchema,
    metadata: z.record(z.string(), z.any()).optional()
  }),
  // execute_script
  z.object({
    type: z.literal('execute_script'),
    parameters: executeScriptActionConfigSchema,
    metadata: z.record(z.string(), z.any()).optional()
  })
]);

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
  metadata: z.record(z.string(), z.any()).optional(),
  createCheckpoint: z.boolean().optional(),
  checkpointDescription: z.string().optional()
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
      ['start_dynamic_child', 'stop_thread', 'pause_thread', 'resume_thread', 'skip_node', 'set_variable', 'send_notification', 'custom', 'apply_message_operation', 'execute_triggered_subgraph', 'execute_script'].includes(val as TriggerActionType)
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
 * 验证执行脚本动作配置
 * @param config 执行脚本动作配置
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateExecuteScriptActionConfig(
  config: ExecuteScriptActionConfig,
  path: string = 'action.parameters'
): Result<ExecuteScriptActionConfig, ConfigurationValidationError[]> {
  return validateConfig(config, executeScriptActionConfigSchema, path, 'trigger');
}

/**
 * 验证触发动作
 * @param action 触发动作
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerAction(action: TriggerAction, path: string = 'action'): Result<TriggerAction, ConfigurationValidationError[]> {
  // 使用 discriminatedUnion 的 triggerActionSchema 会自动验证每种类型的参数
  return validateConfig(action, triggerActionSchema, path, 'trigger') as Result<TriggerAction, ConfigurationValidationError[]>;
}

/**
 * 验证WorkflowTrigger
 * @param trigger WorkflowTrigger对象
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateWorkflowTrigger(trigger: WorkflowTrigger, path: string = 'triggers'): Result<WorkflowTrigger, ConfigurationValidationError[]> {
  return validateConfig(trigger, workflowTriggerSchema, path, 'trigger') as Result<WorkflowTrigger, ConfigurationValidationError[]>;
}

/**
 * 验证TriggerReference
 * @param reference TriggerReference对象
 * @param path 字段路径（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateTriggerReference(reference: TriggerReference, path: string = 'triggers'): Result<TriggerReference, ConfigurationValidationError[]> {
  return validateConfig(reference, triggerReferenceSchema, path, 'trigger') as Result<TriggerReference, ConfigurationValidationError[]>;
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
