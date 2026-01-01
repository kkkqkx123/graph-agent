/**
 * 包装器服务
 *
 * Application 层服务，专注于业务逻辑和编排
 * 技术实现委托给 Infrastructure 层的 LLMWrapperFactory
 */

import { injectable, inject } from 'inversify';
import { LLMWrapperFactory } from '../../../infrastructure/llm/wrappers/wrapper-factory';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';

/**
 * 包装器服务
 *
 * 提供业务逻辑和编排功能
 */
@injectable()
export class WrapperService {
  constructor(
    @inject('LLMWrapperFactory') private wrapperFactory: LLMWrapperFactory
  ) {}

  /**
   * 获取包装器
   */
  async getWrapper(wrapperName: string) {
    return this.wrapperFactory.getWrapper(wrapperName);
  }

  /**
   * 创建轮询池包装器
   */
  async createPollingPoolWrapper(poolName: string, config?: Record<string, any>) {
    return this.wrapperFactory.createPollingPoolWrapper(poolName, config);
  }

  /**
   * 创建任务组包装器
   */
  async createTaskGroupWrapper(groupName: string, config?: Record<string, any>) {
    return this.wrapperFactory.createTaskGroupWrapper(groupName, config);
  }

  /**
   * 创建直接LLM包装器
   */
  async createDirectLLMWrapper(clientName: string, config?: Record<string, any>) {
    return this.wrapperFactory.createDirectLLMWrapper(clientName, config);
  }

  /**
   * 生成响应
   */
  async generateResponse(wrapperName: string, request: LLMRequest): Promise<LLMResponse> {
    const wrapper = await this.wrapperFactory.getWrapper(wrapperName);
    if (!wrapper) {
      throw new Error(`包装器未找到: ${wrapperName}`);
    }
    return wrapper.generateResponse(request);
  }

  /**
   * 流式生成响应
   */
  async generateResponseStream(wrapperName: string, request: LLMRequest): Promise<AsyncIterable<LLMResponse>> {
    const wrapper = await this.wrapperFactory.getWrapper(wrapperName);
    if (!wrapper) {
      throw new Error(`包装器未找到: ${wrapperName}`);
    }
    return wrapper.generateResponseStream(request);
  }

  /**
   * 检查包装器是否可用
   */
  async isWrapperAvailable(wrapperName: string): Promise<boolean> {
    try {
      const wrapper = await this.wrapperFactory.getWrapper(wrapperName);
      if (!wrapper) {
        return false;
      }
      return wrapper.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * 获取包装器状态
   */
  async getWrapperStatus(wrapperName: string): Promise<Record<string, any>> {
    const wrapper = await this.wrapperFactory.getWrapper(wrapperName);
    if (!wrapper) {
      throw new Error(`包装器未找到: ${wrapperName}`);
    }
    return wrapper.getStatus();
  }

  /**
   * 获取所有包装器状态
   */
  async getAllWrappersStatus(): Promise<Record<string, any>> {
    const allWrappers = await this.wrapperFactory.getAllWrappers();
    const status: Record<string, any> = {};

    for (const wrapper of allWrappers) {
      status[wrapper.getName()] = await wrapper.getStatus();
    }

    return status;
  }

  /**
   * 获取包装器统计信息
   */
  async getWrapperStatistics(wrapperName: string): Promise<Record<string, any>> {
    return this.wrapperFactory.getWrapperStatistics(wrapperName);
  }

  /**
   * 获取所有包装器统计信息
   */
  async getAllWrappersStatistics(): Promise<Record<string, any>> {
    return this.wrapperFactory.getAllWrappersStatistics();
  }

  /**
   * 关闭包装器
   */
  async closeWrapper(wrapperName: string): Promise<void> {
    await this.wrapperFactory.removeWrapper(wrapperName);
  }

  /**
   * 关闭所有包装器
   */
  async closeAllWrappers(): Promise<void> {
    await this.wrapperFactory.closeAll();
  }

  /**
   * 重新加载包装器
   */
  async reloadWrapper(wrapperName: string, config?: Record<string, any>): Promise<void> {
    await this.wrapperFactory.recreateWrapper(wrapperName, config);
  }

  /**
   * 获取系统级包装器报告
   *
   * 业务逻辑：聚合和格式化系统级报告
   */
  async getSystemWrapperReport(): Promise<Record<string, any>> {
    const allStatistics = await this.wrapperFactory.getAllWrappersStatistics();
    const totalWrappers = Object.keys(allStatistics).length;
    const totalRequests = Object.values(allStatistics).reduce(
      (sum, stats) => sum + (stats['totalRequests'] as number || 0), 0
    );
    const successfulRequests = Object.values(allStatistics).reduce(
      (sum, stats) => sum + (stats['successfulRequests'] as number || 0), 0
    );

    const overallSuccessRate = totalRequests > 0 ?
      successfulRequests / totalRequests : 0;

    return {
      totalWrappers,
      totalRequests,
      successfulRequests,
      overallSuccessRate,
      wrappers: allStatistics,
      timestamp: new Date()
    };
  }

  /**
   * 获取最优包装器选择
   *
   * 业务逻辑：根据需求选择最优包装器
   */
  async getOptimalWrapper(requirements: Record<string, any>): Promise<string | null> {
    const allWrappers = await this.wrapperFactory.getAllWrappers();

    // 业务逻辑：返回第一个可用的包装器
    // 可以根据 requirements 实现更复杂的选择策略
    for (const wrapper of allWrappers) {
      if (await wrapper.isAvailable()) {
        return wrapper.getName();
      }
    }

    return null;
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
      return this.generateResponse(wrapperName, requestData);
    }

    // 自动选择最优包装器
    const optimalWrapper = await this.getOptimalWrapper(requestData);
    if (optimalWrapper) {
      return this.generateResponse(optimalWrapper, requestData);
    }

    throw new Error('没有可用的包装器来处理请求');
  }
}