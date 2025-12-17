import { EventEmitter } from 'events';
import { ILLMWrapper } from '../interfaces/llm-wrapper.interface';
import { IPoolService } from '../../application/llm/services/pool.service';
import { ITaskGroupService } from '../../application/llm/services/task-group.service';
import { HealthStatus } from '../interfaces/llm-wrapper.interface';
import { ILogger } from '@shared/types/logger';

/**
 * 健康检查配置接口
 */
export interface HealthCheckerConfig {
  enabled: boolean;
  interval: number; // 检查间隔（毫秒）
  timeout: number; // 检查超时时间（毫秒）
  retries: number; // 重试次数
  retryDelay: number; // 重试延迟（毫秒）
  unhealthyThreshold: number; // 不健康阈值（连续失败次数）
  healthyThreshold: number; // 健康阈值（连续成功次数）
}

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  component: string;
  type: 'wrapper' | 'pool' | 'task_group';
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  lastChecked: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  details?: Record<string, any>;
}

/**
 * 全局健康状态接口
 */
export interface GlobalHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  components: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    lastChecked: Date;
  };
}

/**
 * 健康检查器
 * 
 * 负责定期检查所有组件的健康状态
 */
export class HealthChecker extends EventEmitter {
  private readonly config: HealthCheckerConfig;
  private readonly logger: ILogger;
  private readonly wrappers: Map<string, ILLMWrapper> = new Map();
  private readonly poolService: IPoolService;
  private readonly taskGroupService: ITaskGroupService;
  
  private healthStatus: Map<string, HealthCheckResult> = new Map();
  private checkTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    config: HealthCheckerConfig,
    poolService: IPoolService,
    taskGroupService: ITaskGroupService,
    logger: ILogger
  ) {
    super();
    this.config = config;
    this.poolService = poolService;
    this.taskGroupService = taskGroupService;
    this.logger = logger.child({ service: 'HealthChecker' });
  }

  /**
   * 启动健康检查
   */
  public start(): void {
    if (this.config.enabled && !this.isRunning) {
      this.logger.info('启动健康检查器', { interval: this.config.interval });
      
      this.isRunning = true;
      this.checkTimer = setInterval(() => {
        this.performHealthCheck().catch(error => {
          this.logger.error('健康检查执行失败', error);
        });
      }, this.config.interval);

      // 立即执行一次检查
      this.performHealthCheck().catch(error => {
        this.logger.error('初始健康检查失败', error);
      });
    }
  }

  /**
   * 停止健康检查
   */
  public stop(): void {
    if (this.isRunning) {
      this.logger.info('停止健康检查器');
      
      this.isRunning = false;
      if (this.checkTimer) {
        clearInterval(this.checkTimer);
        this.checkTimer = undefined;
      }
    }
  }

  /**
   * 注册包装器
   */
  public registerWrapper(name: string, wrapper: ILLMWrapper): void {
    this.wrappers.set(name, wrapper);
    this.logger.debug('注册包装器', { name });
  }

  /**
   * 注销包装器
   */
  public unregisterWrapper(name: string): void {
    this.wrappers.delete(name);
    this.healthStatus.delete(name);
    this.logger.debug('注销包装器', { name });
  }

  /**
   * 手动执行健康检查
   */
  public async performHealthCheck(): Promise<GlobalHealthStatus> {
    this.logger.debug('执行健康检查');

    const results: HealthCheckResult[] = [];
    const startTime = Date.now();

    try {
      // 检查所有包装器
      for (const [name, wrapper] of this.wrappers.entries()) {
        const result = await this.checkWrapper(name, wrapper);
        results.push(result);
      }

      // 检查所有轮询池
      const poolHealthStatuses = await this.poolService.globalHealthCheck();
      for (const [poolName, status] of Object.entries(poolHealthStatuses)) {
        const result = this.createPoolHealthResult(poolName, status);
        results.push(result);
      }

      // 检查所有任务组
      const taskGroupHealthStatuses = await this.taskGroupService.globalHealthCheck();
      for (const [groupName, status] of Object.entries(taskGroupHealthStatuses)) {
        const result = this.createTaskGroupHealthResult(groupName, status);
        results.push(result);
      }

      // 更新健康状态
      for (const result of results) {
        this.healthStatus.set(result.component, result);
      }

      // 计算全局健康状态
      const globalStatus = this.calculateGlobalHealth(results);
      
      const duration = Date.now() - startTime;
      this.logger.debug('健康检查完成', {
        duration,
        total: results.length,
        healthy: globalStatus.summary.healthy,
        unhealthy: globalStatus.summary.unhealthy,
        degraded: globalStatus.summary.degraded
      });

      // 发出健康检查事件
      this.emit('healthCheck', globalStatus);

      return globalStatus;
    } catch (error) {
      this.logger.error('健康检查执行失败', error);
      
      // 返回不健康状态
      return {
        status: 'unhealthy',
        components: {},
        summary: {
          total: 0,
          healthy: 0,
          unhealthy: 0,
          degraded: 0,
          lastChecked: new Date()
        }
      };
    }
  }

  /**
   * 获取组件健康状态
   */
  public getComponentHealth(component: string): HealthCheckResult | null {
    return this.healthStatus.get(component) || null;
  }

  /**
   * 获取所有组件健康状态
   */
  public getAllComponentHealth(): Record<string, HealthCheckResult> {
    const result: Record<string, HealthCheckResult> = {};
    for (const [component, status] of this.healthStatus.entries()) {
      result[component] = { ...status };
    }
    return result;
  }

  /**
   * 获取全局健康状态
   */
  public getGlobalHealth(): GlobalHealthStatus {
    const results = Array.from(this.healthStatus.values());
    return this.calculateGlobalHealth(results);
  }

  /**
   * 重置组件健康状态
   */
  public resetComponentHealth(component: string): void {
    this.healthStatus.delete(component);
    this.logger.debug('重置组件健康状态', { component });
  }

  /**
   * 重置所有健康状态
   */
  public resetAllHealth(): void {
    this.healthStatus.clear();
    this.logger.info('重置所有健康状态');
  }

  /**
   * 关闭健康检查器
   */
  public shutdown(): void {
    this.logger.info('关闭健康检查器');
    
    this.stop();
    this.removeAllListeners();
    this.healthStatus.clear();
    this.wrappers.clear();
    
    this.logger.info('健康检查器已关闭');
  }

  private async checkWrapper(name: string, wrapper: ILLMWrapper): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const previousStatus = this.healthStatus.get(name);
    
    try {
      // 执行健康检查，带超时
      const healthPromise = wrapper.healthCheck();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('健康检查超时')), this.config.timeout);
      });

      const status = await Promise.race([healthPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      // 更新连续成功/失败计数
      let consecutiveSuccesses = (previousStatus?.consecutiveSuccesses || 0) + 1;
      let consecutiveFailures = 0;

      // 确定最终状态
      let finalStatus: 'healthy' | 'unhealthy' | 'degraded' = status.status;
      if (status.status === 'healthy' && consecutiveSuccesses < this.config.healthyThreshold) {
        finalStatus = 'degraded';
      }

      const result: HealthCheckResult = {
        component: name,
        type: 'wrapper',
        status: finalStatus,
        message: status.message,
        responseTime,
        lastChecked: new Date(),
        consecutiveFailures,
        consecutiveSuccesses,
        details: status.details
      };

      this.logger.debug('包装器健康检查完成', {
        name,
        status: finalStatus,
        responseTime,
        consecutiveSuccesses
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let consecutiveFailures = (previousStatus?.consecutiveFailures || 0) + 1;
      let consecutiveSuccesses = 0;

      // 确定最终状态
      let finalStatus: 'healthy' | 'unhealthy' | 'degraded' = 'unhealthy';
      if (consecutiveFailures < this.config.unhealthyThreshold) {
        finalStatus = 'degraded';
      }

      const result: HealthCheckResult = {
        component: name,
        type: 'wrapper',
        status: finalStatus,
        message: (error as Error).message,
        responseTime,
        lastChecked: new Date(),
        consecutiveFailures,
        consecutiveSuccesses
      };

      this.logger.warn('包装器健康检查失败', {
        name,
        status: finalStatus,
        error: (error as Error).message,
        consecutiveFailures
      });

      return result;
    }
  }

  private createPoolHealthResult(poolName: string, status: any): HealthCheckResult {
    const previousStatus = this.healthStatus.get(poolName);
    
    let consecutiveFailures = 0;
    let consecutiveSuccesses = 0;

    if (status.healthy) {
      consecutiveSuccesses = (previousStatus?.consecutiveSuccesses || 0) + 1;
    } else {
      consecutiveFailures = (previousStatus?.consecutiveFailures || 0) + 1;
    }

    let finalStatus: 'healthy' | 'unhealthy' | 'degraded' = status.healthy ? 'healthy' : 'unhealthy';
    if (!status.healthy && consecutiveFailures < this.config.unhealthyThreshold) {
      finalStatus = 'degraded';
    } else if (status.healthy && consecutiveSuccesses < this.config.healthyThreshold) {
      finalStatus = 'degraded';
    }

    return {
      component: poolName,
      type: 'pool',
      status: finalStatus,
      message: status.errors?.join(', '),
      lastChecked: new Date(),
      consecutiveFailures,
      consecutiveSuccesses,
      details: {
        healthyInstances: status.healthyInstances,
        totalInstances: status.totalInstances,
        healthRatio: status.healthRatio
      }
    };
  }

  private createTaskGroupHealthResult(groupName: string, status: any): HealthCheckResult {
    const previousStatus = this.healthStatus.get(groupName);
    
    let consecutiveFailures = 0;
    let consecutiveSuccesses = 0;

    if (status.healthy) {
      consecutiveSuccesses = (previousStatus?.consecutiveSuccesses || 0) + 1;
    } else {
      consecutiveFailures = (previousStatus?.consecutiveFailures || 0) + 1;
    }

    let finalStatus: 'healthy' | 'unhealthy' | 'degraded' = status.healthy ? 'healthy' : 'unhealthy';
    if (!status.healthy && consecutiveFailures < this.config.unhealthyThreshold) {
      finalStatus = 'degraded';
    } else if (status.healthy && consecutiveSuccesses < this.config.healthyThreshold) {
      finalStatus = 'degraded';
    }

    return {
      component: groupName,
      type: 'task_group',
      status: finalStatus,
      message: status.errors?.join(', '),
      lastChecked: new Date(),
      consecutiveFailures,
      consecutiveSuccesses,
      details: {
        activeEchelons: status.activeEchelons,
        totalEchelons: status.totalEchelons,
        circuitBreakerState: status.circuitBreakerState
      }
    };
  }

  private calculateGlobalHealth(results: HealthCheckResult[]): GlobalHealthStatus {
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      lastChecked: new Date()
    };

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (summary.unhealthy > 0) {
      status = 'unhealthy';
    } else if (summary.degraded > 0 || summary.healthy === 0) {
      status = 'degraded';
    }

    const components: Record<string, HealthCheckResult> = {};
    for (const result of results) {
      components[result.component] = result;
    }

    return {
      status,
      components,
      summary
    };
  }
}