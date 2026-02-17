import { describe, it, expect, vi } from 'vitest';
import {
  getThreadInterruptedException,
  isThreadInterruption,
  isThreadInterruptedException,
  isInterruptionError,
  extractThreadInterruption,
  getInterruptionType,
  getThreadId,
  getNodeId,
  createThreadInterruptedException,
  normalizeInterruptionError,
  throwIfAborted,
  withThreadInterruption,
  withThreadInterruptionArg,
  getInterruptionDescription,
} from '../thread-interruption-utils';
import { ThreadInterruptedException } from '@modular-agent/types';

describe('thread-interruption-utils', () => {
  describe('getThreadInterruptedException', () => {
    it('should return ThreadInterruptedException when signal reason is an instance of ThreadInterruptedException', () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      const result = getThreadInterruptedException(controller.signal);
      expect(result).toBe(threadInterrupt);
    });

    it('should return undefined when signal reason is not a ThreadInterruptedException', () => {
      const controller = new AbortController();
      controller.abort(new Error('Regular error'));
      
      const result = getThreadInterruptedException(controller.signal);
      expect(result).toBeUndefined();
    });

    it('should return undefined when signal is not aborted', () => {
      const controller = new AbortController();
      
      const result = getThreadInterruptedException(controller.signal);
      expect(result).toBeUndefined();
    });
  });

  describe('isThreadInterruption', () => {
    it('should return true when signal has ThreadInterruptedException reason', () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      expect(isThreadInterruption(controller.signal)).toBe(true);
    });

    it('should return false when signal does not have ThreadInterruptedException reason', () => {
      const controller = new AbortController();
      controller.abort(new Error('Regular error'));
      
      expect(isThreadInterruption(controller.signal)).toBe(false);
    });

    it('should return false when signal is not aborted', () => {
      const controller = new AbortController();
      
      expect(isThreadInterruption(controller.signal)).toBe(false);
    });
  });

  describe('isThreadInterruptedException', () => {
    it('should return true when error is ThreadInterruptedException', () => {
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      
      expect(isThreadInterruptedException(threadInterrupt)).toBe(true);
    });

    it('should return false when error is not ThreadInterruptedException', () => {
      const error = new Error('Regular error');
      
      expect(isThreadInterruptedException(error)).toBe(false);
    });

    it('should return false when error is null or undefined', () => {
      expect(isThreadInterruptedException(null)).toBe(false);
      expect(isThreadInterruptedException(undefined)).toBe(false);
    });
  });

  describe('isInterruptionError', () => {
    it('should return true for ThreadInterruptedException', () => {
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      
      expect(isInterruptionError(threadInterrupt)).toBe(true);
    });

    it('should return true for AbortError', () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      expect(isInterruptionError(abortError)).toBe(true);
    });

    it('should return false for regular error', () => {
      const error = new Error('Regular error');
      
      expect(isInterruptionError(error)).toBe(false);
    });
  });

  describe('extractThreadInterruption', () => {
    it('should return ThreadInterruptedException when error is ThreadInterruptedException', () => {
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      const result = extractThreadInterruption(threadInterrupt);
      
      expect(result).toBe(threadInterrupt);
    });

    it('should return undefined for regular error', () => {
      const error = new Error('Regular error');
      const result = extractThreadInterruption(error);
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for AbortError', () => {
      const abortError = new Error('Operation aborted');
      abortError.name = 'AbortError';
      const result = extractThreadInterruption(abortError);
      
      expect(result).toBeUndefined();
    });
  });

  describe('getInterruptionType', () => {
    it('should return interruption type from ThreadInterruptedException', () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'PAUSE', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      expect(getInterruptionType(controller.signal)).toBe('PAUSE');
    });

    it('should return null when signal does not have ThreadInterruptedException', () => {
      const controller = new AbortController();
      controller.abort(new Error('Regular error'));
      
      expect(getInterruptionType(controller.signal)).toBeNull();
    });

    it('should return null when signal is not aborted', () => {
      const controller = new AbortController();
      
      expect(getInterruptionType(controller.signal)).toBeNull();
    });
  });

  describe('getThreadId', () => {
    it('should return thread ID from ThreadInterruptedException', () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      expect(getThreadId(controller.signal)).toBe('thread-1');
    });

    it('should return undefined when signal does not have ThreadInterruptedException', () => {
      const controller = new AbortController();
      controller.abort(new Error('Regular error'));
      
      expect(getThreadId(controller.signal)).toBeUndefined();
    });
  });

  describe('getNodeId', () => {
    it('should return node ID from ThreadInterruptedException', () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      expect(getNodeId(controller.signal)).toBe('node-1');
    });

    it('should return undefined when signal does not have ThreadInterruptedException', () => {
      const controller = new AbortController();
      controller.abort(new Error('Regular error'));
      
      expect(getNodeId(controller.signal)).toBeUndefined();
    });
  });

  describe('createThreadInterruptedException', () => {
    it('should create ThreadInterruptedException with correct properties', () => {
      const exception = createThreadInterruptedException('PAUSE', 'thread-1', 'node-1');
      
      expect(exception).toBeInstanceOf(ThreadInterruptedException);
      expect(exception.message).toBe('Thread pause');
      expect(exception.interruptionType).toBe('PAUSE');
      expect(exception.threadId).toBe('thread-1');
      expect(exception.nodeId).toBe('node-1');
    });

    it('should create ThreadInterruptedException with STOP type', () => {
      const exception = createThreadInterruptedException('STOP', 'thread-2', 'node-2');
      
      expect(exception.interruptionType).toBe('STOP');
      expect(exception.message).toBe('Thread stop');
    });
  });

  describe('normalizeInterruptionError', () => {
    it('should return ThreadInterruptedException when error is already ThreadInterruptedException', () => {
      const originalError = new ThreadInterruptedException('Test', 'STOP', 'thread-1', 'node-1');
      const result = normalizeInterruptionError(originalError);
      
      expect(result).toBe(originalError);
    });

    it('should convert AbortError to ThreadInterruptedException when threadId and nodeId are provided', () => {
      const abortError = new Error('Operation aborted');
      abortError.name = 'AbortError';
      const result = normalizeInterruptionError(abortError, 'thread-1', 'node-1');
      
      expect(result).toBeInstanceOf(ThreadInterruptedException);
      expect(result.interruptionType).toBe('STOP'); // Default conversion
      expect(result.threadId).toBe('thread-1');
      expect(result.nodeId).toBe('node-1');
    });

    it('should return undefined when error is AbortError but threadId or nodeId is not provided', () => {
      const abortError = new Error('Operation aborted');
      abortError.name = 'AbortError';
      const result = normalizeInterruptionError(abortError);
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for regular error', () => {
      const error = new Error('Regular error');
      const result = normalizeInterruptionError(error);
      
      expect(result).toBeUndefined();
    });
  });

  describe('throwIfAborted', () => {
    it('should not throw when signal is not aborted', () => {
      const controller = new AbortController();
      
      expect(() => throwIfAborted(controller.signal)).not.toThrow();
    });

    it('should throw ThreadInterruptedException when signal has ThreadInterruptedException reason', () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      expect(() => throwIfAborted(controller.signal)).toThrow(threadInterrupt);
    });

    it('should throw general error when signal is aborted with other reason', () => {
      const controller = new AbortController();
      controller.abort(new Error('General abort'));
      
      expect(() => throwIfAborted(controller.signal)).toThrow('General abort');
    });

    it('should throw generic error when signal is aborted without reason', () => {
      const controller = new AbortController();
      controller.abort();
      
      expect(() => throwIfAborted(controller.signal)).toThrow('This operation was aborted');
    });
  });

  describe('withThreadInterruption', () => {
    it('should execute function when signal is not aborted', async () => {
      const controller = new AbortController();
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await withThreadInterruption(mockFn, controller.signal);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw ThreadInterruptedException when signal has ThreadInterruptedException reason', async () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      const mockFn = vi.fn().mockResolvedValue('success');
      
      await expect(withThreadInterruption(mockFn, controller.signal)).rejects.toThrow(threadInterrupt);
    });
  });

  describe('withThreadInterruptionArg', () => {
    it('should execute function with signal when signal is not aborted', async () => {
      const controller = new AbortController();
      const mockFn = vi.fn().mockImplementation((signal) => Promise.resolve(signal));
      
      const result = await withThreadInterruptionArg(mockFn, controller.signal);
      
      expect(result).toBe(controller.signal);
      expect(mockFn).toHaveBeenCalledWith(controller.signal);
    });

    it('should throw ThreadInterruptedException when signal has ThreadInterruptedException reason', async () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'STOP', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      const mockFn = vi.fn().mockImplementation((signal) => Promise.resolve(signal));
      
      await expect(withThreadInterruptionArg(mockFn, controller.signal)).rejects.toThrow(threadInterrupt);
    });
  });

  describe('getInterruptionDescription', () => {
    it('should return description from ThreadInterruptedException', () => {
      const controller = new AbortController();
      const threadInterrupt = new ThreadInterruptedException('Test interruption', 'PAUSE', 'thread-1', 'node-1');
      controller.abort(threadInterrupt);
      
      const description = getInterruptionDescription(controller.signal);
      
      expect(description).toBe('Thread pause at node: node-1');
    });

    it('should return generic description when signal does not have ThreadInterruptedException', () => {
      const controller = new AbortController();
      controller.abort(new Error('Regular error'));

      const description = getInterruptionDescription(controller.signal);

      // 使用统一的错误消息 'This operation was aborted'
      expect(description).toBe('This operation was aborted');
    });
  });
});