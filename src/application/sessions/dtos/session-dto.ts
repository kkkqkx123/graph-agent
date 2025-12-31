/**
 * Session模块DTO定义
 * 简化后的DTO实现，使用简单接口和映射函数
 */

import { Session } from '../../../domain/sessions';

// ==================== DTO接口定义 ====================

/**
 * 会话状态DTO
 */
export interface SessionStatusDTO {
  value: string;
  isActive: boolean;
  isSuspended: boolean;
  isTerminated: boolean;
  canOperate: boolean;
}

/**
 * 会话活动DTO
 */
export interface SessionActivityDTO {
  messageCount: number;
  threadCount: number;
  lastActivityAt: string;
  createdAt: string;
}

/**
 * 会话配置DTO
 */
export interface SessionConfigDTO {
  maxMessages: number;
  maxThreads: number;
  timeoutMinutes: number;
  maxDuration: number;
  value: Record<string, unknown>;
}

/**
 * 会话DTO
 */
export interface SessionDTO {
  sessionId: string;
  userId?: string;
  title?: string;
  status: SessionStatusDTO;
  config: SessionConfigDTO;
  activity: SessionActivityDTO;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: string;
  isDeleted: boolean;
}

/**
 * 会话创建DTO
 */
export interface SessionCreateDTO {
  userId?: string;
  title?: string;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * 会话更新DTO
 */
export interface SessionUpdateDTO {
  title?: string;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * 会话状态变更DTO
 */
export interface SessionStatusChangeDTO {
  newStatus: string;
  userId?: string;
  reason?: string;
}

/**
 * 会话统计DTO
 */
export interface SessionStatisticsDTO {
  total: number;
  active: number;
  suspended: number;
  terminated: number;
}

/**
 * 资源分配DTO
 */
export interface ResourceAllocationDTO {
  id: string;
  sessionId: string;
  resources: Array<{
    type: string;
    amount: number;
  }>;
  allocatedAt: string;
  expiresAt: string;
}

/**
 * 资源限制DTO
 */
export interface ResourceLimitsDTO {
  maxMemory: number;
  maxThreads: number;
  maxExecutionTime: number;
  maxStorage: number;
}

/**
 * 会话配额DTO
 */
export interface SessionQuotaDTO {
  remainingThreads: number;
  remainingExecutionTime: number;
  remainingMemory: number;
  remainingStorage: number;
}

/**
 * 配额使用DTO
 */
export interface QuotaUsageDTO {
  threadsUsed: number;
  executionTimeUsed: number;
  memoryUsed: number;
  storageUsed: number;
}

// ==================== 映射函数 ====================

/**
 * 将Session领域对象转换为SessionDTO
 */
export const mapSessionToDTO = (session: Session): SessionDTO => {
  return {
    sessionId: session.sessionId.toString(),
    userId: session.userId?.toString(),
    title: session.title,
    status: {
      value: session.status.getValue(),
      isActive: session.status.isActive(),
      isSuspended: session.status.isSuspended(),
      isTerminated: session.status.isTerminated(),
      canOperate: session.status.canOperate()
    },
    config: {
      maxMessages: session.config.getMaxMessages(),
      maxThreads: 0, // SessionConfig没有maxThreads属性，使用默认值
      timeoutMinutes: session.config.getTimeoutMinutes(),
      maxDuration: session.config.getMaxDuration(),
      value: session.config.value
    },
    activity: {
      messageCount: session.messageCount,
      threadCount: session.threadCount,
      lastActivityAt: session.lastActivityAt.toISOString(),
      createdAt: session.createdAt.toISOString()
    },
    metadata: session.metadata,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    version: session.version.toString(),
    isDeleted: session.isDeleted()
  };
};

/**
 * 批量将Session领域对象转换为SessionDTO
 */
export const mapSessionsToDTOs = (sessions: Session[]): SessionDTO[] => {
  return sessions.map(mapSessionToDTO);
};

/**
 * 将ResourceAllocation领域对象转换为ResourceAllocationDTO
 */
export const mapResourceAllocationToDTO = (allocation: any): ResourceAllocationDTO => {
  return {
    id: allocation.id?.toString() || '',
    sessionId: allocation.sessionId?.toString() || '',
    resources: allocation.resources || [],
    allocatedAt: allocation.allocatedAt?.toISOString() || new Date().toISOString(),
    expiresAt: allocation.expiresAt?.toISOString() || new Date().toISOString()
  };
};