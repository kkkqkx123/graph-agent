/**
 * 线程维护服务工厂
 * 
 * 负责创建和管理线程维护服务的实例
 */

import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { ThreadMaintenanceService } from '../services/thread-maintenance-service';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';

/**
 * 线程维护服务工厂
 */
export class ThreadMaintenanceServiceFactory extends BaseApplicationServiceFactory<ThreadMaintenanceService> {
  /**
    * 创建线程维护服务
    * @returns 线程维护服务实例
    */
  createApplicationService(): ThreadMaintenanceService {
    try {
      this.logger.info('正在创建线程维护服务...');
      const threadRepository = this.getDependency<ThreadRepository>('ThreadRepository');
      const threadDomainService = this.getDependency<ThreadDomainService>('ThreadDomainService');

      const service = new ThreadMaintenanceService(
        threadRepository,
        threadDomainService,
        this.logger
      );
      this.logger.info('线程维护服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建线程维护服务失败', error as Error);
      throw error;
    }
  }
}