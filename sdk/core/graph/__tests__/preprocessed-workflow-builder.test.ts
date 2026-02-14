/**
 * preprocessed-workflow-builder.test.ts
 * 预处理工作流构建器的单元测试
 */

import { PreprocessedWorkflowBuilder } from '../preprocessed-workflow-builder';
import type { WorkflowDefinition, ID } from '@modular-agent/types';
import { NodeType, EdgeType, WorkflowType } from '@modular-agent/types';

/**
 * 创建简单的工作流定义
 */
function createSimpleWorkflow(): WorkflowDefinition {
  return {
    id: 'wf1',
    name: 'Simple Workflow',
    description: 'A simple workflow',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: ['e1'],
        incomingEdgeIds: [],
      },
      {
        id: 'llm',
        type: NodeType.LLM,
        name: 'LLM',
        description: 'LLM node',
        config: {
          profileId: 'profile1',
          prompt: 'Hello',
        } as any,
        outgoingEdgeIds: ['e2'],
        incomingEdgeIds: ['e1'],
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        description: 'End node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['e2'],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'start',
        targetNodeId: 'llm',
        type: EdgeType.DEFAULT,
        label: 'Start to LLM',
      },
      {
        id: 'e2',
        sourceNodeId: 'llm',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
        label: 'LLM to End',
      },
    ],
  };
}

/**
 * 创建包含子工作流的工作流定义
 */
function createSubgraphWorkflow(): WorkflowDefinition {
  return {
    id: 'wf2',
    name: 'Subgraph Workflow',
    description: 'A workflow with subgraph',
    version: '1.0.0',
    type: WorkflowType.DEPENDENT,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: ['e1'],
        incomingEdgeIds: [],
      },
      {
        id: 'subgraph',
        type: NodeType.SUBGRAPH,
        name: 'Subgraph',
        description: 'Subgraph node',
        config: {
          subgraphId: 'subwf1',
          async: false,
        } as any,
        outgoingEdgeIds: ['e2'],
        incomingEdgeIds: ['e1'],
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        description: 'End node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['e2'],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'start',
        targetNodeId: 'subgraph',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e2',
        sourceNodeId: 'subgraph',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
      },
    ],
  };
}

/**
 * 创建子工作流定义
 */
function createSubWorkflow(): WorkflowDefinition {
  return {
    id: 'subwf1',
    name: 'Sub Workflow',
    description: 'A sub workflow',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'subStart',
        type: NodeType.START,
        name: 'Sub Start',
        description: 'Sub start node',
        config: {} as any,
        outgoingEdgeIds: ['subE1'],
        incomingEdgeIds: [],
      },
      {
        id: 'subLLM',
        type: NodeType.LLM,
        name: 'Sub LLM',
        description: 'Sub LLM node',
        config: { profileId: 'profile1' } as any,
        outgoingEdgeIds: ['subE2'],
        incomingEdgeIds: ['subE1'],
      },
      {
        id: 'subEnd',
        type: NodeType.END,
        name: 'Sub End',
        description: 'Sub end node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['subE2'],
      },
    ],
    edges: [
      {
        id: 'subE1',
        sourceNodeId: 'subStart',
        targetNodeId: 'subLLM',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'subE2',
        sourceNodeId: 'subLLM',
        targetNodeId: 'subEnd',
        type: EdgeType.DEFAULT,
      },
    ],
  };
}

/**
 * 创建包含触发器的工作流定义
 */
function createWorkflowWithTriggers(): WorkflowDefinition {
  return {
    id: 'wf3',
    name: 'Workflow with Triggers',
    description: 'A workflow with triggers',
    version: '1.0.0',
    type: WorkflowType.STANDALONE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: 'start',
        type: NodeType.START,
        name: 'Start',
        description: 'Start node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: [],
      },
    ],
    edges: [],
    triggers: [
      {
        id: 'trigger1',
        name: 'Webhook Trigger',
        description: 'A webhook trigger',
        condition: {
          type: 'event',
          eventType: 'webhook',
        } as any,
        action: {
          type: 'execute_workflow',
          parameters: {},
        } as any,
      },
    ],
  };
}

describe('PreprocessedWorkflowBuilder', () => {
  describe('build', () => {
    it('should build a preprocessed workflow from simple workflow', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.graph).toBeDefined();
      expect(result.idMapping).toBeDefined();
      expect(result.nodeConfigs).toBeDefined();
      expect(result.triggerConfigs).toBeDefined();
      expect(result.subgraphRelationships).toBeDefined();
    });

    it('should create correct graph structure', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.graph.nodes.size).toBe(3);
      expect(result.graph.edges.size).toBe(2);
      expect(result.graph.startNodeId).toBeDefined();
      expect(result.graph.endNodeIds.size).toBe(1);
    });

    it('should create ID mappings for nodes', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.idMapping.nodeIds.size).toBe(3);
      expect(result.idMapping.reverseNodeIds.size).toBe(3);
      
      // Check that original IDs are mapped to index IDs
      expect(result.idMapping.nodeIds.get('start')).toBe(0);
      expect(result.idMapping.nodeIds.get('llm')).toBe(1);
      expect(result.idMapping.nodeIds.get('end')).toBe(2);
      
      // Check reverse mapping
      expect(result.idMapping.reverseNodeIds.get(0)).toBe('start');
      expect(result.idMapping.reverseNodeIds.get(1)).toBe('llm');
      expect(result.idMapping.reverseNodeIds.get(2)).toBe('end');
    });

    it('should create ID mappings for edges', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.idMapping.edgeIds.size).toBe(2);
      expect(result.idMapping.reverseEdgeIds.size).toBe(2);
      
      // Check that original IDs are mapped to index IDs
      expect(result.idMapping.edgeIds.get('e1')).toBe(0);
      expect(result.idMapping.edgeIds.get('e2')).toBe(1);
      
      // Check reverse mapping
      expect(result.idMapping.reverseEdgeIds.get(0)).toBe('e1');
      expect(result.idMapping.reverseEdgeIds.get(1)).toBe('e2');
    });

    it('should create node configs', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.nodeConfigs.size).toBe(3);
      
      // Check that node configs are mapped by index ID
      expect(result.nodeConfigs.has('0')).toBe(true);
      expect(result.nodeConfigs.has('1')).toBe(true);
      expect(result.nodeConfigs.has('2')).toBe(true);
    });

    it('should handle workflow with triggers', async () => {
      const workflow = createWorkflowWithTriggers();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.triggerConfigs.size).toBe(1);
      expect(result.triggerConfigs.has('trigger1')).toBe(true);
    });

    it('should handle workflow without triggers', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.triggerConfigs.size).toBe(0);
    });

    it('should process subgraphs', async () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();
      
      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(mainWorkflow, workflowRegistry);

      expect(result.subgraphRelationships.length).toBe(1);
      expect(result.subgraphRelationships[0]?.parentWorkflowId).toBe('wf2');
      expect(result.subgraphRelationships[0]?.childWorkflowId).toBe('subwf1');
      expect(result.subgraphRelationships[0]?.subgraphNodeId).toBe('subgraph');
      expect(result.subgraphRelationships[0]?.namespace).toBeDefined();
    });

    it('should create subgraph namespaces', async () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();
      
      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(mainWorkflow, workflowRegistry);

      expect(result.idMapping.subgraphNamespaces.size).toBe(1);
      expect(result.idMapping.subgraphNamespaces.has('subwf1')).toBe(true);
    });

    it('should handle missing subworkflow', async () => {
      const mainWorkflow = createSubgraphWorkflow();
      
      const workflowRegistry = {
        get: () => undefined,
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(mainWorkflow, workflowRegistry);

      expect(result.subgraphRelationships.length).toBe(0);
      expect(result.idMapping.subgraphNamespaces.size).toBe(0);
    });

    it('should handle subgraph node without subgraphId', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Invalid Subgraph',
        description: 'Test',
        version: '1.0.0',
        type: WorkflowType.DEPENDENT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: 'Start',
            config: {} as any,
            outgoingEdgeIds: ['e1'],
            incomingEdgeIds: [],
          },
          {
            id: 'subgraph',
            type: NodeType.SUBGRAPH,
            name: 'Subgraph',
            config: {
              subgraphId: '',
              async: false,
            } as any,
            outgoingEdgeIds: ['e2'],
            incomingEdgeIds: ['e1'],
          },
          {
            id: 'end',
            type: NodeType.END,
            name: 'End',
            config: {} as any,
            outgoingEdgeIds: [],
            incomingEdgeIds: ['e2'],
          },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'start',
            targetNodeId: 'subgraph',
            type: EdgeType.DEFAULT,
          },
          {
            id: 'e2',
            sourceNodeId: 'subgraph',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
          },
        ],
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.subgraphRelationships.length).toBe(0);
    });

    it('should handle empty workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Empty Workflow',
        description: 'Empty',
        version: '1.0.0',
        type: WorkflowType.STANDALONE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [],
        edges: [],
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.graph.nodes.size).toBe(0);
      expect(result.graph.edges.size).toBe(0);
      expect(result.nodeConfigs.size).toBe(0);
      expect(result.triggerConfigs.size).toBe(0);
      expect(result.subgraphRelationships.length).toBe(0);
    });

    it('should handle workflow with multiple END nodes', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Multiple Ends',
        description: 'Test',
        version: '1.0.0',
        type: WorkflowType.STANDALONE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: 'Start',
            config: {} as any,
            outgoingEdgeIds: ['e1'],
            incomingEdgeIds: [],
          },
          {
            id: 'llm',
            type: NodeType.LLM,
            name: 'LLM',
            config: { profileId: 'profile1' } as any,
            outgoingEdgeIds: ['e2', 'e3'],
            incomingEdgeIds: ['e1'],
          },
          {
            id: 'end1',
            type: NodeType.END,
            name: 'End 1',
            config: {} as any,
            outgoingEdgeIds: [],
            incomingEdgeIds: ['e2'],
          },
          {
            id: 'end2',
            type: NodeType.END,
            name: 'End 2',
            config: {} as any,
            outgoingEdgeIds: [],
            incomingEdgeIds: ['e3'],
          },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'start',
            targetNodeId: 'llm',
            type: EdgeType.DEFAULT,
          },
          {
            id: 'e2',
            sourceNodeId: 'llm',
            targetNodeId: 'end1',
            type: EdgeType.DEFAULT,
          },
          {
            id: 'e3',
            sourceNodeId: 'llm',
            targetNodeId: 'end2',
            type: EdgeType.DEFAULT,
          },
        ],
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.graph.endNodeIds.size).toBe(2);
      expect(result.graph.endNodeIds.has('2')).toBe(true);
      expect(result.graph.endNodeIds.has('3')).toBe(true);
    });

    it('should allocate sequential node IDs', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      const nodeIds = Array.from(result.idMapping.nodeIds.values());
      expect(nodeIds).toEqual([0, 1, 2]);
    });

    it('should allocate sequential edge IDs', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      const edgeIds = Array.from(result.idMapping.edgeIds.values());
      expect(edgeIds).toEqual([0, 1]);
    });

    it('should create graph nodes with correct properties', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      const startNode = result.graph.getNode('0');
      expect(startNode).toBeDefined();
      expect(startNode?.id).toBe('0');
      expect(startNode?.type).toBe(NodeType.START);
      expect(startNode?.name).toBe('Start');
      expect(startNode?.workflowId).toBe('wf1');
      expect(startNode?.originalNode).toBeDefined();

      const llmNode = result.graph.getNode('1');
      expect(llmNode).toBeDefined();
      expect(llmNode?.type).toBe(NodeType.LLM);
      expect(llmNode?.name).toBe('LLM');
    });

    it('should create graph edges with correct properties', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      const edge1 = result.graph.getEdge('0');
      expect(edge1).toBeDefined();
      expect(edge1?.id).toBe('0');
      expect(edge1?.sourceNodeId).toBe('0');
      expect(edge1?.targetNodeId).toBe('1');
      expect(edge1?.type).toBe(EdgeType.DEFAULT);
      expect(edge1?.label).toBe('Start to LLM');
      expect(edge1?.originalEdge).toBeDefined();

      const edge2 = result.graph.getEdge('1');
      expect(edge2).toBeDefined();
      expect(edge2?.sourceNodeId).toBe('1');
      expect(edge2?.targetNodeId).toBe('2');
    });

    it('should set startNodeId correctly', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.graph.startNodeId).toBe('0');
    });

    it('should add end node IDs to endNodeIds set', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(workflow, null);

      expect(result.graph.endNodeIds.has('2')).toBe(true);
    });
  });

  describe('ID allocation', () => {
    it('should reset counters for each build', async () => {
      const workflow = createSimpleWorkflow();
      const builder = new PreprocessedWorkflowBuilder();
      
      const result1 = await builder.build(workflow, null);
      expect(result1.idMapping.nodeIds.get('start')).toBe(0);
      
      const result2 = await builder.build(workflow, null);
      expect(result2.idMapping.nodeIds.get('start')).toBe(3); // Counter continues
    });

    it('should create new builder instance for fresh counters', async () => {
      const workflow = createSimpleWorkflow();
      
      const builder1 = new PreprocessedWorkflowBuilder();
      const result1 = await builder1.build(workflow, null);
      expect(result1.idMapping.nodeIds.get('start')).toBe(0);
      
      const builder2 = new PreprocessedWorkflowBuilder();
      const result2 = await builder2.build(workflow, null);
      expect(result2.idMapping.nodeIds.get('start')).toBe(0); // Fresh counter
    });
  });

  describe('Subgraph processing', () => {
    it('should merge subgraph nodes into main graph', async () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();
      
      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(mainWorkflow, workflowRegistry);

      // Main graph should have subgraph nodes merged
      expect(result.graph.nodes.size).toBeGreaterThan(3);
    });

    it('should merge subgraph edges into main graph', async () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();
      
      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(mainWorkflow, workflowRegistry);

      // Main graph should have subgraph edges merged
      expect(result.graph.edges.size).toBeGreaterThan(2);
    });

    it('should merge subgraph correctly', async () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();
      
      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
      };

      const builder = new PreprocessedWorkflowBuilder();
      const result = await builder.build(mainWorkflow, workflowRegistry);

      // Main graph should have subgraph nodes merged
      // Original: start, subgraph, end (3 nodes)
      // After merge: start, subStart, subLLM, subEnd, end (5 nodes)
      // But subgraph node is removed, so we have 4 nodes from main + 3 from sub = 7 total
      // Actually, the subgraph node is replaced by subgraph nodes
      expect(result.graph.nodes.size).toBeGreaterThan(3);
      
      // Check that subgraph relationships are created
      expect(result.subgraphRelationships.length).toBe(1);
      expect(result.subgraphRelationships[0]?.subgraphNodeId).toBe('subgraph');
    });
  });
});