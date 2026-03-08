import { describe, it, expect } from 'vitest';
import {
  startNewBatch,
  rollbackToBatch,
  mergeBatches,
  getBatchInfo,
  getAllBatchesInfo
} from '../batch-management-utils';
import type { MessageMarkMap } from '@modular-agent/types';

describe('batch-management-utils', () => {
  // 创建测试用的 MessageMarkMap
  const createTestMarkMap = (): MessageMarkMap => ({
    originalIndices: [0, 1, 2, 3, 4, 5],
    batchBoundaries: [0],
    boundaryToBatch: [0],
    currentBatch: 0
  });

  describe('startNewBatch', () => {
    it('应该成功创建新批次', () => {
      const markMap = createTestMarkMap();
      const result = startNewBatch(markMap, 3);
      
      expect(result.batchBoundaries).toEqual([0, 3]);
      expect(result.boundaryToBatch).toEqual([0, 1]);
      expect(result.currentBatch).toBe(1);
    });

    it('应该保持原始索引不变', () => {
      const markMap = createTestMarkMap();
      const result = startNewBatch(markMap, 3);
      
      expect(result.originalIndices).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('应该支持边界索引等于数组长度', () => {
      const markMap = createTestMarkMap();
      const result = startNewBatch(markMap, 6);
      
      expect(result.batchBoundaries).toEqual([0, 6]);
      expect(result.currentBatch).toBe(1);
    });

    it('应该支持边界索引为0', () => {
      const markMap = createTestMarkMap();
      const result = startNewBatch(markMap, 0);
      
      expect(result.batchBoundaries).toEqual([0, 0]);
      expect(result.currentBatch).toBe(1);
    });

    it('应该验证边界索引递增性', () => {
      const markMap = createTestMarkMap();
      const firstResult = startNewBatch(markMap, 3);
      
      expect(() => startNewBatch(firstResult, 2)).toThrow();
    });

    it('应该允许边界索引相等', () => {
      const markMap = createTestMarkMap();
      const firstResult = startNewBatch(markMap, 3);
      const secondResult = startNewBatch(firstResult, 3);
      
      expect(secondResult.batchBoundaries).toEqual([0, 3, 3]);
      expect(secondResult.currentBatch).toBe(2);
    });

    it('边界索引小于0时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      expect(() => startNewBatch(markMap, -1)).toThrow();
    });

    it('边界索引大于数组长度时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      expect(() => startNewBatch(markMap, 10)).toThrow();
    });

    it('不应该修改原对象', () => {
      const markMap = createTestMarkMap();
      const originalBoundaries = [...markMap.batchBoundaries];
      const originalCurrentBatch = markMap.currentBatch;
      
      startNewBatch(markMap, 3);
      
      expect(markMap.batchBoundaries).toEqual(originalBoundaries);
      expect(markMap.currentBatch).toBe(originalCurrentBatch);
    });

    it('应该支持创建多个批次', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      const result3 = startNewBatch(result2, 5);
      
      expect(result3.batchBoundaries).toEqual([0, 2, 4, 5]);
      expect(result3.boundaryToBatch).toEqual([0, 1, 2, 3]);
      expect(result3.currentBatch).toBe(3);
    });
  });

  describe('rollbackToBatch', () => {
    it('应该成功回退到指定批次', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const rolledBack = rollbackToBatch(result2, 1);
      
      expect(rolledBack.batchBoundaries).toEqual([0, 2]);
      expect(rolledBack.boundaryToBatch).toEqual([0, 1]);
      expect(rolledBack.currentBatch).toBe(1);
    });

    it('应该回退到批次0', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const rolledBack = rollbackToBatch(result2, 0);
      
      expect(rolledBack.batchBoundaries).toEqual([0]);
      expect(rolledBack.boundaryToBatch).toEqual([0]);
      expect(rolledBack.currentBatch).toBe(0);
    });

    it('回退到当前批次应该保持不变', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      
      const rolledBack = rollbackToBatch(result1, 1);
      
      expect(rolledBack.batchBoundaries).toEqual(result1.batchBoundaries);
      expect(rolledBack.currentBatch).toBe(1);
    });

    it('目标批次不存在时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      
      expect(() => rollbackToBatch(result1, 5)).toThrow();
    });

    it('不应该修改原对象', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      const originalBoundaries = [...result2.batchBoundaries];
      
      rollbackToBatch(result2, 1);
      
      expect(result2.batchBoundaries).toEqual(originalBoundaries);
    });

    it('应该保持原始索引不变', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const rolledBack = rollbackToBatch(result2, 1);
      
      expect(rolledBack.originalIndices).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });

  describe('mergeBatches', () => {
    it('应该成功合并相邻批次', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const merged = mergeBatches(result2, 0, 1);
      
      expect(merged.batchBoundaries).toEqual([0, 4]);
      expect(merged.boundaryToBatch).toEqual([0, 2]);
      expect(merged.currentBatch).toBe(2);
    });

    it('应该合并多个批次', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      const result3 = startNewBatch(result2, 5);
      
      const merged = mergeBatches(result3, 0, 2);
      
      expect(merged.batchBoundaries).toEqual([0, 5]);
      expect(merged.boundaryToBatch).toEqual([0, 3]);
      expect(merged.currentBatch).toBe(3);
    });

    it('源批次不存在时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      
      expect(() => mergeBatches(result1, 5, 1)).toThrow();
    });

    it('目标批次不存在时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      
      expect(() => mergeBatches(result1, 0, 5)).toThrow();
    });

    it('fromBatch >= toBatch时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      
      expect(() => mergeBatches(result1, 1, 1)).toThrow();
      expect(() => mergeBatches(result1, 1, 0)).toThrow();
    });

    it('不应该修改原对象', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      const originalBoundaries = [...result2.batchBoundaries];
      
      mergeBatches(result2, 0, 1);
      
      expect(result2.batchBoundaries).toEqual(originalBoundaries);
    });

    it('应该保持原始索引不变', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const merged = mergeBatches(result2, 0, 1);
      
      expect(merged.originalIndices).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('应该保持currentBatch不变', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const merged = mergeBatches(result2, 0, 1);
      
      expect(merged.currentBatch).toBe(2);
    });
  });

  describe('getBatchInfo', () => {
    it('应该返回正确的批次信息', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 3);
      
      const batchInfo = getBatchInfo(result1, 1);
      
      expect(batchInfo.boundaryIndex).toBe(3);
      expect(batchInfo.visibleMessageCount).toBe(3);
      expect(batchInfo.isCurrentBatch).toBe(true);
    });

    it('应该正确计算可见消息数量', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      
      const batchInfo = getBatchInfo(result1, 1);
      
      expect(batchInfo.visibleMessageCount).toBe(4);
    });

    it('应该正确识别非当前批次', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const batchInfo = getBatchInfo(result2, 1);
      
      expect(batchInfo.isCurrentBatch).toBe(false);
    });

    it('批次不存在时应该抛出异常', () => {
      const markMap = createTestMarkMap();
      expect(() => getBatchInfo(markMap, 5)).toThrow();
    });

    it('应该处理批次0', () => {
      const markMap = createTestMarkMap();
      const batchInfo = getBatchInfo(markMap, 0);
      
      expect(batchInfo.boundaryIndex).toBe(0);
      expect(batchInfo.visibleMessageCount).toBe(6);
      expect(batchInfo.isCurrentBatch).toBe(true);
    });

    it('边界索引等于数组长度时可见消息数量应为0', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 6);
      
      const batchInfo = getBatchInfo(result1, 1);
      
      expect(batchInfo.visibleMessageCount).toBe(0);
    });
  });

  describe('getAllBatchesInfo', () => {
    it('应该返回所有批次的信息', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const allBatches = getAllBatchesInfo(result2);
      
      expect(allBatches).toHaveLength(3);
      expect(allBatches[0].batchId).toBe(0);
      expect(allBatches[1].batchId).toBe(1);
      expect(allBatches[2].batchId).toBe(2);
    });

    it('应该正确标记当前批次', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      
      const allBatches = getAllBatchesInfo(result1);
      
      expect(allBatches[0].isCurrentBatch).toBe(false);
      expect(allBatches[1].isCurrentBatch).toBe(true);
    });

    it('应该正确计算每个批次的可见消息数量', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const allBatches = getAllBatchesInfo(result2);
      
      expect(allBatches[0].visibleMessageCount).toBe(6);
      expect(allBatches[1].visibleMessageCount).toBe(4);
      expect(allBatches[2].visibleMessageCount).toBe(2);
    });

    it('应该正确返回边界索引', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const result2 = startNewBatch(result1, 4);
      
      const allBatches = getAllBatchesInfo(result2);
      
      expect(allBatches[0].boundaryIndex).toBe(0);
      expect(allBatches[1].boundaryIndex).toBe(2);
      expect(allBatches[2].boundaryIndex).toBe(4);
    });

    it('应该处理单个批次的情况', () => {
      const markMap = createTestMarkMap();
      const allBatches = getAllBatchesInfo(markMap);
      
      expect(allBatches).toHaveLength(1);
      expect(allBatches[0].batchId).toBe(0);
      expect(allBatches[0].isCurrentBatch).toBe(true);
    });

    it('不应该修改原对象', () => {
      const markMap = createTestMarkMap();
      const result1 = startNewBatch(markMap, 2);
      const originalBoundaries = [...result1.batchBoundaries];
      
      getAllBatchesInfo(result1);
      
      expect(result1.batchBoundaries).toEqual(originalBoundaries);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的批次生命周期', () => {
      const markMap = createTestMarkMap();
      
      // 创建批次
      const batch1 = startNewBatch(markMap, 2);
      expect(batch1.currentBatch).toBe(1);
      
      const batch2 = startNewBatch(batch1, 4);
      expect(batch2.currentBatch).toBe(2);
      
      const batch3 = startNewBatch(batch2, 5);
      expect(batch3.currentBatch).toBe(3);
      
      // 回退
      const rolledBack = rollbackToBatch(batch3, 1);
      expect(rolledBack.currentBatch).toBe(1);
      expect(rolledBack.batchBoundaries).toEqual([0, 2]);
      
      // 合并
      const merged = mergeBatches(rolledBack, 0, 1);
      expect(merged.batchBoundaries).toEqual([0]);
      
      // 获取信息 - 合并后只剩下批次0
      const batchInfo = getBatchInfo(merged, 0);
      expect(batchInfo.visibleMessageCount).toBe(6);
    });

    it('应该正确处理复杂的批次操作序列', () => {
      const markMap = createTestMarkMap();
      
      // 创建多个批次
      const b1 = startNewBatch(markMap, 1);
      const b2 = startNewBatch(b1, 2);
      const b3 = startNewBatch(b2, 3);
      const b4 = startNewBatch(b3, 4);
      
      // 验证所有批次信息
      const allBatches = getAllBatchesInfo(b4);
      expect(allBatches).toHaveLength(5);
      
      // 回退到中间批次
      const rolledBack = rollbackToBatch(b4, 2);
      expect(rolledBack.batchBoundaries).toEqual([0, 1, 2]);
      
      // 合并前两个批次
      const merged = mergeBatches(rolledBack, 0, 1);
      expect(merged.batchBoundaries).toEqual([0, 2]);
      
      // 创建新批次
      const newBatch = startNewBatch(merged, 5);
      expect(newBatch.batchBoundaries).toEqual([0, 2, 5]);
    });
  });
});
