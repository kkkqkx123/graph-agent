/**
 * Workflow加载与注册集成测试
 *
 * 测试范围：
 * - 完整工作流生命周期（从模板加载到注册）
 * - 验证器与构建器集成
 * - 构建器与注册表集成
 * - 模板系统集成
 * - 子工作流处理
 * - 异常路径处理
 */

import { WorkflowRegistry } from '../../../core/services/workflow-registry';
import { WorkflowValidator } from '../../../core/validation/workflow-validator';
import { nodeTemplateRegistry } from '../../../core/services/node-template-registry';
import { triggerTemplateRegistry } from '../../../core/services/trigger-template-registry';
import { graphRegistry } from '../../../core/services/graph-registry';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import { TriggerActionType } from '../../../types/trigger';
import type { WorkflowDefinition, ProcessedWorkflowDefinition } from '../../../types/workflow';
import type { NodeTemplate, TriggerTemplate } from '../../../types';
import type { WorkflowTrigger } from '../../../types/trigger';
import { ValidationError } from '../../../types/errors';

describe('Workflow加载与注册集成测试', () => {
  let registry: WorkflowRegistry;
  let validator: WorkflowValidator;

  beforeEach(() => {
    // 创建新的实例以避免测试间干扰
    registry = new WorkflowRegistry({
      maxRecursionDepth: 10
    });
    validator = new WorkflowValidator();

    // 清理全局注册表
    graphRegistry.clear();
  });

  afterEach(() => {
    // 清理全局注册表
    graphRegistry.clear();
  });

  /**
   * 创建基础工作流定义
   */
  const createBaseWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Test workflow',
    nodes: [
      {
        id: `${id}-start`,
        type: NodeType.START,
        name: 'Start',
        config: {},
        outgoingEdgeIds: [`${id}-edge-1`],
        incomingEdgeIds: []
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-1`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT,
        condition: undefined
      }
    ],
    variables: [],
    triggers: [],
    config: {
      timeout: 60000,
      maxSteps: 1000,
      toolApproval: {
        autoApprovedTools: []
      }
    },
    metadata: {
      author: 'test-author',
      tags: ['test', 'integration'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1：完整工作流生命周期集成测试', () => {
    it('应该成功注册简单工作流并完成预处理', () => {
      const workflow = createBaseWorkflow('workflow-simple', 'Simple Workflow');

      // 1. 验证工作流定义
      const validationResult = validator.validate(workflow);
      expect(validationResult.isOk()).toBe(true);
      if (validationResult.isErr()) {
        expect(validationResult.error).toHaveLength(0);
      }

      // 2. 注册工作流
      expect(() => registry.register(workflow)).not.toThrow();

      // 3. 验证注册成功
      expect(registry.has('workflow-simple')).toBe(true);
      const registered = registry.get('workflow-simple');
      expect(registered).toEqual(workflow);

      // 4. 验证预处理结果
      const processed = registry.getProcessed('workflow-simple');
      expect(processed).toBeDefined();
      expect(processed?.graph).toBeDefined();
      expect(processed?.validationResult.isValid).toBe(true);

      // 5. 验证图结构已注册到全局注册表
      const graph = graphRegistry.get('workflow-simple');
      expect(graph).toBeDefined();
      expect(graph?.nodes.size).toBe(2);
      expect(graph?.edges.size).toBe(1);
    });

    it('应该成功注册复杂工作流并完成预处理', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-complex',
        name: 'Complex Workflow',
        version: '1.0.0',
        description: 'Complex workflow with multiple nodes',
        nodes: [
          {
            id: 'node-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node-llm',
            type: NodeType.LLM,
            name: 'LLM Node',
            config: {
              profileId: 'profile-1',
              prompt: 'Hello'
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'node-code',
            type: NodeType.CODE,
            name: 'Code Node',
            config: {
              scriptName: 'process',
              scriptType: 'javascript',
              risk: 'low',
              timeout: 5000,
              retries: 3
            },
            outgoingEdgeIds: ['edge-3'],
            incomingEdgeIds: ['edge-2']
          },
          {
            id: 'node-end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-3']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-llm',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node-llm',
            targetNodeId: 'node-code',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-3',
            sourceNodeId: 'node-code',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          timeout: 60000,
          maxSteps: 100,
          enableCheckpoints: true,
          toolApproval: {
            autoApprovedTools: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册工作流
      registry.register(workflow);

      // 验证预处理结果
      const processed = registry.getProcessed('workflow-complex');
      expect(processed).toBeDefined();
      expect(processed?.nodes).toHaveLength(4);
      expect(processed?.edges).toHaveLength(3);
      expect(processed?.topologicalOrder).toHaveLength(4);
    });

    it('应该支持创建工作流新版本', () => {
      const workflow = createBaseWorkflow('workflow-update', 'Update Workflow');
      registry.register(workflow);

      // 创建新版本工作流（遵循不可变原则）
      const updatedWorkflow: WorkflowDefinition = {
        ...workflow,
        version: '2.0.0',
        description: 'Updated description',
        updatedAt: Date.now()
      };

      // 删除旧版本并注册新版本
      registry.unregister('workflow-update');
      registry.register(updatedWorkflow);

      // 验证新版本已注册
      const registered = registry.get('workflow-update');
      expect(registered?.description).toBe('Updated description');
      expect(registered?.version).toBe('2.0.0');

      // 验证预处理结果已更新
      const processed = registry.getProcessed('workflow-update');
      expect(processed).toBeDefined();
      expect(processed?.validationResult.isValid).toBe(true);
    });
  });

  describe('场景2：模板系统集成测试', () => {
    beforeEach(() => {
      // 注册节点模板
      const llmTemplate: NodeTemplate = {
        name: 'llm-template',
        type: NodeType.LLM,
        description: 'LLM node template',
        config: {
          profileId: 'default-profile',
          prompt: 'Default prompt'
        },
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      nodeTemplateRegistry.register(llmTemplate);

      // 注册触发器模板
      const triggerTemplate: TriggerTemplate = {
        name: 'webhook-trigger',
        description: 'Webhook trigger template',
        condition: {
          eventType: 'NODE_COMPLETED' as any,
          metadata: { source: 'webhook' }
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {
            message: 'Webhook received'
          }
        },
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      triggerTemplateRegistry.register(triggerTemplate);
    });

    afterEach(() => {
      // 清理模板注册表
      nodeTemplateRegistry.clear();
      triggerTemplateRegistry.clear();
    });

    it('应该成功展开节点模板引用', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-template-node',
        name: 'Template Node Workflow',
        version: '1.0.0',
        description: 'Template node workflow',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'node-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node-llm',
            type: NodeType.LLM,
            name: 'LLM from Template',
            config: {
              profileId: 'test-profile',
              templateName: 'llm-template',
              nodeId: 'node-llm',
              nodeName: 'LLM from Template',
              configOverride: {
                prompt: 'Custom prompt'
              }
            } as any,
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'node-end',
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
            sourceNodeId: 'node-start',
            targetNodeId: 'node-llm',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node-llm',
            targetNodeId: 'node-end',
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
          tags: ['test', 'integration'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册工作流
      registry.register(workflow);

      // 验证预处理结果
      const processed = registry.getProcessed('workflow-template-node');
      expect(processed).toBeDefined();

      // 验证节点已展开 - 通过processedWorkflowDefinition验证
      const llmNode = processed?.nodes.find(n => n.id === 'node-llm');
      expect(llmNode).toBeDefined();
      expect((llmNode?.config as any)?.prompt).toBe('Custom prompt');
    });

    it('应该成功展开触发器模板引用', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-template-trigger',
        name: 'Template Trigger Workflow',
        version: '1.0.0',
        description: 'Template trigger workflow',
        variables: [],
        nodes: [
          {
            id: 'node-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node-end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-1']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [
          {
            templateName: 'webhook-trigger',
            triggerId: 'trigger-1',
            triggerName: 'Webhook Trigger',
            configOverride: {
              path: '/custom-webhook'
            }
          } as any
        ],
        metadata: {
          author: 'test-author',
          tags: ['test', 'integration'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册工作流
      registry.register(workflow);

      // 验证预处理结果
      const processed = registry.getProcessed('workflow-template-trigger');
      expect(processed).toBeDefined();

      // 验证触发器已展开
      expect(processed?.triggers).toHaveLength(1);
      const trigger = processed?.triggers?.[0] as WorkflowTrigger;
      expect(trigger?.action.parameters?.['message']).toBe('Webhook received');
    });
  });

  describe('场景3：子工作流集成测试', () => {
    it('应该成功处理包含子工作流的工作流', () => {
      // 创建子工作流定义
      // 子工作流是一个独立的工作流定义，包含START/END
      const subworkflow: WorkflowDefinition = {
        id: 'processing-unit',
        name: 'Processing Subworkflow',
        version: '1.0.0',
        description: 'Subworkflow for processing',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'sub-start',
            type: NodeType.START,
            name: 'Sub Start',
            config: {},
            outgoingEdgeIds: ['sub-edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node2',
            type: NodeType.LLM,
            name: 'Process 2',
            config: {
              profileId: 'test-profile',
              prompt: 'Processing in subgraph area'
            },
            outgoingEdgeIds: ['sub-edge-2'],
            incomingEdgeIds: ['sub-edge-1']
          },
          {
            id: 'sub-end',
            type: NodeType.END,
            name: 'Sub End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['sub-edge-2']
          }
        ],
        edges: [
          {
            id: 'sub-edge-1',
            sourceNodeId: 'sub-start',
            targetNodeId: 'node2',
            type: EdgeType.DEFAULT
          },
          {
            id: 'sub-edge-2',
            sourceNodeId: 'node2',
            targetNodeId: 'sub-end',
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
          tags: ['test', 'integration'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 创建包含子工作流的主工作流
      // 结构：start -> node1 -> subgraph(边界标记) -> end
      // SUBGRAPH节点标记了子工作流边界，引用处理单元的逻辑
      const mainWorkflow: WorkflowDefinition = {
        id: 'workflow-with-subgraph',
        name: 'Main Workflow With Subgraph',
        version: '1.0.0',
        description: 'Main workflow containing subgraph reference',
        variables: [],
        triggers: [],
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node1',
            type: NodeType.LLM,
            name: 'Process 1',
            config: {
              profileId: 'test-profile',
              prompt: 'Initial processing'
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'subgraph-node',
            type: NodeType.SUBGRAPH,
            name: 'Subgraph Boundary',
            config: {
              // SUBGRAPH节点标记子工作流的边界，并引用注册的子工作流
              subgraphId: 'processing-unit',
              inputMapping: {},
              outputMapping: {},
              async: false
            },
            outgoingEdgeIds: ['edge-3'],
            incomingEdgeIds: ['edge-2']
          },
          {
            id: 'end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-3']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'start',
            targetNodeId: 'node1',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node1',
            targetNodeId: 'subgraph-node',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-3',
            sourceNodeId: 'subgraph-node',
            targetNodeId: 'end',
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
          tags: ['test', 'integration'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 先注册子工作流
      registry.register(subworkflow);

      // 再注册主工作流
      registry.register(mainWorkflow);

      // 验证主工作流预处理结果
      const processed = registry.getProcessed('workflow-with-subgraph');
      expect(processed).toBeDefined();
      expect(processed?.hasSubgraphs).toBe(true);

      // 验证SUBGRAPH节点存在
      const subgraphNode = mainWorkflow.nodes.find(n => n.type === NodeType.SUBGRAPH);
      expect(subgraphNode).toBeDefined();
      expect(subgraphNode?.id).toBe('subgraph-node');
    });
  });

  describe('场景4：异常路径集成测试', () => {
    it('应该拒绝无效的节点模板引用', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-invalid-template',
        name: 'Invalid Template Workflow',
        version: '1.0.0',
        nodes: [
          {
            id: 'node-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node-invalid',
            type: NodeType.LLM,
            name: 'Invalid Node',
            config: {
              templateName: 'non-existent-template',
              nodeId: 'node-invalid',
              nodeName: 'Invalid Node'
            } as any,
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'node-end',
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
            sourceNodeId: 'node-start',
            targetNodeId: 'node-invalid',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node-invalid',
            targetNodeId: 'node-end',
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
          tags: ['test', 'integration'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 应该抛出错误
      expect(() => registry.register(workflow)).toThrow(ValidationError);
      expect(() => registry.register(workflow)).toThrow('Workflow validation failed');
    });

    it('应该拒绝包含循环依赖的工作流', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-cycle',
        name: 'Cycle Workflow',
        version: '1.0.0',
        nodes: [
          {
            id: 'node-1',
            type: NodeType.CODE,
            name: 'Node 1',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: ['edge-3']
          },
          {
            id: 'node-2',
            type: NodeType.CODE,
            name: 'Node 2',
            config: {},
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'node-3',
            type: NodeType.CODE,
            name: 'Node 3',
            config: {},
            outgoingEdgeIds: ['edge-3'],
            incomingEdgeIds: ['edge-2']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node-2',
            targetNodeId: 'node-3',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-3',
            sourceNodeId: 'node-3',
            targetNodeId: 'node-1',
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
          tags: ['test', 'integration'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 应该抛出错误
      expect(() => registry.register(workflow)).toThrow(ValidationError);
      expect(() => registry.register(workflow)).toThrow('Workflow validation failed');
    });

    it('应该拒绝引用不存在的子工作流', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-invalid-subgraph',
        name: 'Invalid Subgraph Workflow',
        version: '1.0.0',
        nodes: [
          {
            id: 'node-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'subgraph-node',
            type: NodeType.SUBGRAPH,
            name: 'Subgraph Node',
            config: {
              subgraphId: 'non-existent-subworkflow',
              inputMapping: {},
              outputMapping: {}
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'node-end',
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
            sourceNodeId: 'node-start',
            targetNodeId: 'subgraph-node',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'subgraph-node',
            targetNodeId: 'node-end',
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
          tags: ['test', 'integration'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 应该抛出错误
      expect(() => registry.register(workflow)).toThrow(ValidationError);
      expect(() => registry.register(workflow)).toThrow('Workflow validation failed');
    });

    it('应该拒绝超过最大递归深度的子工作流', () => {
      // 创建深度为11的子工作流链
      const workflows: WorkflowDefinition[] = [];
      for (let i = 0; i < 11; i++) {
        const workflow: WorkflowDefinition = {
          id: `subworkflow-${i}`,
          name: `Subworkflow ${i}`,
          version: '1.0.0',
          nodes: [
            {
              id: `sub-start-${i}`,
              type: NodeType.START,
              name: 'Start',
              config: {},
              outgoingEdgeIds: [`sub-edge-${i}`],
              incomingEdgeIds: []
            },
            {
              id: `sub-end-${i}`,
              type: NodeType.END,
              name: 'End',
              config: {},
              outgoingEdgeIds: [],
              incomingEdgeIds: [`sub-edge-${i}`]
            }
          ],
          edges: [
            {
              id: `sub-edge-${i}`,
              sourceNodeId: `sub-start-${i}`,
              targetNodeId: `sub-end-${i}`,
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
            tags: ['test', 'integration'],
            category: 'test'
          },
          availableTools: {
            initial: new Set()
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        workflows.push(workflow);
      }

      // 创建父工作流，引用第一个子工作流
      const parentWorkflow: WorkflowDefinition = {
        id: 'parent-workflow-deep',
        name: 'Deep Parent Workflow',
        version: '1.0.0',
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
            id: 'subgraph-node',
            type: NodeType.SUBGRAPH,
            name: 'Subgraph Node',
            config: {
              subgraphId: 'subworkflow-0',
              inputMapping: {},
              outputMapping: {}
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
            targetNodeId: 'subgraph-node',
            type: EdgeType.DEFAULT
          },
          {
            id: 'parent-edge-2',
            sourceNodeId: 'subgraph-node',
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
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册所有子工作流
      workflows.forEach(w => registry.register(w));

      // 注册父工作流，应该因为递归深度限制而失败
      expect(() => registry.register(parentWorkflow)).toThrow(ValidationError);
    });
  });

  describe('场景5：验证器与注册表集成测试', () => {
    it('应该正确传递验证错误', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'workflow-invalid',
        name: 'Invalid Workflow',
        version: '1.0.0',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 验证应该失败
      const validationResult = validator.validate(invalidWorkflow);
      expect(validationResult.isErr()).toBe(true);
      if (validationResult.isErr()) {
        expect(validationResult.error.length).toBeGreaterThan(0);
      }

      // 注册应该失败
      expect(() => registry.register(invalidWorkflow)).toThrow(ValidationError);
    });

    it('应该正确处理图验证错误', () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-isolated',
        name: 'Isolated Node Workflow',
        version: '1.0.0',
        nodes: [
          {
            id: 'node-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node-isolated',
            type: NodeType.CODE,
            name: 'Isolated',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: []
          },
          {
            id: 'node-end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-1']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT
          }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册应该因为孤立节点而失败
      expect(() => registry.register(workflow)).toThrow(ValidationError);
      expect(() => registry.register(workflow)).toThrow('Workflow validation failed');
    });
  });

  describe('场景6：预处理与注册表集成测试', () => {
    it('应该正确缓存预处理结果', () => {
      const workflow = createBaseWorkflow('workflow-cache', 'Cache Workflow');
      registry.register(workflow);

      // 第一次获取
      const processed1 = registry.getProcessed('workflow-cache');
      expect(processed1).toBeDefined();

      // 第二次获取应该返回相同的结果（从缓存）
      const processed2 = registry.getProcessed('workflow-cache');
      expect(processed2).toBe(processed1);
    });

    it('应该在注册新版本时清除旧版本缓存', () => {
      const workflow = createBaseWorkflow('workflow-cache-update', 'Cache Update Workflow');
      registry.register(workflow);

      // 获取预处理结果
      const processed1 = registry.getProcessed('workflow-cache-update');
      expect(processed1).toBeDefined();

      // 创建新版本工作流（遵循不可变原则）
      const updatedWorkflow: WorkflowDefinition = {
        ...workflow,
        version: '2.0.0',
        description: 'Updated',
        updatedAt: Date.now()
      };

      // 删除旧版本并注册新版本
      registry.unregister('workflow-cache-update');
      registry.register(updatedWorkflow);

      // 获取新的预处理结果
      const processed2 = registry.getProcessed('workflow-cache-update');
      expect(processed2).toBeDefined();
      expect(processed2).not.toBe(processed1);
    });

    it('应该在删除时清除缓存', () => {
      const workflow = createBaseWorkflow('workflow-cache-delete', 'Cache Delete Workflow');
      registry.register(workflow);

      // 获取预处理结果
      const processed = registry.getProcessed('workflow-cache-delete');
      expect(processed).toBeDefined();

      // 删除工作流
      registry.unregister('workflow-cache-delete');

      // 预处理结果应该被清除
      const deletedProcessed = registry.getProcessed('workflow-cache-delete');
      expect(deletedProcessed).toBeUndefined();
    });
  });

  describe('场景7：批量操作集成测试', () => {
    it('应该成功批量注册多个工作流', () => {
      const workflows = [
        createBaseWorkflow('workflow-batch-1', 'Batch Workflow 1'),
        createBaseWorkflow('workflow-batch-2', 'Batch Workflow 2'),
        createBaseWorkflow('workflow-batch-3', 'Batch Workflow 3')
      ];

      registry.registerBatch(workflows);

      expect(registry.size()).toBe(3);
      expect(registry.has('workflow-batch-1')).toBe(true);
      expect(registry.has('workflow-batch-2')).toBe(true);
      expect(registry.has('workflow-batch-3')).toBe(true);

      // 验证所有工作流都已预处理
      expect(registry.getProcessed('workflow-batch-1')).toBeDefined();
      expect(registry.getProcessed('workflow-batch-2')).toBeDefined();
      expect(registry.getProcessed('workflow-batch-3')).toBeDefined();
    });

    it('应该在批量注册失败时停止', () => {
      const workflows = [
        createBaseWorkflow('workflow-batch-valid', 'Valid Workflow'),
        {
          id: 'workflow-batch-invalid',
          name: 'Invalid Workflow',
          nodes: [],
          edges: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        } as any,
        createBaseWorkflow('workflow-batch-not-registered', 'Not Registered Workflow')
      ];

      // 应该在第二个工作流时失败
      expect(() => registry.registerBatch(workflows)).toThrow(ValidationError);

      // 只有第一个工作流应该被注册
      expect(registry.size()).toBe(1);
      expect(registry.has('workflow-batch-valid')).toBe(true);
      expect(registry.has('workflow-batch-invalid')).toBe(false);
      expect(registry.has('workflow-batch-not-registered')).toBe(false);
    });
  });

});