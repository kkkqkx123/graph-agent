/**
 * APIEventSystem单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  APIEventBus,
  APIEventType,
  APIEventBuilder,
  createEventBus,
  type APIEventData,
  type APIEventListener
} from '../api-event-system';

describe('APIEventBus', () => {
  let eventBus: APIEventBus;

  beforeEach(() => {
    eventBus = createEventBus();
    eventBus.clear();
  });

  afterEach(() => {
    eventBus.clear();
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