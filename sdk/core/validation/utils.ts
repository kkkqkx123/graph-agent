/**
 * 验证辅助函数
 * 提供通用的验证逻辑，减少重复代码
 */

import { z } from 'zod';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 验证节点配置
 * @param config 配置对象
 * @param schema zod schema
 * @param nodeId 节点ID
 * @param nodeType 节点类型
 * @returns 验证结果
 */
export function validateNodeConfig<T>(
  config: any,
  schema: z.ZodType<T>,
  nodeId: string,
  nodeType: string
): Result<T, ConfigurationValidationError[]> {
  const result = schema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues.map(issue =>
      new ConfigurationValidationError(issue.message, {
        configType: 'node',
        configPath: `node.${nodeId}.config.${issue.path.join('.')}`
      })
    );
    return err(errors);
  }
  return ok(result.data);
}

/**
 * 验证节点类型
 * @param node 节点定义
 * @param expectedType 期望的节点类型
 * @returns 验证结果
 */
export function validateNodeType(
  node: any,
  expectedType: string
): Result<void, ConfigurationValidationError[]> {
  if (node.type !== expectedType) {
    return err([new ConfigurationValidationError(
      `Invalid node type for ${expectedType} validator: ${node.type}`,
      {
        configType: 'node',
        configPath: `node.${node.id}`
      }
    )]);
  }
  return ok(undefined);
}

/**
 * 验证配置对象
 * @param config 配置对象
 * @param schema zod schema
 * @param configPath 配置路径
 * @param configType 配置类型
 * @returns 验证结果
 */
export function validateConfig<T>(
  config: any,
  schema: z.ZodType<T>,
  configPath: string,
  configType: 'tool' | 'workflow' | 'node' | 'trigger' | 'edge' | 'variable' | 'script' | 'schema' | 'llm' = 'schema'
): Result<T, ConfigurationValidationError[]> {
  const result = schema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues.map(issue =>
      new ConfigurationValidationError(issue.message, {
        configType,
        configPath: `${configPath}.${issue.path.join('.')}`
      })
    );
    return err(errors);
  }
  return ok(result.data);
}

/**
 * 将 zod 错误转换为验证错误数组
 * @param error zod 错误
 * @param prefix 字段路径前缀
 * @param configType 配置类型
 * @returns 验证错误数组
 */
export function convertZodError(
  error: z.ZodError,
  prefix?: string,
  configType: 'tool' | 'workflow' | 'node' | 'trigger' | 'edge' | 'variable' | 'script' | 'schema' | 'llm' = 'schema'
): ConfigurationValidationError[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0
      ? (prefix ? `${prefix}.${issue.path.join('.')}` : issue.path.join('.'))
      : prefix;
    return new ConfigurationValidationError(issue.message, {
      configType,
      configPath: field
    });
  });
}
