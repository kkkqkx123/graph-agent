/**
 * TriggerTemplateBuilder 单元测试
 */

import { TriggerTemplateBuilder } from '../trigger-template-builder';
import { EventType } from '@modular-agent/types/events';
import { TriggerActionType } from '@modular-agent/types/trigger';
import { triggerTemplateRegistry } from '@modular-agent/sdk/core/services/trigger-template-registry';

// Mock the registry
jest.mock('../../../../core/services/trigger-template-registry', () => ({
  triggerTemplateRegistry: {
    register: jest.fn(),
    get: jest.fn(),
    unregister: jest.fn()
  }
}));

describe('TriggerTemplateBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建一个新的构建器实例', () => {
      const builder = TriggerTemplateBuilder.create('test-trigger');
      expect(builder).toBeInstanceOf(TriggerTemplateBuilder);
    });
  });

  describe('链式方法', () => {
    it('应该支持链式调用', () => {
      const builder = TriggerTemplateBuilder
        .create('test-trigger')
        .description('测试触发器')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '测试' }
        })
        .category('notification')
        .tags('test', 'notification');

      expect(builder).toBeInstanceOf(TriggerTemplateBuilder);
    });

    it('description 应该设置描述', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .description('测试描述')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .build();

      expect(template.description).toBe('测试描述');
    });

    it('condition 应该设置触发条件', () => {
      const condition = { eventType: EventType.NODE_COMPLETED };
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition(condition)
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .build();

      expect(template.condition).toEqual(condition);
    });

    it('action 应该设置触发动作', () => {
      const action = {
        type: TriggerActionType.SEND_NOTIFICATION,
        parameters: { message: '测试消息' }
      };
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action(action)
        .build();

      expect(template.action).toEqual(action);
    });

    it('enabled 应该设置启用状态', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .enabled(false)
        .build();

      expect(template.enabled).toBe(false);
    });

    it('maxTriggers 应该设置最大触发次数', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .maxTriggers(10)
        .build();

      expect(template.maxTriggers).toBe(10);
    });

    it('metadata 应该设置元数据', () => {
      const metadata = { author: 'test', version: '1.0' };
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .metadata(metadata)
        .build();

      expect(template.metadata).toEqual(metadata);
    });

    it('category 应该设置分类', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .category('notification')
        .build();

      expect(template.metadata?.['category']).toBe('notification');
    });

    it('tags 应该添加标签', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .tags('test', 'notification', 'alert')
        .build();

      expect(template.metadata?.['tags']).toEqual(['test', 'notification', 'alert']);
    });

    it('多次调用 tags 应该累积标签', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .tags('test')
        .tags('notification')
        .build();

      expect(template.metadata?.['tags']).toEqual(['test', 'notification']);
    });

    it('category 和 tags 应该可以一起使用', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .category('notification')
        .tags('test', 'alert')
        .build();

      expect(template.metadata?.['category']).toBe('notification');
      expect(template.metadata?.['tags']).toEqual(['test', 'alert']);
    });
  });

  describe('build', () => {
    it('应该构建完整的触发器模板', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .description('测试描述')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '测试消息' }
        })
        .category('notification')
        .tags('test', 'notification')
        .build();

      expect(template.name).toBe('test-trigger');
      expect(template.description).toBe('测试描述');
      expect(template.condition).toEqual({ eventType: EventType.NODE_COMPLETED });
      expect(template.action).toEqual({
        type: TriggerActionType.SEND_NOTIFICATION,
        parameters: { message: '测试消息' }
      });
      expect(template.metadata?.['category']).toBe('notification');
      expect(template.metadata?.['tags']).toEqual(['test', 'notification']);
      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
    });

    it('应该抛出错误如果名称为空', () => {
      const builder = TriggerTemplateBuilder.create('' as any);
      expect(() => builder.build()).toThrow('模板名称不能为空');
    });

    it('应该抛出错误如果条件为空', () => {
      const builder = TriggerTemplateBuilder.create('test');
      expect(() => builder.build()).toThrow('触发条件不能为空');
    });

    it('应该抛出错误如果动作为空', () => {
      const builder = TriggerTemplateBuilder
        .create('test')
        .condition({ eventType: EventType.NODE_COMPLETED });
      expect(() => builder.build()).toThrow('触发动作不能为空');
    });

    it('应该默认启用状态为 true', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .build();

      expect(template.enabled).toBe(true);
    });

    it('应该自动设置时间戳', () => {
      const beforeCreate = Date.now();
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .build();
      const afterCreate = Date.now();

      expect(template.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(template.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(template.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(template.updatedAt).toBeLessThanOrEqual(afterCreate);
    });
  });

  describe('register', () => {
    it('应该注册模板到注册表', () => {
      const builder = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} });

      builder.register();

      expect(triggerTemplateRegistry.register).toHaveBeenCalledTimes(1);
      const registeredTemplate = (triggerTemplateRegistry.register as jest.Mock).mock.calls[0][0];
      expect(registeredTemplate.name).toBe('test-trigger');
      expect(registeredTemplate.condition).toEqual({ eventType: EventType.NODE_COMPLETED });
    });

    it('register 应该返回 this 以支持链式调用', () => {
      const builder = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} });

      const result = builder.register();
      expect(result).toBe(builder);
    });
  });

  describe('buildAndRegister', () => {
    it('应该构建并注册模板', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .buildAndRegister();

      expect(template.name).toBe('test-trigger');
      expect(triggerTemplateRegistry.register).toHaveBeenCalledTimes(1);
    });

    it('应该返回构建的模板', () => {
      const template = TriggerTemplateBuilder
        .create('test-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .buildAndRegister();

      expect(template).toBeDefined();
      expect(template.name).toBe('test-trigger');
    });
  });

  describe('完整使用场景', () => {
    it('应该支持完整的构建流程', () => {
      const template = TriggerTemplateBuilder
        .create('node-completed-notification')
        .description('节点完成时发送通知')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '节点已完成' }
        })
        .category('notification')
        .tags('notification', 'node', 'completed')
        .build();

      expect(template.name).toBe('node-completed-notification');
      expect(template.description).toBe('节点完成时发送通知');
      expect(template.condition).toEqual({ eventType: EventType.NODE_COMPLETED });
      expect(template.action).toEqual({
        type: TriggerActionType.SEND_NOTIFICATION,
        parameters: { message: '节点已完成' }
      });
      expect(template.metadata?.['category']).toBe('notification');
      expect(template.metadata?.['tags']).toEqual(['notification', 'node', 'completed']);
    });

    it('应该支持构建并立即注册', () => {
      TriggerTemplateBuilder
        .create('node-completed-notification')
        .description('节点完成时发送通知')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '节点已完成' }
        })
        .category('notification')
        .tags('notification', 'node')
        .register();

      expect(triggerTemplateRegistry.register).toHaveBeenCalledTimes(1);
    });

    it('应该支持构建并注册并获取模板', () => {
      const template = TriggerTemplateBuilder
        .create('node-completed-notification')
        .description('节点完成时发送通知')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '节点已完成' }
        })
        .category('notification')
        .tags('notification', 'node')
        .buildAndRegister();

      expect(template).toBeDefined();
      expect(triggerTemplateRegistry.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('不同触发器类型', () => {
    it('应该支持节点失败告警', () => {
      const template = TriggerTemplateBuilder
        .create('node-failed-alert')
        .description('节点失败时发送告警')
        .condition({ eventType: EventType.NODE_FAILED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '节点执行失败' }
        })
        .category('alert')
        .tags('alert', 'error', 'node')
        .build();

      expect(template.condition.eventType).toBe(EventType.NODE_FAILED);
      expect(template.action.type).toBe(TriggerActionType.SEND_NOTIFICATION);
    });

    it('应该支持工作流完成通知', () => {
      const template = TriggerTemplateBuilder
        .create('workflow-completed-notification')
        .description('工作流完成时发送通知')
        .condition({ eventType: EventType.THREAD_COMPLETED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '工作流已完成' }
        })
        .category('notification')
        .tags('notification', 'workflow')
        .build();

      expect(template.condition.eventType).toBe(EventType.THREAD_COMPLETED);
    });

    it('应该支持设置变量动作', () => {
      const template = TriggerTemplateBuilder
        .create('set-variable-on-complete')
        .description('节点完成时设置变量')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.SET_VARIABLE,
          parameters: {
            variableName: 'status',
            value: 'completed'
          }
        })
        .category('variable')
        .tags('variable', 'node')
        .build();

      expect(template.action.type).toBe(TriggerActionType.SET_VARIABLE);
      expect(template.action.parameters['variableName']).toBe('status');
    });

    it('应该支持启动工作流动作', () => {
      const template = TriggerTemplateBuilder
        .create('start-workflow-on-event')
        .description('事件触发时启动工作流')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.START_WORKFLOW,
          parameters: {
            workflowId: 'sub-workflow'
          }
        })
        .category('workflow')
        .tags('workflow', 'trigger')
        .build();

      expect(template.action.type).toBe(TriggerActionType.START_WORKFLOW);
    });

    it('应该支持自定义动作', () => {
      const template = TriggerTemplateBuilder
        .create('custom-action')
        .description('自定义动作')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.CUSTOM,
          parameters: {
            handler: 'customHandler',
            data: { key: 'value' }
          }
        })
        .category('custom')
        .tags('custom', 'action')
        .build();

      expect(template.action.type).toBe(TriggerActionType.CUSTOM);
    });
  });

  describe('高级配置', () => {
    it('应该支持禁用触发器', () => {
      const template = TriggerTemplateBuilder
        .create('disabled-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .enabled(false)
        .build();

      expect(template.enabled).toBe(false);
    });

    it('应该支持限制触发次数', () => {
      const template = TriggerTemplateBuilder
        .create('limited-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .maxTriggers(5)
        .build();

      expect(template.maxTriggers).toBe(5);
    });

    it('应该支持无限制触发次数（0）', () => {
      const template = TriggerTemplateBuilder
        .create('unlimited-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .maxTriggers(0)
        .build();

      expect(template.maxTriggers).toBe(0);
    });

    it('应该支持带元数据的条件', () => {
      const template = TriggerTemplateBuilder
        .create('metadata-trigger')
        .condition({
          eventType: EventType.NODE_COMPLETED,
          metadata: { nodeId: 'specific-node' }
        })
        .action({ type: TriggerActionType.SEND_NOTIFICATION, parameters: {} })
        .build();

      expect(template.condition.metadata).toEqual({ nodeId: 'specific-node' });
    });

    it('应该支持带元数据的动作', () => {
      const template = TriggerTemplateBuilder
        .create('metadata-action-trigger')
        .condition({ eventType: EventType.NODE_COMPLETED })
        .action({
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: '测试' },
          metadata: { priority: 'high' }
        })
        .build();

      expect(template.action.metadata).toEqual({ priority: 'high' });
    });
  });
});