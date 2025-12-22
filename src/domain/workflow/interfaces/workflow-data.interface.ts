import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { WorkflowConfig } from '../value-objects/workflow-config';
import { Node } from '../entities/nodes/base/node';
import { Edge } from '../entities/edges/base/edge';

/**
 * Workflow数据接口
 * 
 * 定义Workflow实体的核心数据属性，用于确保domain实体和存储模型之间的类型一致性
 */
export interface WorkflowData {
  /**
   * 工作流ID
   */
  readonly id: ID;

  /**
   * 工作流名称
   */
  readonly name: string;

  /**
   * 工作流描述（可选）
   */
  readonly description?: string;

  /**
   * 工作流状态
   */
  readonly status: WorkflowStatus;

  /**
   * 工作流类型
   */
  readonly type: WorkflowType;

  /**
   * 工作流配置
   */
  readonly config: WorkflowConfig;

  /**
   * 节点映射
   */
  readonly nodes: Map<string, Node>;

  /**
   * 边映射
   */
  readonly edges: Map<string, Edge>;

  /**
   * 图定义（可选）
   */
  readonly definition?: Record<string, unknown>;

  /**
   * 布局信息（可选）
   */
  readonly layout?: Record<string, unknown>;

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
   * 标签列表
   */
  readonly tags: string[];

  /**
   * 元数据
   */
  readonly metadata: Record<string, unknown>;

  /**
   * 是否已删除
   */
  readonly isDeleted: boolean;

  /**
   * 创建者ID（可选）
   */
  readonly createdBy?: ID;

  /**
   * 更新者ID（可选）
   */
  readonly updatedBy?: ID;
}

/**
 * Workflow数据构建器接口
 * 
 * 用于创建WorkflowData实例
 */
export interface WorkflowDataBuilder {
  /**
   * 构建WorkflowData实例
   */
  build(): WorkflowData;
}

/**
 * Workflow数据验证器接口
 * 
 * 用于验证WorkflowData的有效性
 */
export interface WorkflowDataValidator {
  /**
   * 验证WorkflowData的有效性
   * @param data Workflow数据
   */
  validate(data: WorkflowData): void;
}

/**
 * Workflow数据转换器接口
 * 
 * 用于在不同表示形式之间转换Workflow数据
 */
export interface WorkflowDataConverter {
  /**
   * 将WorkflowData转换为原始数据格式
   * @param data Workflow数据
   */
  toRawData(data: WorkflowData): Record<string, unknown>;

  /**
   * 从原始数据格式创建WorkflowData
   * @param rawData 原始数据
   */
  fromRawData(rawData: Record<string, unknown>): WorkflowData;
}