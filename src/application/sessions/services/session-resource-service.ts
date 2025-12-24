import { injectable } from 'inversify';
import { SessionResourceService } from '../interfaces/session-resource-service.interface';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { ID } from '../../../domain/common/value-objects/id';
import { ResourceAllocation, ResourceRequirement, ResourceLimits, SessionQuota, QuotaUsage } from '../../../domain/common/types/resource-types';

/**
 * 会话资源服务实现
 */
@injectable()
export class SessionResourceServiceImpl implements SessionResourceService {
  constructor(
    private readonly sessionRepository: SessionRepository
  ) {}

  /**
   * 分配资源
   */
  async allocateResources(sessionId: string, requirements: ResourceRequirement[]): Promise<ResourceAllocation> {
    // 检查会话是否存在
    const session = await this.sessionRepository.findById(sessionId as any);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    // 检查资源限制
    const limits = await this.checkResourceLimits(sessionId);
    
    // 计算所需资源
    const memoryRequirement = requirements.find(req => req.type === 'memory');
    const totalMemory = memoryRequirement ? memoryRequirement.amount : 0;
    
    // 检查是否超出限制
    if (totalMemory > limits.maxMemory) {
      throw new Error(`内存需求 ${totalMemory} 超出限制 ${limits.maxMemory}`);
    }

    // 返回资源分配
    return {
      id: ID.generate().toString(),
      sessionId,
      resources: requirements,
      allocatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1小时后过期
    };
  }

  /**
   * 释放资源
   */
  async releaseResources(sessionId: string, allocation: ResourceAllocation): Promise<void> {
    // 检查会话是否存在
    const session = await this.sessionRepository.findById(sessionId as any);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    // 这里可以实现资源释放逻辑
    // 目前只是记录日志
    console.log(`释放会话 ${sessionId} 的资源:`, allocation);
  }

  /**
   * 检查资源限制
   */
  async checkResourceLimits(sessionId: string): Promise<ResourceLimits> {
    // 检查会话是否存在
    const session = await this.sessionRepository.findById(sessionId as any);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    // 根据会话配置返回资源限制
    const config = session.config;
    
    return {
      maxMemory: (config.value as any)['maxMemory'] || 512, // 默认512MB
      maxThreads: (config.value as any)['maxThreads'] || 5, // 默认5个线程
      maxExecutionTime: (config.value as any)['maxExecutionTime'] || 300000, // 默认5分钟
      maxStorage: (config.value as any)['maxStorage'] || 1024 // 默认1GB
    };
  }

  /**
   * 检查是否可以创建线程
   */
  async canCreateThread(sessionId: string): Promise<boolean> {
    try {
      const limits = await this.checkResourceLimits(sessionId);
      const session = await this.sessionRepository.findById(sessionId as any);
      
      if (!session) {
        return false;
      }

      // 检查当前线程数量
      const currentThreads = session.threadCount;
      
      return currentThreads < limits.maxThreads;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查是否可以发送消息
   */
  async canSendMessage(sessionId: string): Promise<boolean> {
    try {
      const session = await this.sessionRepository.findById(sessionId as any);
      
      if (!session) {
        return false;
      }

      // 检查消息数量限制
      const currentMessages = session.messageCount;
      const maxMessages = session.config.getMaxMessages();
      
      return currentMessages < maxMessages;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取剩余配额
   */
  async getRemainingQuota(sessionId: string): Promise<SessionQuota> {
    const limits = await this.checkResourceLimits(sessionId);
    const session = await this.sessionRepository.findById(sessionId as any);
    
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    return {
      remainingThreads: Math.max(0, limits.maxThreads - session.threadCount),
      remainingExecutionTime: limits.maxExecutionTime,
      remainingMemory: limits.maxMemory,
      remainingStorage: limits.maxStorage
    };
  }

  /**
   * 更新配额使用情况
   */
  async updateQuotaUsage(sessionId: string, usage: QuotaUsage): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId as any);
    
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

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
  }
}