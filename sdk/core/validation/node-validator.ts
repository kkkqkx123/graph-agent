/**
 * 节点验证器
 * 负责节点配置的验证
 * 使用 node-validation 目录中的验证函数进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { validateNodeByType } from './node-validation';

/**
 * 节点schema（基本信息验证）
 */
const nodeSchema: z.ZodType<Node> = z.object({
  id: z.string().min(1, 'Node ID is required'),
  type: z.custom<NodeType>((val): val is NodeType =>
    Object.values(NodeType).includes(val as NodeType)
  ),
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
  validateNode(node: Node): Result<Node, ConfigurationValidationError[]> {
    // 首先验证基本信息
    const basicResult = nodeSchema.safeParse(node);
    if (!basicResult.success) {
      return err(this.convertZodError(basicResult.error, 'node'));
    }

    // 然后验证节点配置
    const configResult = this.validateNodeConfig(node);
    if (configResult.isErr()) {
      return configResult;
    }

    return ok(node);
  }

  /**
   * 验证节点配置
   * @param node 节点
   * @returns 验证结果
   */
  private validateNodeConfig(node: Node): Result<Node, ConfigurationValidationError[]> {
    // 调用 node-validation 目录中的验证函数
    return validateNodeByType(node);
  }

  /**
   * 批量验证节点
   * @param nodes 节点数组
   * @returns 验证结果数组
   */
  validateNodes(nodes: Node[]): Result<Node, ConfigurationValidationError[]>[] {
    return nodes.map((node) => this.validateNode(node));
  }

  /**
   * 将zod错误转换为ValidationResult
   * @param error zod错误
   * @param prefix 字段路径前缀
   * @returns ValidationResult
   */
  private convertZodError(error: z.ZodError, prefix?: string): ConfigurationValidationError[] {
    const errors: ConfigurationValidationError[] = error.issues.map((issue) => {
      const field = issue.path.length > 0
        ? (prefix ? `${prefix}.${issue.path.join('.')}` : issue.path.join('.'))
        : prefix;
      return new ConfigurationValidationError(issue.message, {
        configPath: field,
        configType: 'node'
      });
    });
    return errors;
  }
}