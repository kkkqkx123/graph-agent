/**
 * APIEventSystem单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  APIEventBus,
  APIEventType,
  APIEventBuilder,
  apiEventBus,
  type APIEventData,
  type APIEventListener
} from '../api-event-system';

describe('APIEventBus', () => {
  let eventBus: APIEventBus;

  beforeEach(() => {
    eventBus = APIEventBus.getInstance();
    eventBus.clear();
    eventBus.clearHistory();
  });

  afterEach(() => {
    eventBus.clear();
    eventBus.clearHistory();
  });

  describe('单例模式', () => {
    it('应该是单例', () => {
      const instance1 = APIEventBus.getInstance();
      const instance2 = APIEventBus.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('事件订阅和发布', () => {
    it('应该订阅和发布事件', async () => {
      const listener = jest.fn();
      eventBus.on(APIEventType.RESOURCE_CREATED, listener);

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1',
        resourceType: 'Workflow',
        resourceId: 'wf-123'
      };

      await eventBus.emit(event);

      expect(listener).toHaveBeenCalledWith(event);
    });

    it('应该支持多个监听器', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      eventBus.on(APIEventType.RESOURCE_CREATED, listener1);
      eventBus.on(APIEventType.RESOURCE_CREATED, listener2);

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);

      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);
    });

    it('应该支持一次性监听器', async () => {
      const listener = jest.fn();
      eventBus.once(APIEventType.RESOURCE_CREATED, listener);

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);
      await eventBus.emit(event);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该取消订阅', async () => {
      const listener = jest.fn();
      const unsubscribe = eventBus.on(APIEventType.RESOURCE_CREATED, listener);

      unsubscribe();

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);

      expect(listener).not.toHaveBeenCalled();
    });

    it('应该支持优先级', async () => {
      const calls: number[] = [];
      const listener1 = jest.fn(() => calls.push(1));
      const listener2 = jest.fn(() => calls.push(2));
      const listener3 = jest.fn(() => calls.push(3));

      eventBus.on(APIEventType.RESOURCE_CREATED, listener1, { priority: 1 });
      eventBus.on(APIEventType.RESOURCE_CREATED, listener2, { priority: 3 });
      eventBus.on(APIEventType.RESOURCE_CREATED, listener3, { priority: 2 });

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);

      expect(calls).toEqual([2, 3, 1]);
    });

    it('应该支持过滤条件', async () => {
      const listener = jest.fn();
      eventBus.on(APIEventType.RESOURCE_CREATED, listener, {
        filter: (event) => event.resourceType === 'Workflow'
      });

      const event1: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1',
        resourceType: 'Workflow'
      };

      const event2: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-2',
        resourceType: 'Tool'
      };

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(event1);
    });

    it('应该处理监听器错误', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      eventBus.on(APIEventType.RESOURCE_CREATED, errorListener);
      eventBus.on(APIEventType.RESOURCE_CREATED, normalListener);

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);

      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('批量发布', () => {
    it('应该批量发布事件', async () => {
      const listener = jest.fn();
      eventBus.on(APIEventType.RESOURCE_CREATED, listener);

      const events: APIEventData[] = [
        {
          type: APIEventType.RESOURCE_CREATED,
          timestamp: Date.now(),
          eventId: 'evt-1'
        },
        {
          type: APIEventType.RESOURCE_CREATED,
          timestamp: Date.now(),
          eventId: 'evt-2'
        }
      ];

      await eventBus.emitBatch(events);

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('事件历史', () => {
    it('应该记录事件历史', async () => {
      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1',
        resourceType: 'Workflow'
      };

      await eventBus.emit(event);

      const history = eventBus.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(event);
    });

    it('应该支持过滤历史', async () => {
      const event1: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1',
        resourceType: 'Workflow'
      };

      const event2: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-2',
        resourceType: 'Tool'
      };

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      const history = eventBus.getHistory({ resourceType: 'Workflow' });

      expect(history).toHaveLength(1);
      expect(history[0].resourceType).toBe('Workflow');
    });

    it('应该限制历史记录大小', async () => {
      eventBus.setMaxHistorySize(2);

      for (let i = 0; i < 5; i++) {
        const event: APIEventData = {
          type: APIEventType.RESOURCE_CREATED,
          timestamp: Date.now(),
          eventId: `evt-${i}`
        };
        await eventBus.emit(event);
      }

      const history = eventBus.getHistory();

      expect(history).toHaveLength(2);
    });

    it('应该清除历史记录', async () => {
      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);
      eventBus.clearHistory();

      const history = eventBus.getHistory();

      expect(history).toHaveLength(0);
    });
  });

  describe('启用和禁用', () => {
    it('应该禁用事件总线', async () => {
      const listener = jest.fn();
      eventBus.on(APIEventType.RESOURCE_CREATED, listener);
      eventBus.disable();

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);

      expect(listener).not.toHaveBeenCalled();
    });

    it('应该启用事件总线', async () => {
      const listener = jest.fn();
      eventBus.on(APIEventType.RESOURCE_CREATED, listener);
      eventBus.disable();
      eventBus.enable();

      const event: APIEventData = {
        type: APIEventType.RESOURCE_CREATED,
        timestamp: Date.now(),
        eventId: 'evt-1'
      };

      await eventBus.emit(event);

      expect(listener).toHaveBeenCalled();
    });

    it('应该检查是否启用', () => {
      expect(eventBus.isEnabled()).toBe(true);

      eventBus.disable();
      expect(eventBus.isEnabled()).toBe(false);

      eventBus.enable();
      expect(eventBus.isEnabled()).toBe(true);
    });
  });

  describe('监听器数量', () => {
    it('应该获取监听器数量', () => {
      eventBus.on(APIEventType.RESOURCE_CREATED, jest.fn());
      eventBus.on(APIEventType.RESOURCE_CREATED, jest.fn());
      eventBus.on(APIEventType.RESOURCE_UPDATED, jest.fn());

      expect(eventBus.getListenerCount(APIEventType.RESOURCE_CREATED)).toBe(2);
      expect(eventBus.getListenerCount(APIEventType.RESOURCE_UPDATED)).toBe(1);
      expect(eventBus.getListenerCount()).toBe(3);
    });
  });
});

describe('APIEventBuilder', () => {
  it('应该构建基本事件', () => {
    const event = new APIEventBuilder()
      .type(APIEventType.RESOURCE_CREATED)
      .build();

    expect(event.type).toBe(APIEventType.RESOURCE_CREATED);
    expect(event.timestamp).toBeDefined();
    expect(event.eventId).toBeDefined();
  });

  it('应该支持链式调用', () => {
    const event = new APIEventBuilder()
      .type(APIEventType.RESOURCE_CREATED)
      .resourceType('Workflow')
      .resourceId('wf-123')
      .operation('CREATE')
      .data({ name: 'Test Workflow' })
      .build();

    expect(event.resourceType).toBe('Workflow');
    expect(event.resourceId).toBe('wf-123');
    expect(event.operation).toBe('CREATE');
    expect(event.data).toEqual({ name: 'Test Workflow' });
  });

  it('应该设置错误', () => {
    const error = new Error('Test error');
    const event = new APIEventBuilder()
      .type(APIEventType.ERROR_OCCURRED)
      .error(error)
      .build();

    expect(event.error).toBe(error);
  });

  it('应该在缺少类型时抛出错误', () => {
    expect(() => {
      new APIEventBuilder().build();
    }).toThrow('Event type is required');
  });
});