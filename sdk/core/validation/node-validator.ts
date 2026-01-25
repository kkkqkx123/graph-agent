/**
 * 节点验证器
 * 负责节点配置的验证
 */

import type { Node } from '../../types/node';
import { NodeType } from '../../types/node';
import { ValidationError, type ValidationResult } from '../../types/errors';

/**
 * 节点验证器
 */
export class NodeValidator {
  /**
   * 验证节点
   * @param node 节点
   * @returns 验证结果
   */
  validateNode(node: Node): ValidationResult {
    const errors: ValidationError[] = [];

    // 验证基本信息
    if (!node.id) {
      errors.push(new ValidationError(
        'Node ID is required',
        'node.id'
      ));
    }

    if (!node.name) {
      errors.push(new ValidationError(
        'Node name is required',
        'node.name'
      ));
    }

    if (!node.type) {
      errors.push(new ValidationError(
        'Node type is required',
        'node.type'
      ));
    }

    // 验证节点配置
    const configResult = this.validateNodeConfig(node);
    errors.push(...configResult.errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * 验证节点配置
   */
  private validateNodeConfig(node: Node): ValidationResult {
    const errors: ValidationError[] = [];
    const config = node.config;
    const path = `node.config`;

    switch (node.type) {
      case NodeType.START:
        // START节点不需要配置
        break;

      case NodeType.END:
        // END节点不需要配置
        break;

      case NodeType.VARIABLE:
        if (!config || !(config as any).variableName) {
          errors.push(new ValidationError(
            'VARIABLE node must have variableName',
            `${path}.variableName`
          ));
        }
        if (!config || !(config as any).variableType) {
          errors.push(new ValidationError(
            'VARIABLE node must have variableType',
            `${path}.variableType`
          ));
        }
        if (!config || !(config as any).expression) {
          errors.push(new ValidationError(
            'VARIABLE node must have expression',
            `${path}.expression`
          ));
        }
        break;

      case NodeType.FORK:
        if (!config || !(config as any).forkId) {
          errors.push(new ValidationError(
            'FORK node must have forkId',
            `${path}.forkId`
          ));
        }
        if (!config || !(config as any).forkStrategy) {
          errors.push(new ValidationError(
            'FORK node must have forkStrategy',
            `${path}.forkStrategy`
          ));
        }
        break;

      case NodeType.JOIN:
        if (!config || !(config as any).joinId) {
          errors.push(new ValidationError(
            'JOIN node must have joinId',
            `${path}.joinId`
          ));
        }
        if (!config || !(config as any).joinStrategy) {
          errors.push(new ValidationError(
            'JOIN node must have joinStrategy',
            `${path}.joinStrategy`
          ));
        }
        if (config && (config as any).joinStrategy === 'SUCCESS_COUNT_THRESHOLD' && !(config as any).threshold) {
          errors.push(new ValidationError(
            'JOIN node with SUCCESS_COUNT_THRESHOLD strategy must have threshold',
            `${path}.threshold`
          ));
        }
        break;

      case NodeType.CODE:
        if (!config || !(config as any).scriptName) {
          errors.push(new ValidationError(
            'CODE node must have scriptName',
            `${path}.scriptName`
          ));
        }
        if (!config || !(config as any).scriptType) {
          errors.push(new ValidationError(
            'CODE node must have scriptType',
            `${path}.scriptType`
          ));
        }
        if (!config || !(config as any).risk) {
          errors.push(new ValidationError(
            'CODE node must have risk',
            `${path}.risk`
          ));
        }
        if (!config || !(config as any).timeout) {
          errors.push(new ValidationError(
            'CODE node must have timeout',
            `${path}.timeout`
          ));
        }
        if (!config || !(config as any).retries) {
          errors.push(new ValidationError(
            'CODE node must have retries',
            `${path}.retries`
          ));
        }
        break;

      case NodeType.LLM:
        if (!config || !(config as any).profileId) {
          errors.push(new ValidationError(
            'LLM node must have profileId',
            `${path}.profileId`
          ));
        }
        if (!config || !(config as any).prompt) {
          errors.push(new ValidationError(
            'LLM node must have prompt',
            `${path}.prompt`
          ));
        }
        break;

      case NodeType.TOOL:
        if (!config || !(config as any).toolName) {
          errors.push(new ValidationError(
            'TOOL node must have toolName',
            `${path}.toolName`
          ));
        }
        if (!config || !(config as any).parameters) {
          errors.push(new ValidationError(
            'TOOL node must have parameters',
            `${path}.parameters`
          ));
        }
        break;

      case NodeType.USER_INTERACTION:
        if (!config || !(config as any).userInteractionType) {
          errors.push(new ValidationError(
            'USER_INTERACTION node must have userInteractionType',
            `${path}.userInteractionType`
          ));
        }
        break;

      case NodeType.ROUTE:
        if (!config || !(config as any).conditions) {
          errors.push(new ValidationError(
            'ROUTE node must have conditions',
            `${path}.conditions`
          ));
        }
        if (!config || !(config as any).nextNodes) {
          errors.push(new ValidationError(
            'ROUTE node must have nextNodes',
            `${path}.nextNodes`
          ));
        }
        if (config && (config as any).conditions && (config as any).nextNodes) {
          if ((config as any).conditions.length !== (config as any).nextNodes.length) {
            errors.push(new ValidationError(
              'ROUTE node conditions and nextNodes must have the same length',
              `${path}`
            ));
          }
        }
        break;

      case NodeType.CONTEXT_PROCESSOR:
        if (!config || !(config as any).contextProcessorType) {
          errors.push(new ValidationError(
            'CONTEXT_PROCESSOR node must have contextProcessorType',
            `${path}.contextProcessorType`
          ));
        }
        if (!config || !(config as any).contextProcessorConfig) {
          errors.push(new ValidationError(
            'CONTEXT_PROCESSOR node must have contextProcessorConfig',
            `${path}.contextProcessorConfig`
          ));
        }
        break;

      case NodeType.LOOP_START:
        if (!config || !(config as any).loopId) {
          errors.push(new ValidationError(
            'LOOP_START node must have loopId',
            `${path}.loopId`
          ));
        }
        if (!config || !(config as any).iterable) {
          errors.push(new ValidationError(
            'LOOP_START node must have iterable',
            `${path}.iterable`
          ));
        }
        if (!config || !(config as any).maxIterations) {
          errors.push(new ValidationError(
            'LOOP_START node must have maxIterations',
            `${path}.maxIterations`
          ));
        }
        break;

      case NodeType.LOOP_END:
        if (!config || !(config as any).loopId) {
          errors.push(new ValidationError(
            'LOOP_END node must have loopId',
            `${path}.loopId`
          ));
        }
        if (!config || !(config as any).iterable) {
          errors.push(new ValidationError(
            'LOOP_END node must have iterable',
            `${path}.iterable`
          ));
        }
        if (!config || !(config as any).breakCondition) {
          errors.push(new ValidationError(
            'LOOP_END node must have breakCondition',
            `${path}.breakCondition`
          ));
        }
        break;

      case NodeType.SUBGRAPH:
        if (!config || !(config as any).subgraphId) {
          errors.push(new ValidationError(
            'SUBGRAPH node must have subgraphId',
            `${path}.subgraphId`
          ));
        }
        if (!config || !(config as any).inputMapping) {
          errors.push(new ValidationError(
            'SUBGRAPH node must have inputMapping',
            `${path}.inputMapping`
          ));
        }
        if (!config || !(config as any).outputMapping) {
          errors.push(new ValidationError(
            'SUBGRAPH node must have outputMapping',
            `${path}.outputMapping`
          ));
        }
        break;

      default:
        errors.push(new ValidationError(
          `Unknown node type: ${node.type}`,
          'node.type'
        ));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}