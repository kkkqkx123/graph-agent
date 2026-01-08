import { injectable, inject } from 'inversify';
import { LLMRequest } from '../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../domain/llm/entities/llm-response';
import { TYPES } from '../../../di/service-keys';
import { LLMClientFactory } from '../clients/llm-client-factory';
import { PollingPoolManager } from './pool-manager';
import { TaskGroupManager } from './task-group-manager';

/**
 * LLM包装器管理器
 *
 * Infrastructure 层服务，统一管理所有 LLM 调用
 * 支持三种类型的包装器：
 * - 轮询池包装器（pool:poolName）
 * - 任务组包装器（group:groupName）
 * - 直接LLM包装器（provider:model）
 */
@injectable()
export class LLMWrapperManager {
  constructor(
    @inject(TYPES.LLMClientFactory) private llmClientFactory: LLMClientFactory,
    @inject(TYPES.PollingPoolManager) private poolManager: PollingPoolManager,
    @inject(TYPES.TaskGroupManager) private taskGroupManager: TaskGroupManager
  ) { }

  /**
   * 解析包装器名称
   * 格式：pool:poolName | group:groupName | provider:model
   */
  private parseWrapperName(wrapperName: string): { type: string; name: string } {
    const parts = wrapperName.split(':');
    if (parts.length < 2) {
      throw new Error(`无效的包装器名称格式: ${wrapperName}，应为 pool:name | group:name | provider:model`);
    }
    return {
      type: parts[0] || '',
      name: parts.slice(1).join(':'),
    };
  }

  /**
   * 生成响应
   */
  async generateResponse(wrapperName: string, request: LLMRequest): Promise<LLMResponse> {
    const { type, name } = this.parseWrapperName(wrapperName);

    switch (type) {
      case 'pool':
        return this.generatePoolResponse(name, request);
      case 'group':
        return this.generateTaskGroupResponse(name, request);
      default:
        // 默认为直接LLM
        return this.generateDirectResponse(wrapperName, request);
    }
  }

  /**
   * 流式生成响应
   */
  async generateResponseStream(
    wrapperName: string,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    const { type, name } = this.parseWrapperName(wrapperName);

    switch (type) {
      case 'pool':
        return this.generatePoolResponseStream(name, request);
      case 'group':
        return this.generateTaskGroupResponseStream(name, request);
      default:
        // 默认为直接LLM
        return this.generateDirectResponseStream(wrapperName, request);
    }
  }

  /**
   * 检查包装器是否可用
   */
  async isAvailable(wrapperName: string): Promise<boolean> {
    const { type, name } = this.parseWrapperName(wrapperName);

    switch (type) {
      case 'pool':
        return this.isPoolAvailable(name);
      case 'group':
        return this.isTaskGroupAvailable(name);
      default:
        // 默认为直接LLM
        return this.isDirectAvailable(wrapperName);
    }
  }

  /**
   * 获取包装器状态
   */
  async getStatus(wrapperName: string): Promise<Record<string, any>> {
    const { type, name } = this.parseWrapperName(wrapperName);

    switch (type) {
      case 'pool':
        return this.getPoolStatus(name);
      case 'group':
        return this.getTaskGroupStatus(name);
      default:
        // 默认为直接LLM
        return this.getDirectStatus(wrapperName);
    }
  }

  /**
   * 直接LLM - 生成响应
   */
  private async generateDirectResponse(
    wrapperName: string,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const parts = wrapperName.split(':');

    if (parts.length < 2) {
      throw new Error(`无效的客户端名称: ${wrapperName}`);
    }

    const provider = parts[0];
    const model = parts.slice(1).join(':');

    if (!provider || !model) {
      throw new Error(`无效的客户端名称: ${wrapperName}`);
    }

    const client = this.llmClientFactory.createClient(provider, model);

    return client.generateResponse(request);
  }

  /**
   * 直接LLM - 流式生成响应
   */
  private async generateDirectResponseStream(
    wrapperName: string,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    const parts = wrapperName.split(':');

    if (parts.length < 2) {
      throw new Error(`无效的客户端名称: ${wrapperName}`);
    }

    const provider = parts[0];
    const model = parts.slice(1).join(':');

    if (!provider || !model) {
      throw new Error(`无效的客户端名称: ${wrapperName}`);
    }

    const client = this.llmClientFactory.createClient(provider, model);

    return client.generateResponseStream(request);
  }

  /**
   * 直接LLM - 检查可用性
   */
  private async isDirectAvailable(wrapperName: string): Promise<boolean> {
    const parts = wrapperName.split(':');

    if (parts.length < 2) {
      return false;
    }

    const provider = parts[0];
    const model = parts.slice(1).join(':');

    if (!provider || !model) {
      return false;
    }

    const client = this.llmClientFactory.createClient(provider, model);

    return client.isModelAvailable();
  }

  /**
   * 直接LLM - 获取状态
   */
  private async getDirectStatus(wrapperName: string): Promise<Record<string, any>> {
    const parts = wrapperName.split(':');

    if (parts.length < 2) {
      return {
        name: wrapperName,
        type: 'direct',
        status: 'error',
        message: '无效的客户端名称',
      };
    }

    const provider = parts[0];
    const model = parts.slice(1).join(':');

    if (!provider || !model) {
      return {
        name: wrapperName,
        type: 'direct',
        status: 'error',
        message: '无效的客户端名称',
      };
    }

    const client = this.llmClientFactory.createClient(provider, model);

    const health = await client.healthCheck();
    const modelInfo = await client.getModelInfo();

    return {
      name: wrapperName,
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
}