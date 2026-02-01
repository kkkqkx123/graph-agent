/**
 * 工作流验证器
 * 负责工作流定义的完整验证
 * 使用zod进行声明式验证
 */

import { z } from 'zod';
import type { WorkflowDefinition } from '../../types/workflow';
import type { Node } from '../../types/node';
import type { Edge } from '../../types/edge';
import { NodeType } from '../../types/node';
import { ValidationError, type ValidationResult } from '../../types/errors';
import { validateNodeByType } from './node-validation';
import { validateHooks } from './hook-validation';
import { SelfReferenceValidationStrategy } from './strategies/self-reference-validation-strategy';

/**
 * 工作流变量schema
 */
const workflowVariableSchema = z.object({
  name: z.string().min(1, 'Variable name is required'),
  type: z.enum(['number', 'string', 'boolean', 'array', 'object']),
  defaultValue: z.any().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  readonly: z.boolean().optional(),
  scope: z.enum(['global', 'thread', 'subgraph', 'loop']).optional()
});

/**
 * 重试策略schema
 */
const retryPolicySchema = z.object({
  maxRetries: z.number().min(0, 'Max retries must be non-negative').optional(),
  retryDelay: z.number().min(0, 'Retry delay must be non-negative').optional(),
  backoffMultiplier: z.number().positive().optional()
});

/**
 * 错误处理策略schema
 */
const errorHandlingSchema = z.object({
  stopOnError: z.boolean().optional(),
  continueOnError: z.boolean().optional(),
  fallbackNodeId: z.string().optional()
});

/**
 * 工作流配置schema
 */
const workflowConfigSchema = z.object({
  timeout: z.number().min(0, 'Timeout must be non-negative').optional(),
  maxSteps: z.number().min(0, 'Max steps must be non-negative').optional(),
  enableCheckpoints: z.boolean().optional(),
  retryPolicy: retryPolicySchema.optional(),
  errorHandling: errorHandlingSchema.optional()
});

/**
 * 工作流元数据schema
 */
const workflowMetadataSchema = z.object({
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional()
});

/**
 * 工作流定义schema（基本信息）
 */
const workflowBasicSchema = z.object({
  id: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  version: z.string().min(1, 'Workflow version is required'),
  createdAt: z.number(),
  updatedAt: z.number()
});

/**
 * 工作流验证器类
 */
export class WorkflowValidator {
  /**
   * 验证工作流定义
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  validate(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationError[] = [];

    // 验证基本信息
    const basicResult = this.validateBasicInfo(workflow);
    errors.push(...basicResult.errors);

    // 验证节点
    const nodesResult = this.validateNodes(workflow);
    errors.push(...nodesResult.errors);

    // 验证边
    const edgesResult = this.validateEdges(workflow);
    errors.push(...edgesResult.errors);

    // 验证结构
    const structureResult = this.validateStructure(workflow);
    errors.push(...structureResult.errors);

    // 验证配置
    const configResult = this.validateConfig(workflow);
    errors.push(...configResult.errors);

    // 验证自引用
    const selfReferenceResult = this.validateSelfReferences(workflow);
    errors.push(...selfReferenceResult.errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证基本信息
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateBasicInfo(workflow: WorkflowDefinition): ValidationResult {
    const result = workflowBasicSchema.safeParse(workflow);
    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }
    return this.convertZodError(result.error, 'workflow');
  }

  /**
   * 验证节点
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateNodes(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationError[] = [];

    // 验证节点数组不为空
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push(new ValidationError('Workflow must have at least one node', 'workflow.nodes'));
      return { valid: false, errors, warnings: [] };
    }

    // 验证节点ID唯一性
    const nodeIds = new Set<string>();
    const startNodes: Node[] = [];
    const endNodes: Node[] = [];

    for (let i = 0; i < workflow.nodes.length; i++) {
      const node = workflow.nodes[i];
      if (!node) continue;

      const path = `workflow.nodes[${i}]`;

      // 验证节点基本字段
      if (!node.id || node.id === '') {
        errors.push(new ValidationError('Node ID is required', `${path}.id`));
      }
      if (!node.name || node.name === '') {
        errors.push(new ValidationError('Node name is required', `${path}.name`));
      }
      if (!node.type) {
        errors.push(new ValidationError('Node type is required', `${path}.type`));
      }

      // 检查节点ID唯一性
      if (node.id && nodeIds.has(node.id)) {
        errors.push(new ValidationError(`Node ID must be unique: ${node.id}`, `${path}.id`));
      }
      if (node.id) {
        nodeIds.add(node.id);
      }

      // 验证节点配置（使用节点验证函数）
      if (node.id && node.type) {
        try {
          validateNodeByType(node);
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(error);
          } else {
            errors.push(new ValidationError(
              error instanceof Error ? error.message : String(error),
              `${path}.config`
            ));
          }
        }
      }

      // 验证节点Hooks
      if (node.id && node.hooks && node.hooks.length > 0) {
        try {
          validateHooks(node.hooks, node.id);
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(error);
          } else {
            errors.push(new ValidationError(
              error instanceof Error ? error.message : String(error),
              `${path}.hooks`
            ));
          }
        }
      }

      // 统计START、END、START_FROM_TRIGGER和CONTINUE_FROM_TRIGGER节点
      if (node.type === NodeType.START) {
        startNodes.push(node);
      } else if (node.type === NodeType.END) {
        endNodes.push(node);
      }
    }

    // 检查是否为触发子工作流
    const hasStartFromTrigger = workflow.nodes.some(n => n.type === NodeType.START_FROM_TRIGGER);
    const hasContinueFromTrigger = workflow.nodes.some(n => n.type === NodeType.CONTINUE_FROM_TRIGGER);

    if (hasStartFromTrigger || hasContinueFromTrigger) {
      // 触发子工作流：必须包含START_FROM_TRIGGER和CONTINUE_FROM_TRIGGER，不能包含START和END
      if (!hasStartFromTrigger) {
        errors.push(new ValidationError('Triggered subgraph must have exactly one START_FROM_TRIGGER node', 'workflow.nodes'));
      }
      if (!hasContinueFromTrigger) {
        errors.push(new ValidationError('Triggered subgraph must have exactly one CONTINUE_FROM_TRIGGER node', 'workflow.nodes'));
      }
      if (startNodes.length > 0) {
        errors.push(new ValidationError('Triggered subgraph cannot contain START node', 'workflow.nodes'));
      }
      if (endNodes.length > 0) {
        errors.push(new ValidationError('Triggered subgraph cannot contain END node', 'workflow.nodes'));
      }
    } else {
      // 普通工作流：必须包含START和END节点
      if (startNodes.length === 0) {
        errors.push(new ValidationError('Workflow must have exactly one START node', 'workflow.nodes'));
      } else if (startNodes.length > 1) {
        errors.push(new ValidationError('Workflow must have exactly one START node', 'workflow.nodes'));
      }

      if (endNodes.length === 0) {
        errors.push(new ValidationError('Workflow must have exactly one END node', 'workflow.nodes'));
      } else if (endNodes.length > 1) {
        errors.push(new ValidationError('Workflow must have exactly one END node', 'workflow.nodes'));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证边
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateEdges(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const edgeIds = new Set<string>();
    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    for (let i = 0; i < workflow.edges.length; i++) {
      const edge = workflow.edges[i];
      if (!edge) continue;

      const path = `workflow.edges[${i}]`;

      // 检查边ID唯一性
      if (edgeIds.has(edge.id)) {
        errors.push(new ValidationError(`Edge ID must be unique: ${edge.id}`, `${path}.id`));
      }
      edgeIds.add(edge.id);

      // 检查边基本信息
      if (!edge.id) {
        errors.push(new ValidationError('Edge ID is required', `${path}.id`));
      }

      if (!edge.sourceNodeId) {
        errors.push(new ValidationError('Edge source node ID is required', `${path}.sourceNodeId`));
      } else if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push(new ValidationError(`Edge source node not found: ${edge.sourceNodeId}`, `${path}.sourceNodeId`));
      }

      if (!edge.targetNodeId) {
        errors.push(new ValidationError('Edge target node ID is required', `${path}.targetNodeId`));
      } else if (!nodeIds.has(edge.targetNodeId)) {
        errors.push(new ValidationError(`Edge target node not found: ${edge.targetNodeId}`, `${path}.targetNodeId`));
      }

      if (!edge.type) {
        errors.push(new ValidationError('Edge type is required', `${path}.type`));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证结构
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateStructure(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const nodeMap = new Map<string, Node>();

    // 构建映射
    for (const node of workflow.nodes) {
      nodeMap.set(node.id, node);
    }

    // 检查START节点入度
    const startNode = Array.from(nodeMap.values()).find(n => n.type === NodeType.START);
    if (startNode && startNode.incomingEdgeIds.length > 0) {
      errors.push(new ValidationError('START node must have no incoming edges', `workflow.nodes[${startNode.id}].incomingEdgeIds`));
    }

    // 检查END节点出度
    const endNode = Array.from(nodeMap.values()).find(n => n.type === NodeType.END);
    if (endNode && endNode.outgoingEdgeIds.length > 0) {
      errors.push(new ValidationError('END node must have no outgoing edges', `workflow.nodes[${endNode.id}].outgoingEdgeIds`));
    }

    // 检查边的连接一致性
    for (const edge of workflow.edges) {
      const sourceNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);

      if (sourceNode && !sourceNode.outgoingEdgeIds.includes(edge.id)) {
        errors.push(new ValidationError(`Edge ${edge.id} not in source node's outgoing edges`, `workflow.edges[${edge.id}]`));
      }

      if (targetNode && !targetNode.incomingEdgeIds.includes(edge.id)) {
        errors.push(new ValidationError(`Edge ${edge.id} not in target node's incoming edges`, `workflow.edges[${edge.id}]`));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证配置
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateConfig(workflow: WorkflowDefinition): ValidationResult {
    if (!workflow.config) {
      return { valid: true, errors: [], warnings: [] };
    }

    const result = workflowConfigSchema.safeParse(workflow.config);
    if (result.success) {
      return { valid: true, errors: [], warnings: [] };
    }
    return this.convertZodError(result.error, 'workflow.config');
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

  /**
   * 验证自引用
   * 使用策略模式检测 SUBGRAPH 和 START_FROM_TRIGGER 节点的自引用
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateSelfReferences(workflow: WorkflowDefinition): ValidationResult {
    const errors = SelfReferenceValidationStrategy.validateNodes(
      workflow.nodes,
      workflow.id
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}