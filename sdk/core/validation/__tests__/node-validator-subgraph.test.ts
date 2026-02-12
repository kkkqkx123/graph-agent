/**
 * 节点验证器 - 子工作流节点验证测试
 * 测试 NodeValidator 中 SUBGRAPH 和 START_FROM_TRIGGER 节点的验证逻辑
 * 使用Result类型进行错误处理
 */

import { NodeValidator } from '../node-validator';
import { NodeType } from '@modular-agent/types/node';
import type { Node } from '@modular-agent/types/node';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';

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

    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（带变量回调配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          variableCallback: {
            includeVariables: ['var1', 'var2']
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（带includeAll配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          variableCallback: {
            includeAll: true
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（带对话历史回调配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          conversationHistoryCallback: {
            lastN: 10
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（带lastNByRole配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          conversationHistoryCallback: {
            lastNByRole: {
              role: 'user',
              count: 5
            }
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（带byRole配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          conversationHistoryCallback: {
            byRole: 'assistant'
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（带range配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          conversationHistoryCallback: {
            range: {
              start: 0,
              end: 10
            }
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该验证有效的CONTINUE_FROM_TRIGGER节点（完整配置）', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          variableCallback: {
            includeVariables: ['var1', 'var2']
          },
          conversationHistoryCallback: {
            lastN: 10
          }
        },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(node);
    });

    it('应该拒绝同时设置includeAll和includeVariables的配置', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          variableCallback: {
            includeAll: true,
            includeVariables: ['var1', 'var2']
          }
        } as any,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      const result = validator.validateNode(node);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some(e => e.message.includes('cannot have both includeAll and includeVariables'))).toBe(true);
      }
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

    it('应该拒绝无效的role值', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Continue From Trigger',
        type: NodeType.CONTINUE_FROM_TRIGGER,
        config: {
          conversationHistoryCallback: {
            byRole: 'invalid_role' as any
          }
        },
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