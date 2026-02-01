/**
 * ThreadRegistry 单元测试
 */

import { ThreadRegistry } from '../thread-registry';

// Mock ThreadContext 类 - 只实现 getThreadId 方法
class MockThreadContext {
  constructor(public threadId: string) {}

  getThreadId(): string {
    return this.threadId;
  }
}

describe('ThreadRegistry', () => {
  let registry: ThreadRegistry;

  beforeEach(() => {
    // 创建新的 ThreadRegistry 实例以避免测试间干扰
    registry = new ThreadRegistry();
  });

  describe('register - 注册 ThreadContext', () => {
    it('应该成功注册 ThreadContext', () => {
      const threadContext = new MockThreadContext('thread-1');

      registry.register(threadContext as any);

      expect(registry.has('thread-1')).toBe(true);
    });

    it('应该覆盖已存在的 ThreadContext', () => {
      const threadContext1 = new MockThreadContext('thread-1');
      const threadContext2 = new MockThreadContext('thread-1');

      registry.register(threadContext1 as any);
      registry.register(threadContext2 as any);

      const retrieved = registry.get('thread-1');
      expect(retrieved).toBe(threadContext2);
    });

    it('应该支持注册多个 ThreadContext', () => {
      const threadContext1 = new MockThreadContext('thread-1');
      const threadContext2 = new MockThreadContext('thread-2');
      const threadContext3 = new MockThreadContext('thread-3');

      registry.register(threadContext1 as any);
      registry.register(threadContext2 as any);
      registry.register(threadContext3 as any);

      expect(registry.has('thread-1')).toBe(true);
      expect(registry.has('thread-2')).toBe(true);
      expect(registry.has('thread-3')).toBe(true);
    });
  });

  describe('get - 获取 ThreadContext', () => {
    it('应该返回已注册的 ThreadContext', () => {
      const threadContext = new MockThreadContext('thread-1');

      registry.register(threadContext as any);

      const result = registry.get('thread-1');

      expect(result).toBe(threadContext);
    });

    it('应该返回 null 当 ThreadContext 不存在', () => {
      const result = registry.get('non-existent-thread');

      expect(result).toBeNull();
    });

    it('应该返回 null 当注册表为空', () => {
      const result = registry.get('thread-1');

      expect(result).toBeNull();
    });
  });

  describe('delete - 删除 ThreadContext', () => {
    it('应该成功删除 ThreadContext', () => {
      const threadContext = new MockThreadContext('thread-1');

      registry.register(threadContext as any);
      registry.delete('thread-1');

      expect(registry.has('thread-1')).toBe(false);
      expect(registry.get('thread-1')).toBeNull();
    });

    it('应该不抛出错误当删除不存在的 ThreadContext', () => {
      expect(() => {
        registry.delete('non-existent-thread');
      }).not.toThrow();
    });

    it('应该只删除指定的 ThreadContext', () => {
      const threadContext1 = new MockThreadContext('thread-1');
      const threadContext2 = new MockThreadContext('thread-2');
      const threadContext3 = new MockThreadContext('thread-3');

      registry.register(threadContext1 as any);
      registry.register(threadContext2 as any);
      registry.register(threadContext3 as any);

      registry.delete('thread-2');

      expect(registry.has('thread-1')).toBe(true);
      expect(registry.has('thread-2')).toBe(false);
      expect(registry.has('thread-3')).toBe(true);
    });
  });

  describe('getAll - 获取所有 ThreadContext', () => {
    it('应该返回所有已注册的 ThreadContext', () => {
      const threadContext1 = new MockThreadContext('thread-1');
      const threadContext2 = new MockThreadContext('thread-2');
      const threadContext3 = new MockThreadContext('thread-3');

      registry.register(threadContext1 as any);
      registry.register(threadContext2 as any);
      registry.register(threadContext3 as any);

      const result = registry.getAll();

      expect(result).toHaveLength(3);
      expect(result).toContain(threadContext1);
      expect(result).toContain(threadContext2);
      expect(result).toContain(threadContext3);
    });

    it('应该返回空数组当没有 ThreadContext', () => {
      const result = registry.getAll();

      expect(result).toEqual([]);
    });

    it('应该返回 ThreadContext 的副本而不是引用', () => {
      const threadContext = new MockThreadContext('thread-1');

      registry.register(threadContext as any);

      const result1 = registry.getAll();
      const result2 = registry.getAll();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('clear - 清空所有 ThreadContext', () => {
    it('应该清空所有 ThreadContext', () => {
      const threadContext1 = new MockThreadContext('thread-1');
      const threadContext2 = new MockThreadContext('thread-2');
      const threadContext3 = new MockThreadContext('thread-3');

      registry.register(threadContext1 as any);
      registry.register(threadContext2 as any);
      registry.register(threadContext3 as any);

      registry.clear();

      expect(registry.getAll()).toEqual([]);
      expect(registry.has('thread-1')).toBe(false);
      expect(registry.has('thread-2')).toBe(false);
      expect(registry.has('thread-3')).toBe(false);
    });

    it('应该不抛出错误当清空空的注册表', () => {
      expect(() => {
        registry.clear();
      }).not.toThrow();
    });
  });

  describe('has - 检查 ThreadContext 是否存在', () => {
    it('应该返回 true 当 ThreadContext 存在', () => {
      const threadContext = new MockThreadContext('thread-1');

      registry.register(threadContext as any);

      expect(registry.has('thread-1')).toBe(true);
    });

    it('应该返回 false 当 ThreadContext 不存在', () => {
      expect(registry.has('non-existent-thread')).toBe(false);
    });

    it('应该返回 false 当注册表为空', () => {
      expect(registry.has('thread-1')).toBe(false);
    });

    it('应该在删除后返回 false', () => {
      const threadContext = new MockThreadContext('thread-1');

      registry.register(threadContext as any);
      expect(registry.has('thread-1')).toBe(true);

      registry.delete('thread-1');
      expect(registry.has('thread-1')).toBe(false);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的 ThreadContext 生命周期', () => {
      // 1. 注册 ThreadContext
      const threadContext = new MockThreadContext('thread-1');
      registry.register(threadContext as any);
      expect(registry.has('thread-1')).toBe(true);

      // 2. 获取 ThreadContext
      const retrieved = registry.get('thread-1');
      expect(retrieved).toBe(threadContext);

      // 3. 检查存在性
      expect(registry.has('thread-1')).toBe(true);

      // 4. 删除 ThreadContext
      registry.delete('thread-1');
      expect(registry.has('thread-1')).toBe(false);
      expect(registry.get('thread-1')).toBeNull();
    });

    it('应该支持多个 ThreadContext 的管理', () => {
      const threadContexts = [
        new MockThreadContext('thread-1'),
        new MockThreadContext('thread-2'),
        new MockThreadContext('thread-3'),
        new MockThreadContext('thread-4'),
        new MockThreadContext('thread-5')
      ];

      // 批量注册
      threadContexts.forEach(tc => registry.register(tc as any));

      expect(registry.getAll()).toHaveLength(5);

      // 批量获取
      threadContexts.forEach(tc => {
        expect(registry.get(tc.getThreadId())).toBe(tc);
      });

      // 批量删除
      registry.delete('thread-2');
      registry.delete('thread-4');

      expect(registry.getAll()).toHaveLength(3);
      expect(registry.has('thread-1')).toBe(true);
      expect(registry.has('thread-2')).toBe(false);
      expect(registry.has('thread-3')).toBe(true);
      expect(registry.has('thread-4')).toBe(false);
      expect(registry.has('thread-5')).toBe(true);
    });

    it('应该支持清空后重新注册', () => {
      const threadContext1 = new MockThreadContext('thread-1');
      const threadContext2 = new MockThreadContext('thread-2');

      registry.register(threadContext1 as any);
      registry.register(threadContext2 as any);

      expect(registry.getAll()).toHaveLength(2);

      // 清空
      registry.clear();
      expect(registry.getAll()).toHaveLength(0);

      // 重新注册
      const threadContext3 = new MockThreadContext('thread-3');
      registry.register(threadContext3 as any);

      expect(registry.getAll()).toHaveLength(1);
      expect(registry.has('thread-3')).toBe(true);
    });

    it('应该支持覆盖已存在的 ThreadContext', () => {
      const threadContext1 = new MockThreadContext('thread-1');
      const threadContext2 = new MockThreadContext('thread-1');

      registry.register(threadContext1 as any);
      expect(registry.get('thread-1')).toBe(threadContext1);

      registry.register(threadContext2 as any);
      expect(registry.get('thread-1')).toBe(threadContext2);
      expect(registry.get('thread-1')).not.toBe(threadContext1);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空字符串作为 threadId', () => {
      const threadContext = new MockThreadContext('');

      registry.register(threadContext as any);

      expect(registry.has('')).toBe(true);
      expect(registry.get('')).toBe(threadContext);
    });

    it('应该处理特殊字符作为 threadId', () => {
      const specialIds = [
        'thread-with-dashes',
        'thread_with_underscores',
        'thread.with.dots',
        'thread/with/slashes',
        'thread\\with\\backslashes',
        'thread with spaces',
        'thread@with#special$chars'
      ];

      specialIds.forEach(id => {
        const threadContext = new MockThreadContext(id);
        registry.register(threadContext as any);
        expect(registry.has(id)).toBe(true);
        expect(registry.get(id)).toBe(threadContext);
      });

      expect(registry.getAll()).toHaveLength(specialIds.length);
    });

    it('应该处理大量 ThreadContext', () => {
      const count = 1000;
      const threadContexts: MockThreadContext[] = [];

      for (let i = 0; i < count; i++) {
        const threadContext = new MockThreadContext(`thread-${i}`);
        threadContexts.push(threadContext);
        registry.register(threadContext as any);
      }

      expect(registry.getAll()).toHaveLength(count);

      // 随机删除一些
      const toDelete = [10, 50, 100, 500, 999];
      toDelete.forEach(index => {
        registry.delete(`thread-${index}`);
      });

      expect(registry.getAll()).toHaveLength(count - toDelete.length);
    });
  });
});