/**
 * SessionResourceService接口
 * 
 * 职责：管理会话的资源分配和限制
 */

import { ResourceAllocation, ResourceRequirement, ResourceLimits, SessionQuota, QuotaUsage } from '../../common/types/resource-types';

/**
 * SessionResourceService接口
 */
export interface SessionResourceService {
  /**
   * 分配资源
   * @param sessionId 会话ID
   * @param requirements 资源需求列表
   * @returns 资源分配
   */
  allocateResources(sessionId: string, requirements: ResourceRequirement[]): Promise<ResourceAllocation>;

  /**
   * 释放资源
   * @param sessionId 会话ID
   * @param allocation 资源分配
   */
  releaseResources(sessionId: string, allocation: ResourceAllocation): Promise<void>;

  /**
   * 检查资源限制
   * @param sessionId 会话ID
   * @returns 资源限制
   */
  checkResourceLimits(sessionId: string): Promise<ResourceLimits>;

  /**
   * 检查是否可以创建线程
   * @param sessionId 会话ID
   * @returns 是否可以创建
   */
  canCreateThread(sessionId: string): Promise<boolean>;

  /**
   * 检查是否可以发送消息
   * @param sessionId 会话ID
   * @returns 是否可以发送
   */
  canSendMessage(sessionId: string): Promise<boolean>;

  /**
   * 获取剩余配额
   * @param sessionId 会话ID
   * @returns 剩余配额
   */
  getRemainingQuota(sessionId: string): Promise<SessionQuota>;

  /**
   * 更新配额使用情况
   * @param sessionId 会话ID
   * @param usage 使用情况
   */
  updateQuotaUsage(sessionId: string, usage: QuotaUsage): Promise<void>;
}