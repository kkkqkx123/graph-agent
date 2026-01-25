/**
 * 人工中继客户端实现
 * 
 * 用于需要人工介入的场景
 * 触发人工交互事件，等待人工输入，返回人工响应
 */

import { BaseLLMClient } from '../base-client';
import type {
  LLMRequest,
  LLMResult,
  LLMProfile,
  LLMMessage
} from '../../../types/llm';

/**
 * 人工中继模式
 */
export enum HumanRelayMode {
  /** 单轮对话模式 */
  SINGLE = 'SINGLE',
  /** 多轮对话模式 */
  MULTI = 'MULTI'
}

/**
 * 人工中继配置
 */
interface HumanRelayConfig {
  /** 模式 */
  mode?: HumanRelayMode;
  /** 最大历史长度 */
  maxHistoryLength?: number;
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 前端配置 */
  frontendConfig?: Record<string, any>;
}

/**
 * 人工中继客户端
 */
export class HumanRelayClient extends BaseLLMClient {
  private readonly config: HumanRelayConfig;
  private readonly history: LLMMessage[] = [];
  private pendingRequests: Map<string, {
    resolve: (value: LLMResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(profile: LLMProfile) {
    super(profile);
    this.config = profile.metadata?.['humanRelayConfig'] || {
      mode: HumanRelayMode.SINGLE,
      maxHistoryLength: 50,
      defaultTimeout: 300000 // 5分钟
    };
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    const requestId = `human-relay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timeout = this.config.defaultTimeout || 300000;

    // 创建Promise
    const promise = new Promise<LLMResult>((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Human relay request timeout after ${timeout}ms`));
      }, timeout);

      // 存储pending请求
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutId
      });
    });

    // 触发人工交互事件
    this.triggerHumanInteraction(requestId, request);

    // 等待人工响应
    return promise;
  }

  /**
   * 执行流式生成
   * 
   * 人工中继不支持真正的流式，返回单个块
   */
  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const result = await this.doGenerate(request);
    yield result;
  }

  /**
   * 触发人工交互事件
   * 
   * 在实际应用中，这里应该触发事件通知前端
   * 前端显示交互界面，用户输入后调用submitHumanResponse
   */
  private triggerHumanInteraction(requestId: string, request: LLMRequest): void {
    // 在实际应用中，这里应该触发事件
    // 例如：eventEmitter.emit('human-interaction-requested', { requestId, request })
    
    console.log(`[HumanRelay] Interaction requested: ${requestId}`);
    console.log(`[HumanRelay] Messages:`, JSON.stringify(request.messages, null, 2));
    console.log(`[HumanRelay] Call submitHumanResponse('${requestId}', response) to provide input`);
  }

  /**
   * 提交人工响应
   * 
   * 这个方法应该由应用层调用，当用户完成输入后
   * 
   * @param requestId 请求ID
   * @param response 人工响应内容
   */
  submitHumanResponse(requestId: string, response: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      console.warn(`[HumanRelay] No pending request found: ${requestId}`);
      return;
    }

    // 清除超时
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    // 构建响应
    const result: LLMResult = {
      id: requestId,
      model: this.profile.model,
      content: response,
      message: {
        role: 'assistant',
        content: response
      },
      finishReason: 'stop',
      duration: 0,
      metadata: {
        humanRelay: true,
        timestamp: Date.now()
      }
    };

    // 解析Promise
    pending.resolve(result);

    // 更新历史记录（多轮模式）
    if (this.config.mode === HumanRelayMode.MULTI) {
      this.addToHistory({
        role: 'assistant',
        content: response
      });
    }
  }

  /**
   * 提交人工错误
   * 
   * 当用户取消或出错时调用
   * 
   * @param requestId 请求ID
   * @param error 错误信息
   */
  submitHumanError(requestId: string, error: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      console.warn(`[HumanRelay] No pending request found: ${requestId}`);
      return;
    }

    // 清除超时
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    // 拒绝Promise
    pending.reject(new Error(error));
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(message: LLMMessage): void {
    this.history.push(message);

    // 限制历史长度
    const maxLength = this.config.maxHistoryLength || 50;
    if (this.history.length > maxLength) {
      this.history.shift();
    }
  }

  /**
   * 获取历史记录
   */
  getHistory(): LLMMessage[] {
    return [...this.history];
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * 获取待处理的请求数量
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 取消所有待处理的请求
   */
  cancelAllPendingRequests(): void {
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Request cancelled'));
    }
    this.pendingRequests.clear();
  }

  /**
   * 获取配置信息
   */
  getConfig(): HumanRelayConfig {
    return { ...this.config };
  }
}