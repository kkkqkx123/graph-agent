/**
 * Test Helpers - 测试工具函数
 *
 * 提供创建测试工作流、节点、边等辅助函数
 */

import type {
  WorkflowDefinition,
  Node,
  Edge,
  GraphNode,
  GraphEdge,
  ID,
  WorkflowType,
  NodeType,
  Condition,
} from '@modular-agent/types';
import { GraphData } from '../../entities/graph-data.js';

/**
 * 创建测试节点
 * 使用类型断言，因为测试场景需要灵活创建各种节点类型
 */
export function createTestNode(
  id: ID,
  type: NodeType,
  options: {
    name?: string;
    config?: Record<string, any>;
    description?: string;
  } = {}
): Node {
  return {
    id,
    type,
    name: options.name || `${type}-${id}`,
    config: options.config || {},
    description: options.description,
    outgoingEdgeIds: [],
    incomingEdgeIds: [],
  } as Node;
}

/**
 * 创建测试边
 */
export function createTestEdge(
  id: ID,
  sourceNodeId: ID,
  targetNodeId: ID,
  options: {
    condition?: Condition;
    label?: string;
  } = {}
): Edge {
  return {
    id,
    sourceNodeId,
    targetNodeId,
    condition: options.condition,
    label: options.label,
    type: 'DEFAULT',
  };
}

/**
 * 创建简单测试工作流
 * START -> [中间节点] -> END
 */
export function createSimpleTestWorkflow(
  workflowId: ID,
  options: {
    name?: string;
    type?: WorkflowType;
    middleNodes?: Node[];
    middleEdges?: Edge[];
  } = {}
): WorkflowDefinition {
  const startNode = createTestNode('start', 'START', { name: 'Start Node' });
  const endNode = createTestNode('end', 'END', { name: 'End Node' });

  const middleNodes = options.middleNodes || [];
  const middleEdges = options.middleEdges || [];

  const nodes: Node[] = [startNode, ...middleNodes, endNode];
  const edges: Edge[] = [];

  // 创建边
  if (middleNodes.length === 0) {
    // START -> END
    edges.push(createTestEdge('edge-start-end', 'start', 'end'));
  } else {
    // START -> first middle
    edges.push(createTestEdge('edge-start-middle', 'start', middleNodes[0]!.id));

    // middle -> middle
    for (let i = 0; i < middleNodes.length - 1; i++) {
      edges.push(
        createTestEdge(`edge-middle-${i}`, middleNodes[i]!.id, middleNodes[i + 1]!.id)
      );
    }

    // last middle -> END
    edges.push(
      createTestEdge('edge-middle-end', middleNodes[middleNodes.length - 1]!.id, 'end')
    );
  }

  // 添加额外的边
  edges.push(...middleEdges);

  return {
    id: workflowId,
    name: options.name || `Test Workflow ${workflowId}`,
    type: options.type || 'standard' as WorkflowType,
    nodes,
    edges,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建包含 VARIABLE 节点的测试工作流
 */
export function createVariableTestWorkflow(
  workflowId: ID,
  variableConfig: {
    variableName: string;
    variableValue: any;
  }
): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const variableNode = createTestNode('var-1', 'VARIABLE', {
    config: {
      variableName: variableConfig.variableName,
      variableValue: variableConfig.variableValue,
    },
  });
  const endNode = createTestNode('end', 'END');

  return {
    id: workflowId,
    name: 'Variable Test Workflow',
    type: 'standard' as WorkflowType,
    nodes: [startNode, variableNode, endNode],
    edges: [
      createTestEdge('edge-1', 'start', 'var-1'),
      createTestEdge('edge-2', 'var-1', 'end'),
    ],
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建包含 ROUTE 节点的测试工作流
 */
export function createRouteTestWorkflow(
  workflowId: ID,
  routeConfig: {
    conditions: Array<{
      variableName: string;
      operator: string;
      value: any;
      targetNodeId: ID;
    }>;
    defaultTargetNodeId: ID;
  }
): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const routeNode = createTestNode('route-1', 'ROUTE', {
    config: {
      conditions: routeConfig.conditions.map((c, i) => ({
        id: `condition-${i}`,
        expression: {
          type: 'comparison',
          left: { type: 'variable', name: c.variableName },
          operator: c.operator,
          right: { type: 'literal', value: c.value },
        },
        targetNodeId: c.targetNodeId,
      })),
      defaultTargetNodeId: routeConfig.defaultTargetNodeId,
    },
  });

  const nodes: Node[] = [startNode, routeNode];
  const edges: Edge[] = [createTestEdge('edge-start-route', 'start', 'route-1')];

  // 为每个条件目标创建节点和边
  const targetNodeIds = new Set<ID>();
  for (const condition of routeConfig.conditions) {
    targetNodeIds.add(condition.targetNodeId);
  }
  targetNodeIds.add(routeConfig.defaultTargetNodeId);

  for (const targetId of targetNodeIds) {
    const targetNode = createTestNode(targetId, 'VARIABLE', {
      config: { variableName: 'branch', variableValue: targetId },
    });
    nodes.push(targetNode);
    edges.push(createTestEdge(`edge-route-${targetId}`, 'route-1', targetId));
  }

  // 添加 END 节点
  const endNode = createTestNode('end', 'END');
  nodes.push(endNode);

  // 所有分支都连接到 END
  for (const targetId of targetNodeIds) {
    edges.push(createTestEdge(`edge-${targetId}-end`, targetId, 'end'));
  }

  return {
    id: workflowId,
    name: 'Route Test Workflow',
    type: 'standard' as WorkflowType,
    nodes,
    edges,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建包含 FORK/JOIN 的测试工作流
 */
export function createForkJoinTestWorkflow(
  workflowId: ID,
  forkConfig: {
    paths: Array<{
      pathId: ID;
      nodes: Node[];
    }>;
  }
): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const forkNode = createTestNode('fork-1', 'FORK', {
    config: {
      forkPaths: forkConfig.paths.map((p) => ({
        pathId: p.pathId,
        childNodeId: p.nodes[0]?.id || `${p.pathId}-start`,
      })),
    },
  });

  const joinNode = createTestNode('join-1', 'JOIN', {
    config: {
      forkPathIds: forkConfig.paths.map((p) => p.pathId),
    },
  });
  const endNode = createTestNode('end', 'END');

  const nodes: Node[] = [startNode, forkNode, joinNode, endNode];
  const edges: Edge[] = [
    createTestEdge('edge-start-fork', 'start', 'fork-1'),
    createTestEdge('edge-join-end', 'join-1', 'end'),
  ];

  // 添加每个分支的节点和边
  for (const path of forkConfig.paths) {
    for (const node of path.nodes) {
      nodes.push(node);
    }

    // 分支内的边
    for (let i = 0; i < path.nodes.length - 1; i++) {
      edges.push(
        createTestEdge(`edge-${path.pathId}-${i}`, path.nodes[i]!.id, path.nodes[i + 1]!.id)
      );
    }

    // FORK -> 分支第一个节点
    edges.push(
      createTestEdge(`edge-fork-${path.pathId}`, 'fork-1', path.nodes[0]!.id)
    );

    // 分支最后一个节点 -> JOIN
    edges.push(
      createTestEdge(`edge-${path.pathId}-join`, path.nodes[path.nodes.length - 1]!.id, 'join-1')
    );
  }

  return {
    id: workflowId,
    name: 'Fork/Join Test Workflow',
    type: 'standard' as WorkflowType,
    nodes,
    edges,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建包含 SUBGRAPH 节点的测试工作流
 */
export function createSubgraphTestWorkflow(
  workflowId: ID,
  subgraphConfig: {
    subgraphId: ID;
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
  }
): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const subgraphNode = createTestNode('subgraph-1', 'SUBGRAPH', {
    config: {
      subgraphId: subgraphConfig.subgraphId,
      inputMapping: subgraphConfig.inputMapping || {},
      outputMapping: subgraphConfig.outputMapping || {},
    },
  });
  const endNode = createTestNode('end', 'END');

  return {
    id: workflowId,
    name: 'Subgraph Test Workflow',
    type: 'standard' as WorkflowType,
    nodes: [startNode, subgraphNode, endNode],
    edges: [
      createTestEdge('edge-start-subgraph', 'start', 'subgraph-1'),
      createTestEdge('edge-subgraph-end', 'subgraph-1', 'end'),
    ],
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建包含 LOOP 的测试工作流
 */
export function createLoopTestWorkflow(
  workflowId: ID,
  loopConfig: {
    loopVariableName: string;
    maxIterations: number;
    loopBodyNodes: Node[];
  }
): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const loopStartNode = createTestNode('loop-start', 'LOOP_START', {
    config: {
      loopVariableName: loopConfig.loopVariableName,
      maxIterations: loopConfig.maxIterations,
    },
  });
  const loopEndNode = createTestNode('loop-end', 'LOOP_END');
  const endNode = createTestNode('end', 'END');

  const nodes: Node[] = [startNode, loopStartNode, ...loopConfig.loopBodyNodes, loopEndNode, endNode];
  const edges: Edge[] = [
    createTestEdge('edge-start-loop', 'start', 'loop-start'),
    createTestEdge('edge-loop-end', 'loop-end', 'end'),
  ];

  // loop-start -> first body node
  if (loopConfig.loopBodyNodes.length > 0) {
    edges.push(
      createTestEdge('edge-loop-start-body', 'loop-start', loopConfig.loopBodyNodes[0]!.id)
    );

    // body nodes
    for (let i = 0; i < loopConfig.loopBodyNodes.length - 1; i++) {
      edges.push(
        createTestEdge(
          `edge-body-${i}`,
          loopConfig.loopBodyNodes[i]!.id,
          loopConfig.loopBodyNodes[i + 1]!.id
        )
      );
    }

    // last body node -> loop-end
    edges.push(
      createTestEdge(
        'edge-body-loop-end',
        loopConfig.loopBodyNodes[loopConfig.loopBodyNodes.length - 1]!.id,
        'loop-end'
      )
    );

    // loop-end -> loop-start (循环)
    edges.push(createTestEdge('edge-loop-back', 'loop-end', 'loop-start'));
  } else {
    // 空循环体
    edges.push(createTestEdge('edge-loop-start-end', 'loop-start', 'loop-end'));
    edges.push(createTestEdge('edge-loop-back', 'loop-end', 'loop-start'));
  }

  return {
    id: workflowId,
    name: 'Loop Test Workflow',
    type: 'standard' as WorkflowType,
    nodes,
    edges,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建测试 GraphNode
 */
export function createTestGraphNode(
  id: ID,
  type: NodeType,
  options: {
    originalNode?: Node;
  } = {}
): GraphNode {
  return {
    id,
    type,
    name: `${type}-${id}`,
    workflowId: 'test-workflow',
    originalNode: options.originalNode,
  };
}

/**
 * 创建测试 GraphEdge
 */
export function createTestGraphEdge(
  id: ID,
  sourceNodeId: ID,
  targetNodeId: ID
): GraphEdge {
  return {
    id,
    sourceNodeId,
    targetNodeId,
    type: 'DEFAULT',
  };
}

/**
 * 从节点和边创建 GraphData
 */
export function createTestGraphData(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphData {
  const graph = new GraphData();

  for (const node of nodes) {
    graph.addNode(node);
  }

  for (const edge of edges) {
    graph.addEdge(edge);
  }

  // 设置 START 和 END 节点
  for (const node of nodes) {
    if (node.type === 'START') {
      graph.startNodeId = node.id;
    } else if (node.type === 'END') {
      graph.endNodeIds.add(node.id);
    }
  }

  return graph;
}

/**
 * 等待指定时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建有环的测试工作流
 */
export function createCyclicTestWorkflow(workflowId: ID): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const node1 = createTestNode('node-1', 'VARIABLE', {
    config: { variableName: 'x', variableValue: 1 },
  });
  const node2 = createTestNode('node-2', 'VARIABLE', {
    config: { variableName: 'y', variableValue: 2 },
  });
  const endNode = createTestNode('end', 'END');

  return {
    id: workflowId,
    name: 'Cyclic Test Workflow',
    type: 'standard' as WorkflowType,
    nodes: [startNode, node1, node2, endNode],
    edges: [
      createTestEdge('edge-1', 'start', 'node-1'),
      createTestEdge('edge-2', 'node-1', 'node-2'),
      createTestEdge('edge-3', 'node-2', 'node-1'), // 形成环
      createTestEdge('edge-4', 'node-2', 'end'),
    ],
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建包含不可达节点的测试工作流
 */
export function createUnreachableNodeTestWorkflow(workflowId: ID): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const node1 = createTestNode('node-1', 'VARIABLE', {
    config: { variableName: 'x', variableValue: 1 },
  });
  const unreachableNode = createTestNode('unreachable', 'VARIABLE', {
    config: { variableName: 'y', variableValue: 2 },
  });
  const endNode = createTestNode('end', 'END');

  return {
    id: workflowId,
    name: 'Unreachable Node Test Workflow',
    type: 'standard' as WorkflowType,
    nodes: [startNode, node1, unreachableNode, endNode],
    edges: [
      createTestEdge('edge-1', 'start', 'node-1'),
      createTestEdge('edge-2', 'node-1', 'end'),
      // unreachableNode 没有入边
    ],
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 创建包含孤立节点的测试工作流
 */
export function createIsolatedNodeTestWorkflow(workflowId: ID): WorkflowDefinition {
  const startNode = createTestNode('start', 'START');
  const node1 = createTestNode('node-1', 'VARIABLE', {
    config: { variableName: 'x', variableValue: 1 },
  });
  const isolatedNode = createTestNode('isolated', 'VARIABLE', {
    config: { variableName: 'y', variableValue: 2 },
  });
  const endNode = createTestNode('end', 'END');

  return {
    id: workflowId,
    name: 'Isolated Node Test Workflow',
    type: 'standard' as WorkflowType,
    nodes: [startNode, node1, isolatedNode, endNode],
    edges: [
      createTestEdge('edge-1', 'start', 'node-1'),
      createTestEdge('edge-2', 'node-1', 'end'),
      // isolatedNode 既没有入边也没有出边
    ],
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
