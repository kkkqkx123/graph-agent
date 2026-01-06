import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { ILLMClient } from '../interfaces/llm-client.interface';
import { ITaskGroupManager } from '../interfaces/task-group-manager.interface';
import { LLMWrapperRequest } from '../interfaces/wrapper-request.interface';
import { LLMRequest } from './llm-request';
import { LLMResponse } from './llm-response';
import { LLMMessage } from '../value-objects/llm-message';
import { PollingPool } from './pool';

/**
 * LLM包装器基类
 */
export abstract class LLMWrapper extends Entity {
  protected stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0.0,
  };

  constructor(
    id: ID,
    public readonly name: string,
    public readonly config: Record<string, any>
  ) {
    super(id, Timestamp.now(), Timestamp.now(), Version.initial());
  }

  /**
   * 验证包装器有效性
   */
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('包装器名称不能为空');
    }
  }

  /**
   * 生成响应
   */
  abstract generateResponse(request: LLMWrapperRequest): Promise<LLMResponse>;

  /**
   * 流式生成响应
   */
  abstract generateResponseStream(request: LLMWrapperRequest): Promise<AsyncIterable<LLMResponse>>;

  /**
   * 检查包装器是否可用
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * 获取包装器状态
   */
  async getStatus(): Promise<Record<string, any>> {
    return {
      name: this.name,
      stats: this.stats,
      available: await this.isAvailable(),
    };
  }

  /**
   * 更新统计信息
   */
  protected updateStats(responseTime: number, success: boolean): void {
    this.stats.totalRequests += 1;

    if (success) {
      this.stats.successfulRequests += 1;
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime * (this.stats.successfulRequests - 1) + responseTime) /
        this.stats.successfulRequests;
    } else {
      this.stats.failedRequests += 1;
    }
  }
}

/**
 * 轮询池包装器
 */
export class PollingPoolWrapper extends LLMWrapper {
  constructor(
    id: ID,
    name: string,
    config: Record<string, any>,
    public readonly pool: PollingPool
  ) {
    super(id, name, config);
  }

  /**
   * 验证包装器有效性
   */
  override validate(): void {
    super.validate();
    if (!this.pool) {
      throw new Error('轮询池不能为空');
    }
  }

  /**
   * 获取包装器名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 生成响应
   */
  async generateResponse(request: LLMWrapperRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const prompt = request.prompt || request.content || '';
      const response = await this.pool.callLLM(prompt, request.options);
      const responseTime = Date.now() - startTime;

      this.updateStats(responseTime, true);
      // 将响应转换为LLMResponse
      return LLMResponse.create(
        ID.generate(),
        'unknown',
        [{
          index: 0,
          message: LLMMessage.createAssistant(response),
          finish_reason: 'stop'
        }],
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        'stop',
        responseTime,
        { metadata: request.options?.metadata }
      );
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, false);
      throw error;
    }
  }

  /**
   * 流式生成响应
   */
  async generateResponseStream(request: LLMWrapperRequest): Promise<AsyncIterable<LLMResponse>> {
    throw new Error('轮询池包装器暂不支持流式响应');
  }

  /**
   * 检查包装器是否可用
   */
  async isAvailable(): Promise<boolean> {
    const status = await this.pool.getStatus();
    return status['healthyInstances'] > 0;
  }

  /**
   * 获取包装器状态
   */
  override async getStatus(): Promise<Record<string, any>> {
    const baseStatus = await super.getStatus();
    const poolStatus = await this.pool.getStatus();

    return {
      ...baseStatus,
      poolStatus,
      type: 'polling_pool',
    };
  }
}

/**
 * 任务组包装器
 */
export class TaskGroupWrapper extends LLMWrapper {
  private currentEchelonIndex = 0;
  private fallbackAttempts = 0;

  constructor(
    id: ID,
    name: string,
    config: Record<string, any>,
    public readonly taskGroupManager: ITaskGroupManager
  ) {
    super(id, name, config);
  }

  /**
   * 验证包装器有效性
   */
  override validate(): void {
    super.validate();
    if (!this.taskGroupManager) {
      throw new Error('任务组管理器不能为空');
    }
  }

  /**
   * 获取包装器名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 生成响应
   */
  async generateResponse(request: LLMWrapperRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // 获取按优先级排序的层级
      const echelons = await this.taskGroupManager.getGroupModelsByPriority(this.name);

      for (let i = this.currentEchelonIndex; i < echelons.length; i++) {
        const echelon = echelons[i];
        if (!echelon) continue;
        const [echelonName, priority, models] = echelon;

        try {
          // 尝试当前层级的模型
          const response = await this.tryEchelon(echelonName, models, request);
          const responseTime = Date.now() - startTime;

          this.updateStats(responseTime, true);
          this.currentEchelonIndex = i; // 记住成功的层级
          this.fallbackAttempts = 0;

          return response;
        } catch (error) {
          console.warn(`层级 ${echelonName} 调用失败:`, error);
          this.fallbackAttempts += 1;

          // 检查是否达到最大降级尝试次数
          const fallbackConfig = await this.taskGroupManager.getFallbackConfig(this.name);
          if (this.fallbackAttempts >= fallbackConfig.maxAttempts) {
            throw new Error(`任务组 ${this.name} 降级失败，已达到最大尝试次数`);
          }
        }
      }

      throw new Error(`任务组 ${this.name} 所有层级都调用失败`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, false);
      throw error;
    }
  }

  /**
   * 尝试特定层级的模型
   */
  private async tryEchelon(echelonName: string, models: string[], request: LLMWrapperRequest): Promise<LLMResponse> {
    // TODO: 实现具体的模型调用逻辑
    // 这里应该根据模型列表选择合适的模型进行调用

    if (models.length === 0) {
      throw new Error(`层级 ${echelonName} 没有可用的模型`);
    }

    // 模拟调用第一个模型
    await new Promise(resolve => setTimeout(resolve, 100));
    const prompt = request.prompt || request.content || '';
    return LLMResponse.create(
      ID.generate(),
      models[0] || 'unknown',
      [{
        index: 0,
        message: LLMMessage.createAssistant(`模拟响应: ${prompt.substring(0, 50)}... (层级: ${echelonName})`),
        finish_reason: 'stop'
      }],
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'stop',
      100,
      { metadata: request.options?.metadata }
    );
  }

  /**
   * 流式生成响应
   */
  async generateResponseStream(request: LLMWrapperRequest): Promise<AsyncIterable<LLMResponse>> {
    throw new Error('任务组包装器暂不支持流式响应');
  }

  /**
   * 检查包装器是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const echelons = await this.taskGroupManager.getGroupModelsByPriority(this.name);
      return echelons.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取包装器状态
   */
  override async getStatus(): Promise<Record<string, any>> {
    const baseStatus = await super.getStatus();
    const echelons = await this.taskGroupManager.getGroupModelsByPriority(this.name);

    return {
      ...baseStatus,
      currentEchelonIndex: this.currentEchelonIndex,
      fallbackAttempts: this.fallbackAttempts,
      totalEchelons: echelons.length,
      type: 'task_group',
    };
  }
}

/**
 * 直接LLM包装器
 */
export class DirectLLMWrapper extends LLMWrapper {
  constructor(
    id: ID,
    name: string,
    config: Record<string, any>,
    public readonly client: ILLMClient
  ) {
    super(id, name, config);
  }

  /**
   * 验证包装器有效性
   */
  override validate(): void {
    super.validate();
    if (!this.client) {
      throw new Error('LLM客户端不能为空');
    }
  }

  /**
   * 获取包装器名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 生成响应
   */
  async generateResponse(request: LLMWrapperRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // 将请求转换为LLM请求格式
      const llmRequest = this.convertToLLMRequest(request);
      const response = await this.client.generateResponse(llmRequest);
      const responseTime = Date.now() - startTime;

      this.updateStats(responseTime, true);
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, false);
      throw error;
    }
  }

  /**
   * 流式生成响应
   */
  async generateResponseStream(request: LLMWrapperRequest): Promise<AsyncIterable<LLMResponse>> {
    const llmRequest = this.convertToLLMRequest(request);
    return this.client.generateResponseStream(llmRequest);
  }

  /**
   * 转换请求格式
   */
  private convertToLLMRequest(request: LLMWrapperRequest): any {
    // TODO: 实现请求格式转换
    // 这里需要将LLMWrapperRequest转换为LLMRequest
    // 暂时返回一个基本结构
    return {
      messages: request.messages,
      options: request.options,
    };
  }

  /**
   * 检查包装器是否可用
   */
  async isAvailable(): Promise<boolean> {
    return this.client.isModelAvailable();
  }

  /**
   * 获取包装器状态
   */
  override async getStatus(): Promise<Record<string, any>> {
    const baseStatus = await super.getStatus();
    const clientStatus = await this.client.getModelInfo();

    return {
      ...baseStatus,
      clientStatus,
      type: 'direct_llm',
    };
  }
}
