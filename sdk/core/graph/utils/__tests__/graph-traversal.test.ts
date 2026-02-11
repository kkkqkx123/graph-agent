/**
 * graph-traversal.test.ts
 * 图遍历函数的单元测试
 */

import { GraphData } from '../../../entities/graph-data';
import type { GraphNode, GraphEdge } from '@modular-agent/types';
import { NodeType, EdgeType } from '@modular-agent/types';
import { dfs, bfs, getReachableNodes, getNodesReachingTo } from '../graph-traversal';

/**
 * 创建测试图
 * 结构：1 -> 2 -> 3 -> 5
 *        |    \
 *        v     v
 *        4 -> 5
 */
function createTestGraph() {
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

describe('graph-traversal', () => {
  describe('dfs', () => {
    it('should traverse all reachable nodes from start node', () => {
      const graph = createTestGraph();
      const visited: string[] = [];

      dfs(graph, '1', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited.length).toBe(5);
      expect(visited).toContain('1');
      expect(visited).toContain('2');
      expect(visited).toContain('3');
      expect(visited).toContain('4');
      expect(visited).toContain('5');
    });

    it('should handle traversal from middle node', () => {
      const graph = createTestGraph();
      const visited: string[] = [];

      dfs(graph, '2', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited.length).toBe(3);
      expect(visited).toContain('2');
      expect(visited).toContain('3');
      expect(visited).toContain('5');
    });

    it('should handle single node without outgoing edges', () => {
      const graph = createTestGraph();
      const visited: string[] = [];

      dfs(graph, '5', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited).toEqual(['5']);
    });

    it('should not visit same node twice', () => {
      const graph = createTestGraph();
      const visitCount = new Map<string, number>();

      dfs(graph, '1', (nodeId) => {
        visitCount.set(nodeId, (visitCount.get(nodeId) || 0) + 1);
      });

      for (const [, count] of visitCount) {
        expect(count).toBe(1);
      }
    });
  });

  describe('bfs', () => {
    it('should traverse all reachable nodes in breadth-first order', () => {
      const graph = createTestGraph();
      const visited: string[] = [];

      bfs(graph, '1', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited.length).toBe(5);
      expect(visited[0]).toBe('1');
      // Node 1 is visited first, then its neighbors 2 and 4
      expect(visited.slice(1, 3)).toEqual(expect.arrayContaining(['2', '4']));
    });

    it('should traverse from middle node', () => {
      const graph = createTestGraph();
      const visited: string[] = [];

      bfs(graph, '2', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited.length).toBe(3);
      expect(visited).toContain('2');
      expect(visited).toContain('3');
      expect(visited).toContain('5');
    });

    it('should handle single node', () => {
      const graph = createTestGraph();
      const visited: string[] = [];

      bfs(graph, '5', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited).toEqual(['5']);
    });

    it('should not visit same node twice', () => {
      const graph = createTestGraph();
      const visitCount = new Map<string, number>();

      bfs(graph, '1', (nodeId) => {
        visitCount.set(nodeId, (visitCount.get(nodeId) || 0) + 1);
      });

      for (const [, count] of visitCount) {
        expect(count).toBe(1);
      }
    });
  });

  describe('getReachableNodes', () => {
    it('should return all reachable nodes from start', () => {
      const graph = createTestGraph();
      const reachable = getReachableNodes(graph, '1');

      expect(reachable.size).toBe(5);
      expect(reachable.has('1')).toBe(true);
      expect(reachable.has('2')).toBe(true);
      expect(reachable.has('3')).toBe(true);
      expect(reachable.has('4')).toBe(true);
      expect(reachable.has('5')).toBe(true);
    });

    it('should return partial reachability from middle node', () => {
      const graph = createTestGraph();
      const reachable = getReachableNodes(graph, '2');

      expect(reachable.size).toBe(3);
      expect(reachable.has('2')).toBe(true);
      expect(reachable.has('3')).toBe(true);
      expect(reachable.has('5')).toBe(true);
      expect(reachable.has('1')).toBe(false);
      expect(reachable.has('4')).toBe(false);
    });

    it('should return only node itself if it has no outgoing edges', () => {
      const graph = createTestGraph();
      const reachable = getReachableNodes(graph, '5');

      expect(reachable.size).toBe(1);
      expect(reachable.has('5')).toBe(true);
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

      // Only edge 1 -> 2, no edge to 3
      const edge: GraphEdge = { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT };
      graph.addEdge(edge);

      const reachable = getReachableNodes(graph, '1');

      expect(reachable.size).toBe(2);
      expect(reachable.has('1')).toBe(true);
      expect(reachable.has('2')).toBe(true);
      expect(reachable.has('3')).toBe(false);
    });
  });

  describe('getNodesReachingTo', () => {
    it('should return all nodes that can reach target', () => {
      const graph = createTestGraph();
      const reaching = getNodesReachingTo(graph, '5');

      expect(reaching.size).toBe(5);
      expect(reaching.has('5')).toBe(true);
      expect(reaching.has('3')).toBe(true);
      expect(reaching.has('2')).toBe(true);
      expect(reaching.has('4')).toBe(true);
      expect(reaching.has('1')).toBe(true);
    });

    it('should return partial nodes reaching to middle node', () => {
      const graph = createTestGraph();
      const reaching = getNodesReachingTo(graph, '2');

      expect(reaching.size).toBe(2);
      expect(reaching.has('2')).toBe(true);
      expect(reaching.has('1')).toBe(true);
      expect(reaching.has('3')).toBe(false);
      expect(reaching.has('4')).toBe(false);
      expect(reaching.has('5')).toBe(false);
    });

    it('should return only node itself if it has no incoming edges', () => {
      const graph = createTestGraph();
      const reaching = getNodesReachingTo(graph, '1');

      expect(reaching.size).toBe(1);
      expect(reaching.has('1')).toBe(true);
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

      // Only edge 1 -> 2, no incoming edges to 3
      const edge: GraphEdge = { id: 'e1', sourceNodeId: '1', targetNodeId: '2', type: EdgeType.DEFAULT };
      graph.addEdge(edge);

      const reaching = getNodesReachingTo(graph, '3');

      expect(reaching.size).toBe(1);
      expect(reaching.has('3')).toBe(true);
      expect(reaching.has('1')).toBe(false);
      expect(reaching.has('2')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty graph', () => {
      const graph = new GraphData();

      const visited: string[] = [];
      // Should not throw even with non-existent node
      dfs(graph, 'non-existent', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited).toEqual([]);
    });

    it('should handle graph with self-loop', () => {
      const graph = new GraphData();

      const node: GraphNode = { id: '1', type: NodeType.LLM, name: 'Node 1', workflowId: 'wf1' };
      graph.addNode(node);

      const edge: GraphEdge = { id: 'e1', sourceNodeId: '1', targetNodeId: '1', type: EdgeType.DEFAULT };
      graph.addEdge(edge);

      const visited: string[] = [];
      dfs(graph, '1', (nodeId) => {
        visited.push(nodeId);
      });

      expect(visited).toEqual(['1']);
    });
  });
});
