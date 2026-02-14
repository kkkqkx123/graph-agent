/**
 * ProfileRegistryAPI - Profile资源管理API
 * 封装ProfileManager，提供LLM Profile管理功能
 * 重构版本：继承GenericResourceAPI，提高代码复用性和一致性
 */

import { ProfileManager } from '../../../core/llm/profile-manager';
import type { LLMProfile, LLMProvider } from '@modular-agent/types';
import { ValidationError, NotFoundError, SDKError, ConfigurationValidationError, NodeTemplateNotFoundError } from '@modular-agent/types';
import { GenericResourceAPI } from '../generic-resource-api';
import { getErrorMessage } from '../../types/execution-result';
import type { APIDependencies } from '../../core/api-dependencies';

/**
 * Profile模板类型
 */
export interface LLMProfileTemplate {
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板Profile */
  profile: Partial<LLMProfile>;
}

/**
 * Profile过滤器
 */
export interface LLMProfileFilter {
  /** Profile ID */
  id?: string;
  /** Profile名称 */
  name?: string;
  /** LLM提供商 */
  provider?: LLMProvider;
  /** 模型名称 */
  model?: string;
}


/**
 * ProfileRegistryAPI - Profile资源管理API
 * 
 * 重构说明：
 * - 继承GenericResourceAPI，复用通用CRUD操作
 * - 实现所有抽象方法以适配ProfileManager
 * - 保留所有原有API方法以保持向后兼容
 * - 新增缓存、日志、验证等增强功能
 */
export class LLMProfileRegistryAPI extends GenericResourceAPI<LLMProfile, string, LLMProfileFilter> {
  private profileManager: ProfileManager;
  private templates: Map<string, LLMProfileTemplate> = new Map();

  constructor(dependencies: APIDependencies) {
    super();
    this.profileManager = new ProfileManager();
    this.initializeTemplates();
  }

  /**
   * 获取单个Profile
   * @param id Profile ID
   * @returns LLM Profile，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<LLMProfile | null> {
    const profile = this.profileManager.get(id);
    return profile || null;
  }

  /**
   * 获取所有Profile
   * @returns Profile列表
   */
  protected async getAllResources(): Promise<LLMProfile[]> {
    return this.profileManager.list();
  }

  /**
   * 创建Profile
   * @param resource LLM Profile配置
   */
  protected async createResource(resource: LLMProfile): Promise<void> {
    this.profileManager.register(resource);
  }

  /**
   * 更新Profile
   * @param id Profile ID
   * @param updates 更新内容
   */
  protected async updateResource(id: string, updates: Partial<LLMProfile>): Promise<void> {
    const profile = this.profileManager.get(id);
    if (!profile) {
      throw new NotFoundError(
        `Profile not found: ${id}`,
        'PROFILE',
        id,
        { availableProfiles: this.profileManager.list().map(p => p.id) }
      );
    }

    // 合并更新
    const updatedProfile = { ...profile, ...updates };
    this.profileManager.remove(id);
    this.profileManager.register(updatedProfile);
  }

  /**
   * 删除Profile
   * @param id Profile ID
   */
  protected async deleteResource(id: string): Promise<void> {
    this.profileManager.remove(id);
  }

  /**
   * 应用过滤条件
   * @param resources Profile数组
   * @param filter 过滤条件
   * @returns 过滤后的Profile数组
   */
  protected applyFilter(resources: LLMProfile[], filter: LLMProfileFilter): LLMProfile[] {
    return resources.filter(profile => {
      if (filter.id && !profile.id.includes(filter.id)) {
        return false;
      }
      if (filter.name && !profile.name.includes(filter.name)) {
        return false;
      }
      if (filter.provider && profile.provider !== filter.provider) {
        return false;
      }
      if (filter.model && !profile.model.includes(filter.model)) {
        return false;
      }
      return true;
    });
  }

  /**
   * 设置默认Profile
   * @param profileId Profile ID
   */
  async setDefaultProfile(profileId: string): Promise<void> {
    this.profileManager.setDefault(profileId);
  }

  /**
   * 获取默认Profile
   * @returns 默认Profile，如果不存在则返回null
   */
  async getDefaultProfile(): Promise<LLMProfile | null> {
    const profile = this.profileManager.getDefault();
    return profile || null;
  }

  /**
   * 获取默认Profile ID
   * @returns 默认Profile ID，如果不存在则返回null
   */
  async getDefaultProfileId(): Promise<string | null> {
    const profile = this.profileManager.getDefault();
    return profile?.id || null;
  }

  /**
   * 验证Profile
   * @param profile LLM Profile配置
   * @returns 验证结果
   */
  async validateProfile(profile: Partial<LLMProfile>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!profile.id) {
      errors.push('Profile ID is required');
    }

    if (!profile.name) {
      errors.push('Profile name is required');
    }

    if (!profile.provider) {
      errors.push('Profile provider is required');
    }

    if (!profile.model) {
      errors.push('Profile model is required');
    }

    if (!profile.apiKey) {
      errors.push('Profile apiKey is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 导出Profile
   * @param profileId Profile ID
   * @returns JSON字符串
   */
  async exportProfile(profileId: string): Promise<string> {
    const profile = await this.get(profileId);
    if (!profile) {
      throw new NotFoundError(
        `Profile not found: ${profileId}`,
        'PROFILE',
        profileId,
        { availableProfiles: this.profileManager.list().map(p => p.id) }
      );
    }

    // 隐藏敏感信息
    const exportData = {
      ...profile,
      apiKey: '***HIDDEN***'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入Profile
   * @param json JSON字符串
   * @returns Profile ID
   */
  async importProfile(json: string): Promise<string> {
    try {
      const profile = JSON.parse(json) as LLMProfile;

      // 验证Profile
      const validation = await this.validateProfile(profile);
      if (!validation.valid) {
        throw new ConfigurationValidationError(
          `Invalid profile: ${validation.errors.join(', ')}`,
          {
            configType: 'llm',
            context: { validationErrors: validation.errors }
          }
        );
      }

      // 检查API Key是否被隐藏
      if (profile.apiKey === '***HIDDEN***') {
        throw new ConfigurationValidationError(
          'Cannot import profile with hidden API key',
          {
            configType: 'llm',
            context: { profileId: profile.id, reason: 'security' }
          }
        );
      }

      const result = await this.create(profile);
      if (!result.success) {
        throw new ConfigurationValidationError(
          `Failed to import profile: ${result.error}`,
          {
            configType: 'llm',
            context: { importError: result.error }
          }
        );
      }

      return profile.id;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ConfigurationValidationError(
        `Failed to import profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          configType: 'llm',
          configPath: 'profile',
          context: { parseError: error instanceof Error ? error.message : 'Unknown error' }
        }
      );
    }
  }

  /**
   * 批量导入Profile
   * @param json JSON字符串（数组格式）
   * @returns Profile ID数组
   */
  async importProfiles(json: string): Promise<string[]> {
    try {
      const profiles = JSON.parse(json) as LLMProfile[];
      if (!Array.isArray(profiles)) {
        throw new ConfigurationValidationError(
          'Invalid format: expected array of profiles',
          {
            configType: 'llm',
            configPath: 'profiles',
            context: { expectedType: 'array', receivedType: typeof profiles }
          }
        );
      }

      const profileIds: string[] = [];
      for (const profile of profiles) {
        const profileId = await this.importProfile(JSON.stringify(profile));
        profileIds.push(profileId);
      }

      return profileIds;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ConfigurationValidationError(
        `Failed to import profiles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          configType: 'llm',
          configPath: 'profiles'
        }
      );
    }
  }

  /**
   * 导出所有Profile
   * @returns JSON字符串
   */
  async exportAllProfiles(): Promise<string> {
    const result = await this.getAll();
    if (!result.success) {
      throw new Error(getErrorMessage(result) || 'Failed to get profiles for export');
    }
    const exportData = result.data.map((profile: LLMProfile) => ({
      ...profile,
      apiKey: '***HIDDEN***'
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 从模板创建Profile
   * @param templateName 模板名称
   * @param overrides 覆盖配置
   * @returns Profile ID
   */
  async createFromTemplate(templateName: string, overrides: Partial<LLMProfile>): Promise<string> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new NodeTemplateNotFoundError(
        `Template not found: ${templateName}`,
        templateName,
        { templateName }
      );
    }

    // 合并模板和覆盖配置
    const profile: LLMProfile = {
      id: overrides.id || `profile-${Date.now()}`,
      name: overrides.name || template.name,
      provider: overrides.provider || template.profile.provider!,
      model: overrides.model || template.profile.model!,
      apiKey: overrides.apiKey || template.profile.apiKey!,
      baseUrl: overrides.baseUrl || template.profile.baseUrl,
      parameters: overrides.parameters || template.profile.parameters || {},
      headers: overrides.headers || template.profile.headers,
      timeout: overrides.timeout || template.profile.timeout,
      maxRetries: overrides.maxRetries || template.profile.maxRetries,
      retryDelay: overrides.retryDelay || template.profile.retryDelay,
      metadata: overrides.metadata || template.profile.metadata
    };

    const result = await this.create(profile);
    if (!result.success) {
      throw new ConfigurationValidationError(
        `Failed to create profile from template: ${result.error}`,
        {
          configType: 'llm',
          configPath: 'profile'
        }
      );
    }

    return profile.id;
  }

  /**
   * 获取所有模板
   * @returns 模板列表
   */
  async getTemplates(): Promise<LLMProfileTemplate[]> {
    return Array.from(this.templates.values());
  }

  /**
   * 获取模板
   * @param templateName 模板名称
   * @returns 模板，如果不存在则返回null
   */
  async getTemplate(templateName: string): Promise<LLMProfileTemplate | null> {
    return this.templates.get(templateName) || null;
  }

  /**
   * 添加自定义模板
   * @param template 模板
   */
  async addTemplate(template: LLMProfileTemplate): Promise<void> {
    this.templates.set(template.name, template);
  }

  /**
   * 删除模板
   * @param templateName 模板名称
   */
  async removeTemplate(templateName: string): Promise<void> {
    this.templates.delete(templateName);
  }

  /**
   * 获取底层ProfileManager实例
   * @returns ProfileManager实例
   */
  getManager(): ProfileManager {
    return this.profileManager;
  }

  /**
   * 初始化内置模板
   */
  private initializeTemplates(): void {
    // OpenAI Chat模板
    this.templates.set('openai-chat', {
      name: 'OpenAI Chat',
      description: 'OpenAI Chat API配置模板',
      profile: {
        id: '',
        name: '',
        provider: 'OPENAI_CHAT' as any,
        model: 'gpt-4',
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000
        }
      }
    });

    // Anthropic模板
    this.templates.set('anthropic', {
      name: 'Anthropic',
      description: 'Anthropic Claude配置模板',
      profile: {
        id: '',
        name: '',
        provider: 'ANTHROPIC' as any,
        model: 'claude-3-opus-20240229',
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxTokens: 4096
        }
      }
    });

    // Gemini模板
    this.templates.set('gemini', {
      name: 'Gemini',
      description: 'Google Gemini配置模板',
      profile: {
        id: '',
        name: '',
        provider: 'GEMINI_NATIVE' as any,
        model: 'gemini-pro',
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      }
    });
  }
}