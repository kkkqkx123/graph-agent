/**
 * 包装器服务
 *
 * Application 层服务，专注于业务逻辑和编排
 * 技术实现委托给 Infrastructure 层的 LLMWrapperManager
 */

import { injectable, inject } from 'inversify';
import { LLMWrapperManager } from '../../../infrastructure/llm/managers/llm-wrapper-manager';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';

/**
 * 包装器服务
 *
 * 提供业务逻辑和编排功能
 */
@injectable()
export class Wrapper {
  constructor(@inject('LLMWrapperManager') private wrapperManager: LLMWrapperManager) {}

  /**
   * 生成响应
   *
   * wrapperName 格式：pool:poolName | group:groupName | provider:model
   */
  async generateResponse(wrapperName: string, request: LLMRequest): Promise<LLMResponse> {
    return this.wrapperManager.generateResponse(wrapperName, request);
  }

  /**
   * 流式生成响应
   */
  async generateResponseStream(
    wrapperName: string,
    request: LLMRequest
  ): Promise<AsyncIterable<LLMResponse>> {
    return this.wrapperManager.generateResponseStream(wrapperName, request);
  }

  /**
   * 检查包装器是否可用
   */
  async isWrapperAvailable(wrapperName: string): Promise<boolean> {
    try {
      return this.wrapperManager.isAvailable(wrapperName);
    } catch {
      return false;
    }
  }

  /**
   * 获取包装器状态
   */
  async getWrapperStatus(wrapperName: string): Promise<Record<string, any>> {
    return this.wrapperManager.getStatus(wrapperName);
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
   * 获取最优包装器选择
   *
   * 业务逻辑：根据需求选择最优包装器
   */
  async getOptimalWrapper(requirements: Record<string, any>): Promise<string | null> {
    const allStatistics = await this.wrapperManager.getAllWrappersStatistics();

    // 业务逻辑：返回第一个可用的包装器
    // 可以根据 requirements 实现更复杂的选择策略
    for (const [wrapperName, stats] of Object.entries(allStatistics)) {
      // 简单的可用性检查：有健康的实例或模型
      if (stats['available'] || stats['healthyInstances'] > 0 || stats['totalModels'] > 0) {
        return wrapperName;
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
      return this.generateResponse(`${wrapperType}:${wrapperName}`, requestData);
    }

    // 自动选择最优包装器
    const optimalWrapper = await this.getOptimalWrapper(requestData);
    if (optimalWrapper) {
      return this.generateResponse(optimalWrapper, requestData);
    }

    throw new Error('没有可用的包装器来处理请求');
  }
}
