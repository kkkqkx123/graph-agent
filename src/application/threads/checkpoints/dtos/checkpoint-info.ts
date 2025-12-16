/**
 * 检查点信息DTO接口定义
 */

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
  errorType: string;
  errorMessage: string;
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