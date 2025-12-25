/**
 * HumanRelay LLM客户端
 *
 * 实现直接与用户交互的LLM客户端
 */

import { injectable, inject } from 'inversify';
import { BaseLLMClient } from './base-llm-client';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ModelConfig } from '../../../domain/llm/value-objects/model-config';
import { ID } from '../../../domain/common/value-objects/id';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';
import { PromptTemplate } from '../../../domain/llm/value-objects/prompt-template';
import { LLMMessage, LLMMessageRole } from '../../../domain/llm/value-objects/llm-message';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';
import { ProviderConfig, ApiType } from '../parameter-mappers/interfaces/provider-config.interface';
import { BaseFeatureSupport } from '../parameter-mappers/interfaces/feature-support.interface';
import * as readline from 'readline';

/**
 * 提示状态枚举
 */
enum PromptStatus {
  CREATED = 'created',
  DELIVERED = 'delivered',
  RESPONDED = 'responded',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

/**
 * 响应类型枚举
 */
enum ResponseType {
  NORMAL = 'normal',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

/**
 * 简化的提示数据结构
 */
interface SimplePrompt {
  id: string;
  content: string;
  mode: HumanRelayMode;
  conversationContext?: string;
  template: PromptTemplate;
  status: PromptStatus;
  createdAt: Date;
  timeout: number;
}

/**
 * 简化的响应数据结构
 */
interface SimpleResponse {
  id: string;
  content: string;
  type: ResponseType;
  responseTime: number;
  userInteractionTime: number;
  createdAt: Date;
  errorMessage?: string;
}

/**
 * HumanRelay客户端配置接口
 */
interface HumanRelayClientConfig {
  providerName: string;
  mode: HumanRelayMode;
  maxHistoryLength: number;
  defaultTimeout: number;
  frontendConfig?: any;
}

/**
 * HumanRelay LLM客户端
 */
@injectable()
export class HumanRelayClient extends BaseLLMClient {
  private readonly mode: HumanRelayMode;
  private readonly maxHistoryLength: number;
  private readonly defaultTimeout: number;
  private conversationHistory: any[] = [];
  private promptHistory: SimplePrompt[] = [];
  private responseHistory: SimpleResponse[] = [];
  private rlInterface: readline.Interface | null = null;

  constructor(
    @inject(LLM_DI_IDENTIFIERS.HttpClient)
    protected override httpClient: any,
    @inject(LLM_DI_IDENTIFIERS.TokenBucketLimiter)
    protected override rateLimiter: any,
    @inject(LLM_DI_IDENTIFIERS.TokenCalculator)
    protected override tokenCalculator: any,
    @inject(LLM_DI_IDENTIFIERS.ConfigManager)
    protected override configManager: any,
    clientConfig: HumanRelayClientConfig
  ) {
    // 创建基础配置
    const featureSupport = new BaseFeatureSupport();
    featureSupport.supportsStreaming = false;
    featureSupport.supportsTools = false;

    const baseConfig: ProviderConfig = {
      name: clientConfig.providerName,
      apiType: ApiType.NATIVE,
      baseURL: 'http://localhost:8080',
      apiKey: 'human-relay-key',
      parameterMapper: null as any, // HumanRelay不需要参数映射
      endpointStrategy: null as any, // HumanRelay不需要端点策略
      featureSupport: featureSupport
    };

    super(httpClient, rateLimiter, tokenCalculator, configManager, baseConfig);

    this.mode = clientConfig.mode;
    this.maxHistoryLength = clientConfig.maxHistoryLength;
    this.defaultTimeout = clientConfig.defaultTimeout;
  }

  /**
   * 生成响应 - 核心方法
   */
  public override async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      // 1. 构建提示词
      const prompt = this.buildPrompt(request);

      // 2. 发送提示并等待用户响应
      const timeout = (request.metadata?.['timeout'] as number) || this.defaultTimeout;
      const userResponse = await this.sendPromptAndWaitForResponse(prompt, timeout);

      // 3. 更新历史记录
      this.updateHistory(request, userResponse);

      // 4. 构建LLM响应
      return this.createLLMResponse(userResponse, request);

    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 流式生成响应 - HumanRelay不支持真正的流式
   */
  public override async generateResponseStream(request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    // HumanRelay不支持真正的流式，返回单次响应
    const response = await this.generateResponse(request);
    return this.createAsyncIterable(response);
  }

  /**
   * 获取模型配置
   */
  public getModelConfig(): ModelConfig {
    return ModelConfig.create({
      model: 'human-relay',
      provider: 'human-relay',
      maxTokens: 100000, // 人工输入没有严格的token限制
      contextWindow: 100000,
      supportsStreaming: false,
      supportsTools: false,
      supportsImages: false,
      supportsAudio: false,
      supportsVideo: false
    });
  }

  /**
   * 获取支持的模型列表
   */
  public getSupportedModelsList(): string[] {
    return ['human-relay-s', 'human-relay-m'];
  }

  /**
   * 获取支持的模型列表（异步版本）
   */
  public override async getSupportedModels(): Promise<string[]> {
    return this.getSupportedModelsList();
  }

  /**
   * 健康检查
   */
  public override async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    latency?: number;
    lastChecked: Date;
  }> {
    try {
      const startTime = Date.now();
      // 简单检查：检查readline接口是否可用
      if (!this.rlInterface) {
        this.rlInterface = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
      }
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'HumanRelay客户端可用',
        latency,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        lastChecked: new Date()
      };
    }
  }

  /**
   * 获取客户端名称
   */
  public override getClientName(): string {
    return `human-relay-${this.mode}`;
  }

  /**
   * 获取客户端版本
   */
  public override getClientVersion(): string {
    return '1.0.0';
  }

  /**
   * 计算Token数
   */
  public override async calculateTokens(request: LLMRequest): Promise<number> {
    // 简单的token估算
    const text = request.messages.map(m => m.getContent()).join(' ');
    return Math.ceil(text.length / 4);
  }

  /**
   * 计算成本
   */
  public override async calculateCost(request: LLMRequest, response: LLMResponse): Promise<number> {
    // HumanRelay没有直接成本，返回0
    return 0;
  }

  /**
   * 关闭客户端
   */
  public override async close(): Promise<boolean> {
    try {
      // 清理历史记录
      this.conversationHistory = [];
      this.promptHistory = [];
      this.responseHistory = [];
      
      // 关闭readline接口
      if (this.rlInterface) {
        this.rlInterface.close();
        this.rlInterface = null;
      }
      
      return true;
    } catch (error) {
      console.error('关闭HumanRelay客户端时出错:', error);
      return false;
    }
  }

  // 私有方法

  /**
   * 构建提示词
   */
  private buildPrompt(request: LLMRequest): SimplePrompt {
    // 获取模板
    const template = this.mode === HumanRelayMode.MULTI
      ? PromptTemplate.createMultiTurnDefault()
      : PromptTemplate.createSingleTurnDefault();

    // 转换消息格式
    const iLLMMessages = request.messages.map(msg => ({
      role: this.convertMessageRole(msg.getRole()),
      content: msg.getContent(),
      metadata: {}
    }));

    // 构建内容和上下文
    let content: string;
    let conversationContext: string | undefined;

    if (this.mode === HumanRelayMode.SINGLE) {
      // 单轮模式：合并所有消息作为完整上下文
      content = iLLMMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    } else {
      // 多轮模式：只使用最新消息作为增量内容
      const latestMessage = iLLMMessages[iLLMMessages.length - 1];
      if (!latestMessage) {
        throw new Error('消息列表不能为空');
      }

      // 历史消息作为上下文（除了最新消息）
      const historyMessages = iLLMMessages.slice(0, -1);
      conversationContext = historyMessages.length > 0
        ? historyMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
        : undefined;

      content = `${latestMessage.role}: ${latestMessage.content}`;
    }

    return {
      id: ID.generate().value,
      content,
      mode: this.mode,
      conversationContext,
      template,
      status: PromptStatus.CREATED,
      createdAt: new Date(),
      timeout: this.defaultTimeout
    };
  }

  /**
   * 转换消息角色
   */
  private convertMessageRole(role: LLMMessageRole): string {
    switch (role) {
      case LLMMessageRole.SYSTEM:
        return 'system';
      case LLMMessageRole.USER:
        return 'user';
      case LLMMessageRole.ASSISTANT:
        return 'assistant';
      case LLMMessageRole.TOOL:
        return 'tool';
      default:
        return 'user';
    }
  }

  /**
   * 发送提示并等待响应
   */
  private async sendPromptAndWaitForResponse(
    prompt: SimplePrompt,
    timeout: number
  ): Promise<SimpleResponse> {
    // 初始化readline接口
    if (!this.rlInterface) {
      this.rlInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    // 标记为已发送
    prompt.status = PromptStatus.DELIVERED;
    const startTime = Date.now();

    try {
      // 渲染提示内容
      const renderedPrompt = this.renderPrompt(prompt);
      
      // 显示提示并等待用户输入
      const userInput = await this.promptUser(renderedPrompt, timeout);
      const responseTime = Date.now() - startTime;

      // 创建响应
      const response: SimpleResponse = {
        id: ID.generate().value,
        content: userInput,
        type: ResponseType.NORMAL,
        responseTime,
        userInteractionTime: responseTime,
        createdAt: new Date()
      };

      // 更新提示状态
      prompt.status = PromptStatus.RESPONDED;

      return response;
    } catch (error) {
      prompt.status = PromptStatus.ERROR;
      throw error;
    }
  }

  /**
   * 提示用户输入
   */
  private async promptUser(question: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.rlInterface) {
        reject(new Error('Readline接口未初始化'));
        return;
      }

      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (this.rlInterface) {
          this.rlInterface.removeListener('line', onLine);
          this.rlInterface.removeListener('close', onClose);
        }
      };

      const onLine = (input: string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(input.trim());
      };

      const onClose = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error('用户输入被中断'));
      };

      // 设置超时
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          reject(new Error(`用户输入超时 (${timeout}ms)`));
        }, timeout);
      }

      // 监听事件
      this.rlInterface.addListener('line', onLine);
      this.rlInterface.addListener('close', onClose);

      // 显示问题
      this.rlInterface.question(question, () => {
        // question回调会在用户输入后调用，但我们已经在line事件中处理
      });
    });
  }

  /**
   * 渲染提示内容
   */
  private renderPrompt(prompt: SimplePrompt): string {
    const variables: Record<string, string> = {
      prompt: prompt.content
    };

    if (prompt.conversationContext) {
      variables['conversation_history'] = prompt.conversationContext;
    }

    variables['timestamp'] = prompt.createdAt.toISOString();
    variables['session_id'] = prompt.id;

    return prompt.template.render(variables);
  }

  /**
   * 更新历史记录
   */
  private updateHistory(request: LLMRequest, response: SimpleResponse): void {
    // 添加提示到历史
    this.promptHistory.push({
      ...this.promptHistory[this.promptHistory.length - 1]!,
      status: PromptStatus.RESPONDED
    });

    // 添加响应到历史
    this.responseHistory.push(response);

    // 多轮模式下更新对话历史
    if (this.mode === HumanRelayMode.MULTI) {
      // 添加用户消息
      request.messages.forEach(msg => {
        const iLLMMsg = {
          role: this.convertMessageRole(msg.getRole()),
          content: msg.getContent(),
          metadata: {
            name: msg.getName(),
            tool_calls: msg.getToolCalls(),
            tool_call_id: msg.getToolCallId()
          }
        };
        this.conversationHistory.push(iLLMMsg);
      });

      // 添加助手响应
      if (response.type === ResponseType.NORMAL) {
        const assistantMessage = {
          role: LLMMessageRole.ASSISTANT,
          content: response.content,
          metadata: {
            responseId: response.id,
            responseTime: response.responseTime,
            userInteractionTime: response.userInteractionTime
          }
        };
        this.conversationHistory.push(assistantMessage);
      }

      // 检查历史长度
      if (this.conversationHistory.length > this.maxHistoryLength) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
      }
    }
  }

  /**
   * 创建LLM响应
   */
  private createLLMResponse(
    humanRelayResponse: SimpleResponse,
    request: LLMRequest
  ): LLMResponse {
    const promptTokens = this.estimateTokensSync(request);
    const completionTokens = this.estimateTokensSync(humanRelayResponse.content);

    return LLMResponse.create(
      request.id,
      'human-relay',
      [{
        index: 0,
        message: LLMMessage.createAssistant(humanRelayResponse.content),
        finish_reason: humanRelayResponse.type === ResponseType.NORMAL ? 'stop' : 'error'
      }],
      {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      humanRelayResponse.type === ResponseType.NORMAL ? 'stop' : 'error',
      0,
      {
        metadata: {
          mode: this.mode,
          responseId: humanRelayResponse.id,
          responseTime: humanRelayResponse.responseTime,
          userInteractionTime: humanRelayResponse.userInteractionTime,
          responseType: humanRelayResponse.type
        }
      }
    );
  }

  /**
   * 创建异步可迭代对象
   */
  private async createAsyncIterable(response: LLMResponse): Promise<AsyncIterable<LLMResponse>> {
    return (async function* () {
      yield response;
    })();
  }

  /**
   * 估算token数量
   */
  public override async estimateTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  /**
   * 估算token数量（内部方法）
   */
  private estimateTokensSync(request: LLMRequest | string): number {
    const text = typeof request === 'string'
      ? request
      : request.messages.map(m => m.getContent()).join(' ');
    return Math.ceil(text.length / 4);
  }

  /**
   * 错误处理
   */
  public override handleError(error: any): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`HumanRelay客户端错误: ${errorMessage}`);
  }
}