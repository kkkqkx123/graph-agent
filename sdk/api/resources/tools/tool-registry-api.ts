/**
 * ToolRegistryAPI - 工具资源管理API
 * 封装ToolService，提供工具注册、查询功能
 */

import {
  validateRequiredFields,
  validateStringLength,
  validateObject
} from '../../validation/validation-strategy';

import { toolService } from '../../../core/services/tool-service';
import type { Tool } from '../../../types/tool';
import type { ToolFilter } from '../../types/tools-types';
import { NotFoundError } from '../../../types/errors';
import { GenericResourceAPI } from '../generic-resource-api';

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
  private toolService = toolService;

  constructor() {
    super();
  }

  /**
   * 获取单个工具
   * @param id 工具名称
   * @returns 工具定义，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<Tool | null> {
    try {
      return this.toolService.getTool(id);
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
    return this.toolService.listTools();
  }

  /**
   * 创建/注册工具
   * @param tool 工具定义
   */
  protected async createResource(tool: Tool): Promise<void> {
    this.toolService.registerTool(tool);
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
    this.toolService.unregisterTool(id);
  }

  /**
   * 清空所有工具
   */
  protected override async clearResources(): Promise<void> {
    this.toolService.clear();
  }

  /**
   * 应用过滤条件
   * @param tools 工具数组
   * @param filter 过滤条件
   * @returns 过滤后的工具数组
   */
  protected applyFilter(tools: Tool[], filter: ToolFilter): Tool[] {
    return tools.filter(tool => {
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
    const requiredErrors = validateRequiredFields(tool, ['name', 'type', 'description'], 'tool');
    errors.push(...requiredErrors.map(error => error.message));

    // 验证参数对象
    const objectErrors = validateObject(tool.parameters, '工具参数');
    errors.push(...objectErrors.map(error => error.message));

    // 验证名称长度
    if (tool.name) {
      const nameErrors = validateStringLength(tool.name, '工具名称', 1, 100);
      errors.push(...nameErrors.map(error => error.message));
    }

    // 验证描述长度
    if (tool.description) {
      const descriptionErrors = validateStringLength(tool.description, '工具描述', 1, 500);
      errors.push(...descriptionErrors.map(error => error.message));
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
    return this.toolService.searchTools(query);
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
    return this.toolService.validateParameters(toolName, parameters);
  }

  /**
   * 获取底层ToolService实例
   * @returns ToolService实例
   */
  getService() {
    return this.toolService;
  }
}