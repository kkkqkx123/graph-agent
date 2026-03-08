/**
 * 工具注册中心
 * 复用 tool-executors 包的 FunctionRegistry 和 StatefulExecutor
 */

import type { Tool, ToolParameters } from '@modular-agent/types';
import { FunctionRegistry, StatefulExecutor } from '@modular-agent/tool-executors';
import type { ToolDefinition, ToolRegistryConfig } from './types.js';
import { registerStatelessTools } from './stateless/index.js';
import { registerStatefulTools } from './stateful/index.js';

/**
 * 工具注册中心
 * 复用 tool-executors 的能力
 */
export class ToolRegistry {
  private config: ToolRegistryConfig;
  private tools: Map<string, ToolDefinition> = new Map();
  
  /** 复用 FunctionRegistry 管理无状态工具函数 */
  private functionRegistry: FunctionRegistry;
  
  /** 复用 StatefulExecutor 管理有状态工具实例 */
  private statefulExecutor: StatefulExecutor;

  constructor(config: ToolRegistryConfig = {}) {
    this.config = {
      workspaceDir: config.workspaceDir || process.cwd(),
      memoryFile: config.memoryFile || './workspace/.agent_memory.json'
    };
    
    // 初始化 tool-executors 组件
    this.functionRegistry = new FunctionRegistry({
      enableVersionControl: true,
      enableCallStatistics: true,
      maxFunctions: 100
    });
    
    this.statefulExecutor = new StatefulExecutor({
      enableInstanceCache: true,
      maxCachedInstances: 100,
      instanceExpirationTime: 3600000, // 1小时
      autoCleanupExpiredInstances: true,
      cleanupInterval: 300000 // 5分钟
    });
  }

  /**
   * 注册所有内置工具
   */
  async registerAll(): Promise<void> {
    // 注册无状态工具
    await registerStatelessTools(this, this.config);
    
    // 注册有状态工具
    await registerStatefulTools(this, this.config);
  }

  /**
   * 注册单个工具
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool '${tool.id}' already registered, overwriting...`);
    }
    this.tools.set(tool.id, tool);
    
    // 同时注册到对应的执行器
    if (tool.type === 'STATELESS' && tool.execute) {
      // 复用 FunctionRegistry 注册无状态工具
      this.functionRegistry.register(
        tool.id,
        tool.execute,
        tool.version,
        tool.description
      );
    }
    // 有状态工具在执行时通过 StatefulExecutor 管理
  }

  /**
   * 获取工具定义
   */
  get(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  /**
   * 获取所有工具定义
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * 转换为SDK Tool格式
   */
  toSdkTool(toolDef: ToolDefinition): Tool {
    const tool: Tool = {
      id: toolDef.id,
      name: toolDef.name,
      type: toolDef.type,
      description: toolDef.description,
      parameters: toolDef.parameters as ToolParameters
    };

    // 根据类型设置config
    if (toolDef.type === 'STATELESS' && toolDef.execute) {
      tool.config = {
        execute: toolDef.execute
      };
    } else if (toolDef.type === 'STATEFUL' && toolDef.factory) {
      tool.config = {
        factory: {
          create: toolDef.factory
        }
      };
    }

    return tool;
  }

  /**
   * 获取所有SDK格式的工具
   */
  getAllSdkTools(): Tool[] {
    return this.getAll().map(t => this.toSdkTool(t));
  }

  /**
   * 检查工具是否存在
   */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * 注销工具
   */
  unregister(toolId: string): boolean {
    // 从 FunctionRegistry 注销
    this.functionRegistry.unregister(toolId);
    return this.tools.delete(toolId);
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.functionRegistry.clear();
    this.tools.clear();
  }

  /**
   * 获取工具数量
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * 获取 FunctionRegistry（供外部使用）
   */
  getFunctionRegistry(): FunctionRegistry {
    return this.functionRegistry;
  }

  /**
   * 获取 StatefulExecutor（供外部使用）
   */
  getStatefulExecutor(): StatefulExecutor {
    return this.statefulExecutor;
  }

  /**
   * 获取函数统计信息（复用 FunctionRegistry 能力）
   */
  getFunctionStats(toolId: string) {
    return this.functionRegistry.getFunctionStats(toolId);
  }

  /**
   * 获取所有函数名称（复用 FunctionRegistry 能力）
   */
  getFunctionNames(): string[] {
    return this.functionRegistry.getFunctionNames();
  }

  /**
   * 清理指定线程的有状态工具实例（复用 StatefulExecutor 能力）
   */
  cleanupThread(threadId: string): void {
    this.statefulExecutor.cleanupThread(threadId);
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.statefulExecutor.cleanup();
    this.functionRegistry.clear();
    this.tools.clear();
  }
}

/**
 * 创建工具注册中心实例
 */
export function createToolRegistry(config?: ToolRegistryConfig): ToolRegistry {
  return new ToolRegistry(config);
}
