/**
 * 工作流验证器
 * 负责工作流定义的完整验证
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { Node } from '../../types/node';
import type { Edge } from '../../types/edge';
import { NodeType } from '../../types/node';
import type {
  ValidationResult,
  ValidationIssue
} from './validation-result';
import {
  createValidationResult,
  createValidationError,
  mergeValidationResults
} from './validation-result';

/**
 * 工作流验证器
 */
export class WorkflowValidator {
  /**
   * 验证工作流定义
   * @param workflow 工作流定义
   * @returns 验证结果
   */
  validate(workflow: WorkflowDefinition): ValidationResult {
    const results: ValidationResult[] = [];

    // 验证基本信息
    results.push(this.validateBasicInfo(workflow));

    // 验证节点
    results.push(this.validateNodes(workflow));

    // 验证边
    results.push(this.validateEdges(workflow));

    // 验证结构
    results.push(this.validateStructure(workflow));

    // 验证配置
    results.push(this.validateConfig(workflow));

    return mergeValidationResults(...results);
  }

  /**
   * 验证基本信息
   */
  private validateBasicInfo(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationIssue[] = [];

    if (!workflow.id) {
      errors.push(createValidationError(
        'WORKFLOW_ID_MISSING',
        'Workflow ID is required',
        'workflow.id'
      ));
    }

    if (!workflow.name) {
      errors.push(createValidationError(
        'WORKFLOW_NAME_MISSING',
        'Workflow name is required',
        'workflow.name'
      ));
    }

    if (!workflow.version) {
      errors.push(createValidationError(
        'WORKFLOW_VERSION_MISSING',
        'Workflow version is required',
        'workflow.version'
      ));
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push(createValidationError(
        'WORKFLOW_NODES_EMPTY',
        'Workflow must have at least one node',
        'workflow.nodes'
      ));
    }

    return createValidationResult(errors.length === 0, errors);
  }

  /**
   * 验证节点
   */
  private validateNodes(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationIssue[] = [];
    const nodeIds = new Set<string>();
    const startNodes: Node[] = [];
    const endNodes: Node[] = [];

    for (let i = 0; i < workflow.nodes.length; i++) {
      const node = workflow.nodes[i];
      if (!node) continue;
      
      const path = `workflow.nodes[${i}]`;

      // 检查节点ID唯一性
      if (nodeIds.has(node.id)) {
        errors.push(createValidationError(
          'NODE_ID_DUPLICATE',
          `Node ID must be unique: ${node.id}`,
          `${path}.id`
        ));
      }
      nodeIds.add(node.id);

      // 检查节点基本信息
      if (!node.id) {
        errors.push(createValidationError(
          'NODE_ID_MISSING',
          'Node ID is required',
          `${path}.id`
        ));
      }

      if (!node.name) {
        errors.push(createValidationError(
          'NODE_NAME_MISSING',
          'Node name is required',
          `${path}.name`
        ));
      }

      if (!node.type) {
        errors.push(createValidationError(
          'NODE_TYPE_MISSING',
          'Node type is required',
          `${path}.type`
        ));
      }

      // 统计START和END节点
      if (node.type === NodeType.START) {
        startNodes.push(node);
      } else if (node.type === NodeType.END) {
        endNodes.push(node);
      }
    }

    // 检查START节点
    if (startNodes.length === 0) {
      errors.push(createValidationError(
        'START_NODE_MISSING',
        'Workflow must have exactly one START node',
        'workflow.nodes'
      ));
    } else if (startNodes.length > 1) {
      errors.push(createValidationError(
        'START_NODE_MULTIPLE',
        'Workflow must have exactly one START node',
        'workflow.nodes'
      ));
    }

    // 检查END节点
    if (endNodes.length === 0) {
      errors.push(createValidationError(
        'END_NODE_MISSING',
        'Workflow must have exactly one END node',
        'workflow.nodes'
      ));
    } else if (endNodes.length > 1) {
      errors.push(createValidationError(
        'END_NODE_MULTIPLE',
        'Workflow must have exactly one END node',
        'workflow.nodes'
      ));
    }

    return createValidationResult(errors.length === 0, errors);
  }

  /**
   * 验证边
   */
  private validateEdges(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationIssue[] = [];
    const edgeIds = new Set<string>();
    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    for (let i = 0; i < workflow.edges.length; i++) {
      const edge = workflow.edges[i];
      if (!edge) continue;
      
      const path = `workflow.edges[${i}]`;

      // 检查边ID唯一性
      if (edgeIds.has(edge.id)) {
        errors.push(createValidationError(
          'EDGE_ID_DUPLICATE',
          `Edge ID must be unique: ${edge.id}`,
          `${path}.id`
        ));
      }
      edgeIds.add(edge.id);

      // 检查边基本信息
      if (!edge.id) {
        errors.push(createValidationError(
          'EDGE_ID_MISSING',
          'Edge ID is required',
          `${path}.id`
        ));
      }

      if (!edge.sourceNodeId) {
        errors.push(createValidationError(
          'EDGE_SOURCE_MISSING',
          'Edge source node ID is required',
          `${path}.sourceNodeId`
        ));
      } else if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push(createValidationError(
          'EDGE_SOURCE_NOT_FOUND',
          `Edge source node not found: ${edge.sourceNodeId}`,
          `${path}.sourceNodeId`
        ));
      }

      if (!edge.targetNodeId) {
        errors.push(createValidationError(
          'EDGE_TARGET_MISSING',
          'Edge target node ID is required',
          `${path}.targetNodeId`
        ));
      } else if (!nodeIds.has(edge.targetNodeId)) {
        errors.push(createValidationError(
          'EDGE_TARGET_NOT_FOUND',
          `Edge target node not found: ${edge.targetNodeId}`,
          `${path}.targetNodeId`
        ));
      }

      if (!edge.type) {
        errors.push(createValidationError(
          'EDGE_TYPE_MISSING',
          'Edge type is required',
          `${path}.type`
        ));
      }
    }

    return createValidationResult(errors.length === 0, errors);
  }

  /**
   * 验证结构
   */
  private validateStructure(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationIssue[] = [];
    const nodeMap = new Map<string, Node>();
    const edgeMap = new Map<string, Edge>();

    // 构建映射
    for (const node of workflow.nodes) {
      nodeMap.set(node.id, node);
    }

    for (const edge of workflow.edges) {
      edgeMap.set(edge.id, edge);
    }

    // 检查START节点入度
    const startNode = Array.from(nodeMap.values()).find(n => n.type === NodeType.START);
    if (startNode && startNode.incomingEdgeIds.length > 0) {
      errors.push(createValidationError(
        'START_NODE_HAS_INCOMING',
        'START node must have no incoming edges',
        `workflow.nodes[${startNode.id}].incomingEdgeIds`
      ));
    }

    // 检查END节点出度
    const endNode = Array.from(nodeMap.values()).find(n => n.type === NodeType.END);
    if (endNode && endNode.outgoingEdgeIds.length > 0) {
      errors.push(createValidationError(
        'END_NODE_HAS_OUTGOING',
        'END node must have no outgoing edges',
        `workflow.nodes[${endNode.id}].outgoingEdgeIds`
      ));
    }

    // 检查边的连接一致性
    for (const edge of workflow.edges) {
      const sourceNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);

      if (sourceNode && !sourceNode.outgoingEdgeIds.includes(edge.id)) {
        errors.push(createValidationError(
          'EDGE_NOT_IN_SOURCE_OUTGOING',
          `Edge ${edge.id} not in source node's outgoing edges`,
          `workflow.edges[${edge.id}]`
        ));
      }

      if (targetNode && !targetNode.incomingEdgeIds.includes(edge.id)) {
        errors.push(createValidationError(
          'EDGE_NOT_IN_TARGET_INCOMING',
          `Edge ${edge.id} not in target node's incoming edges`,
          `workflow.edges[${edge.id}]`
        ));
      }
    }

    return createValidationResult(errors.length === 0, errors);
  }

  /**
   * 验证配置
   */
  private validateConfig(workflow: WorkflowDefinition): ValidationResult {
    const errors: ValidationIssue[] = [];

    if (workflow.config) {
      const config = workflow.config;

      if (config.timeout !== undefined && config.timeout < 0) {
        errors.push(createValidationError(
          'CONFIG_TIMEOUT_INVALID',
          'Workflow timeout must be non-negative',
          'workflow.config.timeout'
        ));
      }

      if (config.maxSteps !== undefined && config.maxSteps < 0) {
        errors.push(createValidationError(
          'CONFIG_MAX_STEPS_INVALID',
          'Workflow maxSteps must be non-negative',
          'workflow.config.maxSteps'
        ));
      }

      if (config.retryPolicy) {
        if (config.retryPolicy.maxRetries !== undefined && config.retryPolicy.maxRetries < 0) {
          errors.push(createValidationError(
            'CONFIG_RETRY_POLICY_MAX_RETRIES_INVALID',
            'Retry policy maxRetries must be non-negative',
            'workflow.config.retryPolicy.maxRetries'
          ));
        }

        if (config.retryPolicy.retryDelay !== undefined && config.retryPolicy.retryDelay < 0) {
          errors.push(createValidationError(
            'CONFIG_RETRY_POLICY_RETRY_DELAY_INVALID',
            'Retry policy retryDelay must be non-negative',
            'workflow.config.retryPolicy.retryDelay'
          ));
        }
      }
    }

    return createValidationResult(errors.length === 0, errors);
  }
}