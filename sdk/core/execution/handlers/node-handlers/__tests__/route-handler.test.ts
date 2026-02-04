/**
 * Route节点处理函数单元测试
 */

import { routeHandler } from '../route-handler';
import type { Node, RouteNodeConfig } from '../../../../../types/node';
import { NodeType } from '../../../../../types/node';
import type { Thread } from '../../../../../types/thread';
import { ThreadStatus } from '../../../../../types/thread';
import { ExecutionError } from '../../../../../types/errors';

describe('route-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: '',
      graph: {} as any,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: 0,
      errors: [],
      metadata: {}
    };
  });

  describe('基本功能测试', () => {
    it('应该成功匹配路由条件并返回目标节点', async () => {
      mockThread.variableScopes.thread = {
        status: 'success',
        count: 10
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'success-node',
              priority: 10
            },
            {
              condition: 'variables.status === "failure"',
              targetNodeId: 'failure-node',
              priority: 5
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result).toMatchObject({
        selectedRoute: {
          condition: 'variables.status === "success"',
          targetNodeId: 'success-node',
          priority: 10
        },
        targetNodeId: 'success-node'
      });
    });

    it('应该按优先级排序路由规则', async () => {
      mockThread.variableScopes.thread = {
        status: 'success'
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'low-priority-node',
              priority: 1
            },
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'high-priority-node',
              priority: 10
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      // 应该选择高优先级的路由
      expect(result.targetNodeId).toBe('high-priority-node');
      expect(result.selectedRoute?.priority).toBe(10);
    });

    it('应该在所有路由都不匹配时使用默认目标', async () => {
      mockThread.variableScopes.thread = {
        status: 'unknown'
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'success-node',
              priority: 10
            },
            {
              condition: 'variables.status === "failure"',
              targetNodeId: 'failure-node',
              priority: 5
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result).toMatchObject({
        selectedRoute: null,
        targetNodeId: 'default-node',
        message: 'No route matched, using default target'
      });
    });

    it('应该在所有路由都不匹配且没有默认目标时抛出错误', async () => {
      mockThread.variableScopes.thread = {
        status: 'unknown'
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'success-node',
              priority: 10
            }
          ]
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(routeHandler(mockThread, mockNode))
        .rejects
        .toThrow(ExecutionError);

      await expect(routeHandler(mockThread, mockNode))
        .rejects
        .toThrow('No route matched and no default target specified');
    });
  });

  describe('执行条件测试', () => {
    it('应该在非RUNNING状态下跳过执行', async () => {
      const nonRunningStates = [
        ThreadStatus.CREATED,
        ThreadStatus.PAUSED,
        ThreadStatus.COMPLETED,
        ThreadStatus.FAILED,
        ThreadStatus.CANCELLED,
        ThreadStatus.TIMEOUT
      ];

      for (const status of nonRunningStates) {
        mockThread.status = status;
        mockThread.nodeResults = [];

        mockNode = {
          id: 'route-node-1',
          name: 'Route Node',
          type: NodeType.ROUTE,
          config: {
            routes: [
              {
                condition: 'variables.status === "success"',
                targetNodeId: 'success-node',
                priority: 10
              }
            ],
            defaultTargetNodeId: 'default-node'
          } as RouteNodeConfig,
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        };

        const result = await routeHandler(mockThread, mockNode);

        expect(result).toMatchObject({
          nodeId: 'route-node-1',
          nodeType: 'ROUTE',
          status: 'SKIPPED',
          step: 1,
          executionTime: 0
        });
      }
    });

    it('应该在RUNNING状态下正常执行', async () => {
      mockThread.status = ThreadStatus.RUNNING;
      mockThread.variableScopes.thread = {
        status: 'success'
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'success-node',
              priority: 10
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result.targetNodeId).toBe('success-node');
      expect(result.selectedRoute).toBeDefined();
    });
  });

  describe('条件评估测试', () => {
    it('应该正确评估简单的布尔条件', async () => {
      mockThread.variableScopes.thread = {
        isActive: true
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.isActive === true',
              targetNodeId: 'active-node',
              priority: 10
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result.targetNodeId).toBe('active-node');
    });

    it('应该正确评估数值比较条件', async () => {
      mockThread.variableScopes.thread = {
        count: 15
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.count > 10',
              targetNodeId: 'greater-node',
              priority: 10
            },
            {
              condition: 'variables.count <= 10',
              targetNodeId: 'lesser-node',
              priority: 5
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result.targetNodeId).toBe('greater-node');
    });

    it('应该正确评估字符串比较条件', async () => {
      mockThread.variableScopes.thread = {
        category: 'premium'
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.category === "premium"',
              targetNodeId: 'premium-node',
              priority: 10
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result.targetNodeId).toBe('premium-node');
    });

    it('应该正确评估复杂条件表达式', async () => {
      mockThread.variableScopes.thread = {
        score: 85,
        passed: true
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.score >= 80 && variables.passed === true',
              targetNodeId: 'excellent-node',
              priority: 10
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result.targetNodeId).toBe('excellent-node');
    });

    it('应该在条件评估失败时返回false并继续评估其他路由', async () => {
      mockThread.variableScopes.thread = {
        status: 'success'
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'invalid.syntax.error',
              targetNodeId: 'invalid-node',
              priority: 10
            },
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'success-node',
              priority: 5
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      // 应该跳过无效的条件，匹配第二个条件
      expect(result.targetNodeId).toBe('success-node');
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理空的路由列表', async () => {
      mockThread.variableScopes.thread = {};

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result).toMatchObject({
        selectedRoute: null,
        targetNodeId: 'default-node',
        message: 'No route matched, using default target'
      });
    });

    it('应该正确处理未定义优先级的路由', async () => {
      mockThread.variableScopes.thread = {
        status: 'success'
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'no-priority-node'
            },
            {
              condition: 'variables.status === "success"',
              targetNodeId: 'priority-node',
              priority: 10
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      // 有优先级的路由应该优先
      expect(result.targetNodeId).toBe('priority-node');
    });

    it('应该正确处理空的variableScopes', async () => {
      mockThread.variableScopes = {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      };

      mockNode = {
        id: 'route-node-1',
        name: 'Route Node',
        type: NodeType.ROUTE,
        config: {
          routes: [
            {
              condition: 'true',
              targetNodeId: 'always-node',
              priority: 10
            }
          ],
          defaultTargetNodeId: 'default-node'
        } as RouteNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await routeHandler(mockThread, mockNode);

      expect(result.targetNodeId).toBe('always-node');
    });
  });
});