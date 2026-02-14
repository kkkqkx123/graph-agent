/**
 * 工作流元数据类型定义
 */

/**
 * 工作流元数据类型
 * 用于存储扩展信息
 */
export interface WorkflowMetadata {
  /** 作者信息 */
  author?: string;
  /** 标签数组 */
  tags?: string[];
  /** 分类 */
  category?: string;
}