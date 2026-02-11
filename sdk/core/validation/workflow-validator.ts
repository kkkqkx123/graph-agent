/**
 * 工作流定义验证器
 *
 * 职责范围：
 * - 验证工作流定义的数据完整性和基本约束
 * - 验证节点和边的基本字段、ID唯一性、引用完整性
 * - 验证节点配置、Hooks、工作流配置等
 * - 检测自引用问题
 *
 * 与 GraphValidator 的区别：
 * - WorkflowValidator 在工作流定义阶段验证，输入是 WorkflowDefinition
 * - GraphValidator 在图构建阶段验证，输入是 GraphData
 * - WorkflowValidator 专注于数据完整性验证（静态验证）
 * - GraphValidator 专注于图拓扑结构验证（动态验证）
 *
 * 验证时机：
 * - 在 GraphBuilder 构建图之前调用
 * - 在工作流注册、保存等场景中使用
 *
 * 不包含：
 * - 图拓扑结构验证（环检测、可达性分析等）
 * - FORK/JOIN配对验证
 * - START/END节点数量验证（由GraphValidator处理）
 */

import { z } from 'zod';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils/result-utils';
import { validateNodeByType } from './node-validation';
import { validateHooks } from './hook-validator';
import { validateTriggers } from './trigger-validator';
import { SelfReferenceValidationStrategy } from './strategies/self-reference-validation-strategy';
import { ErrorHandlingStrategy } from '@modular-agent/types/thread';

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
  strategy: z.custom<ErrorHandlingStrategy>(
    (val): val is ErrorHandlingStrategy =>
      Object.values(ErrorHandlingStrategy).includes(val as ErrorHandlingStrategy)
  )
});

/**
 * 工具审批配置schema
 */
const toolApprovalConfigSchema = z.object({
  autoApprovedTools: z.array(z.string())
});

/**
 * 工作流配置schema
 */
const workflowConfigSchema = z.object({
  timeout: z.number().min(0, 'Timeout must be non-negative').optional(),
  maxSteps: z.number().min(0, 'Max steps must be non-negative').optional(),
  enableCheckpoints: z.boolean().optional(),
  retryPolicy: retryPolicySchema.optional(),
  errorHandling: errorHandlingSchema.optional(),
  toolApproval: toolApprovalConfigSchema.optional()
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
  validate(workflow: WorkflowDefinition): Result<WorkflowDefinition, ValidationError[]> {
    const errors: ValidationError[] = [];

    // 验证基本信息
    errors.push(...this.validateBasicInfo(workflow));

    // 验证节点
    errors.push(...this.validateNodes(workflow));

    // 验证边
    errors.push(...this.validateEdges(workflow));

    // 验证引用完整性
    errors.push(...this.validateReferences(workflow));

    // 验证配置
    errors.push(...this.validateConfig(workflow));

    // 验证触发器
    errors.push(...this.validateTriggers(workflow));

    // 验证自引用
    errors.push(...this.validateSelfReferences(workflow));

    // 验证工具配置
    errors.push(...this.validateTools(workflow));

    if (errors.length > 0) {
      return err(errors);
    }
    return ok(workflow);
  }

  /**
   * 验证基本信息
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateBasicInfo(workflow: WorkflowDefinition): ValidationError[] {
    const result = workflowBasicSchema.safeParse(workflow);
    if (result.success) {
      return [];
    }
    const validationErrors = this.convertZodError(result.error, 'workflow');
    return validationErrors;
  }

  /**
   * 验证节点
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateNodes(workflow: WorkflowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    // 验证节点数组不为空
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push(new ValidationError('Workflow must have at least one node', 'workflow.nodes'));
      return errors;
    }

    // 验证节点ID唯一性
    const nodeIds = new Set<string>();
    const startNodes: Node[] = [];
    const endNodes: Node[] = [];
    const startFromTriggerNodes: Node[] = [];
    const continueFromTriggerNodes: Node[] = [];

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
        const configResult = validateNodeByType(node);
        if (configResult.isErr()) {
          errors.push(...configResult.error);
        }
      }

      // 验证节点Hooks
      if (node.id && node.hooks && node.hooks.length > 0) {
        const hooksResult = validateHooks(node.hooks, node.id);
        if (hooksResult.isErr()) {
          errors.push(...hooksResult.error);
        }
      }

      // 统计特殊节点类型
      if (node.type === NodeType.START) {
        startNodes.push(node);
      } else if (node.type === NodeType.END) {
        endNodes.push(node);
      } else if (node.type === NodeType.START_FROM_TRIGGER) {
        startFromTriggerNodes.push(node);
      } else if (node.type === NodeType.CONTINUE_FROM_TRIGGER) {
        continueFromTriggerNodes.push(node);
      }
    }

    // 验证节点类型的业务规则
    const hasStartFromTrigger = startFromTriggerNodes.length > 0;
    const hasContinueFromTrigger = continueFromTriggerNodes.length > 0;

    if (hasStartFromTrigger || hasContinueFromTrigger) {
      // 触发子工作流：必须包含START_FROM_TRIGGER和CONTINUE_FROM_TRIGGER，不能包含START和END
      if (!hasStartFromTrigger) {
        errors.push(new ValidationError('Triggered subgraph must have exactly one START_FROM_TRIGGER node', 'workflow.nodes'));
      } else if (startFromTriggerNodes.length > 1) {
        errors.push(new ValidationError('Triggered subgraph must have exactly one START_FROM_TRIGGER node', 'workflow.nodes'));
      }

      if (!hasContinueFromTrigger) {
        errors.push(new ValidationError('Triggered subgraph must have exactly one CONTINUE_FROM_TRIGGER node', 'workflow.nodes'));
      } else if (continueFromTriggerNodes.length > 1) {
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
        errors.push(new ValidationError('Workflow must have at least one END node', 'workflow.nodes'));
      }
    }

    return errors;
  }

  /**
   * 验证边
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateEdges(workflow: WorkflowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    const edgeIds = new Set<string>();

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
      }

      if (!edge.targetNodeId) {
        errors.push(new ValidationError('Edge target node ID is required', `${path}.targetNodeId`));
      }

      if (!edge.type) {
        errors.push(new ValidationError('Edge type is required', `${path}.type`));
      }
    }

    return errors;
  }

  /**
   * 验证引用完整性
   * 检查边引用的节点是否存在
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateReferences(workflow: WorkflowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    // 检查边的节点引用
    for (const edge of workflow.edges) {
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push(new ValidationError(
          `Edge source node not found: ${edge.sourceNodeId}`,
          `workflow.edges[${edge.id}].sourceNodeId`
        ));
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push(new ValidationError(
          `Edge target node not found: ${edge.targetNodeId}`,
          `workflow.edges[${edge.id}].targetNodeId`
        ));
      }
    }

    return errors;
  }

  /**
   * 验证配置
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateConfig(workflow: WorkflowDefinition): ValidationError[] {
    if (!workflow.config) {
      return [];
    }

    const result = workflowConfigSchema.safeParse(workflow.config);
    if (result.success) {
      return [];
    }
    return this.convertZodError(result.error, 'workflow.config');
  }

  /**
    * 将zod错误转换为ValidationError数组
    * @param error zod错误
    * @param prefix 字段路径前缀
    * @returns ValidationError[]
    */
  private convertZodError(error: z.ZodError, prefix?: string): ValidationError[] {
    const errors: ValidationError[] = error.issues.map((issue) => {
      const field = issue.path.length > 0
        ? (prefix ? `${prefix}.${issue.path.join('.')}` : issue.path.join('.'))
        : prefix;
      return new ValidationError(issue.message, field);
    });
    return errors;
  }

  /**
   * 验证触发器
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateTriggers(workflow: WorkflowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    // 如果没有触发器，直接返回成功
    if (!workflow.triggers || workflow.triggers.length === 0) {
      return [];
    }

    // 验证触发器配置
    const triggersResult = validateTriggers(workflow.triggers, 'workflow.triggers');
    if (triggersResult.isErr()) {
      errors.push(...triggersResult.error);
    }

    return errors;
  }

  /**
   * 验证自引用
   * 使用策略模式检测 SUBGRAPH 和 START_FROM_TRIGGER 节点的自引用
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateSelfReferences(workflow: WorkflowDefinition): ValidationError[] {
    const errors = SelfReferenceValidationStrategy.validateNodes(
      workflow.nodes,
      workflow.id
    );

    return errors;
  }

  /**
   * 验证工具配置
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  private validateTools(workflow: WorkflowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    // 验证availableTools配置
    if (workflow.availableTools) {
      if (!workflow.availableTools.initial || !(workflow.availableTools.initial instanceof Set)) {
        errors.push(new ValidationError(
          'availableTools.initial must be a Set of tool IDs',
          'workflow.availableTools.initial'
        ));
      }
    }

    // 验证LLM节点的dynamicTools配置
    for (let i = 0; i < workflow.nodes.length; i++) {
      const node = workflow.nodes[i];
      if (node && node.type === NodeType.LLM && node.config) {
        const llmConfig = node.config as any;
        if (llmConfig.dynamicTools) {
          const path = `workflow.nodes[${i}].config.dynamicTools`;

          if (!llmConfig.dynamicTools.toolIds || !Array.isArray(llmConfig.dynamicTools.toolIds)) {
            errors.push(new ValidationError(
              'dynamicTools.toolIds must be an array of tool IDs',
              `${path}.toolIds`
            ));
          }

          if (llmConfig.dynamicTools.descriptionTemplate && typeof llmConfig.dynamicTools.descriptionTemplate !== 'string') {
            errors.push(new ValidationError(
              'dynamicTools.descriptionTemplate must be a string',
              `${path}.descriptionTemplate`
            ));
          }
        }
      }
    }

    return errors;
  }
}