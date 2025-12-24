/**
 * 会话生命周期服务
 * 
 * 负责会话的创建、激活、暂停和终止等生命周期管理
 */

import { Session } from '../../../domain/sessions/entities/session';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { SessionDomainService } from '../../../domain/sessions/services/session-domain-service';
import { SessionConfig, SessionConfigProps } from '../../../domain/sessions/value-objects/session-config';
import { BaseApplicationService } from '../../common/base-application-service';
import { CreateSessionRequest, SessionInfo } from '../dtos';
import { ILogger } from '../../../domain/common/types';

/**
 * 会话生命周期服务
 */
export class SessionLifecycleService extends BaseApplicationService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionDomainService: SessionDomainService,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '会话生命周期';
  }

  /**
   * 创建会话
   * @param request 创建会话请求
   * @returns 创建的会话ID
   */
  async createSession(request: CreateSessionRequest): Promise<string> {
    return this.executeBusinessOperation(
      '创建会话',
      async () => {
        const userId = this.parseOptionalId(request.userId, '用户ID');
        const config = request.config ? SessionConfig.create(request.config as Partial<SessionConfigProps>) : undefined;

        const session = await this.sessionDomainService.createSession(
          userId,
          request.title,
          config
        );

        return session.sessionId.toString();
      },
      { userId: request.userId, title: request.title }
    );
  }

  /**
   * 激活会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @returns 激活后的会话信息
   */
  async activateSession(sessionId: string, userId?: string): Promise<SessionInfo> {
    return this.executeUpdateOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionDomainService.activateSession(id, user);
        return this.mapSessionToInfo(session);
      },
      { sessionId, userId }
    );
  }

  /**
   * 暂停会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @param reason 暂停原因
   * @returns 暂停后的会话信息
   */
  async suspendSession(sessionId: string, userId?: string, reason?: string): Promise<SessionInfo> {
    return this.executeUpdateOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionDomainService.suspendSession(id, user, reason);
        return this.mapSessionToInfo(session);
      },
      { sessionId, userId, reason }
    );
  }

  /**
   * 终止会话
   * @param sessionId 会话ID
   * @param userId 用户ID
   * @param reason 终止原因
   * @returns 终止后的会话信息
   */
  async terminateSession(sessionId: string, userId?: string, reason?: string): Promise<SessionInfo> {
    return this.executeUpdateOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionDomainService.terminateSession(id, user, reason);
        return this.mapSessionToInfo(session);
      },
      { sessionId, userId, reason }
    );
  }

  /**
   * 将会话领域对象映射为会话信息DTO
   */
  private mapSessionToInfo(session: Session): SessionInfo {
    return {
      sessionId: session.sessionId.toString(),
      userId: session.userId?.toString(),
      title: session.title,
      status: session.status.getValue(),
      messageCount: session.messageCount,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString()
    };
  }
}