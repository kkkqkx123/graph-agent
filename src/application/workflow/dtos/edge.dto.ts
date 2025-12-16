/**
 * 边DTO
 */
export interface EdgeDto {
  /** 边ID */
  id: string;
  /** 图ID */
  graphId: string;
  /** 边类型 */
  type: string;
  /** 源节点ID */
  fromNodeId: string;
  /** 目标节点ID */
  toNodeId: string;
  /** 条件表达式 */
  condition?: string;
  /** 权重 */
  weight?: number;
  /** 边属性 */
  properties: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}
