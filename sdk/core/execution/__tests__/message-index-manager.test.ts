/**
 * MessageIndexManager 单元测试
 */

import { MessageIndexManager } from '../message-index-manager';

describe('MessageIndexManager', () => {
  let indexManager: MessageIndexManager;

  beforeEach(() => {
    indexManager = new MessageIndexManager();
  });

  describe('初始化', () => {
    it('应该正确初始化标记映射', () => {
      const markMap = indexManager.getMarkMap();
      expect(markMap.originalIndices).toEqual([]);
      expect(markMap.batchBoundaries).toEqual([0]);
      expect(markMap.boundaryToBatch).toEqual([0]);
      expect(markMap.currentBatch).toBe(0);
    });
  });

  describe('添加索引', () => {
    it('应该正确添加索引', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);

      const markMap = indexManager.getMarkMap();
      expect(markMap.originalIndices).toEqual([0, 1, 2]);
    });
  });

  describe('获取当前批次索引', () => {
    it('应该返回所有索引（批次0）', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);

      const indices = indexManager.getCurrentBatchIndices();
      expect(indices).toEqual([0, 1, 2]);
    });

    it('应该返回批次1的索引', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);
      indexManager.addIndex(3);
      indexManager.addIndex(4);

      // 开始新批次
      indexManager.startNewBatch(2);

      const indices = indexManager.getCurrentBatchIndices();
      expect(indices).toEqual([2, 3, 4]);
    });
  });

  describe('判断消息是否被修改', () => {
    it('应该正确判断消息是否被修改', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);
      indexManager.addIndex(3);
      indexManager.addIndex(4);

      // 开始新批次
      indexManager.startNewBatch(2);

      expect(indexManager.isModified(0)).toBe(true);
      expect(indexManager.isModified(1)).toBe(true);
      expect(indexManager.isModified(2)).toBe(false);
      expect(indexManager.isModified(3)).toBe(false);
      expect(indexManager.isModified(4)).toBe(false);
    });
  });

  describe('获取批次索引', () => {
    it('应该正确计算批次索引', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);
      indexManager.addIndex(3);
      indexManager.addIndex(4);

      // 开始新批次
      indexManager.startNewBatch(2);

      expect(indexManager.getBatchIndex(2)).toBe(0);
      expect(indexManager.getBatchIndex(3)).toBe(1);
      expect(indexManager.getBatchIndex(4)).toBe(2);
    });
  });

  describe('过滤消息', () => {
    it('应该正确过滤消息', () => {
      const messages = [
        { role: 'user', content: 'msg0' },
        { role: 'assistant', content: 'msg1' },
        { role: 'user', content: 'msg2' },
        { role: 'assistant', content: 'msg3' },
        { role: 'user', content: 'msg4' }
      ];

      const indices = [0, 2, 4];
      const filtered = indexManager.filterMessages(messages, indices);

      expect(filtered).toEqual([
        { role: 'user', content: 'msg0' },
        { role: 'user', content: 'msg2' },
        { role: 'user', content: 'msg4' }
      ]);
    });
  });

  describe('开始新批次', () => {
    it('应该正确开始新批次', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);

      indexManager.startNewBatch(2);

      const markMap = indexManager.getMarkMap();
      expect(markMap.batchBoundaries).toEqual([0, 2]);
      expect(markMap.boundaryToBatch).toEqual([0, 1]);
      expect(markMap.currentBatch).toBe(1);
    });

    it('应该拒绝无效的边界索引', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);

      expect(() => indexManager.startNewBatch(5)).toThrow('Invalid boundary index');
    });
  });

  describe('回退到指定批次', () => {
    it('应该正确回退到批次0', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);
      indexManager.addIndex(3);
      indexManager.addIndex(4);

      // 开始新批次
      indexManager.startNewBatch(2);

      // 回退到批次0
      indexManager.rollbackToBatch(0);

      const markMap = indexManager.getMarkMap();
      expect(markMap.batchBoundaries).toEqual([0]);
      expect(markMap.boundaryToBatch).toEqual([0]);
      expect(markMap.currentBatch).toBe(0);
    });

    it('应该拒绝无效的批次', () => {
      expect(() => indexManager.rollbackToBatch(99)).toThrow('Target batch 99 not found');
    });
  });

  describe('批次循环', () => {
    it('应该支持批次循环（0-1-0）', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);
      indexManager.addIndex(3);
      indexManager.addIndex(4);

      // 初始状态
      let markMap = indexManager.getMarkMap();
      expect(markMap.batchBoundaries).toEqual([0]);
      expect(markMap.boundaryToBatch).toEqual([0]);
      expect(markMap.currentBatch).toBe(0);

      // 添加临时消息（批次1）
      indexManager.startNewBatch(2);
      markMap = indexManager.getMarkMap();
      expect(markMap.batchBoundaries).toEqual([0, 2]);
      expect(markMap.boundaryToBatch).toEqual([0, 1]);
      expect(markMap.currentBatch).toBe(1);

      // 删除临时消息（回到批次0）
      indexManager.rollbackToBatch(0);
      markMap = indexManager.getMarkMap();
      expect(markMap.batchBoundaries).toEqual([0]);
      expect(markMap.boundaryToBatch).toEqual([0]);
      expect(markMap.currentBatch).toBe(0);
    });
  });

  describe('克隆', () => {
    it('应该正确克隆索引管理器', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);
      indexManager.startNewBatch(1);

      const cloned = indexManager.clone();

      // 修改原始管理器
      indexManager.addIndex(3);

      // 克隆的管理器应该不受影响
      const originalMarkMap = indexManager.getMarkMap();
      const clonedMarkMap = cloned.getMarkMap();

      expect(originalMarkMap.originalIndices).toEqual([0, 1, 2, 3]);
      expect(clonedMarkMap.originalIndices).toEqual([0, 1, 2]);
    });
  });

  describe('重置', () => {
    it('应该正确重置索引管理器', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);
      indexManager.startNewBatch(1);

      indexManager.reset();

      const markMap = indexManager.getMarkMap();
      expect(markMap.originalIndices).toEqual([]);
      expect(markMap.batchBoundaries).toEqual([0]);
      expect(markMap.boundaryToBatch).toEqual([0]);
      expect(markMap.currentBatch).toBe(0);
    });
  });

  describe('一致性检查', () => {
    it('应该通过一致性检查', () => {
      indexManager.addIndex(0);
      indexManager.addIndex(1);
      indexManager.addIndex(2);

      expect(indexManager.checkConsistency()).toBe(true);
    });

    it('应该检测到不一致的边界数组', () => {
      // 手动创建不一致的状态
      const markMap = indexManager.getMarkMap();
      markMap.batchBoundaries = [0, 2, 3];
      markMap.boundaryToBatch = [0, 1]; // 长度不一致
      indexManager.setMarkMap(markMap);

      expect(indexManager.checkConsistency()).toBe(false);
    });

    it('应该检测到无效的边界顺序', () => {
      // 手动创建无效的边界顺序
      const markMap = indexManager.getMarkMap();
      markMap.batchBoundaries = [0, 5, 3]; // 3 < 5，顺序无效
      markMap.boundaryToBatch = [0, 1, 2];
      indexManager.setMarkMap(markMap);

      expect(indexManager.checkConsistency()).toBe(false);
    });

    it('应该检测到无效的当前批次', () => {
      // 手动创建无效的当前批次
      const markMap = indexManager.getMarkMap();
      markMap.currentBatch = 99; // 不存在于 boundaryToBatch 中
      indexManager.setMarkMap(markMap);

      expect(indexManager.checkConsistency()).toBe(false);
    });
  });
});