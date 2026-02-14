/**
 * ScriptRegistryAPI - 脚本资源管理API
 * 封装CodeService，提供脚本注册、查询功能
 */

import {
  validateRequiredFields,
  validateStringLength,
  validateBoolean,
  validateEnum
} from '../../validation/validation-strategy';

import type { Script } from '@modular-agent/types';
import { ScriptType } from '@modular-agent/types';
import type { ScriptFilter, ScriptRegistrationConfig } from '@modular-agent/sdk/api/types/code-types';
import { NotFoundError } from '@modular-agent/types';
import { GenericResourceAPI } from '../generic-resource-api';
import type { APIDependencies } from '../../core/api-dependencies';

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
  private dependencies: APIDependencies;

  constructor(dependencies: APIDependencies) {
    super();
    this.dependencies = dependencies;
  }

  /**
   * 获取单个脚本
   * @param id 脚本名称
   * @returns 脚本定义，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<Script | null> {
    try {
      return this.dependencies.getCodeService().getScript(id);
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
    return this.dependencies.getCodeService().listScripts();
  }

  /**
   * 创建/注册脚本
   * @param script 脚本定义
   */
  protected async createResource(script: Script): Promise<void> {
    this.dependencies.getCodeService().registerScript(script);
  }

  /**
   * 更新脚本
   * @param id 脚本名称
   * @param updates 更新内容
   */
  protected async updateResource(id: string, updates: Partial<Script>): Promise<void> {
    this.dependencies.getCodeService().updateScript(id, updates);
  }

  /**
   * 删除脚本
   * @param id 脚本名称
   */
  protected async deleteResource(id: string): Promise<void> {
    this.dependencies.getCodeService().unregisterScript(id);
  }

  /**
   * 清空所有脚本
   */
  protected override async clearResources(): Promise<void> {
    this.dependencies.getCodeService().clearScripts();
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
   * @param context 验证上下文
   * @returns 验证结果
   */
  protected override async validateResource(
    script: Script,
    context?: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 使用简化验证工具验证必需字段
    const requiredResult = validateRequiredFields(script, ['name', 'type', 'description'], 'script');
    if (requiredResult.isErr()) {
      errors.push(...requiredResult.unwrapOrElse(err => err.map(error => error.message)));
    }

    // 验证内容或文件路径至少提供一个
    if (!script.content && !script.filePath) {
      errors.push('脚本内容或文件路径必须提供其中一个');
    }

    // 验证名称长度
    if (script.name) {
      const nameResult = validateStringLength(script.name, '脚本名称', 1, 100);
      if (nameResult.isErr()) {
        errors.push(...nameResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证描述长度
    if (script.description) {
      const descriptionResult = validateStringLength(script.description, '脚本描述', 1, 500);
      if (descriptionResult.isErr()) {
        errors.push(...descriptionResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证 enabled 字段（如果提供）
    if (script.enabled !== undefined) {
      const enabledResult = validateBoolean(script.enabled, 'enabled');
      if (enabledResult.isErr()) {
        errors.push(...enabledResult.unwrapOrElse(err => err.map(error => error.message)));
      }
    }

    // 验证类型枚举值
    if (script.type) {
      const validTypes = ['javascript', 'typescript', 'python', 'shell'];
      const typeResult = validateEnum(script.type, '脚本类型', validTypes);
      if (typeResult.isErr()) {
        errors.push(...typeResult.unwrapOrElse(err => err.map(error => error.message)));
      }
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
    return this.dependencies.getCodeService().searchScripts(query);
  }

  /**
   * 验证脚本
   * @param scriptName 脚本名称
   * @returns 验证结果
   */
  async validateScript(scriptName: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.dependencies.getCodeService().validateScript(scriptName);
  }

  /**
   * 获取底层CodeService实例
   * @returns CodeService实例
   */
  getService() {
    return this.dependencies.getCodeService();
  }

  /**
   * 启用脚本
   * @param scriptName 脚本名称
   */
  async enableScript(scriptName: string): Promise<void> {
    this.dependencies.getCodeService().enableScript(scriptName);
  }

  /**
   * 禁用脚本
   * @param scriptName 脚本名称
   */
  async disableScript(scriptName: string): Promise<void> {
    this.dependencies.getCodeService().disableScript(scriptName);
  }

  /**
   * 检查脚本是否启用
   * @param scriptName 脚本名称
   * @returns 是否启用
   */
  async isScriptEnabled(scriptName: string): Promise<boolean> {
    return this.dependencies.getCodeService().isScriptEnabled(scriptName);
  }
}