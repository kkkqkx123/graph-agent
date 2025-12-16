/**
 * 线程数据验证器
 */

import { ThreadInfo, ThreadStatistics } from './thread-info';
import { CreateThreadRequest } from './create-thread';

export class ThreadValidator {
  /**
   * 验证线程信息数据
   */
  static validateThreadInfo(data: any): ThreadInfo {
    if (typeof data.threadId !== 'string') {
      throw new Error('threadId must be string');
    }
    if (typeof data.sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (data.workflowId && typeof data.workflowId !== 'string') {
      throw new Error('workflowId must be string');
    }
    if (typeof data.status !== 'string') {
      throw new Error('status must be string');
    }
    if (typeof data.priority !== 'number') {
      throw new Error('priority must be number');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    if (data.description && typeof data.description !== 'string') {
      throw new Error('description must be string');
    }
    if (typeof data.createdAt !== 'string') {
      throw new Error('createdAt must be string');
    }
    if (data.startedAt && typeof data.startedAt !== 'string') {
      throw new Error('startedAt must be string');
    }
    if (data.completedAt && typeof data.completedAt !== 'string') {
      throw new Error('completedAt must be string');
    }
    if (data.errorMessage && typeof data.errorMessage !== 'string') {
      throw new Error('errorMessage must be string');
    }
    
    return data as ThreadInfo;
  }

  /**
   * 验证创建线程请求数据
   */
  static validateCreateThreadRequest(data: any): CreateThreadRequest {
    if (typeof data.sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (data.workflowId && typeof data.workflowId !== 'string') {
      throw new Error('workflowId must be string');
    }
    if (data.priority && typeof data.priority !== 'number') {
      throw new Error('priority must be number');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    if (data.description && typeof data.description !== 'string') {
      throw new Error('description must be string');
    }
    if (data.metadata && typeof data.metadata !== 'object') {
      throw new Error('metadata must be object');
    }
    
    return data as CreateThreadRequest;
  }

  /**
   * 验证线程统计数据
   */
  static validateThreadStatistics(data: any): ThreadStatistics {
    if (typeof data.total !== 'number') {
      throw new Error('total must be number');
    }
    if (typeof data.pending !== 'number') {
      throw new Error('pending must be number');
    }
    if (typeof data.running !== 'number') {
      throw new Error('running must be number');
    }
    if (typeof data.paused !== 'number') {
      throw new Error('paused must be number');
    }
    if (typeof data.completed !== 'number') {
      throw new Error('completed must be number');
    }
    if (typeof data.failed !== 'number') {
      throw new Error('failed must be number');
    }
    if (typeof data.cancelled !== 'number') {
      throw new Error('cancelled must be number');
    }
    
    return data as ThreadStatistics;
  }
}