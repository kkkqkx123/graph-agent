/**
 * 节点属性类型定义
 */

/**
 * 节点动态属性类型
 */
export interface NodeProperty {
  /** 属性键 */
  key: string;
  /** 属性值 */
  value: any;
  /** 属性类型 */
  type: string;
  /** 是否必需 */
  required: boolean;
  /** 验证规则 */
  validation?: any;
}