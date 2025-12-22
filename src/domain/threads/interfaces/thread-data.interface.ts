import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';

/**
 * Thread数据接口
 * 
 * 定义Thread实体的核心数据属性，用于确保domain实体和存储模型之间的类型一致性
 */
export interface ThreadData {
  /**
   * 线程ID
   */
  readonly id: ID;

  /**
   * 会话ID
   */
  readonly sessionId: ID;

  /**
   * 工作流ID（可选）
   */
  readonly workflowId?: ID;

  /**
   * 线程状态
   */
  readonly status: ThreadStatus;

  /**
   * 线程优先级
   */
  readonly priority: ThreadPriority;

  /**
   * 线程标题（可选）
   */
  readonly title?: string;

  /**
   * 线程描述（可选）
   */
  readonly description?: string;

  /**
   * 元数据
   */
  readonly metadata: Record<string, unknown>;

  /**
   * 创建时间
   */
  readonly createdAt: Timestamp;

  /**
   * 更新时间
   */
  readonly updatedAt: Timestamp;

  /**
   * 版本号
   */
  readonly version: Version;

  /**
   * 开始时间（可选）
   */
  readonly startedAt?: Timestamp;

  /**
   * 完成时间（可选）
   */
  readonly completedAt?: Timestamp;

  /**
   * 错误信息（可选）
   */
  readonly errorMessage?: string;

  /**
   * 是否已删除
   */
  readonly isDeleted: boolean;
}

/**
 * Thread数据构建器接口
 * 
 * 用于创建ThreadData实例
 */
export interface ThreadDataBuilder {
  /**
   * 构建ThreadData实例
   */
  build(): ThreadData;
}

/**
 * Thread数据验证器接口
 * 
 * 用于验证ThreadData的有效性
 */
export interface ThreadDataValidator {
  /**
   * 验证ThreadData的有效性
   * @param data Thread数据
   */
  validate(data: ThreadData): void;
}

/**
 * Thread数据转换器接口
 * 
 * 用于在不同表示形式之间转换Thread数据
 */
export interface ThreadDataConverter {
  /**
   * 将ThreadData转换为原始数据格式
   * @param data Thread数据
   */
  toRawData(data: ThreadData): Record<string, unknown>;

  /**
   * 从原始数据格式创建ThreadData
   * @param rawData 原始数据
   */
  fromRawData(rawData: Record<string, unknown>): ThreadData;
}