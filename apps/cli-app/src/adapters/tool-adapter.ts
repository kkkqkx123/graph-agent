/**
 * 工具适配器
 * 封装工具相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import { ConfigManager } from '../config/config-manager.js';
import { resolve } from 'path';
import type { Tool, ToolOptions } from '@modular-agent/types';
import { StaticValidatorAPI } from '@modular-agent/sdk';
import type { ConfigurationValidationError } from '@modular-agent/types';
import { ToolRegistry, type ToolRegistryConfig } from '../tools/index.js';

/**
 * 工具适配器
 */
export class ToolAdapter extends BaseAdapter {
  private configManager: ConfigManager;
  private toolRegistry: ToolRegistry;

  constructor(configManager?: ConfigManager, registryConfig?: ToolRegistryConfig) {
    super();
    this.configManager = configManager || new ConfigManager();
    this.toolRegistry = new ToolRegistry(registryConfig);
  }

  /**
   * 从文件注册工具
   * @param filePath 配置文件路径
   * @returns 工具定义
   */
  async registerFromFile(filePath: string): Promise<Tool> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const fullPath = resolve(process.cwd(), filePath);
      const tool = await this.configManager.loadTool(fullPath);
      
      // 使用继承的 sdk 实例
      const api = this.sdk.tools;
      await api.create(tool);
      
      this.logger.success(`工具已注册: ${tool.name}`);
      return tool;
    }, '注册工具');
  }

  /**
   * 从目录批量注册工具
   * @param options 加载选项
   * @returns 注册结果
   */
  async registerFromDirectory(options: {
    configDir: string;
    recursive?: boolean;
    filePattern?: RegExp;
  }): Promise<{
    success: Tool[];
    failures: Array<{ filePath: string; error: string }>;
  }> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 批量加载配置
      const result = await this.configManager.loadTools(options);
      
      const success: Tool[] = [];
      const failures = result.failures;

      // 注册成功加载的工具
      const api = this.sdk.tools;
      for (const tool of result.configs) {
        try {
          await api.create(tool);
          success.push(tool);
          this.logger.success(`工具已注册: ${tool.name}`);
        } catch (error) {
          failures.push({
            filePath: tool.name,
            error: error instanceof Error ? error.message : String(error)
          });
          this.logger.error(`注册工具失败: ${tool.name}`);
        }
      }

      return { success, failures };
    }, '批量注册工具');
  }

  /**
   * 列出所有工具
   */
  async listTools(filter?: any): Promise<Tool[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.tools;
      const result = await api.getAll(filter);
      const tools = (result as any).data || result;
      return tools as Tool[];
    }, '列出工具');
  }

  /**
   * 获取工具详情
   */
  async getTool(id: string): Promise<Tool> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.tools;
      const result = await api.get(id);
      const tool = (result as any).data || result;
      return tool as Tool;
    }, '获取工具');
  }

  /**
   * 删除工具
   */
  async deleteTool(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.tools;
      await api.delete(id);
      this.logger.success(`工具已删除: ${id}`);
    }, '删除工具');
  }

  /**
   * 更新工具
   */
  async updateTool(id: string, updates: Partial<Tool>): Promise<Tool> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.tools;
      await api.update(id, updates);
      const result = await api.get(id);
      const tool = (result as any).data || result;
      this.logger.success(`工具已更新: ${id}`);
      return tool as Tool;
    }, '更新工具');
  }

  /**
   * 验证工具配置
   */
  async validateTool(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.executeWithErrorHandling(async () => {
      const fullPath = resolve(process.cwd(), filePath);
      const tool = await this.configManager.loadTool(fullPath);
      
      // 使用 StaticValidatorAPI 验证工具配置
      const validator = new StaticValidatorAPI();
      const result = validator.validateTool(tool);
      
      if (result.isErr()) {
        const errors = result.error.map((err: ConfigurationValidationError) => err.message);
        this.logger.error(`工具配置验证失败: ${filePath}`);
        return { valid: false, errors };
      }
      
      this.logger.success(`工具配置验证通过: ${filePath}`);
      return { valid: true, errors: [] };
    }, '验证工具');
  }

  /**
   * 执行工具
   */
  async executeTool(
    toolId: string,
    parameters: Record<string, any>,
    options?: ToolOptions
  ): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.tools;
      const service = api.getService();
      const result = await service.execute(toolId, parameters, options);
      
      // 处理 Result 类型
      if (result.isErr()) {
        throw result.error;
      }
      
      this.logger.success(`工具执行成功: ${toolId}`);
      return result.value;
    }, '执行工具');
  }

  /**
   * 验证工具参数
   */
  async validateParameters(
    toolId: string,
    parameters: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.tools;
      const result = await api.validateToolParameters(toolId, parameters);
      
      if (result.valid) {
        this.logger.success(`工具参数验证通过: ${toolId}`);
      } else {
        this.logger.error(`工具参数验证失败: ${toolId}`);
      }
      
      return result;
    }, '验证工具参数');
  }

  /**
   * 注册所有内置工具
   * 将内置工具注册到SDK
   */
  async registerBuiltinTools(): Promise<{
    success: Tool[];
    failures: Array<{ toolId: string; error: string }>;
  }> {
    return this.executeWithErrorHandling(async () => {
      // 注册所有内置工具到注册中心
      await this.toolRegistry.registerAll();
      
      const success: Tool[] = [];
      const failures: Array<{ toolId: string; error: string }> = [];
      
      const api = this.sdk.tools;
      const tools = this.toolRegistry.getAllSdkTools();
      
      for (const tool of tools) {
        try {
          await api.create(tool);
          success.push(tool);
          this.logger.success(`内置工具已注册: ${tool.name}`);
        } catch (error) {
          failures.push({
            toolId: tool.id,
            error: error instanceof Error ? error.message : String(error)
          });
          this.logger.error(`注册内置工具失败: ${tool.name}`);
        }
      }
      
      return { success, failures };
    }, '注册内置工具');
  }

  /**
   * 获取工具注册中心
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
}