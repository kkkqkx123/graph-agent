/**
 * WorkflowRegistry Trigger集成测试
 * 测试workflow与trigger的集成功能
 */

import { WorkflowRegistry } from '../workflow-registry';
import { TriggerManager } from '../../execution/managers/trigger-manager';
import type { WorkflowDefinition } from '../../../types/workflow';
import type { WorkflowTrigger } from '../../../types/trigger';
import { NodeType, EdgeType } from '../../../types';
import { EventType, TriggerActionType, TriggerStatus } from '../../../types';

describe('WorkflowRegistry - Trigger集成', () => {
  let workflowRegistry: WorkflowRegistry;
  let triggerManager: TriggerManager;

  beforeEach(() => {
    triggerManager = new TriggerManager();
    workflowRegistry = new WorkflowRegistry({
      enableVersioning: false,
      enablePreprocessing: false,
      triggerManager
    });
  });

  afterEach(() => {
    workflowRegistry.clear();
    triggerManager.clear();
  });

  describe('注册workflow时自动注册triggers', () => {
    it('应该成功注册包含triggers的workflow', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Test Trigger 1',
          description: 'Test trigger 1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {
              recipient: 'test@example.com',
              subject: 'Test'
            }
          },
          enabled: true
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);

      // 验证workflow已注册
      expect(workflowRegistry.has('workflow-1')).toBe(true);

      // 验证triggers已注册到TriggerManager
      const trigger = triggerManager.get('trigger-1');
      expect(trigger).toBeDefined();
      expect(trigger?.name).toBe('Test Trigger 1');
      expect(trigger?.workflowId).toBe('workflow-1');
      expect(trigger?.status).toBe(TriggerStatus.ENABLED);
    });

    it('应该正确设置trigger的初始状态', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Disabled Trigger',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          enabled: false
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);

      const trigger = triggerManager.get('trigger-1');
      expect(trigger?.status).toBe(TriggerStatus.DISABLED);
    });

    it('应该正确设置trigger的maxTriggers', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Limited Trigger',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          maxTriggers: 5
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);

      const trigger = triggerManager.get('trigger-1');
      expect(trigger?.maxTriggers).toBe(5);
      expect(trigger?.triggerCount).toBe(0);
    });
  });

  describe('注销workflow时自动注销triggers', () => {
    it('应该成功注销workflow及其triggers', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Test Trigger',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);
      expect(triggerManager.get('trigger-1')).toBeDefined();

      workflowRegistry.unregister('workflow-1');

      // 验证workflow已注销
      expect(workflowRegistry.has('workflow-1')).toBe(false);

      // 验证triggers已从TriggerManager注销
      expect(triggerManager.get('trigger-1')).toBeUndefined();
    });

    it('应该注销多个triggers', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        },
        {
          id: 'trigger-2',
          name: 'Trigger 2',
          condition: {
            eventType: EventType.NODE_FAILED
          },
          action: {
            type: TriggerActionType.SET_VARIABLE,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);
      expect(triggerManager.get('trigger-1')).toBeDefined();
      expect(triggerManager.get('trigger-2')).toBeDefined();

      workflowRegistry.unregister('workflow-1');

      expect(triggerManager.get('trigger-1')).toBeUndefined();
      expect(triggerManager.get('trigger-2')).toBeUndefined();
    });
  });

  describe('更新workflow时更新triggers', () => {
    it('应该更新workflow的triggers', () => {
      const initialTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Old Trigger',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: initialTriggers
      };

      workflowRegistry.register(workflow);
      expect(triggerManager.get('trigger-1')?.name).toBe('Old Trigger');

      const updatedTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'New Trigger',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        }
      ];

      const updatedWorkflow: WorkflowDefinition = {
        ...workflow,
        triggers: updatedTriggers,
        updatedAt: Date.now()
      };

      workflowRegistry.update(updatedWorkflow);

      expect(triggerManager.get('trigger-1')?.name).toBe('New Trigger');
    });

    it('应该移除不再存在的triggers', () => {
      const initialTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        },
        {
          id: 'trigger-2',
          name: 'Trigger 2',
          condition: {
            eventType: EventType.NODE_FAILED
          },
          action: {
            type: TriggerActionType.SET_VARIABLE,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: initialTriggers
      };

      workflowRegistry.register(workflow);
      expect(triggerManager.get('trigger-1')).toBeDefined();
      expect(triggerManager.get('trigger-2')).toBeDefined();

      const updatedWorkflow: WorkflowDefinition = {
        ...workflow,
        triggers: initialTriggers.slice(0, 1),
        updatedAt: Date.now()
      };

      workflowRegistry.update(updatedWorkflow);

      expect(triggerManager.get('trigger-1')).toBeDefined();
      expect(triggerManager.get('trigger-2')).toBeUndefined();
    });
  });

  describe('getWorkflowTriggers方法', () => {
    it('应该返回workflow的triggers', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);

      const triggers = workflowRegistry.getWorkflowTriggers('workflow-1');
      expect(triggers).toHaveLength(1);
      expect(triggers[0]?.id).toBe('trigger-1');
    });

    it('应该为不存在的workflow返回空数组', () => {
      const triggers = workflowRegistry.getWorkflowTriggers('non-existent');
      expect(triggers).toEqual([]);
    });

    it('应该为没有triggers的workflow返回空数组', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };

      workflowRegistry.register(workflow);

      const triggers = workflowRegistry.getWorkflowTriggers('workflow-1');
      expect(triggers).toEqual([]);
    });
  });

  describe('hasWorkflowTriggers方法', () => {
    it('应该正确判断workflow是否有triggers', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);

      expect(workflowRegistry.hasWorkflowTriggers('workflow-1')).toBe(true);
    });

    it('应该为没有triggers的workflow返回false', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ]
      };

      workflowRegistry.register(workflow);

      expect(workflowRegistry.hasWorkflowTriggers('workflow-1')).toBe(false);
    });
  });

  describe('clear方法', () => {
    it('应该清理所有workflow和triggers', () => {
      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      workflowRegistry.register(workflow);
      expect(workflowRegistry.size()).toBe(1);
      expect(triggerManager.get('trigger-1')).toBeDefined();

      workflowRegistry.clear();

      expect(workflowRegistry.size()).toBe(0);
      expect(triggerManager.get('trigger-1')).toBeUndefined();
    });
  });

  describe('没有TriggerManager的情况', () => {
    it('应该在没有TriggerManager时正常工作', () => {
      const registryWithoutTriggerManager = new WorkflowRegistry({
        enableVersioning: false,
        enablePreprocessing: false
      });

      const workflowTriggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          }
        }
      ];

      const workflow: WorkflowDefinition = {
        id: 'workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: NodeType.START,
            config: {},
            incomingEdgeIds: [],
            outgoingEdgeIds: ['edge-1']
          },
          {
            id: 'node-2',
            name: 'End',
            type: NodeType.END,
            config: {},
            incomingEdgeIds: ['edge-1'],
            outgoingEdgeIds: []
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT,
            condition: undefined
          }
        ],
        triggers: workflowTriggers
      };

      // 应该不会抛出错误
      expect(() => registryWithoutTriggerManager.register(workflow)).not.toThrow();
      expect(registryWithoutTriggerManager.has('workflow-1')).toBe(true);
    });
  });
});