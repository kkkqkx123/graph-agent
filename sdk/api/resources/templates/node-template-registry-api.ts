/**
 * NodeTemplateRegistryAPI - 节点模板管理API
 * 封装NodeTemplateRegistry，提供节点模板的CRUD操作
 * 重构版本：继承GenericResourceAPI，提高代码复用性和一致性
 */

import type { NodeTemplate } from '@modular-agent/types';
import type { NodeTemplateFilter, NodeTemplateSummary } from '@modular-agent/sdk/api/types/registry-types';
import { ValidationError, ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { NodeType } from '@modular-agent/types';
import { GenericResourceAPI } from '../generic-resource-api';
import type { APIDependencies } from '../../core/api-dependencies';


/**
 * NodeTemplateRegistryAPI - 节点模板管理API
 * 
 * 重构说明：
 * - 继承GenericResourceAPI，复用通用CRUD操作
 * - 实现所有抽象方法以适配NodeTemplateRegistry
 * - 保留所有原有API方法以保持向后兼容
 * - 新增缓存、日志、验证等增强功能
 */
export class NodeRegistryAPI extends GenericResourceAPI<NodeTemplate, string, NodeTemplateFilter> {
  private dependencies: APIDependencies;

  constructor(dependencies: APIDependencies) {
    super();
    this.dependencies = dependencies;
  }

  /**
   * 获取单个节点模板
   * @param id 节点模板名称
   * @returns 节点模板，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<NodeTemplate | null> {
    const template = this.dependencies.getNodeTemplateRegistry().get(id);
    return template || null;
  }

  /**
   * 获取所有节点模板
   * @returns 节点模板数组
   */
  protected async getAllResources(): Promise<NodeTemplate[]> {
    return this.dependencies.getNodeTemplateRegistry().list();
  }

  /**
   * 创建节点模板
   * @param resource 节点模板
   */
  protected async createResource(resource: NodeTemplate): Promise<void> {
    this.dependencies.getNodeTemplateRegistry().register(resource);
  }

  /**
   * 更新节点模板
   * @param id 节点模板名称
   * @param updates 更新内容
   */
  protected async updateResource(id: string, updates: Partial<NodeTemplate>): Promise<void> {
    this.dependencies.getNodeTemplateRegistry().update(id, updates);
  }

  /**
   * 删除节点模板
   * @param id 节点模板名称
   */
  protected async deleteResource(id: string): Promise<void> {
    this.dependencies.getNodeTemplateRegistry().unregister(id);
  }

  /**
   * 应用过滤条件
   * @param resources 节点模板数组
   * @param filter 过滤条件
   * @returns 过滤后的节点模板数组
   */
  protected applyFilter(resources: NodeTemplate[], filter: NodeTemplateFilter): NodeTemplate[] {
    return resources.filter(template => {
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
   * 获取节点模板摘要列表
   * @param filter 过滤条件
   * @returns 节点模板摘要数组
   */
  async getTemplateSummaries(filter?: NodeTemplateFilter): Promise<NodeTemplateSummary[]> {
    const summaries = this.dependencies.getNodeTemplateRegistry().listSummaries();

    if (!filter) {
      return summaries;
    }

    return summaries.filter((summary: NodeTemplateSummary) => {
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
   * 按类型获取节点模板列表
   * @param type 节点类型
   * @returns 节点模板数组
   */
  async getTemplatesByType(type: string): Promise<NodeTemplate[]> {
    return this.dependencies.getNodeTemplateRegistry().listByType(type as any);
  }

  /**
   * 按标签获取节点模板列表
   * @param tags 标签数组
   * @returns 节点模板数组
   */
  async getTemplatesByTags(tags: string[]): Promise<NodeTemplate[]> {
    return this.dependencies.getNodeTemplateRegistry().listByTags(tags);
  }

  /**
   * 按分类获取节点模板列表
   * @param category 分类
   * @returns 节点模板数组
   */
  async getTemplatesByCategory(category: string): Promise<NodeTemplate[]> {
    return this.dependencies.getNodeTemplateRegistry().listByCategory(category);
  }

  /**
   * 搜索节点模板
   * @param keyword 搜索关键词
   * @returns 节点模板数组
   */
  async searchTemplates(keyword: string): Promise<NodeTemplate[]> {
    return this.dependencies.getNodeTemplateRegistry().search(keyword);
  }

  /**
   * 验证节点模板（无副作用）
   * @param template 节点模板
   * @returns 验证结果
   */
  async validateTemplate(template: NodeTemplate): Promise<Result<NodeTemplate, ValidationError[]>> {
    const errors: ValidationError[] = [];

    // 验证必需字段
    if (!template.name || typeof template.name !== 'string') {
      errors.push(new ConfigurationValidationError(
        'Node template name is required and must be a string',
        {
          configType: 'node',
          configPath: 'template.name',
          field: 'name'
        }
      ));
    }

    if (!template.type || !Object.values(NodeType).includes(template.type)) {
      errors.push(new ConfigurationValidationError(
        `Invalid node type: ${template.type}`,
        {
          configType: 'node',
          configPath: 'template.type',
          field: 'type'
        }
      ));
    }

    if (!template.config) {
      errors.push(new ConfigurationValidationError(
        'Node template config is required',
        {
          configType: 'node',
          configPath: 'template.config',
          field: 'config'
        }
      ));
    }

    // 如果有错误，直接返回
    if (errors.length > 0) {
      return err(errors);
    }

    // 使用现有的验证函数验证节点配置
    const { validateNodeByType } = require('../../../core/validation/node-validation');
    const mockNode = {
      id: 'validation',
      type: template.type,
      name: template.name,
      config: template.config,
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    };

    try {
      validateNodeByType(mockNode);
      return ok(template);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(new ConfigurationValidationError(
          `Invalid node configuration for template '${template.name}': ${error.message}`,
          {
            configType: 'node',
            configPath: 'template.config',
            field: 'config'
          }
        ));
      } else {
        errors.push(new ConfigurationValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          {
            configType: 'node',
            configPath: 'template.config',
            field: 'config'
          }
        ));
      }
      return err(errors);
    }
  }

  /**
   * 导出节点模板
   * @param name 节点模板名称
   * @returns JSON字符串
   */
  async exportTemplate(name: string): Promise<string> {
    return this.dependencies.getNodeTemplateRegistry().export(name);
  }

  /**
   * 导入节点模板
   * @param json JSON字符串
   * @returns 节点模板名称
   */
  async importTemplate(json: string): Promise<string> {
    const name = this.dependencies.getNodeTemplateRegistry().import(json);
    return name;
  }
}