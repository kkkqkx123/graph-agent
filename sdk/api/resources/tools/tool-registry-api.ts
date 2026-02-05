/**
 * ToolRegistryAPI - 工具资源管理API
 * 封装ToolService，提供工具注册、查询功能
 */

import { toolService } from '../../../core/services/tool-service';
import type { Tool } from '../../../types/tool';
import type { ToolFilter } from '../../types/tools-types';
import { NotFoundError } from '../../../types/errors';

/**
 * ToolRegistryAPI - 工具资源管理API
 */
export class ToolRegistryAPI {
  private toolService = toolService;

  /**
   * 注册工具
   * @param tool 工具定义
   */
  async registerTool(tool: Tool): Promise<void> {
    this.toolService.registerTool(tool);
  }

  /**
   * 批量注册工具
   * @param tools 工具定义数组
   */
  async registerTools(tools: Tool[]): Promise<void> {
    this.toolService.registerTools(tools);
  }

  /**
   * 注销工具
   * @param toolName 工具名称
   */
  async unregisterTool(toolName: string): Promise<void> {
    this.toolService.unregisterTool(toolName);
  }

  /**
   * 获取工具定义
   * @param toolName 工具名称
   * @returns 工具定义，如果不存在则返回null
   */
  async getTool(toolName: string): Promise<Tool | null> {
    try {
      return this.toolService.getTool(toolName);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取工具列表
   * @param filter 过滤条件
   * @returns 工具定义数组
   */
  async getTools(filter?: ToolFilter): Promise<Tool[]> {
    let tools = this.toolService.listTools();

    // 应用过滤条件
    if (filter) {
      tools = this.applyFilter(tools, filter);
    }

    return tools;
  }

  /**
   * 按类型获取工具列表
   * @param type 工具类型
   * @returns 工具定义数组
   */
  async getToolsByType(type: string): Promise<Tool[]> {
    return this.toolService.listToolsByType(type);
  }

  /**
   * 按分类获取工具列表
   * @param category 工具分类
   * @returns 工具定义数组
   */
  async getToolsByCategory(category: string): Promise<Tool[]> {
    return this.toolService.listToolsByCategory(category);
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
    return this.toolService.hasTool(toolName);
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
    this.toolService.updateTool(toolName, updates);
  }

  /**
   * 获取工具数量
   * @returns 工具数量
   */
  async getToolCount(): Promise<number> {
    const tools = await this.getTools();
    return tools.length;
  }

  /**
   * 清空所有工具
   */
  async clearTools(): Promise<void> {
    this.toolService.clear();
  }

  /**
   * 获取底层ToolService实例
   * @returns ToolService实例
   */
  getService() {
    return this.toolService;
  }

  /**
   * 应用过滤条件
   * @param tools 工具数组
   * @param filter 过滤条件
   * @returns 过滤后的工具数组
   */
  private applyFilter(tools: Tool[], filter: ToolFilter): Tool[] {
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
}