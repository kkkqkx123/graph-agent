import { EventEmitter } from 'events';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { IPoolService } from './pool.service';
import { ITaskGroupService } from './task-group.service';
import { ConfigManagementService } from './config-management.service';
import { LLMWrapperFactory } from '../../../domain/llm/factories/llm-wrapper-factory';
import { LLMWrapperManager } from '../../../domain/llm/managers/llm-wrapper-manager';
import { MetricsCollector } from '../../../domain/llm/services/metrics-collector';
import { HealthChecker } from '../../../domain/llm/services/health-checker';
import { AlertingService } from '../../../domain/llm/services/alerting-service';
import { ILLMClient } from '../../../domain/llm/interfaces/llm-client.interface';
import { ILogger } from '@shared/types/logger';

/**
 * LLM编排服务配置接口
 */
export interface LLMOrchestrationConfig {
  enableMetrics: boolean;
  enableHealthCheck: boolean;
  enableAlerting: boolean;
  metricsConfig: any;
  healthCheckConfig: any;
  alertingConfig: any;
}

/**
 * LLM编排服务
 * 
 * 整合所有LLM相关组件，提供统一的服务接口
 */
export class LLMOrchestrationService extends EventEmitter {
  private readonly config: LLMOrchestrationConfig;
  private readonly logger: ILogger;
  
  // 核心服务
  private readonly poolService: IPoolService;
  private readonly taskGroupService: ITaskGroupService;
  private readonly configManagementService: ConfigManagementService;
  private readonly wrapperFactory: LLMWrapperFactory;
  private readonly wrapperManager: LLMWrapperManager;
  
  // 高级服务
  private readonly metricsCollector: MetricsCollector;
  private readonly healthChecker: HealthChecker;
  private readonly alertingService: AlertingService;
  
  private isInitialized: boolean = false;
  private isShutdown: boolean = false;

  constructor(
    config: LLMOrchestrationConfig,
    poolService: IPoolService,
    taskGroupService: ITaskGroupService,
    wrapperFactory: LLMWrapperFactory,
    wrapperManager: LLMWrapperManager,
    metricsCollector: MetricsCollector,
    healthChecker: HealthChecker,
    alertingService: AlertingService,
    logger: ILogger
  ) {
    super();
    this.config = config;
    this.logger = logger.child({ service: 'LLMOrchestrationService' });
    
    this.poolService = poolService;
    this.taskGroupService = taskGroupService;
    this.configManagementService = configManagementService;
    this.wrapperFactory = wrapperFactory;
    this.wrapperManager = wrapperManager;
    this.metricsCollector = metricsCollector;
    this.healthChecker = healthChecker;
    this.alertingService = alertingService;
    
    this.setupEventHandlers();
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('初始化LLM编排服务');

    try {
      // 加载配置
      await this.configManagementService.loadFromConfigSystem();

      // 启动健康检查
      if (this.config.enableHealthCheck) {
        this.healthChecker.start();
      }

      // 执行初始健康检查
      if (this.config.enableHealthCheck) {
        await this.healthChecker.performHealthCheck();
      }

      this.isInitialized = true;
      this.logger.info('LLM编排服务初始化完成');
      
      this.emit('initialized');
    } catch (error) {
      this.logger.error('LLM编排服务初始化失败', error);
      throw error;
    }
  }

  /**
   * 执行LLM请求
   */
  public async executeRequest(
    request: LLMRequest,
    wrapperName?: string
  ): Promise<LLMResponse> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      // 记录请求开始
      this.metricsCollector.recordMetric('orchestration.requests.started', 1);
      
      // 执行请求
      const response = await this.wrapperManager.executeRequest(request, wrapperName);
      
      // 记录成功指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(
        wrapperName || 'auto-selected',
        duration,
        true,
        response.getTokenUsage().totalTokens,
        { requestId: request.getId() }
      );
      
      this.logger.info('LLM请求执行成功', {
        requestId: request.getId(),
        wrapperName,
        duration,
        tokenCount: response.getTokenUsage().totalTokens
      });
      
      return response;
    } catch (error) {
      // 记录失败指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(
        wrapperName || 'auto-selected',
        duration,
        false,
        undefined,
        { requestId: request.getId(), error: (error as Error).message }
      );
      
      this.logger.error('LLM请求执行失败', error as Error, {
        requestId: request.getId(),
        wrapperName,
        duration
      });
      
      throw error;
    }
  }

  /**
   * 执行流式LLM请求
   */
  public async executeStreamRequest(
    request: LLMRequest,
    wrapperName?: string
  ): Promise<AsyncIterable<LLMResponse>> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      // 记录请求开始
      this.metricsCollector.recordMetric('orchestration.stream_requests.started', 1);
      
      // 执行流式请求
      const stream = await this.wrapperManager.executeStreamRequest(request, wrapperName);
      
      // 包装流以记录指标
      return this.wrapStreamWithMetrics(stream, request, wrapperName, startTime);
    } catch (error) {
      // 记录失败指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(
        wrapperName || 'auto-selected',
        duration,
        false,
        undefined,
        { requestId: request.getId(), error: (error as Error).message, stream: true }
      );
      
      this.logger.error('LLM流式请求执行失败', error as Error, {
        requestId: request.getId(),
        wrapperName,
        duration
      });
      
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  public async getServiceStatus(): Promise<ServiceStatus> {
    const healthStatus = this.config.enableHealthCheck 
      ? await this.healthChecker.getGlobalHealth()
      : { status: 'unknown' as const, components: {}, summary: { total: 0, healthy: 0, unhealthy: 0, degraded: 0, lastChecked: new Date() } };

    const wrapperStats = await this.wrapperManager.getManagerStatistics();
    const activeAlerts = this.config.enableAlerting ? this.alertingService.getActiveAlerts() : [];

    return {
      initialized: this.isInitialized,
      health: healthStatus.status,
      components: {
        pools: await this.poolService.getAllPools(),
        taskGroups: await this.taskGroupService.getAllTaskGroups(),
        wrappers: wrapperStats.totalWrappers
      },
      metrics: {
        enabled: this.config.enableMetrics,
        totalRequests: wrapperStats.totalRequests,
        successfulRequests: wrapperStats.successfulRequests,
        failedRequests: wrapperStats.failedRequests,
        averageResponseTime: wrapperStats.averageResponseTime
      },
      alerts: {
        enabled: this.config.enableAlerting,
        activeCount: activeAlerts.length,
        criticalCount: activeAlerts.filter(a => a.level === 'critical').length
      },
      lastUpdated: new Date()
    };
  }

  /**
   * 重新加载配置
   */
  public async reloadConfiguration(): Promise<void> {
    this.ensureInitialized();
    
    this.logger.info('重新加载配置');
    
    try {
      await this.configManagementService.reloadConfigs();
      
      // 重新初始化包装器
      await this.reinitializeWrappers();
      
      this.logger.info('配置重新加载完成');
      this.emit('configurationReloaded');
    } catch (error) {
      this.logger.error('配置重新加载失败', error);
      throw error;
    }
  }

  /**
   * 获取指标数据
   */
  public getMetrics(name?: string, timeWindow?: number): any {
    if (!this.config.enableMetrics) {
      return null;
    }

    if (name) {
      return this.metricsCollector.getAggregatedMetrics(name, 'avg', timeWindow);
    }

    return {
      availableMetrics: this.metricsCollector.getMetricNames(),
      summary: {
        totalRequests: this.metricsCollector.getAggregatedMetrics('requests.total', 'sum', timeWindow),
        successfulRequests: this.metricsCollector.getAggregatedMetrics('requests.success', 'sum', timeWindow),
        failedRequests: this.metricsCollector.getAggregatedMetrics('requests.failure', 'sum', timeWindow),
        averageResponseTime: this.metricsCollector.getAggregatedMetrics('requests.duration', 'avg', timeWindow)
      }
    };
  }

  /**
   * 获取健康状态
   */
  public getHealthStatus(): any {
    if (!this.config.enableHealthCheck) {
      return { enabled: false };
    }

    return this.healthChecker.getGlobalHealth();
  }

  /**
   * 获取告警信息
   */
  public getAlerts(): any {
    if (!this.config.enableAlerting) {
      return { enabled: false };
    }

    return {
      enabled: true,
      active: this.alertingService.getActiveAlerts(),
      history: this.alertingService.getAlertHistory(50),
      rules: this.alertingService.getRules()
    };
  }

  /**
   * 关闭服务
   */
  public async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.logger.info('关闭LLM编排服务');
    this.isShutdown = true;

    try {
      // 停止健康检查
      if (this.config.enableHealthCheck) {
        this.healthChecker.stop();
      }

      // 关闭包装器管理器
      await this.wrapperManager.shutdown();

      // 关闭服务
      await this.poolService.shutdown();
      await this.taskGroupService.shutdown();
      await this.configManagementService.shutdown();

      // 关闭高级服务
      this.metricsCollector.shutdown();
      this.healthChecker.shutdown();
      this.alertingService.shutdown();

      this.removeAllListeners();
      
      this.logger.info('LLM编排服务已关闭');
      this.emit('shutdown');
    } catch (error) {
      this.logger.error('关闭LLM编排服务时发生错误', error);
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('LLM编排服务未初始化');
    }
    
    if (this.isShutdown) {
      throw new Error('LLM编排服务已关闭');
    }
  }

  private async reinitializeWrappers(): Promise<void> {
    // 获取当前所有包装器
    const currentWrappers = await this.wrapperFactory.getAllWrappers();
    const wrapperConfigs: any[] = [];

    // 保存当前配置
    for (const [name, wrapper] of currentWrappers.entries()) {
      const config = wrapper.getConfiguration();
      wrapperConfigs.push(config);
    }

    // 关闭所有包装器
    await this.wrapperFactory.closeAll();

    // 重新创建包装器
    await this.wrapperFactory.createWrappers(wrapperConfigs);

    // 重新注册到健康检查器
    for (const [name, wrapper] of await this.wrapperFactory.getAllWrappers().entries()) {
      this.healthChecker.registerWrapper(name, wrapper);
    }
  }

  private async* wrapStreamWithMetrics(
    stream: AsyncIterable<LLMResponse>,
    request: LLMRequest,
    wrapperName: string | undefined,
    startTime: number
  ): AsyncIterable<LLMResponse> {
    let tokenCount = 0;
    let chunkCount = 0;

    try {
      for await (const chunk of stream) {
        tokenCount += chunk.getTokenUsage().totalTokens;
        chunkCount++;
        
        yield chunk;
      }

      // 记录流式请求成功指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(
        wrapperName || 'auto-selected',
        duration,
        true,
        tokenCount,
        { 
          requestId: request.getId(), 
          stream: true, 
          chunkCount 
        }
      );
    } catch (error) {
      // 记录流式请求失败指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(
        wrapperName || 'auto-selected',
        duration,
        false,
        tokenCount,
        { 
          requestId: request.getId(), 
          stream: true, 
          chunkCount,
          error: (error as Error).message 
        }
      );
      
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // 健康检查事件处理
    if (this.config.enableHealthCheck) {
      this.healthChecker.on('healthCheck', (healthStatus) => {
        if (this.config.enableAlerting) {
          this.alertingService.processHealthCheck(healthStatus);
        }
        this.emit('healthCheck', healthStatus);
      });
    }

    // 告警事件处理
    if (this.config.enableAlerting) {
      this.alertingService.on('alert', (alert) => {
        this.emit('alert', alert);
      });

      this.alertingService.on('alertResolved', (alert) => {
        this.emit('alertResolved', alert);
      });
    }

    // 指标事件处理
    if (this.config.enableMetrics) {
      this.metricsCollector.on('metric', (metric) => {
        this.emit('metric', metric);
      });

      this.metricsCollector.on('aggregated', (aggregated) => {
        this.emit('aggregatedMetric', aggregated);
      });
    }
  }
}

/**
 * 服务状态接口
 */
export interface ServiceStatus {
  initialized: boolean;
  health: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  components: {
    pools: any[];
    taskGroups: any[];
    wrappers: number;
  };
  metrics: {
    enabled: boolean;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
  alerts: {
    enabled: boolean;
    activeCount: number;
    criticalCount: number;
  };
  lastUpdated: Date;
}