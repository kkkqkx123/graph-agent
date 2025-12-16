/**
 * 会话管理服务工厂
 * 
 * 负责创建和管理会话管理服务的实例
 */

import { IContainer } from '../../../infrastructure/container/container';
import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { SessionManagementService } from '../services/session-management-service';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { SessionDomainService } from '../../../domain/session/services/session-domain-service';

/**
 * 会话管理服务工厂
 */
export class SessionManagementServiceFactory extends BaseApplicationServiceFactory<SessionManagementService> {
  /**
   * 创建会话管理服务
   * @returns 会话管理服务实例
   */
  createApplicationService(): SessionManagementService {
    try {
      this.logger.info('正在创建会话管理服务...');
      const sessionRepository = this.getDependency<SessionRepository>('SessionRepository');
      const sessionDomainService = this.getDependency<SessionDomainService>('SessionDomainService');

      const service = new SessionManagementService(
        sessionRepository,
        sessionDomainService,
        this.logger
      );
      this.logger.info('会话管理服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建会话管理服务失败', error as Error);
      throw error;
    }
  }
}