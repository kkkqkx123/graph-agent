/**
 * 线程生命周期服务工厂
 * 
 * 负责创建和管理线程生命周期服务的实例
 */

import { BaseApplicationServiceFactory } from '../../common/base-service-factory';
import { ThreadLifecycleService } from '../services/thread-lifecycle-service';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';

/**
 * 线程生命周期服务工厂
 */
export class ThreadLifecycleServiceFactory extends BaseApplicationServiceFactory<ThreadLifecycleService> {
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

      const service = new ThreadLifecycleService(
        threadRepository,
        sessionRepository,
        threadDomainService,
        this.logger
      );
      this.logger.info('线程生命周期服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建线程生命周期服务失败', error as Error);
      throw error;
    }
  }
}