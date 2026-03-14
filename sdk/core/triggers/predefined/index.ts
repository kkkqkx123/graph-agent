/**
 * 预定义触发器模板和工作流导出
 *
 * 提供SDK内置的上下文压缩触发器模板和工作流定义
 */

export {
  // 常量
  CONTEXT_COMPRESSION_TRIGGER_NAME,
  CONTEXT_COMPRESSION_WORKFLOW_ID,
  DEFAULT_COMPRESSION_PROMPT,

  // 工厂函数
  createContextCompressionTriggerTemplate,
  createContextCompressionWorkflow,
  createCustomContextCompressionTrigger,
  createCustomContextCompressionWorkflow
} from './context-compression.js';

// 导出类型
export type {
  TriggerTemplate,
  WorkflowDefinition
} from '@modular-agent/types';