/**
 * 线程信息DTO接口定义
 */

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

export interface ThreadStatistics {
  total: number;
  pending: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  cancelled: number;
}
