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
import { ProfileManager } from './profile-manager.js';
import { ClientFactory, MessageStream } from './index.js';
import { tryCatchAsyncWithSignal, isAbortError, now, diffTimestamp, generateId, ok, err, checkInterruption, getInterruptionDescription } from '@modular-agent/common-utils';
import { ConfigurationError, LLMError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import type { EventManager } from '../services/event-manager.js';
import { EventType } from '@modular-agent/types';

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

  constructor(eventManager?: EventManager) {
    this.profileManager = new ProfileManager();
    this.clientFactory = new ClientFactory();
    this.eventManager = eventManager;
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
        undefined,
        {
          profileId: request.profileId || 'DEFAULT',
          availableProfiles: this.profileManager.list().map(p => p.id)
        }
      ));
    }

    const client = this.clientFactory.createClient(profile);
    const startTime = now();

    // 使用 tryCatchAsyncWithSignal 确保 signal 正确传递
    const result = await tryCatchAsyncWithSignal(
      (signal) => client.generate({ ...request, signal }),
      request.signal
    );

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
        undefined,
        {
          profileId: request.profileId || 'DEFAULT',
          availableProfiles: this.profileManager.list().map(p => p.id)
        }
      ));
    }

    const client = this.clientFactory.createClient(profile);
    const startTime = now();

    // 创建 MessageStream
    const stream = new MessageStream();

    // 流式统计信息
    let chunkCount = 0;
    let firstChunkTime: number | undefined;
    let lastChunkTime: number | undefined;

    // 使用 tryCatchAsyncWithSignal 简化异常处理
    const result = await tryCatchAsyncWithSignal(
      async (signal) => {
        stream.setRequestId(generateId());

        try {
          // 执行流式调用
          for await (const chunk of client.generateStream({ ...request, signal })) {
            const nowTime = now();

            // 更新流式统计
            chunkCount++;
            if (firstChunkTime === undefined) {
              firstChunkTime = nowTime;
            }
            lastChunkTime = nowTime;

            chunk.duration = diffTimestamp(startTime, nowTime);

            // 推送文本内容到 MessageStream
            if (chunk.content) {
              stream.pushText(chunk.content);
            }

            if (chunk.finishReason) {
              stream.setFinalResult(chunk);
            }
          }

          // 正常完成时结束流
          stream.end();
        } catch (error) {
          // 如果是中止错误，需要中止 MessageStream 以正确更新其内部状态
          if (isAbortError(error)) {
            stream.abort();
          }
          throw error;
        }

        // 附加流式统计信息到最终结果
        const finalResult = stream.getFinalResult ? await stream.getFinalResult().catch(() => null) : null;
        if (finalResult && firstChunkTime !== undefined && lastChunkTime !== undefined) {
          const endTime = now();
          (finalResult as any).streamStats = {
            chunkCount,
            timeToFirstChunk: diffTimestamp(startTime, firstChunkTime),
            streamDuration: diffTimestamp(firstChunkTime, lastChunkTime),
            totalDuration: diffTimestamp(startTime, endTime)
          };
        }

        return stream;
      },
      request.signal
    );

    if (result.isErr()) {
      // 如果是中止错误，需要中止 MessageStream 以正确更新其内部状态
      if (isAbortError(result.error)) {
        stream.abort();
      }

      // 触发 LLM 流错误事件
      this.emitStreamErrorEvent(request, result.error);
      return err(this.convertToLLMError(result.error, profile));
    }

    return ok(result.value);
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
        profileId || 'DEFAULT',
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
      undefined,
      errorCode,
      {
        profileId: profile.id,
        originalError: error
      },
      error instanceof Error ? error : undefined
    );
  }

  /**
   * 触发 LLM 流错误事件
   * @param request LLM 请求
   * @param error 错误
   */
  private emitStreamErrorEvent(request: LLMRequest, error: unknown): void {
    if (!this.eventManager) {
      return;
    }

    const context = (request as any);
    const nodeId = context.nodeId;
    const threadId = context.threadId;
    const workflowId = context.workflowId;

    // 检查是否是中止错误
    if (isAbortError(error)) {
      let reason: string;
      if (request.signal) {
        const interruption = checkInterruption(request.signal);
        reason = getInterruptionDescription(interruption);
        // 如果是普通中止且 reason 是 DOMException 或 undefined，使用默认消息
        if (interruption.type === 'aborted') {
          if (!interruption.reason ||
              (typeof interruption.reason === 'object' && interruption.reason.name === 'AbortError')) {
            reason = 'Stream aborted';
          }
        }
      } else {
        reason = 'Stream aborted';
      }

      this.eventManager.emit({
        type: 'LLM_STREAM_ABORTED' as EventType,
        timestamp: now(),
        workflowId: workflowId || '',
        threadId: threadId || '',
        nodeId: nodeId || '',
        reason
      });
    } else {
      // 其他错误
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.eventManager.emit({
        type: 'LLM_STREAM_ERROR' as EventType,
        timestamp: now(),
        workflowId: workflowId || '',
        threadId: threadId || '',
        nodeId: nodeId || '',
        error: errorMessage
      });
    }
  }
}
