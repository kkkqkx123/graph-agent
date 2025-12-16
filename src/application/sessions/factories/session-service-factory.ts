/**
 * 会话服务工厂
 * 
 * 负责创建和管理会话相关服务的实例
 */

import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { SessionLifecycleService } from '../services/session-lifecycle-service';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { SessionDomainService } from '../../../domain/session/services/session-domain-service';

/**
 * 会话服务工厂
 */
export class SessionServiceFactory extends BaseApplicationServiceFactory<SessionLifecycleService> {
  /**
   * 创建会话生命周期服务
   * @returns 会话生命周期服务实例
   */
  createApplicationService(): SessionLifecycleService {
    try {
      this.logger.info('正在创建会话生命周期服务...');
      const sessionRepository = this.getDependency<SessionRepository>('SessionRepository');
      const sessionDomainService = this.getDependency<SessionDomainService>('SessionDomainService');

      const service = new SessionLifecycleService(
        sessionRepository,
        sessionDomainService,
        this.logger
      );
      this.logger.info('会话生命周期服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建会话生命周期服务失败', error as Error);
      throw error;
    }
  }
}