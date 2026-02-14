/**
 * 中断功能简化集成测试
 * 
 * 测试目标：
 * 1. 验证暂停（PAUSE）场景的调用链
 * 2. 验证停止（STOP）场景的调用链
 * 3. 验证恢复（RESUME）场景的调用链
 * 4. 验证深度中断（AbortSignal）的调用链
 * 5. 验证异常传播的调用链
 * 
 * 测试覆盖的调用链：
 * - ThreadContext → InterruptionManager
 * - InterruptionDetector → ThreadContext
 * - AbortSignal 事件触发
 */

import { InterruptionManager } from '../managers/interruption-manager';
import { InterruptionDetectorImpl } from '../managers/interruption-detector';
import { ThreadInterruptedException } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';
import type { ThreadRegistry } from '../../services/thread-registry';

// Mock ThreadRegistry
class MockThreadRegistry {
  private contexts = new Map<string, any>();

  register(threadId: string, context: any): void {
    this.contexts.set(threadId, context);
  }

  get(threadId: string): any {
    return this.contexts.get(threadId) || null;
  }

  has(threadId: string): boolean {
    return this.contexts.has(threadId);
  }

  unregister(threadId: string): void {
    this.contexts.delete(threadId);
  }

  getAll(): any[] {
    return Array.from(this.contexts.values());
  }

  clear(): void {
    this.contexts.clear();
  }
}

// Mock ThreadContext
class MockThreadContext {
  interruptionManager: InterruptionManager;
  thread: any;

  constructor(threadId: string, nodeId: string) {
    this.interruptionManager = new InterruptionManager(threadId, nodeId);
    this.thread = {
      id: threadId,
      status: ThreadStatus.CREATED,
      shouldPause: false,
      shouldStop: false
    };
  }

  setShouldPause(shouldPause: boolean): void {
    if (shouldPause) {
      this.interruptionManager.requestPause();
    } else {
      if (this.interruptionManager.getInterruptionType() === 'PAUSE') {
        this.interruptionManager.resume();
      }
    }
  }

  setShouldStop(shouldStop: boolean): void {
    if (shouldStop) {
      this.interruptionManager.requestStop();
    }
  }

  getShouldPause(): boolean {
    return this.interruptionManager.getInterruptionType() === 'PAUSE';
  }

  getShouldStop(): boolean {
    return this.interruptionManager.getInterruptionType() === 'STOP';
  }

  getAbortSignal(): AbortSignal {
    return this.interruptionManager.getAbortSignal();
  }

  resetInterrupt(): void {
    this.interruptionManager.resume();
  }

  getThreadId(): string {
    return this.thread.id;
  }

  getStatus(): string {
    return this.thread.status;
  }

  setStatus(status: string): void {
    this.thread.status = status;
  }
}

describe('中断功能简化集成测试', () => {
  let threadRegistry: MockThreadRegistry;
  let interruptionDetector: InterruptionDetectorImpl;
  let threadContext: MockThreadContext;
  const threadId = 'test-thread-123';
  const nodeId = 'test-node-456';

  beforeEach(() => {
    threadRegistry = new MockThreadRegistry();
    interruptionDetector = new InterruptionDetectorImpl(threadRegistry as any);
    threadContext = new MockThreadContext(threadId, nodeId);
    threadRegistry.register(threadId, threadContext);
  });

  afterEach(() => {
    threadRegistry.clear();
  });

  describe('暂停（PAUSE）场景调用链', () => {
    it('应该验证完整的暂停调用链：ThreadContext → InterruptionManager → AbortSignal', () => {
      // 1. 触发暂停
      threadContext.setShouldPause(true);

      // 2. 验证 InterruptionManager 状态
      expect(threadContext.interruptionManager.shouldInterrupt()).toBe(true);
      expect(threadContext.interruptionManager.getInterruptionType()).toBe('PAUSE');
      expect(threadContext.interruptionManager.isAborted()).toBe(true);

      // 3. 验证 AbortSignal
      const abortSignal = threadContext.getAbortSignal();
      expect(abortSignal.aborted).toBe(true);
      expect(abortSignal.reason).toBeInstanceOf(ThreadInterruptedException);
      expect((abortSignal.reason as ThreadInterruptedException).interruptionType).toBe('PAUSE');

      // 4. 验证 InterruptionDetector 能检测到中断
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('PAUSE');
      expect(interruptionDetector.isAborted(threadId)).toBe(true);
    });

    it('应该验证暂停后 AbortSignal 事件被触发', (done) => {
      const abortSignal = threadContext.getAbortSignal();

      // 监听 abort 事件
      abortSignal.addEventListener('abort', (event) => {
        expect(abortSignal.aborted).toBe(true);
        expect(abortSignal.reason).toBeInstanceOf(ThreadInterruptedException);
        expect((abortSignal.reason as ThreadInterruptedException).interruptionType).toBe('PAUSE');
        done();
      });

      // 触发暂停
      threadContext.setShouldPause(true);
    });

    it('应该验证暂停后 ThreadContext 状态正确', () => {
      threadContext.setShouldPause(true);
      threadContext.setStatus(ThreadStatus.PAUSED);

      expect(threadContext.getShouldPause()).toBe(true);
      expect(threadContext.getStatus()).toBe(ThreadStatus.PAUSED);
    });
  });

  describe('停止（STOP）场景调用链', () => {
    it('应该验证完整的停止调用链：ThreadContext → InterruptionManager → AbortSignal', () => {
      // 1. 触发停止
      threadContext.setShouldStop(true);

      // 2. 验证 InterruptionManager 状态
      expect(threadContext.interruptionManager.shouldInterrupt()).toBe(true);
      expect(threadContext.interruptionManager.getInterruptionType()).toBe('STOP');
      expect(threadContext.interruptionManager.isAborted()).toBe(true);

      // 3. 验证 AbortSignal
      const abortSignal = threadContext.getAbortSignal();
      expect(abortSignal.aborted).toBe(true);
      expect(abortSignal.reason).toBeInstanceOf(ThreadInterruptedException);
      expect((abortSignal.reason as ThreadInterruptedException).interruptionType).toBe('STOP');

      // 4. 验证 InterruptionDetector 能检测到中断
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('STOP');
      expect(interruptionDetector.isAborted(threadId)).toBe(true);
    });

    it('应该验证停止后 AbortSignal 事件被触发', (done) => {
      const abortSignal = threadContext.getAbortSignal();

      abortSignal.addEventListener('abort', (event) => {
        expect(abortSignal.aborted).toBe(true);
        expect(abortSignal.reason).toBeInstanceOf(ThreadInterruptedException);
        expect((abortSignal.reason as ThreadInterruptedException).interruptionType).toBe('STOP');
        done();
      });

      threadContext.setShouldStop(true);
    });

    it('应该验证停止后 ThreadContext 状态正确', () => {
      threadContext.setShouldStop(true);
      threadContext.setStatus(ThreadStatus.CANCELLED);

      expect(threadContext.getShouldStop()).toBe(true);
      expect(threadContext.getStatus()).toBe(ThreadStatus.CANCELLED);
    });
  });

  describe('恢复（RESUME）场景调用链', () => {
    it('应该验证完整的恢复调用链：ThreadContext → InterruptionManager.resume()', () => {
      // 1. 先暂停
      threadContext.setShouldPause(true);
      expect(threadContext.getShouldPause()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);

      // 2. 恢复
      threadContext.resetInterrupt();

      // 3. 验证恢复后的状态
      expect(threadContext.getShouldPause()).toBe(false);
      expect(threadContext.getAbortSignal().aborted).toBe(false);
      expect(threadContext.getAbortSignal().reason).toBeUndefined();
      expect(threadContext.interruptionManager.shouldInterrupt()).toBe(false);
      expect(threadContext.interruptionManager.getInterruptionType()).toBe(null);

      // 4. 验证 InterruptionDetector 检测结果
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe(null);
      expect(interruptionDetector.isAborted(threadId)).toBe(false);
    });

    it('应该验证从停止状态恢复', () => {
      // 1. 先停止
      threadContext.setShouldStop(true);
      expect(threadContext.getShouldStop()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);

      // 2. 恢复
      threadContext.resetInterrupt();

      // 3. 验证恢复后的状态
      expect(threadContext.getShouldStop()).toBe(false);
      expect(threadContext.getAbortSignal().aborted).toBe(false);
    });

    it('应该验证多次暂停和恢复的状态转换', () => {
      // 第一次暂停
      threadContext.setShouldPause(true);
      expect(threadContext.getShouldPause()).toBe(true);

      // 第一次恢复
      threadContext.resetInterrupt();
      expect(threadContext.getShouldPause()).toBe(false);

      // 第二次暂停
      threadContext.setShouldPause(true);
      expect(threadContext.getShouldPause()).toBe(true);

      // 第二次恢复
      threadContext.resetInterrupt();
      expect(threadContext.getShouldPause()).toBe(false);

      // 停止
      threadContext.setShouldStop(true);
      expect(threadContext.getShouldStop()).toBe(true);

      // 恢复
      threadContext.resetInterrupt();
      expect(threadContext.getShouldStop()).toBe(false);
    });
  });

  describe('深度中断（AbortSignal）调用链', () => {
    it('应该验证 AbortSignal 在异步操作中的深度中断', async () => {
      // 1. 触发暂停
      threadContext.setShouldPause(true);
      const abortSignal = threadContext.getAbortSignal();

      // 2. 模拟异步操作检查 AbortSignal
      const asyncOperation = new Promise((resolve, reject) => {
        if (abortSignal.aborted) {
          const error = new Error('Operation aborted');
          (error as any).name = 'AbortError';
          reject(error);
        } else {
          resolve('Operation completed');
        }
      });

      // 3. 验证异步操作被中断
      await expect(asyncOperation).rejects.toThrow('Operation aborted');
      expect(abortSignal.aborted).toBe(true);
    });

    it('应该验证 AbortSignal 事件监听器被正确触发', (done) => {
      const abortSignal = threadContext.getAbortSignal();
      let eventTriggered = false;

      abortSignal.addEventListener('abort', (event) => {
        eventTriggered = true;
        expect(abortSignal.aborted).toBe(true);
        expect(abortSignal.reason).toBeInstanceOf(ThreadInterruptedException);
        done();
      });

      threadContext.setShouldPause(true);

      // 验证事件被触发
      setTimeout(() => {
        expect(eventTriggered).toBe(true);
      }, 10);
    });

    it('应该验证恢复后新的 AbortSignal 不会被触发', (done) => {
      // 1. 暂停
      threadContext.setShouldPause(true);
      threadContext.resetInterrupt();

      // 2. 获取新的 AbortSignal
      const newAbortSignal = threadContext.getAbortSignal();
      let eventTriggered = false;

      newAbortSignal.addEventListener('abort', () => {
        eventTriggered = true;
      });

      // 3. 等待一段时间，验证事件没有被触发
      setTimeout(() => {
        expect(eventTriggered).toBe(false);
        expect(newAbortSignal.aborted).toBe(false);
        done();
      }, 50);
    });
  });

  describe('异常传播调用链', () => {
    it('应该验证 ThreadInterruptedException 包含正确的信息', () => {
      threadContext.setShouldPause(true);

      const abortReason = threadContext.getAbortSignal().reason as ThreadInterruptedException;

      expect(abortReason).toBeInstanceOf(ThreadInterruptedException);
      expect(abortReason.interruptionType).toBe('PAUSE');
      expect(abortReason.threadId).toBe(threadId);
      expect(abortReason.nodeId).toBe(nodeId);
      expect(abortReason.message).toBe('Thread paused');
    });

    it('应该验证停止异常包含正确的信息', () => {
      threadContext.setShouldStop(true);

      const abortReason = threadContext.getAbortSignal().reason as ThreadInterruptedException;

      expect(abortReason).toBeInstanceOf(ThreadInterruptedException);
      expect(abortReason.interruptionType).toBe('STOP');
      expect(abortReason.threadId).toBe(threadId);
      expect(abortReason.nodeId).toBe(nodeId);
      expect(abortReason.message).toBe('Thread stopped');
    });

    it('应该验证状态转换时的异常信息更新', () => {
      // 暂停
      threadContext.setShouldPause(true);
      expect(threadContext.interruptionManager.getInterruptionType()).toBe('PAUSE');

      // 转换为停止
      threadContext.setShouldStop(true);
      expect(threadContext.interruptionManager.getInterruptionType()).toBe('STOP');

      // 恢复
      threadContext.resetInterrupt();
      expect(threadContext.interruptionManager.getInterruptionType()).toBe(null);
    });
  });

  describe('状态转换调用链', () => {
    it('应该验证从 RUNNING 到 PAUSED 的状态转换', () => {
      threadContext.setStatus(ThreadStatus.RUNNING);
      threadContext.setShouldPause(true);
      threadContext.setStatus(ThreadStatus.PAUSED);

      expect(threadContext.getStatus()).toBe(ThreadStatus.PAUSED);
      expect(threadContext.getShouldPause()).toBe(true);
    });

    it('应该验证从 RUNNING 到 CANCELLED 的状态转换', () => {
      threadContext.setStatus(ThreadStatus.RUNNING);
      threadContext.setShouldStop(true);
      threadContext.setStatus(ThreadStatus.CANCELLED);

      expect(threadContext.getStatus()).toBe(ThreadStatus.CANCELLED);
      expect(threadContext.getShouldStop()).toBe(true);
    });

    it('应该验证从 PAUSED 到 RUNNING 的状态转换', () => {
      threadContext.setStatus(ThreadStatus.PAUSED);
      threadContext.setShouldPause(true);

      threadContext.resetInterrupt();
      threadContext.setStatus(ThreadStatus.RUNNING);

      expect(threadContext.getStatus()).toBe(ThreadStatus.RUNNING);
      expect(threadContext.getShouldPause()).toBe(false);
    });
  });

  describe('多线程场景调用链', () => {
    it('应该验证不同线程的中断状态互不影响', () => {
      const threadId2 = 'test-thread-456';
      const nodeId2 = 'test-node-789';
      const threadContext2 = new MockThreadContext(threadId2, nodeId2);
      threadRegistry.register(threadId2, threadContext2);

      // 暂停第一个线程
      threadContext.setShouldPause(true);

      // 验证第一个线程已暂停
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('PAUSE');

      // 验证第二个线程未受影响
      expect(interruptionDetector.shouldInterrupt(threadId2)).toBe(false);
      expect(interruptionDetector.getInterruptionType(threadId2)).toBe(null);

      // 停止第二个线程
      threadContext2.setShouldStop(true);

      // 验证第二个线程已停止
      expect(interruptionDetector.shouldInterrupt(threadId2)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId2)).toBe('STOP');

      // 验证第一个线程状态未变
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('PAUSE');
    });

    it('应该验证 InterruptionDetector 正确处理多个线程', () => {
      const threadId2 = 'test-thread-456';
      const threadContext2 = new MockThreadContext(threadId2, 'node-2');
      threadRegistry.register(threadId2, threadContext2);

      // 暂停第一个线程
      threadContext.setShouldPause(true);
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.shouldInterrupt(threadId2)).toBe(false);

      // 暂停第二个线程
      threadContext2.setShouldPause(true);
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.shouldInterrupt(threadId2)).toBe(true);

      // 恢复第一个线程
      threadContext.resetInterrupt();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      expect(interruptionDetector.shouldInterrupt(threadId2)).toBe(true);
    });
  });

  describe('InterruptionDetector 集成测试', () => {
    it('应该验证 InterruptionDetector 正确获取 AbortSignal', () => {
      const signal1 = interruptionDetector.getAbortSignal(threadId);
      expect(signal1.aborted).toBe(false);

      threadContext.setShouldPause(true);

      const signal2 = interruptionDetector.getAbortSignal(threadId);
      expect(signal2.aborted).toBe(true);
      expect(signal2).toBe(signal1); // 应该是同一个 signal
    });

    it('应该验证 InterruptionDetector 处理不存在的线程', () => {
      const nonExistentThreadId = 'non-existent-thread';

      expect(interruptionDetector.shouldInterrupt(nonExistentThreadId)).toBe(false);
      expect(interruptionDetector.getInterruptionType(nonExistentThreadId)).toBe(null);
      expect(interruptionDetector.isAborted(nonExistentThreadId)).toBe(false);

      const signal = interruptionDetector.getAbortSignal(nonExistentThreadId);
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('应该验证 InterruptionDetector 与 InterruptionManager 的状态同步', () => {
      // 初始状态
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      expect(threadContext.interruptionManager.shouldInterrupt()).toBe(false);

      // 暂停
      threadContext.setShouldPause(true);
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(threadContext.interruptionManager.shouldInterrupt()).toBe(true);

      // 恢复
      threadContext.resetInterrupt();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      expect(threadContext.interruptionManager.shouldInterrupt()).toBe(false);

      // 停止
      threadContext.setShouldStop(true);
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(threadContext.interruptionManager.shouldInterrupt()).toBe(true);
    });
  });
});