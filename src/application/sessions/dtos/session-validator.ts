/**
 * 会话数据验证器
 */

import { SessionInfo, SessionStatistics } from './session-info';
import { CreateSessionRequest, SessionConfigDto } from './create-session';

export class SessionValidator {
  /**
   * 验证会话信息数据
   */
  static validateSessionInfo(data: any): SessionInfo {
    if (typeof data.sessionId !== 'string') {
      throw new Error('sessionId must be string');
    }
    if (data.userId && typeof data.userId !== 'string') {
      throw new Error('userId must be string');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    if (typeof data.status !== 'string') {
      throw new Error('status must be string');
    }
    if (typeof data.messageCount !== 'number') {
      throw new Error('messageCount must be number');
    }
    if (typeof data.createdAt !== 'string') {
      throw new Error('createdAt must be string');
    }
    if (typeof data.lastActivityAt !== 'string') {
      throw new Error('lastActivityAt must be string');
    }
    
    return data as SessionInfo;
  }

  /**
   * 验证创建会话请求数据
   */
  static validateCreateSessionRequest(data: any): CreateSessionRequest {
    if (data.userId && typeof data.userId !== 'string') {
      throw new Error('userId must be string');
    }
    if (data.title && typeof data.title !== 'string') {
      throw new Error('title must be string');
    }
    
    return data as CreateSessionRequest;
  }

  /**
   * 验证会话统计数据
   */
  static validateSessionStatistics(data: any): SessionStatistics {
    if (typeof data.total !== 'number') {
      throw new Error('total must be number');
    }
    if (typeof data.active !== 'number') {
      throw new Error('active must be number');
    }
    if (typeof data.suspended !== 'number') {
      throw new Error('suspended must be number');
    }
    if (typeof data.terminated !== 'number') {
      throw new Error('terminated must be number');
    }
    
    return data as SessionStatistics;
  }
}