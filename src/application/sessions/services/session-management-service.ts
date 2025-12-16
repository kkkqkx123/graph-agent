/**
 * 会话管理服务
 * 
 * 负责会话的查询、列表、存在性检查和配置更新等管理功能
 */

import { Session } from '../../../domain/sessions/entities/session';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { SessionDomainService } from '../../../domain/sessions/services/session-domain-service';
import { SessionConfig, SessionConfigProps } from '../../../domain/sessions/value-objects/session-config';
import { BaseApplicationService } from '../../common/base-application-service';
import { SessionInfo } from '../dtos';
import { ILogger } from '@shared/types/logger';

/**
 * 会话管理服务
 */
export class SessionManagementService extends BaseApplicationService {
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
    return '会话管理';
  }

  /**
   * 获取会话信息
   * @param sessionId 会话ID
   * @returns 会话信息
   */
  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    return this.executeGetOperation(
      '会话信息',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return null;
        }

        return this.mapSessionToInfo(session);
      },
      { sessionId }
    );
  }

  /**
   * 列出所有会话
   * @returns 会话信息列表
   */
  async listSessions(): Promise<SessionInfo[]> {
    return this.executeListOperation(
      '会话',
      async () => {
        const sessions = await this.sessionRepository.findAll();
        return sessions.map(session => this.mapSessionToInfo(session));
      }
    );
  }

  /**
   * 检查会话是否存在
   * @param sessionId 会话ID
   * @returns 是否存在
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    return this.executeCheckOperation(
      '会话',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        return await this.sessionRepository.exists(id);
      },
      { sessionId }
    );
  }

  /**
   * 更新会话配置
   * @param sessionId 会话ID
   * @param config 新配置
   * @returns 更新后的会话信息
   */
  async updateSessionConfig(sessionId: string, config: Record<string, unknown>): Promise<SessionInfo> {
    return this.executeUpdateOperation(
      '会话配置',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const sessionConfig = SessionConfig.create(config as Partial<SessionConfigProps>);

        const session = await this.sessionDomainService.updateSessionConfig(id, sessionConfig);
        return this.mapSessionToInfo(session);
      },
      { sessionId, configKeys: Object.keys(config) }
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