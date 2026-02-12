/**
 * TypeIndexManager 单元测试
 */

import { TypeIndexManager } from '../type-index-manager';

describe('TypeIndexManager', () => {
  let typeIndexManager: TypeIndexManager;

  beforeEach(() => {
    typeIndexManager = new TypeIndexManager();
  });

  describe('初始化', () => {
    it('应该正确初始化所有类型的索引数组', () => {
      expect(typeIndexManager.getIndicesByRole('system')).toEqual([]);
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([]);
      expect(typeIndexManager.getIndicesByRole('assistant')).toEqual([]);
      expect(typeIndexManager.getIndicesByRole('tool')).toEqual([]);
      expect(typeIndexManager.getTotalCount()).toBe(0);
    });
  });

  describe('添加索引', () => {
    it('应该正确添加不同类型的索引', () => {
      typeIndexManager.addIndex('system', 0);
      typeIndexManager.addIndex('user', 1);
      typeIndexManager.addIndex('assistant', 2);
      typeIndexManager.addIndex('tool', 3);

      expect(typeIndexManager.getIndicesByRole('system')).toEqual([0]);
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([1]);
      expect(typeIndexManager.getIndicesByRole('assistant')).toEqual([2]);
      expect(typeIndexManager.getIndicesByRole('tool')).toEqual([3]);
      expect(typeIndexManager.getTotalCount()).toBe(4);
    });

    it('应该正确添加多个相同类型的索引', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('user', 2);
      typeIndexManager.addIndex('user', 4);

      expect(typeIndexManager.getIndicesByRole('user')).toEqual([0, 2, 4]);
      expect(typeIndexManager.getTotalCount()).toBe(3);
    });
  });

  describe('获取索引', () => {
    beforeEach(() => {
      typeIndexManager.addIndex('system', 0);
      typeIndexManager.addIndex('user', 1);
      typeIndexManager.addIndex('user', 3);
      typeIndexManager.addIndex('assistant', 2);
      typeIndexManager.addIndex('assistant', 4);
      typeIndexManager.addIndex('tool', 5);
    });

    it('应该正确获取指定类型的索引', () => {
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([1, 3]);
      expect(typeIndexManager.getIndicesByRole('assistant')).toEqual([2, 4]);
    });

    it('应该正确获取最近N条索引', () => {
      expect(typeIndexManager.getRecentIndicesByRole('user', 1)).toEqual([3]);
      expect(typeIndexManager.getRecentIndicesByRole('user', 2)).toEqual([1, 3]);
      expect(typeIndexManager.getRecentIndicesByRole('user', 5)).toEqual([1, 3]);
    });

    it('应该正确获取索引范围', () => {
      expect(typeIndexManager.getRangeIndicesByRole('user', 0, 1)).toEqual([1]);
      expect(typeIndexManager.getRangeIndicesByRole('user', 1, 2)).toEqual([3]);
      expect(typeIndexManager.getRangeIndicesByRole('assistant', 0, 2)).toEqual([2, 4]);
    });

    it('应该正确获取消息数量', () => {
      expect(typeIndexManager.getCountByRole('system')).toBe(1);
      expect(typeIndexManager.getCountByRole('user')).toBe(2);
      expect(typeIndexManager.getCountByRole('assistant')).toBe(2);
      expect(typeIndexManager.getCountByRole('tool')).toBe(1);
    });

    it('应该正确获取所有类型索引', () => {
      const allIndices = typeIndexManager.getAllTypeIndices();
      expect(allIndices.get('system')).toEqual([0]);
      expect(allIndices.get('user')).toEqual([1, 3]);
      expect(allIndices.get('assistant')).toEqual([2, 4]);
      expect(allIndices.get('tool')).toEqual([5]);
    });
  });

  describe('移除索引', () => {
    beforeEach(() => {
      typeIndexManager.addIndex('system', 0);
      typeIndexManager.addIndex('user', 1);
      typeIndexManager.addIndex('user', 3);
      typeIndexManager.addIndex('assistant', 2);
      typeIndexManager.addIndex('assistant', 4);
      typeIndexManager.addIndex('tool', 5);
    });

    it('应该正确移除指定的索引', () => {
      typeIndexManager.removeIndices([1, 4]);

      expect(typeIndexManager.getIndicesByRole('system')).toEqual([0]);
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([3]);
      expect(typeIndexManager.getIndicesByRole('assistant')).toEqual([2]);
      expect(typeIndexManager.getIndicesByRole('tool')).toEqual([5]);
      expect(typeIndexManager.getTotalCount()).toBe(4);
    });

    it('应该正确保留指定的索引', () => {
      typeIndexManager.keepIndices([0, 2, 5]);

      expect(typeIndexManager.getIndicesByRole('system')).toEqual([0]);
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([]);
      expect(typeIndexManager.getIndicesByRole('assistant')).toEqual([2]);
      expect(typeIndexManager.getIndicesByRole('tool')).toEqual([5]);
      expect(typeIndexManager.getTotalCount()).toBe(3);
    });
  });

  describe('克隆', () => {
    it('应该正确克隆类型索引管理器', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('user', 2);
      typeIndexManager.addIndex('assistant', 1);

      const cloned = typeIndexManager.clone();

      // 修改原始管理器
      typeIndexManager.addIndex('user', 4);

      // 克隆的管理器应该不受影响
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([0, 2, 4]);
      expect(cloned.getIndicesByRole('user')).toEqual([0, 2]);
      expect(typeIndexManager.getTotalCount()).toBe(4);
      expect(cloned.getTotalCount()).toBe(3);
    });
  });

  describe('重置', () => {
    it('应该正确重置类型索引管理器', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('assistant', 1);
      typeIndexManager.addIndex('tool', 2);

      typeIndexManager.reset();

      expect(typeIndexManager.getIndicesByRole('system')).toEqual([]);
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([]);
      expect(typeIndexManager.getIndicesByRole('assistant')).toEqual([]);
      expect(typeIndexManager.getIndicesByRole('tool')).toEqual([]);
      expect(typeIndexManager.getTotalCount()).toBe(0);
    });
  });

  describe('一致性检查', () => {
    it('应该通过一致性检查', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('user', 2);
      typeIndexManager.addIndex('assistant', 1);

      expect(typeIndexManager.checkConsistency()).toBe(true);
    });

    it('应该检测到索引顺序错误', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('user', 2);
      
      // 手动修改索引顺序
      const indices = typeIndexManager.getIndicesByRole('user');
      indices.reverse();
      (typeIndexManager as any).typeIndices.set('user', indices);

      expect(typeIndexManager.checkConsistency()).toBe(false);
    });

    it('应该检测到总数不一致', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('user', 2);

      // 手动修改总数
      (typeIndexManager as any).totalMessages = 5;

      expect(typeIndexManager.checkConsistency()).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理空索引数组', () => {
      expect(typeIndexManager.getIndicesByRole('user')).toEqual([]);
      expect(typeIndexManager.getRecentIndicesByRole('user', 5)).toEqual([]);
      expect(typeIndexManager.getRangeIndicesByRole('user', 0, 5)).toEqual([]);
      expect(typeIndexManager.getCountByRole('user')).toBe(0);
    });

    it('应该处理超出范围的查询', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('user', 2);

      expect(typeIndexManager.getRecentIndicesByRole('user', 5)).toEqual([0, 2]);
      expect(typeIndexManager.getRangeIndicesByRole('user', 0, 5)).toEqual([0, 2]);
    });

    it('应该处理移除不存在的索引', () => {
      typeIndexManager.addIndex('user', 0);
      typeIndexManager.addIndex('user', 2);

      typeIndexManager.removeIndices([1, 3, 5]);

      expect(typeIndexManager.getIndicesByRole('user')).toEqual([0, 2]);
      expect(typeIndexManager.getTotalCount()).toBe(2);
    });
  });
});