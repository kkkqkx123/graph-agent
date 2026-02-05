/**
 * ScriptRegistryAPI - 脚本资源管理API
 * 封装CodeService，提供脚本注册、查询功能
 */

import { codeService } from '../../../core/services/code-service';
import type { Script } from '../../../types/code';
import { ScriptType } from '../../../types/code';
import type { ScriptFilter, ScriptRegistrationConfig } from '../../types/code-types';
import { NotFoundError } from '../../../types/errors';

/**
 * ScriptRegistryAPI - 脚本资源管理API
 */
export class ScriptRegistryAPI {
  private codeService = codeService;

  /**
   * 注册脚本
   * @param script 脚本定义
   * @param config 注册配置
   */
  async registerScript(script: Script, config?: ScriptRegistrationConfig): Promise<void> {
    const registrationConfig = {
      overwrite: config?.overwrite ?? false,
      validate: config?.validate ?? true,
      enable: config?.enable ?? true
    };

    // 检查脚本是否已存在
    if (this.codeService.hasScript(script.name) && !registrationConfig.overwrite) {
      throw new Error(`Script '${script.name}' already exists`);
    }

    // 验证脚本
    if (registrationConfig.validate) {
      const validation = this.codeService.validateScript(script.name);
      if (!validation.valid) {
        throw new Error(`Script validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // 注册脚本
    this.codeService.registerScript(script);
  }

  /**
   * 批量注册脚本
   * @param scripts 脚本定义数组
   * @param config 注册配置
   */
  async registerScripts(scripts: Script[], config?: ScriptRegistrationConfig): Promise<void> {
    for (const script of scripts) {
      await this.registerScript(script, config);
    }
  }

  /**
   * 注销脚本
   * @param scriptName 脚本名称
   */
  async unregisterScript(scriptName: string): Promise<void> {
    this.codeService.unregisterScript(scriptName);
  }

  /**
   * 获取脚本定义
   * @param scriptName 脚本名称
   * @returns 脚本定义，如果不存在则返回null
   */
  async getScript(scriptName: string): Promise<Script | null> {
    try {
      return this.codeService.getScript(scriptName);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取脚本列表
   * @param filter 过滤条件
   * @returns 脚本定义数组
   */
  async getScripts(filter?: ScriptFilter): Promise<Script[]> {
    let scripts = this.codeService.listScripts();

    // 应用过滤条件
    if (filter) {
      scripts = this.applyFilter(scripts, filter);
    }

    return scripts;
  }

  /**
   * 按类型获取脚本列表
   * @param type 脚本类型
   * @returns 脚本定义数组
   */
  async getScriptsByType(type: ScriptType): Promise<Script[]> {
    return this.codeService.listScriptsByType(type);
  }

  /**
   * 按分类获取脚本列表
   * @param category 脚本分类
   * @returns 脚本定义数组
   */
  async getScriptsByCategory(category: string): Promise<Script[]> {
    return this.codeService.listScriptsByCategory(category);
  }

  /**
   * 搜索脚本
   * @param query 搜索关键词
   * @returns 脚本定义数组
   */
  async searchScripts(query: string): Promise<Script[]> {
    return this.codeService.searchScripts(query);
  }

  /**
   * 检查脚本是否存在
   * @param scriptName 脚本名称
   * @returns 是否存在
   */
  async hasScript(scriptName: string): Promise<boolean> {
    return this.codeService.hasScript(scriptName);
  }

  /**
   * 验证脚本
   * @param scriptName 脚本名称
   * @returns 验证结果
   */
  async validateScript(scriptName: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.codeService.validateScript(scriptName);
  }

  /**
   * 更新脚本定义
   * @param scriptName 脚本名称
   * @param updates 更新内容
   */
  async updateScript(scriptName: string, updates: Partial<Script>): Promise<void> {
    this.codeService.updateScript(scriptName, updates);
  }

  /**
   * 获取脚本数量
   * @returns 脚本数量
   */
  async getScriptCount(): Promise<number> {
    const scripts = await this.getScripts();
    return scripts.length;
  }

  /**
   * 清空所有脚本
   */
  async clearScripts(): Promise<void> {
    this.codeService.clearScripts();
  }

  /**
   * 获取底层CodeService实例
   * @returns CodeService实例
   */
  getService() {
    return this.codeService;
  }

  /**
   * 应用过滤条件
   * @param scripts 脚本数组
   * @param filter 过滤条件
   * @returns 过滤后的脚本数组
   */
  private applyFilter(scripts: Script[], filter: ScriptFilter): Script[] {
    return scripts.filter(script => {
      if (filter.name && !script.name.includes(filter.name)) {
        return false;
      }
      if (filter.type && script.type !== filter.type) {
        return false;
      }
      if (filter.category && script.metadata?.category !== filter.category) {
        return false;
      }
      if (filter.tags && script.metadata?.tags) {
        if (!filter.tags.every(tag => script.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      if (filter.enabled !== undefined) {
        // 注意：Script接口目前没有enabled字段，这里假设所有脚本都是启用的
        // 如果需要支持禁用脚本，需要在Script接口中添加enabled字段
        return true;
      }
      return true;
    });
  }
}