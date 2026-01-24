/**
 * SessionMapper
 * 负责SessionModel与Session实体之间的转换
 */

import { BaseMapper } from './base-mapper';
import { Session } from '../../../domain/sessions/entities/session';
import { SessionModel } from '../models/session.model';
import { ID } from '../../../domain/common/value-objects/id';
import { SessionStatus } from '../../../domain/sessions/value-objects/session-status';
import { SessionConfig } from '../../../domain/sessions/value-objects/session-config';
import { SessionActivity } from '../../../domain/sessions/value-objects/session-activity';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { Metadata, DeletionStatus } from '../../../domain/common/value-objects';
import { ThreadCollection } from '../../../domain/sessions/value-objects/thread-collection';
import { SharedResources } from '../../../domain/sessions/value-objects/shared-resources';
import { ParallelStrategy } from '../../../domain/sessions/value-objects/parallel-strategy';
import { ExecutionError } from '../../../../common/exceptions';

export class SessionMapper implements BaseMapper<Session, SessionModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: SessionModel): Session {
    try {
      const lastActivityAt = Timestamp.create(model.updatedAt);
      const messageCount = (model.metadata?.messageCount as number) || 0;
      const threadCount = (model.metadata?.threadCount as number) || 0;

      const activity = SessionActivity.create(lastActivityAt, messageCount, threadCount);
      const sessionId = new ID(model.id);

      // 从元数据中获取并行策略类型
      const parallelStrategyType =
        (model.metadata?.parallelStrategy as 'sequential' | 'parallel' | 'hybrid') || 'sequential';
      let parallelStrategy: ParallelStrategy;

      switch (parallelStrategyType) {
        case 'parallel':
          parallelStrategy = ParallelStrategy.parallel();
          break;
        case 'hybrid':
          parallelStrategy = ParallelStrategy.hybrid();
          break;
        default:
          parallelStrategy = ParallelStrategy.sequential();
      }

      const sessionData = {
        id: sessionId,
        userId: model.userId ? new ID(model.userId) : undefined,
        title: (model.metadata?.title as string) || undefined,
        status: SessionStatus.fromString(model.state),
        config: SessionConfig.create(model.context || {}),
        activity: activity,
        metadata: Metadata.create(model.metadata || {}),
        threads: ThreadCollection.empty(), // 从数据库恢复时，线程需要单独加载
        sharedResources: SharedResources.empty(), // 从数据库恢复时，共享资源需要单独加载
        parallelStrategy: parallelStrategy,
        deletionStatus: DeletionStatus.fromBoolean((model.metadata?.isDeleted as boolean) || false),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
      };

      return Session.fromProps(sessionData);
    } catch (error) {
      throw new ExecutionError(`Session模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: Session): SessionModel {
    try {
      const model = new SessionModel();

      model.id = entity.sessionId.value;
      model.userId = entity.userId ? entity.userId.value : undefined;
      model.state = entity.status.getValue();
      model.context = entity.config.value;
      model.version = entity.version.getValue();
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();

      model.metadata = {
        title: entity.title,
        messageCount: entity.messageCount,
        threadCount: entity.threadCount,
        isDeleted: entity.isDeleted(),
        config: entity.config.value,
        parallelStrategy: entity.parallelStrategy,
        ...entity.metadata.toRecord(),
      };

      model.threadIds = [];

      return model;
    } catch (error) {
      throw new ExecutionError(`Session实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}