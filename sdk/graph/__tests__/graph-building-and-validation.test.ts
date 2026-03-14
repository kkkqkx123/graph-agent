/**
 * 图构建与验证测试
 *
 * 测试场景：
 * - 基础图构建
 * - 环检测
 * - 可达性分析
 * - START/END 节点约束
 * - Fork/Join 配对验证
 * - 孤立节点检测
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphBuilder } from '../preprocessing/graph-builder.js';
import { GraphValidator } from '../validation/graph-validator.js';
import { GraphData } from '../entities/graph-data.js';
import { ConfigurationValidationError } from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
  createTestEdge,
  createTestGraphNode,
  createTestGraphEdge,
  createTestGraphData,
  createCyclicTestWorkflow,
  createUnreachableNodeTestWorkflow,
  createIsolatedNodeTestWorkflow,
} from './fixtures/test-helpers.js';

describe('GraphBuilder - 图构建', () => {
  describe('基础图构建', () => {
    it('应该从简单工作流定义构建 GraphData', () => {
      const workflow = createSimpleTestWorkflow('simple-graph-test');

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.isValid).toBe(true);
      expect(result.graph).toBeDefined();
      expect(result.graph.getNodeCount()).toBe(2); // START + END
      expect(result.graph.getEdgeCount()).toBe(1);
    });

    it('应该正确转换节点和边', () => {
      const workflow = createSimpleTestWorkflow('node-edge-test', {
        middleNodes: [
          createTestNode('middle-1', 'VARIABLE', {
            config: { variableName: 'x', variableValue: 1 },
          }),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.isValid).toBe(true);
      expect(result.graph.getNodeCount()).toBe(3); // START + VARIABLE + END
      expect(result.graph.getEdgeCount()).toBe(2);
    });

    it('应该正确生成邻接表', () => {
      const workflow = createSimpleTestWorkflow('adjacency-test', {
        middleNodes: [
          createTestNode('node-a', 'VARIABLE', { config: { variableName: 'a', variableValue: 1 } }),
          createTestNode('node-b', 'VARIABLE', { config: { variableName: 'b', variableValue: 2 } }),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);
      const graph = result.graph;

      // 验证邻接关系
      expect(graph.getOutgoingNeighbors('start')).toContain('node-a');
      expect(graph.getOutgoingNeighbors('node-a')).toContain('node-b');
      expect(graph.getOutgoingNeighbors('node-b')).toContain('end');

      // 验证反向邻接关系
      expect(graph.getIncomingNeighbors('node-a')).toContain('start');
      expect(graph.getIncomingNeighbors('node-b')).toContain('node-a');
      expect(graph.getIncomingNeighbors('end')).toContain('node-b');
    });

    it('应该正确设置 START 和 END 节点', () => {
      const workflow = createSimpleTestWorkflow('start-end-test');

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.graph.startNodeId).toBe('start');
      expect(result.graph.endNodeIds.has('end')).toBe(true);
    });
  });

  describe('复杂图构建', () => {
    it('应该正确构建包含 ROUTE 节点的图', () => {
      const workflow = createSimpleTestWorkflow('route-graph-test', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                { id: 'cond-1', expression: { type: 'literal', value: true }, targetNodeId: 'branch-a' },
              ],
              defaultTargetNodeId: 'branch-b',
            },
          }),
          createTestNode('branch-a', 'VARIABLE', { config: { variableName: 'a', variableValue: 1 } }),
          createTestNode('branch-b', 'VARIABLE', { config: { variableName: 'b', variableValue: 2 } }),
        ],
        middleEdges: [
          createTestEdge('edge-route-a', 'route-1', 'branch-a'),
          createTestEdge('edge-route-b', 'route-1', 'branch-b'),
          createTestEdge('edge-a-end', 'branch-a', 'end'),
          createTestEdge('edge-b-end', 'branch-b', 'end'),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.isValid).toBe(true);
      // ROUTE 节点应该有两个出边
      expect(result.graph.getOutgoingNeighbors('route-1').size).toBe(2);
    });

    it('应该正确构建包含 FORK/JOIN 节点的图', () => {
      const workflow = createSimpleTestWorkflow('fork-join-graph-test', {
        middleNodes: [
          createTestNode('fork-1', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'path-a', childNodeId: 'branch-a' },
                { pathId: 'path-b', childNodeId: 'branch-b' },
              ],
            },
          }),
          createTestNode('branch-a', 'VARIABLE', { config: { variableName: 'a', variableValue: 1 } }),
          createTestNode('branch-b', 'VARIABLE', { config: { variableName: 'b', variableValue: 2 } }),
          createTestNode('join-1', 'JOIN', {
            config: { forkPathIds: ['path-a', 'path-b'] },
          }),
        ],
        middleEdges: [
          createTestEdge('edge-fork-a', 'fork-1', 'branch-a'),
          createTestEdge('edge-fork-b', 'fork-1', 'branch-b'),
          createTestEdge('edge-a-join', 'branch-a', 'join-1'),
          createTestEdge('edge-b-join', 'branch-b', 'join-1'),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.isValid).toBe(true);
      // FORK 节点应该有两个出边
      expect(result.graph.getOutgoingNeighbors('fork-1').size).toBe(2);
      // JOIN 节点应该有两个入边
      expect(result.graph.getIncomingNeighbors('join-1').size).toBe(2);
    });
  });
});

describe('GraphValidator - 图验证', () => {
  describe('START/END 节点约束验证', () => {
    it('START 节点不能有入边', () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('node-1', 'VARIABLE'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'start', 'node-1'),
        createTestGraphEdge('edge-2', 'node-1', 'start'), // 非法：START 有入边
        createTestGraphEdge('edge-3', 'node-1', 'end'),
      ];

      const graph = createTestGraphData(nodes, edges);
      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const hasStartIncomingError = result.error.some(
          (e) => e.context?.['code'] === 'START_NODE_HAS_INCOMING_EDGES'
        );
        expect(hasStartIncomingError).toBe(true);
      }
    });

    it('END 节点不能有出边', () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('node-1', 'VARIABLE'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'start', 'node-1'),
        createTestGraphEdge('edge-2', 'node-1', 'end'),
        createTestGraphEdge('edge-3', 'end', 'node-1'), // 非法：END 有出边
      ];

      const graph = createTestGraphData(nodes, edges);
      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const hasEndOutgoingError = result.error.some(
          (e) => e.context?.['code'] === 'END_NODE_HAS_OUTGOING_EDGES'
        );
        expect(hasEndOutgoingError).toBe(true);
      }
    });

    it('工作流必须包含 START 节点', () => {
      const nodes = [
        createTestGraphNode('node-1', 'VARIABLE'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'node-1', 'end'),
      ];

      const graph = createTestGraphData(nodes, edges);
      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const hasMissingStartError = result.error.some(
          (e) => e.context?.['code'] === 'MISSING_START_NODE'
        );
        expect(hasMissingStartError).toBe(true);
      }
    });

    it('工作流必须包含 END 节点', () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('node-1', 'VARIABLE'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'start', 'node-1'),
      ];

      const graph = createTestGraphData(nodes, edges);
      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const hasMissingEndError = result.error.some(
          (e) => e.context?.['code'] === 'MISSING_END_NODE'
        );
        expect(hasMissingEndError).toBe(true);
      }
    });
  });

  describe('环检测', () => {
    it('无环工作流应通过验证', () => {
      const workflow = createSimpleTestWorkflow('acyclic-test', {
        middleNodes: [
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
          createTestNode('node-2', 'VARIABLE', { config: { variableName: 'y', variableValue: 2 } }),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);
      expect(result.isValid).toBe(true);
    });

    it('有环工作流应检测出环并报告错误', () => {
      const workflow = createCyclicTestWorkflow('cyclic-test');

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('循环依赖') || e.includes('cycle'))).toBe(true);
    });
  });

  describe('可达性分析', () => {
    it('所有节点应从 START 可达', () => {
      const workflow = createSimpleTestWorkflow('reachable-test', {
        middleNodes: [
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
          createTestNode('node-2', 'VARIABLE', { config: { variableName: 'y', variableValue: 2 } }),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);
      expect(result.isValid).toBe(true);
    });

    it('不可达节点应被识别', () => {
      const workflow = createUnreachableNodeTestWorkflow('unreachable-test');

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('不可达') || e.includes('unreachable'))).toBe(true);
    });

    it('死胡同节点应被识别', () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('node-1', 'VARIABLE'),
        createTestGraphNode('dead-end', 'VARIABLE'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'start', 'node-1'),
        createTestGraphEdge('edge-2', 'node-1', 'end'),
        createTestGraphEdge('edge-3', 'node-1', 'dead-end'),
        // dead-end 无法到达 END
      ];

      const graph = createTestGraphData(nodes, edges);
      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const hasDeadEndError = result.error.some(
          (e) => e.context?.['code'] === 'DEAD_END_NODE'
        );
        expect(hasDeadEndError).toBe(true);
      }
    });
  });

  describe('孤立节点检测', () => {
    it('孤立节点应被识别并报告', () => {
      const workflow = createIsolatedNodeTestWorkflow('isolated-test');

      const result = GraphBuilder.buildAndValidate(workflow);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('孤立') || e.includes('isolated'))).toBe(true);
    });
  });

  describe('Fork/Join 配对验证', () => {
    it('正确配对的 Fork/Join 应通过验证', () => {
      const workflow = createSimpleTestWorkflow('fork-join-valid', {
        middleNodes: [
          createTestNode('fork-1', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'path-a', childNodeId: 'branch-a' },
                { pathId: 'path-b', childNodeId: 'branch-b' },
              ],
            },
          }),
          createTestNode('branch-a', 'VARIABLE', { config: { variableName: 'a', variableValue: 1 } }),
          createTestNode('branch-b', 'VARIABLE', { config: { variableName: 'b', variableValue: 2 } }),
          createTestNode('join-1', 'JOIN', {
            config: { forkPathIds: ['path-a', 'path-b'] },
          }),
        ],
        middleEdges: [
          createTestEdge('edge-fork-a', 'fork-1', 'branch-a'),
          createTestEdge('edge-fork-b', 'fork-1', 'branch-b'),
          createTestEdge('edge-a-join', 'branch-a', 'join-1'),
          createTestEdge('edge-b-join', 'branch-b', 'join-1'),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);
      expect(result.isValid).toBe(true);
    });

    it('未配对的 FORK 应报错', () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('fork-1', 'FORK'),
        createTestGraphNode('branch-a', 'VARIABLE'),
        createTestGraphNode('branch-b', 'VARIABLE'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'start', 'fork-1'),
        createTestGraphEdge('edge-2', 'fork-1', 'branch-a'),
        createTestGraphEdge('edge-3', 'fork-1', 'branch-b'),
        createTestGraphEdge('edge-4', 'branch-a', 'end'),
        createTestGraphEdge('edge-5', 'branch-b', 'end'),
        // 没有 JOIN 节点
      ];

      const graph = createTestGraphData(nodes, edges);

      // 设置 FORK 节点配置
      const forkNode = graph.getNode('fork-1');
      if (forkNode) {
        forkNode.originalNode = {
          id: 'fork-1',
          type: 'FORK',
          name: 'Fork',
          config: {
            forkPaths: [
              { pathId: 'path-a', childNodeId: 'branch-a' },
              { pathId: 'path-b', childNodeId: 'branch-b' },
            ],
            forkStrategy: 'parallel',
          },
          outgoingEdgeIds: [],
          incomingEdgeIds: [],
        };
      }

      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const hasUnpairedForkError = result.error.some(
          (e) => e.context?.['code'] === 'UNPAIRED_FORK'
        );
        expect(hasUnpairedForkError).toBe(true);
      }
    });

    it('未配对的 JOIN 应报错', () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('node-1', 'VARIABLE'),
        createTestGraphNode('join-1', 'JOIN'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'start', 'node-1'),
        createTestGraphEdge('edge-2', 'node-1', 'join-1'),
        createTestGraphEdge('edge-3', 'join-1', 'end'),
        // 没有 FORK 节点
      ];

      const graph = createTestGraphData(nodes, edges);

      // 设置 JOIN 节点配置
      const joinNode = graph.getNode('join-1');
      if (joinNode) {
        joinNode.originalNode = {
          id: 'join-1',
          type: 'JOIN',
          name: 'Join',
          config: {
            forkPathIds: ['path-a', 'path-b'],
            joinStrategy: 'ALL_COMPLETED',
            mainPathId: 'path-a',
          },
          outgoingEdgeIds: [],
          incomingEdgeIds: [],
        };
      }

      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const hasUnpairedJoinError = result.error.some(
          (e) => e.context?.['code'] === 'UNPAIRED_JOIN'
        );
        expect(hasUnpairedJoinError).toBe(true);
      }
    });

    it('Fork 和 Join 的 pathId 不匹配应报错', () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('fork-1', 'FORK'),
        createTestGraphNode('branch-a', 'VARIABLE'),
        createTestGraphNode('branch-b', 'VARIABLE'),
        createTestGraphNode('join-1', 'JOIN'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('edge-1', 'start', 'fork-1'),
        createTestGraphEdge('edge-2', 'fork-1', 'branch-a'),
        createTestGraphEdge('edge-3', 'fork-1', 'branch-b'),
        createTestGraphEdge('edge-4', 'branch-a', 'join-1'),
        createTestGraphEdge('edge-5', 'branch-b', 'join-1'),
        createTestGraphEdge('edge-6', 'join-1', 'end'),
      ];

      const graph = createTestGraphData(nodes, edges);

      // 设置 FORK 节点配置
      const forkNode = graph.getNode('fork-1');
      if (forkNode) {
        forkNode.originalNode = {
          id: 'fork-1',
          type: 'FORK',
          name: 'Fork',
          config: {
            forkPaths: [
              { pathId: 'path-a', childNodeId: 'branch-a' },
              { pathId: 'path-b', childNodeId: 'branch-b' },
            ],
            forkStrategy: 'parallel',
          },
          outgoingEdgeIds: [],
          incomingEdgeIds: [],
        };
      }

      // 设置 JOIN 节点配置（pathId 不匹配）
      const joinNode = graph.getNode('join-1');
      if (joinNode) {
        joinNode.originalNode = {
          id: 'join-1',
          type: 'JOIN',
          name: 'Join',
          config: {
            forkPathIds: ['path-x', 'path-y'], // 不匹配
            joinStrategy: 'ALL_COMPLETED',
            mainPathId: 'path-x',
          },
          outgoingEdgeIds: [],
          incomingEdgeIds: [],
        };
      }

      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('图分析', () => {
    it('应该返回完整的图分析结果', () => {
      const workflow = createSimpleTestWorkflow('analysis-test', {
        middleNodes: [
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
        ],
      });

      const result = GraphBuilder.buildAndValidate(workflow);
      const analysis = GraphValidator.analyze(result.graph);

      expect(analysis).toHaveProperty('topologicalSort');
      expect(analysis).toHaveProperty('cycleDetection');
      expect(analysis).toHaveProperty('reachability');
      expect(analysis.topologicalSort.sortedNodes).toHaveLength(3);
    });
  });
});
