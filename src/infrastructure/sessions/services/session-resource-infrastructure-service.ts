import { injectable } from 'inversify';
import { ID } from '../../../domain/common/value-objects/id';
import { SessionResourceService } from '../../../domain/sessions/interfaces/session-resource-service.interface';
import { SessionDefinitionRepository } from '../../../domain/sessions/interfaces/session-definition-repository.interface';
import { SessionActivityRepository } from '../../../domain/sessions/interfaces/session-activity-repository.interface';
import { ResourceAllocation, ResourceRequirement, ResourceLimits, SessionQuota, QuotaUsage } from '../../../domain/common/types/resource-types';

/**
 * SessionResourceService基础设施实现
 */
@injectable()
export class SessionResourceInfrastructureService implements SessionResourceService {
  constructor(
    private readonly sessionDefinitionRepository: SessionDefinitionRepository,
    private readonly sessionActivityRepository: SessionActivityRepository
  ) {}

  /**
   * 分配资源
   * @param sessionId 会话ID
   * @param requirements 资源需求列表
   * @returns 资源分配
   */
  async allocateResources(sessionId: string, requirements: ResourceRequirement[]): Promise<ResourceAllocation> {
    const sessionDefinition = await this.sessionDefinitionRepository.findById(ID.fromString(sessionId));
    if (!sessionDefinition) {
      throw new Error(`会话定义不存在: ${sessionId}`);
    }

    // 检查资源限制
    const limits = await this.checkResourceLimits(sessionId);
    const canAllocate = await this.canAllocateResources(ID.fromString(sessionId), requirements, limits);
    
    if (!canAllocate) {
      throw new Error(`资源分配失败: 超出会话资源限制`);
    }

    const allocation: ResourceAllocation = {
      id: ID.generate().toString(),
      sessionId,
      resources: requirements,
      allocatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
    };

    // TODO: 实现资源分配逻辑
    console.log(`为会话 ${sessionId} 分配资源:`, requirements);

    return allocation;
  }

  /**
   * 释放资源
   * @param sessionId 会话ID
   * @param allocation 资源分配
   */
  async releaseResources(sessionId: string, allocation: ResourceAllocation): Promise<void> {
    // TODO: 实现资源释放逻辑
    console.log(`释放会话 ${sessionId} 的资源:`, allocation.resources);
  }

  /**
   * 检查资源限制
   * @param sessionId 会话ID
   * @returns 资源限制
   */
  async checkResourceLimits(sessionId: string): Promise<ResourceLimits> {
    const sessionDefinition = await this.sessionDefinitionRepository.findById(ID.fromString(sessionId));
    if (!sessionDefinition) {
      throw new Error(`会话定义不存在: ${sessionId}`);
    }

    const config = sessionDefinition.config;
    
    return {
      maxThreads: 10, // 默认线程数
      maxExecutionTime: config.getMaxDuration() * 60 * 1000, // 转换为毫秒
      maxMemory: 1024, // 默认内存限制
      maxStorage: 100 // 默认存储限制
    };
  }

  /**
   * 检查是否可以创建线程
   * @param sessionId 会话ID
   * @returns 是否可以创建
   */
  async canCreateThread(sessionId: string): Promise<boolean> {
    const sessionActivity = await this.sessionActivityRepository.findBySessionDefinitionId(ID.fromString(sessionId));
    if (!sessionActivity) {
      return true; // 没有活动记录，可以创建
    }

    const limits = await this.checkResourceLimits(sessionId);
    return sessionActivity.threadCount < limits.maxThreads;
  }

  /**
   * 检查是否可以发送消息
   * @param sessionId 会话ID
   * @returns 是否可以发送
   */
  async canSendMessage(sessionId: string): Promise<boolean> {
    const sessionActivity = await this.sessionActivityRepository.findBySessionDefinitionId(ID.fromString(sessionId));
    if (!sessionActivity) {
      return true; // 没有活动记录，可以发送
    }

    const limits = await this.checkResourceLimits(sessionId);
    return sessionActivity.messageCount < (limits.maxThreads * 100); // 假设每个线程最多100条消息
  }

  /**
   * 获取剩余配额
   * @param sessionId 会话ID
   * @returns 剩余配额
   */
  async getRemainingQuota(sessionId: string): Promise<SessionQuota> {
    const sessionActivity = await this.sessionActivityRepository.findBySessionDefinitionId(ID.fromString(sessionId));
    const limits = await this.checkResourceLimits(sessionId);

    if (!sessionActivity) {
      return {
        remainingThreads: limits.maxThreads,
        remainingExecutionTime: limits.maxExecutionTime,
        remainingMemory: limits.maxMemory,
        remainingStorage: limits.maxStorage
      };
    }

    return {
      remainingThreads: Math.max(0, limits.maxThreads - sessionActivity.threadCount),
      remainingExecutionTime: Math.max(0, limits.maxExecutionTime - sessionActivity.totalExecutionTime),
      remainingMemory: Math.max(0, limits.maxMemory - 0), // TODO: 实现内存使用跟踪
      remainingStorage: Math.max(0, limits.maxStorage - 0) // TODO: 实现存储使用跟踪
    };
  }

  /**
   * 更新配额使用情况
   * @param sessionId 会话ID
   * @param usage 使用情况
   */
  async updateQuotaUsage(sessionId: string, usage: QuotaUsage): Promise<void> {
    const sessionActivity = await this.sessionActivityRepository.findBySessionDefinitionId(ID.fromString(sessionId));
    if (!sessionActivity) {
      throw new Error(`会话活动记录不存在: ${sessionId}`);
    }

    // TODO: 实现配额使用更新逻辑
    console.log(`更新会话 ${sessionId} 的配额使用情况:`, usage);
  }

  /**
   * 检查是否可以分配资源
   */
  private async canAllocateResources(
    sessionId: ID,
    requirements: ResourceRequirement[],
    limits: ResourceLimits
  ): Promise<boolean> {
    const sessionActivity = await this.sessionActivityRepository.findBySessionDefinitionId(sessionId);
    
    // 检查线程限制
    if (requirements.some(req => req.type === 'cpu')) {
      const cpuRequirement = requirements.find(req => req.type === 'cpu');
      if (cpuRequirement && sessionActivity) {
        if (sessionActivity.threadCount + cpuRequirement.amount > limits.maxThreads) {
          return false;
        }
      }
    }

    // 检查内存限制
    if (requirements.some(req => req.type === 'memory')) {
      const memoryRequirement = requirements.find(req => req.type === 'memory');
      if (memoryRequirement && memoryRequirement.amount > limits.maxMemory) {
        return false;
      }
    }

    // 检查存储限制
    if (requirements.some(req => req.type === 'storage')) {
      const storageRequirement = requirements.find(req => req.type === 'storage');
      if (storageRequirement && storageRequirement.amount > limits.maxStorage) {
        return false;
      }
    }

    return true;
  }
}