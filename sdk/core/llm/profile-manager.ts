/**
 * Profile管理器
 * 
 * 负责LLM Profile的管理，提供配置注册、查询、删除等功能
 * 支持默认Profile的自动管理
 */

import type { LLMProfile } from '@modular-agent/types/llm';
import { ValidationError, NotFoundError } from '@modular-agent/types/errors';

/**
 * Profile管理器类
 * 
 * 管理LLM Profile的生命周期，提供统一的配置访问接口
 */
export class ProfileManager {
  private profiles: Map<string, LLMProfile> = new Map();
  private defaultProfileId: string | null = null;

  /**
   * 注册Profile
   * 
   * @param profile LLM Profile配置
   */
  register(profile: LLMProfile): void {
    // 验证Profile
    this.validateProfile(profile);

    // 存储Profile
    this.profiles.set(profile.id, profile);

    // 如果是第一个Profile，设置为默认Profile
    if (this.profiles.size === 1) {
      this.defaultProfileId = profile.id;
    }
  }

  /**
   * 获取Profile
   * 
   * @param profileId Profile ID，如果未提供则返回默认Profile
   * @returns LLM Profile或undefined
   */
  get(profileId?: string): LLMProfile | undefined {
    if (!profileId) {
      return this.getDefault();
    }
    return this.profiles.get(profileId);
  }

  /**
   * 获取默认Profile
   * 
   * @returns 默认Profile或undefined
   */
  getDefault(): LLMProfile | undefined {
    if (!this.defaultProfileId) {
      return undefined;
    }
    return this.profiles.get(this.defaultProfileId);
  }

  /**
    * 设置默认Profile
    *
    * @param profileId Profile ID
    */
  setDefault(profileId: string): void {
    if (!this.profiles.has(profileId)) {
      throw new NotFoundError(
        `Profile not found: ${profileId}`,
        'PROFILE',
        profileId,
        { availableProfiles: Array.from(this.profiles.keys()) }
      );
    }
    this.defaultProfileId = profileId;
  }

  /**
   * 删除Profile
   * 
   * @param profileId Profile ID
   */
  remove(profileId: string): void {
    this.profiles.delete(profileId);

    // 如果删除的是默认Profile，重新设置默认Profile
    if (this.defaultProfileId === profileId) {
      const firstProfile = this.profiles.values().next().value;
      this.defaultProfileId = firstProfile ? firstProfile.id : null;
    }
  }

  /**
   * 列出所有Profile
   * 
   * @returns Profile列表
   */
  list(): LLMProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * 清除所有Profile
   */
  clear(): void {
    this.profiles.clear();
    this.defaultProfileId = null;
  }

  /**
   * 检查Profile是否存在
   * 
   * @param profileId Profile ID
   * @returns 是否存在
   */
  has(profileId: string): boolean {
    return this.profiles.has(profileId);
  }

  /**
   * 获取Profile数量
   * 
   * @returns Profile数量
   */
  size(): number {
    return this.profiles.size;
  }

  /**
    * 验证Profile
    *
    * @param profile LLM Profile配置
    */
  private validateProfile(profile: LLMProfile): void {
    if (!profile.id) {
      throw new ValidationError(
        'Profile ID is required',
        'profile.id',
        profile?.id,
        { profile }
      );
    }

    if (!profile.name) {
      throw new ValidationError(
        'Profile name is required',
        'profile.name',
        profile?.name,
        { profile }
      );
    }

    if (!profile.provider) {
      throw new ValidationError(
        'Profile provider is required',
        'profile.provider',
        profile?.provider,
        { profile }
      );
    }

    if (!profile.model) {
      throw new ValidationError(
        'Profile model is required',
        'profile.model',
        profile?.model,
        { profile }
      );
    }

    if (!profile.apiKey) {
      throw new ValidationError(
        'Profile apiKey is required',
        'profile.apiKey',
        profile?.apiKey,
        { profile, note: 'API key must not be empty' }
      );
    }
  }
}