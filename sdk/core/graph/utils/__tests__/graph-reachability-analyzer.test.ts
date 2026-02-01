/**
 * graph-reachability-analyzer.test.ts
 * 图可达性分析函数的单元测试
 */

import { GraphData } from '../../../entities/graph-data';
import type { GraphNode, GraphEdge } from '../../../../types';
import { NodeType, EdgeType } from '../../../../types';
import { analyzeReachability } from '../graph-reachability-analyzer';

/**
 * 创建标准工作流图
 * 结构：START(1) -> TASK(2) -> TASK(3) -> END(5)
 *                    \-> TASK(4) ->/
 */
function createStandardGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
    { id: '4', type: NodeType.LLM, name: 'Task 4', workflowId: 'wf1' },
    { id: '5', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '2', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: '3', targetNodeId: '5', type: EdgeType.DEFAULT },
    { id: 'e5', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = '1';
  graph.endNodeIds.add('5');

  return graph;
}

/**
 * 创建包含不可达节点的图
 * 结构：START(1) -> TASK(2) -> END(4)
 *       TASK(3) (disconnected)
 */
function createGraphWithUnreachable() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.LLM, name: 'Unreachable', workflowId: 'wf1' },
    { id: '4', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '4', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = '1';
  graph.endNodeIds.add('4');

  return graph;
}

/**
 * 创建包含死节点的图
 * 结构：START(1) -> TASK(2) -> TASK(3)
 *                 |    \
 *                 v     v
 *                 TASK(4) -> END(5)
 *       (3 has no path to 5)
 */
function createGraphWithDeadEnd() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.LLM, name: 'Dead End', workflowId: 'wf1' },
    { id: '4', type: NodeType.LLM, name: 'Task 4', workflowId: 'wf1' },
    { id: '5', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '1', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
    { id: 'e5', sourceNodeId: '2', targetNodeId: '5', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = '1';
  graph.endNodeIds.add('5');

  return graph;
}

/**
 * 创建多个END节点的图
 * 结构：START(1) -> TASK(2) -> END(3)
 *                 -> TASK(4) -> END(5)
 */
function createGraphWithMultipleEnds() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.END, name: 'End 1', workflowId: 'wf1' },
    { id: '4', type: NodeType.LLM, name: 'Task 4', workflowId: 'wf1' },
    { id: '5', type: NodeType.END, name: 'End 2', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '1', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = '1';
  graph.endNodeIds.add('3');
  graph.endNodeIds.add('5');

  return graph;
}

describe('graph-reachability-analyzer', () => {
  describe('analyzeReachability', () => {
    it('should analyze standard graph correctly', () => {
      const graph = createStandardGraph();
      const result = analyzeReachability(graph);

      expect(result.reachableFromStart.size).toBe(5);
      expect(result.reachableFromStart.has('1')).toBe(true);
      expect(result.reachableFromStart.has('2')).toBe(true);
      expect(result.reachableFromStart.has('3')).toBe(true);
      expect(result.reachableFromStart.has('4')).toBe(true);
      expect(result.reachableFromStart.has('5')).toBe(true);

      expect(result.unreachableNodes.size).toBe(0);
      expect(result.deadEndNodes.size).toBe(0);
    });

    it('should detect reachable nodes from start', () => {
      const graph = createStandardGraph();
      const result = analyzeReachability(graph);

      expect(result.reachableFromStart).toEqual(
        new Set(['1', '2', '3', '4', '5'])
      );
    });

    it('should detect nodes reaching to end', () => {
      const graph = createStandardGraph();
      const result = analyzeReachability(graph);

      expect(result.reachableToEnd).toEqual(
        new Set(['1', '2', '3', '4', '5'])
      );
    });

    it('should detect unreachable nodes', () => {
      const graph = createGraphWithUnreachable();
      const result = analyzeReachability(graph);

      expect(result.unreachableNodes.size).toBe(1);
      expect(result.unreachableNodes.has('3')).toBe(true);
      expect(result.reachableFromStart.has('3')).toBe(false);
    });

    it('should detect dead end nodes', () => {
      const graph = createGraphWithDeadEnd();
      const result = analyzeReachability(graph);

      expect(result.deadEndNodes.size).toBe(1);
      expect(result.deadEndNodes.has('3')).toBe(true);
      expect(result.reachableToEnd.has('3')).toBe(false);
    });

    it('should handle multiple end nodes', () => {
      const graph = createGraphWithMultipleEnds();
      const result = analyzeReachability(graph);

      // All nodes should reach to at least one END node
      expect(result.reachableToEnd.size).toBe(5);
      expect(result.deadEndNodes.size).toBe(0);
    });

    it('should include start node in reachable from start', () => {
      const graph = createStandardGraph();
      const result = analyzeReachability(graph);

      expect(result.reachableFromStart.has('1')).toBe(true);
    });

    it('should handle graph without start node', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.LLM, name: 'Task 1', workflowId: 'wf1' },
        { id: '2', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edge: GraphEdge = {
        id: 'e1',
        sourceNodeId: '1',
        targetNodeId: '2',
        type: EdgeType.DEFAULT,
      };
      graph.addEdge(edge);
      graph.endNodeIds.add('2');

      const result = analyzeReachability(graph);

      expect(result.reachableFromStart.size).toBe(0);
      expect(result.reachableToEnd.size).toBe(2);
    });

    it('should handle graph without end nodes', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Task', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edge: GraphEdge = {
        id: 'e1',
        sourceNodeId: '1',
        targetNodeId: '2',
        type: EdgeType.DEFAULT,
      };
      graph.addEdge(edge);

      graph.startNodeId = '1';

      const result = analyzeReachability(graph);

      expect(result.reachableFromStart.size).toBe(2);
      expect(result.reachableToEnd.size).toBe(0);
    });

    it('should handle single node graph', () => {
      const graph = new GraphData();

      const node: GraphNode = {
        id: '1',
        type: NodeType.START,
        name: 'Single',
        workflowId: 'wf1',
      };
      graph.addNode(node);

      graph.startNodeId = '1';
      graph.endNodeIds.add('1');

      const result = analyzeReachability(graph);

      expect(result.reachableFromStart.size).toBe(1);
      expect(result.reachableFromStart.has('1')).toBe(true);
      expect(result.reachableToEnd.size).toBe(1);
      expect(result.reachableToEnd.has('1')).toBe(true);
      expect(result.unreachableNodes.size).toBe(0);
      expect(result.deadEndNodes.size).toBe(0);
    });

    it('should handle empty graph', () => {
      const graph = new GraphData();

      const result = analyzeReachability(graph);

      expect(result.reachableFromStart.size).toBe(0);
      expect(result.reachableToEnd.size).toBe(0);
      expect(result.unreachableNodes.size).toBe(0);
      expect(result.deadEndNodes.size).toBe(0);
    });

    it('should correctly identify partial reachability', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
        { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
        { id: '4', type: NodeType.LLM, name: 'Task 4', workflowId: 'wf1' },
        { id: '5', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '1', targetNodeId: '4', type: EdgeType.DEFAULT },
        { id: 'e4', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
        { id: 'e5', sourceNodeId: '2', targetNodeId: '5', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      graph.startNodeId = '1';
      graph.endNodeIds.add('5');

      const result = analyzeReachability(graph);

      // All nodes reachable from start
      expect(result.reachableFromStart.size).toBe(5);

      // Only 1, 2, 4, 5 reach the end (3 is dead end)
      expect(result.reachableToEnd.size).toBe(4);
      expect(result.reachableToEnd.has('3')).toBe(false);

      // No unreachable nodes
      expect(result.unreachableNodes.size).toBe(0);

      // Node 3 is dead end
      expect(result.deadEndNodes.size).toBe(1);
      expect(result.deadEndNodes.has('3')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle branching and merging', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
        { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
        { id: '4', type: NodeType.LLM, name: 'Task 4', workflowId: 'wf1' },
        { id: '5', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '1', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '2', targetNodeId: '4', type: EdgeType.DEFAULT },
        { id: 'e4', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
        { id: 'e5', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      graph.startNodeId = '1';
      graph.endNodeIds.add('5');

      const result = analyzeReachability(graph);

      expect(result.unreachableNodes.size).toBe(0);
      expect(result.deadEndNodes.size).toBe(0);
      expect(result.reachableFromStart.size).toBe(5);
      expect(result.reachableToEnd.size).toBe(5);
    });

    it('should handle sequential nodes', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
        { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
        { id: '4', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      graph.startNodeId = '1';
      graph.endNodeIds.add('4');

      const result = analyzeReachability(graph);

      expect(result.reachableFromStart).toEqual(
        new Set(['1', '2', '3', '4'])
      );
      expect(result.reachableToEnd).toEqual(new Set(['1', '2', '3', '4']));
    });
  });
});
