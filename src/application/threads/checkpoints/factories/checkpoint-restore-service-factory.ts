/**
 * 检查点恢复服务工厂
 * 
 * 负责创建和管理检查点恢复服务的实例
 */

import { IContainer } from '../../../../infrastructure/container/container';
import { BaseApplicationServiceFactory } from '../../../common/base-service-factory';
import { CheckpointRestoreService } from '../services/checkpoint-restore-service';
import { ThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';

/**
 * 检查点恢复服务工厂
 */
export class CheckpointRestoreServiceFactory extends BaseApplicationServiceFactory<CheckpointRestoreService> {
  /**
   * 创建检查点恢复服务
   * @returns 检查点恢复服务实例
   */
  createApplicationService(): CheckpointRestoreService {
    try {
      this.logger.info('正在创建检查点恢复服务...');
      const repository = this.getDependency<ThreadCheckpointRepository>('ThreadCheckpointRepository');

      const service = new CheckpointRestoreService(
        repository,
        this.logger
      );
      this.logger.info('检查点恢复服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建检查点恢复服务失败', error as Error);
      throw error;
    }
  }
}