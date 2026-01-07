/**
 * 检查点管理服务
 *
 * 负责检查点的查询、历史记录和过期时间延长等管理功能
 */

import { ThreadCheckpoint } from '../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointManagementService as InfraCheckpointManagementService } from '../../../../infrastructure/checkpoints/checkpoint-management-service';
import { BaseApplicationService } from '../../../common/base-application-service';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * 检查点管理服务
 */
export class CheckpointManagementService extends BaseApplicationService {
  constructor(
    private readonly managementService: InfraCheckpointManagementService,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '检查点管理';
  }

  /**
   * 延长检查点过期时间
   */
  async extendCheckpointExpiration(checkpointId: string, hours: number): Promise<boolean> {
    return this.executeBusinessOperation(
      '延长检查点过期时间',
      async () => {
        const id = this.parseId(checkpointId, '检查点ID');
        const success = await this.managementService.extendCheckpointExpiration(id, hours);

        if (success) {
          this.logOperationSuccess('检查点过期时间延长成功', { checkpointId, hours });
        } else {
          this.logWarning('检查点过期时间延长失败', { checkpointId, hours });
        }

        return success;
      },
      { checkpointId, hours }
    );
  }
}
