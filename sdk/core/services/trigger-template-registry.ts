/**
 * 触发器模板注册表
 * 负责触发器模板的注册、查询和管理
 *
 * 本模块导出全局单例实例，不导出类定义
 */

import type {
  TriggerTemplate,
  TriggerTemplateSummary
} from '@modular-agent/types';
import type { WorkflowTrigger } from '@modular-agent/types';
import { ValidationError, NotFoundError, ConfigurationValidationError, TriggerTemplateNotFoundError } from '@modular-agent/types';
import { EventType } from '@modular-agent/types';
import { TriggerActionType } from '@modular-agent/types';

/**
 * 触发器模板注册表类
 */
class TriggerTemplateRegistry {
  private templates: Map<string, TriggerTemplate> = new Map();

  /**
   * 注册触发器模板
   * @param template 触发器模板
   * @throws ValidationError 如果触发器配置无效或名称已存在
   */
  register(template: TriggerTemplate): void {
    // 验证触发器配置
    this.validateTemplate(template);

    // 检查名称是否已存在
    if (this.templates.has(template.name)) {
      throw new ConfigurationValidationError(
        `Trigger template with name '${template.name}' already exists`,
        {
          configType: 'trigger',
          configPath: 'template.name'
        }
      );
    }

    // 注册触发器模板
    this.templates.set(template.name, template);
  }

  /**
   * 批量注册触发器模板
   * @param templates 触发器模板数组
   */
  registerBatch(templates: TriggerTemplate[]): void {
    for (const template of templates) {
      this.register(template);
    }
  }

  /**
   * 获取触发器模板
   * @param name 触发器模板名称
   * @returns 触发器模板，如果不存在则返回undefined
   */
  get(name: string): TriggerTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * 检查触发器模板是否存在
   * @param name 触发器模板名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * 更新触发器模板
   * @param name 触发器模板名称
   * @param updates 更新内容
   * @throws NotFoundError 如果触发器模板不存在
   * @throws ValidationError 如果更新后的配置无效
   */
  update(name: string, updates: Partial<TriggerTemplate>): void {
    const template = this.templates.get(name);
    if (!template) {
      throw new TriggerTemplateNotFoundError(
        `Trigger template '${name}' not found`,
        name
      );
    }

    // 创建更新后的模板
    const updatedTemplate: TriggerTemplate = {
      ...template,
      ...updates,
      name: template.name, // 名称不可更改
      updatedAt: Date.now()
    };

    // 验证更新后的模板
    this.validateTemplate(updatedTemplate);

    // 更新模板
    this.templates.set(name, updatedTemplate);
  }

  /**
   * 删除触发器模板
   * @param name 触发器模板名称
   * @throws NotFoundError 如果触发器模板不存在
   */
  unregister(name: string): void {
    if (!this.templates.has(name)) {
      throw new TriggerTemplateNotFoundError(
        `Trigger template '${name}' not found`,
        name
      );
    }
    this.templates.delete(name);
  }

  /**
   * 批量删除触发器模板
   * @param names 触发器模板名称数组
   */
  unregisterBatch(names: string[]): void {
    for (const name of names) {
      this.unregister(name);
    }
  }

  /**
   * 列出所有触发器模板
   * @returns 触发器模板数组
   */
  list(): TriggerTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 列出所有触发器模板摘要
   * @returns 触发器模板摘要数组
   */
  listSummaries(): TriggerTemplateSummary[] {
    return this.list().map(template => {
      const summary: TriggerTemplateSummary = {
        name: template.name,
        description: template.description,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      };

      if (template.metadata?.['category']) {
        summary.category = template.metadata['category'];
      }
      if (template.metadata?.['tags']) {
        summary.tags = template.metadata['tags'];
      }

      return summary;
    });
  }

  /**
   * 清空所有触发器模板
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * 获取触发器模板数量
   * @returns 触发器模板数量
   */
  size(): number {
    return this.templates.size;
  }

  /**
   * 搜索触发器模板
   * @param keyword 搜索关键词
   * @returns 匹配的触发器模板数组
   */
  search(keyword: string): TriggerTemplate[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.list().filter(template => {
      return (
        template.name.toLowerCase().includes(lowerKeyword) ||
        template.description?.toLowerCase().includes(lowerKeyword) ||
        template.metadata?.['tags']?.some((tag: string) => tag.toLowerCase().includes(lowerKeyword)) ||
        template.metadata?.['category']?.toLowerCase().includes(lowerKeyword)
      );
    });
  }

  /**
   * 验证触发器模板
   * @param template 触发器模板
   * @throws ValidationError 如果触发器配置无效
   */
  private validateTemplate(template: TriggerTemplate): void {
    // 验证必需字段
    if (!template.name || typeof template.name !== 'string') {
      throw new ConfigurationValidationError(
        'Trigger template name is required and must be a string',
        {
          configType: 'trigger',
          configPath: 'template.name'
        }
      );
    }

    if (!template.condition) {
      throw new ConfigurationValidationError(
        'Trigger template condition is required',
        {
          configType: 'trigger',
          configPath: 'template.condition'
        }
      );
    }

    if (!template.action) {
      throw new ConfigurationValidationError(
        'Trigger template action is required',
        {
          configType: 'trigger',
          configPath: 'template.action'
        }
      );
    }

    // 验证触发条件
    if (!template.condition.eventType) {
      throw new ConfigurationValidationError(
        'Trigger template condition eventType is required',
        {
          configType: 'trigger',
          configPath: 'template.condition.eventType'
        }
      );
    }

    // 验证事件类型是否有效
    const validEventTypes = Object.values(EventType);
    if (!validEventTypes.includes(template.condition.eventType)) {
      throw new ConfigurationValidationError(
        `Invalid event type: ${template.condition.eventType}`,
        {
          configType: 'trigger',
          configPath: 'template.condition.eventType'
        }
      );
    }

    // 验证触发动作
    if (!template.action.type) {
      throw new ConfigurationValidationError(
        'Trigger template action type is required',
        {
          configType: 'trigger',
          configPath: 'template.action.type'
        }
      );
    }

    // 验证动作类型是否有效
    const validActionTypes = Object.values(TriggerActionType);
    if (!validActionTypes.includes(template.action.type)) {
      throw new ConfigurationValidationError(
        `Invalid action type: ${template.action.type}`,
        {
          configType: 'trigger',
          configPath: 'template.action.type'
        }
      );
    }
  }

  /**
   * 导出触发器模板为JSON字符串
   * @param name 触发器模板名称
   * @returns JSON字符串
   * @throws NotFoundError 如果触发器模板不存在
   */
  export(name: string): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new TriggerTemplateNotFoundError(
        `Trigger template '${name}' not found`,
        name
      );
    }
    return JSON.stringify(template, null, 2);
  }

  /**
   * 从JSON字符串导入触发器模板
   * @param json JSON字符串
   * @returns 触发器模板名称
   * @throws ValidationError 如果JSON无效或触发器配置无效
   */
  import(json: string): string {
    try {
      const template = JSON.parse(json) as TriggerTemplate;
      this.register(template);
      return template.name;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ConfigurationValidationError(
        `Failed to import trigger template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          configType: 'trigger',
          configPath: 'json'
        }
      );
    }
  }

  /**
   * 将触发器模板转换为 WorkflowTrigger
   * @param templateName 触发器模板名称
   * @param triggerId 触发器ID
   * @param triggerName 触发器名称（可选）
   * @param configOverride 配置覆盖（可选）
   * @returns WorkflowTrigger
   * @throws NotFoundError 如果触发器模板不存在
   */
  convertToWorkflowTrigger(
    templateName: string,
    triggerId: string,
    triggerName?: string,
    configOverride?: {
      condition?: any;
      action?: any;
      enabled?: boolean;
      maxTriggers?: number;
    }
  ): WorkflowTrigger {
    const template = this.get(templateName);
    if (!template) {
      throw new TriggerTemplateNotFoundError(
        `Trigger template '${templateName}' not found`,
        templateName
      );
    }

    // 合并配置覆盖
    const mergedCondition = configOverride?.condition
      ? { ...template.condition, ...configOverride.condition }
      : template.condition;

    const mergedAction = configOverride?.action
      ? { ...template.action, ...configOverride.action }
      : template.action;

    // 创建 WorkflowTrigger
    const workflowTrigger: WorkflowTrigger = {
      id: triggerId,
      name: triggerName || template.name,
      description: template.description,
      condition: mergedCondition,
      action: mergedAction,
      enabled: configOverride?.enabled ?? template.enabled,
      maxTriggers: configOverride?.maxTriggers ?? template.maxTriggers,
      metadata: template.metadata
    };

    return workflowTrigger;
  }
}

/**
 * 全局触发器模板注册表单例实例
 */
export const triggerTemplateRegistry = new TriggerTemplateRegistry();

/**
 * 导出TriggerTemplateRegistry类供测试使用
 * 注意：生产代码应使用单例 triggerTemplateRegistry，此类仅供测试使用
 */
export { TriggerTemplateRegistry };