/**
 * API交互服务实现
 * 
 * 提供REST API的交互服务
 * 注意：这是一个占位符实现，实际的前端实现被跳过
 */

import { injectable } from 'inversify';
import { HumanRelayPrompt } from '../../../../domain/llm/entities/human-relay-prompt';
import { InteractionStatus } from '../../../../domain/llm/interfaces/human-relay-interaction.interface';
import { BaseAPIInteractionService } from '../interfaces/frontend-services.interface';

/**
 * API交互服务实现（占位符）
 */
@injectable()
export class APIInteractionService extends BaseAPIInteractionService {
  private sessions: Map<string, any> = new Map();

  constructor(config: Record<string, any> = {}) {
    super(config);
  }

  /**
   * 发送提示给API
   */
  public async sendPrompt(prompt: HumanRelayPrompt): Promise<string> {
    // 占位符实现
    throw new Error('API交互服务尚未实现，请使用TUI交互服务');
  }

  /**
   * 检查用户是否可用
   */
  public async isUserAvailable(): Promise<boolean> {
    return this.sessions.size > 0;
  }

  /**
   * 获取交互状态
   */
  public async getStatus(): Promise<InteractionStatus> {
    return this.sessions.size > 0 ? InteractionStatus.AVAILABLE : InteractionStatus.UNAVAILABLE;
  }

  /**
   * 取消当前交互
   */
  public async cancel(): Promise<boolean> {
    // 占位符实现
    return true;
  }

  /**
   * 创建交互会话
   */
  public async createInteractionSession(prompt: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.sessions.set(sessionId, {
      id: sessionId,
      prompt,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return sessionId;
  }

  /**
   * 获取交互会话状态
   */
  public async getInteractionSessionStatus(sessionId: string): Promise<{
    status: 'pending' | 'completed' | 'timeout' | 'error';
    response?: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }
    
    return {
      status: session.status,
      response: session.response,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  /**
   * 提交交互响应
   */
  public async submitInteractionResponse(sessionId: string, response: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    session.status = 'completed';
    session.response = response;
    session.updatedAt = new Date();
    
    return true;
  }

  /**
   * 取消交互会话
   */
  public async cancelInteractionSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    session.status = 'error';
    session.error = '用户取消了交互';
    session.updatedAt = new Date();
    
    return true;
  }

  /**
   * 清理过期会话
   */
  public async cleanupExpiredSessions(maxAge: number = 3600000): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * 获取会话统计信息
   */
  public getSessionStatistics(): {
    total: number;
    pending: number;
    completed: number;
    timeout: number;
    error: number;
  } {
    const stats = {
      total: this.sessions.size,
      pending: 0,
      completed: 0,
      timeout: 0,
      error: 0
    };
    
    for (const session of this.sessions.values()) {
      const status = session.status as keyof typeof stats;
      if (status in stats) {
        stats[status]++;
      }
    }
    
    return stats;
  }
}