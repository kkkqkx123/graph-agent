/**
 * 会话生命周期服务
 * 
 * 负责会话的创建、激活、暂停和终止等生命周期管理
 */

import { Session } from '../../../domain/sessions/entities/session';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { SessionDomainService } from '../../../domain/sessions/services/session-domain-service';
import { SessionStatus } from '../../../domain/sessions/value-objects/session-status';
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

        // 验证会话创建的业务规则
        await this.sessionDomainService.validateSessionCreation(userId, config);

        // 创建会话
        const session = Session.create(userId, request.title, config);

        // 保存会话
        await this.sessionRepository.save(session);

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

        const session = await this.sessionRepository.findByIdOrFail(id);

        if (session.status.isActive()) {
          return this.mapSessionToInfo(session); // 已经是活跃状态
        }

        if (session.status.isTerminated()) {
          throw new Error('无法激活已终止的会话');
        }

        // 验证状态转换
        await this.sessionDomainService.validateStatusTransition(session, SessionStatus.active(), user);

        // 激活会话
        session.changeStatus(SessionStatus.active(), user, '激活会话');
        session.updateLastActivity();

        await this.sessionRepository.save(session);
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

        const session = await this.sessionRepository.findByIdOrFail(id);

        if (session.status.isSuspended()) {
          return this.mapSessionToInfo(session); // 已经是暂停状态
        }

        if (session.status.isTerminated()) {
          throw new Error('无法暂停已终止的会话');
        }

        if (!session.status.isActive()) {
          throw new Error('只能暂停活跃状态的会话');
        }

        // 暂停会话
        session.changeStatus(SessionStatus.suspended(), user, reason);

        await this.sessionRepository.save(session);
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

        const session = await this.sessionRepository.findByIdOrFail(id);

        if (session.status.isTerminated()) {
          return this.mapSessionToInfo(session); // 已经是终止状态
        }

        // 终止会话
        session.changeStatus(SessionStatus.terminated(), user, reason);

        await this.sessionRepository.save(session);
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