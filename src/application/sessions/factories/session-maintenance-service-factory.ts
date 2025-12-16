/**
 * 会话维护服务工厂
 * 
 * 负责创建和管理会话维护服务的实例
 */

import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { SessionMaintenanceService } from '../services/session-maintenance-service';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { SessionDomainService } from '../../../domain/session/services/session-domain-service';

/**
 * 会话维护服务工厂
 */
export class SessionMaintenanceServiceFactory extends BaseApplicationServiceFactory<SessionMaintenanceService> {
  /**
   * 创建会话维护服务
   * @returns 会话维护服务实例
   */
  createApplicationService(): SessionMaintenanceService {
    try {
      this.logger.info('正在创建会话维护服务...');
      const sessionRepository = this.getDependency<SessionRepository>('SessionRepository');
      const threadRepository = this.getDependency<ThreadRepository>('ThreadRepository');
      const sessionDomainService = this.getDependency<SessionDomainService>('SessionDomainService');

      const service = new SessionMaintenanceService(
        sessionRepository,
        threadRepository,
        sessionDomainService,
        this.logger
      );
      this.logger.info('会话维护服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建会话维护服务失败', error as Error);
      throw error;
    }
  }
}