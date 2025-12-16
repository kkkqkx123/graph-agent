/**
 * 创建线程DTO接口定义
 */

export interface CreateThreadRequest {
  sessionId: string;
  workflowId?: string;
  priority?: number;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}