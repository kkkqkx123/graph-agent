import { injectable } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';

/**
 * 工具注册表
 * 
 * 职责：工具的存储和检索
 * 注意：不包含业务逻辑，业务逻辑应该在应用层处理
 */
@injectable()
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.id.value, tool);
  }

  /**
   * 注销工具
   */
  unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  /**
   * 获取工具
   */
  get(toolId: string): Tool | null {
    return this.tools.get(toolId) || null;
  }

  /**
   * 按名称获取工具
   */
  getByName(name: string): Tool | null {
    for (const tool of this.tools.values()) {
      if (tool.name === name) {
        return tool;
      }
    }
    return null;
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 按类型获取工具
   */
  getByType(type: string): Tool[] {
    return Array.from(this.tools.values()).filter(tool => tool.type.value === type);
  }

  /**
   * 按分类获取工具
   */
  getByCategory(category: string): Tool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * 搜索工具
   */
  search(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values()).filter(tool =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 检查工具是否存在
   */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * 获取工具数量
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * 获取所有分类
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      categories.add(tool.category);
    }
    return Array.from(categories);
  }

  /**
   * 获取所有类型
   */
  getTypes(): string[] {
    const types = new Set<string>();
    for (const tool of this.tools.values()) {
      types.add(tool.type.value);
    }
    return Array.from(types);
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    enabled: number;
    disabled: number;
  } {
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let enabled = 0;
    let disabled = 0;

    for (const tool of this.tools.values()) {
      // 按类型统计
      const type = tool.type.value;
      byType[type] = (byType[type] || 0) + 1;

      // 按分类统计
      const category = tool.category;
      byCategory[category] = (byCategory[category] || 0) + 1;

      // 按状态统计
      if (tool.isEnabled) {
        enabled++;
      } else {
        disabled++;
      }
    }

    return {
      total: this.tools.size,
      byType,
      byCategory,
      enabled,
      disabled
    };
  }
}