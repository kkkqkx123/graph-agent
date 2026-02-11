/**
 * event-emitter.test.ts
 * EventEmitter的单元测试
 */

import * as eventEmitter from '../event-emitter';
import type { EventManager } from '../../../../services/event-manager';
import { EventType } from '@modular-agent/types/events';
import type { Event } from '@modular-agent/types/events';

jest.setTimeout(1000);

describe('EventEmitter', () => {
  const mockEvent: Event = {
    type: EventType.THREAD_STARTED,
    timestamp: 1234567890,
    workflowId: 'workflow-123',
    threadId: 'thread-123',
    input: { test: 'input' }
  };

  const mockEventManager = {
    emit: jest.fn(),
    waitFor: jest.fn()
  } as unknown as EventManager;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('safeEmit', () => {
    it('应该成功触发事件', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.safeEmit(mockEventManager, mockEvent);

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
      expect(mockEventManager.emit).toHaveBeenCalledTimes(1);
    });

    it('应该在eventManager为undefined时不抛出异常', async () => {
      await expect(eventEmitter.safeEmit(undefined, mockEvent)).resolves.toBeUndefined();
    });

    it('应该在emit失败时捕获错误并记录', async () => {
      const error = new Error('Emit failed');
      (mockEventManager.emit as jest.Mock).mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventEmitter.safeEmit(mockEventManager, mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to emit event ${mockEvent.type}:`,
        error
      );

      consoleSpy.mockRestore();
    });
  });

  describe('emit', () => {
    it('应该成功触发事件', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emit(mockEventManager, mockEvent);

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
    });

    it('应该在eventManager为undefined时抛出异常', async () => {
      await expect(eventEmitter.emit(undefined, mockEvent)).rejects.toThrow(
        'EventManager is not available'
      );
    });

    it('应该在emit失败时抛出异常', async () => {
      const error = new Error('Emit failed');
      (mockEventManager.emit as jest.Mock).mockRejectedValue(error);

      await expect(eventEmitter.emit(mockEventManager, mockEvent)).rejects.toThrow(
        'Emit failed'
      );
    });
  });

  describe('emitBatch', () => {
    it('应该按顺序触发多个事件', async () => {
      const nodeStartedEvent: Event = {
        type: EventType.NODE_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        nodeType: 'LLM'
      } as any;
      const events: Event[] = [mockEvent, nodeStartedEvent];
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emitBatch(mockEventManager, events);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(2);
      expect(mockEventManager.emit).toHaveBeenNthCalledWith(1, events[0]);
      expect(mockEventManager.emit).toHaveBeenNthCalledWith(2, events[1]);
    });

    it('应该在其中一个事件失败时继续处理其他事件', async () => {
      const nodeStartedEvent: Event = {
        type: EventType.NODE_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        nodeType: 'LLM'
      } as any;
      const events: Event[] = [mockEvent, nodeStartedEvent];
      (mockEventManager.emit as jest.Mock)
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventEmitter.emitBatch(mockEventManager, events);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应该在eventManager为undefined时不做任何操作', async () => {
      const events = [mockEvent];

      await eventEmitter.emitBatch(undefined, events);

      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });

    it('应该处理空数组', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emitBatch(mockEventManager, []);

      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });
  });

  describe('emitBatchParallel', () => {
    it('应该并行触发多个事件', async () => {
      const nodeStartedEvent: Event = {
        type: EventType.NODE_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        nodeType: 'LLM'
      } as any;
      const nodeCompletedEvent: Event = {
        type: EventType.NODE_COMPLETED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        output: { result: 'success' },
        executionTime: 1000
      } as any;
      const events: Event[] = [
        mockEvent,
        nodeStartedEvent,
        nodeCompletedEvent
      ];
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emitBatchParallel(mockEventManager, events);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(3);
    });

    it('应该在某个事件失败时继续处理其他事件', async () => {
      const nodeStartedEvent: Event = {
        type: EventType.NODE_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        nodeType: 'LLM'
      } as any;
      const events: Event[] = [mockEvent, nodeStartedEvent];
      (mockEventManager.emit as jest.Mock)
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventEmitter.emitBatchParallel(mockEventManager, events);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应该在eventManager为undefined时不做任何操作', async () => {
      const events = [mockEvent];

      await eventEmitter.emitBatchParallel(undefined, events);

      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });
  });

  describe('emitIf', () => {
    it('应该在条件为true时触发事件', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);
      const condition = jest.fn(() => true);

      await eventEmitter.emitIf(mockEventManager, mockEvent, condition);

      expect(condition).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
    });

    it('应该在条件为false时不触发事件', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);
      const condition = jest.fn(() => false);

      await eventEmitter.emitIf(mockEventManager, mockEvent, condition);

      expect(condition).toHaveBeenCalled();
      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });

    it('应该在eventManager为undefined时不触发事件', async () => {
      const condition = jest.fn(() => true);

      await eventEmitter.emitIf(undefined, mockEvent, condition);

      expect(condition).not.toHaveBeenCalled();
      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });

    it('应该在eventManager为undefined且条件为false时不调用条件', async () => {
      const condition = jest.fn(() => false);

      await eventEmitter.emitIf(undefined, mockEvent, condition);

      expect(condition).not.toHaveBeenCalled();
    });
  });

  describe('emitDelayed', () => {
    it('应该在指定延迟后触发事件', async () => {
      jest.useFakeTimers();
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      const promise = eventEmitter.emitDelayed(mockEventManager, mockEvent, 1000);

      expect(mockEventManager.emit).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);

      await promise;

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);

      jest.useRealTimers();
    });

    it('应该在eventManager为undefined时不做任何操作', async () => {
      jest.useFakeTimers();
      const promise = eventEmitter.emitDelayed(undefined, mockEvent, 1000);

      jest.advanceTimersByTime(1000);

      await promise;

      expect(mockEventManager.emit).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('应该处理0延迟', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emitDelayed(mockEventManager, mockEvent, 0);

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('emitWithRetry', () => {
    it('应该在第一次尝试成功时触发事件', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emitWithRetry(mockEventManager, mockEvent, 0, 0);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(1);
    });

    it('应该在失败后重试', async () => {
      (mockEventManager.emit as jest.Mock)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce(undefined);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventEmitter.emitWithRetry(mockEventManager, mockEvent, 3, 0);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });

    it('应该在所有重试都失败时记录错误', async () => {
      (mockEventManager.emit as jest.Mock).mockRejectedValue(new Error('Always fails'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventEmitter.emitWithRetry(mockEventManager, mockEvent, 2, 0);

      expect(consoleSpy).toHaveBeenCalledWith(
        'All 3 event emit attempts failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('应该在eventManager为undefined时不做任何操作', async () => {
      await eventEmitter.emitWithRetry(undefined, mockEvent, 0, 0);

      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });

    it('应该使用自定义maxRetries', async () => {
      (mockEventManager.emit as jest.Mock).mockRejectedValue(new Error('Fails'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventEmitter.emitWithRetry(mockEventManager, mockEvent, 5, 0);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(6); // 1 initial + 5 retries

      consoleSpy.mockRestore();
    });
  });

  describe('emitAndWaitForCallback', () => {
    it('应该触发事件并等待回调事件', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);
      (mockEventManager.waitFor as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emitAndWaitForCallback(
        mockEventManager,
        mockEvent,
        EventType.THREAD_COMPLETED,
        1000
      );

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        EventType.THREAD_COMPLETED,
        1000
      );
    });

    it('应该在eventManager为undefined时抛出异常', async () => {
      await expect(
        eventEmitter.emitAndWaitForCallback(
          undefined,
          mockEvent,
          EventType.THREAD_COMPLETED
        )
      ).rejects.toThrow('EventManager is not available');
    });

    it('应该使用默认超时', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);
      (mockEventManager.waitFor as jest.Mock).mockResolvedValue(undefined);

      await eventEmitter.emitAndWaitForCallback(
        mockEventManager,
        mockEvent,
        EventType.THREAD_COMPLETED
      );

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        EventType.THREAD_COMPLETED,
        30000
      );
    });

    it('应该在等待回调时超时', async () => {
      (mockEventManager.emit as jest.Mock).mockResolvedValue(undefined);
      (mockEventManager.waitFor as jest.Mock).mockRejectedValue(
        new Error('Timeout waiting for callback')
      );

      await expect(
        eventEmitter.emitAndWaitForCallback(
          mockEventManager,
          mockEvent,
          EventType.THREAD_COMPLETED,
          1000
        )
      ).rejects.toThrow('Timeout waiting for callback');
    });

    it('应该在emit失败时抛出异常', async () => {
      (mockEventManager.emit as jest.Mock).mockRejectedValue(new Error('Emit failed'));

      await expect(
        eventEmitter.emitAndWaitForCallback(
          mockEventManager,
          mockEvent,
          EventType.THREAD_COMPLETED
        )
      ).rejects.toThrow('Emit failed');

      expect(mockEventManager.waitFor).not.toHaveBeenCalled();
    });
  });
});
