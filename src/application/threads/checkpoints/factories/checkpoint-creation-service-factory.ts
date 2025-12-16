/**
 * 检查点创建服务工厂
 * 
 * 负责创建和管理检查点创建服务的实例
 */

import { BaseApplicationServiceFactory } from '../../../common/base-service-factory';
import { CheckpointCreationService } from '../services/checkpoint-creation-service';
import { ThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';

/**
 * 检查点创建服务工厂
 */
export class CheckpointCreationServiceFactory extends BaseApplicationServiceFactory<CheckpointCreationService> {
  /**
   * 创建检查点创建服务
   * @returns 检查点创建服务实例
   */
  createApplicationService(): CheckpointCreationService {
    try {
      this.logger.info('正在创建检查点创建服务...');
      const repository = this.getDependency<ThreadCheckpointRepository>('ThreadCheckpointRepository');

      const service = new CheckpointCreationService(
        repository,
        this.logger
      );
      this.logger.info('检查点创建服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建检查点创建服务失败', error as Error);
      throw error;
    }
  }
}