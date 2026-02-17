/**
 * CheckpointSerializer 单元测试
 * 测试检查点序列化和反序列化功能
 */

import { describe, it, expect } from 'vitest';
import { serializeCheckpoint, deserializeCheckpoint } from '../checkpoint-serializer.js';
import type { Checkpoint } from '@modular-agent/types';

describe('CheckpointSerializer', () => {
  describe('serializeCheckpoint', () => {
    it('应该正确序列化检查点为 Uint8Array', () => {
      const checkpoint: Checkpoint = {
        checkpointId: 'test-cp-1',
        threadId: 'test-thread',
        nodeId: 'test-node',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        state: {
          variables: { key: 'value' },
          output: { result: 'test' }
        },
        metadata: {
          status: 'COMPLETED',
          executionTime: 100
        }
      };

      const result = serializeCheckpoint(checkpoint);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('序列化后的数据应该包含完整的检查点信息', () => {
      const checkpoint: Checkpoint = {
        checkpointId: 'test-cp-1',
        threadId: 'test-thread',
        nodeId: 'test-node',
        workflowId: 'test-workflow',
        timestamp: 1234567890,
        state: {
          variables: { userName: 'Alice', age: 30 },
          output: { success: true }
        },
        metadata: {
          status: 'COMPLETED',
          executionTime: 500
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const json = new TextDecoder().decode(serialized);
      const parsed = JSON.parse(json);

      expect(parsed.checkpointId).toBe('test-cp-1');
      expect(parsed.threadId).toBe('test-thread');
      expect(parsed.nodeId).toBe('test-node');
      expect(parsed.workflowId).toBe('test-workflow');
      expect(parsed.timestamp).toBe(1234567890);
      expect(parsed.state.variables.userName).toBe('Alice');
      expect(parsed.state.variables.age).toBe(30);
      expect(parsed.state.output.success).toBe(true);
      expect(parsed.metadata.status).toBe('COMPLETED');
      expect(parsed.metadata.executionTime).toBe(500);
    });

    it('应该正确处理包含复杂数据的检查点', () => {
      const checkpoint: Checkpoint = {
        checkpointId: 'test-cp-1',
        threadId: 'test-thread',
        nodeId: 'test-node',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        state: {
          variables: {
            nested: { level1: { level2: 'deep' } },
            array: [1, 2, 3],
            nullValue: null,
            booleanValue: false
          },
          output: {}
        },
        metadata: {
          status: 'COMPLETED',
          executionTime: 100
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized.state.variables.nested.level1.level2).toBe('deep');
      expect(deserialized.state.variables.array).toEqual([1, 2, 3]);
      expect(deserialized.state.variables.nullValue).toBeNull();
      expect(deserialized.state.variables.booleanValue).toBe(false);
    });

    it('应该正确处理空状态', () => {
      const checkpoint: Checkpoint = {
        checkpointId: 'test-cp-1',
        threadId: 'test-thread',
        nodeId: 'test-node',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        state: {
          variables: {},
          output: {}
        },
        metadata: {
          status: 'RUNNING',
          executionTime: 0
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized.checkpointId).toBe('test-cp-1');
      expect(Object.keys(deserialized.state.variables).length).toBe(0);
      expect(Object.keys(deserialized.state.output).length).toBe(0);
    });
  });

  describe('deserializeCheckpoint', () => {
    it('应该正确反序列化 Uint8Array 为检查点对象', () => {
      const checkpoint: Checkpoint = {
        checkpointId: 'test-cp-1',
        threadId: 'test-thread',
        nodeId: 'test-node',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        state: {
          variables: { key: 'value' },
          output: { result: 'test' }
        },
        metadata: {
          status: 'COMPLETED',
          executionTime: 100
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized).toEqual(checkpoint);
    });

    it('序列化后反序列化应该得到原始数据（往返测试）', () => {
      const originalCheckpoint: Checkpoint = {
        checkpointId: 'test-cp-1',
        threadId: 'test-thread',
        nodeId: 'test-node',
        workflowId: 'test-workflow',
        timestamp: 1234567890,
        state: {
          variables: {
            string: 'hello',
            number: 42,
            boolean: true,
            null: null,
            array: [1, 'two', { three: 3 }],
            object: { nested: 'value' }
          },
          output: { result: 'success' }
        },
        metadata: {
          status: 'COMPLETED',
          executionTime: 500,
          errorMessage: undefined
        }
      };

      const serialized = serializeCheckpoint(originalCheckpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized.checkpointId).toBe(originalCheckpoint.checkpointId);
      expect(deserialized.threadId).toBe(originalCheckpoint.threadId);
      expect(deserialized.nodeId).toBe(originalCheckpoint.nodeId);
      expect(deserialized.workflowId).toBe(originalCheckpoint.workflowId);
      expect(deserialized.timestamp).toBe(originalCheckpoint.timestamp);
      expect(deserialized.state.variables).toEqual(originalCheckpoint.state.variables);
      expect(deserialized.state.output).toEqual(originalCheckpoint.state.output);
      expect(deserialized.metadata).toEqual(originalCheckpoint.metadata);
    });

    it('当数据格式无效时抛出错误', () => {
      const invalidData = new Uint8Array([0, 1, 2, 3, 4, 5]); // 无效的 JSON 数据

      expect(() => deserializeCheckpoint(invalidData)).toThrow();
    });

    it('当数据为空时抛出错误', () => {
      const emptyData = new Uint8Array([]);

      expect(() => deserializeCheckpoint(emptyData)).toThrow();
    });

    it('当数据不是有效的 JSON 时抛出错误', () => {
      const invalidJson = new TextEncoder().encode('not valid json');

      expect(() => deserializeCheckpoint(invalidJson)).toThrow();
    });
  });

  describe('序列化格式', () => {
    it('应该使用 JSON 格式序列化', () => {
      const checkpoint: Checkpoint = {
        checkpointId: 'test-cp-1',
        threadId: 'test-thread',
        nodeId: 'test-node',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        state: {
          variables: { key: 'value' },
          output: {}
        },
        metadata: {
          status: 'COMPLETED',
          executionTime: 100
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const json = new TextDecoder().decode(serialized);

      // 验证是有效的 JSON 格式
      expect(() => JSON.parse(json)).not.toThrow();

      // 验证使用了格式化（缩进）
      expect(json).toContain('\n');
      expect(json).toContain('  '); // 缩进
    });
  });
});
