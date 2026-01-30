/**
 * 工具注册表
 * 负责工具定义的管理
 */

import type { Tool, StatelessToolConfig, StatefulToolConfig, McpToolConfig } from '../../types/tool';
import { ToolType } from '../../types/tool';
import { ValidationError, NotFoundError } from '../../types/errors';

/**
 * 工具注册表类
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册工具定义
   * @param tool 工具定义
   * @throws ValidationError 如果工具定义无效
   */
  register(tool: Tool): void {
    // 验证工具定义
    this.validate(tool);

    // 检查工具名称是否已存在
    if (this.tools.has(tool.name)) {
      throw new ValidationError(
        `Tool with name '${tool.name}' already exists`,
        'name',
        tool.name
      );
    }

    // 注册工具
    this.tools.set(tool.name, tool);
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
   * @param toolName 工具名称
   * @returns 工具定义，如果不存在则返回undefined
   */
  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * 检查工具是否存在
   * @param toolName 工具名称
   * @returns 是否存在
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * 删除工具定义
   * @param toolName 工具名称
   * @throws NotFoundError 如果工具不存在
   */
  remove(toolName: string): void {
    if (!this.tools.has(toolName)) {
      throw new NotFoundError(
        `Tool '${toolName}' not found`,
        'tool',
        toolName
      );
    }
    this.tools.delete(toolName);
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
   * @param tool 工具定义
   * @returns 是否有效
   * @throws ValidationError 如果工具定义无效
   */
  validate(tool: Tool): boolean {
    // 验证必需字段
    if (!tool.name || typeof tool.name !== 'string') {
      throw new ValidationError(
        'Tool name is required and must be a string',
        'name',
        tool.name
      );
    }

    if (!tool.type || typeof tool.type !== 'string') {
      throw new ValidationError(
        'Tool type is required and must be a string',
        'type',
        tool.type
      );
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new ValidationError(
        'Tool description is required and must be a string',
        'description',
        tool.description
      );
    }

    // 验证参数schema
    if (!tool.parameters) {
      throw new ValidationError(
        'Tool parameters schema is required',
        'parameters',
        tool.parameters
      );
    }

    if (!tool.parameters.properties || typeof tool.parameters.properties !== 'object') {
      throw new ValidationError(
        'Tool parameters properties is required and must be an object',
        'parameters.properties',
        tool.parameters.properties
      );
    }

    if (!Array.isArray(tool.parameters.required)) {
      throw new ValidationError(
        'Tool parameters required is required and must be an array',
        'parameters.required',
        tool.parameters.required
      );
    }

    // 验证required参数是否在properties中定义
    for (const requiredParam of tool.parameters.required) {
      if (!(requiredParam in tool.parameters.properties)) {
        throw new ValidationError(
          `Required parameter '${requiredParam}' is not defined in properties`,
          'parameters.required',
          tool.parameters.required
        );
      }
    }

    // 验证config字段（根据工具类型）
    if (tool.config) {
      switch (tool.type) {
        case ToolType.STATELESS: {
          const config = tool.config as StatelessToolConfig;
          if (!config.execute || typeof config.execute !== 'function') {
            throw new ValidationError(
              'STATELESS tool must have an execute function in config',
              'config.execute',
              tool.config
            );
          }
          break;
        }

        case ToolType.STATEFUL: {
          const config = tool.config as StatefulToolConfig;
          if (!config.factory || typeof config.factory.create !== 'function') {
            throw new ValidationError(
              'STATEFUL tool must have a factory with create function in config',
              'config.factory',
              tool.config
            );
          }
          break;
        }

        case ToolType.REST:
          // REST工具的config是可选的，不需要强制验证
          break;

        case ToolType.MCP: {
          const config = tool.config as McpToolConfig;
          if (!config.serverName || typeof config.serverName !== 'string') {
            throw new ValidationError(
              'MCP tool must have a serverName in config',
              'config.serverName',
              tool.config
            );
          }
          break;
        }

        default:
          throw new ValidationError(
            `Unknown tool type: ${tool.type}`,
            'type',
            tool.type
          );
      }
    } else if (tool.type === ToolType.STATELESS || tool.type === ToolType.STATEFUL || tool.type === ToolType.MCP) {
      throw new ValidationError(
        `${tool.type} tool must have a config`,
        'config',
        tool.config
      );
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
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        tool.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        tool.metadata?.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }
}