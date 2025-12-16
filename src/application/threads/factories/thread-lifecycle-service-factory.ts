/**
 * 线程生命周期服务工厂
 * 
 * 负责创建和管理线程生命周期服务的实例
 */

import { IContainer } from '../../../infrastructure/container/container';
import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { ThreadLifecycleService } from '../services/thread-lifecycle-service';
import { ThreadDtoMapper } from '../services/mappers/thread-dto-mapper';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';

/**
 * 线程生命周期服务工厂
 */
export class ThreadLifecycleServiceFactory extends BaseApplicationServiceFactory<ThreadLifecycleService> {
  private dtoMapper?: ThreadDtoMapper;

  /**
   * 创建线程生命周期服务
   * @returns 线程生命周期服务实例
   */
  createApplicationService(): ThreadLifecycleService {
    try {
      this.logger.info('正在创建线程生命周期服务...');
      const threadRepository = this.getDependency<ThreadRepository>('ThreadRepository');
      const sessionRepository = this.getDependency<SessionRepository>('SessionRepository');
      const threadDomainService = this.getDependency<ThreadDomainService>('ThreadDomainService');
      const dtoMapper = this.getDtoMapper();

      const service = new ThreadLifecycleService(
        threadRepository,
        sessionRepository,
        threadDomainService,
        dtoMapper,
        this.logger
      );
      this.logger.info('线程生命周期服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建线程生命周期服务失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取DTO映射器（单例）
   * @returns DTO映射器实例
   */
  private getDtoMapper(): ThreadDtoMapper {
    if (!this.dtoMapper) {
      this.dtoMapper = new ThreadDtoMapper();
    }
    return this.dtoMapper;
  }
}