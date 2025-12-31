/**
 * 会话资源服务
 *
 * 负责会话资源分配、释放和配额管理
 */

import { injectable, inject } from 'inversify';
import { SessionRepository } from '../../../domain/sessions';
import { ID, ResourceAllocation, ResourceRequirement, ResourceLimits, SessionQuota, QuotaUsage, ILogger } from '../../../domain/common';
import { BaseApplicationService } from '../../common/base-application-service';
import { TYPES } from '../../../di/service-keys';
import {
  ResourceAllocationDTO,
  ResourceLimitsDTO,
  SessionQuotaDTO,
  QuotaUsageDTO,
  mapResourceAllocationToDTO
} from '../dtos';

/**
 * 会话资源服务
 */
@injectable()
export class SessionResourceService extends BaseApplicationService {
  constructor(
    @inject(TYPES.SessionRepository) private readonly sessionRepository: SessionRepository,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '会话资源服务';
  }

  /**
   * 确保会话存在
   * @param sessionId 会话ID
   * @returns 会话领域对象
   */
  private async ensureSessionExists(sessionId: string): Promise<any> {
    const id = this.parseId(sessionId, '会话ID');
    const session = await this.sessionRepository.findById(id);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }
    return session;
  }

  /**
   * 分配资源
   * @param sessionId 会话ID
   * @param requirements 资源需求列表
   * @returns 资源分配DTO
   */
  async allocateResources(sessionId: string, requirements: ResourceRequirement[]): Promise<ResourceAllocationDTO> {
    return this.executeBusinessOperation(
      '分配资源',
      async () => {
        // 检查会话是否存在
        const session = await this.ensureSessionExists(sessionId);

        // 检查资源限制
        const limits = await this.checkResourceLimits(sessionId);

        // 计算所需资源
        const memoryRequirement = requirements.find(req => req.type === 'memory');
        const totalMemory = memoryRequirement ? memoryRequirement.amount : 0;

        // 检查是否超出限制
        if (totalMemory > limits.maxMemory) {
          throw new Error(`内存需求 ${totalMemory} 超出限制 ${limits.maxMemory}`);
        }

        // 创建资源分配
        const allocation: ResourceAllocation = {
          id: ID.generate().toString(),
          sessionId: sessionId,
          resources: requirements,
          allocatedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000) // 1小时后过期
        };

        return mapResourceAllocationToDTO(allocation);
      },
      { sessionId, requirementCount: requirements.length }
    );
  }

  /**
   * 释放资源
   * @param sessionId 会话ID
   * @param allocation 资源分配DTO
   */
  async releaseResources(sessionId: string, allocation: ResourceAllocationDTO): Promise<void> {
    return this.executeBusinessOperation(
      '释放资源',
      async () => {
        // 检查会话是否存在
        await this.ensureSessionExists(sessionId);

        // 这里可以实现资源释放逻辑
        // 目前只是记录日志
        this.logger.info(`释放会话 ${sessionId} 的资源`, { allocationId: allocation.id });
      },
      { sessionId, allocationId: allocation.id }
    );
  }

  /**
   * 检查资源限制
   * @param sessionId 会话ID
   * @returns 资源限制DTO
   */
  async checkResourceLimits(sessionId: string): Promise<ResourceLimitsDTO> {
    return this.executeQueryOperation(
      '检查资源限制',
      async () => {
        // 检查会话是否存在
        const session = await this.ensureSessionExists(sessionId);

        // 根据会话配置返回资源限制
        const config = session.config;

        return {
          maxMemory: (config.value as any)['maxMemory'] || 512, // 默认512MB
          maxThreads: (config.value as any)['maxThreads'] || 5, // 默认5个线程
          maxExecutionTime: (config.value as any)['maxExecutionTime'] || 300000, // 默认5分钟
          maxStorage: (config.value as any)['maxStorage'] || 1024 // 默认1GB
        };
      },
      { sessionId }
    );
  }

  /**
   * 检查是否可以创建线程
   * @param sessionId 会话ID
   * @returns 是否可以创建线程
   */
  async canCreateThread(sessionId: string): Promise<boolean> {
    return this.executeQueryOperation(
      '检查是否可以创建线程',
      async () => {
        try {
          const limits = await this.checkResourceLimits(sessionId);
          const session = await this.ensureSessionExists(sessionId);

          // 检查当前线程数量
          const currentThreads = session.threadCount;

          return currentThreads < limits.maxThreads;
        } catch (error) {
          return false;
        }
      },
      { sessionId }
    );
  }

  /**
   * 检查是否可以发送消息
   * @param sessionId 会话ID
   * @returns 是否可以发送消息
   */
  async canSendMessage(sessionId: string): Promise<boolean> {
    return this.executeQueryOperation(
      '检查是否可以发送消息',
      async () => {
        try {
          const session = await this.ensureSessionExists(sessionId);

          // 检查消息数量限制
          const currentMessages = session.messageCount;
          const maxMessages = session.config.getMaxMessages();

          return currentMessages < maxMessages;
        } catch (error) {
          return false;
        }
      },
      { sessionId }
    );
  }

  /**
   * 获取剩余配额
   * @param sessionId 会话ID
   * @returns 会话配额DTO
   */
  async getRemainingQuota(sessionId: string): Promise<SessionQuotaDTO> {
    return this.executeQueryOperation(
      '获取剩余配额',
      async () => {
        const limits = await this.checkResourceLimits(sessionId);
        const session = await this.ensureSessionExists(sessionId);

        return {
          remainingThreads: Math.max(0, limits.maxThreads - session.threadCount),
          remainingExecutionTime: limits.maxExecutionTime,
          remainingMemory: limits.maxMemory,
          remainingStorage: limits.maxStorage
        };
      },
      { sessionId }
    );
  }

  /**
   * 更新配额使用情况
   * @param sessionId 会话ID
   * @param usage 配额使用DTO
   */
  async updateQuotaUsage(sessionId: string, usage: QuotaUsageDTO): Promise<void> {
    return this.executeBusinessOperation(
      '更新配额使用情况',
      async () => {
        const session = await this.ensureSessionExists(sessionId);

        // 更新会话的活动信息
        if (usage.threadsUsed > 0) {
          for (let i = 0; i < usage.threadsUsed; i++) {
            session.incrementThreadCount();
          }
        }

        // 更新最后活动时间
        session.updateLastActivity();

        // 保存会话
        await this.sessionRepository.save(session);
      },
      { sessionId, usage }
    );
  }
}