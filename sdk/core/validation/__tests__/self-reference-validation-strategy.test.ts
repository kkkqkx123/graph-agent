/**
 * 自引用验证策略测试
 * 测试 SelfReferenceValidationStrategy 的验证逻辑
 */

import { SelfReferenceValidationStrategy } from '../strategies/self-reference-validation-strategy';
import { NodeType } from '../../../types/node';
import type { Node } from '../../../types/node';

describe('SelfReferenceValidationStrategy', () => {
  describe('isSubgraphNode', () => {
    it('应该识别SUBGRAPH节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: { subgraphId: 'child-workflow' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      expect(SelfReferenceValidationStrategy.isSubgraphNode(node)).toBe(true);
    });

    it('应该识别START_FROM_TRIGGER节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Start From Trigger',
        type: NodeType.START_FROM_TRIGGER,
        config: { subgraphId: 'parent-workflow' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      expect(SelfReferenceValidationStrategy.isSubgraphNode(node)).toBe(true);
    });

    it('不应该识别其他节点类型', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: { scriptName: 'test' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };
      expect(SelfReferenceValidationStrategy.isSubgraphNode(node)).toBe(false);
    });
  });

  describe('validate', () => {
    it('应该检测SUBGRAPH节点的自引用', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: { subgraphId: 'workflow-1' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const errors = SelfReferenceValidationStrategy.validate(
        node,
        'workflow-1',
        'workflow.nodes[0]'
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]!.context?.['code']).toBe('SELF_REFERENCE');
      expect(errors[0]!.context?.['subgraphId']).toBe('workflow-1');
    });

    it('应该检测START_FROM_TRIGGER节点的自引用', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Start From Trigger',
        type: NodeType.START_FROM_TRIGGER,
        config: { subgraphId: 'workflow-1' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const errors = SelfReferenceValidationStrategy.validate(
        node,
        'workflow-1',
        'workflow.nodes[0]'
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]!.context?.['code']).toBe('SELF_REFERENCE');
    });

    it('应该接受有效的SUBGRAPH节点引用', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Subgraph',
        type: NodeType.SUBGRAPH,
        config: { subgraphId: 'child-workflow' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const errors = SelfReferenceValidationStrategy.validate(
        node,
        'workflow-1',
        'workflow.nodes[0]'
      );

      expect(errors).toHaveLength(0);
    });

    it('应该接受有效的START_FROM_TRIGGER节点引用', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Start From Trigger',
        type: NodeType.START_FROM_TRIGGER,
        config: { subgraphId: 'parent-workflow' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const errors = SelfReferenceValidationStrategy.validate(
        node,
        'workflow-1',
        'workflow.nodes[0]'
      );

      expect(errors).toHaveLength(0);
    });

    it('应该跳过非子工作流节点', () => {
      const node: Node = {
        id: 'node-1',
        name: 'Code',
        type: NodeType.CODE,
        config: { scriptName: 'test' },
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const errors = SelfReferenceValidationStrategy.validate(
        node,
        'workflow-1',
        'workflow.nodes[0]'
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateNodes', () => {
    it('应该检测多个节点中的自引用', () => {
      const nodes: Node[] = [
        {
          id: 'node-1',
          name: 'Subgraph',
          type: NodeType.SUBGRAPH,
          config: { subgraphId: 'workflow-1' },
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        },
        {
          id: 'node-2',
          name: 'Code',
          type: NodeType.CODE,
          config: { scriptName: 'test' },
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        },
        {
          id: 'node-3',
          name: 'Start From Trigger',
          type: NodeType.START_FROM_TRIGGER,
          config: { subgraphId: 'workflow-1' },
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        }
      ];

      const errors = SelfReferenceValidationStrategy.validateNodes(
        nodes,
        'workflow-1'
      );

      expect(errors).toHaveLength(2);
      expect(errors[0]!.context?.['nodeId']).toBe('node-1');
      expect(errors[1]!.context?.['nodeId']).toBe('node-3');
    });

    it('应该接受所有有效的节点引用', () => {
      const nodes: Node[] = [
        {
          id: 'node-1',
          name: 'Subgraph',
          type: NodeType.SUBGRAPH,
          config: { subgraphId: 'child-workflow' },
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        },
        {
          id: 'node-2',
          name: 'Start From Trigger',
          type: NodeType.START_FROM_TRIGGER,
          config: { subgraphId: 'parent-workflow' },
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        }
      ];

      const errors = SelfReferenceValidationStrategy.validateNodes(
        nodes,
        'workflow-1'
      );

      expect(errors).toHaveLength(0);
    });

    it('应该处理空节点数组', () => {
      const errors = SelfReferenceValidationStrategy.validateNodes(
        [],
        'workflow-1'
      );

      expect(errors).toHaveLength(0);
    });

    it('应该使用自定义路径前缀', () => {
      const nodes: Node[] = [
        {
          id: 'node-1',
          name: 'Subgraph',
          type: NodeType.SUBGRAPH,
          config: { subgraphId: 'workflow-1' },
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        }
      ];

      const errors = SelfReferenceValidationStrategy.validateNodes(
        nodes,
        'workflow-1',
        'custom.path'
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]!.field).toBe('custom.path[0].config.subgraphId');
    });
  });
});