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
import { ClientFactory, MessageStream, tryCatchAsync } from '@modular-agent/common-utils';
import { ConfigurationError, LLMError } from '@modular-agent/types';
import { now, diffTimestamp, generateId } from '@modular-agent/common-utils';
import type { EventManager } from '../services/event-manager';
import { MessageStreamBridge, MessageStreamBridgeContext } from './message-stream-bridge';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * LLM包装器类
 *
 * LLM调用的统一入口，提供简化的API接口
 * 负责协调Profile管理和客户端工厂，处理请求执行
 */
export class LLMWrapper {
  private profileManager: ProfileManager;
  private clientFactory: ClientFactory;
  private eventManager?: EventManager;

  constructor() {
    this.profileManager = new ProfileManager();
    this.clientFactory = new ClientFactory();
  }

  /**
   * 设置事件管理器
   * @param eventManager 事件管理器
   */
  setEventManager(eventManager: EventManager): void {
    this.eventManager = eventManager;
  }

  /**
   * 非流式生成
   *
   * @param request LLM请求
   * @returns Result<LLMResult, LLMError>
   */
  async generate(request: LLMRequest): Promise<Result<LLMResult, LLMError>> {
    const profile = this.getProfile(request.profileId);
    if (!profile) {
      return err(new LLMError(
        'LLM Profile not found',
        'unknown',
        undefined,
        undefined,
        {
          profileId: request.profileId || 'default',
          availableProfiles: this.profileManager.list().map(p => p.id)
        }
      ));
    }
    
    const client = this.clientFactory.createClient(profile);
    const startTime = now();
    
    const result = await tryCatchAsync(client.generate(request));
    
    if (result.isErr()) {
      return err(this.convertToLLMError(result.error, profile));
    }
    
    result.value.duration = diffTimestamp(startTime, now());
    return ok(result.value);
  }

  /**
   * 流式生成
   *
   * @param request LLM请求
   * @returns Result<MessageStream, LLMError>
   */
  async generateStream(request: LLMRequest): Promise<Result<MessageStream, LLMError>> {
    const profile = this.getProfile(request.profileId);
    if (!profile) {
      return err(new LLMError(
        'LLM Profile not found',
        'unknown',
        undefined,
        undefined,
        {
          profileId: request.profileId || 'default',
          availableProfiles: this.profileManager.list().map(p => p.id)
        }
      ));
    }
    
    const client = this.clientFactory.createClient(profile);
    const startTime = now();
    
    // 创建 MessageStream
    const stream = new MessageStream();
    
    // 创建事件桥接器
    let bridge: MessageStreamBridge | undefined;
    if (this.eventManager) {
      bridge = new MessageStreamBridge(stream, this.eventManager, {
        threadId: (request as any).threadId,
        nodeId: (request as any).nodeId,
        workflowId: (request as any).workflowId
      });
    }

    try {
      stream.setRequestId(generateId());
      
      // 执行流式调用
      for await (const chunk of client.generateStream(request)) {
        chunk.duration = diffTimestamp(startTime, now());
        
        if (chunk.finishReason) {
          stream.setFinalResult(chunk);
        }
      }
      
      return ok(stream);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        stream.abort(); // 触发 ABORT 事件，桥接器会转换为 SDK 事件
      }
      return err(this.convertToLLMError(error, profile));
    } finally {
      // 清理桥接器
      if (bridge) {
        bridge.destroy();
      }
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
   * 转换错误为LLMError
   *
   * 统一处理来自HTTP客户端和LLM客户端的各种错误，
   * 包装成LLMError，附加provider、model等profile信息
   *
   * @param error 原始错误
   * @param profile LLM Profile
   * @returns LLMError
   */
  private convertToLLMError(error: unknown, profile: LLMProfile): LLMError {
    // 如果已经是LLMError，直接返回
    if (error instanceof LLMError) {
      return error;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof Error && ('code' in error || 'status' in error)
      ? (error as any).code || (error as any).status
      : undefined;

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