/**
 * 会话生命周期服务
 *
 * 负责会话的创建、激活、暂停和终止等生命周期管理
 */

import { Session, ISessionRepository, SessionStatus, SessionConfig, SessionConfigProps } from '../../../domain/sessions';
import { BaseApplicationService } from '../../common/base-application-service';
import { ILogger, ID } from '../../../domain/common';

/**
 * 创建会话请求
 */
export interface CreateSessionRequest {
  userId?: string;
  title?: string;
  config?: Record<string, unknown>;
}

/**
 * 会话生命周期服务
 */
export class SessionLifecycleService extends BaseApplicationService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
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
   * 验证会话创建的业务规则
   */
  private async validateSessionCreation(userId?: ID, config?: SessionConfig): Promise<void> {
    // 验证配置有效性
    if (config) {
      config.validate();
    }
  }

  /**
   * 验证状态转换的业务规则
   */
  private validateStatusTransition(session: Session, newStatus: SessionStatus, userId?: ID): void {
    // 验证状态转换是否合法
    if (session.status.isTerminated()) {
      throw new Error('已终止的会话无法转换状态');
    }
  }

  /**
   * 验证配置更新的业务规则
   */
  private validateConfigUpdate(session: Session, newConfig: SessionConfig): void {
    // 验证配置更新是否合法
    if (session.status.isTerminated()) {
      throw new Error('已终止的会话无法更新配置');
    }
    newConfig.validate();
  }

  /**
   * 验证操作权限的业务规则
   */
  private validateOperationPermission(session: Session, userId?: ID): void {
    // 验证用户是否有权限操作此会话
    if (userId && session.userId && !session.userId.equals(userId)) {
      throw new Error('无权限操作此会话');
    }
  }

  /**
   * 验证消息添加的业务规则
   */
  private validateMessageAddition(session: Session): void {
    // 验证是否可以添加消息
    if (!session.status.isActive()) {
      throw new Error('只能在活跃状态的会话中添加消息');
    }
  }

  /**
   * 处理会话超时的业务规则
   */
  private async handleSessionTimeout(session: Session, userId?: ID): Promise<Session> {
    // 处理超时的会话
    session.changeStatus(SessionStatus.suspended(), userId, '会话超时');
    return session;
  }

  /**
   * 处理会话过期的业务规则
   */
  private async handleSessionExpiration(session: Session, userId?: ID): Promise<Session> {
    // 处理过期的会话
    session.changeStatus(SessionStatus.terminated(), userId, '会话已过期');
    return session;
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
        await this.validateSessionCreation(userId, config);

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
  async activateSession(sessionId: string, userId?: string): Promise<Session> {
    return this.executeUpdateOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionRepository.findByIdOrFail(id);

        if (session.status.isActive()) {
          return session; // 已经是活跃状态
        }

        if (session.status.isTerminated()) {
          throw new Error('无法激活已终止的会话');
        }

        // 验证状态转换
        this.validateStatusTransition(session, SessionStatus.active(), user);

        // 激活会话
        session.changeStatus(SessionStatus.active(), user, '激活会话');
        session.updateLastActivity();

        await this.sessionRepository.save(session);
        return session;
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
  async suspendSession(sessionId: string, userId?: string, reason?: string): Promise<Session> {
    return this.executeUpdateOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionRepository.findByIdOrFail(id);

        if (session.status.isSuspended()) {
          return session; // 已经是暂停状态
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
        return session;
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
  async terminateSession(sessionId: string, userId?: string, reason?: string): Promise<Session> {
    return this.executeUpdateOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const user = this.parseOptionalId(userId, '用户ID');

        const session = await this.sessionRepository.findByIdOrFail(id);

        if (session.status.isTerminated()) {
          return session; // 已经是终止状态
        }

        // 终止会话
        session.changeStatus(SessionStatus.terminated(), user, reason);

        await this.sessionRepository.save(session);
        return session;
      },
      { sessionId, userId, reason }
    );
  }

}