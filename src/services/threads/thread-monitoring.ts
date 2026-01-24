/**
 * 线程监控服务
 *
 * 负责线程级别的监控，包括：
 * - 线程执行状态监控
 * - 线程性能指标查询
 * - 线程告警管理
 * - 线程健康状态查询
 */

import { injectable, inject } from 'inversify';
import { IThreadRepository } from '../../domain/threads';
import { ILogger, Timestamp } from '../../domain/common';
import { BaseService } from '../common/base-service';
import { MonitoringService } from '../workflow/monitoring';
import { TYPES } from '../../di/service-keys';
import { EntityNotFoundError } from '../../domain/common/exceptions';

/**
 * 线程监控指标
 */
export interface ThreadMonitoringMetrics {
  /** 线程ID */
  threadId: string;
  /** 工作流ID */
  workflowId: string;
  /** 会话ID */
  sessionId: string;
  /** 执行状态 */
  status: string;
  /** 执行进度 */
  progress: number;
  /** 开始时间 */
  startedAt?: string;
  /** 完成时间 */
  completedAt?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
  /** 错误信息 */
  errorMessage?: string;
  /** 当前步骤 */
  currentStep?: string;
  /** 函数执行指标 */
  functionMetrics?: Array<{
    functionId: string;
    functionName: string;
    executionCount: number;
    successCount: number;
    errorCount: number;
    averageExecutionTime: number;
    errorRate: number;
  }>;
  /** 告警列表 */
  alerts?: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

/**
 * 线程健康状态
 */
export interface ThreadHealthStatus {
  /** 线程ID */
  threadId: string;
  /** 健康状态 */
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  /** 最后检查时间 */
  lastCheck: string;
  /** 运行时间（毫秒） */
  uptime: number;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 错误率（0-1） */
  errorRate: number;
  /** 活跃告警数 */
  activeAlerts: number;
}

/**
 * 线程监控服务
 */
@injectable()
export class ThreadMonitoring extends BaseService {
  constructor(
    @inject(TYPES.ThreadRepository) private readonly threadRepository: IThreadRepository,
    @inject(TYPES.MonitoringService) private readonly monitoringService: MonitoringService,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '线程监控服务';
  }

  /**
   * 获取线程监控指标
   *
   * @param threadId 线程ID
   * @returns 线程监控指标
   */
  async getThreadMetrics(threadId: string): Promise<ThreadMonitoringMetrics | null> {
    return this.executeGetOperation(
      '线程监控指标',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findById(id);

        if (!thread) {
          return null;
        }

        // 获取线程基本信息
        const metrics: ThreadMonitoringMetrics = {
          threadId: thread.id.toString(),
          workflowId: thread.workflowId.toString(),
          sessionId: thread.sessionId.toString(),
          status: thread.status,
          progress: thread.execution['progress'] as number,
          startedAt: thread.execution['startedAt'] as string | undefined,
          completedAt: thread.execution['completedAt'] as string | undefined,
          errorMessage: thread.execution['errorMessage'] as string | undefined,
          currentStep: thread.execution['currentStep'] as string | undefined,
        };

        // 计算执行耗时
        const startedAt = thread.execution['startedAt'] as string | undefined;
        const completedAt = thread.execution['completedAt'] as string | undefined;
        if (startedAt && completedAt) {
          metrics.duration =
            new Date(completedAt).getTime() -
            new Date(startedAt).getTime();
        } else if (startedAt) {
          metrics.duration =
            Timestamp.now().getMilliseconds() - new Date(startedAt).getTime();
        }

        // 获取函数执行指标（从监控服务）
        try {
          const executionMetrics = await this.monitoringService.getExecutionMetrics(
            thread.id.toString()
          );
          if (executionMetrics) {
            metrics.functionMetrics = [
              {
                functionId: executionMetrics.functionId,
                functionName: executionMetrics.functionName,
                executionCount: executionMetrics.executionCount,
                successCount: executionMetrics.successCount,
                errorCount: executionMetrics.errorCount,
                averageExecutionTime: executionMetrics.averageExecutionTime,
                errorRate: executionMetrics.errorRate,
              },
            ];
          }
        } catch (error) {
          this.logger.warn(
            '获取函数执行指标失败',
            error instanceof Error ? error : new Error(String(error))
          );
        }

        // 获取告警（从监控服务）
        try {
          const alerts = await this.monitoringService.getAlerts(thread.id.toString(), false);
          metrics.alerts = alerts.map(alert => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            timestamp: alert.timestamp.toISOString(),
            resolved: alert.resolved,
          }));
        } catch (error) {
          this.logger.warn(
            '获取告警失败',
            error instanceof Error ? error : new Error(String(error))
          );
        }

        return metrics;
      },
      { threadId }
    );
  }

  /**
   * 获取线程健康状态
   *
   * @param threadId 线程ID
   * @returns 线程健康状态
   */
  async getThreadHealthStatus(threadId: string): Promise<ThreadHealthStatus | null> {
    return this.executeGetOperation(
      '线程健康状态',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findById(id);

        if (!thread) {
          return null;
        }

        // 从监控服务获取健康状态
        try {
          const healthStatus = await this.monitoringService.getHealthStatus(thread.id.toString());
          if (healthStatus) {
            return {
              threadId: thread.id.toString(),
              status: healthStatus.status,
              lastCheck: healthStatus.lastCheck.toISOString(),
              uptime: healthStatus.uptime,
              responseTime: healthStatus.responseTime,
              errorRate: healthStatus.errorRate,
              activeAlerts: healthStatus.alerts.filter(a => !a.resolved).length,
            };
          }
        } catch (error) {
          this.logger.warn(
            '获取健康状态失败',
            error instanceof Error ? error : new Error(String(error))
          );
        }

        // 如果无法从监控服务获取，返回基于线程状态的健康状态
        let status: ThreadHealthStatus['status'] = 'healthy';
        if (thread.isFailed()) {
          status = 'critical';
        } else if (thread.isRunning() && thread.execution['errorMessage']) {
          status = 'warning';
        }

        const startedAt = thread.execution['startedAt'] as string | undefined;
        return {
          threadId: thread.id.toString(),
          status,
          lastCheck: Timestamp.now().toISOString(),
          uptime: startedAt
            ? Timestamp.now().getMilliseconds() - new Date(startedAt).getTime()
            : 0,
          responseTime: 0,
          errorRate: thread.isFailed() ? 1 : 0,
          activeAlerts: 0,
        };
      },
      { threadId }
    );
  }

  /**
   * 获取线程告警
   *
   * @param threadId 线程ID
   * @param resolved 是否已解决
   * @returns 告警列表
   */
  async getThreadAlerts(
    threadId: string,
    resolved?: boolean
  ): Promise<
    Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      timestamp: string;
      resolved: boolean;
      resolvedAt?: string;
    }>
  > {
    const result = await this.executeGetOperation(
      '线程告警',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findById(id);

        if (!thread) {
          return [];
        }

        try {
          const alerts = await this.monitoringService.getAlerts(thread.id.toString(), resolved);
          const mappedAlerts = alerts.map(alert => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            timestamp: alert.timestamp.toISOString(),
            resolved: alert.resolved,
            resolvedAt: alert.resolvedAt?.toISOString(),
          }));
          return mappedAlerts;
        } catch (error) {
          this.logger.warn(
            '获取告警失败',
            error instanceof Error ? error : new Error(String(error))
          );
          return [];
        }
      },
      { threadId, resolved }
    );
    return result || [];
  }

  /**
   * 解决线程告警
   *
   * @param threadId 线程ID
   * @param alertId 告警ID
   * @returns 是否成功
   */
  async resolveThreadAlert(threadId: string, alertId: string): Promise<boolean> {
    return this.executeBusinessOperation(
      '解决线程告警',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findById(id);

        if (!thread) {
          throw new EntityNotFoundError('Thread', threadId);
        }

        try {
          return await this.monitoringService.resolveAlert(alertId, thread.id.toString());
        } catch (error) {
          this.logger.error(
            '解决告警失败',
            error instanceof Error ? error : new Error(String(error))
          );
          return false;
        }
      },
      { threadId, alertId }
    );
  }

  /**
   * 获取线程执行历史
   *
   * @param threadId 线程ID
   * @param timeRange 时间范围
   * @returns 执行历史
   */
  async getThreadExecutionHistory(
    threadId: string,
    timeRange?: { start: Timestamp; end: Timestamp }
  ): Promise<{
    resourceMetrics: Array<{
      timestamp: string;
      memoryUsage: number;
      cpuUsage: number;
      networkUsage: number;
      diskUsage: number;
    }>;
    performanceMetrics: Array<{
      timestamp: string;
      throughput: number;
      latency: {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
      };
      concurrency: number;
    }>;
  }> {
    const result = await this.executeGetOperation(
      '线程执行历史',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const thread = await this.threadRepository.findById(id);

        if (!thread) {
          return {
            resourceMetrics: [],
            performanceMetrics: [],
          };
        }

        try {
          const resourceMetrics = await this.monitoringService.getResourceMetrics(
            thread.id.toString(),
            timeRange
          );
          const performanceMetrics = await this.monitoringService.getPerformanceMetrics(
            thread.id.toString(),
            timeRange
          );

          const result = {
            resourceMetrics: resourceMetrics.map(m => ({
              timestamp: m.timestamp.toISOString(),
              memoryUsage: m.memoryUsage,
              cpuUsage: m.cpuUsage,
              networkUsage: m.networkUsage,
              diskUsage: m.diskUsage,
            })),
            performanceMetrics: performanceMetrics.map(m => ({
              timestamp: m.timestamp.toISOString(),
              throughput: m.throughput,
              latency: m.latency,
              concurrency: m.concurrency,
            })),
          };
          return result;
        } catch (error) {
          this.logger.warn(
            '获取执行历史失败',
            error instanceof Error ? error : new Error(String(error))
          );
          return {
            resourceMetrics: [],
            performanceMetrics: [],
          };
        }
      },
      { threadId }
    );
    return (
      result || {
        resourceMetrics: [],
        performanceMetrics: [],
      }
    );
  }
}
