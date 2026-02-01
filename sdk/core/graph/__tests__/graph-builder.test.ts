/**
 * graph-builder.test.ts
 * 图构建器的单元测试
 */

import { GraphBuilder } from '../graph-builder';
import { GraphData } from '../../entities/graph-data';
import type { WorkflowDefinition, GraphNode, GraphEdge } from '../../../types';
import { NodeType, EdgeType } from '../../../types';

/**
 * 创建简单的工作流定义
 */
function createSimpleWorkflow(): WorkflowDefinition {
  return {
    id: 'wf1',
    name: 'Simple Workflow',
    description: 'A simple workflow',
    version: '1.0.0',
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
 * 创建包含分支的工作流定义
 */
function createBranchWorkflow(): WorkflowDefinition {
  return {
    id: 'wf2',
    name: 'Branch Workflow',
    description: 'A workflow with branches',
    version: '1.0.0',
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
        id: 'route',
        type: NodeType.ROUTE,
        name: 'Route',
        description: 'Route node',
        config: {} as any,
        outgoingEdgeIds: ['e2', 'e3'],
        incomingEdgeIds: ['e1'],
      },
      {
        id: 'llm1',
        type: NodeType.LLM,
        name: 'LLM1',
        description: 'LLM node 1',
        config: { profileId: 'profile1' } as any,
        outgoingEdgeIds: ['e4'],
        incomingEdgeIds: ['e2'],
      },
      {
        id: 'llm2',
        type: NodeType.LLM,
        name: 'LLM2',
        description: 'LLM node 2',
        config: { profileId: 'profile2' } as any,
        outgoingEdgeIds: ['e5'],
        incomingEdgeIds: ['e3'],
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        description: 'End node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['e4', 'e5'],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'start',
        targetNodeId: 'route',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e2',
        sourceNodeId: 'route',
        targetNodeId: 'llm1',
        type: EdgeType.CONDITIONAL,
        condition: {
          expression: 'variables.condition === "A"',
        },
        weight: 10,
      },
      {
        id: 'e3',
        sourceNodeId: 'route',
        targetNodeId: 'llm2',
        type: EdgeType.CONDITIONAL,
        condition: {
          expression: 'variables.condition === "B"',
        },
        weight: 5,
      },
      {
        id: 'e4',
        sourceNodeId: 'llm1',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e5',
        sourceNodeId: 'llm2',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
      },
    ],
  };
}

/**
 * 创建包含Fork/Join的工作流定义
 */
function createForkJoinWorkflow(): WorkflowDefinition {
  return {
    id: 'wf3',
    name: 'Fork/Join Workflow',
    description: 'A workflow with fork/join',
    version: '1.0.0',
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
        id: 'fork',
        type: NodeType.FORK,
        name: 'Fork',
        description: 'Fork node',
        config: { forkId: 'fork1', forkStrategy: 'parallel' } as any,
        outgoingEdgeIds: ['e2', 'e3'],
        incomingEdgeIds: ['e1'],
      },
      {
        id: 'llm1',
        type: NodeType.LLM,
        name: 'LLM1',
        description: 'LLM node 1',
        config: { profileId: 'profile1' } as any,
        outgoingEdgeIds: ['e4'],
        incomingEdgeIds: ['e2'],
      },
      {
        id: 'llm2',
        type: NodeType.LLM,
        name: 'LLM2',
        description: 'LLM node 2',
        config: { profileId: 'profile2' } as any,
        outgoingEdgeIds: ['e5'],
        incomingEdgeIds: ['e3'],
      },
      {
        id: 'join',
        type: NodeType.JOIN,
        name: 'Join',
        description: 'Join node',
        config: { joinId: 'fork1', joinStrategy: 'ALL_COMPLETED' } as any,
        outgoingEdgeIds: ['e6'],
        incomingEdgeIds: ['e4', 'e5'],
      },
      {
        id: 'end',
        type: NodeType.END,
        name: 'End',
        description: 'End node',
        config: {} as any,
        outgoingEdgeIds: [],
        incomingEdgeIds: ['e6'],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'start',
        targetNodeId: 'fork',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e2',
        sourceNodeId: 'fork',
        targetNodeId: 'llm1',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e3',
        sourceNodeId: 'fork',
        targetNodeId: 'llm2',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e4',
        sourceNodeId: 'llm1',
        targetNodeId: 'join',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e5',
        sourceNodeId: 'llm2',
        targetNodeId: 'join',
        type: EdgeType.DEFAULT,
      },
      {
        id: 'e6',
        sourceNodeId: 'join',
        targetNodeId: 'end',
        type: EdgeType.DEFAULT,
      },
    ],
  };
}

/**
 * 创建包含子工作流的工作流定义
 */
function createSubgraphWorkflow(): WorkflowDefinition {
  return {
    id: 'wf4',
    name: 'Subgraph Workflow',
    description: 'A workflow with subgraph',
    version: '1.0.0',
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
          inputMapping: {
            'input1': 'subInput1',
          },
          outputMapping: {
            'output1': 'subOutput1',
          },
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

describe('GraphBuilder', () => {
  describe('build', () => {
    it('should build a graph from simple workflow', () => {
      const workflow = createSimpleWorkflow();
      const graph = GraphBuilder.build(workflow);

      expect(graph).toBeInstanceOf(GraphData);
      expect(graph.nodes.size).toBe(3);
      expect(graph.edges.size).toBe(2);
      expect(graph.startNodeId).toBe('start');
      expect(graph.endNodeIds.has('end')).toBe(true);
    });

    it('should create correct graph nodes', () => {
      const workflow = createSimpleWorkflow();
      const graph = GraphBuilder.build(workflow);

      const startNode = graph.getNode('start');
      expect(startNode).toBeDefined();
      expect(startNode?.type).toBe(NodeType.START);
      expect(startNode?.name).toBe('Start');
      expect(startNode?.workflowId).toBe('wf1');

      const llmNode = graph.getNode('llm');
      expect(llmNode).toBeDefined();
      expect(llmNode?.type).toBe(NodeType.LLM);
      expect(llmNode?.originalNode).toBeDefined();

      const endNode = graph.getNode('end');
      expect(endNode).toBeDefined();
      expect(endNode?.type).toBe(NodeType.END);
    });

    it('should create correct graph edges', () => {
      const workflow = createSimpleWorkflow();
      const graph = GraphBuilder.build(workflow);

      const edge1 = graph.getEdge('e1');
      expect(edge1).toBeDefined();
      expect(edge1?.sourceNodeId).toBe('start');
      expect(edge1?.targetNodeId).toBe('llm');
      expect(edge1?.type).toBe(EdgeType.DEFAULT);
      expect(edge1?.label).toBe('Start to LLM');

      const edge2 = graph.getEdge('e2');
      expect(edge2).toBeDefined();
      expect(edge2?.sourceNodeId).toBe('llm');
      expect(edge2?.targetNodeId).toBe('end');
    });

    it('should build graph with conditional edges', () => {
      const workflow = createBranchWorkflow();
      const graph = GraphBuilder.build(workflow);

      const edge2 = graph.getEdge('e2');
      expect(edge2).toBeDefined();
      expect(edge2?.type).toBe(EdgeType.CONDITIONAL);
      expect(edge2?.originalEdge?.condition).toBeDefined();
      expect(edge2?.weight).toBe(10);

      const edge3 = graph.getEdge('e3');
      expect(edge3).toBeDefined();
      expect(edge3?.type).toBe(EdgeType.CONDITIONAL);
      expect(edge3?.weight).toBe(5);
    });

    it('should build graph with fork/join nodes', () => {
      const workflow = createForkJoinWorkflow();
      const graph = GraphBuilder.build(workflow);

      const forkNode = graph.getNode('fork');
      expect(forkNode).toBeDefined();
      expect(forkNode?.type).toBe(NodeType.FORK);

      const joinNode = graph.getNode('join');
      expect(joinNode).toBeDefined();
      expect(joinNode?.type).toBe(NodeType.JOIN);
    });

    it('should handle workflow with metadata', () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Workflow with Metadata',
        description: 'Test',
        version: '1.0.0',
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
            metadata: {
              customKey: 'customValue',
            },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: 'End',
            config: {} as any,
            outgoingEdgeIds: [],
            incomingEdgeIds: ['e1'],
          },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'start',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
          },
        ],
      };

      const graph = GraphBuilder.build(workflow);

      const startNode = graph.getNode('start');
      expect(startNode?.metadata).toBeDefined();
      expect(startNode?.metadata?.['customKey']).toBe('customValue');
    });

    it('should handle empty workflow', () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Empty Workflow',
        description: 'Empty',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [],
        edges: [],
      };

      const graph = GraphBuilder.build(workflow);

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
      expect(graph.startNodeId).toBeUndefined();
      expect(graph.endNodeIds.size).toBe(0);
    });

    it('should handle workflow with multiple END nodes', () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Multiple Ends',
        description: 'Test',
        version: '1.0.0',
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

      const graph = GraphBuilder.build(workflow);

      expect(graph.endNodeIds.has('end1')).toBe(true);
      expect(graph.endNodeIds.has('end2')).toBe(true);
      expect(graph.endNodeIds.size).toBe(2);
    });
  });

  describe('buildAndValidate', () => {
    it('should build and validate a valid workflow', () => {
      const workflow = createSimpleWorkflow();
      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.graph).toBeInstanceOf(GraphData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for invalid workflow', () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Invalid Workflow',
        description: 'No start node',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: [
          {
            id: 'llm',
            type: NodeType.LLM,
            name: 'LLM',
            config: { profileId: 'profile1' } as any,
            outgoingEdgeIds: ['e1'],
            incomingEdgeIds: [],
          },
          {
            id: 'end',
            type: NodeType.END,
            name: 'End',
            config: {} as any,
            outgoingEdgeIds: [],
            incomingEdgeIds: ['e1'],
          },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'llm',
            targetNodeId: 'end',
            type: EdgeType.DEFAULT,
          },
        ],
      };

      const result = GraphBuilder.buildAndValidate(workflow, {
        detectCycles: true,
        analyzeReachability: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should respect validation options', () => {
      const workflow = createSimpleWorkflow();
      const result = GraphBuilder.buildAndValidate(workflow, {
        detectCycles: true,
        analyzeReachability: true,
      });

      expect(result.graph).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
    });
  });

  describe('processSubgraphs', () => {
    it('should process subgraph nodes', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();

      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(true);
      expect(result.addedNodeIds.length).toBeGreaterThan(0);
      expect(result.removedNodeIds).toContain('subgraph');
      expect(result.subworkflowIds).toContain('subwf1');
    });

    it('should handle missing subworkflow', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: () => undefined,
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not found');
    });

    it('should handle subgraph node without subgraphId', () => {
      const workflow: WorkflowDefinition = {
        id: 'wf1',
        name: 'Invalid Subgraph',
        description: 'Test',
        version: '1.0.0',
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
              inputMapping: {},
              outputMapping: {},
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

      const graph = GraphBuilder.build(workflow);

      const workflowRegistry = {
        get: jest.fn(),
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('missing subgraphId');
    });

    it('should handle maximum recursion depth', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: () => createSubWorkflow(),
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry, 0);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Maximum recursion depth');
    });

    it('should create namespaced node IDs', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();

      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(true);
      expect(result.nodeIdMapping.size).toBeGreaterThan(0);

      // Check that original IDs are mapped to namespaced IDs
      const subStartMapping = result.nodeIdMapping.get('subStart');
      expect(subStartMapping).toBeDefined();
      expect(subStartMapping).toContain('sg_'); // Namespace prefix contains 'sg_'
      expect(subStartMapping).toContain('subStart');
    });

    it('should create namespaced edge IDs', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();

      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(true);
      expect(result.edgeIdMapping.size).toBeGreaterThan(0);

      // Check that original edge IDs are mapped to namespaced IDs
      const subE1Mapping = result.edgeIdMapping.get('subE1');
      expect(subE1Mapping).toBeDefined();
      expect(subE1Mapping).toContain('sg_'); // Namespace prefix contains 'sg_'
      expect(subE1Mapping).toContain('subE1');
    });

    it('should add boundary metadata to start and end nodes', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();

      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(true);

      // Find the namespaced start node
      const subStartId = result.nodeIdMapping.get('subStart');
      expect(subStartId).toBeDefined();

      const subStartNode = graph.getNode(subStartId!);
      expect(subStartNode).toBeDefined();
      expect(subStartNode?.metadata).toBeDefined();
      expect(subStartNode?.metadata?.['subgraphBoundaryType']).toBe('entry');

      // Find the namespaced end node
      const subEndId = result.nodeIdMapping.get('subEnd');
      expect(subEndId).toBeDefined();

      const subEndNode = graph.getNode(subEndId!);
      expect(subEndNode).toBeDefined();
      expect(subEndNode?.metadata).toBeDefined();
      expect(subEndNode?.metadata?.['subgraphBoundaryType']).toBe('exit');
    });

    it('should connect incoming edges to subgraph start node', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();

      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(true);

      // Find the namespaced start node
      const subStartId = result.nodeIdMapping.get('subStart');
      expect(subStartId).toBeDefined();

      // Check that the incoming edge from 'start' now points to the namespaced start node
      const incomingEdges = graph.getIncomingEdges(subStartId!);
      expect(incomingEdges.length).toBeGreaterThan(0);
      expect(incomingEdges[0]!.sourceNodeId).toBe('start');
    });

    it('should connect outgoing edges from subgraph end nodes', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();

      const graph = GraphBuilder.build(mainWorkflow);

      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(true);

      // Find the namespaced end node
      const subEndId = result.nodeIdMapping.get('subEnd');
      expect(subEndId).toBeDefined();

      // Check that the outgoing edge to 'end' now comes from the namespaced end node
      const outgoingEdges = graph.getOutgoingEdges(subEndId!);
      expect(outgoingEdges.length).toBeGreaterThan(0);
      expect(outgoingEdges[0]!.targetNodeId).toBe('end');
    });

    it('should register subgraph relationship', () => {
      const mainWorkflow = createSubgraphWorkflow();
      const subWorkflow = createSubWorkflow();

      const graph = GraphBuilder.build(mainWorkflow);

      const registerSubgraphRelationship = jest.fn();

      const workflowRegistry = {
        get: (id: string) => {
          if (id === 'subwf1') {
            return subWorkflow;
          }
          return undefined;
        },
        registerSubgraphRelationship,
      };

      GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(registerSubgraphRelationship).toHaveBeenCalledWith(
        'wf4',
        'subgraph',
        'subwf1'
      );
    });

    it('should handle workflow with no subgraph nodes', () => {
      const workflow = createSimpleWorkflow();
      const graph = GraphBuilder.build(workflow);

      const workflowRegistry = {
        get: jest.fn(),
        registerSubgraphRelationship: jest.fn(),
      };

      const result = GraphBuilder.processSubgraphs(graph, workflowRegistry);

      expect(result.success).toBe(true);
      expect(result.addedNodeIds.length).toBe(0);
      expect(result.removedNodeIds.length).toBe(0);
      expect(result.subworkflowIds.length).toBe(0);
    });
  });
});