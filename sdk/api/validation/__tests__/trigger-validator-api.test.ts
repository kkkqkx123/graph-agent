/**
 * TriggerValidatorAPI测试用例
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TriggerValidatorAPI } from '../trigger-validator-api';
import { EventType } from '../../../types/events';
import { TriggerActionType } from '../../../types/trigger';
import type {
  TriggerCondition,
  TriggerAction,
  ExecuteTriggeredSubgraphActionConfig,
  WorkflowTrigger
} from '../../../types/trigger';
import type { TriggerReference } from '../../../types/trigger-template';

describe('TriggerValidatorAPI', () => {
  let validatorAPI: TriggerValidatorAPI;

  beforeEach(() => {
    validatorAPI = new TriggerValidatorAPI();
  });

  describe('validateTriggerCondition', () => {
    it('应该验证有效的触发条件', async () => {
      const validCondition: TriggerCondition = {
        eventType: EventType.NODE_STARTED,
        metadata: { key: 'value' }
      };

      const result = await validatorAPI.validateTriggerCondition(validCondition);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝无效的eventType', async () => {
      const invalidCondition = {
        eventType: 'INVALID_EVENT' as any
      };

      const result = await validatorAPI.validateTriggerCondition(invalidCondition);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝NODE_CUSTOM_EVENT缺少eventName', async () => {
      const invalidCondition: TriggerCondition = {
        eventType: EventType.NODE_CUSTOM_EVENT
      };

      const result = await validatorAPI.validateTriggerCondition(invalidCondition);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateExecuteTriggeredSubgraphActionConfig', () => {
    it('应该验证有效的触发子工作流配置', async () => {
      const validConfig: ExecuteTriggeredSubgraphActionConfig = {
        triggeredWorkflowId: 'workflow-123',
        waitForCompletion: true
      };

      const result = await validatorAPI.validateExecuteTriggeredSubgraphActionConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少triggeredWorkflowId', async () => {
      const invalidConfig = {
        waitForCompletion: false
      } as any;

      const result = await validatorAPI.validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝空的triggeredWorkflowId', async () => {
      const invalidConfig: ExecuteTriggeredSubgraphActionConfig = {
        triggeredWorkflowId: ''
      };

      const result = await validatorAPI.validateExecuteTriggeredSubgraphActionConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTriggerAction', () => {
    it('应该验证有效的触发动作', async () => {
      const validAction: TriggerAction = {
        type: TriggerActionType.START_WORKFLOW,
        parameters: { workflowId: 'workflow-123' },
        metadata: { key: 'value' }
      };

      const result = await validatorAPI.validateTriggerAction(validAction);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝无效的action type', async () => {
      const invalidAction = {
        type: 'INVALID_ACTION' as any,
        parameters: {}
      };

      const result = await validatorAPI.validateTriggerAction(invalidAction);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺少parameters', async () => {
      const invalidAction = {
        type: TriggerActionType.START_WORKFLOW
      } as any;

      const result = await validatorAPI.validateTriggerAction(invalidAction);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该验证EXECUTE_TRIGGERED_SUBGRAPH动作', async () => {
      const validAction: TriggerAction = {
        type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
        parameters: {
          triggeredWorkflowId: 'workflow-123',
          waitForCompletion: true
        }
      };

      const result = await validatorAPI.validateTriggerAction(validAction);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝EXECUTE_TRIGGERED_SUBGRAPH缺少triggeredWorkflowId', async () => {
      const invalidAction: TriggerAction = {
        type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
        parameters: {
          waitForCompletion: true
        }
      };

      const result = await validatorAPI.validateTriggerAction(invalidAction);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateWorkflowTrigger', () => {
    it('应该验证有效的WorkflowTrigger', async () => {
      const validTrigger: WorkflowTrigger = {
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

      const result = await validatorAPI.validateWorkflowTrigger(validTrigger);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少id', async () => {
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

      const result = await validatorAPI.validateWorkflowTrigger(invalidTrigger);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝空的id', async () => {
      const invalidTrigger: WorkflowTrigger = {
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

      const result = await validatorAPI.validateWorkflowTrigger(invalidTrigger);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺少name', async () => {
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

      const result = await validatorAPI.validateWorkflowTrigger(invalidTrigger);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝负数的maxTriggers', async () => {
      const invalidTrigger: WorkflowTrigger = {
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

      const result = await validatorAPI.validateWorkflowTrigger(invalidTrigger);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTriggerReference', () => {
    it('应该验证有效的TriggerReference', async () => {
      const validReference: TriggerReference = {
        templateName: 'template-1',
        triggerId: 'trigger-ref-1',
        triggerName: 'Custom Trigger Name',
        configOverride: {
          enabled: false,
          maxTriggers: 5
        }
      };

      const result = await validatorAPI.validateTriggerReference(validReference);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少templateName', async () => {
      const invalidReference = {
        triggerId: 'trigger-ref-3'
      } as any;

      const result = await validatorAPI.validateTriggerReference(invalidReference);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝空的templateName', async () => {
      const invalidReference: TriggerReference = {
        templateName: '',
        triggerId: 'trigger-ref-4'
      };

      const result = await validatorAPI.validateTriggerReference(invalidReference);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺少triggerId', async () => {
      const invalidReference = {
        templateName: 'template-3'
      } as any;

      const result = await validatorAPI.validateTriggerReference(invalidReference);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTriggers', () => {
    it('应该验证有效的触发器数组', async () => {
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

      const result = await validatorAPI.validateTriggers(validTriggers);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证空触发器数组', async () => {
      const result = await validatorAPI.validateTriggers([]);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝非数组的triggers', async () => {
      const result = await validatorAPI.validateTriggers(null as any);
      expect(result.valid).toBe(false);
    });

    it('应该拒绝undefined的triggers', async () => {
      const result = await validatorAPI.validateTriggers(undefined as any);
      expect(result.valid).toBe(false);
    });

    it('应该拒绝重复的触发器ID', async () => {
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

      const result = await validatorAPI.validateTriggers(triggersWithDuplicateId);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTriggersBatch', () => {
    it('应该验证有效的触发器数组', async () => {
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

      const result = await validatorAPI.validateTriggersBatch(validTriggers);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该返回所有错误的触发器', async () => {
      const invalidTriggers: any[] = [
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
          id: '',
          name: 'Invalid Trigger',
          condition: {
            eventType: EventType.THREAD_COMPLETED
          },
          action: {
            type: TriggerActionType.STOP_THREAD,
            parameters: {}
          }
        },
        {
          templateName: '',
          triggerId: 'trigger-ref-1'
        }
      ];

      const result = await validatorAPI.validateTriggersBatch(invalidTriggers);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('应该跳过null的触发器', async () => {
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

      const result = await validatorAPI.validateTriggersBatch(triggersWithNull);
      expect(result.valid).toBe(true);
    });

    it('应该跳过undefined的触发器', async () => {
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

      const result = await validatorAPI.validateTriggersBatch(triggersWithUndefined);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝非数组的triggers', async () => {
      const result = await validatorAPI.validateTriggersBatch(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });

    it('应该检测重复的触发器ID', async () => {
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

      const result = await validatorAPI.validateTriggersBatch(triggersWithDuplicateId);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('Trigger ID must be unique');
    });

    it('应该检测WorkflowTrigger和TriggerReference之间的重复ID', async () => {
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

      const result = await validatorAPI.validateTriggersBatch(triggersWithDuplicateId);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('Trigger ID must be unique');
    });
  });
});