/**
 * 节点注册表
 * 负责节点模板的注册、查询和管理
 *
 * 本模块导出全局单例实例，不导出类定义
 */

import type { NodeTemplate, NodeTemplateSummary } from '@modular-agent/types/node-template';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ValidationError, NotFoundError } from '@modular-agent/types/errors';
import { validateNodeByType } from '../validation/node-validation';

/**
 * 节点注册表类
 */
class NodeTemplateRegistry {
  private templates: Map<string, NodeTemplate> = new Map();

  /**
   * 注册节点模板
   * @param template 节点模板
   * @throws ValidationError 如果节点配置无效或名称已存在
   */
  register(template: NodeTemplate): void {
    // 验证节点配置
    this.validateTemplate(template);

    // 检查名称是否已存在
    if (this.templates.has(template.name)) {
      throw new ValidationError(
        `Node template with name '${template.name}' already exists`,
        'template.name'
      );
    }

    // 注册节点模板
    this.templates.set(template.name, template);
  }

  /**
   * 批量注册节点模板
   * @param templates 节点模板数组
   */
  registerBatch(templates: NodeTemplate[]): void {
    for (const template of templates) {
      this.register(template);
    }
  }

  /**
   * 获取节点模板
   * @param name 节点模板名称
   * @returns 节点模板，如果不存在则返回undefined
   */
  get(name: string): NodeTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * 检查节点模板是否存在
   * @param name 节点模板名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * 更新节点模板
   * @param name 节点模板名称
   * @param updates 更新内容
   * @throws NotFoundError 如果节点模板不存在
   * @throws ValidationError 如果更新后的配置无效
   */
  update(name: string, updates: Partial<NodeTemplate>): void {
    const template = this.templates.get(name);
    if (!template) {
      throw new NotFoundError(
        `Node template '${name}' not found`,
        'template',
        name
      );
    }

    // 创建更新后的模板
    const updatedTemplate: NodeTemplate = {
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
   * 删除节点模板
   * @param name 节点模板名称
   * @throws NotFoundError 如果节点模板不存在
   */
  unregister(name: string): void {
    if (!this.templates.has(name)) {
      throw new NotFoundError(
        `Node template '${name}' not found`,
        'template',
        name
      );
    }
    this.templates.delete(name);
  }

  /**
   * 批量删除节点模板
   * @param names 节点模板名称数组
   */
  unregisterBatch(names: string[]): void {
    for (const name of names) {
      this.unregister(name);
    }
  }

  /**
   * 列出所有节点模板
   * @returns 节点模板数组
   */
  list(): NodeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 列出所有节点模板摘要
   * @returns 节点模板摘要数组
   */
  listSummaries(): NodeTemplateSummary[] {
    return this.list().map(template => {
      const summary: NodeTemplateSummary = {
        name: template.name,
        type: template.type,
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
   * 按类型列出节点模板
   * @param type 节点类型
   * @returns 节点模板数组
   */
  listByType(type: NodeType): NodeTemplate[] {
    return this.list().filter(template => template.type === type);
  }

  /**
   * 按分类列出节点模板
   * @param category 分类
   * @returns 节点模板数组
   */
  listByCategory(category: string): NodeTemplate[] {
    return this.list().filter(
      template => template.metadata?.['category'] === category
    );
  }

  /**
   * 按标签列出节点模板
   * @param tags 标签数组
   * @returns 节点模板数组
   */
  listByTags(tags: string[]): NodeTemplate[] {
    return this.list().filter(template => {
      const templateTags = template.metadata?.['tags'] || [];
      return tags.every(tag => templateTags.includes(tag));
    });
  }

  /**
   * 清空所有节点模板
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * 获取节点模板数量
   * @returns 节点模板数量
   */
  size(): number {
    return this.templates.size;
  }

  /**
   * 搜索节点模板
   * @param keyword 搜索关键词
   * @returns 匹配的节点模板数组
   */
  search(keyword: string): NodeTemplate[] {
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
   * 验证节点模板
   * @param template 节点模板
   * @throws ValidationError 如果节点配置无效
   */
  private validateTemplate(template: NodeTemplate): void {
    // 验证必需字段
    if (!template.name || typeof template.name !== 'string') {
      throw new ValidationError(
        'Node template name is required and must be a string',
        'template.name'
      );
    }

    if (!template.type || !Object.values(NodeType).includes(template.type)) {
      throw new ValidationError(
        `Invalid node type: ${template.type}`,
        'template.type'
      );
    }

    if (!template.config) {
      throw new ValidationError(
        'Node template config is required',
        'template.config'
      );
    }

    // 使用现有的验证函数验证节点配置
    const mockNode: Node = {
      id: 'validation',
      type: template.type,
      name: template.name,
      config: template.config,
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    };

    try {
      validateNodeByType(mockNode);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Invalid node configuration for template '${template.name}': ${error.message}`,
          `template.config`
        );
      }
      throw error;
    }
  }

  /**
   * 导出节点模板为JSON字符串
   * @param name 节点模板名称
   * @returns JSON字符串
   * @throws NotFoundError 如果节点模板不存在
   */
  export(name: string): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new NotFoundError(
        `Node template '${name}' not found`,
        'template',
        name
      );
    }
    return JSON.stringify(template, null, 2);
  }

  /**
   * 从JSON字符串导入节点模板
   * @param json JSON字符串
   * @returns 节点模板名称
   * @throws ValidationError 如果JSON无效或节点配置无效
   */
  import(json: string): string {
    try {
      const template = JSON.parse(json) as NodeTemplate;
      this.register(template);
      return template.name;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to import node template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'json'
      );
    }
  }
}

/**
 * 全局节点注册表单例实例
 */
export const nodeTemplateRegistry = new NodeTemplateRegistry();

/**
 * 导出NodeTemplateRegistry类供测试使用
 */
export { NodeTemplateRegistry };