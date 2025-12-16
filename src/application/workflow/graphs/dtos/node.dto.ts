/**
 * 节点DTO
 */
export interface NodeDto {
  /** 节点ID */
  id: string;
  /** 图ID */
  graphId: string;
  /** 节点类型 */
  type: string;
  /** 节点名称 */
  name?: string;
  /** 节点描述 */
  description?: string;
  /** 节点位置 */
  position?: {
    x: number;
    y: number;
  };
  /** 节点属性 */
  properties: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}
