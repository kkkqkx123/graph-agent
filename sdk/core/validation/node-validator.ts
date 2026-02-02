/**
 * 节点验证器
 * 负责节点配置的验证
 * 使用 node-validation 目录中的验证函数进行验证
 */

import { z } from 'zod';
import type { Node } from '../../types/node';
import { NodeType } from '../../types/node';
import { ValidationError, type ValidationResult } from '../../types/errors';
import { validateNodeByType } from './node-validation';

/**
 * 节点schema（基本信息验证）
 */
const nodeSchema: z.ZodType<Node> = z.object({
  id: z.string().min(1, 'Node ID is required'),
  type: z.nativeEnum(NodeType),
  name: z.string().min(1, 'Node name is required'),
  description: z.string().optional(),
  config: z.any(), // config将在后续验证中根据type进行验证
  metadata: z.record(z.string(), z.any()).optional(),
  outgoingEdgeIds: z.array(z.string()).default([]),
  incomingEdgeIds: z.array(z.string()).default([]),
  properties: z.array(z.any()).optional(),
  hooks: z.array(z.any()).optional()
});

/**
 * 节点验证器类
 */
export class NodeValidator {
  /**
   * 验证节点
   * @param node 节点
   * @returns 验证结果
   */
  validateNode(node: Node): ValidationResult {
    // 首先验证基本信息
    const basicResult = nodeSchema.safeParse(node);
    if (!basicResult.success) {
      return this.convertZodError(basicResult.error, 'node');
    }

    // 然后验证节点配置
    const configResult = this.validateNodeConfig(node);
    if (!configResult.valid) {
      return configResult;
    }

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * 验证节点配置
   * @param node 节点
   * @returns 验证结果
   */
  private validateNodeConfig(node: Node): ValidationResult {
    try {
      // 调用 node-validation 目录中的验证函数
      validateNodeByType(node);
      return { valid: true, errors: [], warnings: [] };
    } catch (error) {
      // 将 ValidationError 转换为 ValidationResult
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      // 处理其他类型的错误
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          `node.${node.id}.config`
        )],
        warnings: []
      };
    }
  }

  /**
   * 批量验证节点
   * @param nodes 节点数组
   * @returns 验证结果数组
   */
  validateNodes(nodes: Node[]): ValidationResult[] {
    return nodes.map((node) => this.validateNode(node));
  }

  /**
   * 将zod错误转换为ValidationResult
   * @param error zod错误
   * @param prefix 字段路径前缀
   * @returns ValidationResult
   */
  private convertZodError(error: z.ZodError, prefix?: string): ValidationResult {
    const errors: ValidationError[] = error.issues.map((issue) => {
      const field = issue.path.length > 0
        ? (prefix ? `${prefix}.${issue.path.join('.')}` : issue.path.join('.'))
        : prefix;
      return new ValidationError(issue.message, field);
    });
    return {
      valid: false,
      errors,
      warnings: []
    };
  }
}