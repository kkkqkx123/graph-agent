/**
 * 通用DTO类型定义
 */

// 会话相关DTO
export interface SessionInfo {
  sessionId: string;
  userId?: string;
  title?: string;
  status: string;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface CreateSessionRequest {
  userId?: string;
  title?: string;
  config?: Record<string, unknown>;
}

export interface SessionStatistics {
  total: number;
  active: number;
  suspended: number;
  terminated: number;
}

// 线程相关DTO
export interface ThreadInfo {
  threadId: string;
  sessionId: string;
  workflowId?: string;
  status: string;
  priority: number;
  title?: string;
  description?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface CreateThreadRequest {
  sessionId: string;
  workflowId?: string;
  priority?: number;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ThreadStatistics {
  total: number;
  pending: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  cancelled: number;
}

// 检查点相关DTO
export interface CheckpointInfo {
  checkpointId: string;
  threadId: string;
  type: string;
  status: string;
  title?: string;
  description?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  sizeBytes: number;
  restoreCount: number;
  lastRestoredAt?: string;
}

export interface CheckpointStatisticsInfo {
  totalCheckpoints: number;
  activeCheckpoints: number;
  expiredCheckpoints: number;
  corruptedCheckpoints: number;
  archivedCheckpoints: number;
  totalSizeBytes: number;
  averageSizeBytes: number;
  largestCheckpointBytes: number;
  smallestCheckpointBytes: number;
  totalRestores: number;
  averageRestores: number;
  oldestCheckpointAgeHours: number;
  newestCheckpointAgeHours: number;
  averageAgeHours: number;
  typeDistribution: Record<string, number>;
  restoreFrequency: Record<number, number>;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface CreateCheckpointRequest {
  threadId: string;
  type: 'auto' | 'manual' | 'error' | 'milestone';
  stateData: Record<string, unknown>;
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}

export interface CreateManualCheckpointRequest {
  threadId: string;
  stateData: Record<string, unknown>;
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}

export interface CreateErrorCheckpointRequest {
  threadId: string;
  stateData: Record<string, unknown>;
  errorMessage: string;
  errorType?: string;
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}

export interface CreateMilestoneCheckpointRequest {
  threadId: string;
  stateData: Record<string, unknown>;
  milestoneName: string;
  description?: string;
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}