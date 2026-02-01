/**
 * graph-topological-sorter.test.ts
 * 图拓扑排序函数的单元测试
 */

import { GraphData } from '../../../entities/graph-data';
import type { GraphNode, GraphEdge } from '../../../../types';
import { NodeType, EdgeType } from '../../../../types';
import { topologicalSort } from '../graph-topological-sorter';

/**
 * 创建无环的有向无环图（DAG）
 * 结构：1 -> 2 -> 3
 *        |    \
 *        v     v
 *        4 -> 5
 */
function createAcyclicGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.LLM, name: 'Node 3', workflowId: 'wf1' },
    { id: '4', type: NodeType.LLM, name: 'Node 4', workflowId: 'wf1' },
    { id: '5', type: NodeType.END, name: 'Node 5', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '2', targetNodeId: '5', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: '1', targetNodeId: '4', type: EdgeType.DEFAULT },
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
 * 创建有环的图
 * 结构：1 -> 2 -> 3
 *       ^         |
 *       |_________|
 */
function createCyclicGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.END, name: 'Node 3', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '3', targetNodeId: '1', type: EdgeType.DEFAULT }, // Creates cycle
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = '1';
  graph.endNodeIds.add('3');

  return graph;
}

/**
 * 创建线性链的图
 * 结构：1 -> 2 -> 3 -> 4
 */
function createLinearGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.LLM, name: 'Node 3', workflowId: 'wf1' },
    { id: '4', type: NodeType.END, name: 'Node 4', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
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
 * 创建菱形结构的图
 * 结构：1 -> 2 -> 4
 *       |    X
 *       v    v
 *       3 -> 5
 */
function createDiamondGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.LLM, name: 'Node 3', workflowId: 'wf1' },
    { id: '4', type: NodeType.LLM, name: 'Node 4', workflowId: 'wf1' },
    { id: '5', type: NodeType.END, name: 'Node 5', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '1', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '2', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e5', sourceNodeId: '2', targetNodeId: '5', type: EdgeType.DEFAULT },
    { id: 'e6', sourceNodeId: '3', targetNodeId: '5', type: EdgeType.DEFAULT },
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

describe('graph-topological-sorter', () => {
  describe('topologicalSort', () => {
    it('should successfully sort acyclic graph', () => {
      const graph = createAcyclicGraph();
      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes.length).toBe(5);
      expect(result.cycleNodes).toBeUndefined();
    });

    it('should maintain topological order', () => {
      const graph = createAcyclicGraph();
      const result = topologicalSort(graph);

      const nodeIndex = new Map<string, number>();
      result.sortedNodes.forEach((nodeId, index) => {
        nodeIndex.set(nodeId, index);
      });

      // Check that all edges respect the ordering
      for (const edge of graph.edges.values()) {
        const sourceIndex = nodeIndex.get(edge.sourceNodeId)!;
        const targetIndex = nodeIndex.get(edge.targetNodeId)!;
        expect(sourceIndex).toBeLessThan(targetIndex);
      }
    });

    it('should fail to sort cyclic graph', () => {
      const graph = createCyclicGraph();
      const result = topologicalSort(graph);

      expect(result.success).toBe(false);
      expect(result.sortedNodes.length).toBeLessThan(3);
    });

    it('should identify cycle nodes when sorting fails', () => {
      const graph = createCyclicGraph();
      const result = topologicalSort(graph);

      expect(result.success).toBe(false);
      expect(result.cycleNodes).toBeDefined();
      expect(result.cycleNodes!.length).toBeGreaterThan(0);
    });

    it('should sort linear graph correctly', () => {
      const graph = createLinearGraph();
      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes).toEqual(['1', '2', '3', '4']);
    });

    it('should sort diamond graph correctly', () => {
      const graph = createDiamondGraph();
      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes.length).toBe(5);

      const nodeIndex = new Map<string, number>();
      result.sortedNodes.forEach((nodeId, index) => {
        nodeIndex.set(nodeId, index);
      });

      // Node 1 should come first
      expect(result.sortedNodes[0]).toBe('1');

      // Node 2 and 3 should come before 4 and 5
      expect(nodeIndex.get('2')!).toBeLessThan(nodeIndex.get('4')!);
      expect(nodeIndex.get('3')!).toBeLessThan(nodeIndex.get('4')!);
      expect(nodeIndex.get('2')!).toBeLessThan(nodeIndex.get('5')!);
      expect(nodeIndex.get('3')!).toBeLessThan(nodeIndex.get('5')!);
    });

    it('should handle empty graph', () => {
      const graph = new GraphData();
      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes).toEqual([]);
    });

    it('should handle single node graph', () => {
      const graph = new GraphData();
      const node: GraphNode = { id: '1', type: NodeType.LLM, name: 'Node 1', workflowId: 'wf1' };
      graph.addNode(node);

      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes).toEqual(['1']);
    });

    it('should handle disconnected graph', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' },
        { id: '3', type: NodeType.END, name: 'Node 3', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      // Only connect 1 -> 2, 3 is disconnected
      const edge: GraphEdge = { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT };
      graph.addEdge(edge);

      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes.length).toBe(3);
      expect(result.sortedNodes).toContain('1');
      expect(result.sortedNodes).toContain('2');
      expect(result.sortedNodes).toContain('3');
    });

    it('should handle multiple source nodes', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
        { id: '2', type: NodeType.START, name: 'Node 2', workflowId: 'wf1' },
        { id: '3', type: NodeType.LLM, name: 'Node 3', workflowId: 'wf1' },
        { id: '4', type: NodeType.END, name: 'Node 4', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes.length).toBe(4);
    });

    it('should handle multiple sink nodes', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' },
        { id: '3', type: NodeType.END, name: 'Node 3', workflowId: 'wf1' },
        { id: '4', type: NodeType.END, name: 'Node 4', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '2', targetNodeId: '4', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes.length).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('should handle graph with multiple paths to same node', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' },
        { id: '3', type: NodeType.LLM, name: 'Node 3', workflowId: 'wf1' },
        { id: '4', type: NodeType.END, name: 'Node 4', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '1', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '2', targetNodeId: '4', type: EdgeType.DEFAULT },
        { id: 'e4', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      const result = topologicalSort(graph);

      expect(result.success).toBe(true);
      expect(result.sortedNodes.length).toBe(4);
    });

    it('should detect cycle with self-loop', () => {
      const graph = new GraphData();

      const node: GraphNode = { id: '1', type: NodeType.LLM, name: 'Node 1', workflowId: 'wf1' };
      graph.addNode(node);

      const edge: GraphEdge = { id: 'e1', sourceNodeId: '1', targetNodeId: '1', type: EdgeType.DEFAULT };
      graph.addEdge(edge);

      const result = topologicalSort(graph);

      expect(result.success).toBe(false);
      expect(result.cycleNodes).toBeDefined();
    });
  });
});
