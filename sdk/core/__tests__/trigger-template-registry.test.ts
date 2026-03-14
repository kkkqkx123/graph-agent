/**
 * Trigger Template Registry 集成测试
 *
 * 测试场景：
 * - 注册功能
 * - 查询功能
 * - 更新和删除
 * - 搜索和导入导出
 * - 模板转换
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TriggerTemplateRegistry } from '../services/trigger-template-registry.js';
import type { TriggerTemplate, TriggerTemplateSummary } from '@modular-agent/types';
import { EventType } from '@modular-agent/types';
import { ConfigurationValidationError, TriggerTemplateNotFoundError } from '@modular-agent/types';

describe('Trigger Template Registry - 触发器模板注册表', () => {
  let registry: TriggerTemplateRegistry;

  beforeEach(() => {
    registry = new TriggerTemplateRegistry();
  });

  describe('注册功能', () => {
    it('测试注册触发器模板：成功注册有效的触发器模板', () => {
      const template: TriggerTemplate = {
        name: 'test-template',
        description: '测试触发器模板',
        condition: {
          eventType: 'THREAD_STARTED'
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: '${threadId}'
          }
        },
        enabled: true,
        maxTriggers: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(registry.has('test-template')).toBe(true);
      expect(registry.get('test-template')).toEqual(template);
    });

    it('测试重复注册：重复注册同名模板应抛出错误', () => {
      const template: TriggerTemplate = {
        name: 'test-template',
        description: '测试触发器模板',
        condition: {
          eventType: 'THREAD_STARTED'
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: '${threadId}'
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(() => registry.register(template)).toThrow(ConfigurationValidationError);
    });

    it('测试批量注册：批量注册多个触发器模板', () => {
      const templates: TriggerTemplate[] = [
        {
          name: 'template-1',
          description: '模板1',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          description: '模板2',
          condition: { eventType: 'THREAD_COMPLETED' },
          action: { type: 'pause_thread', parameters: { threadId: '${threadId}' } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          description: '模板3',
          condition: { eventType: 'NODE_FAILED' },
          action: { type: 'resume_thread', parameters: { threadId: '${threadId}' } },
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

    it('测试验证模板配置：缺少必需字段应抛出错误', () => {
      const template: any = {
        name: 'test-template',
        // condition 缺失
        action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } }
      };

      expect(() => registry.register(template)).toThrow(ConfigurationValidationError);
    });

    it('测试验证事件类型：无效的事件类型应抛出错误', () => {
      const template: any = {
        name: 'test-template',
        condition: {
          eventType: 'INVALID_EVENT_TYPE'
        },
        action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } }
      };

      expect(() => registry.register(template)).toThrow(ConfigurationValidationError);
    });

    it('测试验证动作类型：无效的动作类型应抛出错误', () => {
      const template: any = {
        name: 'test-template',
        condition: {
          eventType: 'THREAD_STARTED'
        },
        action: {
          type: 'invalid_action_type',
          parameters: { threadId: '${threadId}' }
        }
      };

      expect(() => registry.register(template)).toThrow(ConfigurationValidationError);
    });
  });

  describe('查询功能', () => {
    beforeEach(() => {
      const templates: TriggerTemplate[] = [
        {
          name: 'template-1',
          description: '第一个模板',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
          metadata: { category: 'lifecycle', tags: ['thread'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          description: '第二个模板',
          condition: { eventType: 'NODE_FAILED' },
          action: { type: 'pause_thread', parameters: { threadId: '${threadId}' } },
          metadata: { category: 'error', tags: ['node', 'error'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);
    });

    it('测试获取触发器模板：根据名称获取已注册的模板', () => {
      const template = registry.get('template-1');

      expect(template).toBeDefined();
      expect(template!.name).toBe('template-1');
    });

    it('测试获取不存在的模板：返回undefined', () => {
      const template = registry.get('non-existent');

      expect(template).toBeUndefined();
    });

    it('测试检查存在性：has方法正确返回模板是否存在', () => {
      expect(registry.has('template-1')).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });

    it('测试列出所有模板：list方法返回所有已注册模板', () => {
      const templates = registry.list();

      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.name)).toEqual(expect.arrayContaining(['template-1', 'template-2']));
    });

    it('测试列出摘要：listSummaries返回模板摘要信息', () => {
      const summaries = registry.listSummaries();

      expect(summaries).toHaveLength(2);
      expect(summaries[0]).toBeDefined();
      expect(summaries[0]!).toMatchObject({
        name: 'template-1',
        description: '第一个模板',
        category: 'lifecycle',
        tags: ['thread']
      });
      expect(summaries[0]!.createdAt).toBeDefined();
      expect(summaries[0]!.updatedAt).toBeDefined();
    });

    it('测试获取模板数量：size方法返回模板数量', () => {
      expect(registry.size()).toBe(2);
    });
  });

  describe('更新和删除', () => {
    beforeEach(() => {
      const template: TriggerTemplate = {
        name: 'test-template',
        description: '原始描述',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);
    });

    it('测试更新触发器模板：update方法正确更新模板配置', async () => {
      const originalTemplate = registry.get('test-template');
      const originalUpdatedAt = originalTemplate!.updatedAt;

      // 等待1毫秒确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1));

      registry.update('test-template', {
        description: '更新后的描述',
        enabled: false
      });

      const updatedTemplate = registry.get('test-template');

      expect(updatedTemplate).toBeDefined();
      expect(updatedTemplate!.description).toBe('更新后的描述');
      expect(updatedTemplate!.enabled).toBe(false);
      expect(updatedTemplate!.name).toBe('test-template'); // 名称不应更改
      expect(updatedTemplate!.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });

    it('测试更新不存在的模板：应抛出错误', () => {
      expect(() => {
        registry.update('non-existent', { description: '新描述' });
      }).toThrow(TriggerTemplateNotFoundError);
    });

    it('测试更新为无效配置：应抛出验证错误', () => {
      expect(() => {
        registry.update('test-template', {
          name: 'invalid-name-change' // 不应允许更改名称
        } as any);
      }).toThrow();
    });

    it('测试删除触发器模板：unregister方法正确删除模板', () => {
      expect(registry.has('test-template')).toBe(true);

      registry.unregister('test-template');

      expect(registry.has('test-template')).toBe(false);
      expect(registry.get('test-template')).toBeUndefined();
    });

    it('测试删除不存在的模板：应抛出错误', () => {
      expect(() => {
        registry.unregister('non-existent');
      }).toThrow(TriggerTemplateNotFoundError);
    });

    it('测试批量删除：unregisterBatch批量删除多个模板', () => {
      const templates: TriggerTemplate[] = [
        {
          name: 'template-1',
          description: '模板1',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          description: '模板2',
          condition: { eventType: 'THREAD_COMPLETED' },
          action: { type: 'pause_thread', parameters: { threadId: '${threadId}' } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          description: '模板3',
          condition: { eventType: 'NODE_FAILED' },
          action: { type: 'resume_thread', parameters: { threadId: '${threadId}' } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(registry.size()).toBe(4); // 包括beforeEach中的模板

      registry.unregisterBatch(['template-1', 'template-2']);

      expect(registry.size()).toBe(2);
      expect(registry.has('template-1')).toBe(false);
      expect(registry.has('template-2')).toBe(false);
      expect(registry.has('template-3')).toBe(true);
      expect(registry.has('test-template')).toBe(true);
    });

    it('测试清空所有：clear方法清空所有模板', () => {
      const templates: TriggerTemplate[] = [
        {
          name: 'template-1',
          description: '模板1',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          description: '模板2',
          condition: { eventType: 'THREAD_COMPLETED' },
          action: { type: 'pause_thread', parameters: { threadId: '${threadId}' } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(registry.size()).toBe(3);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.list()).toHaveLength(0);
    });
  });

  describe('搜索功能', () => {
    beforeEach(() => {
      const templates: TriggerTemplate[] = [
        {
          name: 'thread-started-template',
          description: '在线程启动时触发',
          condition: { eventType: 'THREAD_STARTED' },
          action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
          metadata: { category: 'lifecycle', tags: ['thread', 'lifecycle'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'node-failed-template',
          description: '在节点失败时触发',
          condition: { eventType: 'NODE_FAILED' },
          action: { type: 'pause_thread', parameters: { threadId: '${threadId}' } },
          metadata: { category: 'error', tags: ['node', 'error'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'compression-template',
          description: '上下文压缩触发器',
          condition: { eventType: 'MESSAGE_ADDED' },
          action: { type: 'execute_script', parameters: { scriptName: 'compress-context' } },
          metadata: { category: 'optimization', tags: ['compression', 'message'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);
    });

    it('测试搜索功能：search方法根据关键词搜索模板', () => {
      const results = registry.search('thread');

      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('thread-started-template');
    });

    it('测试搜索描述：可以根据描述关键词搜索', () => {
      const results = registry.search('失败');

      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('node-failed-template');
    });

    it('测试搜索标签：可以根据标签搜索', () => {
      const results = registry.search('compression');

      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('compression-template');
    });

    it('测试搜索分类：可以根据分类搜索', () => {
      const results = registry.search('error');

      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('node-failed-template');
    });

    it('测试搜索无结果：关键词不匹配时返回空数组', () => {
      const results = registry.search('non-existent-keyword');

      expect(results).toHaveLength(0);
    });

    it('测试搜索不区分大小写：搜索应不区分大小写', () => {
      const results1 = registry.search('THREAD');
      const results2 = registry.search('thread');

      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results1[0]!.name).toBe(results2[0]!.name);
    });
  });

  describe('导入导出功能', () => {
    beforeEach(() => {
      const template: TriggerTemplate = {
        name: 'export-test-template',
        description: '用于测试导入导出的模板',
        condition: { eventType: 'THREAD_STARTED' },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: '${threadId}'
          }
        },
        metadata: { key: 'value' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);
    });

    it('测试导出功能：export方法导出模板为JSON', () => {
      const json = registry.export('export-test-template');

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('export-test-template');
      expect(parsed.description).toBe('用于测试导入导出的模板');
      expect(parsed.metadata).toEqual({ key: 'value' });
    });

    it('测试导出不存在的模板：应抛出错误', () => {
      expect(() => {
        registry.export('non-existent');
      }).toThrow(TriggerTemplateNotFoundError);
    });

    it('测试导入功能：import方法从JSON导入模板', () => {
      const json = JSON.stringify({
        name: 'import-test-template',
        description: '从JSON导入的模板',
        condition: { eventType: 'THREAD_COMPLETED' },
        action: { type: 'pause_thread', parameters: { threadId: '${threadId}' } },
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const templateName = registry.import(json);

      expect(templateName).toBe('import-test-template');
      expect(registry.has('import-test-template')).toBe(true);
    });

    it('测试导入无效JSON：应抛出错误', () => {
      const invalidJson = '{ invalid json }';

      expect(() => {
        registry.import(invalidJson);
      }).toThrow(ConfigurationValidationError);
    });

    it('测试导入无效模板配置：应抛出验证错误', () => {
      const invalidConfig = JSON.stringify({
        name: 'invalid-template',
        // condition 缺失
        action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } }
      });

      expect(() => {
        registry.import(invalidConfig);
      }).toThrow(ConfigurationValidationError);
    });

    it('测试导入重复模板：应抛出错误', () => {
      const json = registry.export('export-test-template');

      expect(() => {
        registry.import(json);
      }).toThrow(ConfigurationValidationError);
    });
  });

  describe('模板转换', () => {
    beforeEach(() => {
      const template: TriggerTemplate = {
        name: 'test-template',
        description: '测试模板',
        condition: {
          eventType: 'THREAD_STARTED'
        },
        action: {
          type: 'stop_thread',
          parameters: {
            threadId: '${threadId}'
          }
        },
        enabled: true,
        maxTriggers: 10,
        metadata: { category: 'test' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);
    });

    it('测试转换为工作流触发器：convertToWorkflowTrigger正确转换模板', () => {
      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-123',
        '自定义触发器名称'
      );

      expect(workflowTrigger.id).toBe('trigger-123');
      expect(workflowTrigger.name).toBe('自定义触发器名称');
      expect(workflowTrigger.description).toBe('测试模板');
      expect(workflowTrigger.condition.eventType).toBe('THREAD_STARTED');
      expect(workflowTrigger.action.type).toBe('stop_thread');
      expect(workflowTrigger.enabled).toBe(true);
      expect(workflowTrigger.maxTriggers).toBe(10);
      expect(workflowTrigger.metadata).toEqual({ category: 'test' });
    });

    it('测试转换未指定triggerName：使用模板名称', () => {
      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-123'
        // triggerName 未指定
      );

      expect(workflowTrigger.name).toBe('test-template');
    });

    it('测试配置覆盖：转换时支持配置覆盖', () => {
      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-123',
        '自定义触发器名称',
        {
          condition: {
            eventType: 'THREAD_COMPLETED'
          },
          action: {
            type: 'pause_thread'
          },
          enabled: false,
          maxTriggers: 20
        }
      );

      expect(workflowTrigger.condition.eventType).toBe('THREAD_COMPLETED');
      expect(workflowTrigger.action.type).toBe('pause_thread');
      expect(workflowTrigger.enabled).toBe(false);
      expect(workflowTrigger.maxTriggers).toBe(20);
    });

    it('测试部分配置覆盖：只覆盖指定字段', () => {
      const workflowTrigger = registry.convertToWorkflowTrigger(
        'test-template',
        'trigger-123',
        '自定义触发器名称',
        {
          enabled: false
          // 只覆盖 enabled
        }
      );

      expect(workflowTrigger.enabled).toBe(false);
      expect(workflowTrigger.maxTriggers).toBe(10); // 应保持原值
      expect(workflowTrigger.condition.eventType).toBe('THREAD_STARTED'); // 应保持原值
      expect(workflowTrigger.action.type).toBe('stop_thread'); // 应保持原值
    });

    it('测试转换不存在的模板：应抛出错误', () => {
      expect(() => {
        registry.convertToWorkflowTrigger(
          'non-existent',
          'trigger-123'
        );
      }).toThrow(TriggerTemplateNotFoundError);
    });
  });

  describe('边界情况', () => {
    it('测试空注册表操作：在空注册表上执行操作', () => {
      const emptyRegistry = new TriggerTemplateRegistry();

      expect(emptyRegistry.size()).toBe(0);
      expect(emptyRegistry.list()).toHaveLength(0);
      expect(emptyRegistry.get('any-name')).toBeUndefined();
      expect(emptyRegistry.has('any-name')).toBe(false);
      expect(emptyRegistry.search('any-keyword')).toHaveLength(0);
    });

    it('测试模板名称包含特殊字符', () => {
      const template: TriggerTemplate = {
        name: 'template-with-special-chars_123!@#',
        description: '包含特殊字符的模板',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(registry.has('template-with-special-chars_123!@#')).toBe(true);
      expect(registry.get('template-with-special-chars_123!@#')?.name).toBe('template-with-special-chars_123!@#');
    });

    it('测试模板包含大量metadata', () => {
      const largeMetadata: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      const template: TriggerTemplate = {
        name: 'large-metadata-template',
        description: '包含大量metadata的模板',
        condition: { eventType: 'THREAD_STARTED' },
        action: { type: 'stop_thread', parameters: { threadId: '${threadId}' } },
        metadata: largeMetadata,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const retrieved = registry.get('large-metadata-template');
      expect(retrieved?.metadata).toEqual(largeMetadata);
    });
  });
});