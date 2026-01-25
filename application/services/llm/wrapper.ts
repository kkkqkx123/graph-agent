/**
 * 包装器服务
 */

import { injectable, inject } from 'inversify';
import { LLMWrapperManager } from './managers/llm-wrapper-manager';
import { LLMClientFactory } from '../../infrastructure/llm/clients/llm-client-factory';
import { LLMRequest } from '../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../domain/llm/entities/llm-response';
import { WrapperConfig } from '../../domain/llm/value-objects/wrapper-reference';
import { TYPES } from '../../di/service-keys';
import { ValidationError, InvalidConfigurationError } from '../../domain/common/exceptions';

/**
 * 包装器服务
 *
 * 提供业务逻辑和编排功能
 */
@injectable()
export class Wrapper {
  constructor(
    @inject(TYPES.LLMWrapperManager) private wrapperManager: LLMWrapperManager,
    @inject(TYPES.LLMClientFactory) private llmClientFactory: LLMClientFactory
  ) { }

  /**
   * 直接生成响应（跳过 wrapper 抽象层，避免额外开销）
   * @param provider 提供商名称
   * @param model 模型名称
   * @param request LLM请求
   */
  async generateDirectResponse(
    provider: string,
    model: string,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const client = this.llmClientFactory.createClient(provider, model);
    return client.generateResponse(request);
  }

  /**
   * 直接流式生成响应（跳过 wrapper 抽象层，避免额外开销）
   * @param provider 提供商名称
   * @param model 模型名称
   * @param request LLM请求
   */
  async generateDirectResponseStream(
    provider: string,
    model: string,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    const client = this.llmClientFactory.createClient(provider, model);
    return client.generateResponseStream(request);
  }

  /**
   * 生成响应（保留用于 pool/group 类型）
   * @param wrapper wrapper配置
   * @param request LLM请求
   */
  async generateResponse(wrapper: WrapperConfig, request: LLMRequest): Promise<LLMResponse> {
    return this.wrapperManager.generateResponse(wrapper, request);
  }

  /**
   * 流式生成响应（保留用于 pool/group 类型）
   * @param wrapper wrapper配置
   * @param request LLM请求
   */
  async generateResponseStream(
    wrapper: WrapperConfig,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    return this.wrapperManager.generateResponseStream(wrapper, request);
  }

  /**
   * 检查包装器是否可用
   * @param wrapper wrapper配置
   */
  async isWrapperAvailable(wrapper: WrapperConfig): Promise<boolean> {
    try {
      return this.wrapperManager.isAvailable(wrapper);
    } catch {
      return false;
    }
  }

  /**
   * 获取包装器状态
   * @param wrapper wrapper配置
   */
  async getWrapperStatus(wrapper: WrapperConfig): Promise<Record<string, any>> {
    return this.wrapperManager.getStatus(wrapper);
  }

  /**
   * 获取所有包装器统计信息
   */
  async getAllWrappersStatistics(): Promise<Record<string, any>> {
    return this.wrapperManager.getAllWrappersStatistics();
  }

  /**
   * 获取系统级包装器报告
   *
   * 业务逻辑：聚合和格式化系统级报告
   */
  async getSystemWrapperReport(): Promise<Record<string, any>> {
    return this.wrapperManager.getSystemReport();
  }

  /**
   * 解析wrapper名称
   * @param wrapperName wrapper名称（格式：type:name 或 provider:model）
   * @returns WrapperConfig对象
   */
  private parseWrapperName(wrapperName: string): WrapperConfig {
    const parts = wrapperName.split(':');
    if (parts.length < 2) {
      throw new ValidationError(`无效的wrapper名称格式: ${wrapperName}`);
    }

    const type = parts[0] as 'pool' | 'group' | 'direct';
    const name = parts.slice(1).join(':');

    switch (type) {
      case 'pool':
      case 'group':
        return { type, name };
      case 'direct':
        // 对于direct类型，name实际上是provider:model的格式
        const providerParts = name.split(':');
        if (providerParts.length < 2) {
          throw new ValidationError(`无效的direct wrapper格式: ${wrapperName}`);
        }
        return {
          type: 'direct',
          provider: providerParts[0],
          model: providerParts.slice(1).join(':'),
        };
      default:
        throw new InvalidConfigurationError(`type`, `未知的wrapper类型: ${type}`);
    }
  }


  /**
   * 路由请求到合适的包装器
   *
   * 业务逻辑：根据请求类型和名称路由请求
   */
  async routeRequest(request: any): Promise<any> {
    const { wrapperType, wrapperName, ...requestData } = request;

    // 根据包装器类型和名称路由请求
    if (wrapperType && wrapperName) {
      // 对于 direct 类型，直接使用 generateDirectResponse 避免额外开销
      if (wrapperType === 'direct') {
        const [provider, model] = wrapperName.split(':');
        if (!provider || !model) {
          throw new ValidationError(`无效的 direct wrapper 格式: ${wrapperName}`);
        }
        return this.generateDirectResponse(provider, model, requestData);
      }

      const wrapper: WrapperConfig = { type: wrapperType as 'pool' | 'group', name: wrapperName };
      return this.generateResponse(wrapper, requestData);
    }
    throw new InvalidConfigurationError('wrapper', '没有可用的包装器来处理请求');
  }

  /**
   * 获取wrapper的模型配置
   * @param wrapper wrapper配置
   * @returns 模型配置
   */
  async getWrapperModelConfig(wrapper: WrapperConfig): Promise<Record<string, any>> {
    return this.wrapperManager.getWrapperModelConfig(wrapper);
  }
}
