import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { TYPES } from '../../../di/service-keys';
import { LLMClientFactory } from '../../../infrastructure/llm/clients/llm-client-factory';
import { PollingPoolManager } from './pool-manager';
import { TaskGroupManager } from './task-group-manager';
import {
  WrapperConfig,
  WrapperModelConfig,
  validateWrapperConfig
} from '../../../domain/llm/value-objects/wrapper-reference';

/**
 * LLM包装器管理器
 *
 * Infrastructure 层服务，统一管理所有 LLM 调用
 * 支持三种类型的包装器：
 * - 轮询池包装器（type: 'pool', name: 'poolName'）
 * - 任务组包装器（type: 'group', name: 'groupName'）
 * - 直接LLM包装器（type: 'direct', provider: 'xxx', model: 'xxx'）
 *
 * 使用结构化配置对象，提供类型安全和更好的可维护性
 */
@injectable()
export class LLMWrapperManager {
  constructor(
    @inject(TYPES.LLMClientFactory) private llmClientFactory: LLMClientFactory,
    @inject(TYPES.PollingPoolManager) private poolManager: PollingPoolManager,
    @inject(TYPES.TaskGroupManager) private taskGroupManager: TaskGroupManager
  ) { }

  /**
   * 验证wrapper配置
   */
  private validateWrapperConfig(config: WrapperConfig): void {
    const validation = validateWrapperConfig(config);
    if (!validation.isValid) {
      throw new Error(`wrapper配置验证失败: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * 生成响应
   * @param wrapper wrapper配置
   * @param request LLM请求
   */
  async generateResponse(
    wrapper: WrapperConfig,
    request: LLMRequest
  ): Promise<LLMResponse> {
    this.validateWrapperConfig(wrapper);

    switch (wrapper.type) {
      case 'pool':
        return this.generatePoolResponse(wrapper.name!, request);
      case 'group':
        return this.generateTaskGroupResponse(wrapper.name!, request);
      case 'direct':
        return this.generateDirectResponse(
          wrapper.provider!,
          wrapper.model!,
          request
        );
      default:
        throw new Error(`未知的wrapper类型: ${wrapper.type}`);
    }
  }

  /**
   * 流式生成响应
   * @param wrapper wrapper配置
   * @param request LLM请求
   */
  async generateResponseStream(
    wrapper: WrapperConfig,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    this.validateWrapperConfig(wrapper);

    switch (wrapper.type) {
      case 'pool':
        return this.generatePoolResponseStream(wrapper.name!, request);
      case 'group':
        return this.generateTaskGroupResponseStream(wrapper.name!, request);
      case 'direct':
        return this.generateDirectResponseStream(
          wrapper.provider!,
          wrapper.model!,
          request
        );
      default:
        throw new Error(`未知的wrapper类型: ${wrapper.type}`);
    }
  }

  /**
   * 检查包装器是否可用
   * @param wrapper wrapper配置
   */
  async isAvailable(wrapper: WrapperConfig): Promise<boolean> {
    this.validateWrapperConfig(wrapper);

    switch (wrapper.type) {
      case 'pool':
        return this.isPoolAvailable(wrapper.name!);
      case 'group':
        return this.isTaskGroupAvailable(wrapper.name!);
      case 'direct':
        return this.isDirectAvailable(wrapper.provider!, wrapper.model!);
      default:
        return false;
    }
  }

  /**
   * 获取包装器状态
   * @param wrapper wrapper配置
   */
  async getStatus(wrapper: WrapperConfig): Promise<Record<string, any>> {
    this.validateWrapperConfig(wrapper);

    switch (wrapper.type) {
      case 'pool':
        return this.getPoolStatus(wrapper.name!);
      case 'group':
        return this.getTaskGroupStatus(wrapper.name!);
      case 'direct':
        return this.getDirectStatus(wrapper.provider!, wrapper.model!);
      default:
        return {
          type: wrapper.type,
          status: 'error',
          message: `未知的wrapper类型: ${wrapper.type}`,
        };
    }
  }

  /**
   * 直接LLM - 生成响应
   */
  private async generateDirectResponse(
    provider: string,
    model: string,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const client = this.llmClientFactory.createClient(provider, model);
    return client.generateResponse(request);
  }

  /**
   * 直接LLM - 流式生成响应
   */
  private async generateDirectResponseStream(
    provider: string,
    model: string,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    const client = this.llmClientFactory.createClient(provider, model);
    return client.generateResponseStream(request);
  }

  /**
   * 直接LLM - 检查可用性
   */
  private async isDirectAvailable(provider: string, model: string): Promise<boolean> {
    const client = this.llmClientFactory.createClient(provider, model);
    return client.isModelAvailable();
  }

  /**
   * 直接LLM - 获取状态
   */
  private async getDirectStatus(
    provider: string,
    model: string
  ): Promise<Record<string, any>> {
    const client = this.llmClientFactory.createClient(provider, model);
    const health = await client.healthCheck();
    const modelInfo = await client.getModelInfo();

    return {
      name: `${provider}:${model}`,
      type: 'direct',
      status: health.status,
      message: health.message,
      latency: health.latency,
      lastChecked: health.lastChecked,
      model: modelInfo,
    };
  }

  /**
   * 轮询池 - 生成响应
   */
  private async generatePoolResponse(
    poolName: string,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const pool = await this.poolManager.getPool(poolName);

    if (!pool) {
      throw new Error(`轮询池不存在: ${poolName}`);
    }

    // 从池中选择一个可用的实例
    const instance = pool.selectInstance();
    if (!instance) {
      throw new Error(`轮询池 ${poolName} 中没有可用的实例`);
    }

    // 获取实例的模型名称
    const modelName = instance.modelName;
    const client = this.llmClientFactory.createClient(modelName, modelName);

    return client.generateResponse(request);
  }

  /**
   * 轮询池 - 流式生成响应
   */
  private async generatePoolResponseStream(
    poolName: string,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    const pool = await this.poolManager.getPool(poolName);

    if (!pool) {
      throw new Error(`轮询池不存在: ${poolName}`);
    }

    // 从池中选择一个可用的实例
    const instance = pool.selectInstance();
    if (!instance) {
      throw new Error(`轮询池 ${poolName} 中没有可用的实例`);
    }

    // 获取实例的模型名称
    const modelName = instance.modelName;
    const client = this.llmClientFactory.createClient(modelName, modelName);

    return client.generateResponseStream(request);
  }

  /**
   * 轮询池 - 检查可用性
   */
  private async isPoolAvailable(poolName: string): Promise<boolean> {
    const pool = await this.poolManager.getPool(poolName);

    if (!pool) {
      return false;
    }

    const status = await pool.getStatus();
    const healthyInstances = status['healthyInstances'] as number || 0;
    const degradedInstances = status['degradedInstances'] as number || 0;

    return healthyInstances > 0 || degradedInstances > 0;
  }

  /**
   * 轮询池 - 获取状态
   */
  private async getPoolStatus(poolName: string): Promise<Record<string, any>> {
    const pool = await this.poolManager.getPool(poolName);

    if (!pool) {
      return {
        name: poolName,
        type: 'pool',
        status: 'error',
        message: '轮询池不存在',
      };
    }

    const status = await pool.getStatus();
    const statistics = await this.poolManager.getPoolStatistics(poolName);

    return {
      name: poolName,
      type: 'pool',
      ...status,
      statistics,
    };
  }

  /**
   * 任务组 - 生成响应
   */
  private async generateTaskGroupResponse(
    groupName: string,
    request: LLMRequest
  ): Promise<LLMResponse> {
    // 获取任务组的模型列表
    const models = await this.taskGroupManager.getModelsForGroup(groupName);

    if (models.length === 0) {
      throw new Error(`任务组 ${groupName} 中没有可用的模型`);
    }

    // 使用第一个模型（可以根据优先级策略改进）
    const model = models[0];

    if (!model) {
      throw new Error(`任务组 ${groupName} 中的模型名称为空`);
    }

    const client = this.llmClientFactory.createClient(model, model);

    return client.generateResponse(request);
  }

  /**
   * 任务组 - 流式生成响应
   */
  private async generateTaskGroupResponseStream(
    groupName: string,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    // 获取任务组的模型列表
    const models = await this.taskGroupManager.getModelsForGroup(groupName);

    if (models.length === 0) {
      throw new Error(`任务组 ${groupName} 中没有可用的模型`);
    }

    // 使用第一个模型（可以根据优先级策略改进）
    const model = models[0];

    if (!model) {
      throw new Error(`任务组 ${groupName} 中的模型名称为空`);
    }

    const client = this.llmClientFactory.createClient(model, model);

    return client.generateResponseStream(request);
  }

  /**
   * 任务组 - 检查可用性
   */
  private async isTaskGroupAvailable(groupName: string): Promise<boolean> {
    const models = await this.taskGroupManager.getModelsForGroup(groupName);
    return models.length > 0;
  }

  /**
   * 任务组 - 获取状态
   */
  private async getTaskGroupStatus(groupName: string): Promise<Record<string, any>> {
    const status = await this.taskGroupManager.getTaskGroupStatus(groupName);

    return {
      name: groupName,
      type: 'task_group',
      ...status,
    };
  }

  /**
   * 获取所有包装器统计信息
   */
  async getAllWrappersStatistics(): Promise<Record<string, any>> {
    const statistics: Record<string, any> = {};

    // 获取所有轮询池统计
    const poolStatistics = await this.poolManager.getAllPoolsStatistics();
    for (const [name, stats] of Object.entries(poolStatistics)) {
      statistics[`pool:${name}`] = {
        name: `pool:${name}`,
        type: 'pool',
        ...stats,
      };
    }

    // 获取所有任务组统计
    const taskGroupStatus = await this.taskGroupManager.getAllTaskGroupsStatus();
    for (const [name, status] of Object.entries(taskGroupStatus)) {
      statistics[`group:${name}`] = {
        name: `group:${name}`,
        type: 'task_group',
        ...status,
      };
    }

    return statistics;
  }

  /**
   * 获取系统级报告
   */
  async getSystemReport(): Promise<Record<string, any>> {
    const allStatistics = await this.getAllWrappersStatistics();
    const totalWrappers = Object.keys(allStatistics).length;

    return {
      totalWrappers,
      wrappers: allStatistics,
      timestamp: new Date(),
    };
  }

  /**
   * 获取wrapper的模型配置
   * @param wrapper wrapper配置
   * @returns 模型配置（provider, model, 默认参数等）
   */
  async getWrapperModelConfig(wrapper: WrapperConfig): Promise<WrapperModelConfig> {
    this.validateWrapperConfig(wrapper);

    switch (wrapper.type) {
      case 'pool':
        return this.getPoolModelConfig(wrapper.name!);
      case 'group':
        return this.getGroupModelConfig(wrapper.name!);
      case 'direct':
        return this.getDirectModelConfig(wrapper.provider!, wrapper.model!);
      default:
        throw new Error(`未知的wrapper类型: ${wrapper.type}`);
    }
  }

  /**
   * 获取轮询池的模型配置
   */
  private async getPoolModelConfig(poolName: string): Promise<WrapperModelConfig> {
    const pool = await this.poolManager.getPool(poolName);
    if (!pool) {
      throw new Error(`轮询池不存在: ${poolName}`);
    }

    // 从池中选择一个可用的实例
    const instance = pool.selectInstance();
    if (!instance) {
      throw new Error(`轮询池 ${poolName} 中没有可用的实例`);
    }

    // 获取实例的模型信息
    const modelName = instance.modelName;
    const provider = await this.getProviderForModel(modelName);

    // 获取模型默认参数
    const defaultParameters = await this.getModelDefaultParameters(provider, modelName);

    return {
      type: 'pool',
      provider,
      model: modelName,
      defaultParameters,
      capabilities: {
        maxTokens: defaultParameters['max_tokens'] || 2048,
        supportsStreaming: defaultParameters['stream'] !== false,
      },
    };
  }

  /**
   * 获取任务组的模型配置
   */
  private async getGroupModelConfig(groupName: string): Promise<WrapperModelConfig> {
    const models = await this.taskGroupManager.getModelsForGroup(groupName);
    if (models.length === 0) {
      throw new Error(`任务组 ${groupName} 中没有可用的模型`);
    }

    // 使用第一个模型（可以根据优先级策略改进）
    const model = models[0];
    if (!model) {
      throw new Error(`任务组 ${groupName} 中的模型名称为空`);
    }

    const provider = await this.getProviderForModel(model);

    // 获取模型默认参数
    const defaultParameters = await this.getModelDefaultParameters(provider, model);

    return {
      type: 'group',
      provider,
      model,
      defaultParameters,
      capabilities: {
        maxTokens: defaultParameters['max_tokens'] || 2048,
        supportsStreaming: defaultParameters['stream'] !== false,
      },
    };
  }

  /**
   * 获取直接LLM的模型配置
   */
  private async getDirectModelConfig(
    provider: string,
    model: string
  ): Promise<WrapperModelConfig> {
    // 获取模型默认参数
    const defaultParameters = await this.getModelDefaultParameters(provider, model);

    return {
      type: 'direct',
      provider,
      model,
      defaultParameters,
      capabilities: {
        maxTokens: defaultParameters['max_tokens'] || 2048,
        supportsStreaming: defaultParameters['stream'] !== false,
      },
    };
  }

  /**
   * 获取模型的默认参数
   * @param provider 提供商名称
   * @param model 模型名称
   * @returns 默认参数
   */
  private async getModelDefaultParameters(
    provider: string,
    model: string
  ): Promise<Record<string, any>> {
    // TODO: 从配置文件中加载模型默认参数
    // 这里暂时返回一些默认值
    // 实际实现应该从 configs/llms/provider/{provider}/{model}.toml 中读取
    
    const client = this.llmClientFactory.createClient(provider, model);
    const modelInfo = await client.getModelInfo();

    return {
      temperature: 0.7,
      max_tokens: modelInfo.maxTokens || 2048,
      stream: true,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };
  }

  /**
   * 获取模型对应的提供商
   * @param model 模型名称
   * @returns 提供商名称
   */
  private async getProviderForModel(model: string): Promise<string> {
    // TODO: 从配置中获取模型对应的提供商
    // 这里暂时根据模型名称推断
    if (model.startsWith('gpt-')) {
      return 'openai';
    } else if (model.startsWith('gemini-')) {
      return 'gemini';
    } else if (model.startsWith('claude-')) {
      return 'anthropic';
    }
    return 'unknown';
  }
}