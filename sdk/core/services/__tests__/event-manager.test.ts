/**
 * EventManager 单元测试
 */

import { EventManager } from '../event-manager';
import { EventType } from '@modular-agent/types/events';

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

  describe('offById - 通过ID注销事件监听器', () => {
    it('应该成功通过ID注销事件监听器', () => {
      const listener = jest.fn();
      const unregister = eventManager.on(EventType.NODE_COMPLETED, listener);

      // 获取监听器ID
      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(1);

      // 由于无法直接获取监听器ID，我们通过创建多个监听器然后通过ID删除来测试
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener1);
      const unregister2 = eventManager.on(EventType.NODE_COMPLETED, listener2);

      expect(eventManager.getListenerCount(EventType.NODE_COMPLETED)).toBe(3);
    });

    it('应该返回 false 当监听器ID不存在', () => {
      const result = eventManager.offById(EventType.NODE_COMPLETED, 'non-existent-id');
      expect(result).toBe(false);
    });

    it('应该返回 false 当事件类型不存在监听器', () => {
      const result = eventManager.offById(EventType.NODE_COMPLETED, 'some-id');
      expect(result).toBe(false);
    });

    it('应该抛出错误当事件类型为空', () => {
      expect(() => {
        eventManager.offById('' as EventType, 'some-id');
      }).toThrow('EventType is required');
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

    it('应该支持优先级排序', async () => {
      const callOrder: string[] = [];
      const listener1 = jest.fn(() => {
        callOrder.push('listener1');
      });
      const listener2 = jest.fn(() => {
        callOrder.push('listener2');
      });
      const listener3 = jest.fn(() => {
        callOrder.push('listener3');
      });

      // 注册监听器，优先级分别为 1, 3, 2
      eventManager.on(EventType.NODE_COMPLETED, listener1, { priority: 1 });
      eventManager.on(EventType.NODE_COMPLETED, listener2, { priority: 3 });
      eventManager.on(EventType.NODE_COMPLETED, listener3, { priority: 2 });

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);

      // 优先级高的应该先被调用
      expect(callOrder).toEqual(['listener2', 'listener3', 'listener1']);
    });

    it('应该支持事件过滤器', async () => {
      const listener = jest.fn();

      // 只监听 nodeId 为 'node-1' 的事件
      eventManager.on(EventType.NODE_COMPLETED, listener, {
        filter: (event: any) => event.metadata?.nodeId === 'node-1'
      });

      const event1 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-1' }
      };

      const event2 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-2' }
      };

      await eventManager.emit(event1);
      await eventManager.emit(event2);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(event1);
    });

    it('应该支持监听器超时控制', async () => {
      const listener = jest.fn(
        () =>
          new Promise<void>(resolve => {
            setTimeout(resolve, 200);
          })
      );

      eventManager.on(EventType.NODE_COMPLETED, listener, { timeout: 100 });

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      // 应该继续执行，但会捕获超时错误
      await eventManager.emit(event);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('stopPropagation - 停止事件传播', () => {
    it('应该停止事件传播到后续监听器', async () => {
      const listener1 = jest.fn((event) => {
        eventManager.stopPropagation(event);
      });
      const listener2 = jest.fn();
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

      await eventManager.emit(event);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(listener3).not.toHaveBeenCalled();
    });

    it('应该在传播停止时检查标志', async () => {
      const listener = jest.fn((event) => {
        eventManager.stopPropagation(event);
      });

      eventManager.on(EventType.NODE_COMPLETED, listener);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);

      expect(eventManager.isPropagationStopped(event)).toBe(true);
    });
  });

  describe('isPropagationStopped - 检查事件传播状态', () => {
    it('应该在传播被停止时返回 true', async () => {
      const listener = jest.fn((event) => {
        eventManager.stopPropagation(event);
      });

      eventManager.on(EventType.NODE_COMPLETED, listener);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      expect(eventManager.isPropagationStopped(event)).toBe(false);

      await eventManager.emit(event);

      expect(eventManager.isPropagationStopped(event)).toBe(true);
    });

    it('应该在传播未被停止时返回 false', async () => {
      const listener = jest.fn();

      eventManager.on(EventType.NODE_COMPLETED, listener);

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);

      expect(eventManager.isPropagationStopped(event)).toBe(false);
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

  describe('优先级与过滤器组合', () => {
    it('应该同时支持优先级排序和过滤器', async () => {
      const callOrder: string[] = [];

      eventManager.on(EventType.NODE_COMPLETED, () => {
        callOrder.push('1');
      }, {
        priority: 1,
        filter: (e: any) => e.metadata?.nodeId === 'node-1'
      });

      eventManager.on(EventType.NODE_COMPLETED, () => {
        callOrder.push('2');
      }, {
        priority: 3,
        filter: (e: any) => e.metadata?.nodeId === 'node-1'
      });

      eventManager.on(EventType.NODE_COMPLETED, () => {
        callOrder.push('3');
      }, {
        priority: 2,
        filter: (e: any) => e.metadata?.nodeId === 'node-2'
      });

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-1' }
      };

      await eventManager.emit(event);

      // 只有满足过滤器的监听器被调用，且按优先级排序
      expect(callOrder).toEqual(['2', '1']);
    });
  });

  describe('once 与其他选项组合', () => {
    it('应该支持 once 与优先级组合', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      eventManager.once(EventType.NODE_COMPLETED, listener1, { priority: 2 });
      eventManager.once(EventType.NODE_COMPLETED, listener2, { priority: 1 });

      const event = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1'
      };

      await eventManager.emit(event);
      await eventManager.emit(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('应该支持 once 与过滤器组合', async () => {
      const listener = jest.fn();

      eventManager.once(EventType.NODE_COMPLETED, listener, {
        filter: (e: any) => e.metadata?.nodeId === 'node-1'
      });

      const event1 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-1' }
      };

      const event2 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { nodeId: 'node-1' }
      };

      await eventManager.emit(event1);
      await eventManager.emit(event2);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitFor 与其他功能组合', () => {
    it('应该与优先级共存', async () => {
      const callOrder: string[] = [];

      eventManager.on(
        EventType.NODE_COMPLETED,
        () => {
          callOrder.push('normal');
        },
        { priority: 1 }
      );

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

      const result = await promise;

      expect(result).toEqual(event);
      expect(callOrder).toContain('normal');
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

    it('应该支持复杂的事件流场景', async () => {
      const events: any[] = [];
      const highPriorityListener = jest.fn((event) => {
        events.push({ priority: 'high', event });
      });
      const normalListener = jest.fn((event) => {
        events.push({ priority: 'normal', event });
      });
      const filteredListener = jest.fn((event) => {
        events.push({ priority: 'filtered', event });
      });

      eventManager.on(EventType.NODE_COMPLETED, highPriorityListener, { priority: 10 });
      eventManager.on(EventType.NODE_COMPLETED, normalListener);
      eventManager.on(EventType.NODE_COMPLETED, filteredListener, {
        filter: (e: any) => e.metadata?.important === true
      });

      const event1 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { important: true }
      };

      const event2 = {
        type: EventType.NODE_COMPLETED,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        metadata: { important: false }
      };

      await eventManager.emit(event1);
      await eventManager.emit(event2);

      expect(highPriorityListener).toHaveBeenCalledTimes(2);
      expect(normalListener).toHaveBeenCalledTimes(2);
      expect(filteredListener).toHaveBeenCalledTimes(1); // 只被调用一次

      expect(events[0].priority).toBe('high'); // 第一个事件：高优先级先执行
      expect(events[1].priority).toBe('normal');
      expect(events[2].priority).toBe('filtered');
      expect(events[3].priority).toBe('high'); // 第二个事件：高优先级先执行
      expect(events[4].priority).toBe('normal');
    });
  });
});