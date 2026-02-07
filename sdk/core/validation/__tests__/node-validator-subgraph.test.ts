/**
 * 节点验证器 - 子工作流节点验证测试
 * 测试 NodeValidator 中 SUBGRAPH 和 START_FROM_TRIGGER 节点的验证逻辑
 * 使用Result类型进行错误处理
 */

import { NodeValidator } from '../node-validator';
import { NodeType } from '../../../types/node';
import type { Node } from '../../../types/node';
import type { Result } from '../../../types/result';
import { ValidationError } from '../../../types/errors';

describe('NodeValidator - Subgraph Node Validation', () => {
  let validator: NodeValidator;

  beforeEach(() => {
    validator = new NodeValidator();
  });

  describe('SUBGRAPH节点验证', () => {
    it('应该验证有效的SUBGRAPH节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: { input: 'workflowInput' },
          outputMapping: { output: 'workflowOutput' },
          async: false
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的SUBGRAPH节点（无inputMapping）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          outputMapping: { output: 'workflowOutput' },
          async: false
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的SUBGRAPH节点（无outputMapping）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: { input: 'workflowInput' },
          async: false
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的SUBGRAPH节点（无inputMapping和outputMapping）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          async: false
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该拒绝缺少subgraphId的SUBGRAPH节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          inputMapping: {},
          outputMapping: {},
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('subgraphId'))).toBe(true);
      }
    });

    it('应该拒绝空键的inputMapping的SUBGRAPH节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: { '': 'workflowInput' }, // 空键
          outputMapping: {},
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('inputMapping'))).toBe(true);
      }
    });

    it('应该拒绝空值的inputMapping的SUBGRAPH节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: { 'input': '' }, // 空值
          outputMapping: {},
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('inputMapping'))).toBe(true);
      }
    });

    it('应该拒绝空键的outputMapping的SUBGRAPH节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: {},
          outputMapping: { '': 'workflowOutput' }, // 空键
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('outputMapping'))).toBe(true);
      }
    });

    it('应该拒绝空值的outputMapping的SUBGRAPH节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: {
          subgraphId: 'subgraph-1',
          inputMapping: {},
          outputMapping: { 'output': '' }, // 空值
          async: false
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.field?.includes('outputMapping'))).toBe(true);
      }
    });
  });

  describe('START_FROM_TRIGGER节点验证', () => {
    it('应该验证有效的START_FROM_TRIGGER节点（空配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Start From Trigger',
        type: NodeType.START_FROM_TRIGGER,
        config: {}, // 空配置
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该接受空config的START_FROM_TRIGGER节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Start From Trigger',
        type: NodeType.START_FROM_TRIGGER,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该拒绝包含额外配置的START_FROM_TRIGGER节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Start From Trigger',
        type: NodeType.START_FROM_TRIGGER,
        config: {
          subgraphId: 'parent-workflow', // 不应该有此配置
          inputMapping: { input: 'workflowInput' }, // 不应该有此配置
          outputMapping: { output: 'workflowOutput' }, // 不应该有此配置
          async: false // 不应该有此配置
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CONTINUE_FROM_TRIGGER节点验证', () => {
    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（空配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {}, // 空配置
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该接受空config的CONTINUE_FROM_TRIGGER节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该拒绝包含额外配置的CONTINUE_FROM_TRIGGER节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          someConfig: 'value' // 不应该有此配置
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });

  describe('CONTINUE_FROM_TRIGGER节点验证', () => {
    it('应该验证有效的CONTINUE_FROM_TRIGGER节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该拒绝有配置的CONTINUE_FROM_TRIGGER节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: { someConfig: 'value' } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });
});