/**
 * graph-navigator.test.ts
 * 图导航器的单元测试
 */

import { GraphData } from '../../entities/graph-data';
import { GraphNavigator } from '../graph-navigator';
import type { GraphNode, GraphEdge, Condition } from '../../../types';
import { NodeType, EdgeType } from '../../../types';

/**
 * 创建简单的线性图：START -> LLM -> END
 */
function createLinearGraph(): GraphData {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: 'start', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: 'llm', type: NodeType.LLM, name: 'LLM', workflowId: 'wf1' },
    { id: 'end', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: 'start', targetNodeId: 'llm', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: 'llm', targetNodeId: 'end', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = 'start';
  graph.endNodeIds.add('end');

  return graph;
}

/**
 * 创建分支图：START -> ROUTE -> (LLM1 | LLM2) -> END
 */
function createBranchGraph(): GraphData {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: 'start', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: 'route', type: NodeType.ROUTE, name: 'Route', workflowId: 'wf1' },
    { id: 'llm1', type: NodeType.LLM, name: 'LLM1', workflowId: 'wf1' },
    { id: 'llm2', type: NodeType.LLM, name: 'LLM2', workflowId: 'wf1' },
    { id: 'end', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const condition1: Condition = {
    expression: 'variables.condition === "A"',
  };

  const condition2: Condition = {
    expression: 'variables.condition === "B"',
  };

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: 'start', targetNodeId: 'route', type: EdgeType.DEFAULT },
    {
      id: 'e2',
      sourceNodeId: 'route',
      targetNodeId: 'llm1',
      type: EdgeType.CONDITIONAL,
      weight: 10,
      originalEdge: {
        id: 'e2',
        sourceNodeId: 'route',
        targetNodeId: 'llm1',
        type: EdgeType.CONDITIONAL,
        condition: condition1,
      } as any,
    },
    {
      id: 'e3',
      sourceNodeId: 'route',
      targetNodeId: 'llm2',
      type: EdgeType.CONDITIONAL,
      weight: 5,
      originalEdge: {
        id: 'e3',
        sourceNodeId: 'route',
        targetNodeId: 'llm2',
        type: EdgeType.CONDITIONAL,
        condition: condition2,
      } as any,
    },
    { id: 'e4', sourceNodeId: 'llm1', targetNodeId: 'end', type: EdgeType.DEFAULT },
    { id: 'e5', sourceNodeId: 'llm2', targetNodeId: 'end', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = 'start';
  graph.endNodeIds.add('end');

  return graph;
}

/**
 * 创建Fork/Join图：START -> FORK -> (LLM1, LLM2) -> JOIN -> END
 */
function createForkJoinGraph(): GraphData {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: 'start', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: 'fork', type: NodeType.FORK, name: 'Fork', workflowId: 'wf1' },
    { id: 'llm1', type: NodeType.LLM, name: 'LLM1', workflowId: 'wf1' },
    { id: 'llm2', type: NodeType.LLM, name: 'LLM2', workflowId: 'wf1' },
    { id: 'join', type: NodeType.JOIN, name: 'Join', workflowId: 'wf1' },
    { id: 'end', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: 'start', targetNodeId: 'fork', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: 'fork', targetNodeId: 'llm1', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: 'fork', targetNodeId: 'llm2', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: 'llm1', targetNodeId: 'join', type: EdgeType.DEFAULT },
    { id: 'e5', sourceNodeId: 'llm2', targetNodeId: 'join', type: EdgeType.DEFAULT },
    { id: 'e6', sourceNodeId: 'join', targetNodeId: 'end', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = 'start';
  graph.endNodeIds.add('end');

  return graph;
}

/**
 * 创建复杂图：START -> LLM1 -> (LLM2, LLM3) -> END
 */
function createComplexGraph(): GraphData {
  const graph = new GraphData();

  const nodes: GraphNode[] = [
    { id: 'start', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
    { id: 'llm1', type: NodeType.LLM, name: 'LLM1', workflowId: 'wf1' },
    { id: 'llm2', type: NodeType.LLM, name: 'LLM2', workflowId: 'wf1' },
    { id: 'llm3', type: NodeType.LLM, name: 'LLM3', workflowId: 'wf1' },
    { id: 'end', type: NodeType.END, name: 'End', workflowId: 'wf1' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', sourceNodeId: 'start', targetNodeId: 'llm1', type: EdgeType.DEFAULT },
    { id: 'e2', sourceNodeId: 'llm1', targetNodeId: 'llm2', type: EdgeType.DEFAULT },
    { id: 'e3', sourceNodeId: 'llm1', targetNodeId: 'llm3', type: EdgeType.DEFAULT },
    { id: 'e4', sourceNodeId: 'llm2', targetNodeId: 'end', type: EdgeType.DEFAULT },
    { id: 'e5', sourceNodeId: 'llm3', targetNodeId: 'end', type: EdgeType.DEFAULT },
  ];

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  graph.startNodeId = 'start';
  graph.endNodeIds.add('end');

  return graph;
}

describe('GraphNavigator', () => {
  describe('getNextNode', () => {
    it('should return START node when currentNodeId is undefined', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const result = navigator.getNextNode();

      expect(result.nextNodeId).toBe('start');
      expect(result.isEnd).toBe(false);
      expect(result.hasMultiplePaths).toBe(false);
      expect(result.possibleNextNodeIds).toEqual(['start']);
    });

    it('should return next node for linear graph', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const result = navigator.getNextNode('start');

      expect(result.nextNodeId).toBe('llm');
      expect(result.isEnd).toBe(false);
      expect(result.hasMultiplePaths).toBe(false);
      expect(result.possibleNextNodeIds).toEqual(['llm']);
    });

    it('should return END node when reaching end', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const result = navigator.getNextNode('llm');

      expect(result.nextNodeId).toBe('end');
      expect(result.isEnd).toBe(true);
      expect(result.hasMultiplePaths).toBe(false);
      expect(result.possibleNextNodeIds).toEqual(['end']);
    });

    it('should return isEnd true when node has no outgoing edges', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const result = navigator.getNextNode('end');

      expect(result.isEnd).toBe(true);
      expect(result.hasMultiplePaths).toBe(false);
      expect(result.possibleNextNodeIds).toEqual([]);
    });

    it('should return hasMultiplePaths true for branch node', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      const result = navigator.getNextNode('route');

      expect(result.isEnd).toBe(false);
      expect(result.hasMultiplePaths).toBe(true);
      expect(result.possibleNextNodeIds).toContain('llm1');
      expect(result.possibleNextNodeIds).toContain('llm2');
    });

    it('should handle graph without start node', () => {
      const graph = new GraphData();
      const navigator = new GraphNavigator(graph);

      const result = navigator.getNextNode();

      expect(result.isEnd).toBe(true);
      expect(result.hasMultiplePaths).toBe(false);
      expect(result.possibleNextNodeIds).toEqual([]);
    });
  });

  describe('routeNextNode', () => {
    it('should return null when node has no outgoing edges', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const result = navigator.routeNextNode('end', () => false);

      expect(result).toBeNull();
    });

    it('should select DEFAULT edge', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const result = navigator.routeNextNode('start', () => false);

      expect(result).not.toBeNull();
      expect(result!.selectedNodeId).toBe('llm');
      expect(result!.edgeId).toBe('e1');
      expect(result!.reason).toBe('DEFAULT_EDGE');
    });

    it('should select CONDITIONAL edge when condition matches', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      const conditionEvaluator = (condition: Condition) => {
        return condition.expression === 'variables.condition === "A"';
      };

      const result = navigator.routeNextNode('route', conditionEvaluator);

      expect(result).not.toBeNull();
      expect(result!.selectedNodeId).toBe('llm1');
      expect(result!.edgeId).toBe('e2');
      expect(result!.reason).toBe('CONDITION_MATCHED');
    });

    it('should return null when no condition matches', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      const conditionEvaluator = (condition: Condition) => {
        return condition.expression === 'variables.condition === "C"';
      };

      const result = navigator.routeNextNode('route', conditionEvaluator);

      expect(result).toBeNull();
    });

    it('should prioritize edges by weight', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      const conditionEvaluator = (condition: Condition) => {
        return true; // All conditions match
      };

      const result = navigator.routeNextNode('route', conditionEvaluator);

      expect(result).not.toBeNull();
      expect(result!.selectedNodeId).toBe('llm1'); // Higher weight (10 vs 5)
    });
  });

  describe('selectNextNodeWithContext', () => {
    it('should handle ROUTE node with selectedNode in result', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      const mockThread = {
        variableValues: {},
        input: {},
        output: {},
      };

      const lastNodeResult = {
        nodeId: 'route',
        data: { selectedNode: 'llm1' },
      };

      const result = navigator.selectNextNodeWithContext(
        'route',
        mockThread,
        NodeType.ROUTE,
        lastNodeResult
      );

      expect(result).toBe('llm1');
    });

    it('should return null for ROUTE node without selectedNode', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      const mockThread = {
        variableValues: {},
        input: {},
        output: {},
      };

      const result = navigator.selectNextNodeWithContext(
        'route',
        mockThread,
        NodeType.ROUTE,
        undefined
      );

      expect(result).toBeNull();
    });

    it('should return null when node has no outgoing edges', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const mockThread = {
        variableValues: {},
        input: {},
        output: {},
      };

      const result = navigator.selectNextNodeWithContext(
        'end',
        mockThread,
        NodeType.END
      );

      expect(result).toBeNull();
    });

    it('should select default edge when no conditions match', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const mockThread = {
        variableValues: {},
        input: {},
        output: {},
      };

      const result = navigator.selectNextNodeWithContext(
        'start',
        mockThread,
        NodeType.START
      );

      expect(result).toBe('llm');
    });
  });

  describe('getPathTo', () => {
    it('should return path when nodes are connected', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const path = navigator.getPathTo('start', 'end');

      expect(path).not.toBeNull();
      expect(path).toEqual(['start', 'llm', 'end']);
    });

    it('should return single node when from equals to', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const path = navigator.getPathTo('start', 'start');

      expect(path).toEqual(['start']);
    });

    it('should return null when nodes are not connected', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const path = navigator.getPathTo('end', 'start');

      expect(path).toBeNull();
    });

    it('should find shortest path in complex graph', () => {
      const graph = createComplexGraph();
      const navigator = new GraphNavigator(graph);

      const path = navigator.getPathTo('start', 'end');

      expect(path).not.toBeNull();
      expect(path).toContain('start');
      expect(path).toContain('end');
      expect(path!.length).toBeGreaterThan(2);
    });
  });

  describe('canReach', () => {
    it('should return true when target is reachable', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const canReach = navigator.canReach('start', 'end');

      expect(canReach).toBe(true);
    });

    it('should return false when target is not reachable', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const canReach = navigator.canReach('end', 'start');

      expect(canReach).toBe(false);
    });

    it('should return true when from equals to', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const canReach = navigator.canReach('start', 'start');

      expect(canReach).toBe(true);
    });
  });

  describe('getAllExecutionPaths', () => {
    it('should return single path for linear graph', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const paths = navigator.getAllExecutionPaths('start');

      expect(paths.length).toBe(1);
      expect(paths[0]).toEqual(['start', 'llm', 'end']);
    });

    it('should return multiple paths for branch graph', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      const paths = navigator.getAllExecutionPaths('start');

      expect(paths.length).toBeGreaterThan(1);
      paths.forEach(path => {
        expect(path[0]).toBe('start');
        expect(path[path.length - 1]).toBe('end');
      });
    });

    it('should return multiple paths for fork/join graph', () => {
      const graph = createForkJoinGraph();
      const navigator = new GraphNavigator(graph);

      const paths = navigator.getAllExecutionPaths('start');

      expect(paths.length).toBeGreaterThan(1);
    });

    it('should handle path with cycles (prevent infinite loop)', () => {
      const graph = new GraphData();

      const nodes: GraphNode[] = [
        { id: 'start', type: NodeType.START, name: 'Start', workflowId: 'wf1' },
        { id: 'llm', type: NodeType.LLM, name: 'LLM', workflowId: 'wf1' },
        { id: 'end', type: NodeType.END, name: 'End', workflowId: 'wf1' },
      ];

      const edges: GraphEdge[] = [
        { id: 'e1', sourceNodeId: 'start', targetNodeId: 'llm', type: EdgeType.DEFAULT },
        { id: 'e2', sourceNodeId: 'llm', targetNodeId: 'llm', type: EdgeType.DEFAULT }, // Self-loop
        { id: 'e3', sourceNodeId: 'llm', targetNodeId: 'end', type: EdgeType.DEFAULT },
      ];

      for (const node of nodes) {
        graph.addNode(node);
      }

      for (const edge of edges) {
        graph.addEdge(edge);
      }

      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');

      const navigator = new GraphNavigator(graph);
      const paths = navigator.getAllExecutionPaths('start');

      // Should not hang and should return paths
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('getPredecessors', () => {
    it('should return empty array for start node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const predecessors = navigator.getPredecessors('start');

      expect(predecessors).toEqual([]);
    });

    it('should return predecessors for middle node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const predecessors = navigator.getPredecessors('llm');

      expect(predecessors).toContain('start');
    });

    it('should return multiple predecessors for join node', () => {
      const graph = createForkJoinGraph();
      const navigator = new GraphNavigator(graph);

      const predecessors = navigator.getPredecessors('join');

      expect(predecessors).toContain('llm1');
      expect(predecessors).toContain('llm2');
    });
  });

  describe('getSuccessors', () => {
    it('should return empty array for end node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const successors = navigator.getSuccessors('end');

      expect(successors).toEqual([]);
    });

    it('should return successors for middle node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const successors = navigator.getSuccessors('llm');

      expect(successors).toContain('end');
    });

    it('should return multiple successors for fork node', () => {
      const graph = createForkJoinGraph();
      const navigator = new GraphNavigator(graph);

      const successors = navigator.getSuccessors('fork');

      expect(successors).toContain('llm1');
      expect(successors).toContain('llm2');
    });
  });

  describe('isForkNode', () => {
    it('should return true for FORK node', () => {
      const graph = createForkJoinGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isForkNode('fork')).toBe(true);
    });

    it('should return false for non-FORK node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isForkNode('start')).toBe(false);
    });
  });

  describe('isJoinNode', () => {
    it('should return true for JOIN node', () => {
      const graph = createForkJoinGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isJoinNode('join')).toBe(true);
    });

    it('should return false for non-JOIN node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isJoinNode('end')).toBe(false);
    });
  });

  describe('isRouteNode', () => {
    it('should return true for ROUTE node', () => {
      const graph = createBranchGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isRouteNode('route')).toBe(true);
    });

    it('should return false for non-ROUTE node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isRouteNode('start')).toBe(false);
    });
  });

  describe('isEndNode', () => {
    it('should return true for END node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isEndNode('end')).toBe(true);
    });

    it('should return false for non-END node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isEndNode('start')).toBe(false);
    });
  });

  describe('isStartNode', () => {
    it('should return true for START node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isStartNode('start')).toBe(true);
    });

    it('should return false for non-START node', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      expect(navigator.isStartNode('end')).toBe(false);
    });
  });

  describe('getGraph', () => {
    it('should return the graph instance', () => {
      const graph = createLinearGraph();
      const navigator = new GraphNavigator(graph);

      const returnedGraph = navigator.getGraph();

      expect(returnedGraph).toBe(graph);
    });
  });
});