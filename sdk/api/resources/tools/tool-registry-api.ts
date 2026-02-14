/**
 * ToolRegistryAPI - 工具资源管理API
 * 封装ToolService，提供工具注册、查询功能
 */

import {
  validateRequiredFields,
  validateStringLength,
  validateObject
} from '../../validation/validation-strategy';

import type { Tool, ToolFilter } from '@modular-agent/types';
import { NotFoundError } from '@modular-agent/types';
import { GenericResourceAPI } from '../generic-resource-api';
import type { APIDependencyManager } from '../../core/sdk-dependencies';

/**
 * ToolRegistryAPI - 工具资源管理API
 *
 * 改进点：
 * - 继承GenericResourceAPI，减少重复代码
 * - 统一的缓存管理
 * - 统一的错误处理
 * - 统一的过滤逻辑
 * - 保持向后兼容性
 */
export class ToolRegistryAPI extends GenericResourceAPI<Tool, string, ToolFilter> {
  private dependencies: APIDependencyManager;

  constructor(dependencies: APIDependencyManager) {
    super();
    this.dependencies = dependencies;
  }

  /**
   * 获取单个工具
   * @param id 工具名称
   * @returns 工具定义，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<Tool | null> {
    try {
      return this.dependencies.getToolService().getTool(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取所有工具
   * @returns 工具定义数组
   */
  protected async getAllResources(): Promise<Tool[]> {
    return this.dependencies.getToolService().listTools();
  }

  /**
   * 创建/注册工具
   * @param tool 工具定义
   */
  protected async createResource(tool: Tool): Promise<void> {
    this.dependencies.getToolService().registerTool(tool);
  }

  /**
   * 更新工具
   * @param id 工具名称
   * @param updates 更新内容
   */
  protected async updateResource(id: string, updates: Partial<Tool>): Promise<void> {
    // 获取现有工具
    const existingTool = await this.getResource(id);
    if (!existingTool) {
      throw new Error(`Tool '${id}' not found`);
    }

    // 合并更新
    const updatedTool = { ...existingTool, ...updates };

    // 先删除旧工具
    await this.deleteResource(id);

    // 再注册新工具
    await this.createResource(updatedTool);
  }

  /**
   * 删除工具
   * @param id 工具名称
   */
  protected async deleteResource(id: string): Promise<void> {
    this.dependencies.getToolService().unregisterTool(id);
  }

  /**
   * 清空所有工具
   */
  protected override async clearResources(): Promise<void> {
    this.dependencies.getToolService().clear();
  }

  /**
   * 应用过滤条件
   * @param tools 工具数组
   * @param filter 过滤条件
   * @returns 过滤后的工具数组
   */
  protected applyFilter(tools: Tool[], filter: ToolFilter): Tool[] {
    return tools.filter(tool => {
      if (filter.ids && !filter.ids.some(id => tool.id.includes(id))) {
        return false;
      }
      if (filter.name && !tool.name.includes(filter.name)) {
        return false;
      }
      if (filter.type && tool.type !== filter.type) {
        return false;
      }
      if (filter.category && tool.metadata?.category !== filter.category) {
        return false;
      }
      if (filter.tags && tool.metadata?.tags) {
        if (!filter.tags.every(tag => tool.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      // enabled 过滤暂时不支持，因为 Tool 接口没有 enabled 字段
      // TODO: 如果需要支持 enabled 过滤，需要从其他地方获取工具的启用状态
      return true;
    });
  }

  /**
   * 验证工具定义
   * @param tool 工具定义
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected override async validateResource(
    tool: Tool,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 使用简化验证工具验证必需字段
    const requiredResult = validateRequiredFields(tool, ['name', 'type', 'description'], 'tool');
    if (requiredResult.isErr()) {
      errors.push(...requiredResult.unwrapOrElse(err => err.map(error => error.message)));
    }

    // 验证参数对象
    const objectResult = validateObject(tool.parameters, '工具参数');
    if (objectResult.isErr()) {
      errors.push(...objectResult.unwrapOrElse(err => err.map(error => error.message)));
    }

    // 验证名称长度
    if (tool.name) {
      const nameResult = validateStringLength(tool.name, '工具名称', 1, 100);
      if (nameResult.isErr()) {
        errors.push(...nameResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证描述长度
    if (tool.description) {
      const descriptionResult = validateStringLength(tool.description, '工具描述', 1, 500);
      if (descriptionResult.isErr()) {
        errors.push(...descriptionResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 搜索工具
   * @param query 搜索关键词
   * @returns 工具定义数组
   */
  async searchTools(query: string): Promise<Tool[]> {
    return this.dependencies.getToolService().searchTools(query);
  }

  /**
   * 验证工具参数
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @returns 验证结果
   */
  async validateToolParameters(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.dependencies.getToolService().validateParameters(toolName, parameters);
  }

  /**
   * 获取底层ToolService实例
   * @returns ToolService实例
   */
  getService() {
    return this.dependencies.getToolService();
  }
}