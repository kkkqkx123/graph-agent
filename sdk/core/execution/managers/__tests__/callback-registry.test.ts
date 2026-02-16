/**
 * CallbackRegistry 单元测试
 */

import { CallbackRegistry } from '../callback-registry';
import type { ExecutedThreadResult } from '../../types/dynamic-thread.types';

describe('CallbackRegistry', () => {
  let callbackRegistry: CallbackRegistry;
  let mockThreadContext: any;
  let mockThreadResult: any;

  beforeEach(() => {
    callbackRegistry = new CallbackRegistry();
    mockThreadContext = {
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1'),
      getOutput: jest.fn().mockReturnValue({ result: 'success' })
    };
    mockThreadResult = {
      threadId: 'thread-1',
      output: { result: 'success' },
      executionTime: 100
    };
  });

  describe('registerCallback', () => {
    it('应该成功注册回调', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';

      const result = callbackRegistry.registerCallback(threadId, resolve, reject);

      expect(result).toBe(true);
      expect(callbackRegistry.hasCallback(threadId)).toBe(true);
    });

    it('不应该重复注册相同线程的回调', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';

      const firstResult = callbackRegistry.registerCallback(threadId, resolve, reject);
      const secondResult = callbackRegistry.registerCallback(threadId, resolve, reject);

      expect(firstResult).toBe(true);
      expect(secondResult).toBe(false);
    });

    it('应该记录注册时间', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const beforeTime = Date.now();

      callbackRegistry.registerCallback(threadId, resolve, reject);

      const callbackInfo = callbackRegistry.getCallback(threadId);
      expect(callbackInfo?.registeredAt).toBeGreaterThanOrEqual(beforeTime);
      expect(callbackInfo?.registeredAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('triggerCallback', () => {
    it('应该成功触发回调并调用resolve', async () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const result: ExecutedThreadResult = {
        threadContext: mockThreadContext,
        threadResult: mockThreadResult,
        executionTime: 100
      };

      callbackRegistry.registerCallback(threadId, resolve, reject);
      const success = callbackRegistry.triggerCallback(threadId, result);

      expect(success).toBe(true);
      expect(resolve).toHaveBeenCalledWith(result);
      expect(reject).not.toHaveBeenCalled();
      expect(callbackRegistry.hasCallback(threadId)).toBe(false);
    });

    it('应该通知所有事件监听器', async () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const result: ExecutedThreadResult = {
        threadContext: mockThreadContext,
        threadResult: mockThreadResult,
        executionTime: 100
      };

      callbackRegistry.registerCallback(threadId, resolve, reject);
      callbackRegistry.addEventListener(threadId, listener1);
      callbackRegistry.addEventListener(threadId, listener2);

      callbackRegistry.triggerCallback(threadId, result);

      expect(listener1).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DYNAMIC_THREAD_COMPLETED',
          threadId: 'thread-1'
        })
      );
      expect(listener2).toHaveBeenCalled();
    });

    it('应该处理监听器错误不影响其他监听器', async () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const listener1 = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const listener2 = jest.fn();
      const result: ExecutedThreadResult = {
        threadContext: mockThreadContext,
        threadResult: mockThreadResult,
        executionTime: 100
      };

      callbackRegistry.registerCallback(threadId, resolve, reject);
      callbackRegistry.addEventListener(threadId, listener1);
      callbackRegistry.addEventListener(threadId, listener2);

      callbackRegistry.triggerCallback(threadId, result);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(resolve).toHaveBeenCalled();
    });

    it('应该返回false当回调不存在时', () => {
      const result: ExecutedThreadResult = {
        threadContext: mockThreadContext,
        threadResult: mockThreadResult,
        executionTime: 100
      };

      const success = callbackRegistry.triggerCallback('non-existent', result);

      expect(success).toBe(false);
    });
  });

  describe('triggerErrorCallback', () => {
    it('应该成功触发错误回调并调用reject', async () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const error = new Error('Test error');

      callbackRegistry.registerCallback(threadId, resolve, reject);
      const success = callbackRegistry.triggerErrorCallback(threadId, error);

      expect(success).toBe(true);
      expect(reject).toHaveBeenCalledWith(error);
      expect(resolve).not.toHaveBeenCalled();
      expect(callbackRegistry.hasCallback(threadId)).toBe(false);
    });

    it('应该通知所有事件监听器错误事件', async () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const listener = jest.fn();
      const error = new Error('Test error');

      callbackRegistry.registerCallback(threadId, resolve, reject);
      callbackRegistry.addEventListener(threadId, listener);

      callbackRegistry.triggerErrorCallback(threadId, error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DYNAMIC_THREAD_FAILED',
          threadId: 'thread-1',
          data: { error }
        })
      );
    });
  });

  describe('addEventListener', () => {
    it('应该成功添加事件监听器', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const listener = jest.fn();

      callbackRegistry.registerCallback(threadId, resolve, reject);
      const success = callbackRegistry.addEventListener(threadId, listener);

      expect(success).toBe(true);
    });

    it('应该返回false当回调不存在时', () => {
      const listener = jest.fn();
      const success = callbackRegistry.addEventListener('non-existent', listener);

      expect(success).toBe(false);
    });

    it('应该支持添加多个监听器', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      callbackRegistry.registerCallback(threadId, resolve, reject);
      callbackRegistry.addEventListener(threadId, listener1);
      callbackRegistry.addEventListener(threadId, listener2);
      callbackRegistry.addEventListener(threadId, listener3);

      const callbackInfo = callbackRegistry.getCallback(threadId);
      expect(callbackInfo?.eventListeners).toHaveLength(3);
    });
  });

  describe('removeEventListener', () => {
    it('应该成功移除事件监听器', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const listener = jest.fn();

      callbackRegistry.registerCallback(threadId, resolve, reject);
      callbackRegistry.addEventListener(threadId, listener);
      const success = callbackRegistry.removeEventListener(threadId, listener);

      expect(success).toBe(true);
      const callbackInfo = callbackRegistry.getCallback(threadId);
      expect(callbackInfo?.eventListeners).toHaveLength(0);
    });

    it('应该返回false当监听器不存在时', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';
      const listener = jest.fn();

      callbackRegistry.registerCallback(threadId, resolve, reject);
      const success = callbackRegistry.removeEventListener(threadId, listener);

      expect(success).toBe(false);
    });
  });

  describe('hasCallback', () => {
    it('应该返回true当回调存在时', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';

      callbackRegistry.registerCallback(threadId, resolve, reject);

      expect(callbackRegistry.hasCallback(threadId)).toBe(true);
    });

    it('应该返回false当回调不存在时', () => {
      expect(callbackRegistry.hasCallback('non-existent')).toBe(false);
    });
  });

  describe('getCallback', () => {
    it('应该返回回调信息', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const threadId = 'thread-1';

      callbackRegistry.registerCallback(threadId, resolve, reject);
      const callbackInfo = callbackRegistry.getCallback(threadId);

      expect(callbackInfo).toBeDefined();
      expect(callbackInfo?.threadId).toBe(threadId);
      expect(callbackInfo?.resolve).toBe(resolve);
      expect(callbackInfo?.reject).toBe(reject);
    });

    it('应该返回undefined当回调不存在时', () => {
      const callbackInfo = callbackRegistry.getCallback('non-existent');

      expect(callbackInfo).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('应该清理所有回调并调用reject', () => {
      const resolve1 = jest.fn();
      const reject1 = jest.fn();
      const resolve2 = jest.fn();
      const reject2 = jest.fn();

      callbackRegistry.registerCallback('thread-1', resolve1, reject1);
      callbackRegistry.registerCallback('thread-2', resolve2, reject2);

      callbackRegistry.cleanup();

      expect(reject1).toHaveBeenCalled();
      expect(reject2).toHaveBeenCalled();
      expect(callbackRegistry.size()).toBe(0);
    });

    it('应该处理清理时的错误', () => {
      const resolve = jest.fn();
      const reject = jest.fn().mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      callbackRegistry.registerCallback('thread-1', resolve, reject);

      // 不应该抛出错误
      expect(() => callbackRegistry.cleanup()).not.toThrow();
      expect(callbackRegistry.size()).toBe(0);
    });
  });

  describe('cleanupCallback', () => {
    it('应该清理指定线程的回调', () => {
      const resolve1 = jest.fn();
      const reject1 = jest.fn();
      const resolve2 = jest.fn();
      const reject2 = jest.fn();

      callbackRegistry.registerCallback('thread-1', resolve1, reject1);
      callbackRegistry.registerCallback('thread-2', resolve2, reject2);

      const success = callbackRegistry.cleanupCallback('thread-1');

      expect(success).toBe(true);
      expect(reject1).toHaveBeenCalled();
      expect(reject2).not.toHaveBeenCalled();
      expect(callbackRegistry.hasCallback('thread-1')).toBe(false);
      expect(callbackRegistry.hasCallback('thread-2')).toBe(true);
    });

    it('应该返回false当回调不存在时', () => {
      const success = callbackRegistry.cleanupCallback('non-existent');

      expect(success).toBe(false);
    });
  });

  describe('size', () => {
    it('应该返回回调数量', () => {
      expect(callbackRegistry.size()).toBe(0);

      callbackRegistry.registerCallback('thread-1', jest.fn(), jest.fn());
      expect(callbackRegistry.size()).toBe(1);

      callbackRegistry.registerCallback('thread-2', jest.fn(), jest.fn());
      expect(callbackRegistry.size()).toBe(2);
    });
  });

  describe('getThreadIds', () => {
    it('应该返回所有线程ID', () => {
      callbackRegistry.registerCallback('thread-1', jest.fn(), jest.fn());
      callbackRegistry.registerCallback('thread-2', jest.fn(), jest.fn());
      callbackRegistry.registerCallback('thread-3', jest.fn(), jest.fn());

      const threadIds = callbackRegistry.getThreadIds();

      expect(threadIds).toHaveLength(3);
      expect(threadIds).toContain('thread-1');
      expect(threadIds).toContain('thread-2');
      expect(threadIds).toContain('thread-3');
    });

    it('应该返回空数组当没有回调时', () => {
      const threadIds = callbackRegistry.getThreadIds();

      expect(threadIds).toEqual([]);
    });
  });
});