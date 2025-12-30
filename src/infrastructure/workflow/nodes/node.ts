/**
 * Infrastructure层Node模块
 *
 * 注意：Node实体已迁移到domain层（src/domain/workflow/entities/node.ts）
 * 此文件仅保留向后兼容的导出，建议直接使用domain层的Node实体
 */

// 重新导出domain层的Node实体和相关类型
export {
  Node,
  NodeProps,
  NodeContext,
  WorkflowExecutionContext,
  NodeExecutionResult,
  NodeMetadata,
  NodeParameter,
  ValidationResult
} from '../../../domain/workflow/entities/node';