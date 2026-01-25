import { ID } from '../../../domain/common/value-objects/id';
import { Thread, ThreadProps } from '../../../domain/threads/entities/thread';
import { State } from '../../../domain/state/entities/state';
import { StateId } from '../../../domain/state/value-objects/state-id';
import { StateEntityType } from '../../../domain/state/value-objects/state-entity-type';
import { DeletionStatus } from '../../../domain/common/value-objects/deletion-status';
import { Metadata } from '../../../domain/common/value-objects/metadata';
import { Version } from '../../../domain/common/value-objects/version';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';

/**
 * 检查点序列化工具类
 *
 * 提供检查点相关的序列化和反序列化功能
 * 专门用于 Checkpoint 模块的 Thread 状态序列化
 */
export class CheckpointSerializationUtils {
  /**
   * 序列化 Thread 完整状态
   * 包含 Thread 的所有属性和完整的 State 实体
   */
  static serializeThreadState(thread: Thread): Record<string, unknown> {
    return {
      // Thread 基本信息
      threadId: thread.id.value,
      sessionId: thread.sessionId.value,
      workflowId: thread.workflowId.value,
      title: thread.title,
      description: thread.description,
      // Thread 状态（包含完整 State）
      status: thread.status,
      execution: thread.execution,

      // 完整序列化 State 实体
      state: {
        data: thread.state.data.toRecord(),
        metadata: thread.state.metadata.toRecord(),
        version: thread.state.version.toString(),
        createdAt: thread.state.createdAt.toISOString(),
        updatedAt: thread.state.updatedAt.toISOString(),
      },

      // Thread 元数据
      metadata: thread.metadata.toRecord(),

      // 时间戳
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      version: thread.version.toString(),
    };
  }

  /**
   * 反序列化 Thread 状态
   * 从序列化数据重建 Thread 对象属性
   */
  static deserializeThreadState(stateData: Record<string, unknown>): Partial<ThreadProps> {
    return {
      id: ID.fromString(stateData['threadId'] as string),
      sessionId: ID.fromString(stateData['sessionId'] as string),
      workflowId: ID.fromString(stateData['workflowId'] as string),
      title: stateData['title'] as string,
      description: stateData['description'] as string,

      // 反序列化 State
      state: State.fromProps({
        id: StateId.generate(), // 创建新的 State ID
        entityId: ID.fromString(stateData['threadId'] as string),
        entityType: StateEntityType.thread(),
        data: (stateData['state'] as any).data,
        metadata: (stateData['state'] as any).metadata,
        version: Version.fromString((stateData['state'] as any).version),
        createdAt: Timestamp.fromString((stateData['state'] as any).createdAt),
        updatedAt: Timestamp.fromString((stateData['state'] as any).updatedAt),
      }),

      metadata: Metadata.create(stateData['metadata'] as Record<string, unknown>),
      deletionStatus: DeletionStatus.active(), // 恢复时默认为活跃状态
      createdAt: Timestamp.fromString(stateData['createdAt'] as string),
      updatedAt: Timestamp.fromString(stateData['updatedAt'] as string),
      version: Version.fromString(stateData['version'] as string),
    };
  }
}