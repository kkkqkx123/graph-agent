/**
 * Workflow 预处理集成测试
 * 
 * 测试场景：
 * 1. 无依赖工作流在注册时预处理
 * 2. 有依赖工作流延迟到Thread构建时预处理
 * 3. 注册顺序不影响预处理
 * 4. 触发器引用的工作流在Thread构建时预处理
 * 5. 缺失依赖时抛出明确错误
 */

import { WorkflowRegistry } from '@modular-agent/sdk/core/services/workflow-registry';
import { ThreadBuilder } from '@modular-agent/sdk/core/execution/thread-builder';
import { ExecutionContext } from '../../core/execution/context/execution-context';
import { NodeType } from '@modular-agent/types/node';
import { EdgeType } from '@modular-agent/types/edge';
import { TriggerActionType } from '@modular-agent/types/trigger';
import { ValidationError } from '@modular-agent/types/errors';

describe('Workflow Preprocessing Integration', () => {
  let workflowRegistry: WorkflowRegistry;
  let threadBuilder: ThreadBuilder;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    workflowRegistry = new WorkflowRegistry({ maxRecursionDepth: 10 });
    executionContext = ExecutionContext.createDefault();
    threadBuilder = new ThreadBuilder(workflowRegistry, executionContext);
  });

  afterEach(() => {
    workflowRegistry.clear();
  });

  describe('场景1: 无依赖工作流在注册时预处理', () => {
    it('应该在注册时立即预处理无SUBGRAPH依赖的工作流', async () => {
      const workflow = {
        id: 'simple-workflow',
        name: 'Simple Workflow',
        version: '1.0.0',
        description: 'A simple workflow',
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
            id: 'end',
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
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { author: 'test', tags: ['test'], category: 'test' }
      };

      workflowRegistry.register(workflow);
      
      // 等待异步预处理完成
      await new Promise(resolve => setTimeout(resolve, 100));

      const processed = workflowRegistry.getProcessed('simple-workflow');
      expect(processed).toBeDefined();
      expect(processed?.graph).toBeDefined();
    });
  });

  describe('场景2: 有依赖工作流延迟预处理', () => {
    it('应该在Thread构建时预处理有依赖的工作流', async () => {
      const subWorkflow = {
        id: 'sub-workflow',
        name: 'Sub Workflow',
        version: '1.0.0',
        description: 'Sub workflow',
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
            id: 'sub-end',
            type: NodeType.END,
            name: 'Sub End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['sub-edge-1']
          }
        ],
        edges: [
          {
            id: 'sub-edge-1',
            sourceNodeId: 'sub-start',
            targetNodeId: 'sub-end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { author: 'test', tags: ['test'], category: 'test' }
      };

      const mainWorkflow = {
        id: 'main-workflow',
        name: 'Main Workflow',
        version: '1.0.0',
        description: 'Main workflow',
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
            id: 'subgraph',
            type: NodeType.SUBGRAPH,
            name: 'Subgraph',
            config: {
              subgraphId: 'sub-workflow',
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'end',
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
            targetNodeId: 'subgraph',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'subgraph',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { author: 'test', tags: ['test'], category: 'test' }
      };

      workflowRegistry.register(mainWorkflow);
      workflowRegistry.register(subWorkflow);

      const threadContext = await threadBuilder.build('main-workflow');

      expect(threadContext).toBeDefined();
      expect(workflowRegistry.getProcessed('main-workflow')).toBeDefined();
      expect(workflowRegistry.getProcessed('sub-workflow')).toBeDefined();
    });
  });

  describe('场景3: 触发器引用的工作流预处理', () => {
    it('应该在Thread构建时预处理触发器引用的工作流', async () => {
      const triggeredWorkflow = {
        id: 'triggered-workflow',
        name: 'Triggered Workflow',
        version: '1.0.0',
        description: 'Triggered workflow',
        nodes: [
          {
            id: 'triggered-start',
            type: NodeType.START_FROM_TRIGGER,
            name: 'Triggered Start',
            config: {},
            outgoingEdgeIds: ['triggered-edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'triggered-end',
            type: NodeType.CONTINUE_FROM_TRIGGER,
            name: 'Triggered End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['triggered-edge-1']
          }
        ],
        edges: [
          {
            id: 'triggered-edge-1',
            sourceNodeId: 'triggered-start',
            targetNodeId: 'triggered-end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { author: 'test', tags: ['test'], category: 'test' }
      };

      const mainWorkflow = {
        id: 'main-workflow',
        name: 'Main Workflow',
        version: '1.0.0',
        description: 'Main workflow',
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
            id: 'end',
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
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [
          {
            id: 'error-trigger',
            name: 'Error Trigger',
            type: 'event' as any,
            condition: {
              eventType: 'ERROR' as any
            },
            action: {
              type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
              parameters: {
                triggeredWorkflowId: 'triggered-workflow',
                waitForCompletion: true
              }
            }
          }
        ],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { author: 'test', tags: ['test'], category: 'test' }
      };

      workflowRegistry.register(mainWorkflow);
      workflowRegistry.register(triggeredWorkflow);

      const threadContext = await threadBuilder.build('main-workflow');

      expect(threadContext).toBeDefined();
      expect(workflowRegistry.getProcessed('main-workflow')).toBeDefined();
      expect(workflowRegistry.getProcessed('triggered-workflow')).toBeDefined();
    });

    it('应该在Thread构建时抛出错误如果triggered工作流不存在', async () => {
      const mainWorkflow = {
        id: 'main-workflow',
        name: 'Main Workflow',
        version: '1.0.0',
        description: 'Main workflow',
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
            id: 'end',
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
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [
          {
            id: 'error-trigger',
            name: 'Error Trigger',
            type: 'event' as any,
            condition: {
              eventType: 'ERROR' as any
            },
            action: {
              type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
              parameters: {
                triggeredWorkflowId: 'non-existent-workflow',
                waitForCompletion: true
              }
            }
          }
        ],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { author: 'test', tags: ['test'], category: 'test' }
      };

      workflowRegistry.register(mainWorkflow);

      await expect(threadBuilder.build('main-workflow')).rejects.toThrow(ValidationError);
      await expect(threadBuilder.build('main-workflow')).rejects.toThrow('non-existent-workflow');
    });
  });

  describe('场景4: 缺失依赖时抛出明确错误', () => {
    it('应该在Thread构建时抛出错误如果SUBGRAPH引用的工作流不存在', async () => {
      const mainWorkflow = {
        id: 'main-workflow',
        name: 'Main Workflow',
        version: '1.0.0',
        description: 'Main workflow',
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
            id: 'subgraph',
            type: NodeType.SUBGRAPH,
            name: 'Subgraph',
            config: {
              subgraphId: 'non-existent-sub-workflow',
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'end',
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
            targetNodeId: 'subgraph',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'subgraph',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT
          }
        ],
        triggers: [],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { author: 'test', tags: ['test'], category: 'test' }
      };

      workflowRegistry.register(mainWorkflow);

      await expect(threadBuilder.build('main-workflow')).rejects.toThrow(ValidationError);
      await expect(threadBuilder.build('main-workflow')).rejects.toThrow('non-existent-sub-workflow');
    });
  });
});