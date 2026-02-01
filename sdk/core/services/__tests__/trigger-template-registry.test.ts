/**
 * TriggerTemplateRegistry 单元测试
 */

import { TriggerTemplateRegistry } from '../trigger-template-registry';
import { EventType } from '../../../types/events';
import { TriggerActionType } from '../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../types/errors';

describe('TriggerTemplateRegistry', () => {
  let registry: TriggerTemplateRegistry;

  beforeEach(() => {
    // 创建新的 TriggerTemplateRegistry 实例以避免测试间干扰
    registry = new TriggerTemplateRegistry();
  });

  describe('register - 注册触发器模板', () => {
    it('应该成功注册有效的触发器模板', () => {
      const template = {
        name: 'test-template',
        description: 'Test trigger template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {
            message: 'Test notification'
          }
        },
        enabled: true,
        maxTriggers: 10,
        metadata: {
          category: 'test',
          tags: ['test', 'notification']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(template)).not.toThrow();
      expect(registry.has('test-template')).toBe(true);
    });

    it('应该抛出 ValidationError 当触发器模板名称已存在', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(template);
      }).toThrow('already exists');
    });

    it('应该抛出 ValidationError 当触发器模板名称为空', () => {
      const template = {
        name: '',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当触发条件为空', () => {
      const template = {
        name: 'test-template',
        condition: null as any,
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当触发动作为空', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: null as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当事件类型无效', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: 'INVALID_EVENT' as EventType
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(template);
      }).toThrow('Invalid event type');
    });

    it('应该抛出 ValidationError 当动作类型无效', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: 'INVALID_ACTION' as TriggerActionType,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(template);
      }).toThrow('Invalid action type');
    });
  });

  describe('registerBatch - 批量注册触发器模板', () => {
    it('应该成功批量注册多个触发器模板', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          condition: {
            eventType: EventType.NODE_FAILED
          },
          action: {
            type: TriggerActionType.SET_VARIABLE,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(registry.size()).toBe(3);
      expect(registry.has('template-1')).toBe(true);
      expect(registry.has('template-2')).toBe(true);
      expect(registry.has('template-3')).toBe(true);
    });

    it('应该在第一个无效模板时停止注册', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: null as any,
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          condition: {
            eventType: EventType.NODE_FAILED
          },
          action: {
            type: TriggerActionType.SET_VARIABLE,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      expect(() => {
        registry.registerBatch(templates);
      }).toThrow(ValidationError);

      // 只有第一个模板应该被注册
      expect(registry.size()).toBe(1);
      expect(registry.has('template-1')).toBe(true);
      expect(registry.has('template-2')).toBe(false);
      expect(registry.has('template-3')).toBe(false);
    });
  });

  describe('get - 获取触发器模板', () => {
    it('应该返回已注册的触发器模板', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const result = registry.get('test-template');

      expect(result).toEqual(template);
    });

    it('应该返回 undefined 当触发器模板不存在', () => {
      const result = registry.get('non-existent-template');

      expect(result).toBeUndefined();
    });
  });

  describe('has - 检查触发器模板是否存在', () => {
    it('应该返回 true 当触发器模板存在', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(registry.has('test-template')).toBe(true);
    });

    it('应该返回 false 当触发器模板不存在', () => {
      expect(registry.has('non-existent-template')).toBe(false);
    });
  });

  describe('update - 更新触发器模板', () => {
    it('应该成功更新触发器模板', () => {
      const template = {
        name: 'test-template',
        description: 'Original description',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const updates = {
        description: 'Updated description',
        metadata: {
          category: 'updated',
          tags: ['updated']
        }
      };

      registry.update('test-template', updates);

      const updated = registry.get('test-template');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.metadata).toEqual(updates.metadata);
      expect(updated?.name).toBe('test-template'); // 名称不可更改
    });

    it('应该抛出 NotFoundError 当触发器模板不存在', () => {
      expect(() => {
        registry.update('non-existent-template', { description: 'Updated' });
      }).toThrow(NotFoundError);
    });

    it('应该抛出 ValidationError 当更新后的配置无效', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(() => {
        registry.update('test-template', { condition: null as any });
      }).toThrow(ValidationError);
    });

    it('应该更新 updatedAt 时间戳', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const originalUpdatedAt = template.updatedAt;

      // 等待一小段时间确保时间戳不同
      setTimeout(() => {
        registry.update('test-template', { description: 'Updated' });

        const updated = registry.get('test-template');
        expect(updated?.updatedAt).toBeGreaterThan(originalUpdatedAt);
      }, 10);
    });
  });

  describe('unregister - 删除触发器模板', () => {
    it('应该成功删除触发器模板', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      registry.unregister('test-template');

      expect(registry.has('test-template')).toBe(false);
      expect(registry.get('test-template')).toBeUndefined();
    });

    it('应该抛出 NotFoundError 当触发器模板不存在', () => {
      expect(() => {
        registry.unregister('non-existent-template');
      }).toThrow(NotFoundError);
    });
  });

  describe('unregisterBatch - 批量删除触发器模板', () => {
    it('应该成功批量删除多个触发器模板', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          condition: {
            eventType: EventType.NODE_FAILED
          },
          action: {
            type: TriggerActionType.SET_VARIABLE,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      registry.unregisterBatch(['template-1', 'template-3']);

      expect(registry.size()).toBe(1);
      expect(registry.has('template-1')).toBe(false);
      expect(registry.has('template-2')).toBe(true);
      expect(registry.has('template-3')).toBe(false);
    });

    it('应该在第一个不存在的模板时停止删除', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(() => {
        registry.unregisterBatch(['template-1', 'non-existent', 'template-2']);
      }).toThrow(NotFoundError);

      // 只有第一个模板应该被删除
      expect(registry.size()).toBe(1);
      expect(registry.has('template-1')).toBe(false);
      expect(registry.has('template-2')).toBe(true);
    });
  });

  describe('list - 列出所有触发器模板', () => {
    it('应该返回所有已注册的触发器模板', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      const result = registry.list();

      expect(result).toHaveLength(2);
      expect(result.map(t => t.name)).toContain('template-1');
      expect(result.map(t => t.name)).toContain('template-2');
    });

    it('应该返回空数组当没有触发器模板', () => {
      const result = registry.list();

      expect(result).toEqual([]);
    });
  });

  describe('listSummaries - 列出所有触发器模板摘要', () => {
    it('应该返回所有触发器模板的摘要信息', () => {
      const template = {
        name: 'test-template',
        description: 'Test description',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        metadata: {
          category: 'test',
          tags: ['test', 'notification']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const summaries = registry.listSummaries();

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toEqual({
        name: 'test-template',
        description: 'Test description',
        category: 'test',
        tags: ['test', 'notification'],
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      });
    });

    it('应该不包含 condition 和 action 字段', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const summaries = registry.listSummaries();

      expect(summaries[0]).not.toHaveProperty('condition');
      expect(summaries[0]).not.toHaveProperty('action');
    });
  });

  describe('clear - 清空所有触发器模板', () => {
    it('应该清空所有触发器模板', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });

  describe('size - 获取触发器模板数量', () => {
    it('应该返回已注册的触发器模板数量', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(registry.size()).toBe(2);
    });

    it('应该返回 0 当没有触发器模板', () => {
      expect(registry.size()).toBe(0);
    });
  });

  describe('search - 搜索触发器模板', () => {
    it('应该根据关键词搜索触发器模板', () => {
      const templates = [
        {
          name: 'notification-template',
          description: 'Notification template for testing',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          metadata: { tags: ['notification', 'test'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'pause-template',
          description: 'Pause template',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      const results = registry.search('notification');

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('notification-template');
    });

    it('应该不区分大小写', () => {
      const template = {
        name: 'Notification-Template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const results = registry.search('notification');

      expect(results).toHaveLength(1);
    });

    it('应该搜索名称、描述、标签和分类', () => {
      const template = {
        name: 'test-template',
        description: 'AI template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        metadata: {
          category: 'ai',
          tags: ['machine-learning']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(registry.search('ai')).toHaveLength(1);
      expect(registry.search('machine-learning')).toHaveLength(1);
    });

    it('应该返回空数组当没有匹配的触发器模板', () => {
      const result = registry.search('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('export - 导出触发器模板', () => {
    it('应该成功导出触发器模板为 JSON 字符串', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const json = registry.export('test-template');

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(template);
    });

    it('应该抛出 NotFoundError 当触发器模板不存在', () => {
      expect(() => {
        registry.export('non-existent-template');
      }).toThrow(NotFoundError);
    });
  });

  describe('import - 导入触发器模板', () => {
    it('应该成功从 JSON 字符串导入触发器模板', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const json = JSON.stringify(template);

      const name = registry.import(json);

      expect(name).toBe('test-template');
      expect(registry.has('test-template')).toBe(true);
    });

    it('应该抛出 ValidationError 当 JSON 无效', () => {
      expect(() => {
        registry.import('invalid json');
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当触发器配置无效', () => {
      const invalidTemplate = {
        name: 'test-template',
        condition: null as any,
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const json = JSON.stringify(invalidTemplate);

      expect(() => {
        registry.import(json);
      }).toThrow(ValidationError);
    });
  });

  describe('convertToWorkflowTrigger - 转换为 WorkflowTrigger', () => {
    it('应该成功转换为 WorkflowTrigger', () => {
      const template = {
        name: 'test-template',
        description: 'Test template',
        condition: {
          eventType: EventType.NODE_COMPLETED,
          metadata: { test: 'value' }
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: 'test' },
          metadata: { action: 'value' }
        },
        enabled: true,
        maxTriggers: 10,
        metadata: {
          category: 'test',
          tags: ['test']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-1',
        'Custom Trigger Name'
      );

      expect(workflowTrigger.id).toBe('trigger-1');
      expect(workflowTrigger.name).toBe('Custom Trigger Name');
      expect(workflowTrigger.description).toBe('Test template');
      expect(workflowTrigger.condition).toEqual(template.condition);
      expect(workflowTrigger.action).toEqual(template.action);
      expect(workflowTrigger.enabled).toBe(true);
      expect(workflowTrigger.maxTriggers).toBe(10);
      expect(workflowTrigger.metadata).toEqual(template.metadata);
    });

    it('应该支持配置覆盖', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: { message: 'original' }
        },
        enabled: true,
        maxTriggers: 10,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const configOverride = {
        condition: {
          metadata: { override: 'value' }
        },
        action: {
          parameters: { message: 'overridden' }
        },
        enabled: false,
        maxTriggers: 5
      };

      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-1',
        undefined,
        configOverride
      );

      expect(workflowTrigger.condition.metadata).toEqual({ override: 'value' });
      expect(workflowTrigger.action.parameters).toEqual({ message: 'overridden' });
      expect(workflowTrigger.enabled).toBe(false);
      expect(workflowTrigger.maxTriggers).toBe(5);
    });

    it('应该抛出 NotFoundError 当触发器模板不存在', () => {
      expect(() => {
        registry.convertToWorkflowTrigger('non-existent-template', 'trigger-1');
      }).toThrow(NotFoundError);
    });

    it('应该使用模板名称作为默认触发器名称', () => {
      const template = {
        name: 'test-template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-1'
      );

      expect(workflowTrigger.name).toBe('test-template');
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的触发器模板生命周期', () => {
      // 1. 注册触发器模板
      const template = {
        name: 'test-template',
        description: 'Test template',
        condition: {
          eventType: EventType.NODE_COMPLETED
        },
        action: {
          type: TriggerActionType.SEND_NOTIFICATION,
          parameters: {}
        },
        metadata: {
          category: 'test',
          tags: ['test', 'notification']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);
      expect(registry.has('test-template')).toBe(true);

      // 2. 获取触发器模板
      const retrieved = registry.get('test-template');
      expect(retrieved).toEqual(template);

      // 3. 更新触发器模板
      registry.update('test-template', { description: 'Updated description' });
      const updated = registry.get('test-template');
      expect(updated?.description).toBe('Updated description');

      // 4. 搜索触发器模板
      const searchResults = registry.search('updated');
      expect(searchResults).toHaveLength(1);

      // 5. 转换为 WorkflowTrigger
      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-1'
      );
      expect(workflowTrigger.id).toBe('trigger-1');

      // 6. 导出触发器模板
      const json = registry.export('test-template');
      expect(typeof json).toBe('string');

      // 7. 删除触发器模板
      registry.unregister('test-template');
      expect(registry.has('test-template')).toBe(false);
    });

    it('应该支持批量操作', () => {
      const templates = [
        {
          name: 'template-1',
          condition: {
            eventType: EventType.NODE_COMPLETED
          },
          action: {
            type: TriggerActionType.SEND_NOTIFICATION,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          condition: {
            eventType: EventType.THREAD_STARTED
          },
          action: {
            type: TriggerActionType.PAUSE_THREAD,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          condition: {
            eventType: EventType.NODE_FAILED
          },
          action: {
            type: TriggerActionType.SET_VARIABLE,
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      // 批量注册
      registry.registerBatch(templates);
      expect(registry.size()).toBe(3);

      // 批量删除
      registry.unregisterBatch(['template-1', 'template-2']);
      expect(registry.size()).toBe(1);
      expect(registry.has('template-3')).toBe(true);
    });
  });
});