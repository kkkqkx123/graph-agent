/**
 * 函数注册表
 * 管理无状态工具的函数，支持版本控制、调用统计等功能
 */

import type { FunctionRegistryItem, FunctionRegistryConfig } from '../types';
import { ToolError } from '@modular-agent/types/errors';

/**
 * 函数注册表
 */
export class FunctionRegistry {
  private functions: Map<string, FunctionRegistryItem> = new Map();
  private config: FunctionRegistryConfig;

  constructor(config: Partial<FunctionRegistryConfig> = {}) {
    this.config = {
      enableVersionControl: config.enableVersionControl ?? true,
      enableCallStatistics: config.enableCallStatistics ?? true,
      maxFunctions: config.maxFunctions ?? 100
    };
  }

  /**
   * 注册函数
   */
  register(
    toolName: string,
    execute: (parameters: any) => Promise<any>,
    version?: string,
    description?: string
  ): void {
    // 检查函数数限制
    if (this.functions.size >= this.config.maxFunctions) {
      throw new ToolError(
        `Maximum functions (${this.config.maxFunctions}) reached`,
        toolName,
        'STATELESS',
        { currentFunctions: this.functions.size }
      );
    }

    // 检查是否已存在
    if (this.functions.has(toolName)) {
      if (this.config.enableVersionControl) {
        // 如果启用版本控制，允许覆盖
        console.warn(`Function '${toolName}' already registered, overwriting...`);
      } else {
        throw new ToolError(
          `Function '${toolName}' is already registered`,
          toolName,
          'STATELESS',
          { toolName }
        );
      }
    }

    // 创建注册表项
    const item: FunctionRegistryItem = {
      execute,
      version,
      description,
      registeredAt: new Date(),
      callCount: 0
    };

    this.functions.set(toolName, item);
  }

  /**
   * 获取函数
   */
  get(toolName: string): FunctionRegistryItem | null {
    return this.functions.get(toolName) || null;
  }

  /**
   * 检查函数是否存在
   */
  has(toolName: string): boolean {
    return this.functions.has(toolName);
  }

  /**
   * 注销函数
   */
  unregister(toolName: string): boolean {
    return this.functions.delete(toolName);
  }

  /**
   * 执行函数
   */
  async execute(toolName: string, parameters: any): Promise<any> {
    const item = this.functions.get(toolName);
    
    if (!item) {
      throw new ToolError(
        `Function '${toolName}' is not registered`,
        toolName,
        'STATELESS',
        { toolName }
      );
    }

    try {
      const result = await item.execute(parameters);

      // 更新调用统计
      if (this.config.enableCallStatistics) {
        item.callCount++;
        item.lastCalledAt = new Date();
      }

      return result;
    } catch (error) {
      throw new ToolError(
        `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolName,
        'STATELESS',
        { parameters },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 获取所有函数名称
   */
  getFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * 获取所有函数信息
   */
  getAllFunctionInfo(): Map<string, FunctionRegistryItem> {
    return new Map(this.functions);
  }

  /**
   * 获取函数统计信息
   */
  getFunctionStats(toolName: string): {
    callCount: number;
    lastCalledAt?: Date;
    registeredAt: Date;
  } | null {
    const item = this.functions.get(toolName);
    if (!item) {
      return null;
    }

    return {
      callCount: item.callCount,
      lastCalledAt: item.lastCalledAt,
      registeredAt: item.registeredAt
    };
  }

  /**
   * 获取注册函数数
   */
  getFunctionCount(): number {
    return this.functions.size;
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.functions.clear();
  }

  /**
   * 批量注册函数
   */
  registerBatch(functions: Record<string, {
    execute: (parameters: any) => Promise<any>;
    version?: string;
    description?: string;
  }>): void {
    for (const [toolName, func] of Object.entries(functions)) {
      this.register(toolName, func.execute, func.version, func.description);
    }
  }
}