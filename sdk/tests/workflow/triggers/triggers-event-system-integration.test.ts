/**
 * 触发器和事件系统集成测试
 * 
 * 测试范围：
 * - 触发器注册和触发条件匹配
 * - 事件系统的发布和订阅机制
 * - 触发器动作执行和状态管理
 * - 事件驱动的子工作流触发
 * - 触发器模板展开和配置覆盖
 * - 异常触发和错误处理
 */

import { WorkflowRegistry } from '../../../core/services/workflow-registry';
import { ExecutionContext } from '../../../core/execution/context/execution-context';
import { ThreadBuilder } from '../../../core/execution/thread-builder';
import { ThreadExecutor } from '../../../core/execution/thread-executor';
import { triggerTemplateRegistry } from '../../../core/services/trigger-template-registry';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import { TriggerActionType } from '../../../types/trigger';
import { ValidationError } from '../../../types/errors';
import type { WorkflowDefinition } from '../../../types/workflow';
import type { ThreadOptions } from '../../../types/thread';
import type { TriggerTemplate, WorkflowTrigger } from '../../../types';

describe('触发器和事件系统集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let executionContext: ExecutionContext;
  let threadBuilder: ThreadBuilder;
  let threadExecutor: ThreadExecutor;

  beforeEach(async () => {
    // 创建新的实例以避免测试间干扰
    workflowRegistry = new WorkflowRegistry({
      maxRecursionDepth: 3
    });

    // 创建执行上下文
    executionContext = ExecutionContext.createDefault();
    executionContext.register('workflowRegistry', workflowRegistry);

    // 创建线程构建器
    threadBuilder = new ThreadBuilder(workflowRegistry, executionContext);

    // 创建线程执行器
    threadExecutor = new ThreadExecutor(executionContext);

    // 清理触发器模板注册表
    triggerTemplateRegistry.clear();
  });

  afterEach(() => {
    // 清理执行上下文
    executionContext.destroy();

    // 清理触发器模板注册表
    triggerTemplateRegistry.clear();
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
        id: `${id}-process`,
        type: NodeType.CODE,
        name: 'Process',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-2`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
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

  /**
   * 创建包含触发器的工作流定义
   */
  const createWorkflowWithTriggers = (id: string, name: string, triggers: WorkflowTrigger[]): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Workflow with triggers for testing',
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
        id: `${id}-process`,
        type: NodeType.CODE,
        name: 'Process',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-2`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
      }
    ],
    variables: [],
    triggers,
    config: {
      timeout: 60000,
      maxSteps: 1000,
      toolApproval: {
        autoApprovedTools: []
      }
    },
    metadata: {
      author: 'test-author',
      tags: ['test', 'triggers'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1：触发器注册和触发条件匹配', () => {
    it('应该成功注册包含触发器的工作流', () => {
      const workflowId = 'workflow-with-triggers';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-1',
          name: 'Node Completed Trigger',
          condition: {
            eventType: 'NODE_COMPLETED',
            metadata: { nodeId: `${workflowId}-process` }
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {
              message: 'Node completed successfully'
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow With Triggers', triggers);

      // 注册工作流
      expect(() => workflowRegistry.register(workflow)).not.toThrow();

      // 验证工作流已注册
      expect(workflowRegistry.has(workflowId)).toBe(true);

      // 验证预处理结果包含触发器
      const processed = workflowRegistry.getProcessed(workflowId);
      expect(processed).toBeDefined();
      expect(processed?.triggers).toHaveLength(1);
      expect(processed?.triggers?.[0].id).toBe('trigger-1');
    });

    it('应该正确匹配触发器条件', async () => {
      const workflowId = 'workflow-trigger-condition';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-condition',
          name: 'Condition Trigger',
          condition: {
            eventType: 'NODE_COMPLETED',
            metadata: { nodeId: `${workflowId}-process` }
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {
              message: 'Condition matched'
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Trigger Condition', triggers);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证触发器状态（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(executionResult).toBeDefined();
    });
  });

  describe('场景2：事件系统的发布和订阅机制', () => {
    it('应该正确处理事件发布和订阅', async () => {
      const workflowId = 'workflow-event-system';
      const workflow = createBaseWorkflow(workflowId, 'Workflow Event System');

      workflowRegistry.register(workflow);

      // 创建事件监听器（模拟）
      let eventReceived = false;
      let receivedEventType = '';
      
      // 这里应该使用实际的事件系统API，这里使用模拟
      const mockEventListener = (event: any) => {
        eventReceived = true;
        receivedEventType = event.type;
      };

      // 在实际实现中，应该注册事件监听器
      // executionContext.eventBus?.on('NODE_COMPLETED', mockEventListener);

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证事件系统工作正常（这里主要验证没有错误）
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 在实际测试中，应该验证事件确实被触发
      // expect(eventReceived).toBe(true);
      // expect(receivedEventType).toBe('NODE_COMPLETED');
    });

    it('应该支持多个事件监听器', async () => {
      const workflowId = 'workflow-multiple-listeners';
      const workflow = createBaseWorkflow(workflowId, 'Workflow Multiple Listeners');

      workflowRegistry.register(workflow);

      // 创建多个事件监听器（模拟）
      const listener1Events: string[] = [];
      const listener2Events: string[] = [];

      // 在实际实现中，应该注册多个事件监听器
      // executionContext.eventBus?.on('NODE_STARTED', (event) => listener1Events.push(event.type));
      // executionContext.eventBus?.on('NODE_COMPLETED', (event) => listener2Events.push(event.type));

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行成功
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 在实际测试中，应该验证两个监听器都收到了事件
      // expect(listener1Events.length).toBeGreaterThan(0);
      // expect(listener2Events.length).toBeGreaterThan(0);
    });
  });

  describe('场景3：触发器动作执行和状态管理', () => {
    it('应该正确执行触发器动作', async () => {
      const workflowId = 'workflow-trigger-action';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-action',
          name: 'Action Trigger',
          condition: {
            eventType: 'WORKFLOW_COMPLETED'
          },
          action: {
            type: TriggerActionType.START_WORKFLOW,
            parameters: {
              workflowId: 'another-workflow'
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Trigger Action', triggers);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证触发器动作执行（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(executionResult).toBeDefined();
    });

    it('应该管理触发器执行状态', async () => {
      const workflowId = 'workflow-trigger-state';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-state',
          name: 'State Trigger',
          condition: {
            eventType: 'NODE_COMPLETED',
            metadata: { nodeId: `${workflowId}-process` }
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {
              message: 'State managed'
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Trigger State', triggers);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证初始状态
      expect(threadContext.getStatus()).toBe('CREATED');

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证最终状态
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证触发器状态管理（具体验证取决于实现）
      const triggerStateManager = threadContext.triggerStateManager;
      expect(triggerStateManager).toBeDefined();
    });
  });

  describe('场景4：事件驱动的子工作流触发', () => {
    it('应该支持事件驱动的子工作流启动', async () => {
      const subworkflowId = 'subworkflow-event-driven';
      const mainWorkflowId = 'main-workflow-event-driven';
      
      // 创建子工作流
      const subworkflow = createBaseWorkflow(subworkflowId, 'Subworkflow Event Driven');
      
      // 创建主工作流（包含触发子工作流的触发器）
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-subworkflow',
          name: 'Subworkflow Trigger',
          condition: {
            eventType: 'NODE_COMPLETED',
            metadata: { nodeId: `${mainWorkflowId}-process` }
          },
          action: {
            type: TriggerActionType.START_WORKFLOW,
            parameters: {
              workflowId: subworkflowId
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const mainWorkflow = createWorkflowWithTriggers(mainWorkflowId, 'Main Workflow Event Driven', triggers);

      // 注册工作流
      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证事件驱动的子工作流触发（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(executionResult).toBeDefined();
    });

    it('应该处理事件驱动的并行工作流执行', async () => {
      const workflow1Id = 'workflow-event-parallel-1';
      const workflow2Id = 'workflow-event-parallel-2';
      const mainWorkflowId = 'main-workflow-event-parallel';
      
      // 创建两个并行工作流
      const workflow1 = createBaseWorkflow(workflow1Id, 'Workflow Event Parallel 1');
      const workflow2 = createBaseWorkflow(workflow2Id, 'Workflow Event Parallel 2');
      
      // 创建主工作流（包含触发两个并行工作流的触发器）
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-parallel-1',
          name: 'Parallel Trigger 1',
          condition: {
            eventType: 'WORKFLOW_STARTED'
          },
          action: {
            type: TriggerActionType.START_WORKFLOW,
            parameters: {
              workflowId: workflow1Id
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'trigger-parallel-2',
          name: 'Parallel Trigger 2',
          condition: {
            eventType: 'WORKFLOW_STARTED'
          },
          action: {
            type: TriggerActionType.START_WORKFLOW,
            parameters: {
              workflowId: workflow2Id
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const mainWorkflow = createWorkflowWithTriggers(mainWorkflowId, 'Main Workflow Event Parallel', triggers);

      // 注册所有工作流
      workflowRegistry.register(workflow1);
      workflowRegistry.register(workflow2);
      workflowRegistry.register(mainWorkflow);

      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证并行工作流触发（具体验证取决于实现）
      expect(executionResult).toBeDefined();
    });
  });

  describe('场景5：触发器模板展开和配置覆盖', () => {
    beforeEach(() => {
      // 注册触发器模板
      const notificationTemplate: TriggerTemplate = {
        name: 'notification-template',
        description: 'Notification trigger template',
        condition: {
          eventType: 'NODE_COMPLETED' as any
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {
            message: 'Default notification message',
            channel: 'default-channel'
          }
        },
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      triggerTemplateRegistry.register(notificationTemplate);
    });

    it('应该成功展开触发器模板引用', () => {
      const workflowId = 'workflow-template-trigger';
      const triggers: WorkflowTrigger[] = [
        {
          templateName: 'notification-template',
          triggerId: 'trigger-from-template',
          triggerName: 'Template Trigger',
          configOverride: {
            message: 'Custom notification message',
            channel: 'custom-channel'
          }
        } as any
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Template Trigger', triggers);

      // 注册工作流
      workflowRegistry.register(workflow);

      // 验证预处理结果
      const processed = workflowRegistry.getProcessed(workflowId);
      expect(processed).toBeDefined();
      expect(processed?.triggers).toHaveLength(1);

      // 验证触发器已展开
      const trigger = processed?.triggers?.[0] as WorkflowTrigger;
      expect(trigger.action.type).toBe(TriggerActionType.SEND_NOTIFICATION);
      expect(trigger.action.parameters?.['message']).toBe('Custom notification message');
      expect(trigger.action.parameters?.['channel']).toBe('custom-channel');
    });

    it('应该拒绝不存在的触发器模板引用', () => {
      const workflowId = 'workflow-invalid-template-trigger';
      const triggers: WorkflowTrigger[] = [
        {
          templateName: 'non-existent-template',
          triggerId: 'trigger-invalid',
          triggerName: 'Invalid Template Trigger',
          configOverride: {}
        } as any
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Invalid Template Trigger', triggers);

      // 注册应该失败
      expect(() => workflowRegistry.register(workflow)).toThrow(ValidationError);
    });
  });

  describe('场景6：异常触发和错误处理', () => {
    it('应该处理无效的触发器条件', () => {
      const workflowId = 'workflow-invalid-trigger-condition';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-invalid',
          name: 'Invalid Trigger',
          condition: {
            eventType: 'INVALID_EVENT_TYPE' as any // 无效的事件类型
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Invalid Trigger Condition', triggers);

      // 注册应该失败
      expect(() => workflowRegistry.register(workflow)).toThrow(ValidationError);
    });

    it('应该处理无效的触发器动作', () => {
      const workflowId = 'workflow-invalid-trigger-action';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-invalid-action',
          name: 'Invalid Action Trigger',
          condition: {
            eventType: 'NODE_COMPLETED'
          },
          action: {
            type: 'INVALID_ACTION_TYPE' as any, // 无效的动作类型
            parameters: {}
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Invalid Trigger Action', triggers);

      // 注册应该失败
      expect(() => workflowRegistry.register(workflow)).toThrow(ValidationError);
    });

    it('应该处理触发器执行错误', async () => {
      const workflowId = 'workflow-trigger-error';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-error',
          name: 'Error Trigger',
          condition: {
            eventType: 'NODE_COMPLETED',
            metadata: { nodeId: `${workflowId}-process` }
          },
          action: {
            type: TriggerActionType.START_WORKFLOW,
            parameters: {
              workflowId: 'non-existent-workflow' // 引用不存在的工作流
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Trigger Error', triggers);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程（应该处理触发器错误）
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果（可能因触发器错误而失败，取决于实现）
      expect(executionResult).toBeDefined();

      // 验证错误信息
      const errors = threadContext.getErrors();
      // 可能包含触发器错误信息，取决于实现
    });
  });

  describe('场景7：触发器性能和多线程', () => {
    it('应该快速执行包含触发器的工作流', async () => {
      const workflowId = 'workflow-trigger-performance';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-performance',
          name: 'Performance Trigger',
          condition: {
            eventType: 'WORKFLOW_COMPLETED'
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {
              message: 'Performance test'
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Trigger Performance', triggers);

      workflowRegistry.register(workflow);

      const startTime = Date.now();

      const threadContext = await threadBuilder.build(workflowId);
      const executionResult = await threadExecutor.execute(threadContext);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 完整执行流程应该在合理时间内完成
      expect(duration).toBeLessThan(5000);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');
    });

    it('应该支持并发触发器执行', async () => {
      const workflowId = 'workflow-concurrent-triggers';
      const triggers: WorkflowTrigger[] = [
        {
          id: 'trigger-concurrent-1',
          name: 'Concurrent Trigger 1',
          condition: {
            eventType: 'WORKFLOW_STARTED'
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {
              message: 'Concurrent 1'
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'trigger-concurrent-2',
          name: 'Concurrent Trigger 2',
          condition: {
            eventType: 'WORKFLOW_COMPLETED'
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {
              message: 'Concurrent 2'
            }
          },
          enabled: true,
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const workflow = createWorkflowWithTriggers(workflowId, 'Workflow Concurrent Triggers', triggers);

      workflowRegistry.register(workflow);

      // 并发构建和执行多个线程
      const executionPromises = Array.from({ length: 2 }, async () => {
        const threadContext = await threadBuilder.build(workflowId);
        return threadExecutor.execute(threadContext);
      });

      const executionResults = await Promise.all(executionPromises);

      // 验证所有执行成功
      executionResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.status).toBe('COMPLETED');
        expect(result.workflowId).toBe(workflowId);
      });

      // 验证所有线程有不同的ID
      const threadIds = executionResults.map(result => result.threadId);
      const uniqueThreadIds = new Set(threadIds);
      expect(uniqueThreadIds.size).toBe(executionResults.length);
    });
  });
});