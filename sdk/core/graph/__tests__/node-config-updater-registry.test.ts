/**
 * NodeConfigUpdaterRegistry单元测试
 */

import { NodeConfigUpdaterRegistry } from '../node-config-updater-registry';
import type { NodeConfigUpdater, IdMapping } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';

describe('NodeConfigUpdaterRegistry', () => {
  let registry: NodeConfigUpdaterRegistry;
  
  beforeEach(() => {
    registry = new NodeConfigUpdaterRegistry();
  });
  
  describe('register', () => {
    it('应该成功注册节点配置更新器', () => {
      const updater: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(),
        updateIdReferences: jest.fn()
      };
      
      registry.register(updater);
      
      expect(registry.has(NodeType.ROUTE)).toBe(true);
    });
    
    it('应该覆盖已注册的更新器', () => {
      const updater1: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(() => false),
        updateIdReferences: jest.fn()
      };
      
      const updater2: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(() => true),
        updateIdReferences: jest.fn()
      };
      
      registry.register(updater1);
      registry.register(updater2);
      
      const registered = registry.get(NodeType.ROUTE);
      expect(registered?.containsIdReferences({})).toBe(true);
    });
  });
  
  describe('get', () => {
    it('应该返回已注册的更新器', () => {
      const updater: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(),
        updateIdReferences: jest.fn()
      };
      
      registry.register(updater);
      
      const result = registry.get(NodeType.ROUTE);
      expect(result).toBe(updater);
    });
    
    it('应该返回undefined如果未注册', () => {
      const result = registry.get(NodeType.ROUTE);
      expect(result).toBeUndefined();
    });
  });
  
  describe('containsIdReferences', () => {
    it('应该调用更新器的containsIdReferences方法', () => {
      const updater: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(() => true),
        updateIdReferences: jest.fn()
      };
      
      registry.register(updater);
      
      const node = {
        id: 'node_1',
        type: NodeType.ROUTE,
        name: 'Route Node',
        config: { routes: [{ targetNodeId: 'node_2' }] },
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      
      const result = registry.containsIdReferences(node);
      
      expect(result).toBe(true);
      expect(updater.containsIdReferences).toHaveBeenCalledWith(node.config);
    });
    
    it('应该返回false如果未注册更新器', () => {
      const node = {
        id: 'node_1',
        type: NodeType.ROUTE,
        name: 'Route Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      
      const result = registry.containsIdReferences(node);
      expect(result).toBe(false);
    });
  });
  
  describe('updateIdReferences', () => {
    it('应该调用更新器的updateIdReferences方法', () => {
      const updatedConfig = { routes: [{ targetNodeId: '2' }] };
      const updater: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(),
        updateIdReferences: jest.fn(() => updatedConfig)
      };
      
      registry.register(updater);
      
      const node = {
        id: 'node_1',
        type: NodeType.ROUTE,
        name: 'Route Node',
        config: { routes: [{ targetNodeId: 'node_2' }] },
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      
      const idMapping: IdMapping = {
        nodeIds: new Map([['node_2', 2]]),
        edgeIds: new Map(),
        reverseNodeIds: new Map([[2, 'node_2']]),
        reverseEdgeIds: new Map(),
        subgraphNamespaces: new Map()
      };
      
      const result = registry.updateIdReferences(node, idMapping);
      
      expect(result.config).toBe(updatedConfig);
      expect(updater.updateIdReferences).toHaveBeenCalledWith(node.config, idMapping);
    });
    
    it('应该返回原始节点如果未注册更新器', () => {
      const node = {
        id: 'node_1',
        type: NodeType.ROUTE,
        name: 'Route Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      
      const idMapping: IdMapping = {
        nodeIds: new Map(),
        edgeIds: new Map(),
        reverseNodeIds: new Map(),
        reverseEdgeIds: new Map(),
        subgraphNamespaces: new Map()
      };
      
      const result = registry.updateIdReferences(node, idMapping);
      expect(result).toBe(node);
    });
  });
  
  describe('getRegisteredNodeTypes', () => {
    it('应该返回所有已注册的节点类型', () => {
      const updater1: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(),
        updateIdReferences: jest.fn()
      };
      
      const updater2: NodeConfigUpdater = {
        nodeType: NodeType.FORK,
        containsIdReferences: jest.fn(),
        updateIdReferences: jest.fn()
      };
      
      registry.register(updater1);
      registry.register(updater2);
      
      const result = registry.getRegisteredNodeTypes();
      
      expect(result).toContain(NodeType.ROUTE);
      expect(result).toContain(NodeType.FORK);
      expect(result.length).toBe(2);
    });
  });
  
  describe('has', () => {
    it('应该返回true如果已注册', () => {
      const updater: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(),
        updateIdReferences: jest.fn()
      };
      
      registry.register(updater);
      
      expect(registry.has(NodeType.ROUTE)).toBe(true);
    });
    
    it('应该返回false如果未注册', () => {
      expect(registry.has(NodeType.ROUTE)).toBe(false);
    });
  });
  
  describe('clear', () => {
    it('应该清空所有已注册的更新器', () => {
      const updater: NodeConfigUpdater = {
        nodeType: NodeType.ROUTE,
        containsIdReferences: jest.fn(),
        updateIdReferences: jest.fn()
      };
      
      registry.register(updater);
      expect(registry.has(NodeType.ROUTE)).toBe(true);
      
      registry.clear();
      
      expect(registry.has(NodeType.ROUTE)).toBe(false);
      expect(registry.getRegisteredNodeTypes().length).toBe(0);
    });
  });
});