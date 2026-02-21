/**
 * LLM Profile 适配器
 * 封装 LLM Profile 相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter.js';
import { ConfigManager } from '../config/config-manager.js';
import { resolve } from 'path';
import type { LLMProfile } from '@modular-agent/types';

/**
 * LLM Profile 适配器
 */
export class LLMProfileAdapter extends BaseAdapter {
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    super();
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * 从文件注册 LLM Profile
   * @param filePath 配置文件路径
   * @returns LLM Profile
   */
  async registerFromFile(filePath: string): Promise<LLMProfile> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 加载配置
      const fullPath = resolve(process.cwd(), filePath);
      const profile = await this.configManager.loadLLMProfile(fullPath);
      
      // 使用继承的 sdk 实例
      const api = this.sdk.profiles;
      await api.create(profile);
      
      this.logger.success(`LLM Profile 已注册: ${profile.id}`);
      return profile;
    }, '注册 LLM Profile');
  }

  /**
   * 从目录批量注册 LLM Profile
   * @param options 加载选项
   * @returns 注册结果
   */
  async registerFromDirectory(options: {
    configDir: string;
    recursive?: boolean;
    filePattern?: RegExp;
  }): Promise<{
    success: LLMProfile[];
    failures: Array<{ filePath: string; error: string }>;
  }> {
    return this.executeWithErrorHandling(async () => {
      // 使用 ConfigManager 批量加载配置
      const result = await this.configManager.loadLLMProfiles(options);
      
      const success: LLMProfile[] = [];
      const failures = result.failures;

      // 注册成功加载的 Profile
      const api = this.sdk.profiles;
      for (const profile of result.configs) {
        try {
          await api.create(profile);
          success.push(profile);
          this.logger.success(`LLM Profile 已注册: ${profile.id}`);
        } catch (error) {
          failures.push({
            filePath: profile.id,
            error: error instanceof Error ? error.message : String(error)
          });
          this.logger.error(`注册 LLM Profile 失败: ${profile.id}`);
        }
      }

      return { success, failures };
    }, '批量注册 LLM Profile');
  }

  /**
   * 列出所有 LLM Profile
   */
  async listProfiles(filter?: any): Promise<LLMProfile[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      const result = await api.getAll(filter);
      const profiles = (result as any).data || result;
      return profiles as LLMProfile[];
    }, '列出 LLM Profile');
  }

  /**
   * 获取 LLM Profile 详情
   */
  async getProfile(id: string): Promise<LLMProfile> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      const result = await api.get(id);
      const profile = (result as any).data || result;
      return profile as LLMProfile;
    }, '获取 LLM Profile');
  }

  /**
   * 删除 LLM Profile
   */
  async deleteProfile(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      await api.delete(id);
      this.logger.success(`LLM Profile 已删除: ${id}`);
    }, '删除 LLM Profile');
  }

  /**
   * 更新 LLM Profile
   */
  async updateProfile(id: string, updates: Partial<LLMProfile>): Promise<LLMProfile> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      await api.update(id, updates);
      const result = await api.get(id);
      const profile = (result as any).data || result;
      this.logger.success(`LLM Profile 已更新: ${id}`);
      return profile as LLMProfile;
    }, '更新 LLM Profile');
  }

  /**
   * 验证 LLM Profile 配置
   */
  async validateProfile(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.executeWithErrorHandling(async () => {
      const fullPath = resolve(process.cwd(), filePath);
      const profile = await this.configManager.loadLLMProfile(fullPath);
      
      const api = this.sdk.profiles;
      const result = await api.validateProfile(profile);
      
      if (result.valid) {
        this.logger.success(`LLM Profile 配置验证通过: ${filePath}`);
      } else {
        this.logger.error(`LLM Profile 配置验证失败: ${filePath}`);
      }
      
      return result;
    }, '验证 LLM Profile');
  }

  /**
   * 设置默认 LLM Profile
   */
  async setDefaultProfile(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      await api.setDefaultProfile(id);
      this.logger.success(`已设置默认 LLM Profile: ${id}`);
    }, '设置默认 LLM Profile');
  }

  /**
   * 获取默认 LLM Profile
   */
  async getDefaultProfile(): Promise<LLMProfile | null> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      const result = await api.getDefaultProfile();
      return result;
    }, '获取默认 LLM Profile');
  }

  /**
   * 导出 LLM Profile
   */
  async exportProfile(id: string): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      const result = await api.exportProfile(id);
      return result;
    }, '导出 LLM Profile');
  }

  /**
   * 导入 LLM Profile
   */
  async importProfile(json: string): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.profiles;
      const profileId = await api.importProfile(json);
      this.logger.success(`LLM Profile 已导入: ${profileId}`);
      return profileId;
    }, '导入 LLM Profile');
  }
}