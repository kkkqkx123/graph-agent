/**
 * 脚本适配器
 * 封装脚本相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import { ConfigManager } from '../config/config-manager.js';
import { resolve } from 'path';
import type { Script, ScriptExecutionOptions } from '@modular-agent/types';

/**
 * 脚本适配器
 */
export class ScriptAdapter extends BaseAdapter {
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    super();
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * 从文件注册脚本
   * @param filePath 配置文件路径
   * @returns 脚本定义
   */
  async registerFromFile(filePath: string): Promise<Script> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const fullPath = resolve(process.cwd(), filePath);
      const script = await this.configManager.loadScript(fullPath);
      
      // 使用继承的 sdk 实例
      const api = this.sdk.scripts;
      await api.create(script);
      
      this.logger.success(`脚本已注册: ${script.name}`);
      return script;
    }, '注册脚本');
  }

  /**
   * 从目录批量注册脚本
   * @param options 加载选项
   * @returns 注册结果
   */
  async registerFromDirectory(options: {
    configDir: string;
    recursive?: boolean;
    filePattern?: RegExp;
  }): Promise<{
    success: Script[];
    failures: Array<{ filePath: string; error: string }>;
  }> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 批量加载配置
      const result = await this.configManager.loadScripts(options);
      
      const success: Script[] = [];
      const failures = result.failures;

      // 注册成功加载的脚本
      const api = this.sdk.scripts;
      for (const script of result.configs) {
        try {
          await api.create(script);
          success.push(script);
          this.logger.success(`脚本已注册: ${script.name}`);
        } catch (error) {
          failures.push({
            filePath: script.name,
            error: error instanceof Error ? error.message : String(error)
          });
          this.logger.error(`注册脚本失败: ${script.name}`);
        }
      }

      return { success, failures };
    }, '批量注册脚本');
  }

  /**
   * 列出所有脚本
   */
  async listScripts(filter?: any): Promise<Script[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.scripts;
      const result = await api.getAll(filter);
      const scripts = (result as any).data || result;
      return scripts as Script[];
    }, '列出脚本');
  }

  /**
   * 获取脚本详情
   */
  async getScript(id: string): Promise<Script> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.scripts;
      const result = await api.get(id);
      const script = (result as any).data || result;
      return script as Script;
    }, '获取脚本');
  }

  /**
   * 删除脚本
   */
  async deleteScript(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.scripts;
      await api.delete(id);
      this.logger.success(`脚本已删除: ${id}`);
    }, '删除脚本');
  }

  /**
   * 更新脚本
   */
  async updateScript(id: string, updates: Partial<Script>): Promise<Script> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.scripts;
      await api.update(id, updates);
      const result = await api.get(id);
      const script = (result as any).data || result;
      this.logger.success(`脚本已更新: ${id}`);
      return script as Script;
    }, '更新脚本');
  }

  /**
   * 验证脚本配置
   */
  async validateScript(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.executeWithErrorHandling(async () => {
      const fullPath = resolve(process.cwd(), filePath);
      const script = await this.configManager.loadScript(fullPath);
      
      // 使用 SDK 的验证功能
      const api = this.sdk.scripts;
      const result = await api.validateScript(script.name);
      
      if (result.valid) {
        this.logger.success(`脚本配置验证通过: ${filePath}`);
      } else {
        this.logger.error(`脚本配置验证失败: ${filePath}`);
      }
      
      return result;
    }, '验证脚本');
  }

  /**
   * 执行脚本
   */
  async executeScript(
    scriptName: string,
    options?: ScriptExecutionOptions
  ): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.scripts;
      const service = api.getService();
      const result = await service.execute(scriptName, options);
      
      // 处理 Result 类型
      if (result.isErr()) {
        throw result.error;
      }
      
      this.logger.success(`脚本执行成功: ${scriptName}`);
      return result.value;
    }, '执行脚本');
  }
}