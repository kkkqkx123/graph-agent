/**
 * 工具注册表
 * 负责工具定义的管理
 * 由于仅被tool-service使用，不需要特意改造为单例模式
 */

import type { Tool } from '@modular-agent/types';
import { ConfigurationValidationError, ToolNotFoundError } from '@modular-agent/types';
import { StaticValidator } from '../validation/tool-static-validator.js';

/**
 * 工具注册表类
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map(); // 以ID为主键的存储
  private validator: StaticValidator = new StaticValidator();

  /**
   * 注册工具定义
   * @param tool 工具定义
   * @throws ValidationError 如果工具定义无效
   */
  register(tool: Tool): void {
    // 验证工具定义
    this.validate(tool);

    // 检查工具ID是否已存在
    if (this.tools.has(tool.id)) {
      throw new ConfigurationValidationError(
        `Tool with id '${tool.id}' already exists`,
        {
          configType: 'tool',
          field: 'id',
          value: tool.id
        }
      );
    }

    // 注册工具（只按ID存储）
    this.tools.set(tool.id, tool);
  }

  /**
   * 批量注册工具
   * @param tools 工具定义数组
   */
  registerBatch(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * 获取工具定义
   * @param toolId 工具ID
   * @returns 工具定义，如果不存在则返回undefined
   */
  get(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * 检查工具是否存在
   * @param toolId 工具ID
   * @returns 是否存在
   */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * 删除工具定义
   * @param toolId 工具ID
   * @throws NotFoundError 如果工具不存在
   */
  remove(toolId: string): void {
    if (!this.tools.has(toolId)) {
      throw new ToolNotFoundError(
        `Tool with id '${toolId}' not found`,
        toolId
      );
    }
    this.tools.delete(toolId);
  }

  /**
   * 列出所有工具
   * @returns 工具定义数组
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 按类型列出工具
   * @param type 工具类型
   * @returns 工具定义数组
   */
  listByType(type: string): Tool[] {
    return this.list().filter(tool => tool.type === type);
  }

  /**
   * 按分类列出工具
   * @param category 工具分类
   * @returns 工具定义数组
   */
  listByCategory(category: string): Tool[] {
    return this.list().filter(
      tool => tool.metadata?.category === category
    );
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * 获取工具数量
   * @returns 工具数量
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * 验证工具定义
   * 使用StaticValidator进行统一验证
   * @param tool 工具定义
   * @returns 是否有效
   * @throws ValidationError 如果工具定义无效
   */
  validate(tool: Tool): boolean {
    const result = this.validator.validateTool(tool);
    if (result.isErr()) {
      throw result.error[0];
    }
    return true;
  }

  /**
   * 搜索工具
   * @param query 搜索关键词
   * @returns 匹配的工具数组
   */
  search(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(tool => {
      return (
        tool.id.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        tool.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        tool.metadata?.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }
}