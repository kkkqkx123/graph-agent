/**
 * graph-cycle-detector.test.ts
 * 图环检测函数的单元测试
 */

import { GraphData } from '../../../entities/graph-data';
import type { GraphNode, GraphEdge } from '@modular-agent/types';
import { NodeType, EdgeType } from '@modular-agent/types';
import { detectCycles } from '../graph-cycle-detector';

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
 * 创建自环的图
 * 结构：1 -> 1 (self-loop)
 */
function createSelfLoopGraph() {
  const graph = new GraphData();

  const node: GraphNode = { id: '1', type: NodeType.LLM, name: 'Node 1', workflowId: 'wf1' };
  graph.addNode(node);

  const edge: GraphEdge = { id: 'e1', sourceNodeId: '1', targetNodeId: '1', type: EdgeType.DEFAULT };
  graph.addEdge(edge);

  graph.startNodeId = '1';
  graph.endNodeIds.add('1');

  return graph;
}

/**
 * 创建复杂环的图
 * 结构：1 -> 2 -> 3
 *            ^    |
 *            |____|
 *            4 -> 5
 */
function createComplexCyclicGraph() {
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
    { id: 'e3', sourceNodeId: '3', targetNodeId: '2', type: EdgeType.DEFAULT }, // Creates cycle 2 -> 3 -> 2
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

describe('graph-cycle-detector', () => {
  describe('detectCycles', () => {
    it('should detect no cycle in acyclic graph', () => {
      const graph = createAcyclicGraph();
      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(false);
      expect(result.cycleNodes).toBeUndefined();
      expect(result.cycleEdges).toBeUndefined();
    });

    it('should detect cycle in cyclic graph', () => {
      const graph = createCyclicGraph();
      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(true);
      expect(result.cycleNodes).toBeDefined();
      expect(result.cycleEdges).toBeDefined();
    });

    it('should include all cycle nodes when cycle is detected', () => {
      const graph = createCyclicGraph();
      const result = detectCycles(graph);

      expect(result.cycleNodes).toContain('1');
      expect(result.cycleNodes).toContain('2');
      expect(result.cycleNodes).toContain('3');
    });

    it('should include all cycle edges when cycle is detected', () => {
      const graph = createCyclicGraph();
      const result = detectCycles(graph);

      expect(result.cycleEdges).toContain('e1');
      expect(result.cycleEdges).toContain('e2');
      expect(result.cycleEdges).toContain('e3');
    });

    it('should detect self-loop as cycle', () => {
      const graph = createSelfLoopGraph();
      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(true);
      expect(result.cycleNodes).toContain('1');
    });

    it('should detect cycle in complex graph', () => {
      const graph = createComplexCyclicGraph();
      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(true);
      expect(result.cycleNodes).toBeDefined();
      expect(result.cycleNodes).toContain('2');
      expect(result.cycleNodes).toContain('3');
    });

    it('should handle empty graph', () => {
      const graph = new GraphData();
      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(false);
      expect(result.cycleNodes).toBeUndefined();
      expect(result.cycleEdges).toBeUndefined();
    });

    it('should handle single node graph', () => {
      const graph = new GraphData();
      const node: GraphNode = { id: '1', type: NodeType.LLM, name: 'Node 1', workflowId: 'wf1' };
      graph.addNode(node);

      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(false);
      expect(result.cycleNodes).toBeUndefined();
      expect(result.cycleEdges).toBeUndefined();
    });

    it('should handle multiple disconnected components', () => {
      const graph = new GraphData();

      // Component 1: 1 -> 2
      const node1: GraphNode = { id: '1', type: NodeType.START, name: 'Node 1', workflowId: 'wf1' };
      const node2: GraphNode = { id: '2', type: NodeType.LLM, name: 'Node 2', workflowId: 'wf1' };
      graph.addNode(node1);
      graph.addNode(node2);
      const edge1: GraphEdge = { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT };
      graph.addEdge(edge1);

      // Component 2: 3 -> 3 (cycle)
      const node3: GraphNode = { id: '3', type: NodeType.END, name: 'Node 3', workflowId: 'wf1' };
      graph.addNode(node3);
      const edge2: GraphEdge = { id: 'e2', sourceNodeId: '3', targetNodeId: '3', type: EdgeType.DEFAULT };
      graph.addEdge(edge2);

      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(true);
      expect(result.cycleNodes).toContain('3');
    });

    it('should only report first cycle found', () => {
      const graph = createCyclicGraph();
      const result = detectCycles(graph);

      // Should find one cycle (implementation stops at first cycle)
      expect(result.hasCycle).toBe(true);
      expect(result.cycleNodes).toBeDefined();
      expect(result.cycleNodes!.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle linear graph without cycle', () => {
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
        { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(false);
    });

    it('should handle branching graph without cycle', () => {
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

      const result = detectCycles(graph);

      expect(result.hasCycle).toBe(false);
    });
  });
});
