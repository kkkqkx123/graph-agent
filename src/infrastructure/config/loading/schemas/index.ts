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

// 导入所有Schema用于注册
import { LLMSchema } from './llm-schema';
import { ToolSchema } from './tool-schema';
import { PromptSchema } from './prompt-schema';
import { PoolSchema } from './pool-schema';
import { TaskGroupSchema } from './task-group-schema';
import { WorkflowFunctionSchema } from './workflow-function-schema';

/**
 * 所有Schema的映射表
 * 用于动态加载和注册
 */
export const SCHEMA_MAP = {
  llm: LLMSchema,
  tools: ToolSchema,
  prompts: PromptSchema,
  pool: PoolSchema,
  taskGroup: TaskGroupSchema,
  workflow_functions: WorkflowFunctionSchema,
} as const;
