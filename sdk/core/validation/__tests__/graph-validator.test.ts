/**
 * 图验证器单元测试
 */

import { GraphValidator } from '../graph-validator';
import { GraphData } from '../../entities/graph-data';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import type { GraphNode, GraphEdge } from '../../../types/graph';
import type { Node } from '../../../types/node';

describe('GraphValidator', () => {
  let graph: GraphData;

  beforeEach(() => {
    graph = new GraphData();
  });

  /**
   * 创建测试节点
   */
  function createNode(
    id: string,
    type: NodeType,
    name: string,
    config?: any
  ): GraphNode {
    const node: GraphNode = {
      id,
      type,
      name,
      workflowId: 'test-workflow',
    };
    
    // 始终创建 originalNode，即使没有 config
    node.originalNode = {
      id,
      type,
      name,
      config: config || {},
      incomingEdgeIds: [],
      outgoingEdgeIds: [],
    } as Node;
    
    return node;
  }

  /**
   * 创建测试边
   */
  function createEdge(
    id: string,
    sourceNodeId: string,
    targetNodeId: string,
    type: EdgeType = EdgeType.DEFAULT
  ): GraphEdge {
    return {
      id,
      sourceNodeId,
      targetNodeId,
      type,
    };
  }

  /**
   * 更新图中节点的边引用
   */
  function updateNodeEdgeReferences(graph: GraphData): void {
    // 重置所有节点的边引用
    for (const node of graph.nodes.values()) {
      if (node.originalNode) {
        node.originalNode.incomingEdgeIds = [];
        node.originalNode.outgoingEdgeIds = [];
      }
    }
    
    // 更新边引用
    for (const edge of graph.edges.values()) {
      const sourceNode = graph.getNode(edge.sourceNodeId);
      const targetNode = graph.getNode(edge.targetNodeId);
      
      if (sourceNode?.originalNode) {
        sourceNode.originalNode.outgoingEdgeIds.push(edge.id);
      }
      
      if (targetNode?.originalNode) {
        targetNode.originalNode.incomingEdgeIds.push(edge.id);
      }
    }
  }

  describe('validate - 基本验证', () => {
    it('应该验证一个有效的简单图', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge = createEdge('edge-1', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it('应该支持禁用某些验证选项', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge = createEdge('edge-1', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph, {
        checkCycles: false,
        checkReachability: false,
      });
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateStartEndNodes', () => {
    it('应该检测缺少START节点', () => {
      const endNode = createNode('end', 'END' as NodeType, 'End');
      graph.addNode(endNode);
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'MISSING_START_NODE')).toBe(true);
      }
    });

    it('应该检测缺少END节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      graph.addNode(startNode);
      graph.startNodeId = 'start';
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'MISSING_END_NODE')).toBe(true);
      }
    });

    it('应该检测START节点有入边', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge = createEdge('edge-1', 'end', 'start');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'START_NODE_HAS_INCOMING_EDGES')).toBe(true);
      }
    });

    it('应该检测END节点有出边', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge = createEdge('edge-1', 'end', 'start');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'END_NODE_HAS_OUTGOING_EDGES')).toBe(true);
      }
    });

    it('应该检测多个START节点', () => {
      const startNode1 = createNode('start-1', 'START' as NodeType, 'Start 1');
      const startNode2 = createNode('start-2', 'START' as NodeType, 'Start 2');
      const endNode = createNode('end', 'END' as NodeType, 'End');

      graph.addNode(startNode1);
      graph.addNode(startNode2);
      graph.addNode(endNode);
      graph.startNodeId = 'start-1';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'MULTIPLE_START_NODES')).toBe(true);
      }
    });

    it('应该接受多个END节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode1 = createNode('end-1', 'END' as NodeType, 'End 1');
      const endNode2 = createNode('end-2', 'END' as NodeType, 'End 2');
      const edge1 = createEdge('edge-1', 'start', 'end-1');
      const edge2 = createEdge('edge-2', 'start', 'end-2');

      graph.addNode(startNode);
      graph.addNode(endNode1);
      graph.addNode(endNode2);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end-1');
      graph.endNodeIds.add('end-2');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
      });
      });

      describe('validateIsolatedNodes', () => {
    it('应该检测孤立节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const isolatedNode = createNode('isolated', 'CODE' as NodeType, 'Isolated');
      const edge = createEdge('edge-1', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addNode(isolatedNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'ISOLATED_NODE')).toBe(true);
      }
    });

    it('不应该将START节点视为孤立节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge = createEdge('edge-1', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
      });

      it('不应该将END节点视为孤立节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge = createEdge('edge-1', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateCycles', () => {
    it('应该检测循环依赖', () => {
      const node1 = createNode('node-1', 'CODE' as NodeType, 'Node 1');
      const node2 = createNode('node-2', 'CODE' as NodeType, 'Node 2');
      const node3 = createNode('node-3', 'CODE' as NodeType, 'Node 3');
      const edge1 = createEdge('edge-1', 'node-1', 'node-2');
      const edge2 = createEdge('edge-2', 'node-2', 'node-3');
      const edge3 = createEdge('edge-3', 'node-3', 'node-1');

      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(node3);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.addEdge(edge3);
      graph.startNodeId = 'node-1';
      graph.endNodeIds.add('node-3');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'CYCLE_DETECTED')).toBe(true);
      }
    });

    it('应该接受无环图', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const node1 = createNode('node-1', 'CODE' as NodeType, 'Node 1');
      const node2 = createNode('node-2', 'CODE' as NodeType, 'Node 2');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'node-1');
      const edge2 = createEdge('edge-2', 'node-1', 'node-2');
      const edge3 = createEdge('edge-3', 'node-2', 'end');

      graph.addNode(startNode);
      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.addEdge(edge3);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateReachability', () => {
    it('应该检测从START不可达的节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const unreachableNode = createNode('unreachable', 'CODE' as NodeType, 'Unreachable');
      const edge = createEdge('edge-1', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(endNode);
      graph.addNode(unreachableNode);
      graph.addEdge(edge);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'UNREACHABLE_NODE')).toBe(true);
      }
    });

    it('应该检测无法到达END的节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const deadEndNode = createNode('dead-end', 'CODE' as NodeType, 'Dead End');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'dead-end');
      const edge2 = createEdge('edge-2', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(deadEndNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'DEAD_END_NODE')).toBe(true);
      }
    });
  });

  describe('validateForkJoinPairs', () => {
    it('应该检测未配对的FORK节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const forkNode = createNode('fork', 'FORK' as NodeType, 'Fork', {
        forkPathIds: ['fork-1'],
        childNodeIds: ['child-1']
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'fork');
      const edge2 = createEdge('edge-2', 'fork', 'end');

      graph.addNode(startNode);
      graph.addNode(forkNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'UNPAIRED_FORK')).toBe(true);
      }
    });

    it('应该检测未配对的JOIN节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const joinNode = createNode('join', 'JOIN' as NodeType, 'Join', {
        forkPathIds: ['join-1']
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'join');
      const edge2 = createEdge('edge-2', 'join', 'end');

      graph.addNode(startNode);
      graph.addNode(joinNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'UNPAIRED_JOIN')).toBe(true);
      }
    });

    it('应该检测FORK无法到达配对的JOIN', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const forkNode = createNode('fork', 'FORK' as NodeType, 'Fork', {
        forkPathIds: ['fork-1'],
        childNodeIds: ['child-1']
      });
      const joinNode = createNode('join', 'JOIN' as NodeType, 'Join', {
        forkPathIds: ['fork-1']
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'fork');
      const edge2 = createEdge('edge-2', 'start', 'end');

      graph.addNode(startNode);
      graph.addNode(forkNode);
      graph.addNode(joinNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'FORK_JOIN_NOT_REACHABLE')).toBe(true);
      }
    });

    it('应该接受有效的FORK/JOIN配对', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const forkNode = createNode('fork', 'FORK' as NodeType, 'Fork', {
        forkPathIds: ['fork-1'],
        childNodeIds: ['child-1']
      });
      const joinNode = createNode('join', 'JOIN' as NodeType, 'Join', {
        forkPathIds: ['fork-1']
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'fork');
      const edge2 = createEdge('edge-2', 'fork', 'join');
      const edge3 = createEdge('edge-3', 'join', 'end');

      graph.addNode(startNode);
      graph.addNode(forkNode);
      graph.addNode(joinNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.addEdge(edge3);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
    });

    it('应该接受多个FORK/JOIN配对', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const forkNode1 = createNode('fork-1', 'FORK' as NodeType, 'Fork 1', {
        forkPathIds: ['fork-1'],
        childNodeIds: ['child-1']
      });
      const joinNode1 = createNode('join-1', 'JOIN' as NodeType, 'Join 1', {
        forkPathIds: ['fork-1']
      });
      const forkNode2 = createNode('fork-2', 'FORK' as NodeType, 'Fork 2', {
        forkPathIds: ['fork-2'],
        childNodeIds: ['child-2']
      });
      const joinNode2 = createNode('join-2', 'JOIN' as NodeType, 'Join 2', {
        forkPathIds: ['fork-2']
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'fork-1');
      const edge2 = createEdge('edge-2', 'fork-1', 'join-1');
      const edge3 = createEdge('edge-3', 'join-1', 'fork-2');
      const edge4 = createEdge('edge-4', 'fork-2', 'join-2');
      const edge5 = createEdge('edge-5', 'join-2', 'end');

      graph.addNode(startNode);
      graph.addNode(forkNode1);
      graph.addNode(joinNode1);
      graph.addNode(forkNode2);
      graph.addNode(joinNode2);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.addEdge(edge3);
      graph.addEdge(edge4);
      graph.addEdge(edge5);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateSubgraphExistence', () => {
    it('应该检测缺少subgraphId的SUBGRAPH节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const subgraphNode = createNode('subgraph', 'SUBGRAPH' as NodeType, 'Subgraph', {});
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'subgraph');
      const edge2 = createEdge('edge-2', 'subgraph', 'end');

      graph.addNode(startNode);
      graph.addNode(subgraphNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph, {
        checkSubgraphExistence: true,
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'MISSING_SUBGRAPH_ID')).toBe(true);
      }
    });

    it('应该接受有subgraphId的SUBGRAPH节点', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const subgraphNode = createNode('subgraph', 'SUBGRAPH' as NodeType, 'Subgraph', {
        subgraphId: 'subgraph-1',
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'subgraph');
      const edge2 = createEdge('edge-2', 'subgraph', 'end');

      graph.addNode(startNode);
      graph.addNode(subgraphNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph, {
        checkSubgraphExistence: true,
      });
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateSubgraphCompatibility', () => {
    it('应该检测无效的输入映射', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const subgraphNode = createNode('subgraph', 'SUBGRAPH' as NodeType, 'Subgraph', {
        subgraphId: 'subgraph-1',
        inputMapping: { '': 'validInput' },
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'subgraph');
      const edge2 = createEdge('edge-2', 'subgraph', 'end');

      graph.addNode(startNode);
      graph.addNode(subgraphNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph, {
        checkSubgraphCompatibility: true,
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'INVALID_INPUT_MAPPING')).toBe(true);
      }
    });

    it('应该检测无效的输出映射', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const subgraphNode = createNode('subgraph', 'SUBGRAPH' as NodeType, 'Subgraph', {
        subgraphId: 'subgraph-1',
        outputMapping: { 'validOutput': '' },
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'subgraph');
      const edge2 = createEdge('edge-2', 'subgraph', 'end');

      graph.addNode(startNode);
      graph.addNode(subgraphNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph, {
        checkSubgraphCompatibility: true,
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.context?.['code'] === 'INVALID_OUTPUT_MAPPING')).toBe(true);
      }
    });

    it('应该接受有效的输入和输出映射', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const subgraphNode = createNode('subgraph', 'SUBGRAPH' as NodeType, 'Subgraph', {
        subgraphId: 'subgraph-1',
        inputMapping: { parentVar: 'subgraphInput' },
        outputMapping: { subgraphOutput: 'parentVar' },
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'subgraph');
      const edge2 = createEdge('edge-2', 'subgraph', 'end');

      graph.addNode(startNode);
      graph.addNode(subgraphNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph, {
        checkSubgraphCompatibility: true,
      });
      expect(result.isOk()).toBe(true);
    });
  });

  describe('analyze', () => {
    it('应该返回完整的图分析结果', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const node1 = createNode('node-1', 'CODE' as NodeType, 'Node 1');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'node-1');
      const edge2 = createEdge('edge-2', 'node-1', 'end');

      graph.addNode(startNode);
      graph.addNode(node1);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.analyze(graph);
      expect(result).toBeDefined();
      expect(result.cycleDetection).toBeDefined();
      expect(result.reachability).toBeDefined();
      expect(result.topologicalSort).toBeDefined();
      expect(result.forkJoinValidation).toBeDefined();
      expect(result.nodeStats).toBeDefined();
      expect(result.edgeStats).toBeDefined();
    });
  });

  describe('综合测试', () => {
    it('应该检测多个验证错误', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const forkNode = createNode('fork', 'FORK' as NodeType, 'Fork', {
        forkPathIds: ['fork-1'],
        childNodeIds: ['child-1']
      });
      const isolatedNode = createNode('isolated', 'CODE' as NodeType, 'Isolated');
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'fork');
      const edge2 = createEdge('edge-2', 'fork', 'end');

      graph.addNode(startNode);
      graph.addNode(forkNode);
      graph.addNode(isolatedNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(1);
        expect(result.error.some(e => e.context?.['code'] === 'UNPAIRED_FORK')).toBe(true);
        expect(result.error.some(e => e.context?.['code'] === 'ISOLATED_NODE')).toBe(true);
      }
    });

    it('应该接受一个复杂但有效的图', () => {
      const startNode = createNode('start', 'START' as NodeType, 'Start');
      const forkNode = createNode('fork', 'FORK' as NodeType, 'Fork', {
        forkPathIds: ['fork-1', 'fork-2'],
        childNodeIds: ['node-1', 'node-2']
      });
      const node1 = createNode('node-1', 'CODE' as NodeType, 'Node 1');
      const node2 = createNode('node-2', 'CODE' as NodeType, 'Node 2');
      const joinNode = createNode('join', 'JOIN' as NodeType, 'Join', {
        forkPathIds: ['fork-1', 'fork-2']
      });
      const endNode = createNode('end', 'END' as NodeType, 'End');
      const edge1 = createEdge('edge-1', 'start', 'fork');
      const edge2 = createEdge('edge-2', 'fork', 'node-1');
      const edge3 = createEdge('edge-3', 'fork', 'node-2');
      const edge4 = createEdge('edge-4', 'node-1', 'join');
      const edge5 = createEdge('edge-5', 'node-2', 'join');
      const edge6 = createEdge('edge-6', 'join', 'end');

      graph.addNode(startNode);
      graph.addNode(forkNode);
      graph.addNode(node1);
      graph.addNode(node2);
      graph.addNode(joinNode);
      graph.addNode(endNode);
      graph.addEdge(edge1);
      graph.addEdge(edge2);
      graph.addEdge(edge3);
      graph.addEdge(edge4);
      graph.addEdge(edge5);
      graph.addEdge(edge6);
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      
      // 更新节点的边引用
      updateNodeEdgeReferences(graph);

      const result = GraphValidator.validate(graph);
      expect(result.isOk()).toBe(true);
    });
  });
});