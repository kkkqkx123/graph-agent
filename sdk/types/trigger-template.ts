/**
 * TriggerTemplate 类型定义
 * 定义触发器模板的类型和结构，用于实现触发器配置的复用
 *
 * 设计原则：
 * - TriggerTemplate 专用于配置复用
 * - 支持跨工作流复用触发器配置
 * - 提供标准化接口
 * - 便于序列化和反序列化
 */

import type { ID, Timestamp, Metadata } from './common';
import type { TriggerCondition, TriggerAction } from './trigger';

/**
 * 触发器模板定义
 * 用于预定义触发器配置，支持在工作流中引用和复用
 */
export interface TriggerTemplate {
  /** 触发器模板名称（唯一标识符） */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 触发次数限制（0表示无限制） */
  maxTriggers?: number;
  /** 元数据 */
  metadata?: Metadata;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
}

/**
 * 触发器引用
 * 在工作流中引用预定义的触发器模板
 */
export interface TriggerReference {
  /** 引用的触发器模板名称 */
  templateName: string;
  /** 触发器ID（工作流中唯一） */
  triggerId: ID;
  /** 触发器名称（工作流中显示，可选） */
  triggerName?: string;
  /** 配置覆盖（可选） */
  configOverride?: TriggerConfigOverride;
}

/**
 * 触发器配置覆盖
 * 允许在引用模板时覆盖部分配置
 */
export interface TriggerConfigOverride {
  /** 条件覆盖 */
  condition?: Partial<TriggerCondition>;
  /** 动作覆盖 */
  action?: Partial<TriggerAction>;
  /** 是否启用覆盖 */
  enabled?: boolean;
  /** 触发次数限制覆盖 */
  maxTriggers?: number;
}

/**
 * 触发器模板摘要
 * 用于列表展示，不包含完整配置
 */
export interface TriggerTemplateSummary {
  /** 触发器模板名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
}

/**
 * 触发器模板过滤器
 * 用于查询触发器模板
 */
export interface TriggerTemplateFilter {
  /** 触发器模板名称 */
  name?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 搜索关键词 */
  keyword?: string;
}