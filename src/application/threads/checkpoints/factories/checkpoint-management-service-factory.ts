/**
 * 检查点管理服务工厂
 * 
 * 负责创建和管理检查点管理服务的实例
 */

import { IContainer } from '../../../../infrastructure/container/container';
import { BaseApplicationServiceFactory } from '../../../common/base-service-factory';
import { CheckpointManagementService } from '../services/checkpoint-management-service';
import { ThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';

/**
 * 检查点管理服务工厂
 */
export class CheckpointManagementServiceFactory extends BaseApplicationServiceFactory<CheckpointManagementService> {
  /**
   * 创建检查点管理服务
   * @returns 检查点管理服务实例
   */
  createApplicationService(): CheckpointManagementService {
    try {
      this.logger.info('正在创建检查点管理服务...');
      const repository = this.getDependency<ThreadCheckpointRepository>('ThreadCheckpointRepository');

      const service = new CheckpointManagementService(
        repository,
        this.logger
      );
      this.logger.info('检查点管理服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建检查点管理服务失败', error as Error);
      throw error;
    }
  }
}