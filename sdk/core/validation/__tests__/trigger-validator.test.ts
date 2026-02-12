/**
 * Trigger验证器单元测试
 * 使用Result类型进行错误处理
 */

import {
  validateTriggerCondition,
  validateExecuteTriggeredSubgraphActionConfig,
  validateTriggerAction,
  validateWorkflowTrigger,
  validateTriggerReference,
  validateTriggers
} from '../trigger-validator';
import { EventType } from '@modular-agent/types/events';
import { TriggerActionType } from '@modular-agent/types/trigger';
import { ValidationError } from '@modular-agent/types/errors';
import { LLMMessageRole } from '@modular-agent/types/llm';

describe('validateTriggerCondition', () => {
  it('应该验证有效的触发条件', () => {
    const validCondition = {
      eventType: EventType.NODE_STARTED,
      metadata: { key: 'value' }
    };

    const result = validateTriggerCondition(validCondition);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validCondition);
  });

  it('应该验证只有必填字段的触发条件', () => {
    const minimalCondition = {
      eventType: EventType.THREAD_COMPLETED
    };

    const result = validateTriggerCondition(minimalCondition);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(minimalCondition);
  });

  it('应该拒绝无效的eventType', () => {
    const invalidCondition = {
      eventType: 'INVALID_EVENT' as any
    };

    const result = validateTriggerCondition(invalidCondition);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('应该拒绝NODE_CUSTOM_EVENT缺少eventName', () => {
    const invalidCondition = {
      eventType: EventType.NODE_CUSTOM_EVENT
    };

    const result = validateTriggerCondition(invalidCondition);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('eventName is required when eventType is NODE_CUSTOM_EVENT');
    }
  });

  it('应该接受NODE_CUSTOM_EVENT包含eventName', () => {
    const validCondition = {
      eventType: EventType.NODE_CUSTOM_EVENT,
      eventName: 'custom-event-name'
    };

    const result = validateTriggerCondition(validCondition);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validCondition);
  });

  it('应该接受非NODE_CUSTOM_EVENT不包含eventName', () => {
    const validCondition = {
      eventType: EventType.NODE_STARTED
    };

    const result = validateTriggerCondition(validCondition);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validCondition);
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

    const result = validateTriggerCondition(validCondition);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validCondition);
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidCondition = {
      eventType: EventType.NODE_CUSTOM_EVENT
    };

    const result = validateTriggerCondition(invalidCondition);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.field).toBe('condition.eventName');
    }
  });
});

describe('validateExecuteTriggeredSubgraphActionConfig', () => {
  it('应该验证有效的触发子工作流配置', () => {
    const validConfig = {
      triggeredWorkflowId: 'workflow-123',
      waitForCompletion: true
    };

    const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validConfig);
  });

  it('应该验证只有必填字段的配置', () => {
    const minimalConfig = {
      triggeredWorkflowId: 'workflow-456'
    };

    const result = validateExecuteTriggeredSubgraphActionConfig(minimalConfig);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(minimalConfig);
  });

  it('应该拒绝缺少triggeredWorkflowId', () => {
    const invalidConfig = {
      waitForCompletion: false
    } as any;

    const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
    expect(result.isErr()).toBe(true);
  });

  it('应该拒绝空的triggeredWorkflowId', () => {
    const invalidConfig = {
      triggeredWorkflowId: ''
    };

    const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Triggered workflow ID is required');
    }
  });

  it('应该接受waitForCompletion为false', () => {
    const validConfig = {
      triggeredWorkflowId: 'workflow-789',
      waitForCompletion: false
    };

    const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validConfig);
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidConfig = {
      triggeredWorkflowId: ''
    };

    const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.field).toBe('action.parameters.triggeredWorkflowId');
    }
  });

  describe('ConversationHistoryOptions验证', () => {
    it('应该接受lastN配置', () => {
      const validConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            lastN: 5
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该接受lastNByRole配置', () => {
      const validConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            lastNByRole: {
              role: 'assistant' as LLMMessageRole,
              count: 3
            }
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该接受byRole配置', () => {
      const validConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            byRole: 'user' as LLMMessageRole
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该接受range配置', () => {
      const validConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            range: {
              start: 0,
              end: 10
            }
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该接受rangeByRole配置', () => {
      const validConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            rangeByRole: {
              role: 'assistant' as LLMMessageRole,
              start: 0,
              end: 5
            }
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该拒绝空的ConversationHistoryOptions', () => {
      const invalidConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {}
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
    });

    it('应该拒绝lastN为负数', () => {
      const invalidConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            lastN: -1
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
    });

    it('应该拒绝lastN为零', () => {
      const invalidConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            lastN: 0
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
    });

    it('应该拒绝无效的角色', () => {
      const invalidConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            byRole: 'invalid_role' as any
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
    });

    it('应该拒绝range中start大于等于end', () => {
      const invalidConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            range: {
              start: 10,
              end: 5
            }
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
    });

    it('应该拒绝range中start为负数', () => {
      const invalidConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeConversationHistory: {
            range: {
              start: -1,
              end: 10
            }
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
    });

    it('应该接受完整的mergeOptions配置', () => {
      const validConfig = {
        triggeredWorkflowId: 'workflow-123',
        mergeOptions: {
          includeVariables: ['var1', 'var2'],
          includeConversationHistory: {
            lastN: 5
          }
        }
      };

      const result = validateExecuteTriggeredSubgraphActionConfig(validConfig);
      expect(result.isOk()).toBe(true);
    });
  });
});

describe('validateTriggerAction', () => {
  it('应该验证有效的触发动作', () => {
    const validAction = {
      type: TriggerActionType.START_WORKFLOW,
      parameters: { workflowId: 'workflow-123' },
      metadata: { key: 'value' }
    };

    const result = validateTriggerAction(validAction);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validAction);
  });

  it('应该验证只有必填字段的触发动作', () => {
    const minimalAction = {
      type: TriggerActionType.STOP_THREAD,
      parameters: {}
    };

    const result = validateTriggerAction(minimalAction);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(minimalAction);
  });

  it('应该拒绝无效的action type', () => {
    const invalidAction = {
      type: 'INVALID_ACTION' as any,
      parameters: {}
    };

    const result = validateTriggerAction(invalidAction);
    expect(result.isErr()).toBe(true);
  });

  it('应该拒绝缺少parameters', () => {
    const invalidAction = {
      type: TriggerActionType.START_WORKFLOW
    } as any;

    const result = validateTriggerAction(invalidAction);
    expect(result.isErr()).toBe(true);
  });

  it('应该验证EXECUTE_TRIGGERED_SUBGRAPH动作', () => {
    const validAction = {
      type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
      parameters: {
        triggeredWorkflowId: 'workflow-123',
        waitForCompletion: true
      }
    };

    const result = validateTriggerAction(validAction);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validAction);
  });

  it('应该拒绝EXECUTE_TRIGGERED_SUBGRAPH缺少triggeredWorkflowId', () => {
    const invalidAction = {
      type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
      parameters: {
        waitForCompletion: true
      }
    };

    const result = validateTriggerAction(invalidAction);
    expect(result.isErr()).toBe(true);
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

    const result = validateTriggerAction(validAction);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validAction);
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidAction = {
      type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
      parameters: {
        triggeredWorkflowId: ''
      }
    };

    const result = validateTriggerAction(invalidAction);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.field).toBe('action.parameters.triggeredWorkflowId');
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

    const result = validateWorkflowTrigger(validTrigger);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validTrigger);
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

    const result = validateWorkflowTrigger(minimalTrigger);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(minimalTrigger);
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

    const result = validateWorkflowTrigger(invalidTrigger);
    expect(result.isErr()).toBe(true);
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

    const result = validateWorkflowTrigger(invalidTrigger);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Trigger ID is required');
    }
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

    const result = validateWorkflowTrigger(invalidTrigger);
    expect(result.isErr()).toBe(true);
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

    const result = validateWorkflowTrigger(invalidTrigger);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Max triggers must be a non-negative integer');
    }
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

    const result = validateWorkflowTrigger(validTrigger);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validTrigger);
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

    const result = validateWorkflowTrigger(validTrigger);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validTrigger);
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

    const result = validateWorkflowTrigger(invalidTrigger);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.field).toBe('triggers.id');
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

    const result = validateTriggerReference(validReference);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validReference);
  });

  it('应该验证只有必填字段的TriggerReference', () => {
    const minimalReference = {
      templateName: 'template-2',
      triggerId: 'trigger-ref-2'
    };

    const result = validateTriggerReference(minimalReference);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(minimalReference);
  });

  it('应该拒绝缺少templateName', () => {
    const invalidReference = {
      triggerId: 'trigger-ref-3'
    } as any;

    const result = validateTriggerReference(invalidReference);
    expect(result.isErr()).toBe(true);
  });

  it('应该拒绝空的templateName', () => {
    const invalidReference = {
      templateName: '',
      triggerId: 'trigger-ref-4'
    };

    const result = validateTriggerReference(invalidReference);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Template name is required');
    }
  });

  it('应该拒绝缺少triggerId', () => {
    const invalidReference = {
      templateName: 'template-3'
    } as any;

    const result = validateTriggerReference(invalidReference);
    expect(result.isErr()).toBe(true);
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

    const result = validateTriggerReference(validReference);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validReference);
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

    const result = validateTriggerReference(validReference);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validReference);
  });

  it('应该在错误消息中包含正确的字段路径', () => {
    const invalidReference = {
      templateName: '',
      triggerId: 'trigger-ref-7'
    };

    const result = validateTriggerReference(invalidReference);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.field).toBe('triggers.templateName');
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

    const result = validateTriggers(validTriggers);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(validTriggers);
  });

  it('应该验证空触发器数组', () => {
    const result = validateTriggers([]);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([]);
  });

  it('应该拒绝非数组的triggers', () => {
    const result = validateTriggers(null as any);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Triggers must be an array');
    }
  });

  it('应该拒绝undefined的triggers', () => {
    const result = validateTriggers(undefined as any);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Triggers must be an array');
    }
  });

  it('应该拒绝对象类型的triggers', () => {
    const result = validateTriggers({} as any);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Triggers must be an array');
    }
  });

  it('应该拒绝字符串类型的triggers', () => {
    const result = validateTriggers('invalid' as any);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      if (errors.length > 0) {
        const firstError = errors[0] as ValidationError;
        expect(firstError.message).toContain('Triggers must be an array');
      }
    }
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

    const result = validateTriggers(triggersWithNull);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(triggersWithNull);
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

    const result = validateTriggers(triggersWithUndefined);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(triggersWithUndefined);
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

    const result = validateTriggers(triggersWithDuplicateId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      const firstError = errors[0] as ValidationError;
      expect(firstError.message).toContain('Trigger ID must be unique: trigger-1');
    }
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

    const result = validateTriggers(triggersWithDuplicateId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      if (errors.length > 0) {
        const firstError = errors[0] as ValidationError;
        expect(firstError.message).toContain('Trigger ID must be unique: trigger-1');
      }
    }
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

    const result = validateTriggers(invalidTriggers);
    expect(result.isErr()).toBe(true);
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

    const result = validateTriggers(multipleTriggers);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(multipleTriggers);
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

    const result = validateTriggers(invalidTriggers);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const errors = result.error;
      expect(errors.length).toBeGreaterThan(0);
      if (errors.length > 0) {
        const firstError = errors[0] as ValidationError;
        expect(firstError.field).toBe('triggers[1].id');
      }
    }
  });
});