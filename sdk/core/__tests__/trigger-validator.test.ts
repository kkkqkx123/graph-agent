/**
 * Trigger Validator 集成测试
 *
 * 测试场景：
 * - 触发条件验证
 * - 触发动作验证
 * - 工作流触发器验证
 * - 触发器引用验证
 */

import { describe, it, expect } from 'vitest';
import {
  validateTriggerCondition,
  validateTriggerAction,
  validateWorkflowTrigger,
  validateTriggerReference,
  validateTriggers,
  validateExecuteTriggeredSubgraphActionConfig,
  validateExecuteScriptActionConfig
} from '../validation/trigger-validator.js';
import type { WorkflowTrigger, TriggerCondition, TriggerAction, TriggerReference } from '@modular-agent/types';
import { EventType, TriggerActionType } from '@modular-agent/types';

describe('Trigger Validator - 触发器验证器', () => {
  describe('触发条件验证', () => {
    it('测试有效触发条件：有效的eventType应通过验证', () => {
      const condition: TriggerCondition = {
        eventType: 'THREAD_STARTED' as EventType
      };

      const result = validateTriggerCondition(condition);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.eventType).toBe('THREAD_STARTED');
      }
    });

    it('测试无效事件类型：无效的eventType应验证失败', () => {
      const condition: any = {
        eventType: 'INVALID_EVENT_TYPE'
      };

      const result = validateTriggerCondition(condition);

      expect(result.isErr()).toBe(true);
    });

    it('测试NODE_CUSTOM_EVENT必须eventName：eventType为NODE_CUSTOM_EVENT时eventName必填', () => {
      const condition: any = {
        eventType: 'NODE_CUSTOM_EVENT'
        // eventName 未设置
      };

      const result = validateTriggerCondition(condition);

      expect(result.isErr()).toBe(true);
    });

    it('测试NODE_CUSTOM_EVENT带eventName：eventType为NODE_CUSTOM_EVENT且设置了eventName应通过验证', () => {
      const condition: TriggerCondition = {
        eventType: 'NODE_CUSTOM_EVENT' as EventType,
        eventName: 'custom-event-name'
      };

      const result = validateTriggerCondition(condition);

      expect(result.isOk()).toBe(true);
    });

    it('测试可选eventName：其他eventType时eventName可选', () => {
      const condition1: TriggerCondition = {
        eventType: 'THREAD_STARTED' as EventType
      };

      const condition2: TriggerCondition = {
        eventType: 'THREAD_STARTED' as EventType,
        eventName: 'optional-event-name'
      };

      const result1 = validateTriggerCondition(condition1);
      const result2 = validateTriggerCondition(condition2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
    });

    it('测试触发条件metadata：metadata应为可选对象', () => {
      const condition: TriggerCondition = {
        eventType: 'THREAD_STARTED' as EventType,
        metadata: {
          key1: 'value1',
          key2: 123
        }
      };

      const result = validateTriggerCondition(condition);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('触发动作验证', () => {
    it('测试有效触发动作：有效的action应通过验证', () => {
      const action: TriggerAction = {
        type: 'stop_thread',
        parameters: {
          threadId: 'thread-123',
          force: false
        }
      };

      const result = validateTriggerAction(action);

      expect(result.isOk()).toBe(true);
    });

    it('测试无效动作类型：无效的action.type应验证失败', () => {
      const action: any = {
        type: 'invalid_action_type',
        parameters: {}
      };

      const result = validateTriggerAction(action);

      expect(result.isErr()).toBe(true);
    });

    it('测试动作参数验证：stop_thread动作参数应正确验证', () => {
      const action1: TriggerAction = {
        type: 'stop_thread',
        parameters: {
          threadId: 'thread-123',
          force: false
        }
      };

      const action2: any = {
        type: 'stop_thread',
        parameters: {
          force: false
          // threadId 缺失
        }
      };

      const result1 = validateTriggerAction(action1);
      const result2 = validateTriggerAction(action2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isErr()).toBe(true);
    });

    it('测试动作参数验证：pause_thread动作参数应正确验证', () => {
      const action1: TriggerAction = {
        type: 'pause_thread',
        parameters: {
          threadId: 'thread-123',
          reason: '测试暂停'
        }
      };

      const action2: TriggerAction = {
        type: 'pause_thread',
        parameters: {
          threadId: 'thread-123'
          // reason 可选
        }
      };

      const result1 = validateTriggerAction(action1);
      const result2 = validateTriggerAction(action2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
    });

    it('测试动作参数验证：set_variable动作参数应正确验证', () => {
      const action1: TriggerAction = {
        type: 'set_variable',
        parameters: {
          threadId: 'thread-123',
          variables: {
            var1: 'value1',
            var2: 123
          }
        }
      };

      const action2: any = {
        type: 'set_variable',
        parameters: {
          threadId: 'thread-123',
          variables: {}
          // variables 不能为空
        }
      };

      const result1 = validateTriggerAction(action1);
      const result2 = validateTriggerAction(action2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isErr()).toBe(true);
    });

    it('测试动作参数验证：execute_triggered_subgraph动作参数应正确验证', () => {
      const action1: TriggerAction = {
        type: 'execute_triggered_subgraph',
        parameters: {
          triggeredWorkflowId: 'workflow-123',
          waitForCompletion: true
        }
      };

      const action2: any = {
        type: 'execute_triggered_subgraph',
        parameters: {
          waitForCompletion: true
          // triggeredWorkflowId 缺失
        }
      };

      const result1 = validateTriggerAction(action1);
      const result2 = validateTriggerAction(action2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isErr()).toBe(true);
    });

    it('测试动作参数验证：execute_script动作参数应正确验证', () => {
      const action1: TriggerAction = {
        type: 'execute_script',
        parameters: {
          scriptName: 'test-script',
          parameters: { key: 'value' },
          timeout: 5000
        }
      };

      const action2: any = {
        type: 'execute_script',
        parameters: {
          parameters: { key: 'value' }
          // scriptName 缺失
        }
      };

      const result1 = validateTriggerAction(action1);
      const result2 = validateTriggerAction(action2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isErr()).toBe(true);
    });

    it('测试动作metadata：metadata应为可选对象', () => {
      const action: TriggerAction = {
        type: 'stop_thread',
        parameters: {
          threadId: 'thread-123'
        },
        metadata: {
          description: '测试动作'
        }
      };

      const result = validateTriggerAction(action);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('工作流触发器验证', () => {
    it('测试完整触发器配置：所有必需字段齐全应通过验证', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-123',
        name: '测试触发器',
        description: '这是一个测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        },
        enabled: true,
        maxTriggers: 5
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isOk()).toBe(true);
    });

    it('测试缺少必需字段：缺少id应验证失败', () => {
      const trigger: any = {
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        }
        // id 缺失
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isErr()).toBe(true);
    });

    it('测试缺少必需字段：缺少name应验证失败', () => {
      const trigger: any = {
        id: 'trigger-123',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        }
        // name 缺失
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isErr()).toBe(true);
    });

    it('测试缺少必需字段：缺少condition应验证失败', () => {
      const trigger: any = {
        id: 'trigger-123',
        name: '测试触发器',
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        }
        // condition 缺失
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isErr()).toBe(true);
    });

    it('测试缺少必需字段：缺少action应验证失败', () => {
      const trigger: any = {
        id: 'trigger-123',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        }
        // action 缺失
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isErr()).toBe(true);
    });

    it('测试可选字段：enabled、maxTriggers、metadata等可选字段', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-123',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        }
        // enabled、maxTriggers、description、metadata 未设置
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isOk()).toBe(true);
    });

    it('测试maxTriggers为负数：应验证失败', () => {
      const trigger: any = {
        id: 'trigger-123',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        },
        maxTriggers: -1
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isErr()).toBe(true);
    });

    it('测试maxTriggers为0：应通过验证（表示无限制）', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-123',
        name: '测试触发器',
        condition: {
          eventType: 'THREAD_STARTED' as EventType
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        },
        maxTriggers: 0
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isOk()).toBe(true);
    });

    it('测试嵌套验证：触发器内嵌的条件和动作也应被验证', () => {
      const trigger: any = {
        id: 'trigger-123',
        name: '测试触发器',
        condition: {
          eventType: 'INVALID_EVENT_TYPE'
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: 'thread-123'
          }
        }
      };

      const result = validateWorkflowTrigger(trigger);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('触发器数组验证', () => {
    it('测试ID唯一性：触发器数组中ID应唯一', () => {
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: '触发器1',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'stop_thread', parameters: { threadId: 'thread-123' } }
        },
        {
          id: 'trigger-2',
          name: '触发器2',
          condition: { eventType: 'THREAD_COMPLETED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'thread-456' } }
        }
      ];

      const result = validateTriggers(triggers);

      expect(result.isOk()).toBe(true);
    });

    it('测试ID重复：触发器数组中ID重复应验证失败', () => {
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: '触发器1',
          condition: { eventType: 'THREAD_STARTED' as EventType },
          action: { type: 'stop_thread', parameters: { threadId: 'thread-123' } }
        },
        {
          id: 'trigger-1',
          name: '触发器2',
          condition: { eventType: 'THREAD_COMPLETED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'thread-456' } }
        }
      ];

      const result = validateTriggers(triggers);

      expect(result.isErr()).toBe(true);
    });

    it('测试空触发器数组：空数组应通过验证', () => {
      const triggers: WorkflowTrigger[] = [];

      const result = validateTriggers(triggers);

      expect(result.isOk()).toBe(true);
    });

    it('测试非数组输入：非数组应验证失败', () => {
      const triggers: any = null;

      const result = validateTriggers(triggers);

      expect(result.isErr()).toBe(true);
    });

    it('测试混合触发器类型：支持WorkflowTrigger和TriggerReference', () => {
      const workflowTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        name: '触发器1',
        condition: { eventType: 'THREAD_STARTED' as EventType },
        action: { type: 'stop_thread', parameters: { threadId: 'thread-123' } }
      };

      const triggerReference: TriggerReference = {
        templateName: 'context-compression',
        triggerId: 'trigger-2'
      };

      const result = validateTriggers([workflowTrigger, triggerReference]);

      expect(result.isOk()).toBe(true);
    });

    it('测试多个错误：应返回所有验证错误', () => {
      const triggers: any[] = [
        {
          id: 'trigger-1',
          name: '触发器1',
          condition: { eventType: 'INVALID_EVENT_TYPE' },
          action: { type: 'stop_thread', parameters: { threadId: 'thread-123' } }
        },
        {
          id: 'trigger-1',
          name: '触发器2',
          condition: { eventType: 'THREAD_COMPLETED' as EventType },
          action: { type: 'pause_thread', parameters: { threadId: 'thread-456' } }
        }
      ];

      const result = validateTriggers(triggers);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(1);
      }
    });
  });

  describe('触发器引用验证', () => {
    it('测试有效触发器引用：有效的templateName和triggerId应通过验证', () => {
      const reference: TriggerReference = {
        templateName: 'context-compression',
        triggerId: 'trigger-123'
      };

      const result = validateTriggerReference(reference);

      expect(result.isOk()).toBe(true);
    });

    it('测试缺少templateName：templateName缺失应验证失败', () => {
      const reference: any = {
        triggerId: 'trigger-123'
        // templateName 缺失
      };

      const result = validateTriggerReference(reference);

      expect(result.isErr()).toBe(true);
    });

    it('测试缺少triggerId：triggerId缺失应验证失败', () => {
      const reference: any = {
        templateName: 'context-compression'
        // triggerId 缺失
      };

      const result = validateTriggerReference(reference);

      expect(result.isErr()).toBe(true);
    });

    it('测试配置覆盖：configOverride应正确验证', () => {
      const reference: TriggerReference = {
        templateName: 'context-compression',
        triggerId: 'trigger-123',
        triggerName: '自定义触发器名称',
        configOverride: {
          condition: {
            eventType: 'THREAD_STARTED' as EventType
          },
          action: {
            type: 'stop_thread'
          },
          enabled: true,
          maxTriggers: 10
        }
      };

      const result = validateTriggerReference(reference);

      expect(result.isOk()).toBe(true);
    });

    it('测试triggerName可选：triggerName为可选字段', () => {
      const reference1: TriggerReference = {
        templateName: 'context-compression',
        triggerId: 'trigger-123'
      };

      const reference2: TriggerReference = {
        templateName: 'context-compression',
        triggerId: 'trigger-123',
        triggerName: '自定义触发器名称'
      };

      const result1 = validateTriggerReference(reference1);
      const result2 = validateTriggerReference(reference2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
    });

    it('测试configOverride可选：configOverride为可选字段', () => {
      const reference: TriggerReference = {
        templateName: 'context-compression',
        triggerId: 'trigger-123'
        // configOverride 未设置
      };

      const result = validateTriggerReference(reference);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('特定动作配置验证', () => {
    it('测试验证触发子工作流动作配置：有效配置应通过验证', () => {
      const config = {
        triggeredWorkflowId: 'workflow-123',
        waitForCompletion: true,
        mergeOptions: {
          includeVariables: ['var1', 'var2'],
          includeConversationHistory: {
            lastN: 10
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(config);

      expect(result.isOk()).toBe(true);
    });

    it('测试验证触发子工作流动作配置：缺失triggeredWorkflowId应验证失败', () => {
      const config: any = {
        waitForCompletion: true
        // triggeredWorkflowId 缺失
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(config);

      expect(result.isErr()).toBe(true);
    });

    it('测试验证执行脚本动作配置：有效配置应通过验证', () => {
      const config = {
        scriptName: 'test-script',
        parameters: { key: 'value' },
        timeout: 5000,
        ignoreError: false,
        validateExistence: true
      };

      const result = validateExecuteScriptActionConfig(config);

      expect(result.isOk()).toBe(true);
    });

    it('测试验证执行脚本动作配置：缺失scriptName应验证失败', () => {
      const config: any = {
        parameters: { key: 'value' },
        timeout: 5000
        // scriptName 缺失
      };

      const result = validateExecuteScriptActionConfig(config);

      expect(result.isErr()).toBe(true);
    });

    it('测试验证执行脚本动作配置：timeout必须为正整数', () => {
      const config1: any = {
        scriptName: 'test-script',
        timeout: 0
      };

      const config2: any = {
        scriptName: 'test-script',
        timeout: -100
      };

      const result1 = validateExecuteScriptActionConfig(config1);
      const result2 = validateExecuteScriptActionConfig(config2);

      expect(result1.isErr()).toBe(true);
      expect(result2.isErr()).toBe(true);
    });

    it('测试验证执行脚本动作配置：所有字段可选', () => {
      const config = {
        scriptName: 'test-script'
        // 其他参数未设置
      };

      const result = validateExecuteScriptActionConfig(config);

      expect(result.isOk()).toBe(true);
    });
  });
});