/**
 * 节点模板类型定义
 * 用于定义可重用的节点配置模板
 */

import type { ID, Metadata, Timestamp } from './common';
import { NodeType } from './node';
import type { NodeConfig } from './node';

/**
 * 节点模板
 * 预定义的节点配置模板，可在工作流中通过名称引用
 */
export interface NodeTemplate {
  /** 节点模板名称（唯一标识符） */
  name: string;
  /** 节点类型 */
  type: NodeType;
  /** 节点配置 */
  config: NodeConfig;
  /** 节点描述 */
  description?: string;
  /** 元数据 */
  metadata?: Metadata;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
}

/**
 * 节点引用配置
 * 在工作流中用于引用预定义的节点模板
 */
export interface NodeReferenceConfig {
  /** 引用的节点模板名称 */
  templateName: string;
  /** 节点ID（工作流中唯一） */
  nodeId: ID;
  /** 节点名称（工作流中显示，可选） */
  nodeName?: string;
  /** 配置覆盖（可选） */
  configOverride?: Partial<NodeConfig>;
}

/**
 * 节点模板摘要信息
 */
export interface NodeTemplateSummary {
  /** 节点模板名称 */
  name: string;
  /** 节点类型 */
  type: NodeType;
  /** 节点描述 */
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