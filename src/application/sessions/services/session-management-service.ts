/**
 * 会话管理服务
 * 
 * 负责会话的查询、列表、存在性检查和配置更新等管理功能
 */

import { Session } from '../../../domain/sessions/entities/session';
import { SessionRepository } from '../../../domain/sessions/repositories/session-repository';
import { SessionConfig, SessionConfigProps } from '../../../domain/sessions/value-objects/session-config';
import { BaseApplicationService } from '../../common/base-application-service';
import { ILogger } from '../../../domain/common/types';

/**
 * 会话管理服务
 */
export class SessionManagementService extends BaseApplicationService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    logger: ILogger
  ) {
    super(logger);
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
  async getSessionInfo(sessionId: string): Promise<Session | null> {
    return this.executeGetOperation(
      '会话信息',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const session = await this.sessionRepository.findById(id);

        if (!session) {
          return null;
        }

        return session;
      },
      { sessionId }
    );
  }

  /**
   * 列出所有会话
   * @returns 会话信息列表
   */
  async listSessions(): Promise<Session[]> {
    return this.executeListOperation(
      '会话',
      async () => {
        const sessions = await this.sessionRepository.findAll();
        return sessions;
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
  async updateSessionConfig(sessionId: string, config: Record<string, unknown>): Promise<Session> {
    return this.executeUpdateOperation(
      '会话配置',
      async () => {
        const id = this.parseId(sessionId, '会话ID');
        const sessionConfig = SessionConfig.create(config as Partial<SessionConfigProps>);

        const session = await this.sessionRepository.findByIdOrFail(id);

        // 验证配置更新
        this.validateConfigUpdate(session, sessionConfig);

        // 更新配置
        session.updateConfig(sessionConfig);

        await this.sessionRepository.save(session);
        return session;
      },
      { sessionId, configKeys: Object.keys(config) }
    );
  }

}