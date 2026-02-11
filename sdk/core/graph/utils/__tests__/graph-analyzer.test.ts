/**
 * graph-analyzer.test.ts
 * 图分析工具函数的单元测试
 */

import { GraphData } from '../../../entities/graph-data';
import type { GraphNode, GraphEdge, Node } from '@modular-agent/types';
import { NodeType, EdgeType } from '@modular-agent/types';
import { analyzeGraph, collectForkJoinPairs } from '../graph-analyzer';

/**
 * 创建标准无环工作流图
 * 结构：START(1) -> TASK(2) -> TASK(3) -> END(4)
 */
function createStandardGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: '2', type: NodeType.LLM, name: 'Task 2', workflowId: 'wf1' },
    { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
    { id: '4', type: NodeType.END, name: 'End', workflowId: 'wf1' },
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
 * 创建包含FORK/JOIN的工作流图
 * 结构：START(1) -> FORK(2) -> TASK(3) -> JOIN(4) -> END(5)
 *                           -> TASK(6) ->/
 */
function createForkJoinGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    {
      id: '2',
      type: NodeType.FORK,
      name: 'Fork',
      workflowId: 'wf1',
      originalNode: {
        id: '2',
        type: NodeType.FORK,
        name: 'Fork',
        config: { forkId: 'fork1' },
      } as any,
    },
    { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
    {
      id: '4',
      type: NodeType.JOIN,
      name: 'Join',
      workflowId: 'wf1',
      originalNode: {
        id: '4',
        type: NodeType.JOIN,
        name: 'Join',
        config: { joinId: 'fork1' },
      } as any,
    },
    { id: '5', type: NodeType.END, name: 'End', workflowId: 'wf1' },
    { id: '6', type: NodeType.LLM, name: 'Task 6', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '2', targetNodeId: '6', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e5', sourceNodeId: '6', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e6', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
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
 * 创建包含不配对FORK/JOIN的工作流图
 */
function createUnpairedForkJoinGraph() {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    {
      id: '2',
      type: NodeType.FORK,
      name: 'Fork',
      workflowId: 'wf1',
      originalNode: {
        id: '2',
        type: NodeType.FORK,
        name: 'Fork',
        config: { forkId: 'fork1' },
      } as any,
    },
    { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
    {
      id: '4',
      type: NodeType.JOIN,
      name: 'Join',
      workflowId: 'wf1',
      originalNode: {
        id: '4',
        type: NodeType.JOIN,
        name: 'Join',
        config: { joinId: 'fork2' }, // Different joinId - unpaired
      } as any,
    },
    { id: '5', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
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

describe('graph-analyzer', () => {
  describe('analyzeGraph', () => {
    it('should return comprehensive analysis result', () => {
      const graph = createStandardGraph();
      const result = analyzeGraph(graph);

      expect(result).toHaveProperty('cycleDetection');
      expect(result).toHaveProperty('reachability');
      expect(result).toHaveProperty('topologicalSort');
      expect(result).toHaveProperty('forkJoinValidation');
      expect(result).toHaveProperty('nodeStats');
      expect(result).toHaveProperty('edgeStats');
    });

    it('should detect no cycle in acyclic graph', () => {
      const graph = createStandardGraph();
      const result = analyzeGraph(graph);

      expect(result.cycleDetection.hasCycle).toBe(false);
    });

    it('should perform successful topological sort on acyclic graph', () => {
      const graph = createStandardGraph();
      const result = analyzeGraph(graph);

      expect(result.topologicalSort.success).toBe(true);
      expect(result.topologicalSort.sortedNodes.length).toBe(4);
    });

    it('should analyze reachability correctly', () => {
      const graph = createStandardGraph();
      const result = analyzeGraph(graph);

      expect(result.reachability.reachableFromStart.size).toBe(4);
      expect(result.reachability.unreachableNodes.size).toBe(0);
      expect(result.reachability.deadEndNodes.size).toBe(0);
    });

    it('should collect valid fork/join pairs', () => {
      const graph = createForkJoinGraph();
      const result = analyzeGraph(graph);

      expect(result.forkJoinValidation.isValid).toBe(true);
      expect(result.forkJoinValidation.unpairedForks.length).toBe(0);
      expect(result.forkJoinValidation.unpairedJoins.length).toBe(0);
      expect(result.forkJoinValidation.pairs.size).toBe(1);
    });

    it('should calculate correct node statistics', () => {
      const graph = createStandardGraph();
      const result = analyzeGraph(graph);

      expect(result.nodeStats.total).toBe(4);
      expect(result.nodeStats.byType.get(NodeType.START)).toBe(1);
      expect(result.nodeStats.byType.get(NodeType.LLM)).toBe(2);
      expect(result.nodeStats.byType.get(NodeType.END)).toBe(1);
    });

    it('should calculate correct edge statistics', () => {
      const graph = createStandardGraph();
      const result = analyzeGraph(graph);

      expect(result.edgeStats.total).toBe(3);
      expect(result.edgeStats.byType.get(EdgeType.DEFAULT)).toBe(3);
    });

    it('should handle empty graph', () => {
      const graph = new GraphData();
      const result = analyzeGraph(graph);

      expect(result.cycleDetection.hasCycle).toBe(false);
      expect(result.nodeStats.total).toBe(0);
      expect(result.edgeStats.total).toBe(0);
    });

    it('should handle graph with multiple node types', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        {
          id: '2',
          type: NodeType.FORK,
          name: 'Fork',
          workflowId: 'wf1',
          originalNode: {
            id: '2',
            type: NodeType.FORK,
            name: 'Fork',
            config: { forkId: 'f1' },
          } as any,
        },
        { id: '3', type: NodeType.LLM, name: 'Task', workflowId: 'wf1' },
        {
          id: '4',
          type: NodeType.JOIN,
          name: 'Join',
          workflowId: 'wf1',
          originalNode: {
            id: '4',
            type: NodeType.JOIN,
            name: 'Join',
            config: { joinId: 'f1' },
          } as any,
        },
        { id: '5', type: NodeType.ROUTE, name: 'Condition', workflowId: 'wf1' },
        { id: '6', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '3', targetNodeId: '4', type: EdgeType.DEFAULT },
        { id: 'e4', sourceNodeId: '4', targetNodeId: '5', type: EdgeType.DEFAULT },
        {
          id: 'e5',
          sourceNodeId: '5',
          targetNodeId: '6',
          type: EdgeType.CONDITIONAL,
        },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      graph.startNodeId = '1';
      graph.endNodeIds.add('6');

      const result = analyzeGraph(graph);

      expect(result.nodeStats.total).toBe(6);
      expect(result.nodeStats.byType.get(NodeType.START)).toBe(1);
      expect(result.nodeStats.byType.get(NodeType.FORK)).toBe(1);
      expect(result.nodeStats.byType.get(NodeType.JOIN)).toBe(1);
      expect(result.nodeStats.byType.get(NodeType.LLM)).toBe(1);
      expect(result.nodeStats.byType.get(NodeType.ROUTE)).toBe(1);
      expect(result.nodeStats.byType.get(NodeType.END)).toBe(1);

      expect(result.edgeStats.total).toBe(5);
      expect(result.edgeStats.byType.get(EdgeType.DEFAULT)).toBe(4);
      expect(result.edgeStats.byType.get(EdgeType.CONDITIONAL)).toBe(1);
    });
  });

  describe('collectForkJoinPairs', () => {
    it('should collect valid fork/join pairs', () => {
      const graph = createForkJoinGraph();
      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(true);
      expect(result.pairs.size).toBe(1);
      expect(result.pairs.get('2')).toBe('4');
      expect(result.unpairedForks.length).toBe(0);
      expect(result.unpairedJoins.length).toBe(0);
    });

    it('should detect unpaired fork nodes', () => {
      const graph = createUnpairedForkJoinGraph();
      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(false);
      expect(result.unpairedForks.length).toBe(1);
      expect(result.unpairedForks).toContain('2');
    });

    it('should detect unpaired join nodes', () => {
      const graph = createUnpairedForkJoinGraph();
      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(false);
      expect(result.unpairedJoins.length).toBe(1);
      expect(result.unpairedJoins).toContain('4');
    });

    it('should handle graph without fork/join nodes', () => {
      const graph = createStandardGraph();
      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(true);
      expect(result.pairs.size).toBe(0);
      expect(result.unpairedForks.length).toBe(0);
      expect(result.unpairedJoins.length).toBe(0);
    });

    it('should handle empty graph', () => {
      const graph = new GraphData();
      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(true);
      expect(result.pairs.size).toBe(0);
      expect(result.unpairedForks.length).toBe(0);
      expect(result.unpairedJoins.length).toBe(0);
    });

    it('should handle multiple fork/join pairs', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        {
          id: '2',
          type: NodeType.FORK,
          name: 'Fork 1',
          workflowId: 'wf1',
          originalNode: {
            id: '2',
            type: NodeType.FORK,
            name: 'Fork 1',
            config: { forkId: 'fork1' },
          } as any,
        },
        { id: '3', type: NodeType.LLM, name: 'Task 3', workflowId: 'wf1' },
        {
          id: '4',
          type: NodeType.FORK,
          name: 'Fork 2',
          workflowId: 'wf1',
          originalNode: {
            id: '4',
            type: NodeType.FORK,
            name: 'Fork 2',
            config: { forkId: 'fork2' },
          } as any,
        },
        { id: '5', type: NodeType.LLM, name: 'Task 5', workflowId: 'wf1' },
        {
          id: '6',
          type: NodeType.JOIN,
          name: 'Join 1',
          workflowId: 'wf1',
          originalNode: {
            id: '6',
            type: NodeType.JOIN,
            name: 'Join 1',
            config: { joinId: 'fork1' },
          } as any,
        },
        {
          id: '7',
          type: NodeType.JOIN,
          name: 'Join 2',
          workflowId: 'wf1',
          originalNode: {
            id: '7',
            type: NodeType.JOIN,
            name: 'Join 2',
            config: { joinId: 'fork2' },
          } as any,
        },
        { id: '8', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(true);
      expect(result.pairs.size).toBe(2);
      expect(result.pairs.get('2')).toBe('6');
      expect(result.pairs.get('4')).toBe('7');
    });

    it('should handle orphan fork without matching join', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        {
          id: '2',
          type: NodeType.FORK,
          name: 'Fork',
          workflowId: 'wf1',
          originalNode: {
            id: '2',
            type: NodeType.FORK,
            name: 'Fork',
            config: { forkId: 'fork1' },
          } as any,
        },
        { id: '3', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(false);
      expect(result.unpairedForks).toContain('2');
      expect(result.pairs.size).toBe(0);
    });

    it('should handle orphan join without matching fork', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        {
          id: '2',
          type: NodeType.JOIN,
          name: 'Join',
          workflowId: 'wf1',
          originalNode: {
            id: '2',
            type: NodeType.JOIN,
            name: 'Join',
            config: { joinId: 'fork1' },
          } as any,
        },
        { id: '3', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const result = collectForkJoinPairs(graph);

      expect(result.isValid).toBe(false);
      expect(result.unpairedJoins).toContain('2');
      expect(result.pairs.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should analyze single node graph', () => {
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

      const result = analyzeGraph(graph);

      expect(result.cycleDetection.hasCycle).toBe(false);
      expect(result.topologicalSort.success).toBe(true);
      expect(result.nodeStats.total).toBe(1);
    });

    it('should analyze cyclic graph', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: '1', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        { id: '2', type: NodeType.LLM, name: 'Task', workflowId: 'wf1' },
        { id: '3', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: '2', targetNodeId: '3', type: EdgeType.DEFAULT },
        { id: 'e3', sourceNodeId: '3', targetNodeId: '1', type: EdgeType.DEFAULT },
      ];

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      graph.startNodeId = '1';
      graph.endNodeIds.add('3');

      const result = analyzeGraph(graph);

      expect(result.cycleDetection.hasCycle).toBe(true);
      expect(result.topologicalSort.success).toBe(false);
    });
  });
});
