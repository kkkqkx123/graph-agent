/**
 * 工作流配置Schema定义
 * 支持子工作流、参数化配置、节点和边定义
 */

import { z } from 'zod';

/**
 * Wrapper配置Schema
 * 支持结构化的wrapper配置，替代字符串格式
 */
export const WrapperConfigSchema = z.object({
  type: z.enum(['pool', 'group', 'direct']),
  name: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
}).refine(
  (data) => {
    // 验证必需字段
    if (data.type === 'pool' || data.type === 'group') {
      return data.name !== undefined;
    }
    if (data.type === 'direct') {
      return data.provider !== undefined && data.model !== undefined;
    }
    return false;
  },
  {
    message: 'wrapper配置验证失败：pool/group类型需要name字段，direct类型需要provider和model字段',
  }
);

/**
 * 参数定义Schema
 */
export const ParameterDefinitionSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  default: z.any().optional(),
  description: z.string(),
  required: z.boolean().optional().default(false),
});

/**
 * 提示词配置Schema
 */
export const PromptConfigSchema = z.object({
  type: z.enum(['direct', 'template']),
  content: z.string(),
});

/**
 * 节点配置Schema
 */
export const NodeConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  config: z.record(z.string(), z.any()),
});

/**
 * 边配置Schema
 */
export const EdgeConfigSchema = z.object({
  from: z.string(),
  to: z.string(),
  condition: z.string().optional(),
});

/**
 * 工作流配置Schema
 *
 * 注意：子工作流合并后，所有节点共享同一个上下文，不需要显式的输入输出映射。
 * 节点之间通过上下文变量传递数据（如 context.getVariable('llm_result')）。
 */
export const WorkflowConfigSchema = z.object({
  workflow: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    version: z.string(),
    
    // 可配置参数（用于在具体工作流中通过参数修改内部逻辑）
    parameters: z.record(z.string(), ParameterDefinitionSchema).optional(),
    
    // 节点定义
    nodes: z.array(NodeConfigSchema),
    
    // 边定义
    edges: z.array(EdgeConfigSchema),
  }),
});

/**
 * 子工作流引用配置Schema
 */
export const SubWorkflowReferenceConfigSchema = z.object({
  reference_id: z.string(),
  workflow_id: z.string(),
  
  // 参数覆盖
  parameters: z.record(z.string(), z.any()).optional(),
  
  // 输入映射
  input_mapping: z.record(z.string(), z.string()).optional(),
  
  // 输出映射
  output_mapping: z.record(z.string(), z.string()).optional(),
});

/**
 * 导出类型
 */
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;
export type ParameterDefinition = z.infer<typeof ParameterDefinitionSchema>;
export type NodeConfig = z.infer<typeof NodeConfigSchema>;
export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;
export type SubWorkflowReferenceConfig = z.infer<typeof SubWorkflowReferenceConfigSchema>;
export type WrapperConfig = z.infer<typeof WrapperConfigSchema>;
