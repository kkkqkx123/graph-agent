/**
 * LLM包装器
 *
 * 提供统一的LLM调用接口，协调Profile管理和客户端创建
 * 处理请求执行和响应时间统计
 */

import type {
  LLMRequest,
  LLMResult,
  LLMProfile
} from '@modular-agent/types';
import { ProfileManager } from './profile-manager';
import { ClientFactory } from '@modular-agent/common-utils';
import { ConfigurationError, LLMError } from '@modular-agent/types';
import { now, diffTimestamp } from '@modular-agent/common-utils';

/**
 * LLM包装器类
 *
 * LLM调用的统一入口，提供简化的API接口
 * 负责协调Profile管理和客户端工厂，处理请求执行
 */
export class LLMWrapper {
  private profileManager: ProfileManager;
  private clientFactory: ClientFactory;

  constructor() {
    this.profileManager = new ProfileManager();
    this.clientFactory = new ClientFactory();
  }

  /**
   * 非流式生成
   *
   * @param request LLM请求
   * @returns LLM响应结果
   */
  async generate(request: LLMRequest): Promise<LLMResult> {
    const profile = this.getProfile(request.profileId);
    if (!profile) {
      throw new ConfigurationError(
        'LLM Profile not found',
        request.profileId || 'default',
        { availableProfiles: this.profileManager.list().map(p => p.id) }
      );
    }
    
    const client = this.clientFactory.createClient(profile);
    const startTime = now();
    
    try {
      const result = await client.generate(request);
      result.duration = diffTimestamp(startTime, now());
      return result;
    } catch (error) {
      throw this.handleError(error, profile);
    }
  }

  /**
   * 流式生成
   *
   * @param request LLM请求
   * @returns LLM响应结果流
   */
  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const profile = this.getProfile(request.profileId);
    if (!profile) {
      throw new ConfigurationError(
        'LLM Profile not found',
        request.profileId || 'default',
        { availableProfiles: this.profileManager.list().map(p => p.id) }
      );
    }
    
    const client = this.clientFactory.createClient(profile);
    const startTime = now();

    try {
      for await (const chunk of client.generateStream(request)) {
        chunk.duration = diffTimestamp(startTime, now());
        yield chunk;
      }
    } catch (error) {
      throw this.handleError(error, profile);
    }
  }

  /**
   * 注册LLM Profile
   * 
   * @param profile LLM Profile配置
   */
  registerProfile(profile: Parameters<ProfileManager['register']>[0]): void {
    this.profileManager.register(profile);
  }

  /**
    * 获取LLM Profile
    * 
    * @param profileId Profile ID
    * @returns LLM Profile或undefined
    */
  getProfile(profileId?: string): ReturnType<ProfileManager['get']> {
    const profile = this.profileManager.get(profileId);
    if (!profile) {
      throw new ConfigurationError(
        'LLM Profile not found',
        profileId || 'default',
        { availableProfiles: this.profileManager.list().map(p => p.id) }
      );
    }
    return profile;
  }

  /**
   * 删除LLM Profile
   * 
   * @param profileId Profile ID
   */
  removeProfile(profileId: string): void {
    this.profileManager.remove(profileId);
    this.clientFactory.clearClientCache(profileId);
  }

  /**
   * 列出所有Profile
   * 
   * @returns Profile列表
   */
  listProfiles(): LLMProfile[] {
    return this.profileManager.list();
  }

  /**
   * 清除所有Profile和客户端缓存
   */
  clearAll(): void {
    this.profileManager.clear();
    this.clientFactory.clearCache();
  }

  /**
   * 设置默认Profile
   * 
   * @param profileId Profile ID
   */
  setDefaultProfile(profileId: string): void {
    this.profileManager.setDefault(profileId);
  }

  /**
   * 获取默认Profile ID
   *
   * @returns 默认Profile ID或null
   */
  getDefaultProfileId(): string | null {
    return this.profileManager.getDefault()?.id || null;
  }

  /**
   * 处理错误，转换为LLMError
   *
   * 统一处理来自HTTP客户端和LLM客户端的各种错误，
   * 包装成LLMError，附加provider、model等profile信息
   *
   * @param error 原始错误
   * @param profile LLM Profile
   * @returns LLMError
   */
  private handleError(error: any, profile: LLMProfile): LLMError {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || error?.status;

    return new LLMError(
      `${profile.provider} API error: ${errorMessage}`,
      profile.provider,
      profile.model,
      errorCode,
      {
        profileId: profile.id,
        originalError: error
      },
      error instanceof Error ? error : undefined
    );
  }
  }