/**
 * TypeIndexManager 单元测试
 */

import { TypeIndexManager } from '../type-index-manager';
import { MessageRole } from '@modular-agent/types';

describe('TypeIndexManager', () => {
  let indexManager: TypeIndexManager;

  beforeEach(() => {
    indexManager = new TypeIndexManager();
  });

  describe('初始化', () => {
    it('应该正确初始化索引映射', () => {
      const typeIndices = indexManager.getAllTypeIndices();
      expect(typeIndices.get(MessageRole.SYSTEM)).toEqual([]);
      expect(typeIndices.get(MessageRole.USER)).toEqual([]);
      expect(typeIndices.get(MessageRole.ASSISTANT)).toEqual([]);
      expect(typeIndices.get(MessageRole.TOOL)).toEqual([]);
      expect(indexManager.getTotalCount()).toBe(0);
    });
  });

  describe('添加索引', () => {
    it('应该正确添加索引', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 1);
      indexManager.addIndex(MessageRole.ASSISTANT, 2);

      const typeIndices = indexManager.getAllTypeIndices();
      expect(typeIndices.get(MessageRole.USER)).toEqual([0, 1]);
      expect(typeIndices.get(MessageRole.ASSISTANT)).toEqual([2]);
      expect(indexManager.getTotalCount()).toBe(3);
    });
  });

  describe('按角色获取索引', () => {
    it('应该返回指定角色的索引', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 2);
      indexManager.addIndex(MessageRole.ASSISTANT, 1);

      const userIndices = indexManager.getIndicesByRole(MessageRole.USER);
      expect(userIndices).toEqual([0, 2]);
      
      const assistantIndices = indexManager.getIndicesByRole(MessageRole.ASSISTANT);
      expect(assistantIndices).toEqual([1]);
    });

    it('应该返回空数组（不存在的角色）', () => {
      const indices = indexManager.getIndicesByRole(MessageRole.TOOL);
      expect(indices).toEqual([]);
    });
  });

  describe('获取最近的索引', () => {
    it('应该返回指定角色的最近N条消息索引', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 2);
      indexManager.addIndex(MessageRole.USER, 4);

      const recent = indexManager.getRecentIndicesByRole(MessageRole.USER, 2);
      expect(recent).toEqual([2, 4]);
    });
  });

  describe('获取索引范围', () => {
    it('应该返回指定范围的索引', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 2);
      indexManager.addIndex(MessageRole.USER, 4);

      const range = indexManager.getRangeIndicesByRole(MessageRole.USER, 0, 2);
      expect(range).toEqual([0, 2]);
    });
  });

  describe('获取计数', () => {
    it('应该返回指定角色的消息数量', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 2);
      indexManager.addIndex(MessageRole.ASSISTANT, 1);

      expect(indexManager.getCountByRole(MessageRole.USER)).toBe(2);
      expect(indexManager.getCountByRole(MessageRole.ASSISTANT)).toBe(1);
      expect(indexManager.getCountByRole(MessageRole.TOOL)).toBe(0);
    });
  });

  describe('移除索引', () => {
    it('应该移除指定的索引', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 1);
      indexManager.addIndex(MessageRole.ASSISTANT, 2);

      indexManager.removeIndices([1]);

      expect(indexManager.getIndicesByRole(MessageRole.USER)).toEqual([0]);
      expect(indexManager.getTotalCount()).toBe(2);
    });
  });

  describe('保留索引', () => {
    it('应该只保留指定的索引', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 1);
      indexManager.addIndex(MessageRole.ASSISTANT, 2);

      indexManager.keepIndices([0, 2]);

      expect(indexManager.getIndicesByRole(MessageRole.USER)).toEqual([0]);
      expect(indexManager.getIndicesByRole(MessageRole.ASSISTANT)).toEqual([2]);
      expect(indexManager.getTotalCount()).toBe(2);
    });
  });

  describe('克隆', () => {
    it('应该正确克隆索引管理器', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 1);
      indexManager.addIndex(MessageRole.ASSISTANT, 2);

      const cloned = indexManager.clone();

      // 修改原始管理器
      indexManager.addIndex(MessageRole.USER, 3);

      // 克隆的管理器应该不受影响
      expect(indexManager.getCountByRole(MessageRole.USER)).toBe(3);
      expect(cloned.getCountByRole(MessageRole.USER)).toBe(2);
    });
  });

  describe('重置', () => {
    it('应该正确重置索引管理器', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 1);
      indexManager.addIndex(MessageRole.ASSISTANT, 2);

      indexManager.reset();

      const typeIndices = indexManager.getAllTypeIndices();
      expect(typeIndices.get(MessageRole.SYSTEM)).toEqual([]);
      expect(typeIndices.get(MessageRole.USER)).toEqual([]);
      expect(typeIndices.get(MessageRole.ASSISTANT)).toEqual([]);
      expect(typeIndices.get(MessageRole.TOOL)).toEqual([]);
      expect(indexManager.getTotalCount()).toBe(0);
    });
  });

  describe('一致性检查', () => {
    it('应该通过一致性检查', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 1);
      indexManager.addIndex(MessageRole.ASSISTANT, 2);

      expect(indexManager.checkConsistency()).toBe(true);
    });

    it('应该检测到无序的索引', () => {
      indexManager.addIndex(MessageRole.USER, 0);
      indexManager.addIndex(MessageRole.USER, 2);
      
      // 正常情况下应该一致
      expect(indexManager.checkConsistency()).toBe(true);

      // 通过 Reflect 破坏内部状态以模拟无序索引
      const typeIndices = Reflect.get(indexManager, 'typeIndices') as Map<MessageRole, number[]>;
      const userIndices = typeIndices.get(MessageRole.USER)!;
      userIndices.push(1); // 在索引末尾插入无序的索引
      
      // 现在应该检测到一致性错误
      expect(indexManager.checkConsistency()).toBe(false);
    });
  });
});