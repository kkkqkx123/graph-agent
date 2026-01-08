/**
 * 会话监控服务
 *
 * 负责会话级别的监控，包括：
 * - 会话状态监控
 * - 会话性能指标查询
 * - 会话告警管理
 * - 会话健康状态查询
 * - 会话资源使用统计
 *
 * 属于应用层，提供业务相关的监控接口
 * 调用基础设施层的MonitoringService获取监控数据
 */

import { injectable, inject } from 'inversify';
import { Session, ISessionRepository } from '../../domain/sessions';
import { Thread, IThreadRepository } from '../../domain/threads';
import { ID, ILogger, Timestamp } from '../../domain/common';
import { BaseService } from '../common/base-service';
import { MonitoringService } from '../workflow/monitoring';
import { TYPES } from '../../di/service-keys';

/**
 * 会话告警DTO
 */
export interface SessionAlertDTO {
  id: string;
  threadId: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

/**
 * 会话监控指标
 */
export interface SessionMonitoringMetrics {
  /** 会话ID */
  sessionId: string;
  /** 会话状态 */
  status: string;
  /** 创建时间 */
  createdAt: string;
  /** 最后活动时间 */
  lastActivityAt: string;
  /** 线程总数 */
  totalThreads: number;
  /** 活跃线程数 */
  activeThreads: number;
  /** 已完成线程数 */
  completedThreads: number;
  /** 失败线程数 */
  failedThreads: number;
  /** 总执行耗时（毫秒） */
  totalDuration: number;
  /** 平均执行耗时（毫秒） */
  averageDuration: number;
  /** 资源使用统计 */
  resourceUsage: {
    /** 总内存使用（MB） */
    totalMemory: number;
    /** 平均内存使用（MB） */
    averageMemory: number;
    /** 总CPU使用（0-1） */
    totalCpu: number;
    /** 平均CPU使用（0-1） */
    averageCpu: number;
  };
  /** 告警统计 */
  alertStats: {
    /** 总告警数 */
    total: number;
    /** 活跃告警数 */
    active: number;
    /** 严重告警数 */
    critical: number;
    /** 高级告警数 */
    high: number;
  };
}

/**
 * 会话健康状态
 */
export interface SessionHealthStatus {
  /** 会话ID */
  sessionId: string;
  /** 健康状态 */
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  /** 最后检查时间 */
  lastCheck: string;
  /** 运行时间（毫秒） */
  uptime: number;
  /** 活跃线程数 */
  activeThreads: number;
  /** 失败率（0-1） */
  failureRate: number;
  /** 活跃告警数 */
  activeAlerts: number;
  /** 健康评分（0-100） */
  healthScore: number;
}

/**
 * 会话监控服务
 */
@injectable()
export class SessionMonitoring extends BaseService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: ISessionRepository,
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
    return '会话监控服务';
  }

  /**
   * 获取会话监控指标
   *
   * @param sessionId 会话ID
   * @returns 会话监控指标
   */
  async getSessionMetrics(sessionId: string): Promise<SessionMonitoringMetrics | null> {
    return this.executeGetOperation(
      '会话监控指标',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return null;
        }

        // 获取会话的所有线程
        const threads = await this.threadRepository.findActiveThreadsForSession(id);

        // 统计线程状态
        const totalThreads = threads.length;
        const activeThreads = threads.filter((t: Thread) => t.status.isActive()).length;
        const completedThreads = threads.filter((t: Thread) => t.status.isCompleted()).length;
        const failedThreads = threads.filter((t: Thread) => t.status.isFailed()).length;

        // 计算执行耗时
        let totalDuration = 0;
        let completedCount = 0;
        for (const thread of threads) {
          if (thread.execution.startedAt && thread.execution.completedAt) {
            const duration =
              thread.execution.completedAt.getMilliseconds() -
              thread.execution.startedAt.getMilliseconds();
            totalDuration += duration;
            completedCount++;
          }
        }
        const averageDuration = completedCount > 0 ? totalDuration / completedCount : 0;

        // 获取资源使用统计
        let totalMemory = 0;
        let totalCpu = 0;
        let resourceCount = 0;

        for (const thread of threads) {
          try {
            const resourceMetrics = await this.monitoringService.getResourceMetrics(
              thread.id.toString()
            );
            if (resourceMetrics.length > 0) {
              const latestMetrics = resourceMetrics[resourceMetrics.length - 1];
              if (latestMetrics) {
                totalMemory += latestMetrics.memoryUsage;
                totalCpu += latestMetrics.cpuUsage;
                resourceCount++;
              }
            }
          } catch (error) {
            this.logger.warn(
              '获取线程资源指标失败',
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        const averageMemory = resourceCount > 0 ? totalMemory / resourceCount : 0;
        const averageCpu = resourceCount > 0 ? totalCpu / resourceCount : 0;

        // 获取告警统计
        let totalAlerts = 0;
        let activeAlerts = 0;
        let criticalAlerts = 0;
        let highAlerts = 0;

        for (const thread of threads) {
          try {
            const alerts = await this.monitoringService.getAlerts(thread.id.toString());
            totalAlerts += alerts.length;
            activeAlerts += alerts.filter((a: { resolved: any; }) => !a.resolved).length;
            criticalAlerts += alerts.filter((a: { resolved: any; severity: string; }) => !a.resolved && a.severity === 'critical').length;
            highAlerts += alerts.filter((a: { resolved: any; severity: string; }) => !a.resolved && a.severity === 'high').length;
          } catch (error) {
            this.logger.warn(
              '获取线程告警失败',
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        return {
          sessionId: session.id.toString(),
          status: session.status.toString(),
          createdAt: session.createdAt.toISOString(),
          lastActivityAt: session.lastActivityAt.toISOString(),
          totalThreads,
          activeThreads,
          completedThreads,
          failedThreads,
          totalDuration,
          averageDuration,
          resourceUsage: {
            totalMemory,
            averageMemory,
            totalCpu,
            averageCpu,
          },
          alertStats: {
            total: totalAlerts,
            active: activeAlerts,
            critical: criticalAlerts,
            high: highAlerts,
          },
        };
      },
      { sessionId }
    );
  }

  /**
   * 获取会话健康状态
   *
   * @param sessionId 会话ID
   * @returns 会话健康状态
   */
  async getSessionHealthStatus(sessionId: string): Promise<SessionHealthStatus | null> {
    return this.executeGetOperation(
      '会话健康状态',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return null;
        }

        // 获取会话的所有线程
        const threads = await this.threadRepository.findActiveThreadsForSession(id);

        // 统计活跃线程数
        const activeThreads = threads.filter((t: Thread) => t.status.isActive()).length;

        // 计算失败率
        const failedThreads = threads.filter((t: Thread) => t.status.isFailed()).length;
        const failureRate = threads.length > 0 ? failedThreads / threads.length : 0;

        // 统计活跃告警数
        let activeAlerts = 0;
        for (const thread of threads) {
          try {
            const alerts = await this.monitoringService.getAlerts(thread.id.toString(), false);
            activeAlerts += alerts.length;
          } catch (error) {
            this.logger.warn(
              '获取线程告警失败',
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        // 计算健康评分
        let healthScore = 100;
        healthScore -= failureRate * 50; // 失败率影响50分
        healthScore -= Math.min(activeAlerts * 5, 30); // 活跃告警影响最多30分
        healthScore = Math.max(0, healthScore);

        // 确定健康状态
        let status: SessionHealthStatus['status'] = 'healthy';
        if (failureRate > 0.5 || activeAlerts > 10) {
          status = 'critical';
        } else if (failureRate > 0.2 || activeAlerts > 5) {
          status = 'warning';
        }

        // 计算运行时间
        const uptime = Timestamp.now().getMilliseconds() - session.createdAt.getMilliseconds();

        return {
          sessionId: session.id.toString(),
          status,
          lastCheck: Timestamp.now().toISOString(),
          uptime,
          activeThreads,
          failureRate,
          activeAlerts,
          healthScore,
        };
      },
      { sessionId }
    );
  }

  /**
   * 获取会话告警
   *
   * @param sessionId 会话ID
   * @param resolved 是否已解决
   * @returns 告警列表
   */
  async getSessionAlerts(sessionId: string, resolved?: boolean): Promise<SessionAlertDTO[]> {
    const result = await this.executeGetOperation(
      '会话告警',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return [];
        }

        // 获取会话的所有线程
        const threads = await this.threadRepository.findActiveThreadsForSession(id);

        const allAlerts: SessionAlertDTO[] = [];

        for (const thread of threads) {
          try {
            const alerts = await this.monitoringService.getAlerts(thread.id.toString(), resolved);
            allAlerts.push(
              ...alerts.map((alert) => ({
                id: alert.id,
                threadId: thread.id.toString(),
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                timestamp: alert.timestamp.toISOString(),
                resolved: alert.resolved,
                resolvedAt: alert.resolvedAt?.toISOString(),
              }))
            );
          } catch (error) {
            this.logger.warn(
              '获取线程告警失败',
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        // 按时间排序
        return allAlerts.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      },
      { sessionId, resolved }
    );
    return result || [];
  }

  /**
   * 获取会话线程列表
   *
   * @param sessionId 会话ID
   * @returns 线程列表
   */
  async getSessionThreads(sessionId: string): Promise<
    Array<{
      threadId: string;
      workflowId: string;
      status: string;
      progress: number;
      startedAt?: string;
      completedAt?: string;
      errorMessage?: string;
    }>
  > {
    const result = await this.executeGetOperation(
      '会话线程列表',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return [];
        }

        // 获取会话的所有线程
        const threads = await this.threadRepository.findActiveThreadsForSession(id);

        return threads.map((thread: Thread) => ({
          threadId: thread.id.toString(),
          workflowId: thread.workflowId.toString(),
          status: thread.status.toString(),
          progress: thread.execution.progress,
          startedAt: thread.execution.startedAt?.toISOString(),
          completedAt: thread.execution.completedAt?.toISOString(),
          errorMessage: thread.execution.errorMessage,
        }));
      },
      { sessionId }
    );
    return result || [];
  }

  /**
   * 获取会话资源使用趋势
   *
   * @param sessionId 会话ID
   * @param timeRange 时间范围
   * @returns 资源使用趋势
   */
  async getSessionResourceTrend(
    sessionId: string,
    timeRange?: { start: Timestamp; end: Timestamp }
  ): Promise<
    Array<{
      timestamp: string;
      memoryUsage: number;
      cpuUsage: number;
      activeThreads: number;
    }>
  > {
    const result = await this.executeGetOperation(
      '会话资源使用趋势',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return [];
        }

        // 获取会话的所有线程
        const threads = await this.threadRepository.findActiveThreadsForSession(id);

        // 收集所有线程的资源指标
        const allResourceMetrics: Map<
          string,
          { timestamp: string; memoryUsage: number; cpuUsage: number }
        > = new Map();

        for (const thread of threads) {
          try {
            const resourceMetrics = await this.monitoringService.getResourceMetrics(
              thread.id.toString(),
              timeRange
            );
            for (const metric of resourceMetrics) {
              const timestamp = metric.timestamp.toISOString();
              const existing = allResourceMetrics.get(timestamp);
              if (existing) {
                existing.memoryUsage += metric.memoryUsage;
                existing.cpuUsage += metric.cpuUsage;
              } else {
                allResourceMetrics.set(timestamp, {
                  timestamp,
                  memoryUsage: metric.memoryUsage,
                  cpuUsage: metric.cpuUsage,
                });
              }
            }
          } catch (error) {
            this.logger.warn(
              '获取线程资源指标失败',
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        // 转换为数组并按时间排序
        const trend = Array.from(allResourceMetrics.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // 添加活跃线程数
        const result = trend.map(point => ({
          ...point,
          activeThreads: threads.filter((t: Thread) => t.status.isActive()).length,
        }));
        return result;
      },
      { sessionId }
    );
    return result || [];
  }
}
