import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { SessionStatus } from '../value-objects/session-status';
import { SessionConfig } from '../value-objects/session-config';

/**
 * Session数据接口
 * 
 * 定义Session实体的核心数据属性，用于确保domain实体和存储模型之间的类型一致性
 */
export interface SessionData {
  /**
   * 会话ID
   */
  readonly id: ID;

  /**
   * 用户ID（可选）
   */
  readonly userId?: ID;

  /**
   * 会话标题（可选）
   */
  readonly title?: string;

  /**
   * 会话状态
   */
  readonly status: SessionStatus;

  /**
   * 会话配置
   */
  readonly config: SessionConfig;

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
   * 最后活动时间
   */
  readonly lastActivityAt: Timestamp;

  /**
   * 消息数量
   */
  readonly messageCount: number;

  /**
   * 是否已删除
   */
  readonly isDeleted: boolean;
}

/**
 * Session数据构建器接口
 * 
 * 用于创建SessionData实例
 */
export interface SessionDataBuilder {
  /**
   * 构建SessionData实例
   */
  build(): SessionData;
}

/**
 * Session数据验证器接口
 * 
 * 用于验证SessionData的有效性
 */
export interface SessionDataValidator {
  /**
   * 验证SessionData的有效性
   * @param data Session数据
   */
  validate(data: SessionData): void;
}

/**
 * Session数据转换器接口
 * 
 * 用于在不同表示形式之间转换Session数据
 */
export interface SessionDataConverter {
  /**
   * 将SessionData转换为原始数据格式
   * @param data Session数据
   */
  toRawData(data: SessionData): Record<string, unknown>;

  /**
   * 从原始数据格式创建SessionData
   * @param rawData 原始数据
   */
  fromRawData(rawData: Record<string, unknown>): SessionData;
}