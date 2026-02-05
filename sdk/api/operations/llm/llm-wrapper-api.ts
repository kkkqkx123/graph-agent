/**
 * LLMWrapperAPI - LLM调用API
 * 封装LLMWrapper，提供统一的LLM调用接口
 */

import { LLMWrapper } from '../../../core/llm/wrapper';
import type { LLMRequest, LLMResult, LLMProfile } from '../../../types/llm';
import { SDKError, ErrorCode } from '../../../types/errors';

/**
 * LLM调用统计信息
 */
interface LLMCallStats {
  /** 总调用次数 */
  totalCalls: number;
  /** 成功次数 */
  successCalls: number;
  /** 失败次数 */
  failedCalls: number;
  /** 平均响应时间（毫秒） */
  averageDuration: number;
  /** 总Token使用量 */
  totalTokens: number;
}

/**
 * LLMWrapperAPI - LLM调用API
 */
export class LLMWrapperAPI {
  private llmWrapper: LLMWrapper;
  private callStats: Map<string, LLMCallStats> = new Map();
  private responseCache: Map<string, { result: LLMResult; timestamp: number }> = new Map();
  private cacheEnabled: boolean = true;
  private cacheTTL: number = 5 * 60 * 1000; // 5分钟缓存

  constructor(options?: {
    /** 是否启用响应缓存 */
    enableCache?: boolean;
    /** 缓存过期时间（毫秒） */
    cacheTTL?: number;
  }) {
    this.llmWrapper = new LLMWrapper();
    this.cacheEnabled = options?.enableCache ?? true;
    this.cacheTTL = options?.cacheTTL ?? 5 * 60 * 1000;
  }

  /**
   * 非流式生成
   * @param request LLM请求
   * @returns LLM响应结果
   */
  async generate(request: LLMRequest): Promise<LLMResult> {
    const profileId = request.profileId || 'default';
    const cacheKey = this.generateCacheKey(request);

    // 检查缓存
    if (this.cacheEnabled && this.responseCache.has(cacheKey)) {
      const cached = this.responseCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        this.updateStats(profileId, true, cached.result.duration, cached.result.usage?.totalTokens || 0);
        return cached.result;
      } else {
        // 缓存过期，删除
        this.responseCache.delete(cacheKey);
      }
    }

    const startTime = Date.now();
    try {
      // 调用LLM
      const result = await this.llmWrapper.generate(request);
      const duration = Date.now() - startTime;

      // 更新统计
      this.updateStats(profileId, true, duration, result.usage?.totalTokens || 0);

      // 缓存结果
      if (this.cacheEnabled) {
        this.responseCache.set(cacheKey, { result, timestamp: Date.now() });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStats(profileId, false, duration, 0);
      throw error;
    }
  }

  /**
   * 流式生成
   * @param request LLM请求
   * @returns LLM响应结果流
   */
  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const profileId = request.profileId || 'default';
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      // 调用流式LLM
      for await (const chunk of this.llmWrapper.generateStream(request)) {
        totalTokens += chunk.usage?.totalTokens || 0;
        yield chunk;
      }

      // 更新统计
      const duration = Date.now() - startTime;
      this.updateStats(profileId, true, duration, totalTokens);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStats(profileId, false, duration, 0);
      throw error;
    }
  }

  /**
   * 批量生成
   * @param requests LLM请求数组
   * @returns LLM响应结果数组
   */
  async generateBatch(requests: LLMRequest[]): Promise<LLMResult[]> {
    // 并行执行所有请求
    return Promise.all(
      requests.map(request => this.generate(request))
    );
  }

  /**
   * 注册LLM Profile
   * @param profile LLM Profile配置
   */
  async registerProfile(profile: LLMProfile): Promise<void> {
    this.llmWrapper.registerProfile(profile);
  }

  /**
   * 批量注册LLM Profile
   * @param profiles LLM Profile配置数组
   */
  async registerProfiles(profiles: LLMProfile[]): Promise<void> {
    for (const profile of profiles) {
      this.llmWrapper.registerProfile(profile);
    }
  }

  /**
   * 获取LLM Profile
   * @param profileId Profile ID
   * @returns LLM Profile，如果不存在则返回null
   */
  async getProfile(profileId: string): Promise<LLMProfile | null> {
    try {
      const profile = this.llmWrapper.getProfile(profileId);
      return profile ?? null;
    } catch (error) {
      if (error instanceof SDKError && error.code === ErrorCode.CONFIGURATION_ERROR) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取所有Profile
   * @returns Profile列表
   */
  async getProfiles(): Promise<LLMProfile[]> {
    return this.llmWrapper.listProfiles();
  }

  /**
   * 删除LLM Profile
   * @param profileId Profile ID
   */
  async removeProfile(profileId: string): Promise<void> {
    this.llmWrapper.removeProfile(profileId);
    // 清除相关统计
    this.callStats.delete(profileId);
  }

  /**
   * 设置默认Profile
   * @param profileId Profile ID
   */
  async setDefaultProfile(profileId: string): Promise<void> {
    this.llmWrapper.setDefaultProfile(profileId);
  }

  /**
   * 获取默认Profile
   * @returns 默认Profile，如果不存在则返回null
   */
  async getDefaultProfile(): Promise<LLMProfile | null> {
    const profileId = this.llmWrapper.getDefaultProfileId();
    if (!profileId) {
      return null;
    }
    const profile = await this.getProfile(profileId);
    return profile ?? null;
  }

  /**
   * 获取调用统计
   * @param profileId Profile ID（可选）
   * @returns 调用统计信息
   */
  async getCallStats(profileId?: string): Promise<LLMCallStats | Map<string, LLMCallStats>> {
    if (profileId) {
      return this.callStats.get(profileId) || this.createEmptyStats();
    }
    return new Map(this.callStats);
  }

  /**
   * 重置调用统计
   * @param profileId Profile ID（可选）
   */
  async resetCallStats(profileId?: string): Promise<void> {
    if (profileId) {
      this.callStats.delete(profileId);
    } else {
      this.callStats.clear();
    }
  }

  /**
   * 清空响应缓存
   */
  async clearCache(): Promise<void> {
    this.responseCache.clear();
  }

  /**
   * 启用响应缓存
   */
  async enableCache(): Promise<void> {
    this.cacheEnabled = true;
  }

  /**
   * 禁用响应缓存
   */
  async disableCache(): Promise<void> {
    this.cacheEnabled = false;
    this.responseCache.clear();
  }

  /**
   * 设置缓存过期时间
   * @param ttl 过期时间（毫秒）
   */
  async setCacheTTL(ttl: number): Promise<void> {
    this.cacheTTL = ttl;
    // 清除过期缓存
    this.cleanExpiredCache();
  }

  /**
   * 清空所有Profile和客户端缓存
   */
  async clearAll(): Promise<void> {
    this.llmWrapper.clearAll();
    this.callStats.clear();
    this.responseCache.clear();
  }

  /**
   * 获取底层LLMWrapper实例
   * @returns LLMWrapper实例
   */
  getWrapper(): LLMWrapper {
    return this.llmWrapper;
  }

  /**
   * 生成缓存键
   * @param request LLM请求
   * @returns 缓存键
   */
  private generateCacheKey(request: LLMRequest): string {
    const key = {
      profileId: request.profileId || 'default',
      messages: request.messages,
      parameters: request.parameters,
      tools: request.tools
    };
    return JSON.stringify(key);
  }

  /**
   * 更新调用统计
   * @param profileId Profile ID
   * @param success 是否成功
   * @param duration 响应时间
   * @param tokens Token使用量
   */
  private updateStats(profileId: string, success: boolean, duration: number, tokens: number): void {
    let stats = this.callStats.get(profileId);
    if (!stats) {
      stats = this.createEmptyStats();
      this.callStats.set(profileId, stats);
    }

    stats.totalCalls++;
    if (success) {
      stats.successCalls++;
    } else {
      stats.failedCalls++;
    }

    // 更新平均响应时间
    stats.averageDuration = (stats.averageDuration * (stats.totalCalls - 1) + duration) / stats.totalCalls;

    // 更新总Token使用量
    stats.totalTokens += tokens;
  }

  /**
   * 创建空的统计信息
   * @returns 空的统计信息
   */
  private createEmptyStats(): LLMCallStats {
    return {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      totalTokens: 0
    };
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp >= this.cacheTTL) {
        this.responseCache.delete(key);
      }
    }
  }
}