import { 
  ILLMWrapperManager, 
  ILLMWrapper,
  ManagerStatistics
} from '../interfaces/llm-wrapper.interface';
import { LLMRequest } from '../entities/llm-request';
import { LLMResponse } from '../entities/llm-response';
import { ILLMWrapperFactory } from '../factories/llm-wrapper-factory';
import { 
  WrapperNotFoundException,
  WrapperExecutionException,
  NoAvailableModelException
} from '../exceptions';
import { ILogger } from '@shared/types/logger';

/**
 * LLM包装器管理器实现
 * 
 * 负责协调和管理所有LLM包装器，提供统一的请求处理接口
 */
export class LLMWrapperManager implements ILLMWrapperManager {
  private readonly logger: ILogger;
  private readonly requestRouter: RequestRouter;

  constructor(
    private readonly wrapperFactory: ILLMWrapperFactory,
    logger: ILogger
  ) {
    this.logger = logger.child({ manager: 'LLMWrapperManager' });
    this.requestRouter = new RequestRouter(logger);
  }

  /**
   * 获取最佳包装器
   */
  public async getBestWrapper(request: LLMRequest): Promise<ILLMWrapper | null> {
    this.logger.debug('获取最佳包装器', { 
      requestId: request.getId(),
      messageCount: request.getMessages().length 
    });

    try {
      // 获取所有可用的包装器
      const availableWrappers = await this.getAvailableWrappers();
      
      if (availableWrappers.length === 0) {
        this.logger.warn('没有可用的包装器');
        return null;
      }

      // 使用请求路由器选择最佳包装器
      const bestWrapper = await this.requestRouter.selectBestWrapper(
        request, 
        availableWrappers
      );

      this.logger.debug('最佳包装器选择完成', { 
        wrapperName: bestWrapper?.getName(),
        wrapperType: bestWrapper?.getType()
      });

      return bestWrapper;
    } catch (error) {
      this.logger.error('获取最佳包装器失败', error as Error);
      return null;
    }
  }

  /**
   * 根据名称获取包装器
   */
  public async getWrapperByName(name: string): Promise<ILLMWrapper | null> {
    return this.wrapperFactory.getWrapper(name);
  }

  /**
   * 根据类型获取包装器
   */
  public async getWrappersByType(type: 'pool' | 'task_group' | 'direct'): Promise<ILLMWrapper[]> {
    const allWrappers = await this.wrapperFactory.getAllWrappers();
    return Array.from(allWrappers.values())
      .filter(wrapper => wrapper.getType() === type);
  }

  /**
   * 获取可用的包装器
   */
  public async getAvailableWrappers(): Promise<ILLMWrapper[]> {
    const allWrappers = await this.wrapperFactory.getAllWrappers();
    const healthStatuses = await this.wrapperFactory.healthCheckAll();
    
    return Array.from(allWrappers.values())
      .filter(wrapper => {
        const health = healthStatuses.get(wrapper.getName());
        return health && (health.status === 'healthy' || health.status === 'degraded');
      });
  }

  /**
   * 执行请求
   */
  public async executeRequest(
    request: LLMRequest,
    wrapperName?: string
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      let wrapper: ILLMWrapper | null = null;

      if (wrapperName) {
        // 使用指定的包装器
        wrapper = await this.getWrapperByName(wrapperName);
        if (!wrapper) {
          throw new WrapperNotFoundException(wrapperName);
        }
      } else {
        // 选择最佳包装器
        wrapper = await this.getBestWrapper(request);
        if (!wrapper) {
          throw new NoAvailableModelException('system');
        }
      }

      this.logger.info('执行LLM请求', {
        requestId: request.getId(),
        wrapperName: wrapper.getName(),
        wrapperType: wrapper.getType()
      });

      // 执行请求
      const response = await wrapper.generateResponse(request);
      
      const duration = Date.now() - startTime;
      
      this.logger.info('LLM请求执行成功', {
        requestId: request.getId(),
        wrapperName: wrapper.getName(),
        duration,
        tokenCount: response.getTokenUsage().totalTokens
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('LLM请求执行失败', error as Error, {
        requestId: request.getId(),
        wrapperName,
        duration
      });

      throw new WrapperExecutionException(
        wrapperName || 'unknown',
        `请求执行失败: ${(error as Error).message}`
      );
    }
  }

  /**
   * 执行流式请求
   */
  public async executeStreamRequest(
    request: LLMRequest,
    wrapperName?: string
  ): Promise<AsyncIterable<LLMResponse>> {
    const startTime = Date.now();
    
    try {
      let wrapper: ILLMWrapper | null = null;

      if (wrapperName) {
        // 使用指定的包装器
        wrapper = await this.getWrapperByName(wrapperName);
        if (!wrapper) {
          throw new WrapperNotFoundException(wrapperName);
        }
      } else {
        // 选择最佳包装器
        wrapper = await this.getBestWrapper(request);
        if (!wrapper) {
          throw new NoAvailableModelException('system');
        }
      }

      this.logger.info('执行LLM流式请求', {
        requestId: request.getId(),
        wrapperName: wrapper.getName(),
        wrapperType: wrapper.getType()
      });

      // 执行流式请求
      const stream = await wrapper.generateResponseStream(request);
      
      const duration = Date.now() - startTime;
      
      this.logger.info('LLM流式请求开始', {
        requestId: request.getId(),
        wrapperName: wrapper.getName(),
        duration
      });

      return stream;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('LLM流式请求执行失败', error as Error, {
        requestId: request.getId(),
        wrapperName,
        duration
      });

      throw new WrapperExecutionException(
        wrapperName || 'unknown',
        `流式请求执行失败: ${(error as Error).message}`
      );
    }
  }

  /**
   * 获取管理器统计信息
   */
  public async getManagerStatistics(): Promise<ManagerStatistics> {
    return this.wrapperFactory.getManagerStatistics();
  }

  /**
   * 获取所有包装器的健康状态
   */
  public async getHealthStatuses(): Promise<Map<string, any>> {
    return this.wrapperFactory.healthCheckAll();
  }

  /**
   * 获取所有包装器的统计信息
   */
  public async getAllWrapperStatistics(): Promise<Map<string, any>> {
    return this.wrapperFactory.getAllStatistics();
  }

  /**
   * 重置所有包装器的统计信息
   */
  public async resetAllStatistics(): Promise<void> {
    await this.wrapperFactory.resetAllStatistics();
  }

  /**
   * 关闭管理器
   */
  public async shutdown(): Promise<void> {
    this.logger.info('关闭LLM包装器管理器');
    
    await this.wrapperFactory.closeAll();
    
    this.logger.info('LLM包装器管理器已关闭');
  }
}

/**
 * 请求路由器
 * 
 * 负责根据请求特征选择最佳的包装器
 */
class RequestRouter {
  constructor(private readonly logger: ILogger) {}

  /**
   * 选择最佳包装器
   */
  public async selectBestWrapper(
    request: LLMRequest,
    availableWrappers: ILLMWrapper[]
  ): Promise<ILLMWrapper | null> {
    if (availableWrappers.length === 0) {
      return null;
    }

    if (availableWrappers.length === 1) {
      return availableWrappers[0];
    }

    // 获取所有包装器的统计信息
    const wrapperStats = new Map<string, any>();
    for (const wrapper of availableWrappers) {
      try {
        const stats = await wrapper.getStatistics();
        wrapperStats.set(wrapper.getName(), stats);
      } catch (error) {
        this.logger.warn('获取包装器统计信息失败', error as Error, {
          wrapperName: wrapper.getName()
        });
      }
    }

    // 根据不同策略选择包装器
    return this.selectByStrategy(request, availableWrappers, wrapperStats);
  }

  private selectByStrategy(
    request: LLMRequest,
    wrappers: ILLMWrapper[],
    stats: Map<string, any>
  ): ILLMWrapper {
    // 策略1: 优先选择轮询池包装器
    const poolWrappers = wrappers.filter(w => w.getType() === 'pool');
    if (poolWrappers.length > 0) {
      return this.selectByPerformance(poolWrappers, stats);
    }

    // 策略2: 选择任务组包装器
    const taskGroupWrappers = wrappers.filter(w => w.getType() === 'task_group');
    if (taskGroupWrappers.length > 0) {
      return this.selectByPerformance(taskGroupWrappers, stats);
    }

    // 策略3: 选择直接包装器
    const directWrappers = wrappers.filter(w => w.getType() === 'direct');
    if (directWrappers.length > 0) {
      return this.selectByPerformance(directWrappers, stats);
    }

    // 默认返回第一个
    return wrappers[0];
  }

  private selectByPerformance(wrappers: ILLMWrapper[], stats: Map<string, any>): ILLMWrapper {
    // 根据性能指标选择最佳包装器
    let bestWrapper = wrappers[0];
    let bestScore = this.calculateScore(bestWrapper, stats);

    for (let i = 1; i < wrappers.length; i++) {
      const wrapper = wrappers[i];
      const score = this.calculateScore(wrapper, stats);
      
      if (score > bestScore) {
        bestWrapper = wrapper;
        bestScore = score;
      }
    }

    return bestWrapper;
  }

  private calculateScore(wrapper: ILLMWrapper, stats: Map<string, any>): number {
    const wrapperStats = stats.get(wrapper.getName());
    if (!wrapperStats) {
      return 0;
    }

    let score = 0;

    // 成功率权重 (40%)
    const successRate = wrapperStats.totalRequests > 0 
      ? wrapperStats.successfulRequests / wrapperStats.totalRequests 
      : 0;
    score += successRate * 40;

    // 响应时间权重 (30%) - 响应时间越短分数越高
    const avgResponseTime = wrapperStats.averageResponseTime || 0;
    const responseTimeScore = Math.max(0, 30 - (avgResponseTime / 100)); // 假设30秒为最差
    score += responseTimeScore;

    // 可用性权重 (20%)
    const availabilityScore = wrapperStats.healthy ? 20 : 0;
    score += availabilityScore;

    // 负载权重 (10%) - 负载越低分数越高
    const requestsPerMinute = wrapperStats.requestsPerMinute || 0;
    const loadScore = Math.max(0, 10 - (requestsPerMinute / 10)); // 假设10rpm为满负载
    score += loadScore;

    return score;
  }
}