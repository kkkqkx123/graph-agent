/**
 * Schema定义导出
 * 集中管理所有模块的Schema定义
 */

export { LLMSchema } from './llm-schema';
export { ToolSchema } from './tool-schema';
export { PromptSchema } from './prompt-schema';
export { PoolSchema } from './pool-schema';
export { TaskGroupSchema } from './task-group-schema';
export { WorkflowFunctionSchema } from './workflow-function-schema';

/**
 * 所有Schema的映射表
 */
export const ALL_SCHEMAS = {
  llm: () => import('./llm-schema').then(m => m.LLMSchema),
  tools: () => import('./tool-schema').then(m => m.ToolSchema),
  prompts: () => import('./prompt-schema').then(m => m.PromptSchema),
  pool: () => import('./pool-schema').then(m => m.PoolSchema),
  taskGroup: () => import('./task-group-schema').then(m => m.TaskGroupSchema),
  workflow_functions: () => import('./workflow-function-schema').then(m => m.WorkflowFunctionSchema)
};

/**
 * 同步获取Schema（用于初始化）
 */
export const SCHEMA_MAP = {
  llm: require('./llm-schema').LLMSchema,
  tools: require('./tool-schema').ToolSchema,
  prompts: require('./prompt-schema').PromptSchema,
  pool: require('./pool-schema').PoolSchema,
  taskGroup: require('./task-group-schema').TaskGroupSchema,
  workflow_functions: require('./workflow-function-schema').WorkflowFunctionSchema
};