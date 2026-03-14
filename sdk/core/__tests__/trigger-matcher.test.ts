/**
 * Trigger Matcher 集成测试
 *
 * 测试场景：
 * - 基础匹配功能
 * - 批量匹配功能
 * - 自定义匹配器
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  defaultTriggerMatcher,
  matchTriggerCondition,
  matchTriggers,
  createTriggerMatcher
} from '../triggers/matcher.js';
import type { BaseTriggerCondition, BaseEventData } from '../triggers/types.js';

describe('Trigger Matcher - 触发器匹配器', () => {
  describe('基础匹配功能', () => {
    it('测试事件类型匹配：相同事件类型应匹配成功', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'test-event'
      };

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'test-event',
        timestamp: Date.now()
      };

      expect(defaultTriggerMatcher(condition, event)).toBe(true);
    });

    it('测试事件类型不匹配：不同事件类型应匹配失败', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'test-event'
      };

      const event: BaseEventData = {
        type: 'THREAD_COMPLETED',
        eventName: 'test-event',
        timestamp: Date.now()
      };

      expect(defaultTriggerMatcher(condition, event)).toBe(false);
    });

    it('测试事件名称匹配：指定eventName时，事件名称应匹配', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'custom-event'
      };

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'custom-event',
        timestamp: Date.now()
      };

      expect(defaultTriggerMatcher(condition, event)).toBe(true);
    });

    it('测试事件名称不匹配：指定eventName时，不同事件名称应匹配失败', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'custom-event'
      };

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'different-event',
        timestamp: Date.now()
      };

      expect(defaultTriggerMatcher(condition, event)).toBe(false);
    });

    it('测试未指定事件名称：未指定eventName时，只匹配事件类型', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED'
      };

      const event1: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'any-event',
        timestamp: Date.now()
      };

      const event2: BaseEventData = {
        type: 'THREAD_STARTED',
        timestamp: Date.now()
      };

      expect(defaultTriggerMatcher(condition, event1)).toBe(true);
      expect(defaultTriggerMatcher(condition, event2)).toBe(true);
    });

    it('测试 matchTriggerCondition 函数', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'NODE_COMPLETED',
        eventName: 'node-1'
      };

      const event: BaseEventData = {
        type: 'NODE_COMPLETED',
        eventName: 'node-1',
        timestamp: Date.now()
      };

      expect(matchTriggerCondition(condition, event)).toBe(true);
    });
  });

  describe('批量匹配功能', () => {
    it('测试批量匹配：从多个触发器中筛选出匹配的触发器', () => {
      const triggers = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: {} },
          enabled: true
        },
        {
          id: 'trigger-2',
          name: 'Trigger 2',
          condition: { eventType: 'THREAD_COMPLETED' },
          action: { type: 'pause_thread', parameters: {} },
          enabled: true
        },
        {
          id: 'trigger-3',
          name: 'Trigger 3',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'resume_thread', parameters: {} },
          enabled: true
        }
      ];

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        timestamp: Date.now()
      };

      const matched = matchTriggers(triggers, event);

      expect(matched).toHaveLength(2);
      expect(matched[0]?.id).toBe('trigger-1');
      expect(matched[1]?.id).toBe('trigger-3');
    });

    it('测试跳过禁用触发器：enabled为false的触发器应被跳过', () => {
      const triggers = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: {} },
          enabled: true
        },
        {
          id: 'trigger-2',
          name: 'Trigger 2',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'pause_thread', parameters: {} },
          enabled: false
        },
        {
          id: 'trigger-3',
          name: 'Trigger 3',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'resume_thread', parameters: {} },
          enabled: true
        }
      ];

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        timestamp: Date.now()
      };

      const matched = matchTriggers(triggers, event);

      expect(matched).toHaveLength(2);
      expect(matched.every(t => t.enabled !== false)).toBe(true);
    });

    it('测试enabled为undefined时默认启用', () => {
      const triggers = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: {} }
          // enabled 未设置
        }
      ];

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        timestamp: Date.now()
      };

      const matched = matchTriggers(triggers, event);

      expect(matched).toHaveLength(1);
    });

    it('测试自定义匹配器：使用自定义匹配逻辑进行匹配', () => {
      const triggers = [
        {
          id: 'trigger-1',
          name: 'Trigger 1',
          condition: { eventType: 'NODE_CUSTOM_EVENT', eventName: 'event-1' },
          action: { type: 'stop_thread', parameters: {} },
          enabled: true
        },
        {
          id: 'trigger-2',
          name: 'Trigger 2',
          condition: { eventType: 'NODE_CUSTOM_EVENT', eventName: 'event-2' },
          action: { type: 'pause_thread', parameters: {} },
          enabled: true
        }
      ];

      const event: BaseEventData = {
        type: 'NODE_CUSTOM_EVENT',
        eventName: 'event-1',
        timestamp: Date.now()
      };

      const customMatcher = createTriggerMatcher((condition, event) => {
        // 自定义逻辑：只匹配包含 'special' 的 eventName
        return condition.eventName?.includes('special') || false;
      });

      const matched = matchTriggers(triggers, event, customMatcher);

      // 由于自定义匹配器要求包含 'special'，所以都不匹配
      expect(matched).toHaveLength(0);
    });
  });

  describe('自定义匹配器', () => {
    it('测试创建自定义匹配器：自定义匹配器应在默认匹配基础上执行自定义逻辑', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'special-event'
      };

      const event1: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'special-event',
        timestamp: Date.now()
      };

      const event2: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'normal-event',
        timestamp: Date.now()
      };

      const customMatcher = createTriggerMatcher((condition, event) => {
        // 自定义逻辑：只匹配包含 'special' 的 eventName
        return condition.eventName?.includes('special') || false;
      });

      expect(customMatcher(condition, event1)).toBe(true);
      expect(customMatcher(condition, event2)).toBe(false);
    });

    it('测试自定义匹配器组合：自定义匹配器可以组合多个条件', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'NODE_CUSTOM_EVENT',
        eventName: 'important-event',
        metadata: { priority: 'high' }
      };

      const event1: BaseEventData = {
        type: 'NODE_CUSTOM_EVENT',
        eventName: 'important-event',
        data: { priority: 'high' },
        timestamp: Date.now()
      };

      const event2: BaseEventData = {
        type: 'NODE_CUSTOM_EVENT',
        eventName: 'important-event',
        data: { priority: 'low' },
        timestamp: Date.now()
      };

      const customMatcher = createTriggerMatcher((condition, event) => {
        // 自定义逻辑：检查事件数据的优先级
        return event.data?.priority === 'high';
      });

      expect(customMatcher(condition, event1)).toBe(true);
      expect(customMatcher(condition, event2)).toBe(false);
    });

    it('测试自定义匹配器先执行默认匹配：默认匹配失败时自定义逻辑不执行', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'test-event'
      };

      const event: BaseEventData = {
        type: 'THREAD_COMPLETED', // 事件类型不匹配
        eventName: 'test-event',
        timestamp: Date.now()
      };

      const customMatcher = createTriggerMatcher(() => {
        // 这个逻辑不应该执行
        return true;
      });

      expect(customMatcher(condition, event)).toBe(false);
    });

    it('测试自定义匹配器未指定eventName时', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED'
      };

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        timestamp: Date.now()
      };

      const customMatcher = createTriggerMatcher((condition, event) => {
        // 自定义逻辑：检查事件数据
        return event.data?.valid === true;
      });

      const event1: BaseEventData = {
        type: 'THREAD_STARTED',
        data: { valid: true },
        timestamp: Date.now()
      };

      const event2: BaseEventData = {
        type: 'THREAD_STARTED',
        data: { valid: false },
        timestamp: Date.now()
      };

      expect(customMatcher(condition, event1)).toBe(true);
      expect(customMatcher(condition, event2)).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('测试空事件类型列表', () => {
      const triggers: any[] = [];

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        timestamp: Date.now()
      };

      const matched = matchTriggers(triggers, event);

      expect(matched).toHaveLength(0);
    });

    it('测试事件未指定eventName但条件指定了', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'required-event'
      };

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        timestamp: Date.now()
      };

      expect(defaultTriggerMatcher(condition, event)).toBe(false);
    });

    it('测试条件未指定eventName但事件指定了', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED'
      };

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'any-event',
        timestamp: Date.now()
      };

      expect(defaultTriggerMatcher(condition, event)).toBe(true);
    });

    it('测试metadata不影响匹配', () => {
      const condition: BaseTriggerCondition = {
        eventType: 'THREAD_STARTED',
        eventName: 'test-event',
        metadata: { key: 'value' }
      };

      const event: BaseEventData = {
        type: 'THREAD_STARTED',
        eventName: 'test-event',
        timestamp: Date.now(),
        data: { different: 'metadata' }
      };

      expect(defaultTriggerMatcher(condition, event)).toBe(true);
    });
  });
});