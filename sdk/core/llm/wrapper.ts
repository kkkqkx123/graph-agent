/**
 * LLM包装器
 *
 * 提供统一的LLM调用接口，管理LLM Profile
 * 处理请求和响应的转换，处理重试和超时
 */

import type {
  LLMClient,
  LLMRequest,
  LLMResult,
  LLMProfile
} from '../../types/llm';
import { SDKError, ErrorCode } from '../../types/errors';
import { ClientFactory } from './client-factory';

/**
 * LLM包装器类
 * 
 * LLM调用的统一入口
 * 根据profileId获取对应的LLM Profile
 * 根据provider创建对应的客户端
 * 处理请求参数的合并和覆盖
 * 处理响应结果的统一格式
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
    // 1. 获取LLM Profile
    const profile = this.getProfileForRequest(request);
    if (!profile) {
      throw new SDKError(
        ErrorCode.CONFIGURATION_ERROR,
        'LLM Profile not found',
        {
          profileId: request.profileId
        }
      );
    }

    // 2. 合并请求参数
    const mergedRequest = this.mergeRequestParameters(request, profile);

    // 3. 获取客户端
    const client = this.clientFactory.createClient(profile);

    // 4. 执行请求
    const startTime = Date.now();
    const result = await client.generate(mergedRequest);
    const duration = Date.now() - startTime;

    // 5. 添加响应时间
    result.duration = duration;

    return result;
  }

  /**
   * 流式生成
   * 
   * @param request LLM请求
   * @returns LLM响应结果流
   */
  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    // 1. 获取LLM Profile
    const profile = this.getProfileForRequest(request);
    if (!profile) {
      throw new SDKError(
        ErrorCode.CONFIGURATION_ERROR,
        'LLM Profile not found',
        {
          profileId: request.profileId
        }
      );
    }

    // 2. 合并请求参数
    const mergedRequest = this.mergeRequestParameters(request, profile);

    // 3. 获取客户端
    const client = this.clientFactory.createClient(profile);

    // 4. 执行流式请求
    const startTime = Date.now();
    for await (const chunk of client.generateStream(mergedRequest)) {
      chunk.duration = Date.now() - startTime;
      yield chunk;
    }
  }

  /**
   * 注册LLM Profile
   * 
   * @param profile LLM Profile配置
   */
  registerProfile(profile: LLMProfile): void {
    this.profileManager.register(profile);
  }

  /**
   * 获取LLM Profile
   * 
   * @param profileId Profile ID
   * @returns LLM Profile或undefined
   */
  getProfile(profileId: string): LLMProfile | undefined {
    return this.profileManager.get(profileId);
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
   * 获取客户端工厂（用于高级用法）
   * 
   * @returns 客户端工厂实例
   */
  getClientFactory(): ClientFactory {
    return this.clientFactory;
  }

  /**
   * 获取请求对应的Profile
   */
  private getProfileForRequest(request: LLMRequest): LLMProfile | undefined {
    if (!request.profileId) {
      // 如果没有指定profileId，返回默认Profile
      return this.profileManager.getDefault();
    }
    return this.profileManager.get(request.profileId);
  }

  /**
   * 合并请求参数
   * 
   * 将request.parameters合并到Profile.parameters中
   * request.parameters会覆盖Profile.parameters中的同名参数
   */
  private mergeRequestParameters(request: LLMRequest, profile: LLMProfile): LLMRequest {
    const mergedParameters = {
      ...profile.parameters,
      ...request.parameters
    };

    return {
      ...request,
      parameters: mergedParameters
    };
  }
}

/**
 * Profile管理器
 * 
 * 负责LLM Profile的管理
 */
class ProfileManager {
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
   * @param profileId Profile ID
   * @returns LLM Profile或undefined
   */
  get(profileId: string): LLMProfile | undefined {
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
      throw new SDKError(
        ErrorCode.NOT_FOUND_ERROR,
        `Profile not found: ${profileId}`,
        { profileId }
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
   * 验证Profile
   *
   * @param profile LLM Profile配置
   */
  private validateProfile(profile: LLMProfile): void {
    if (!profile.id) {
      throw new SDKError(
        ErrorCode.VALIDATION_ERROR,
        'Profile ID is required',
        { profile }
      );
    }

    if (!profile.name) {
      throw new SDKError(
        ErrorCode.VALIDATION_ERROR,
        'Profile name is required',
        { profile }
      );
    }

    if (!profile.provider) {
      throw new SDKError(
        ErrorCode.VALIDATION_ERROR,
        'Profile provider is required',
        { profile }
      );
    }

    if (!profile.model) {
      throw new SDKError(
        ErrorCode.VALIDATION_ERROR,
        'Profile model is required',
        { profile }
      );
    }

    if (!profile.apiKey) {
      throw new SDKError(
        ErrorCode.VALIDATION_ERROR,
        'Profile apiKey is required',
        { profile }
      );
    }
  }
}