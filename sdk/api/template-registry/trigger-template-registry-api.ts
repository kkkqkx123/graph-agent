/**
 * 触发器模板注册表 API
 * 提供用户友好的 API 接口用于管理触发器模板
 */

import type {
  TriggerTemplate,
  TriggerTemplateSummary,
  TriggerTemplateFilter
} from '../../types/trigger-template';
import { triggerTemplateRegistry, type TriggerTemplateRegistry } from '../../core/services/trigger-template-registry';

/**
 * 触发器模板注册表 API 类
 */
export class TriggerTemplateRegistryAPI {
  private registry: TriggerTemplateRegistry;

  constructor(registry?: TriggerTemplateRegistry) {
    this.registry = registry || triggerTemplateRegistry;
  }

  /**
   * 注册触发器模板
   * @param template 触发器模板
   * @throws ValidationError 如果触发器配置无效或名称已存在
   */
  registerTemplate(template: TriggerTemplate): void {
    this.registry.register(template);
  }

  /**
   * 批量注册触发器模板
   * @param templates 触发器模板数组
   */
  registerTemplates(templates: TriggerTemplate[]): void {
    this.registry.registerBatch(templates);
  }

  /**
   * 获取触发器模板
   * @param name 触发器模板名称
   * @returns 触发器模板，如果不存在则返回undefined
   */
  getTemplate(name: string): TriggerTemplate | undefined {
    return this.registry.get(name);
  }

  /**
   * 更新触发器模板
   * @param name 触发器模板名称
   * @param updates 更新内容
   * @throws NotFoundError 如果触发器模板不存在
   * @throws ValidationError 如果更新后的配置无效
   */
  updateTemplate(name: string, updates: Partial<TriggerTemplate>): void {
    this.registry.update(name, updates);
  }

  /**
   * 删除触发器模板
   * @param name 触发器模板名称
   * @throws NotFoundError 如果触发器模板不存在
   */
  deleteTemplate(name: string): void {
    this.registry.unregister(name);
  }

  /**
   * 批量删除触发器模板
   * @param names 触发器模板名称数组
   */
  deleteTemplates(names: string[]): void {
    this.registry.unregisterBatch(names);
  }

  /**
   * 获取触发器模板列表
   * @param filter 过滤条件（可选）
   * @returns 触发器模板数组
   */
  getTemplates(filter?: TriggerTemplateFilter): TriggerTemplate[] {
    let templates = this.registry.list();

    if (filter?.keyword) {
      templates = this.registry.search(filter.keyword);
    }

    if (filter?.category) {
      templates = templates.filter(t => t.metadata?.['category'] === filter.category);
    }

    if (filter?.tags && filter.tags.length > 0) {
      templates = templates.filter(t => {
        const templateTags = t.metadata?.['tags'] || [];
        return filter.tags!.every(tag => templateTags.includes(tag));
      });
    }

    if (filter?.name) {
      templates = templates.filter(t => t.name === filter.name);
    }

    return templates;
  }

  /**
   * 获取触发器模板摘要列表
   * @param filter 过滤条件（可选）
   * @returns 触发器模板摘要数组
   */
  getTemplateSummaries(filter?: TriggerTemplateFilter): TriggerTemplateSummary[] {
    const templates = this.getTemplates(filter);

    return templates.map(template => {
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
   * 检查触发器模板是否存在
   * @param name 触发器模板名称
   * @returns 是否存在
   */
  hasTemplate(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * 获取触发器模板数量
   * @returns 触发器模板数量
   */
  getTemplateCount(): number {
    return this.registry.size();
  }

  /**
   * 清空所有触发器模板
   */
  clearTemplates(): void {
    this.registry.clear();
  }

  /**
   * 搜索触发器模板
   * @param keyword 搜索关键词
   * @returns 匹配的触发器模板数组
   */
  searchTemplates(keyword: string): TriggerTemplate[] {
    return this.registry.search(keyword);
  }

  /**
   * 导出触发器模板
   * @param name 触发器模板名称
   * @returns JSON字符串
   * @throws NotFoundError 如果触发器模板不存在
   */
  exportTemplate(name: string): string {
    return this.registry.export(name);
  }

  /**
   * 导入触发器模板
   * @param json JSON字符串
   * @returns 触发器模板名称
   * @throws ValidationError 如果JSON无效或触发器配置无效
   */
  importTemplate(json: string): string {
    return this.registry.import(json);
  }

  /**
   * 批量导入触发器模板
   * @param jsons JSON字符串数组
   * @returns 触发器模板名称数组
   */
  importTemplates(jsons: string[]): string[] {
    const names: string[] = [];
    for (const json of jsons) {
      names.push(this.importTemplate(json));
    }
    return names;
  }

  /**
   * 批量导出触发器模板
   * @param names 触发器模板名称数组
   * @returns JSON字符串数组
   */
  exportTemplates(names: string[]): string[] {
    const jsons: string[] = [];
    for (const name of names) {
      jsons.push(this.exportTemplate(name));
    }
    return jsons;
  }
}

/**
 * 全局触发器模板注册表 API 实例
 */
export const triggerTemplateRegistryAPI = new TriggerTemplateRegistryAPI();