/**
 * 触发子工作流集成测试
 *
 * 测试范围：
 * - 触发子工作流的独立注册和验证
 * - 触发子工作流的结构约束（START_FROM_TRIGGER/CONTINUE_FROM_TRIGGER）
 * - 父工作流中触发器对子工作流的引用
 * - 触发子工作流的错误路径处理
 */

import { WorkflowRegistry } from '../../../core/services/workflow-registry';
import { WorkflowValidator } from '../../../core/validation/workflow-validator';
import { graphRegistry } from '../../../core/services/graph-registry';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import { TriggerActionType } from '../../../types/trigger';
import type { WorkflowDefinition } from '../../../types/workflow';
import { ValidationError } from '../../../types/errors';
import { EventType } from '../../../types';

describe('触发子工作流集成测试', () => {
  let registry: WorkflowRegistry;
  let validator: WorkflowValidator;

  beforeEach(() => {
    registry = new WorkflowRegistry({
      maxRecursionDepth: 10
    });
    validator = new WorkflowValidator();
    graphRegistry.clear();
  });

  afterEach(() => {
    graphRegistry.clear();
  });

  describe('场景1：触发子工作流的独立注册', () => {
    it('应该成功注册触发子工作流', () => {
      const triggeredWorkflow: WorkflowDefinition = {
        id: 'triggered-workflow-1',
        name: 'Triggered Workflow',
        version: '1.0.0',
        description: 'A workflow triggered by events',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'triggered-start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Start From Trigger',
            config: {},
            outgoingEdgeIds: ['trig-edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'triggered-process',
            type: NodeType.LLM,
            name: 'Triggered Process',
            config: {
              profileId: 'test-profile',
              prompt: 'Process triggered event'
            },
            outgoingEdgeIds: ['trig-edge-2'],
            incomingEdgeIds: ['trig-edge-1']
          },
          {
            id: 'triggered-end',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'Continue From Trigger',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['trig-edge-2']
          }
        ],
        edges: [
          {
            id: 'trig-edge-1',
            sourceNodeId: 'triggered-start',
            targetNodeId: 'triggered-process',
            type: EdgeType.DEFAULT
          },
          {
            id: 'trig-edge-2',
            sourceNodeId: 'triggered-process',
            targetNodeId: 'triggered-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          timeout: 30000,
          maxSteps: 500,
          toolApproval: {
            autoApprovedTools: []
          }
        },
        metadata: {
          author: 'test-author',
          tags: ['triggered', 'test'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 验证工作流定义
      const validationResult = validator.validate(triggeredWorkflow);
      expect(validationResult.isOk()).toBe(true);
      if (validationResult.isErr()) {
        expect(validationResult.error).toHaveLength(0);
      }

      // 注册工作流
      expect(() => registry.register(triggeredWorkflow)).not.toThrow();

      // 验证注册成功
      expect(registry.has('triggered-workflow-1')).toBe(true);
      const registered = registry.get('triggered-workflow-1');
      expect(registered).toBeDefined();
      expect(registered?.nodes.some(n => n.type === NodeType.START_FROM_TRIGGER)).toBe(true);
      expect(registered?.nodes.some(n => n.type === NodeType.CONTINUE_FROM_TRIGGER)).toBe(true);

      // 验证预处理结果
      const processed = registry.getProcessed('triggered-workflow-1');
      expect(processed).toBeDefined();
      expect(processed?.validationResult.isValid).toBe(true);

      // 验证图已注册
      const graph = graphRegistry.get('triggered-workflow-1');
      expect(graph).toBeDefined();
      expect(graph?.nodes.size).toBe(3);
      expect(graph?.edges.size).toBe(2);
    });

    it('应该验证触发子工作流的内部连通性', () => {
      // 创建一个有孤立节点的触发子工作流
      const invalidWorkflow: WorkflowDefinition = {
        id: 'triggered-invalid-1',
        name: 'Invalid Triggered Workflow',
        version: '1.0.0',
        description: 'Triggered workflow with isolated node',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'triggered-start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'isolated-node',
            type: NodeType.CODE,
            name: 'Isolated',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: []
          },
          {
            id: 'triggered-end',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-1']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'triggered-start',
            targetNodeId: 'triggered-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 应该因为孤立节点而失败
      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });
  });

  describe('场景2：触发子工作流的结构约束', () => {
    it('应该拒绝触发子工作流包含普通START节点', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'triggered-with-start',
        name: 'Invalid - Contains START',
        version: '1.0.0',
        description: 'Triggered workflow with START node',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'normal-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'process',
            type: NodeType.LLM,
            name: 'Process',
            config: {
              profileId: 'test-profile',
              prompt: 'Test'
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'continue',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'Continue',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-2']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'normal-start',
            targetNodeId: 'process',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'process',
            targetNodeId: 'continue',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });

    it('应该拒绝触发子工作流包含普通END节点', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'triggered-with-end',
        name: 'Invalid - Contains END',
        version: '1.0.0',
        description: 'Triggered workflow with END node',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'process',
            type: NodeType.LLM,
            name: 'Process',
            config: {
              profileId: 'test-profile',
              prompt: 'Test'
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'normal-end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-2']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'start',
            targetNodeId: 'process',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'process',
            targetNodeId: 'normal-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });

    it('应该拒绝触发子工作流缺少START_FROM_TRIGGER节点', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'triggered-missing-start',
        name: 'Invalid - Missing START_FROM_TRIGGER',
        version: '1.0.0',
        description: 'Triggered workflow without START_FROM_TRIGGER',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'process',
            type: NodeType.LLM,
            name: 'Process',
            config: {
              profileId: 'test-profile',
              prompt: 'Test'
            },
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'continue',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'Continue',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-1']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'process',
            targetNodeId: 'continue',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });

    it('应该拒绝触发子工作流缺少CONTINUE_FROM_TRIGGER节点', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'triggered-missing-end',
        name: 'Invalid - Missing CONTINUE_FROM_TRIGGER',
        version: '1.0.0',
        description: 'Triggered workflow without CONTINUE_FROM_TRIGGER',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'process',
            type: NodeType.LLM,
            name: 'Process',
            config: {
              profileId: 'test-profile',
              prompt: 'Test'
            },
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-1']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'start',
            targetNodeId: 'process',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });

    it('应该拒绝START_FROM_TRIGGER节点有入边', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'triggered-start-incoming',
        name: 'Invalid - START_FROM_TRIGGER has incoming',
        version: '1.0.0',
        description: 'Triggered workflow with incoming edges to START',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'before',
            type: NodeType.LLM,
            name: 'Before',
            config: {
              profileId: 'test-profile',
              prompt: 'Before'
            },
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'end',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-2']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'before',
            targetNodeId: 'start',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });

    it('应该拒绝CONTINUE_FROM_TRIGGER节点有出边', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'triggered-end-outgoing',
        name: 'Invalid - CONTINUE_FROM_TRIGGER has outgoing',
        version: '1.0.0',
        description: 'Triggered workflow with outgoing edges from END',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'end',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'End',
            config: {},
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'after',
            type: NodeType.LLM,
            name: 'After',
            config: {
              profileId: 'test-profile',
              prompt: 'After'
            },
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-2']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'end',
            targetNodeId: 'after',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });
  });

  describe('场景3：触发子工作流与父工作流的关系', () => {
    it('应该成功注册包含触发子工作流的父工作流', () => {
      // 创建触发子工作流
      const triggeredWorkflow: WorkflowDefinition = {
        id: 'triggered-subwf',
        name: 'Triggered Subworkflow',
        version: '1.0.0',
        description: 'Triggered workflow',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'trig-start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['trig-edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'trig-process',
            type: NodeType.LLM,
            name: 'Process',
            config: {
              profileId: 'test-profile',
              prompt: 'Triggered process'
            },
            outgoingEdgeIds: ['trig-edge-2'],
            incomingEdgeIds: ['trig-edge-1']
          },
          {
            id: 'trig-end',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['trig-edge-2']
          }
        ],
        edges: [
          {
            id: 'trig-edge-1',
            sourceNodeId: 'trig-start',
            targetNodeId: 'trig-process',
            type: EdgeType.DEFAULT
          },
          {
            id: 'trig-edge-2',
            sourceNodeId: 'trig-process',
            targetNodeId: 'trig-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 创建父工作流，包含对触发子工作流的触发器
      const parentWorkflow: WorkflowDefinition = {
        id: 'parent-with-triggered',
        name: 'Parent With Triggered Subworkflow',
        version: '1.0.0',
        description: 'Parent workflow',
        variables: [],
        triggers: [
          {
            id: 'trigger-1',
            name: 'Manual Trigger',
            condition: {
              eventType: EventType.THREAD_STARTED,
              metadata: {}
            },
            action: {
              type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
              parameters: {
                triggeredWorkflowId: 'triggered-subwf',
                waitForCompletion: true
              }
            },
            metadata: {}
          } as any
        ],
        nodes: [
          {
            id: 'parent-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['parent-edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'parent-process',
            type: NodeType.LLM,
            name: 'Process',
            config: {
              profileId: 'test-profile',
              prompt: 'Parent process'
            },
            outgoingEdgeIds: ['parent-edge-2'],
            incomingEdgeIds: ['parent-edge-1']
          },
          {
            id: 'parent-end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['parent-edge-2']
          }
        ],
        edges: [
          {
            id: 'parent-edge-1',
            sourceNodeId: 'parent-start',
            targetNodeId: 'parent-process',
            type: EdgeType.DEFAULT
          },
          {
            id: 'parent-edge-2',
            sourceNodeId: 'parent-process',
            targetNodeId: 'parent-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          enableCheckpoints: false,
          toolApproval: {
            autoApprovedTools: []
          }
        },
        metadata: {
          author: 'test-author',
          tags: ['test'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册触发子工作流
      registry.register(triggeredWorkflow);
      expect(registry.has('triggered-subwf')).toBe(true);

      // 注册父工作流
      registry.register(parentWorkflow);
      expect(registry.has('parent-with-triggered')).toBe(true);

      // 验证父工作流的触发器引用
      const parent = registry.get('parent-with-triggered');
      expect(parent?.triggers).toBeDefined();
      expect(parent?.triggers).toHaveLength(1);
      const trigger = parent?.triggers?.[0] as any;
      expect(trigger?.action?.type).toBe(TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH);
      const params = trigger?.action?.parameters;
      expect(params?.triggeredWorkflowId).toBe('triggered-subwf');

      // 验证父工作流的预处理结果
      // 触发子工作流不会被展开合并到图中，所以父工作流的图不应该包含触发子工作流的节点
      const processedParent = registry.getProcessed('parent-with-triggered');
      expect(processedParent).toBeDefined();
      expect(processedParent?.validationResult.isValid).toBe(true);
      expect(processedParent?.hasSubgraphs).toBe(false);
    });
  });

});
