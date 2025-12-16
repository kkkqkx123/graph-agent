/**
 * 线程管理服务工厂
 * 
 * 负责创建和管理线程管理服务的实例
 */

import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { ThreadManagementService } from '../services/thread-management-service';
import { ThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { ThreadDomainService } from '../../../domain/threads/services/thread-domain-service';

/**
 * 线程管理服务工厂
 */
export class ThreadManagementServiceFactory extends BaseApplicationServiceFactory<ThreadManagementService> {
  /**
    * 创建线程管理服务
    * @returns 线程管理服务实例
    */
  createApplicationService(): ThreadManagementService {
    try {
      this.logger.info('正在创建线程管理服务...');
      const threadRepository = this.getDependency<ThreadRepository>('ThreadRepository');
      const threadDomainService = this.getDependency<ThreadDomainService>('ThreadDomainService');

      const service = new ThreadManagementService(
        threadRepository,
        threadDomainService,
        this.logger
      );
      this.logger.info('线程管理服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建线程管理服务失败', error as Error);
      throw error;
    }
  }
}