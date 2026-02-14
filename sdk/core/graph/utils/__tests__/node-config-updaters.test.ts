/**
 * 节点配置更新器单元测试
 */

import type { IdMapping } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { getNodeConfigUpdater } from '../node-config-updaters';

describe('节点配置更新器', () => {
  let idMapping: IdMapping;

  beforeEach(() => {
    idMapping = {
      nodeIds: new Map([
        ['node_1', 1],
        ['node_2', 2],
        ['node_3', 3]
      ]),
      edgeIds: new Map([
        ['edge_1', 1],
        ['edge_2', 2],
        ['edge_3', 3]
      ]),
      reverseNodeIds: new Map([
        [1, 'node_1'],
        [2, 'node_2'],
        [3, 'node_3']
      ]),
      reverseEdgeIds: new Map([
        [1, 'edge_1'],
        [2, 'edge_2'],
        [3, 'edge_3']
      ]),
      subgraphNamespaces: new Map()
    };
  });

  describe('RouteNodeConfigUpdater', () => {
    let updater: any;

    beforeEach(() => {
      updater = getNodeConfigUpdater(NodeType.ROUTE);
    });

    describe('containsIdReferences', () => {
      it('应该返回true如果routes包含targetNodeId', () => {
        const config = {
          routes: [
            { condition: { expression: 'true' }, targetNodeId: 'node_2' }
          ]
        };

        expect(updater.containsIdReferences(config)).toBe(true);
      });

      it('应该返回true如果defaultTargetNodeId存在', () => {
        const config = {
          routes: [],
          defaultTargetNodeId: 'node_3'
        };

        expect(updater.containsIdReferences(config)).toBe(true);
      });

      it('应该返回false如果配置为空', () => {
        expect(updater.containsIdReferences(null)).toBe(false);
        expect(updater.containsIdReferences(undefined)).toBe(false);
      });

      it('应该返回false如果routes为空', () => {
        const config = { routes: [] };
        expect(updater.containsIdReferences(config)).toBe(false);
      });
    });

    describe('updateIdReferences', () => {
      it('应该更新routes中的targetNodeId', () => {
        const config = {
          routes: [
            { condition: { expression: 'true' }, targetNodeId: 'node_2' },
            { condition: { expression: 'false' }, targetNodeId: 'node_3' }
          ]
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.routes[0].targetNodeId).toBe('2');
        expect(result.routes[1].targetNodeId).toBe('3');
      });

      it('应该更新defaultTargetNodeId', () => {
        const config = {
          routes: [],
          defaultTargetNodeId: 'node_1'
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.defaultTargetNodeId).toBe('1');
      });

      it('应该保留未映射的ID', () => {
        const config = {
          routes: [
            { condition: { expression: 'true' }, targetNodeId: 'node_unknown' }
          ]
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.routes[0].targetNodeId).toBe('node_unknown');
      });

      it('应该返回原始配置如果为空', () => {
        expect(updater.updateIdReferences(null, idMapping)).toBeNull();
        expect(updater.updateIdReferences(undefined, idMapping)).toBeUndefined();
      });
    });
  });

  describe('ForkNodeConfigUpdater', () => {
    let updater: any;

    beforeEach(() => {
      updater = getNodeConfigUpdater(NodeType.FORK);
    });

    describe('containsIdReferences', () => {
      it('应该返回true如果forkPaths包含pathId', () => {
        const config = {
          forkPaths: [
            { pathId: 'edge_1', label: 'Path 1' },
            { pathId: 'edge_2', label: 'Path 2' }
          ]
        };

        expect(updater.containsIdReferences(config)).toBe(true);
      });

      it('应该返回false如果配置为空', () => {
        expect(updater.containsIdReferences(null)).toBe(false);
        expect(updater.containsIdReferences(undefined)).toBe(false);
      });

      it('应该返回false如果forkPaths为空', () => {
        const config = { forkPaths: [] };
        expect(updater.containsIdReferences(config)).toBe(false);
      });
    });

    describe('updateIdReferences', () => {
      it('应该更新forkPaths中的pathId', () => {
        const config = {
          forkPaths: [
            { pathId: 'edge_1', label: 'Path 1' },
            { pathId: 'edge_2', label: 'Path 2' }
          ]
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.forkPaths[0].pathId).toBe('1');
        expect(result.forkPaths[1].pathId).toBe('2');
      });

      it('应该保留未映射的ID', () => {
        const config = {
          forkPaths: [
            { pathId: 'edge_unknown', label: 'Unknown Path' }
          ]
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.forkPaths[0].pathId).toBe('edge_unknown');
      });

      it('应该返回原始配置如果为空', () => {
        expect(updater.updateIdReferences(null, idMapping)).toBeNull();
        expect(updater.updateIdReferences(undefined, idMapping)).toBeUndefined();
      });
    });
  });

  describe('JoinNodeConfigUpdater', () => {
    let updater: any;

    beforeEach(() => {
      updater = getNodeConfigUpdater(NodeType.JOIN);
    });

    describe('containsIdReferences', () => {
      it('应该返回true如果forkPathIds存在', () => {
        const config = {
          forkPathIds: ['edge_1', 'edge_2']
        };

        expect(updater.containsIdReferences(config)).toBe(true);
      });

      it('应该返回true如果mainPathId存在', () => {
        const config = {
          forkPathIds: [],
          mainPathId: 'edge_3'
        };

        expect(updater.containsIdReferences(config)).toBe(true);
      });

      it('应该返回false如果配置为空', () => {
        expect(updater.containsIdReferences(null)).toBe(false);
        expect(updater.containsIdReferences(undefined)).toBe(false);
      });
    });

    describe('updateIdReferences', () => {
      it('应该更新forkPathIds', () => {
        const config = {
          forkPathIds: ['edge_1', 'edge_2']
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.forkPathIds).toEqual(['1', '2']);
      });

      it('应该更新mainPathId', () => {
        const config = {
          forkPathIds: [],
          mainPathId: 'edge_3'
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.mainPathId).toBe('3');
      });

      it('应该保留未映射的ID', () => {
        const config = {
          forkPathIds: ['edge_unknown']
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.forkPathIds[0]).toBe('edge_unknown');
      });

      it('应该返回原始配置如果为空', () => {
        expect(updater.updateIdReferences(null, idMapping)).toBeNull();
        expect(updater.updateIdReferences(undefined, idMapping)).toBeUndefined();
      });
    });
  });

  describe('SubgraphNodeConfigUpdater', () => {
    let updater: any;

    beforeEach(() => {
      updater = getNodeConfigUpdater(NodeType.SUBGRAPH);
    });

    describe('containsIdReferences', () => {
      it('应该返回true如果subgraphId存在', () => {
        const config = {
          subgraphId: 'workflow_123'
        };

        expect(updater.containsIdReferences(config)).toBe(true);
      });

      it('应该返回false如果配置为空', () => {
        expect(updater.containsIdReferences(null)).toBe(false);
        expect(updater.containsIdReferences(undefined)).toBe(false);
      });

      it('应该返回false如果subgraphId不存在', () => {
        const config = {};
        expect(updater.containsIdReferences(config)).toBe(false);
      });
    });

    describe('updateIdReferences', () => {
      it('应该不修改配置（subgraphId不需要映射）', () => {
        const config = {
          subgraphId: 'workflow_123'
        };

        const result = updater.updateIdReferences(config, idMapping);

        expect(result.subgraphId).toBe('workflow_123');
      });

      it('应该返回原始配置如果为空', () => {
        expect(updater.updateIdReferences(null, idMapping)).toBeNull();
        expect(updater.updateIdReferences(undefined, idMapping)).toBeUndefined();
      });
    });
  });
});