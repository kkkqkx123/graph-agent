/**
 * 检查点创建服务
 * 
 * 负责各种类型检查点的创建功能
 */

import { ThreadCheckpoint } from '../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { ThreadCheckpointDomainService, ThreadCheckpointDomainServiceImpl } from '../../../../domain/threads/checkpoints/services/thread-checkpoint-domain-service';
import { IThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { BaseApplicationService } from '../../../common/base-application-service';
import {
  CreateCheckpointRequest,
  CreateManualCheckpointRequest,
  CreateErrorCheckpointRequest,
  CreateMilestoneCheckpointRequest
} from './checkpoint-service';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * 检查点创建服务
 */
export class CheckpointCreationService extends BaseApplicationService {
  private readonly domainService: ThreadCheckpointDomainService;

  constructor(
    private readonly repository: IThreadCheckpointRepository,
    logger: ILogger
  ) {
    super(logger);
    this.domainService = new ThreadCheckpointDomainServiceImpl(repository);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '检查点创建';
  }

  /**
   * 创建检查点
   */
  async createCheckpoint(request: CreateCheckpointRequest): Promise<string> {
    return this.executeCreateOperation(
      '检查点',
      async () => {
        const threadId = this.parseId(request.threadId, '线程ID');
        const type = this.mapCheckpointType(request.type);

        let checkpoint: ThreadCheckpoint;

        switch (request.type) {
          case 'manual':
            checkpoint = await this.domainService.createManualCheckpoint(
              threadId,
              request.stateData,
              request.title,
              request.description,
              request.tags,
              request.metadata,
              request.expirationHours
            );
            break;

          case 'error':
            checkpoint = await this.domainService.createErrorCheckpoint(
              threadId,
              request.stateData,
              request.description || '',
              request.metadata?.['errorType'] as string,
              request.metadata,
              request.expirationHours
            );
            break;

          case 'milestone':
            checkpoint = await this.domainService.createMilestoneCheckpoint(
              threadId,
              request.stateData,
              request.title || '',
              request.description,
              request.metadata,
              request.expirationHours
            );
            break;

          case 'auto':
          default:
            checkpoint = await this.domainService.createAutoCheckpoint(
              threadId,
              request.stateData,
              request.metadata,
              request.expirationHours
            );
            break;
        }

        return checkpoint.checkpointId;
      },
      { threadId: request.threadId, type: request.type }
    );
  }

  /**
   * 创建手动检查点
   */
  async createManualCheckpoint(request: CreateManualCheckpointRequest): Promise<string> {
    return await this.createCheckpoint({
      ...request,
      type: 'manual'
    });
  }

  /**
   * 创建错误检查点
   */
  async createErrorCheckpoint(request: CreateErrorCheckpointRequest): Promise<string> {
    return await this.createCheckpoint({
      threadId: request.threadId,
      type: 'error',
      stateData: request.stateData,
      description: request.errorMessage,
      metadata: {
        ...request.metadata,
        errorType: request.errorType
      },
      expirationHours: request.expirationHours
    });
  }

  /**
   * 创建里程碑检查点
   */
  async createMilestoneCheckpoint(request: CreateMilestoneCheckpointRequest): Promise<string> {
    return await this.createCheckpoint({
      threadId: request.threadId,
      type: 'milestone',
      stateData: request.stateData,
      title: request.milestoneName,
      description: request.description,
      metadata: request.metadata,
      expirationHours: request.expirationHours
    });
  }

  /**
   * 映射检查点类型
   */
  private mapCheckpointType(type: string): CheckpointType {
    switch (type) {
      case 'manual':
        return CheckpointType.manual();
      case 'error':
        return CheckpointType.error();
      case 'milestone':
        return CheckpointType.milestone();
      case 'auto':
      default:
        return CheckpointType.auto();
    }
  }
}