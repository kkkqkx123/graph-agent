/**
 * ProfileManagerAPI - Profile管理API
 * 封装ProfileManager，提供LLM Profile管理功能
 */

import { ProfileManager } from '../../core/llm/profile-manager';
import type { LLMProfile } from '../../types/llm';
import { ValidationError, NotFoundError, SDKError, ErrorCode } from '../../types/errors';

/**
 * Profile模板类型
 */
export interface ProfileTemplate {
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板Profile */
  profile: Partial<LLMProfile>;
}

/**
 * ProfileManagerAPI - Profile管理API
 */
export class ProfileManagerAPI {
  private profileManager: ProfileManager;
  private templates: Map<string, ProfileTemplate> = new Map();

  constructor() {
    this.profileManager = new ProfileManager();
    this.initializeTemplates();
  }

  /**
   * 注册Profile
   * @param profile LLM Profile配置
   */
  async registerProfile(profile: LLMProfile): Promise<void> {
    this.profileManager.register(profile);
  }

  /**
   * 批量注册Profile
   * @param profiles LLM Profile配置数组
   */
  async registerProfiles(profiles: LLMProfile[]): Promise<void> {
    for (const profile of profiles) {
      this.profileManager.register(profile);
    }
  }

  /**
   * 获取Profile
   * @param profileId Profile ID
   * @returns LLM Profile，如果不存在则返回null
   */
  async getProfile(profileId: string): Promise<LLMProfile | null> {
    const profile = this.profileManager.get(profileId);
    return profile || null;
  }

  /**
   * 获取所有Profile
   * @returns Profile列表
   */
  async getProfiles(): Promise<LLMProfile[]> {
    return this.profileManager.list();
  }

  /**
   * 按提供商获取Profile列表
   * @param provider 提供商
   * @returns Profile列表
   */
  async getProfilesByProvider(provider: string): Promise<LLMProfile[]> {
    const profiles = this.profileManager.list();
    return profiles.filter(profile => profile.provider === provider);
  }

  /**
   * 按模型获取Profile列表
   * @param model 模型名称
   * @returns Profile列表
   */
  async getProfilesByModel(model: string): Promise<LLMProfile[]> {
    const profiles = this.profileManager.list();
    return profiles.filter(profile => profile.model === model);
  }

  /**
   * 删除Profile
   * @param profileId Profile ID
   */
  async removeProfile(profileId: string): Promise<void> {
    this.profileManager.remove(profileId);
  }

  /**
   * 更新Profile
   * @param profileId Profile ID
   * @param updates 更新内容
   */
  async updateProfile(profileId: string, updates: Partial<LLMProfile>): Promise<void> {
    const profile = this.profileManager.get(profileId);
    if (!profile) {
      throw new NotFoundError(
        `Profile not found: ${profileId}`,
        'PROFILE',
        profileId,
        { availableProfiles: this.profileManager.list().map(p => p.id) }
      );
    }

    // 合并更新
    const updatedProfile = { ...profile, ...updates };
    this.profileManager.remove(profileId);
    this.profileManager.register(updatedProfile);
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
   * 检查Profile是否存在
   * @param profileId Profile ID
   * @returns 是否存在
   */
  async hasProfile(profileId: string): Promise<boolean> {
    return this.profileManager.has(profileId);
  }

  /**
   * 获取Profile数量
   * @returns Profile数量
   */
  async getProfileCount(): Promise<number> {
    return this.profileManager.size();
  }

  /**
   * 清空所有Profile
   */
  async clearProfiles(): Promise<void> {
    this.profileManager.clear();
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
    const profile = this.profileManager.get(profileId);
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
        throw new ValidationError(
          `Invalid profile: ${validation.errors.join(', ')}`,
          'profile',
          profile,
          { validationErrors: validation.errors }
        );
      }

      // 检查API Key是否被隐藏
      if (profile.apiKey === '***HIDDEN***') {
        throw new ValidationError(
          'Cannot import profile with hidden API key',
          'apiKey',
          '***HIDDEN***',
          { profileId: profile.id, reason: 'security' }
        );
      }

      this.profileManager.register(profile);
      return profile.id;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to import profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'json',
        json,
        { parseError: error instanceof Error ? error.message : 'Unknown error' }
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
        throw new ValidationError(
          'Invalid format: expected array of profiles',
          'profiles',
          profiles,
          { expectedType: 'array', receivedType: typeof profiles }
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
      throw new ValidationError(
        `Failed to import profiles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'profiles',
        undefined,
        { 
          parseError: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }
  }

  /**
   * 导出所有Profile
   * @returns JSON字符串
   */
  async exportAllProfiles(): Promise<string> {
    const profiles = this.profileManager.list();
    const exportData = profiles.map(profile => ({
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
      throw new SDKError(
        ErrorCode.NOT_FOUND_ERROR,
        `Template not found: ${templateName}`,
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

    this.profileManager.register(profile);
    return profile.id;
  }

  /**
   * 获取所有模板
   * @returns 模板列表
   */
  async getTemplates(): Promise<ProfileTemplate[]> {
    return Array.from(this.templates.values());
  }

  /**
   * 获取模板
   * @param templateName 模板名称
   * @returns 模板，如果不存在则返回null
   */
  async getTemplate(templateName: string): Promise<ProfileTemplate | null> {
    return this.templates.get(templateName) || null;
  }

  /**
   * 添加自定义模板
   * @param template 模板
   */
  async addTemplate(template: ProfileTemplate): Promise<void> {
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