/**
 * 检查点分析服务工厂
 * 
 * 负责创建和管理检查点分析服务的实例
 */

import { BaseApplicationServiceFactory } from '../../../common/base-service-factory';
import { CheckpointAnalysisService } from '../services/checkpoint-analysis-service';
import { ThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';

/**
 * 检查点分析服务工厂
 */
export class CheckpointAnalysisServiceFactory extends BaseApplicationServiceFactory<CheckpointAnalysisService> {
  /**
    * 创建检查点分析服务
    * @returns 检查点分析服务实例
    */
  createApplicationService(): CheckpointAnalysisService {
    try {
      this.logger.info('正在创建检查点分析服务...');
      const repository = this.getDependency<ThreadCheckpointRepository>('ThreadCheckpointRepository');

      const service = new CheckpointAnalysisService(
        repository,
        this.logger
      );
      this.logger.info('检查点分析服务创建成功');
      return service;
    } catch (error) {
      this.logger.error('创建检查点分析服务失败', error as Error);
      throw error;
    }
  }
}