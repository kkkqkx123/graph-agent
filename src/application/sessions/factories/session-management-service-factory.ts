/**
 * 会话管理服务工厂
 * 
 * 负责创建和管理会话管理服务的实例
 */

import { IContainer } from '../../../infrastructure/container/container';
import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { SessionManagementService } from '../services/session-management-service';
import { SessionDtoMapper } from '../services/mappers/session-dto-mapper';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { SessionDomainService } from '../../../domain/session/services/session-domain-service';

/**
 * 会话管理服务工厂
 */
export class SessionManagementServiceFactory extends BaseApplicationServiceFactory<SessionManagementService> {
  private dtoMapper?: SessionDtoMapper;

  /**
   * 创建会话管理服务
   * @returns 会话管理服务实例
   */
  createApplicationService(): SessionManagementService {
    try {
      this.logger.info('正在创建会话管理服务...');
      const sessionRepository = this.getDependency<SessionRepository>('SessionRepository');
      const sessionDomainService = this.getDependency<SessionDomainService>('SessionDomainService');
      const dtoMapper = this.getDtoMapper();

      const service = new SessionManagementService(
        sessionRepository,
        sessionDomainService,
        dtoMapper,
        this.logger
      );
      this.logger.info('会话管理服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建会话管理服务失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取DTO映射器（单例）
   * @returns DTO映射器实例
   */
  private getDtoMapper(): SessionDtoMapper {
    if (!this.dtoMapper) {
      this.dtoMapper = new SessionDtoMapper();
    }
    return this.dtoMapper;
  }
}