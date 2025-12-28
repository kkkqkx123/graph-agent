import { injectable, inject } from 'inversify';
import { LLMWrapperFactory } from '../../../infrastructure/llm/wrappers/wrapper-factory';
import { PollingPoolWrapper, TaskGroupWrapper, DirectLLMWrapper } from '../../../domain/llm';

// 定义基础包装器类型
type BaseLLMWrapper = PollingPoolWrapper | TaskGroupWrapper | DirectLLMWrapper;

/**
 * 包装器服务
 *
 * 提供统一的LLM调用接口
 */
@injectable()
export class WrapperService {
  private wrappers: Map<string, BaseLLMWrapper> = new Map();

  constructor(
    @inject('LLMWrapperFactory') private wrapperFactory: LLMWrapperFactory
  ) {}

  /**
   * 获取包装器
   */
  async getWrapper(wrapperName: string): Promise<BaseLLMWrapper> {
    if (!this.wrappers.has(wrapperName)) {
      throw new Error(`包装器未找到: ${wrapperName}`);
    }
    
    return this.wrappers.get(wrapperName)!;
  }

  /**
   * 创建轮询池包装器
   */
  async createPollingPoolWrapper(poolName: string, config?: Record<string, any>): Promise<BaseLLMWrapper> {
    const wrapper = await this.wrapperFactory.createPollingPoolWrapper(poolName, config);
    this.wrappers.set(poolName, wrapper);
    return wrapper;
  }

  /**
   * 创建任务组包装器
   */
  async createTaskGroupWrapper(groupName: string, config?: Record<string, any>): Promise<BaseLLMWrapper> {
    const wrapper = await this.wrapperFactory.createTaskGroupWrapper(groupName, config);
    this.wrappers.set(groupName, wrapper);
    return wrapper;
  }

  /**
   * 创建直接LLM包装器
   */
  async createDirectLLMWrapper(clientName: string, config?: Record<string, any>): Promise<BaseLLMWrapper> {
    // TODO: 需要获取实际的LLM客户端
    const wrapper = await this.wrapperFactory.createDirectLLMWrapper(null as any, config);
    this.wrappers.set(clientName, wrapper);
    return wrapper;
  }

  /**
   * 生成响应
   */
  async generateResponse(wrapperName: string, request: any): Promise<any> {
    const wrapper = await this.getWrapper(wrapperName);
    return wrapper.generateResponse(request);
  }

  /**
   * 流式生成响应
   */
  async generateResponseStream(wrapperName: string, request: any): Promise<AsyncIterable<any>> {
    const wrapper = await this.getWrapper(wrapperName);
    return wrapper.generateResponseStream(request);
  }

  /**
   * 检查包装器是否可用
   */
  async isWrapperAvailable(wrapperName: string): Promise<boolean> {
    try {
      const wrapper = await this.getWrapper(wrapperName);
      return wrapper.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * 获取包装器状态
   */
  async getWrapperStatus(wrapperName: string): Promise<Record<string, any>> {
    const wrapper = await this.getWrapper(wrapperName);
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
    const status = await this.getWrapperStatus(wrapperName);
    
    return {
      name: wrapperName,
      totalRequests: status['stats']?.['totalRequests'] || 0,
      successfulRequests: status['stats']?.['successfulRequests'] || 0,
      failedRequests: status['stats']?.['failedRequests'] || 0,
      avgResponseTime: status['stats']?.['avgResponseTime'] || 0,
      successRate: status['stats']?.['totalRequests'] > 0 ?
        (status['stats']['successfulRequests'] / status['stats']['totalRequests']) : 0,
      available: await this.isWrapperAvailable(wrapperName)
    };
  }

  /**
   * 获取所有包装器统计信息
   */
  async getAllWrappersStatistics(): Promise<Record<string, any>> {
    const allStatus = await this.getAllWrappersStatus();
    const statistics: Record<string, any> = {};
    
    for (const [wrapperName, status] of Object.entries(allStatus)) {
      statistics[wrapperName] = {
        name: wrapperName,
        totalRequests: status['stats']?.['totalRequests'] || 0,
        successfulRequests: status['stats']?.['successfulRequests'] || 0,
        failedRequests: status['stats']?.['failedRequests'] || 0,
        avgResponseTime: status['stats']?.['avgResponseTime'] || 0,
        successRate: status['stats']?.['totalRequests'] > 0 ?
          (status['stats']['successfulRequests'] / status['stats']['totalRequests']) : 0,
        available: await this.isWrapperAvailable(wrapperName)
      };
    }
    
    return statistics;
  }

  /**
   * 关闭包装器
   */
  async closeWrapper(wrapperName: string): Promise<void> {
    const wrapper = await this.getWrapper(wrapperName);
    await wrapper.close();
    this.wrappers.delete(wrapperName);
  }

  /**
   * 关闭所有包装器
   */
  async closeAllWrappers(): Promise<void> {
    for (const wrapper of this.wrappers.values()) {
      await wrapper.close();
    }
    this.wrappers.clear();
    await this.wrapperFactory.closeAll();
  }

  /**
   * 重新加载包装器
   */
  async reloadWrapper(wrapperName: string): Promise<void> {
    await this.closeWrapper(wrapperName);
    
    // TODO: 重新创建包装器
    console.log(`重新加载包装器: ${wrapperName}`);
  }

  /**
   * 获取包装器健康报告
   */
  async getWrapperHealthReport(wrapperName: string): Promise<Record<string, any>> {
    const status = await this.getWrapperStatus(wrapperName);
    const statistics = await this.getWrapperStatistics(wrapperName);
    
    return {
      wrapperName,
      status: 'healthy', // 简化实现
      issues: [],
      recommendations: [],
      statistics,
      lastChecked: new Date()
    };
  }

  /**
   * 获取系统级包装器报告
   */
  async getSystemWrapperReport(): Promise<Record<string, any>> {
    const allStatistics = await this.getAllWrappersStatistics();
    const totalWrappers = Object.keys(allStatistics).length;
    const totalRequests = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats['totalRequests'], 0
    );
    const successfulRequests = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats['successfulRequests'], 0
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
   */
  async getOptimalWrapper(requirements: Record<string, any>): Promise<string | null> {
    const allWrappers = await this.wrapperFactory.getAllWrappers();
    
    // 简化实现：返回第一个可用的包装器
    for (const wrapper of allWrappers) {
      if (await wrapper.isAvailable()) {
        return wrapper.getName();
      }
    }
    
    return null;
  }

  /**
   * 路由请求到合适的包装器
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