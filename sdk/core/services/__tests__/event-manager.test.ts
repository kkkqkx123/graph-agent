/**
 * EventManager 单元测试
 */

import { EventManager } from '../event-manager';
import { EventType } from '../../../types/events';

describe('EventManager', () => {
  let eventManager: EventManager;

  beforeEach(() => {
    // 创建新的 EventManager 实例以避免测试间干扰
    eventManager = new EventManager();
  });

  describe('on - 注册事件监听器', () => {
    it('应该成功注册事件监听器', () => {
      const listener = jest.fn();
      const unregister = eventManager.on(EventType.NODE_COMPLETED, listener);

      expect(typeof unregister).toBe('function');
      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(1);
    });

    it('应该抛出错误当事件类型为空', () => {
      const listener = jest.fn();
      expect(() => {
        eventManager.on('' as EventType, listener);
      }).toThrow('EventType is required');
    });

    it('应该抛出错误当监听器不是函数', () => {
      expect(() => {
        eventManager.on(EventType.NODE_COMPLETED, null as any);
      }).toThrow('Listener must be a function');
    });

    it('应该支持多个监听器监听同一事件', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      eventManager.on(EventType.NODE_COMPLETED, listener2);
      eventManager.on(EventType.NODE_COMPLETED, listener3);

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(3);
    });
  });

  describe('off - 注销事件监听器', () => {
    it('应该成功注销事件监听器', () => {
      const listener = jest.fn();
      eventManager.on(EventType.NODE_COMPLETED, listener);

      const result = eventManager.off(EventType.NODE_COMPLETED, listener);

      expect(result).toBe(true);
      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
    });

    it('应该返回 false 当监听器不存在', () => {
      const listener = jest.fn();
      const result = eventManager.off(EventType.NODE_COMPLETED, listener);

      expect(result).toBe(false);
    });

    it('应该抛出错误当事件类型为空', () => {
      const listener = jest.fn();
      expect(() => {
        eventManager.off('' as EventType, listener);
      }).toThrow('EventType is required');
    });

    it('应该抛出错误当监听器不是函数', () => {
      expect(() => {
        eventManager.off(EventType.NODE_COMPLETED, null as any);
      }).toThrow('Listener must be a function');
    });

    it('应该只注销指定的监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      eventManager.on(EventType.NODE_COMPLETED, listener2);
      eventManager.on(EventType.NODE_COMPLETED, listener3);

      eventManager.off(EventType.NODE_COMPLETED, listener2);

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(2);
    });
  });

  describe('emit - 触发事件', () => {
    it('应该成功触发事件并调用所有监听器', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      eventManager.on(EventType.NODE_COMPLETED, listener2);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-1' }
      };

      await eventManager.emit(event);

      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);
    });

    it('应该支持异步监听器', async () => {
      const listener1 = jest.fn().mockResolvedValue('result1');
      const listener2 = jest.fn().mockResolvedValue('result2');

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      eventManager.on(EventType.NODE_COMPLETED, listener2);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('应该捕获监听器错误并继续执行其他监听器', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn().mockRejectedValue(new Error('Test error'));
      const listener3 = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      eventManager.on(EventType.NODE_COMPLETED, listener2);
      eventManager.on(EventType.NODE_COMPLETED, listener3);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      // 不应该抛出错误
      await expect(eventManager.emit(event)).resolves.not.toThrow();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });

    it('应该抛出错误当事件为空', async () => {
      await expect(eventManager.emit(null as any)).rejects.toThrow('Event is required');
    });

    it('应该抛出错误当事件类型为空', async () => {
      const event = {
        type: '' as EventType,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await expect(eventManager.emit(event)).rejects.toThrow('Event type is required');
    });

    it('应该不调用任何监听器当没有监听器注册时', async () => {
      const listener = jest.fn();

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('once - 注册一次性事件监听器', () => {
    it('应该只调用一次监听器', async () => {
      const listener = jest.fn();

      eventManager.once(EventType.NODE_COMPLETED, listener);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);
      await eventManager.emit(event);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该自动注销一次性监听器', async () => {
      const listener = jest.fn();

      eventManager.once(EventType.NODE_COMPLETED, listener);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
    });

    it('应该抛出错误当事件类型为空', () => {
      const listener = jest.fn();
      expect(() => {
        eventManager.once('' as EventType, listener);
      }).toThrow('EventType is required');
    });

    it('应该抛出错误当监听器不是函数', () => {
      expect(() => {
        eventManager.once(EventType.NODE_COMPLETED, null as any);
      }).toThrow('Listener must be a function');
    });
  });

  describe('clear - 清空事件监听器', () => {
    it('应该清空指定事件的所有监听器', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      eventManager.on(EventType.NODE_COMPLETED, listener2);
      eventManager.on(EventType.NODE_STARTED, jest.fn());

      eventManager.clear(EventType.NODE_COMPLETED);

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
      expect(eventManager.getListenerCount(EventType.NODE_STARTED)).toBe(1);
    });

    it('应该清空所有监听器当不指定事件类型', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      eventManager.on(EventType.NODE_STARTED, listener2);
      eventManager.on(EventType.THREAD_STARTED, listener3);

      eventManager.clear();

      expect(eventManager.getListenerCount()).toBe(0);
    });
  });

  describe('waitFor - 等待特定事件触发', () => {
    it('应该解析为事件对象当事件触发时', async () => {
      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-1' }
      };

      const promise = eventManager.waitFor(EventType.NODE_COMPLETED);

      setTimeout(() => {
        eventManager.emit(event);
      }, 10);

      const result = await promise;
      expect(result).toEqual(event);
    });

    it('应该支持超时', async () => {
      const promise = eventManager.waitFor(EventType.NODE_COMPLETED, 100);

      await expect(promise).rejects.toThrow('Timeout waiting for event NODE_COMPLETED');
    });

    it('应该自动注销监听器当事件触发时', async () => {
      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      const promise = eventManager.waitFor(EventType.NODE_COMPLETED);

      setTimeout(() => {
        eventManager.emit(event);
      }, 10);

      await promise;

      // 等待一小段时间确保监听器被注销
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
    });

    it('应该自动注销监听器当超时时', async () => {
      const promise = eventManager.waitFor(EventType.NODE_COMPLETED, 100);

      try {
        await promise;
      } catch (error) {
        // 预期的超时错误
      }

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
    });
  });

  describe('getListenerCount - 获取监听器数量', () => {
    it('应该返回指定事件的监听器数量', () => {
      eventManager.on(EventType.NODE_COMPLETED, jest.fn());
      eventManager.on(EventType.NODE_COMPLETED, jest.fn());
      eventManager.on(EventType.NODE_STARTED, jest.fn());

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(2);
      expect(eventManager.getListenerCount(EventType.NODE_STARTED)).toBe(1);
    });

    it('应该返回 0 当没有监听器时', () => {
      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
    });

    it('应该返回所有监听器的总数当不指定事件类型', () => {
      eventManager.on(EventType.NODE_COMPLETED, jest.fn());
      eventManager.on(EventType.NODE_COMPLETED, jest.fn());
      eventManager.on(EventType.NODE_STARTED, jest.fn());
      eventManager.on(EventType.THREAD_STARTED, jest.fn());

      expect(eventManager.getListenerCount()).toBe(4);
    });
  });

  describe('注销函数', () => {
    it('应该成功注销监听器', () => {
      const listener = jest.fn();
      const unregister = eventManager.on(EventType.NODE_COMPLETED, listener);

      unregister();

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
    });

    it('应该可以多次调用注销函数', () => {
      const listener = jest.fn();
      const unregister = eventManager.on(EventType.NODE_COMPLETED, listener);

      unregister();
      unregister();
      unregister();

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(0);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的事件生命周期', async () => {
      const events: any[] = [];
      const listener = (event: any) => {
        events.push(event);
      };

      // 注册监听器
      const unregister = eventManager.on(EventType.NODE_COMPLETED, listener);

      // 触发事件
      const event1 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-1' }
      };

      await eventManager.emit(event1);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event1);

      // 注销监听器
      unregister();

      // 再次触发事件
      const event2 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-2' }
      };

      await eventManager.emit(event2);

      expect(events).toHaveLength(1); // 仍然是 1，因为监听器已注销
    });

    it('应该支持多个事件类型', async () => {
      const nodeCompletedEvents: any[] = [];
      const nodeStartedEvents: any[] = [];

      eventManager.on(EventType.NODE_COMPLETED, (event) => {
        nodeCompletedEvents.push(event);
      });
      eventManager.on(EventType.NODE_STARTED, (event) => {
        nodeStartedEvents.push(event);
      });

      const event1 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      const event2 = {
        type: EventType.NODE_STARTED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event1);
      await eventManager.emit(event2);

      expect(nodeCompletedEvents).toHaveLength(1);
      expect(nodeStartedEvents).toHaveLength(1);
      expect(nodeCompletedEvents[0]).toEqual(event1);
      expect(nodeStartedEvents[0]).toEqual(event2);
    });
  });
});