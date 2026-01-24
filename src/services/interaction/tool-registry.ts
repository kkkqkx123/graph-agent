/**
 * 工具注册表
 * 
 * 统一管理所有可用的工具
 */

import { injectable } from 'inversify';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 工具接口
 */
export interface ITool {
  /**
   * 工具名称
   */
  name: string;

  /**
   * 工具描述
   */
  description: string;

  /**
   * 工具参数 schema（JSON Schema 格式）
   */
  parameters: Record<string, any>;

  /**
   * 执行工具
   * @param args 工具参数
   * @returns 执行结果
   */
  execute(args: Record<string, any>): Promise<ToolResult>;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 输出内容
   */
  content?: string;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 执行时间（毫秒）
   */
  executionTime?: number;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 工具注册表
 */
@injectable()
export class ToolRegistry {
  private tools: Map<string, ITool> = new Map();

  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 注册工具
   * @param tool 工具实例
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`工具 ${tool.name} 已存在，将被覆盖`);
    }
    this.tools.set(tool.name, tool);
    this.logger.debug(`工具 ${tool.name} 注册成功`);
  }

  /**
   * 注销工具
   * @param name 工具名称
   */
  unregister(name: string): void {
    if (this.tools.delete(name)) {
      this.logger.debug(`工具 ${name} 注销成功`);
    } else {
      this.logger.warn(`工具 ${name} 不存在`);
    }
  }

  /**
   * 获取工具
   * @param name 工具名称
   * @returns 工具实例或 undefined
   */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   * @returns 工具列表
   */
  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取工具 Schema
   * @param name 工具名称
   * @returns 工具 Schema 或 undefined
   */
  getSchema(name: string): Record<string, any> | undefined {
    const tool = this.tools.get(name);
    if (!tool) {
      this.logger.warn(`工具 ${name} 不存在`);
      return undefined;
    }

    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    };
  }

  /**
   * 批量获取工具 Schema
   * @param names 工具名称列表
   * @returns 工具 Schema 列表
   */
  getSchemas(names: string[]): Record<string, any>[] {
    return names
      .map(name => this.getSchema(name))
      .filter((schema): schema is Record<string, any> => schema !== undefined);
  }

  /**
   * 获取所有工具的 Schema
   * @returns 所有工具的 Schema 列表
   */
  getAllSchemas(): Record<string, any>[] {
    return this.getSchemas(Array.from(this.tools.keys()));
  }

  /**
   * 检查工具是否存在
   * @param name 工具名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取工具数量
   * @returns 工具数量
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
    this.logger.debug('工具注册表已清空');
  }

  /**
   * 获取工具名称列表
   * @returns 工具名称列表
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}