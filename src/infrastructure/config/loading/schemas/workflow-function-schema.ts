/**
 * 工作流函数模块Schema定义
 * 基于现有的workflow-function-loader.ts实现
 */

import { z } from 'zod';

/**
 * 函数类型配置Schema
 */
const FunctionTypeConfigSchema = z.object({
  class_path: z.string(),
  description: z.string(),
  enabled: z.boolean()
});

/**
 * 函数集配置Schema
 */
const FunctionSetConfigSchema = z.object({
  description: z.string(),
  enabled: z.boolean(),
  functions: z.array(z.string())
});

/**
 * 工作流函数模块Schema
 */
export const WorkflowFunctionSchema = z.object({
  function_types: z.record(z.string(), FunctionTypeConfigSchema).optional(),
  function_sets: z.record(z.string(), FunctionSetConfigSchema).optional(),
  auto_discovery: z.object({}).optional(),
  _registry: z.string().optional()
});