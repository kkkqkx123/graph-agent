/**
 * MemoryCheckpointStorage 单元测试
 * 测试内存存储实现的所有功能
 */

import { MemoryCheckpointStorage } from '../memory-checkpoint-storage';
import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';

describe('MemoryCheckpointStorage', () => {
  let storage: MemoryCheckpointStorage;

  beforeEach(() => {
    storage = new MemoryCheckpointStorage();
  });

  describe('save 和 load', () => {
    it('应该能保存和加载检查点数据', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data, metadata);
      const loaded = await storage.load(checkpointId);

      expect(loaded).toEqual(data);
    });

    it('不存在的检查点应该返回null', async () => {
      const loaded = await storage.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('应该能覆盖已有的检查点', async () => {
      const checkpointId = 'checkpoint-1';
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data1, metadata);
      await storage.save(checkpointId, data2, metadata);
      const loaded = await storage.load(checkpointId);

      expect(loaded).toEqual(data2);
    });

    it('应该能处理空数据', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data, metadata);
      const loaded = await storage.load(checkpointId);

      expect(loaded).toEqual(data);
      expect(loaded?.length).toBe(0);
    });

    it('应该能处理大数据', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array(10000).fill(42);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data, metadata);
      const loaded = await storage.load(checkpointId);

      expect(loaded).toEqual(data);
      expect(loaded?.length).toBe(10000);
    });
  });

  describe('delete', () => {
    it('应该能删除存在的检查点', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data, metadata);
      await storage.delete(checkpointId);
      const loaded = await storage.load(checkpointId);

      expect(loaded).toBeNull();
    });

    it('删除不存在的检查点不应该抛出错误', async () => {
      await expect(storage.delete('non-existent')).resolves.toBeUndefined();
    });

    it('删除后getCount应该减少', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data, metadata);
      expect(storage.getCount()).toBe(1);

      await storage.delete(checkpointId);
      expect(storage.getCount()).toBe(0);
    });
  });

  describe('exists', () => {
    it('存在的检查点应该返回true', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data, metadata);
      const exists = await storage.exists(checkpointId);

      expect(exists).toBe(true);
    });

    it('不存在的检查点应该返回false', async () => {
      const exists = await storage.exists('non-existent');
      expect(exists).toBe(false);
    });

    it('删除后exists应该返回false', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save(checkpointId, data, metadata);
      await storage.delete(checkpointId);
      const exists = await storage.exists(checkpointId);

      expect(exists).toBe(false);
    });
  });

  describe('list 基础功能', () => {
    it('空存储应该返回空数组', async () => {
      const ids = await storage.list();
      expect(ids).toEqual([]);
    });

    it('应该列出所有检查点ID', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save('checkpoint-1', new Uint8Array([1]), metadata);
      await storage.save('checkpoint-2', new Uint8Array([2]), metadata);
      await storage.save('checkpoint-3', new Uint8Array([3]), metadata);

      const ids = await storage.list();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('checkpoint-1');
      expect(ids).toContain('checkpoint-2');
      expect(ids).toContain('checkpoint-3');
    });

    it('应该按时间戳降序返回', async () => {
      const baseTime = Date.now();

      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime,
      });

      // 延迟确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));

      await storage.save('checkpoint-2', new Uint8Array([2]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 100,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await storage.save('checkpoint-3', new Uint8Array([3]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 200,
      });

      const ids = await storage.list();
      expect(ids[0]).toBe('checkpoint-3');
      expect(ids[1]).toBe('checkpoint-2');
      expect(ids[2]).toBe('checkpoint-1');
    });
  });

  describe('list 按threadId过滤', () => {
    it('应该能按threadId过滤', async () => {
      const baseTime = Date.now();

      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime,
      });

      await storage.save('checkpoint-2', new Uint8Array([2]), {
        threadId: 'thread-2',
        workflowId: 'workflow-1',
        timestamp: baseTime + 100,
      });

      await storage.save('checkpoint-3', new Uint8Array([3]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 200,
      });

      const ids = await storage.list({ threadId: 'thread-1' });
      expect(ids).toHaveLength(2);
      expect(ids).toContain('checkpoint-1');
      expect(ids).toContain('checkpoint-3');
    });

    it('不存在的threadId应该返回空数组', async () => {
      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      });

      const ids = await storage.list({ threadId: 'thread-2' });
      expect(ids).toEqual([]);
    });
  });

  describe('list 按workflowId过滤', () => {
    it('应该能按workflowId过滤', async () => {
      const baseTime = Date.now();

      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime,
      });

      await storage.save('checkpoint-2', new Uint8Array([2]), {
        threadId: 'thread-1',
        workflowId: 'workflow-2',
        timestamp: baseTime + 100,
      });

      await storage.save('checkpoint-3', new Uint8Array([3]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 200,
      });

      const ids = await storage.list({ workflowId: 'workflow-1' });
      expect(ids).toHaveLength(2);
      expect(ids).toContain('checkpoint-1');
      expect(ids).toContain('checkpoint-3');
    });

    it('不存在的workflowId应该返回空数组', async () => {
      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      });

      const ids = await storage.list({ workflowId: 'workflow-2' });
      expect(ids).toEqual([]);
    });
  });

  describe('list 按tags过滤', () => {
    it('应该能按tags过滤（匹配任一标签）', async () => {
      const baseTime = Date.now();

      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime,
        tags: ['tag-a', 'tag-b'],
      });

      await storage.save('checkpoint-2', new Uint8Array([2]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 100,
        tags: ['tag-c'],
      });

      await storage.save('checkpoint-3', new Uint8Array([3]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 200,
        tags: ['tag-a', 'tag-d'],
      });

      const ids = await storage.list({ tags: ['tag-a'] });
      expect(ids).toHaveLength(2);
      expect(ids).toContain('checkpoint-1');
      expect(ids).toContain('checkpoint-3');
    });

    it('应该能匹配多个标签中的任何一个', async () => {
      const baseTime = Date.now();

      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime,
        tags: ['tag-a'],
      });

      await storage.save('checkpoint-2', new Uint8Array([2]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 100,
        tags: ['tag-b'],
      });

      await storage.save('checkpoint-3', new Uint8Array([3]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime + 200,
        tags: ['tag-c'],
      });

      const ids = await storage.list({ tags: ['tag-a', 'tag-b'] });
      expect(ids).toHaveLength(2);
      expect(ids).toContain('checkpoint-1');
      expect(ids).toContain('checkpoint-2');
    });

    it('没有tags的检查点不应该被匹配', async () => {
      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      });

      const ids = await storage.list({ tags: ['tag-a'] });
      expect(ids).toEqual([]);
    });

    it('空tags数组应该不过滤', async () => {
      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        tags: ['tag-a'],
      });

      await storage.save('checkpoint-2', new Uint8Array([2]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now() + 100,
      });

      const ids = await storage.list({ tags: [] });
      expect(ids).toHaveLength(2);
    });
  });

  describe('list 分页', () => {
    beforeEach(async () => {
      const baseTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await storage.save(`checkpoint-${i}`, new Uint8Array([i]), {
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          timestamp: baseTime + i * 100,
        });
      }
    });

    it('应该能应用limit', async () => {
      const ids = await storage.list({ limit: 5 });
      expect(ids).toHaveLength(5);
    });

    it('应该能应用offset', async () => {
      const allIds = await storage.list();
      const paginatedIds = await storage.list({ offset: 5 });

      expect(paginatedIds).toEqual(allIds.slice(5));
    });

    it('应该能同时应用limit和offset', async () => {
      const allIds = await storage.list();
      const paginatedIds = await storage.list({ offset: 2, limit: 3 });

      expect(paginatedIds).toEqual(allIds.slice(2, 5));
      expect(paginatedIds).toHaveLength(3);
    });

    it('offset超出范围应该返回空数组', async () => {
      const ids = await storage.list({ offset: 100 });
      expect(ids).toEqual([]);
    });

    it('limit为0应该返回空数组', async () => {
      const ids = await storage.list({ limit: 0 });
      expect(ids).toEqual([]);
    });
  });

  describe('list 复合过滤', () => {
    it('应该能同时应用threadId和workflowId过滤', async () => {
      const baseTime = Date.now();

      await storage.save('checkpoint-1', new Uint8Array([1]), {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime,
      });

      await storage.save('checkpoint-2', new Uint8Array([2]), {
        threadId: 'thread-1',
        workflowId: 'workflow-2',
        timestamp: baseTime + 100,
      });

      await storage.save('checkpoint-3', new Uint8Array([3]), {
        threadId: 'thread-2',
        workflowId: 'workflow-1',
        timestamp: baseTime + 200,
      });

      const ids = await storage.list({
        threadId: 'thread-1',
        workflowId: 'workflow-1',
      });

      expect(ids).toHaveLength(1);
      expect(ids).toContain('checkpoint-1');
    });

    it('应该能同时应用过滤和分页', async () => {
      const baseTime = Date.now();

      for (let i = 0; i < 5; i++) {
        await storage.save(`checkpoint-1-${i}`, new Uint8Array([i]), {
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          timestamp: baseTime + i * 100,
        });
      }

      for (let i = 0; i < 3; i++) {
        await storage.save(`checkpoint-2-${i}`, new Uint8Array([i]), {
          threadId: 'thread-2',
          workflowId: 'workflow-1',
          timestamp: baseTime + i * 100,
        });
      }

      const ids = await storage.list({
        threadId: 'thread-1',
        limit: 2,
        offset: 1,
      });

      expect(ids).toHaveLength(2);
      expect(ids[0]).toBe('checkpoint-1-3');
      expect(ids[1]).toBe('checkpoint-1-2');
    });
  });

  describe('clear', () => {
    it('应该能清空所有检查点', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save('checkpoint-1', new Uint8Array([1]), metadata);
      await storage.save('checkpoint-2', new Uint8Array([2]), metadata);
      await storage.save('checkpoint-3', new Uint8Array([3]), metadata);

      expect(storage.getCount()).toBe(3);

      await storage.clear();

      expect(storage.getCount()).toBe(0);
      const ids = await storage.list();
      expect(ids).toEqual([]);
    });

    it('清空空存储不应该抛出错误', async () => {
      await expect(storage.clear()).resolves.toBeUndefined();
    });
  });

  describe('getCount', () => {
    it('新建存储的count应该为0', () => {
      expect(storage.getCount()).toBe(0);
    });

    it('保存检查点后count应该增加', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save('checkpoint-1', new Uint8Array([1]), metadata);
      expect(storage.getCount()).toBe(1);

      await storage.save('checkpoint-2', new Uint8Array([2]), metadata);
      expect(storage.getCount()).toBe(2);
    });

    it('覆盖检查点不应该增加count', async () => {
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      await storage.save('checkpoint-1', new Uint8Array([1]), metadata);
      expect(storage.getCount()).toBe(1);

      await storage.save('checkpoint-1', new Uint8Array([2]), metadata);
      expect(storage.getCount()).toBe(1);
    });
  });

  describe('边界情况和集成测试', () => {
    it('应该能处理多个并发操作', async () => {
      const baseTime = Date.now();
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: baseTime,
      };

      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          storage.save(`checkpoint-${i}`, new Uint8Array([i]), {
            ...metadata,
            timestamp: baseTime + i,
          })
        );
      }

      await Promise.all(promises);
      expect(storage.getCount()).toBe(20);

      const ids = await storage.list();
      expect(ids).toHaveLength(20);
    });

    it('应该能处理特殊字符的checkpointId', async () => {
      const specialIds = [
        'checkpoint-with-dash',
        'checkpoint_with_underscore',
        'checkpoint:with:colon',
        'checkpoint/with/slash',
        'checkpoint.with.dot',
      ];

      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
      };

      for (const id of specialIds) {
        await storage.save(id, new Uint8Array([1]), metadata);
      }

      const ids = await storage.list();
      expect(ids).toHaveLength(specialIds.length);

      for (const id of specialIds) {
        const exists = await storage.exists(id);
        expect(exists).toBe(true);
      }
    });

    it('应该能正确处理customFields', async () => {
      const checkpointId = 'checkpoint-1';
      const data = new Uint8Array([1, 2, 3]);
      const metadata: CheckpointStorageMetadata = {
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        customFields: {
          version: '1.0',
          status: 'active',
          nested: { key: 'value' },
        },
      };

      await storage.save(checkpointId, data, metadata);
      const loaded = await storage.load(checkpointId);

      expect(loaded).toEqual(data);
    });
  });
});
