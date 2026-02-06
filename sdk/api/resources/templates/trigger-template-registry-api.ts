/**
 * 触发器模板注册表 API
 * 提供用户友好的 API 接口用于管理触发器模板
 * 重构版本：继承GenericResourceAPI，提高代码复用性和一致性
 */

import type {
  TriggerTemplate,
  TriggerTemplateSummary,
  TriggerTemplateFilter
} from '../../../types/trigger-template';
import { triggerTemplateRegistry, type TriggerTemplateRegistry } from '../../../core/services/trigger-template-registry';
import { GenericResourceAPI, type ResourceAPIOptions } from '../generic-resource-api';

/**
 * TriggerTemplateRegistryAPI配置选项
 */
export interface TriggerTemplateRegistryAPIOptions extends ResourceAPIOptions {
  /** 是否启用缓存（默认true） */
  enableCache?: boolean;
  /** 缓存TTL（毫秒，默认5000） */
  cacheTTL?: number;
  /** 是否启用日志（默认false） */
  enableLogging?: boolean;
  /** 是否启用验证（默认true） */
  enableValidation?: boolean;
}

/**
 * 触发器模板注册表 API 类
 * 
 * 重构说明：
 * - 继承GenericResourceAPI，复用通用CRUD操作
 * - 实现所有抽象方法以适配TriggerTemplateRegistry
 * - 保留所有原有API方法以保持向后兼容
 * - 新增缓存、日志、验证等增强功能
 */
export class TriggerTemplateRegistryAPI extends GenericResourceAPI<TriggerTemplate, string, TriggerTemplateFilter> {
  private registry: TriggerTemplateRegistry;

  constructor(registry?: TriggerTemplateRegistry, options?: TriggerTemplateRegistryAPIOptions) {
    const apiOptions: Required<ResourceAPIOptions> = {
      enableValidation: options?.enableValidation ?? true
    };
    super(apiOptions);
    this.registry = registry || triggerTemplateRegistry;
  }

  /**
   * 获取单个触发器模板
   * @param id 触发器模板名称
   * @returns 触发器模板，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<TriggerTemplate | null> {
    const template = this.registry.get(id);
    return template || null;
  }

  /**
   * 获取所有触发器模板
   * @returns 触发器模板数组
   */
  protected async getAllResources(): Promise<TriggerTemplate[]> {
    return this.registry.list();
  }

  /**
   * 创建触发器模板
   * @param resource 触发器模板
   */
  protected async createResource(resource: TriggerTemplate): Promise<void> {
    this.registry.register(resource);
  }

  /**
   * 更新触发器模板
   * @param id 触发器模板名称
   * @param updates 更新内容
   */
  protected async updateResource(id: string, updates: Partial<TriggerTemplate>): Promise<void> {
    this.registry.update(id, updates);
  }

  /**
   * 删除触发器模板
   * @param id 触发器模板名称
   */
  protected async deleteResource(id: string): Promise<void> {
    this.registry.unregister(id);
  }

  /**
   * 应用过滤条件
   * @param resources 触发器模板数组
   * @param filter 过滤条件
   * @returns 过滤后的触发器模板数组
   */
  protected applyFilter(resources: TriggerTemplate[], filter: TriggerTemplateFilter): TriggerTemplate[] {
    let templates = resources;

    if (filter.keyword) {
      templates = this.registry.search(filter.keyword);
    }

    if (filter.category) {
      templates = templates.filter(t => t.metadata?.['category'] === filter.category);
    }

    if (filter.tags && filter.tags.length > 0) {
      templates = templates.filter(t => {
        const templateTags = t.metadata?.['tags'] || [];
        return filter.tags!.every(tag => templateTags.includes(tag));
      });
    }

    if (filter.name) {
      templates = templates.filter(t => t.name === filter.name);
    }

    return templates;
  }

  /**
   * 获取触发器模板摘要列表
   * @param filter 过滤条件（可选）
   * @returns 触发器模板摘要数组
   */
  async getTemplateSummaries(filter?: TriggerTemplateFilter): Promise<TriggerTemplateSummary[]> {
    const result = await this.getAll(filter);
    if (!result.success) {
      return [];
    }

    return result.data.map(template => {
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