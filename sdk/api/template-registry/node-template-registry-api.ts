/**
 * NodeTemplateRegistryAPI - 节点模板管理API
 * 封装NodeTemplateRegistry，提供节点模板的CRUD操作
 */

import { nodeTemplateRegistry, type NodeTemplateRegistry } from '../../core/services/node-template-registry';
import type { NodeTemplate } from '../../types/node-template';
import type { NodeTemplateFilter, NodeTemplateSummary } from '../types/registry-types';
import type { ValidationResult } from '../../types/errors';
import { ValidationError } from '../../types/errors';

/**
 * NodeTemplateRegistryAPI - 节点模板管理API
 */
export class NodeRegistryAPI {
  private registry: NodeTemplateRegistry;
  private cache: Map<string, NodeTemplate> = new Map();

  constructor() {
    this.registry = nodeTemplateRegistry;
  }

  /**
   * 注册节点模板
   * @param template 节点模板
   */
  async registerTemplate(template: NodeTemplate): Promise<void> {
    this.registry.register(template);
    this.cache.set(template.name, template);
  }

  /**
   * 批量注册节点模板
   * @param templates 节点模板数组
   */
  async registerTemplates(templates: NodeTemplate[]): Promise<void> {
    await Promise.all(
      templates.map(template => this.registerTemplate(template))
    );
  }

  /**
   * 获取节点模板
   * @param name 节点模板名称
   * @returns 节点模板，如果不存在则返回null
   */
  async getTemplate(name: string): Promise<NodeTemplate | null> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    const template = this.registry.get(name);
    if (template) {
      this.cache.set(name, template);
    }

    return template || null;
  }

  /**
   * 获取节点模板列表
   * @param filter 过滤条件
   * @returns 节点模板数组
   */
  async getTemplates(filter?: NodeTemplateFilter): Promise<NodeTemplate[]> {
    let templates = this.getAllTemplates();

    if (filter) {
      templates = this.applyFilter(templates, filter);
    }

    return templates;
  }

  /**
   * 获取节点模板摘要列表
   * @param filter 过滤条件
   * @returns 节点模板摘要数组
   */
  async getTemplateSummaries(filter?: NodeTemplateFilter): Promise<NodeTemplateSummary[]> {
    const summaries = this.registry.listSummaries();

    if (!filter) {
      return summaries;
    }

    return summaries.filter(summary => {
      if (filter.name && !summary.name.includes(filter.name)) {
        return false;
      }
      if (filter.type && summary.type !== filter.type) {
        return false;
      }
      if (filter.category && summary.category !== filter.category) {
        return false;
      }
      if (filter.tags && summary.tags) {
        if (!filter.tags.every(tag => summary.tags?.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 按名称获取节点模板
   * @param name 节点模板名称
   * @returns 节点模板，如果不存在则返回null
   */
  async getTemplateByName(name: string): Promise<NodeTemplate | null> {
    const template = this.registry.get(name);
    if (template) {
      this.cache.set(name, template);
    }
    return template || null;
  }

  /**
   * 按类型获取节点模板列表
   * @param type 节点类型
   * @returns 节点模板数组
   */
  async getTemplatesByType(type: string): Promise<NodeTemplate[]> {
    return this.registry.listByType(type as any);
  }

  /**
   * 按标签获取节点模板列表
   * @param tags 标签数组
   * @returns 节点模板数组
   */
  async getTemplatesByTags(tags: string[]): Promise<NodeTemplate[]> {
    return this.registry.listByTags(tags);
  }

  /**
   * 按分类获取节点模板列表
   * @param category 分类
   * @returns 节点模板数组
   */
  async getTemplatesByCategory(category: string): Promise<NodeTemplate[]> {
    return this.registry.listByCategory(category);
  }

  /**
   * 更新节点模板
   * @param name 节点模板名称
   * @param updates 更新内容
   */
  async updateTemplate(name: string, updates: Partial<NodeTemplate>): Promise<void> {
    this.registry.update(name, updates);
    this.cache.delete(name);
  }

  /**
   * 删除节点模板
   * @param name 节点模板名称
   */
  async deleteTemplate(name: string): Promise<void> {
    this.registry.unregister(name);
    this.cache.delete(name);
  }

  /**
   * 检查节点模板是否存在
   * @param name 节点模板名称
   * @returns 是否存在
   */
  async hasTemplate(name: string): Promise<boolean> {
    return this.registry.has(name);
  }

  /**
   * 获取节点模板数量
   * @returns 节点模板数量
   */
  async getTemplateCount(): Promise<number> {
    return this.registry.size();
  }

  /**
   * 清空所有节点模板
   */
  async clearTemplates(): Promise<void> {
    this.registry.clear();
    this.cache.clear();
  }

  /**
   * 搜索节点模板
   * @param keyword 搜索关键词
   * @returns 节点模板数组
   */
  async searchTemplates(keyword: string): Promise<NodeTemplate[]> {
    return this.registry.search(keyword);
  }

  /**
   * 验证节点模板
   * @param template 节点模板
   * @returns 验证结果
   */
  async validateTemplate(template: NodeTemplate): Promise<ValidationResult> {
    try {
      this.registry.register(template);
      this.registry.unregister(template.name);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          valid: false,
          errors: [new ValidationError(error.message, 'template')],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError('Unknown validation error', 'template')],
        warnings: []
      };
    }
  }

  /**
   * 导出节点模板
   * @param name 节点模板名称
   * @returns JSON字符串
   */
  async exportTemplate(name: string): Promise<string> {
    return this.registry.export(name);
  }

  /**
   * 导入节点模板
   * @param json JSON字符串
   * @returns 节点模板名称
   */
  async importTemplate(json: string): Promise<string> {
    const name = this.registry.import(json);
    const template = this.registry.get(name);
    if (template) {
      this.cache.set(name, template);
    }
    return name;
  }

  /**
   * 获取底层NodeRegistry实例
   * @returns NodeRegistry实例
   */
  getRegistry(): NodeTemplateRegistry {
    return this.registry;
  }

  /**
   * 应用过滤条件
   * @param templates 节点模板数组
   * @param filter 过滤条件
   * @returns 过滤后的节点模板数组
   */
  private applyFilter(templates: NodeTemplate[], filter: NodeTemplateFilter): NodeTemplate[] {
    return templates.filter(template => {
      if (filter.name && !template.name.includes(filter.name)) {
        return false;
      }
      if (filter.type && template.type !== filter.type) {
        return false;
      }
      if (filter.category && template.metadata?.['category'] !== filter.category) {
        return false;
      }
      if (filter.tags && template.metadata?.['tags']) {
        if (!filter.tags.every(tag => template.metadata?.['tags']?.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 获取所有节点模板（辅助方法）
   * @returns 节点模板数组
   */
  private getAllTemplates(): NodeTemplate[] {
    return this.registry.list();
  }
}