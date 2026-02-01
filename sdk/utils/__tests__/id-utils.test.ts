/**
 * ID工具函数单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateId,
  isValidId,
  validateId,
  generateNamespacedNodeId,
  generateNamespacedEdgeId,
  extractOriginalId,
  generateSubgraphNamespace,
  isNamespacedId
} from '../id-utils';

describe('id-utils', () => {
  describe('generateId', () => {
    it('应该生成有效的UUID v4', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('每次生成的ID应该不同', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('生成的ID应该是有效的ID', () => {
      const id = generateId();
      expect(isValidId(id)).toBe(true);
    });

    it('生成的ID长度应该是36个字符', () => {
      const id = generateId();
      expect(id.length).toBe(36);
    });
  });

  describe('isValidId', () => {
    it('应该接受有效的字符串ID', () => {
      expect(isValidId('valid-id')).toBe(true);
      expect(isValidId('12345')).toBe(true);
      expect(isValidId('node_test')).toBe(true);
    });

    it('应该拒绝空字符串', () => {
      expect(isValidId('')).toBe(false);
    });

    it('应该拒绝非字符串类型', () => {
      expect(isValidId(null as any)).toBe(false);
      expect(isValidId(undefined as any)).toBe(false);
      expect(isValidId(123 as any)).toBe(false);
      expect(isValidId({} as any)).toBe(false);
      expect(isValidId([] as any)).toBe(false);
    });

    it('应该接受UUID格式的ID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(isValidId(uuid)).toBe(true);
    });

    it('应该接受带前缀的ID', () => {
      expect(isValidId('node_test')).toBe(true);
      expect(isValidId('edge_test')).toBe(true);
      expect(isValidId('wflow_test')).toBe(true);
    });
  });

  describe('validateId', () => {
    describe('workflow ID验证', () => {
      it('应该接受有效的workflow ID', () => {
        const validId = 'wflow_550e8400-e29b-41d4-a716-446655440000';
        expect(validateId(validId, 'workflow')).toBe(true);
      });

      it('应该拒绝无效的workflow ID', () => {
        expect(validateId('invalid', 'workflow')).toBe(false);
        expect(validateId('node_test', 'workflow')).toBe(false);
        expect(validateId('wflow_invalid', 'workflow')).toBe(false);
      });
    });

    describe('thread ID验证', () => {
      it('应该接受有效的thread ID', () => {
        const validId = 'thrd_550e8400-e29b-41d4-a716-446655440000';
        expect(validateId(validId, 'thread')).toBe(true);
      });

      it('应该拒绝无效的thread ID', () => {
        expect(validateId('invalid', 'thread')).toBe(false);
        expect(validateId('node_test', 'thread')).toBe(false);
        expect(validateId('thrd_invalid', 'thread')).toBe(false);
      });
    });

    describe('node ID验证', () => {
      it('应该接受有效的node ID', () => {
        expect(validateId('node_test', 'node')).toBe(true);
        expect(validateId('node_test_123', 'node')).toBe(true);
        expect(validateId('node_start', 'node')).toBe(true);
      });

      it('应该拒绝无效的node ID', () => {
        expect(validateId('invalid', 'node')).toBe(false);
        expect(validateId('node_123-456', 'node')).toBe(false); // 包含连字符
        expect(validateId('node_Test', 'node')).toBe(false); // 包含大写字母
      });
    });

    describe('edge ID验证', () => {
      it('应该接受有效的edge ID', () => {
        expect(validateId('edge_test', 'edge')).toBe(true);
        expect(validateId('edge_test_123', 'edge')).toBe(true);
        expect(validateId('edge_start', 'edge')).toBe(true);
      });

      it('应该拒绝无效的edge ID', () => {
        expect(validateId('invalid', 'edge')).toBe(false);
        expect(validateId('edge_123-456', 'edge')).toBe(false); // 包含连字符
        expect(validateId('edge_Test', 'edge')).toBe(false); // 包含大写字母
      });
    });

    describe('checkpoint ID验证', () => {
      it('应该接受有效的checkpoint ID', () => {
        const validId = 'ckpt_550e8400-e29b-41d4-a716-446655440000';
        expect(validateId(validId, 'checkpoint')).toBe(true);
      });

      it('应该拒绝无效的checkpoint ID', () => {
        expect(validateId('invalid', 'checkpoint')).toBe(false);
        expect(validateId('node_test', 'checkpoint')).toBe(false);
        expect(validateId('ckpt_invalid', 'checkpoint')).toBe(false);
      });
    });

    describe('toolCall ID验证', () => {
      it('应该接受有效的toolCall ID', () => {
        expect(validateId('call_123_test', 'toolCall')).toBe(true);
        expect(validateId('call_456_tool', 'toolCall')).toBe(true);
      });

      it('应该拒绝无效的toolCall ID', () => {
        expect(validateId('invalid', 'toolCall')).toBe(false);
        expect(validateId('call_test', 'toolCall')).toBe(false); // 缺少数字
        expect(validateId('call_123-456', 'toolCall')).toBe(false); // 包含连字符
      });
    });

    describe('event ID验证', () => {
      it('应该接受有效的event ID', () => {
        expect(validateId('evt_123_test', 'event')).toBe(true);
        expect(validateId('evt_456_event', 'event')).toBe(true);
      });

      it('应该拒绝无效的event ID', () => {
        expect(validateId('invalid', 'event')).toBe(false);
        expect(validateId('evt_test', 'event')).toBe(false); // 缺少数字
        expect(validateId('evt_123-456', 'event')).toBe(false); // 包含连字符
      });
    });

    describe('未知实体类型', () => {
      it('应该拒绝未知实体类型', () => {
        expect(validateId('test', 'unknown')).toBe(false);
        expect(validateId('node_test', 'unknown')).toBe(false);
      });
    });
  });

  describe('generateNamespacedNodeId', () => {
    it('应该生成带命名空间前缀的节点ID', () => {
      const result = generateNamespacedNodeId('prefix', 'node_original');
      expect(result).toBe('node_prefix_original');
    });

    it('应该处理不带node_前缀的原始ID', () => {
      const result = generateNamespacedNodeId('prefix', 'original');
      expect(result).toBe('node_prefix_original');
    });

    it('应该处理带node_前缀的原始ID', () => {
      const result = generateNamespacedNodeId('prefix', 'node_original');
      expect(result).toBe('node_prefix_original');
    });

    it('应该处理包含下划线的原始ID', () => {
      const result = generateNamespacedNodeId('prefix', 'node_original_id');
      expect(result).toBe('node_prefix_original_id');
    });

    it('应该处理数字前缀', () => {
      const result = generateNamespacedNodeId('123', 'node_test');
      expect(result).toBe('node_123_test');
    });
  });

  describe('generateNamespacedEdgeId', () => {
    it('应该生成带命名空间前缀的边ID', () => {
      const result = generateNamespacedEdgeId('prefix', 'edge_original');
      expect(result).toBe('edge_prefix_original');
    });

    it('应该处理不带edge_前缀的原始ID', () => {
      const result = generateNamespacedEdgeId('prefix', 'original');
      expect(result).toBe('edge_prefix_original');
    });

    it('应该处理带edge_前缀的原始ID', () => {
      const result = generateNamespacedEdgeId('prefix', 'edge_original');
      expect(result).toBe('edge_prefix_original');
    });

    it('应该处理包含下划线的原始ID', () => {
      const result = generateNamespacedEdgeId('prefix', 'edge_original_id');
      expect(result).toBe('edge_prefix_original_id');
    });

    it('应该处理数字前缀', () => {
      const result = generateNamespacedEdgeId('123', 'edge_test');
      expect(result).toBe('edge_123_test');
    });
  });

  describe('extractOriginalId', () => {
    it('应该从命名空间节点ID中提取原始ID', () => {
      const result = extractOriginalId('node_prefix_original');
      expect(result).toBe('original');
    });

    it('应该从命名空间边ID中提取原始ID', () => {
      const result = extractOriginalId('edge_prefix_original');
      expect(result).toBe('original');
    });

    it('应该处理包含多个下划线的原始ID', () => {
      const result = extractOriginalId('node_prefix_original_id');
      expect(result).toBe('original_id');
    });

    it('应该处理不带命名空间的ID', () => {
      const result = extractOriginalId('node_original');
      expect(result).toBe('node_original');
    });

    it('应该处理简单ID', () => {
      const result = extractOriginalId('simple');
      expect(result).toBe('simple');
    });

    it('应该处理只有两个部分的ID', () => {
      const result = extractOriginalId('node_prefix');
      expect(result).toBe('node_prefix');
    });
  });

  describe('generateSubgraphNamespace', () => {
    it('应该生成子工作流命名空间前缀', () => {
      const result = generateSubgraphNamespace('workflow1', 'node1');
      expect(result).toMatch(/^sg_[a-f0-9]+$/);
    });

    it('应该为相同的输入生成相同的前缀', () => {
      const result1 = generateSubgraphNamespace('workflow1', 'node1');
      const result2 = generateSubgraphNamespace('workflow1', 'node1');
      expect(result1).toBe(result2);
    });

    it('应该为不同的输入生成不同的前缀', () => {
      const result1 = generateSubgraphNamespace('workflow1', 'node1');
      const result2 = generateSubgraphNamespace('workflow2', 'node1');
      expect(result1).not.toBe(result2);
    });

    it('应该处理UUID格式的ID', () => {
      const workflowId = '550e8400-e29b-41d4-a716-446655440000';
      const nodeId = 'node_test';
      const result = generateSubgraphNamespace(workflowId, nodeId);
      expect(result).toMatch(/^sg_[a-f0-9]+$/);
    });

    it('应该生成以sg_开头的前缀', () => {
      const result = generateSubgraphNamespace('workflow1', 'node1');
      expect(result).toMatch(/^sg_/);
    });

    it('应该处理空字符串', () => {
      const result = generateSubgraphNamespace('', '');
      expect(result).toMatch(/^sg_[a-f0-9]*$/);
    });
  });

  describe('isNamespacedId', () => {
    it('应该识别命名空间节点ID', () => {
      expect(isNamespacedId('node_sg_abc123_original')).toBe(true);
      expect(isNamespacedId('node_sg_1a2b3c_test')).toBe(true);
    });

    it('应该识别命名空间边ID', () => {
      expect(isNamespacedId('edge_sg_abc123_original')).toBe(true);
      expect(isNamespacedId('edge_sg_1a2b3c_test')).toBe(true);
    });

    it('应该拒绝非命名空间节点ID', () => {
      expect(isNamespacedId('node_original')).toBe(false);
      expect(isNamespacedId('node_test')).toBe(false);
      expect(isNamespacedId('node_prefix_original')).toBe(false);
    });

    it('应该拒绝非命名空间边ID', () => {
      expect(isNamespacedId('edge_original')).toBe(false);
      expect(isNamespacedId('edge_test')).toBe(false);
      expect(isNamespacedId('edge_prefix_original')).toBe(false);
    });

    it('应该拒绝其他类型的ID', () => {
      expect(isNamespacedId('wflow_test')).toBe(false);
      expect(isNamespacedId('thrd_test')).toBe(false);
      expect(isNamespacedId('ckpt_test')).toBe(false);
      expect(isNamespacedId('call_123_test')).toBe(false);
      expect(isNamespacedId('evt_123_test')).toBe(false);
    });

    it('应该拒绝空字符串', () => {
      expect(isNamespacedId('')).toBe(false);
    });

    it('应该拒绝不完整的命名空间ID', () => {
      expect(isNamespacedId('node_sg_')).toBe(false);
      expect(isNamespacedId('edge_sg_')).toBe(false);
    });
  });
});