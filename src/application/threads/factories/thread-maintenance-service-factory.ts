/**
 * 线程维护服务工厂
 * 
 * 负责创建和管理线程维护服务的实例
 */

import { IContainer } from '../../../infrastructure/container/container';
import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { ThreadMaintenanceService } from '../services/thread-maintenance-service';
import { ThreadDtoMapper } from '../services/mappers/thread-dto-mapper';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';

/**
 * 线程维护服务工厂
 */
export class ThreadMaintenanceServiceFactory extends BaseApplicationServiceFactory<ThreadMaintenanceService> {
  private dtoMapper?: ThreadDtoMapper;

  /**
   * 创建线程维护服务
   * @returns 线程维护服务实例
   */
  createApplicationService(): ThreadMaintenanceService {
    try {
      this.logger.info('正在创建线程维护服务...');
      const threadRepository = this.getDependency<ThreadRepository>('ThreadRepository');
      const threadDomainService = this.getDependency<ThreadDomainService>('ThreadDomainService');
      const dtoMapper = this.getDtoMapper();

      const service = new ThreadMaintenanceService(
        threadRepository,
        threadDomainService,
        dtoMapper,
        this.logger
      );
      this.logger.info('线程维护服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建线程维护服务失败', error as Error);
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