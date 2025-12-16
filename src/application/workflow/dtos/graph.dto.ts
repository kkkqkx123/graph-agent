/**
 * 图DTO
 */
import { NodeDto } from './node.dto';
import { EdgeDto } from './edge.dto';

export { NodeDto, EdgeDto };

export interface GraphDto {
  /** 图ID */
  id: string;
  /** 图名称 */
  name: string;
  /** 图描述 */
  description?: string;
  /** 节点列表 */
  nodes: NodeDto[];
  /** 边列表 */
  edges: EdgeDto[];
  /** 图版本 */
  version: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 创建者ID */
  createdBy?: string;
  /** 更新者ID */
  updatedBy?: string;
}

/**
 * 图摘要DTO
 */
export interface GraphSummaryDto {
  /** 图ID */
  id: string;
  /** 图名称 */
  name: string;
  /** 节点数量 */
  nodeCount: number;
  /** 边数量 */
  edgeCount: number;
  /** 图类型 */
  type?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

