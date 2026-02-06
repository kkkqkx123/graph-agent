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
      enableValidation: true,
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
        // 使用 enabled 字段进行过滤，默认值为 true
        const scriptEnabled = script.enabled ?? true;
        if (scriptEnabled !== filter.enabled) {
          return false;
        }
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

    // 验证 enabled 字段（如果提供）
    if (script.enabled !== undefined && typeof script.enabled !== 'boolean') {
      errors.push('enabled 字段必须是布尔值');
    }

    return {
      valid: errors.length === 0,
      errors
    };
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
   * 验证脚本
   * @param scriptName 脚本名称
   * @returns 验证结果
   */
  async validateScript(scriptName: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.codeService.validateScript(scriptName);
  }

  /**
   * 获取底层CodeService实例
   * @returns CodeService实例
   */
  getService() {
    return this.codeService;
  }

  /**
   * 启用脚本
   * @param scriptName 脚本名称
   */
  async enableScript(scriptName: string): Promise<void> {
    this.codeService.enableScript(scriptName);
  }

  /**
   * 禁用脚本
   * @param scriptName 脚本名称
   */
  async disableScript(scriptName: string): Promise<void> {
    this.codeService.disableScript(scriptName);
  }

  /**
   * 检查脚本是否启用
   * @param scriptName 脚本名称
   * @returns 是否启用
   */
  async isScriptEnabled(scriptName: string): Promise<boolean> {
    return this.codeService.isScriptEnabled(scriptName);
  }
}