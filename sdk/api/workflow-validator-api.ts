/**
 * WorkflowValidatorAPI - 验证管理API
 * 封装WorkflowValidator和NodeValidator，提供工作流和节点验证接口
 */

import { WorkflowValidator } from '../core/validation/workflow-validator';
import { NodeValidator } from '../core/validation/node-validator';
import type { WorkflowDefinition } from '../types/workflow';
import type { Node } from '../types/node';
import type { ValidationResult } from '../types/errors';
import { ValidationError } from '../types/errors';

/**
 * WorkflowValidatorAPI - 验证管理API
 */
export class WorkflowValidatorAPI {
  private workflowValidator: WorkflowValidator;
  private nodeValidator: NodeValidator;

  constructor() {
    this.workflowValidator = new WorkflowValidator();
    this.nodeValidator = new NodeValidator();
  }

  /**
   * 验证工作流
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  async validateWorkflow(workflow: WorkflowDefinition): Promise<ValidationResult> {
    return this.workflowValidator.validate(workflow);
  }

  /**
   * 通过工作流ID验证工作流
   * @param workflowId 工作流ID
   * @param getWorkflowFn 获取工作流的函数
   * @returns 验证结果
   */
  async validateWorkflowById(
    workflowId: string,
    getWorkflowFn: (workflowId: string) => WorkflowDefinition | null | Promise<WorkflowDefinition | null>
  ): Promise<ValidationResult> {
    const workflow = await getWorkflowFn(workflowId);
    if (!workflow) {
      return {
        valid: false,
        errors: [
          new ValidationError(
            `Workflow with ID '${workflowId}' not found`,
            'workflowId'
          )
        ],
        warnings: []
      };
    }

    return this.workflowValidator.validate(workflow);
  }

  /**
   * 验证节点
   * @param node 节点定义
   * @returns 验证结果
   */
  async validateNode(node: Node): Promise<ValidationResult> {
    return this.nodeValidator.validateNode(node);
  }

  /**
   * 批量验证节点
   * @param nodes 节点定义数组
   * @returns 验证结果数组
   */
  async validateNodes(nodes: Node[]): Promise<ValidationResult[]> {
    return nodes.map(node => this.nodeValidator.validateNode(node));
  }

  /**
   * 验证工作流的基本信息
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  async validateWorkflowBasicInfo(workflow: WorkflowDefinition): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!workflow.id) {
      errors.push(new ValidationError('Workflow ID is required', 'workflow.id'));
    }

    if (!workflow.name) {
      errors.push(new ValidationError('Workflow name is required', 'workflow.name'));
    }

    if (!workflow.version) {
      errors.push(new ValidationError('Workflow version is required', 'workflow.version'));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证工作流的节点
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  async validateWorkflowNodes(workflow: WorkflowDefinition): Promise<ValidationResult> {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return {
        valid: false,
        errors: [
          new ValidationError('Workflow must have at least one node', 'workflow.nodes')
        ],
        warnings: []
      };
    }

    // 验证所有节点
    const nodeResults = await this.validateNodes(workflow.nodes);

    // 收集所有错误
    const allErrors: ValidationError[] = [];
    for (let i = 0; i < nodeResults.length; i++) {
      const result = nodeResults[i]!;
      if (!result.valid && result.errors && result.errors.length > 0) {
        allErrors.push(...result.errors.map((error: ValidationError) => {
          const newError = new ValidationError(
            error.message,
            error.field ? `workflow.nodes[${i}].${error.field}` : `workflow.nodes[${i}]`
          );
          return newError;
        }));
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: []
    };
  }

  /**
   * 验证工作流的边
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  async validateWorkflowEdges(workflow: WorkflowDefinition): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!workflow.edges) {
      errors.push(new ValidationError('Workflow edges are required', 'workflow.edges'));
      return {
        valid: false,
        errors,
        warnings: []
      };
    }

    // 检查边的引用是否有效
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    const edgeIds = new Set<string>();

    for (let i = 0; i < workflow.edges.length; i++) {
      const edge = workflow.edges[i]!;

      // 检查边ID唯一性
      if (edgeIds.has(edge.id)) {
        errors.push(
          new ValidationError(
            `Edge ID must be unique: ${edge.id}`,
            `workflow.edges[${i}].id`
          )
        );
      }
      edgeIds.add(edge.id);

      // 检查源节点是否存在
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push(
          new ValidationError(
            `Edge source node not found: ${edge.sourceNodeId}`,
            `workflow.edges[${i}].sourceNodeId`
          )
        );
      }

      // 检查目标节点是否存在
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push(
          new ValidationError(
            `Edge target node not found: ${edge.targetNodeId}`,
            `workflow.edges[${i}].targetNodeId`
          )
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证工作流的结构
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  async validateWorkflowStructure(workflow: WorkflowDefinition): Promise<ValidationResult> {
    const errors: any[] = [];

    // 检查START节点
    const startNodes = workflow.nodes.filter(n => n.type === 'START');
    if (startNodes.length === 0) {
      errors.push({
        code: 'MISSING_START_NODE',
        message: 'Workflow must have exactly one START node',
        field: 'workflow.nodes'
      });
    } else if (startNodes.length > 1) {
      errors.push({
        code: 'MULTIPLE_START_NODES',
        message: 'Workflow must have exactly one START node',
        field: 'workflow.nodes'
      });
    }

    // 检查END节点
    const endNodes = workflow.nodes.filter(n => n.type === 'END');
    if (endNodes.length === 0) {
      errors.push({
        code: 'MISSING_END_NODE',
        message: 'Workflow must have exactly one END node',
        field: 'workflow.nodes'
      });
    } else if (endNodes.length > 1) {
      errors.push({
        code: 'MULTIPLE_END_NODES',
        message: 'Workflow must have exactly one END node',
        field: 'workflow.nodes'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证工作流的配置
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  async validateWorkflowConfig(workflow: WorkflowDefinition): Promise<ValidationResult> {
    const errors: any[] = [];

    if (workflow.config) {
      const config = workflow.config;

      if (config.timeout !== undefined && config.timeout < 0) {
        errors.push({
          code: 'INVALID_VALUE',
          message: 'Workflow timeout must be non-negative',
          field: 'workflow.config.timeout'
        });
      }

      if (config.maxSteps !== undefined && config.maxSteps < 0) {
        errors.push({
          code: 'INVALID_VALUE',
          message: 'Workflow maxSteps must be non-negative',
          field: 'workflow.config.maxSteps'
        });
      }

      if (config.retryPolicy) {
        if (config.retryPolicy.maxRetries !== undefined && config.retryPolicy.maxRetries < 0) {
          errors.push({
            code: 'INVALID_VALUE',
            message: 'Retry policy maxRetries must be non-negative',
            field: 'workflow.config.retryPolicy.maxRetries'
          });
        }

        if (config.retryPolicy.retryDelay !== undefined && config.retryPolicy.retryDelay < 0) {
          errors.push({
            code: 'INVALID_VALUE',
            message: 'Retry policy retryDelay must be non-negative',
            field: 'workflow.config.retryPolicy.retryDelay'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 获取底层WorkflowValidator实例
   * @returns WorkflowValidator实例
   */
  getWorkflowValidator(): WorkflowValidator {
    return this.workflowValidator;
  }

  /**
   * 获取底层NodeValidator实例
   * @returns NodeValidator实例
   */
  getNodeValidator(): NodeValidator {
    return this.nodeValidator;
  }
}