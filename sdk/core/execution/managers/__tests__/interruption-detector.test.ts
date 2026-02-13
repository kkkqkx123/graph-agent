import { InterruptionDetectorImpl } from '../interruption-detector';
import { InterruptionManager } from '../interruption-manager';
import type { ThreadRegistry } from '../../../services/thread-registry';

describe('InterruptionDetector', () => {
  let interruptionDetector: InterruptionDetectorImpl;
  let mockThreadRegistry: jest.Mocked<ThreadRegistry>;
  let mockInterruptionManager: InterruptionManager;
  const threadId = 'thread-123';
  const nodeId = 'node-456';

  beforeEach(() => {
    // 创建 mock ThreadRegistry
    mockThreadRegistry = {
      get: jest.fn(),
      register: jest.fn(),
      unregister: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<ThreadRegistry>;

    // 创建真实的 InterruptionManager 实例
    mockInterruptionManager = new InterruptionManager(threadId, nodeId);

    // 创建 mock threadContext
    const mockThreadContext = {
      interruptionManager: mockInterruptionManager
    };

    // 设置 mock 返回值
    mockThreadRegistry.get.mockReturnValue(mockThreadContext as any);

    // 创建 InterruptionDetector 实例
    interruptionDetector = new InterruptionDetectorImpl(mockThreadRegistry);
  });

  describe('shouldInterrupt', () => {
    it('should return false when threadContext does not exist', () => {
      mockThreadRegistry.get.mockReturnValue(null);
      
      const result = interruptionDetector.shouldInterrupt(threadId);
      
      expect(result).toBe(false);
    });

    it('should return false when interruptionManager does not exist', () => {
      mockThreadRegistry.get.mockReturnValue({} as any);
      
      const result = interruptionDetector.shouldInterrupt(threadId);
      
      expect(result).toBe(false);
    });

    it('should return false when no interruption', () => {
      const result = interruptionDetector.shouldInterrupt(threadId);
      
      expect(result).toBe(false);
    });

    it('should return true when paused', () => {
      mockInterruptionManager.requestPause();
      
      const result = interruptionDetector.shouldInterrupt(threadId);
      
      expect(result).toBe(true);
    });

    it('should return true when stopped', () => {
      mockInterruptionManager.requestStop();
      
      const result = interruptionDetector.shouldInterrupt(threadId);
      
      expect(result).toBe(true);
    });

    it('should return false after resume', () => {
      mockInterruptionManager.requestPause();
      mockInterruptionManager.resume();
      
      const result = interruptionDetector.shouldInterrupt(threadId);
      
      expect(result).toBe(false);
    });
  });

  describe('getInterruptionType', () => {
    it('should return null when threadContext does not exist', () => {
      mockThreadRegistry.get.mockReturnValue(null);
      
      const result = interruptionDetector.getInterruptionType(threadId);
      
      expect(result).toBe(null);
    });

    it('should return null when interruptionManager does not exist', () => {
      mockThreadRegistry.get.mockReturnValue({} as any);
      
      const result = interruptionDetector.getInterruptionType(threadId);
      
      expect(result).toBe(null);
    });

    it('should return null when no interruption', () => {
      const result = interruptionDetector.getInterruptionType(threadId);
      
      expect(result).toBe(null);
    });

    it('should return PAUSE when paused', () => {
      mockInterruptionManager.requestPause();
      
      const result = interruptionDetector.getInterruptionType(threadId);
      
      expect(result).toBe('PAUSE');
    });

    it('should return STOP when stopped', () => {
      mockInterruptionManager.requestStop();
      
      const result = interruptionDetector.getInterruptionType(threadId);
      
      expect(result).toBe('STOP');
    });

    it('should return null after resume', () => {
      mockInterruptionManager.requestPause();
      mockInterruptionManager.resume();
      
      const result = interruptionDetector.getInterruptionType(threadId);
      
      expect(result).toBe(null);
    });
  });

  describe('getAbortSignal', () => {
    it('should return a new AbortSignal when threadContext does not exist', () => {
      mockThreadRegistry.get.mockReturnValue(null);
      
      const signal = interruptionDetector.getAbortSignal(threadId);
      
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('should return a new AbortSignal when interruptionManager does not exist', () => {
      mockThreadRegistry.get.mockReturnValue({} as any);
      
      const signal = interruptionDetector.getAbortSignal(threadId);
      
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('should return non-aborted signal when no interruption', () => {
      const signal = interruptionDetector.getAbortSignal(threadId);
      
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('should return aborted signal when paused', () => {
      mockInterruptionManager.requestPause();
      
      const signal = interruptionDetector.getAbortSignal(threadId);
      
      expect(signal.aborted).toBe(true);
    });

    it('should return aborted signal when stopped', () => {
      mockInterruptionManager.requestStop();
      
      const signal = interruptionDetector.getAbortSignal(threadId);
      
      expect(signal.aborted).toBe(true);
    });

    it('should return new non-aborted signal after resume', () => {
      mockInterruptionManager.requestPause();
      mockInterruptionManager.resume();
      
      const signal = interruptionDetector.getAbortSignal(threadId);
      
      expect(signal.aborted).toBe(false);
    });

    it('should return the same signal from interruptionManager', () => {
      const signal1 = interruptionDetector.getAbortSignal(threadId);
      const signal2 = interruptionDetector.getAbortSignal(threadId);
      
      expect(signal1).toBe(signal2);
    });
  });

  describe('isAborted', () => {
    it('should return false when threadContext does not exist', () => {
      mockThreadRegistry.get.mockReturnValue(null);
      
      const result = interruptionDetector.isAborted(threadId);
      
      expect(result).toBe(false);
    });

    it('should return false when interruptionManager does not exist', () => {
      mockThreadRegistry.get.mockReturnValue({} as any);
      
      const result = interruptionDetector.isAborted(threadId);
      
      expect(result).toBe(false);
    });

    it('should return false when no interruption', () => {
      const result = interruptionDetector.isAborted(threadId);
      
      expect(result).toBe(false);
    });

    it('should return true when paused', () => {
      mockInterruptionManager.requestPause();
      
      const result = interruptionDetector.isAborted(threadId);
      
      expect(result).toBe(true);
    });

    it('should return true when stopped', () => {
      mockInterruptionManager.requestStop();
      
      const result = interruptionDetector.isAborted(threadId);
      
      expect(result).toBe(true);
    });

    it('should return false after resume', () => {
      mockInterruptionManager.requestPause();
      mockInterruptionManager.resume();
      
      const result = interruptionDetector.isAborted(threadId);
      
      expect(result).toBe(false);
    });
  });

  describe('multiple threads', () => {
    let threadId2: string;
    let interruptionManager2: InterruptionManager;

    beforeEach(() => {
      threadId2 = 'thread-456';
      interruptionManager2 = new InterruptionManager(threadId2, 'node-789');
      
      const mockThreadContext2 = {
        interruptionManager: interruptionManager2
      };
      
      mockThreadRegistry.get.mockImplementation((id: string) => {
        if (id === threadId) {
          return { interruptionManager: mockInterruptionManager } as any;
        } else if (id === threadId2) {
          return mockThreadContext2 as any;
        }
        return undefined;
      });
    });

    it('should handle different threads independently', () => {
      // 暂停第一个线程
      mockInterruptionManager.requestPause();
      
      // 停止第二个线程
      interruptionManager2.requestStop();
      
      // 检查第一个线程
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('PAUSE');
      
      // 检查第二个线程
      expect(interruptionDetector.shouldInterrupt(threadId2)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId2)).toBe('STOP');
    });

    it('should not affect other threads when one thread resumes', () => {
      // 暂停两个线程
      mockInterruptionManager.requestPause();
      interruptionManager2.requestPause();
      
      // 恢复第一个线程
      mockInterruptionManager.resume();
      
      // 检查第一个线程
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      
      // 检查第二个线程应该仍然暂停
      expect(interruptionDetector.shouldInterrupt(threadId2)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId2)).toBe('PAUSE');
    });
  });

  describe('integration with InterruptionManager', () => {
    it('should correctly reflect all state changes', () => {
      // 初始状态
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe(null);
      expect(interruptionDetector.isAborted(threadId)).toBe(false);
      
      // 暂停
      mockInterruptionManager.requestPause();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('PAUSE');
      expect(interruptionDetector.isAborted(threadId)).toBe(true);
      
      // 恢复
      mockInterruptionManager.resume();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe(null);
      expect(interruptionDetector.isAborted(threadId)).toBe(false);
      
      // 停止
      mockInterruptionManager.requestStop();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('STOP');
      expect(interruptionDetector.isAborted(threadId)).toBe(true);
      
      // 再次恢复
      mockInterruptionManager.resume();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      expect(interruptionDetector.getInterruptionType(threadId)).toBe(null);
      expect(interruptionDetector.isAborted(threadId)).toBe(false);
    });

    it('should get correct AbortSignal from interruptionManager', () => {
      const signal1 = interruptionDetector.getAbortSignal(threadId);
      expect(signal1.aborted).toBe(false);
      
      mockInterruptionManager.requestPause();
      
      const signal2 = interruptionDetector.getAbortSignal(threadId);
      expect(signal2.aborted).toBe(true);
      expect(signal2).toBe(signal1); // 应该是同一个 signal
      
      mockInterruptionManager.resume();
      
      const signal3 = interruptionDetector.getAbortSignal(threadId);
      expect(signal3.aborted).toBe(false);
      expect(signal3).not.toBe(signal1); // 应该是新的 signal
    });
  });

  describe('edge cases', () => {
    it('should handle empty threadId', () => {
      mockThreadRegistry.get.mockReturnValue(null);
      
      expect(interruptionDetector.shouldInterrupt('')).toBe(false);
      expect(interruptionDetector.getInterruptionType('')).toBe(null);
      expect(interruptionDetector.isAborted('')).toBe(false);
    });

    it('should handle special characters in threadId', () => {
      const specialThreadId = 'thread-with-special-chars-123_!@#$%';
      const specialInterruptionManager = new InterruptionManager(specialThreadId, nodeId);
      
      mockThreadRegistry.get.mockReturnValue({
        interruptionManager: specialInterruptionManager
      } as any);
      
      specialInterruptionManager.requestPause();
      
      expect(interruptionDetector.shouldInterrupt(specialThreadId)).toBe(true);
      expect(interruptionDetector.getInterruptionType(specialThreadId)).toBe('PAUSE');
    });

    it('should handle rapid state changes', () => {
      // 快速切换状态
      mockInterruptionManager.requestPause();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
      
      mockInterruptionManager.requestStop();
      expect(interruptionDetector.getInterruptionType(threadId)).toBe('STOP');
      
      mockInterruptionManager.resume();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(false);
      
      mockInterruptionManager.requestPause();
      expect(interruptionDetector.shouldInterrupt(threadId)).toBe(true);
    });
  });
});