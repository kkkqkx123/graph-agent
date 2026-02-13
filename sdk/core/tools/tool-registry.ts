/**
 * 工具注册表
 * 负责工具定义的管理
 * 由于仅被tool-service使用，不需要特意改造为单例模式
 */

import type { Tool, StatelessToolConfig, StatefulToolConfig, McpToolConfig } from '@modular-agent/types/tool';
import { ToolType } from '@modular-agent/types/tool';
import { ConfigurationValidationError, ToolNotFoundError } from '@modular-agent/types/errors';

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
      throw new ConfigurationValidationError(
        `Tool with name '${tool.name}' already exists`,
        {
          configType: 'tool',
          field: 'name',
          value: tool.name
        }
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
      throw new ToolNotFoundError(
        `Tool '${toolName}' not found`,
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
      throw new ConfigurationValidationError(
        'Tool name is required and must be a string',
        {
          configType: 'tool',
          field: 'name',
          value: tool.name
        }
      );
    }

    if (!tool.type || typeof tool.type !== 'string') {
      throw new ConfigurationValidationError(
        'Tool type is required and must be a string',
        {
          configType: 'tool',
          field: 'type',
          value: tool.type
        }
      );
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new ConfigurationValidationError(
        'Tool description is required and must be a string',
        {
          configType: 'tool',
          field: 'description',
          value: tool.description
        }
      );
    }

    // 验证参数schema
    if (!tool.parameters) {
      throw new ConfigurationValidationError(
        'Tool parameters schema is required',
        {
          configType: 'tool',
          field: 'parameters',
          value: tool.parameters
        }
      );
    }

    if (!tool.parameters.properties || typeof tool.parameters.properties !== 'object') {
      throw new ConfigurationValidationError(
        'Tool parameters properties is required and must be an object',
        {
          configType: 'tool',
          field: 'parameters.properties',
          value: tool.parameters.properties
        }
      );
    }

    if (!Array.isArray(tool.parameters.required)) {
      throw new ConfigurationValidationError(
        'Tool parameters required is required and must be an array',
        {
          configType: 'tool',
          field: 'parameters.required',
          value: tool.parameters.required
        }
      );
    }

    // 验证required参数是否在properties中定义
    for (const requiredParam of tool.parameters.required) {
      if (!(requiredParam in tool.parameters.properties)) {
        throw new ConfigurationValidationError(
          `Required parameter '${requiredParam}' is not defined in properties`,
          {
            configType: 'tool',
            field: 'parameters.required',
            value: requiredParam
          }
        );
      }
    }

    // 验证config字段（根据工具类型）
    if (tool.config) {
      switch (tool.type) {
        case ToolType.STATELESS: {
          const config = tool.config as StatelessToolConfig;
          if (!config.execute || typeof config.execute !== 'function') {
            throw new ConfigurationValidationError(
              'STATELESS tool must have an execute function in config',
              {
                configType: 'tool',
                field: 'config.execute',
                context: { toolType: tool.type }
              }
            );
          }
          break;
        }

        case ToolType.STATEFUL: {
          const config = tool.config as StatefulToolConfig;
          if (!config.factory || typeof config.factory.create !== 'function') {
            throw new ConfigurationValidationError(
              'STATEFUL tool must have a factory with create function in config',
              {
                configType: 'tool',
                field: 'config.factory',
                context: { toolType: tool.type }
              }
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
            throw new ConfigurationValidationError(
              'MCP tool must have a serverName in config',
              {
                configType: 'tool',
                field: 'config.serverName',
                value: config.serverName
              }
            );
          }
          break;
        }

        default:
          throw new ConfigurationValidationError(
            `Unknown tool type: ${tool.type}`,
            {
              configType: 'tool',
              field: 'type',
              value: tool.type
            }
          );
      }
    } else if (tool.type === ToolType.STATELESS || tool.type === ToolType.STATEFUL || tool.type === ToolType.MCP) {
      throw new ConfigurationValidationError(
        `${tool.type} tool must have a config`,
        {
          configType: 'tool',
          field: 'config',
          value: tool.config
        }
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