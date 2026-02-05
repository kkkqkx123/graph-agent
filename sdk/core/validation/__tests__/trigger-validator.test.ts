/**
 * Trigger验证器单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateTriggerCondition,
  validateExecuteTriggeredSubgraphActionConfig,
  validateTriggerAction,
  validateWorkflowTrigger,
  validateTriggerReference,
  validateTriggers
} from '../trigger-validator';
import { EventType } from '../../../types/events';
import { TriggerActionType } from '../../../types/trigger';
import { ValidationError } from '../../../types/errors';

describe('validateTriggerCondition', () => {
  it('应该验证有效的触发条件', () => {
    const validCondition = {
      eventType: EventType.NODE_STARTED,
      metadata: { key: 'value' }
    };

    expect(() => validateTriggerCondition(validCondition)).not.toThrow();
  });

  it('应该验证只有必填字段的触发条件', () => {
    const minimalCondition = {
      eventType: EventType.THREAD_COMPLETED
    };

    expect(() => validateTriggerCondition(minimalCondition)).not.toThrow();
  });

  it('应该拒绝无效的eventType', () => {
    const invalidCondition = {
      eventType: 'INVALID_EVENT' as any
    };

    expect(() => validateTriggerCondition(invalidCondition)).toThrow(ValidationError);
  });

  it('应该拒绝NODE_CUSTOM_EVENT缺少eventName', () => {
    const invalidCondition = {
      eventType: EventType.NODE_CUSTOM_EVENT
    };

    expect(() => validateTriggerCondition(invalidCondition)).toThrow(ValidationError);
    expect(() => validateTriggerCondition(invalidCondition)).toThrow('eventName is required when eventType is NODE_CUSTOM_EVENT');
  });

  it('应该接受NODE_CUSTOM_EVENT包含eventName', () => {
    const validCondition = {
      eventType: EventType.NODE_CUSTOM_EVENT,
      eventName: 'custom-event-name'
    };

    expect(() => validateTriggerCondition(validCondition)).not.toThrow();
  });

  it('应该接受非NODE_CUSTOM_EVENT不包含eventName', () => {
    const validCondition = {
      eventType: EventType.NODE_STARTED
    };

    expect(() => validateTriggerCondition(validCondition)).not.toThrow();
  });

  it('应该接受复杂的metadata', () => {
    const validCondition = {
      eventType: EventType.NODE_COMPLETED,
      metadata: {
        nested: {
          array: [1, 2, 3],
          string: 'value',
          boolean: true,
          null: null
        }
      }
    };

    expect(() => validateTriggerCondition(validCondition)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidCondition = {
      eventType: EventType.NODE_CUSTOM_EVENT
    };

    try {
      validateTriggerCondition(invalidCondition);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('condition.eventName');
    }
  });
});

describe('validateExecuteTriggeredSubgraphActionConfig', () => {
  it('应该验证有效的触发子工作流配置', () => {
    const validConfig = {
      triggeredWorkflowId: 'workflow-123',
      waitForCompletion: true
    };

    expect(() => validateExecuteTriggeredSubgraphActionConfig(validConfig)).not.toThrow();
  });

  it('应该验证只有必填字段的配置', () => {
    const minimalConfig = {
      triggeredWorkflowId: 'workflow-456'
    };

    expect(() => validateExecuteTriggeredSubgraphActionConfig(minimalConfig)).not.toThrow();
  });

  it('应该拒绝缺少triggeredWorkflowId', () => {
    const invalidConfig = {
      waitForCompletion: false
    } as any;

    expect(() => validateExecuteTriggeredSubgraphActionConfig(invalidConfig)).toThrow(ValidationError);
  });

  it('应该拒绝空的triggeredWorkflowId', () => {
    const invalidConfig = {
      triggeredWorkflowId: ''
    };

    expect(() => validateExecuteTriggeredSubgraphActionConfig(invalidConfig)).toThrow(ValidationError);
    expect(() => validateExecuteTriggeredSubgraphActionConfig(invalidConfig)).toThrow('Triggered workflow ID is required');
  });

  it('应该接受waitForCompletion为false', () => {
    const validConfig = {
      triggeredWorkflowId: 'workflow-789',
      waitForCompletion: false
    };

    expect(() => validateExecuteTriggeredSubgraphActionConfig(validConfig)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidConfig = {
      triggeredWorkflowId: ''
    };

    try {
      validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('action.parameters.triggeredWorkflowId');
    }
  });
});

describe('validateTriggerAction', () => {
  it('应该验证有效的触发动作', () => {
    const validAction = {
      type: TriggerActionType.START_WORKFLOW,
      parameters: { workflowId: 'workflow-123' },
      metadata: { key: 'value' }
    };

    expect(() => validateTriggerAction(validAction)).not.toThrow();
  });

  it('应该验证只有必填字段的触发动作', () => {
    const minimalAction = {
      type: TriggerActionType.STOP_THREAD,
      parameters: {}
    };

    expect(() => validateTriggerAction(minimalAction)).not.toThrow();
  });

  it('应该拒绝无效的action type', () => {
    const invalidAction = {
      type: 'INVALID_ACTION' as any,
      parameters: {}
    };

    expect(() => validateTriggerAction(invalidAction)).toThrow(ValidationError);
  });

  it('应该拒绝缺少parameters', () => {
    const invalidAction = {
      type: TriggerActionType.START_WORKFLOW
    } as any;

    expect(() => validateTriggerAction(invalidAction)).toThrow(ValidationError);
  });

  it('应该验证EXECUTE_TRIGGERED_SUBGRAPH动作', () => {
    const validAction = {
      type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
      parameters: {
        triggeredWorkflowId: 'workflow-123',
        waitForCompletion: true
      }
    };

    expect(() => validateTriggerAction(validAction)).not.toThrow();
  });

  it('应该拒绝EXECUTE_TRIGGERED_SUBGRAPH缺少triggeredWorkflowId', () => {
    const invalidAction = {
      type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
      parameters: {
        waitForCompletion: true
      }
    };

    expect(() => validateTriggerAction(invalidAction)).toThrow(ValidationError);
  });

  it('应该接受复杂的parameters', () => {
    const validAction = {
      type: TriggerActionType.SET_VARIABLE,
      parameters: {
        variableName: 'status',
        value: 'completed',
        metadata: {
          timestamp: Date.now(),
          source: 'trigger'
        }
      }
    };

    expect(() => validateTriggerAction(validAction)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidAction = {
      type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
      parameters: {
        triggeredWorkflowId: ''
      }
    };

    try {
      validateTriggerAction(invalidAction);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('action.parameters.triggeredWorkflowId');
    }
  });
});

describe('validateWorkflowTrigger', () => {
  it('应该验证有效的WorkflowTrigger', () => {
    const validTrigger = {
      id: 'trigger-1',
      name: 'Test Trigger',
      description: 'A test trigger',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: { workflowId: 'workflow-123' }
      },
      enabled: true,
      maxTriggers: 10,
      metadata: { key: 'value' }
    };

    expect(() => validateWorkflowTrigger(validTrigger)).not.toThrow();
  });

  it('应该验证只有必填字段的WorkflowTrigger', () => {
    const minimalTrigger = {
      id: 'trigger-2',
      name: 'Minimal Trigger',
      condition: {
        eventType: EventType.THREAD_COMPLETED
      },
      action: {
        type: TriggerActionType.STOP_THREAD,
        parameters: {}
      }
    };

    expect(() => validateWorkflowTrigger(minimalTrigger)).not.toThrow();
  });

  it('应该拒绝缺少id', () => {
    const invalidTrigger = {
      name: 'Invalid Trigger',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      }
    } as any;

    expect(() => validateWorkflowTrigger(invalidTrigger)).toThrow(ValidationError);
  });

  it('应该拒绝空的id', () => {
    const invalidTrigger = {
      id: '',
      name: 'Invalid Trigger',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      }
    };

    expect(() => validateWorkflowTrigger(invalidTrigger)).toThrow(ValidationError);
    expect(() => validateWorkflowTrigger(invalidTrigger)).toThrow('Trigger ID is required');
  });

  it('应该拒绝缺少name', () => {
    const invalidTrigger = {
      id: 'trigger-3',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      }
    } as any;

    expect(() => validateWorkflowTrigger(invalidTrigger)).toThrow(ValidationError);
  });

  it('应该拒绝负数的maxTriggers', () => {
    const invalidTrigger = {
      id: 'trigger-4',
      name: 'Invalid Trigger',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      },
      maxTriggers: -1
    };

    expect(() => validateWorkflowTrigger(invalidTrigger)).toThrow(ValidationError);
    expect(() => validateWorkflowTrigger(invalidTrigger)).toThrow('Max triggers must be a non-negative integer');
  });

  it('应该接受maxTriggers为0（无限制）', () => {
    const validTrigger = {
      id: 'trigger-5',
      name: 'Valid Trigger',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      },
      maxTriggers: 0
    };

    expect(() => validateWorkflowTrigger(validTrigger)).not.toThrow();
  });

  it('应该接受enabled为false', () => {
    const validTrigger = {
      id: 'trigger-6',
      name: 'Disabled Trigger',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      },
      enabled: false
    };

    expect(() => validateWorkflowTrigger(validTrigger)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidTrigger = {
      id: '',
      name: 'Invalid Trigger',
      condition: {
        eventType: EventType.NODE_STARTED
      },
      action: {
        type: TriggerActionType.START_WORKFLOW,
        parameters: {}
      }
    };

    try {
      validateWorkflowTrigger(invalidTrigger);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('triggers.id');
    }
  });
});

describe('validateTriggerReference', () => {
  it('应该验证有效的TriggerReference', () => {
    const validReference = {
      templateName: 'template-1',
      triggerId: 'trigger-ref-1',
      triggerName: 'Custom Trigger Name',
      configOverride: {
        enabled: false,
        maxTriggers: 5
      }
    };

    expect(() => validateTriggerReference(validReference)).not.toThrow();
  });

  it('应该验证只有必填字段的TriggerReference', () => {
    const minimalReference = {
      templateName: 'template-2',
      triggerId: 'trigger-ref-2'
    };

    expect(() => validateTriggerReference(minimalReference)).not.toThrow();
  });

  it('应该拒绝缺少templateName', () => {
    const invalidReference = {
      triggerId: 'trigger-ref-3'
    } as any;

    expect(() => validateTriggerReference(invalidReference)).toThrow(ValidationError);
  });

  it('应该拒绝空的templateName', () => {
    const invalidReference = {
      templateName: '',
      triggerId: 'trigger-ref-4'
    };

    expect(() => validateTriggerReference(invalidReference)).toThrow(ValidationError);
    expect(() => validateTriggerReference(invalidReference)).toThrow('Template name is required');
  });

  it('应该拒绝缺少triggerId', () => {
    const invalidReference = {
      templateName: 'template-3'
    } as any;

    expect(() => validateTriggerReference(invalidReference)).toThrow(ValidationError);
  });

  it('应该接受configOverride中的condition覆盖', () => {
    const validReference = {
      templateName: 'template-4',
      triggerId: 'trigger-ref-5',
      configOverride: {
        condition: {
          eventType: EventType.NODE_CUSTOM_EVENT,
          eventName: 'custom-event'
        }
      }
    };

    expect(() => validateTriggerReference(validReference)).not.toThrow();
  });

  it('应该接受configOverride中的action覆盖', () => {
    const validReference = {
      templateName: 'template-5',
      triggerId: 'trigger-ref-6',
      configOverride: {
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: { workflowId: 'new-workflow' }
        }
      }
    };

    expect(() => validateTriggerReference(validReference)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidReference = {
      templateName: '',
      triggerId: 'trigger-ref-7'
    };

    try {
      validateTriggerReference(invalidReference);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('triggers.templateName');
    }
  });
});

describe('validateTriggers', () => {
  it('应该验证有效的触发器数组', () => {
    const validTriggers = [
      {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      {
        templateName: 'template-1',
        triggerId: 'trigger-ref-1'
      }
    ];

    expect(() => validateTriggers(validTriggers)).not.toThrow();
  });

  it('应该验证空触发器数组', () => {
    expect(() => validateTriggers([])).not.toThrow();
  });

  it('应该拒绝非数组的triggers', () => {
    expect(() => validateTriggers(null as any)).toThrow(ValidationError);
    expect(() => validateTriggers(null as any)).toThrow('Triggers must be an array');
  });

  it('应该拒绝undefined的triggers', () => {
    expect(() => validateTriggers(undefined as any)).toThrow(ValidationError);
    expect(() => validateTriggers(undefined as any)).toThrow('Triggers must be an array');
  });

  it('应该拒绝对象类型的triggers', () => {
    expect(() => validateTriggers({} as any)).toThrow(ValidationError);
    expect(() => validateTriggers({} as any)).toThrow('Triggers must be an array');
  });

  it('应该拒绝字符串类型的triggers', () => {
    expect(() => validateTriggers('invalid' as any)).toThrow(ValidationError);
    expect(() => validateTriggers('invalid' as any)).toThrow('Triggers must be an array');
  });

  it('应该跳过数组中的null元素', () => {
    const triggersWithNull = [
      {
        id: 'trigger-1',
        name: 'Valid Trigger',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      null as any,
      {
        templateName: 'template-1',
        triggerId: 'trigger-ref-1'
      }
    ];

    expect(() => validateTriggers(triggersWithNull)).not.toThrow();
  });

  it('应该跳过数组中的undefined元素', () => {
    const triggersWithUndefined = [
      {
        id: 'trigger-1',
        name: 'Valid Trigger',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      undefined as any,
      {
        templateName: 'template-1',
        triggerId: 'trigger-ref-1'
      }
    ];

    expect(() => validateTriggers(triggersWithUndefined)).not.toThrow();
  });

  it('应该拒绝重复的触发器ID', () => {
    const triggersWithDuplicateId = [
      {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      {
        id: 'trigger-1',
        name: 'Trigger 2',
        condition: {
          eventType: EventType.THREAD_COMPLETED
        },
        action: {
          type: TriggerActionType.STOP_THREAD,
          parameters: {}
        }
      }
    ];

    expect(() => validateTriggers(triggersWithDuplicateId)).toThrow(ValidationError);
    expect(() => validateTriggers(triggersWithDuplicateId)).toThrow('Trigger ID must be unique: trigger-1');
  });

  it('应该拒绝WorkflowTrigger和TriggerReference之间的重复ID', () => {
    const triggersWithDuplicateId = [
      {
        id: 'trigger-1',
        name: 'Workflow Trigger',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      {
        templateName: 'template-1',
        triggerId: 'trigger-1'
      }
    ];

    expect(() => validateTriggers(triggersWithDuplicateId)).toThrow(ValidationError);
    expect(() => validateTriggers(triggersWithDuplicateId)).toThrow('Trigger ID must be unique: trigger-1');
  });

  it('应该拒绝数组中包含无效的触发器', () => {
    const invalidTriggers = [
      {
        id: 'trigger-1',
        name: 'Valid Trigger',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      {
        id: '',
        name: 'Invalid Trigger',
        condition: {
          eventType: EventType.THREAD_COMPLETED
        },
        action: {
          type: TriggerActionType.STOP_THREAD,
          parameters: {}
        }
      }
    ];

    expect(() => validateTriggers(invalidTriggers)).toThrow(ValidationError);
  });

  it('应该验证包含多个触发器的数组', () => {
    const multipleTriggers = [
      {
        id: 'trigger-1',
        name: 'Trigger 1',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      {
        id: 'trigger-2',
        name: 'Trigger 2',
        condition: {
          eventType: EventType.THREAD_COMPLETED
        },
        action: {
          type: TriggerActionType.STOP_THREAD,
          parameters: {}
        }
      },
      {
        templateName: 'template-1',
        triggerId: 'trigger-ref-1'
      },
      {
        templateName: 'template-2',
        triggerId: 'trigger-ref-2'
      }
    ];

    expect(() => validateTriggers(multipleTriggers)).not.toThrow();
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidTriggers = [
      {
        id: 'trigger-1',
        name: 'Valid Trigger',
        condition: {
          eventType: EventType.NODE_STARTED
        },
        action: {
          type: TriggerActionType.START_WORKFLOW,
          parameters: {}
        }
      },
      {
        id: '',
        name: 'Invalid Trigger',
        condition: {
          eventType: EventType.THREAD_COMPLETED
        },
        action: {
          type: TriggerActionType.STOP_THREAD,
          parameters: {}
        }
      }
    ];

    try {
      validateTriggers(invalidTriggers);
      fail('应该抛出ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe('triggers[1].id');
    }
  });
});