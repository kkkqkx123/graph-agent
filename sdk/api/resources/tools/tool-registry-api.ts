/**
 * ToolRegistryAPI - 工具资源管理API
 * 封装ToolService，提供工具注册、查询功能
 */

import { toolService } from '../../../core/services/tool-service';
import type { Tool } from '../../../types/tool';
import type { ToolFilter } from '../../types/tools-types';
import { NotFoundError } from '../../../types/errors';
import { GenericResourceAPI, type ResourceAPIOptions } from '../generic-resource-api';
import type { ExecutionResult } from '../../types/execution-result';

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

  constructor(options?: Partial<ResourceAPIOptions>) {
    super({
      enableCache: true,
      cacheTTL: 300000, // 5分钟
      enableValidation: true,
      enableLogging: true,
      ...options
    });
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
   * @returns 验证结果
   */
  protected override validateResource(tool: Tool): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!tool.name || tool.name.trim() === '') {
      errors.push('工具名称不能为空');
    }

    if (!tool.type || tool.type.trim() === '') {
      errors.push('工具类型不能为空');
    }

    if (!tool.description || tool.description.trim() === '') {
      errors.push('工具描述不能为空');
    }

    if (!tool.parameters || typeof tool.parameters !== 'object') {
      errors.push('工具参数定义无效');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ==================== 向后兼容的公共方法 ====================

  /**
   * 注册工具
   * @param tool 工具定义
   */
  async registerTool(tool: Tool): Promise<void> {
    const result = await this.create(tool);
    if (!result.success) {
      throw new Error(result.error || '注册工具失败');
    }
  }

  /**
   * 批量注册工具
   * @param tools 工具定义数组
   */
  async registerTools(tools: Tool[]): Promise<void> {
    for (const tool of tools) {
      await this.registerTool(tool);
    }
  }

  /**
   * 注销工具
   * @param toolName 工具名称
   */
  async unregisterTool(toolName: string): Promise<void> {
    const result = await this.delete(toolName);
    if (!result.success) {
      throw new Error(result.error || '注销工具失败');
    }
  }

  /**
   * 获取工具定义
   * @param toolName 工具名称
   * @returns 工具定义，如果不存在则返回null
   */
  async getTool(toolName: string): Promise<Tool | null> {
    const result = await this.get(toolName);
    return result.success ? result.data : null;
  }

  /**
   * 获取工具列表
   * @param filter 过滤条件
   * @returns 工具定义数组
   */
  async getTools(filter?: ToolFilter): Promise<Tool[]> {
    const result = await this.getAll(filter);
    return result.success ? result.data : [];
  }

  /**
   * 按类型获取工具列表
   * @param type 工具类型
   * @returns 工具定义数组
   */
  async getToolsByType(type: string): Promise<Tool[]> {
    return this.getTools({ type: type as any });
  }

  /**
   * 按分类获取工具列表
   * @param category 工具分类
   * @returns 工具定义数组
   */
  async getToolsByCategory(category: string): Promise<Tool[]> {
    return this.getTools({ category });
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
   * 检查工具是否存在
   * @param toolName 工具名称
   * @returns 是否存在
   */
  async hasTool(toolName: string): Promise<boolean> {
    const result = await this.has(toolName);
    return result.success ? result.data : false;
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
   * 更新工具定义
   * @param toolName 工具名称
   * @param updates 更新内容
   */
  async updateTool(toolName: string, updates: Partial<Tool>): Promise<void> {
    const result = await this.update(toolName, updates);
    if (!result.success) {
      throw new Error(result.error || '更新工具失败');
    }
  }

  /**
   * 获取工具数量
   * @returns 工具数量
   */
  async getToolCount(): Promise<number> {
    const result = await this.count();
    return result.success ? result.data : 0;
  }

  /**
   * 清空所有工具
   */
  async clearTools(): Promise<void> {
    const result = await this.clear();
    if (!result.success) {
      throw new Error(result.error || '清空工具失败');
    }
  }

  /**
   * 获取底层ToolService实例
   * @returns ToolService实例
   */
  getService() {
    return this.toolService;
  }
}