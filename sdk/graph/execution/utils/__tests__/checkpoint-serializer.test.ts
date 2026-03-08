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
        id: 'test-cp-1',
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        threadState: {
          status: 'RUNNING',
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: { global: {}, thread: {}, local: [], loop: [] },
          input: {},
          output: { result: 'test' },
          nodeResults: {},
          errors: [],
          conversationState: { markMap: { originalIndices: [], typeIndices: { system: [], user: [], assistant: [], tool: [] }, batchBoundaries: [], boundaryToBatch: [], currentBatch: 0 }, tokenUsage: null, currentRequestUsage: null }
        },
        metadata: {
          creator: 'test',
          description: 'Test checkpoint'
        }
      };

      const result = serializeCheckpoint(checkpoint);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('序列化后的数据应该包含完整的检查点信息', () => {
      const checkpoint: Checkpoint = {
        id: 'test-cp-1',
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        timestamp: 1234567890,
        threadState: {
          status: 'RUNNING',
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: { global: { userName: 'Alice', age: 30 }, thread: {}, local: [], loop: [] },
          input: {},
          output: { success: true },
          nodeResults: {},
          errors: [],
          conversationState: { markMap: { originalIndices: [], typeIndices: { system: [], user: [], assistant: [], tool: [] }, batchBoundaries: [], boundaryToBatch: [], currentBatch: 0 }, tokenUsage: null, currentRequestUsage: null }
        },
        metadata: {
          creator: 'test-user',
          description: 'Test checkpoint'
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const json = new TextDecoder().decode(serialized);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('test-cp-1');
      expect(parsed.threadId).toBe('test-thread');
      expect(parsed.workflowId).toBe('test-workflow');
      expect(parsed.timestamp).toBe(1234567890);
      expect(parsed.threadState.variableScopes.global.userName).toBe('Alice');
      expect(parsed.threadState.variableScopes.global.age).toBe(30);
      expect(parsed.threadState.output.success).toBe(true);
      expect(parsed.metadata.creator).toBe('test-user');
      expect(parsed.metadata.description).toBe('Test checkpoint');
    });

    it('应该正确处理包含复杂数据的检查点', () => {
      const checkpoint: Checkpoint = {
        id: 'test-cp-1',
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        threadState: {
          status: 'RUNNING',
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {
              nested: { level1: { level2: 'deep' } },
              array: [1, 2, 3],
              nullValue: null,
              booleanValue: false
            },
            thread: {},
            local: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: [],
          conversationState: { markMap: { originalIndices: [], typeIndices: { system: [], user: [], assistant: [], tool: [] }, batchBoundaries: [], boundaryToBatch: [], currentBatch: 0 }, tokenUsage: null, currentRequestUsage: null }
        },
        metadata: {
          creator: 'test',
          description: 'Complex test'
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized.threadState.variableScopes.global.nested.level1.level2).toBe('deep');
      expect(deserialized.threadState.variableScopes.global.array).toEqual([1, 2, 3]);
      expect(deserialized.threadState.variableScopes.global.nullValue).toBeNull();
      expect(deserialized.threadState.variableScopes.global.booleanValue).toBe(false);
    });

    it('应该正确处理空状态', () => {
      const checkpoint: Checkpoint = {
        id: 'test-cp-1',
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        threadState: {
          status: 'RUNNING',
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: { global: {}, thread: {}, local: [], loop: [] },
          input: {},
          output: {},
          nodeResults: {},
          errors: [],
          conversationState: { markMap: { originalIndices: [], typeIndices: { system: [], user: [], assistant: [], tool: [] }, batchBoundaries: [], boundaryToBatch: [], currentBatch: 0 }, tokenUsage: null, currentRequestUsage: null }
        },
        metadata: {
          creator: 'test',
          description: 'Empty state'
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized.id).toBe('test-cp-1');
      expect(Object.keys(deserialized.threadState.variables).length).toBe(0);
      expect(Object.keys(deserialized.threadState.output).length).toBe(0);
    });
  });

  describe('deserializeCheckpoint', () => {
    it('应该正确反序列化 Uint8Array 为检查点对象', () => {
      const checkpoint: Checkpoint = {
        id: 'test-cp-1',
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        threadState: {
          status: 'RUNNING',
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: { global: {}, thread: {}, local: [], loop: [] },
          input: {},
          output: { result: 'test' },
          nodeResults: {},
          errors: [],
          conversationState: { markMap: { originalIndices: [], typeIndices: { system: [], user: [], assistant: [], tool: [] }, batchBoundaries: [], boundaryToBatch: [], currentBatch: 0 }, tokenUsage: null, currentRequestUsage: null }
        },
        metadata: {
          creator: 'test',
          description: 'Test checkpoint'
        }
      };

      const serialized = serializeCheckpoint(checkpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized).toEqual(checkpoint);
    });

    it('序列化后反序列化应该得到原始数据（往返测试）', () => {
      const originalCheckpoint: Checkpoint = {
        id: 'test-cp-1',
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        timestamp: 1234567890,
        threadState: {
          status: 'RUNNING',
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {
              string: 'hello',
              number: 42,
              boolean: true,
              null: null,
              array: [1, 'two', { three: 3 }],
              object: { nested: 'value' }
            },
            thread: {},
            local: [],
            loop: []
          },
          input: {},
          output: { result: 'success' },
          nodeResults: {},
          errors: [],
          conversationState: { markMap: { originalIndices: [], typeIndices: { system: [], user: [], assistant: [], tool: [] }, batchBoundaries: [], boundaryToBatch: [], currentBatch: 0 }, tokenUsage: null, currentRequestUsage: null }
        },
        metadata: {
          creator: 'test-user',
          description: 'Round-trip test',
          tags: ['test']
        }
      };

      const serialized = serializeCheckpoint(originalCheckpoint);
      const deserialized = deserializeCheckpoint(serialized);

      expect(deserialized.id).toBe(originalCheckpoint.id);
      expect(deserialized.threadId).toBe(originalCheckpoint.threadId);
      expect(deserialized.workflowId).toBe(originalCheckpoint.workflowId);
      expect(deserialized.timestamp).toBe(originalCheckpoint.timestamp);
      expect(deserialized.threadState.variableScopes.global).toEqual(originalCheckpoint.threadState.variableScopes.global);
      expect(deserialized.threadState.output).toEqual(originalCheckpoint.threadState.output);
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
        id: 'test-cp-1',
        threadId: 'test-thread',
        workflowId: 'test-workflow',
        timestamp: Date.now(),
        threadState: {
          status: 'RUNNING',
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: { global: {}, thread: {}, local: [], loop: [] },
          input: {},
          output: {},
          nodeResults: {},
          errors: [],
          conversationState: { markMap: { originalIndices: [], typeIndices: { system: [], user: [], assistant: [], tool: [] }, batchBoundaries: [], boundaryToBatch: [], currentBatch: 0 }, tokenUsage: null, currentRequestUsage: null }
        },
        metadata: {
          creator: 'test',
          description: 'Format test'
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
