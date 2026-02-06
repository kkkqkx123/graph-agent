/**
 * ScriptRegistryAPI - 脚本资源管理API
 * 封装CodeService，提供脚本注册、查询功能
 */

import { codeService } from '../../../core/services/code-service';
import type { Script } from '../../../types/code';
import { ScriptType } from '../../../types/code';
import type { ScriptFilter, ScriptRegistrationConfig } from '../../types/code-types';
import { NotFoundError } from '../../../types/errors';
import { GenericResourceAPI, type ResourceAPIOptions } from '../generic-resource-api';

/**
 * ScriptRegistryAPI - 脚本资源管理API
 * 
 * 改进点：
 * - 继承GenericResourceAPI，减少重复代码
 * - 统一的缓存管理
 * - 统一的错误处理
 * - 统一的过滤逻辑
 * - 保持向后兼容性
 */
export class ScriptRegistryAPI extends GenericResourceAPI<Script, string, ScriptFilter> {
  private codeService = codeService;

  constructor(options?: Partial<ResourceAPIOptions>) {
    super({
      enableCache: true,
      cacheTTL: 300000, // 5分钟
      enableValidation: true,
      enableLogging: true,
      ...options
    });
  }

  /**
   * 获取单个脚本
   * @param id 脚本名称
   * @returns 脚本定义，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<Script | null> {
    try {
      return this.codeService.getScript(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取所有脚本
   * @returns 脚本定义数组
   */
  protected async getAllResources(): Promise<Script[]> {
    return this.codeService.listScripts();
  }

  /**
   * 创建/注册脚本
   * @param script 脚本定义
   */
  protected async createResource(script: Script): Promise<void> {
    this.codeService.registerScript(script);
  }

  /**
   * 更新脚本
   * @param id 脚本名称
   * @param updates 更新内容
   */
  protected async updateResource(id: string, updates: Partial<Script>): Promise<void> {
    this.codeService.updateScript(id, updates);
  }

  /**
   * 删除脚本
   * @param id 脚本名称
   */
  protected async deleteResource(id: string): Promise<void> {
    this.codeService.unregisterScript(id);
  }

  /**
   * 清空所有脚本
   */
  protected override async clearResources(): Promise<void> {
    this.codeService.clearScripts();
  }

  /**
   * 应用过滤条件
   * @param scripts 脚本数组
   * @param filter 过滤条件
   * @returns 过滤后的脚本数组
   */
  protected applyFilter(scripts: Script[], filter: ScriptFilter): Script[] {
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

  /**
   * 验证脚本定义
   * @param script 脚本定义
   * @returns 验证结果
   */
  protected override validateResource(script: Script): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!script.name || script.name.trim() === '') {
      errors.push('脚本名称不能为空');
    }

    if (!script.type || script.type.trim() === '') {
      errors.push('脚本类型不能为空');
    }

    if (!script.content && !script.filePath) {
      errors.push('脚本内容或文件路径必须提供其中一个');
    }

    if (!script.description || script.description.trim() === '') {
      errors.push('脚本描述不能为空');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ==================== 向后兼容的公共方法 ====================

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
    if (await this.has(script.name) && !registrationConfig.overwrite) {
      throw new Error(`Script '${script.name}' already exists`);
    }

    // 验证脚本（注意：validateScript 需要脚本已注册，所以这里跳过）
    // 验证在 createResource 中通过 validateResource 方法进行

    // 注册脚本
    const result = await this.create(script);
    if (!result.success) {
      throw new Error(result.error || '注册脚本失败');
    }
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
    const result = await this.delete(scriptName);
    if (!result.success) {
      throw new Error(result.error || '注销脚本失败');
    }
  }

  /**
   * 获取脚本定义
   * @param scriptName 脚本名称
   * @returns 脚本定义，如果不存在则返回null
   */
  async getScript(scriptName: string): Promise<Script | null> {
    const result = await this.get(scriptName);
    return result.success ? result.data : null;
  }

  /**
   * 获取脚本列表
   * @param filter 过滤条件
   * @returns 脚本定义数组
   */
  async getScripts(filter?: ScriptFilter): Promise<Script[]> {
    const result = await this.getAll(filter);
    return result.success ? result.data : [];
  }

  /**
   * 按类型获取脚本列表
   * @param type 脚本类型
   * @returns 脚本定义数组
   */
  async getScriptsByType(type: ScriptType): Promise<Script[]> {
    return this.getScripts({ type });
  }

  /**
   * 按分类获取脚本列表
   * @param category 脚本分类
   * @returns 脚本定义数组
   */
  async getScriptsByCategory(category: string): Promise<Script[]> {
    return this.getScripts({ category });
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
    const result = await this.has(scriptName);
    return result.success ? result.data : false;
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
    const result = await this.update(scriptName, updates);
    if (!result.success) {
      throw new Error(result.error || '更新脚本失败');
    }
  }

  /**
   * 获取脚本数量
   * @returns 脚本数量
   */
  async getScriptCount(): Promise<number> {
    const result = await this.count();
    return result.success ? result.data : 0;
  }

  /**
   * 清空所有脚本
   */
  async clearScripts(): Promise<void> {
    const result = await this.clear();
    if (!result.success) {
      throw new Error(result.error || '清空脚本失败');
    }
  }

  /**
   * 获取底层CodeService实例
   * @returns CodeService实例
   */
  getService() {
    return this.codeService;
  }
}