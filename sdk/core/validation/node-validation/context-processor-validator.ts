/**
 * ContextProcessor节点验证函数
 * 提供ContextProcessor节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ConfigurationValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';

/**
 * LLM消息schema
 */
const llmMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.any()
});

/**
 * 截断操作配置schema
 */
const truncateConfigSchema = z.object({
  keepFirst: z.number().min(0).optional(),
  keepLast: z.number().min(0).optional(),
  removeFirst: z.number().min(0).optional(),
  removeLast: z.number().min(0).optional(),
  range: z.object({
    start: z.number().min(0),
    end: z.number().min(0)
  }).refine(data => data.start < data.end, {
    message: 'Range start must be less than end'
  }).optional()
}).refine(data =>
  data.keepFirst !== undefined ||
  data.keepLast !== undefined ||
  data.removeFirst !== undefined ||
  data.removeLast !== undefined ||
  data.range !== undefined,
  {
    message: 'At least one truncate option must be specified'
  }
);

/**
 * 插入操作配置schema
 */
const insertConfigSchema = z.object({
  position: z.number().min(-1),
  messages: z.array(llmMessageSchema).min(1, 'Messages array cannot be empty')
});

/**
 * 替换操作配置schema
 */
const replaceConfigSchema = z.object({
  index: z.number().min(0),
  message: llmMessageSchema
});

/**
 * 清空操作配置schema
 */
const clearConfigSchema = z.object({
  keepSystemMessage: z.boolean().optional()
});

/**
 * 过滤操作配置schema
 */
const filterConfigSchema = z.object({
  roles: z.array(z.enum(['system', 'user', 'assistant', 'tool'])).optional(),
  contentContains: z.array(z.string()).min(1).optional(),
  contentExcludes: z.array(z.string()).min(1).optional()
}).refine(data =>
  data.roles !== undefined ||
  data.contentContains !== undefined ||
  data.contentExcludes !== undefined,
  {
    message: 'At least one filter condition must be specified'
  }
);

/**
 * ContextProcessor节点配置schema
 */
const contextProcessorNodeConfigSchema = z.object({
  version: z.number().optional(),
  operation: z.enum(['truncate', 'insert', 'replace', 'clear', 'filter']),
  truncate: truncateConfigSchema.optional(),
  insert: insertConfigSchema.optional(),
  replace: replaceConfigSchema.optional(),
  clear: clearConfigSchema.optional(),
  filter: filterConfigSchema.optional()
}).refine(data => {
  // 根据操作类型验证必需的配置字段
  const requiredFieldMap: Record<string, string> = {
    'truncate': 'truncate',
    'insert': 'insert',
    'replace': 'replace',
    'clear': 'clear',
    'filter': 'filter'
  };
  const requiredField = requiredFieldMap[data.operation];
  return requiredField ? data[requiredField as keyof typeof data] !== undefined : false;
}, {
  message: 'Required configuration field for the operation is missing',
  path: ['operation']
});

/**
 * 验证ContextProcessor节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateContextProcessorNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.CONTEXT_PROCESSOR) {
    return err([new ConfigurationValidationError(`Invalid node type for context processor validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = contextProcessorNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid context processor node configuration', {
        configType: 'node',
        configPath: `node.${node.id}.config`
      })]);
    }
    return err([new ConfigurationValidationError(error.message, {
      configType: 'node',
      configPath: `node.${node.id}.config.${error.path.join('.')}`
    })]);
  }
  return ok(node);
}