/**
 * 验证器类
 *
 * 提供配置验证功能，确保工作流、节点和边的配置正确
 */

import type {
  WorkflowConfigData,
  EdgeConfig,
} from '../types';
import type { NodeConfig } from '../types';
import { ValidationError } from '../errors';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
}

/**
 * 验证器类
 */
export class Validators {
  /**
   * 验证工作流配置
   * @param config 工作流配置
   * @returns 验证结果
   */
  static validateWorkflowConfig(config: WorkflowConfigData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const workflow = config.workflow;

    // 验证基本字段
    if (!workflow.name || workflow.name.trim() === '') {
      errors.push('工作流名称不能为空');
    }

    if (workflow.name && workflow.name.length > 200) {
      errors.push('工作流名称不能超过200个字符');
    }

    // 验证节点
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('工作流必须包含至少一个节点');
    } else {
      const nodeValidation = this.validateNodes(workflow.nodes);
      errors.push(...nodeValidation.errors);
      warnings.push(...nodeValidation.warnings);
    }

    // 验证边
    if (!workflow.edges || workflow.edges.length === 0) {
      warnings.push('工作流没有定义任何边，可能无法正常执行');
    } else {
      const edgeValidation = this.validateEdges(workflow.edges, workflow.nodes);
      errors.push(...edgeValidation.errors);
      warnings.push(...edgeValidation.warnings);
    }

    // 验证节点ID唯一性
    const nodeIds = workflow.nodes.map(n => n.id);
    const duplicateIds = this.findDuplicates(nodeIds);
    if (duplicateIds.length > 0) {
      errors.push(`节点ID重复: ${duplicateIds.join(', ')}`);
    }

    // 验证必须有开始节点
    const hasStartNode = workflow.nodes.some(n => n.type === 'start');
    if (!hasStartNode) {
      warnings.push('工作流没有开始节点，执行时可能无法确定起始位置');
    }

    // 验证必须有结束节点
    const hasEndNode = workflow.nodes.some(n => n.type === 'end');
    if (!hasEndNode) {
      warnings.push('工作流没有结束节点，执行时可能无法正常结束');
    }

    // 验证边的引用
    if (workflow.edges && workflow.nodes) {
      const edgeRefValidation = this.validateEdgeReferences(workflow.edges, workflow.nodes);
      errors.push(...edgeRefValidation.errors);
      warnings.push(...edgeRefValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证节点配置
   * @param config 节点配置
   * @returns 验证结果
   */
  static validateNodeConfig(config: NodeConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证节点ID
    if (!config.id || config.id.trim() === '') {
      errors.push('节点ID不能为空');
    }

    if (config.id && config.id.length > 100) {
      errors.push('节点ID不能超过100个字符');
    }

    // 验证节点名称
    if (config.name && config.name.length > 200) {
      errors.push('节点名称不能超过200个字符');
    }

    // 验证节点描述
    if (config.description && config.description.length > 1000) {
      errors.push('节点描述不能超过1000个字符');
    }

    // 根据节点类型进行特定验证
    switch (config.type) {
      case 'llm':
        errors.push(...this.validateLLMNode(config));
        break;
      case 'tool':
      case 'tool-call':
        errors.push(...this.validateToolNode(config));
        break;
      case 'condition':
        errors.push(...this.validateConditionNode(config));
        break;
      case 'data-transform':
        errors.push(...this.validateTransformNode(config));
        break;
      case 'context-processor':
        errors.push(...this.validateContextProcessorNode(config));
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证边配置
   * @param config 边配置
   * @returns 验证结果
   */
  static validateEdgeConfig(config: EdgeConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证源节点
    if (!config.from || config.from.trim() === '') {
      errors.push('边的源节点ID不能为空');
    }

    // 验证目标节点
    if (!config.to || config.to.trim() === '') {
      errors.push('边的目标节点ID不能为空');
    }

    // 验证自环
    if (config.from === config.to) {
      warnings.push('边指向自身，可能导致无限循环');
    }

    // 验证权重
    if (config.weight !== undefined) {
      if (typeof config.weight !== 'number') {
        errors.push('边的权重必须是数字');
      } else if (config.weight < 0) {
        errors.push('边的权重不能为负数');
      } else if (config.weight > 1) {
        warnings.push('边的权重大于1，可能影响路由决策');
      }
    }

    // 验证条件
    if (config.condition) {
      const conditionValidation = this.validateEdgeCondition(config.condition);
      errors.push(...conditionValidation.errors);
      warnings.push(...conditionValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证节点列表
   * @param nodes 节点列表
   * @returns 验证结果
   */
  private static validateNodes(nodes: NodeConfig[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      
      const nodeValidation = this.validateNodeConfig(node);
      
      if (nodeValidation.errors.length > 0) {
        errors.push(
          ...nodeValidation.errors.map(err => `节点 [${node.id || i}]: ${err}`)
        );
      }
      
      if (nodeValidation.warnings.length > 0) {
        warnings.push(
          ...nodeValidation.warnings.map(warn => `节点 [${node.id || i}]: ${warn}`)
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证边列表
   * @param edges 边列表
   * @param nodes 节点列表
   * @returns 验证结果
   */
  private static validateEdges(edges: EdgeConfig[], nodes: NodeConfig[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge) continue;
      
      const edgeValidation = this.validateEdgeConfig(edge);
      
      if (edgeValidation.errors.length > 0) {
        errors.push(
          ...edgeValidation.errors.map(err => `边 [${i}]: ${err}`)
        );
      }
      
      if (edgeValidation.warnings.length > 0) {
        warnings.push(
          ...edgeValidation.warnings.map(warn => `边 [${i}]: ${warn}`)
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证边的引用
   * @param edges 边列表
   * @param nodes 节点列表
   * @returns 验证结果
   */
  private static validateEdgeReferences(edges: EdgeConfig[], nodes: NodeConfig[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const nodeIds = new Set(nodes.map(n => n.id));

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge) continue;

      // 验证源节点存在
      if (!nodeIds.has(edge.from)) {
        errors.push(`边 [${i}] 的源节点 "${edge.from}" 不存在`);
      }

      // 验证目标节点存在
      if (!nodeIds.has(edge.to)) {
        errors.push(`边 [${i}] 的目标节点 "${edge.to}" 不存在`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证LLM节点
   * @param config LLM节点配置
   * @returns 错误列表
   */
  private static validateLLMNode(config: any): string[] {
    const errors: string[] = [];

    // 验证wrapper配置
    if (!config.wrapperConfig && !config.wrapper_type) {
      errors.push('LLM节点必须配置wrapperConfig或wrapper_type');
    }

    // 验证prompt
    if (!config.prompt) {
      errors.push('LLM节点必须配置prompt');
    }

    // 验证temperature
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number') {
        errors.push('temperature必须是数字');
      } else if (config.temperature < 0 || config.temperature > 2) {
        errors.push('temperature必须在0到2之间');
      }
    }

    // 验证maxTokens
    if (config.maxTokens !== undefined) {
      if (typeof config.maxTokens !== 'number') {
        errors.push('maxTokens必须是数字');
      } else if (config.maxTokens < 1) {
        errors.push('maxTokens必须大于0');
      }
    }

    return errors;
  }

  /**
   * 验证工具节点
   * @param config 工具节点配置
   * @returns 错误列表
   */
  private static validateToolNode(config: any): string[] {
    const errors: string[] = [];

    // 验证toolName
    if (!config.toolName || config.toolName.trim() === '') {
      errors.push('工具节点必须配置toolName');
    }

    // 验证timeout
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number') {
        errors.push('timeout必须是数字');
      } else if (config.timeout < 0) {
        errors.push('timeout不能为负数');
      }
    }

    return errors;
  }

  /**
   * 验证条件节点
   * @param config 条件节点配置
   * @returns 错误列表
   */
  private static validateConditionNode(config: any): string[] {
    const errors: string[] = [];

    // 验证condition
    if (!config.condition || config.condition.trim() === '') {
      errors.push('条件节点必须配置condition');
    }

    return errors;
  }

  /**
   * 验证转换节点
   * @param config 转换节点配置
   * @returns 错误列表
   */
  private static validateTransformNode(config: any): string[] {
    const errors: string[] = [];

    // 验证transformType
    const validTransformTypes = ['map', 'filter', 'reduce', 'sort', 'group'];
    if (!config.transformType || !validTransformTypes.includes(config.transformType)) {
      errors.push(`transformType必须是以下之一: ${validTransformTypes.join(', ')}`);
    }

    // 验证sourceData
    if (!config.sourceData || config.sourceData.trim() === '') {
      errors.push('转换节点必须配置sourceData');
    }

    // 验证targetVariable
    if (!config.targetVariable || config.targetVariable.trim() === '') {
      errors.push('转换节点必须配置targetVariable');
    }

    return errors;
  }

  /**
   * 验证上下文处理器节点
   * @param config 上下文处理器节点配置
   * @returns 错误列表
   */
  private static validateContextProcessorNode(config: any): string[] {
    const errors: string[] = [];

    // 验证processorName
    if (!config.processorName || config.processorName.trim() === '') {
      errors.push('上下文处理器节点必须配置processorName');
    }

    return errors;
  }

  /**
   * 验证边条件
   * @param condition 边条件
   * @returns 验证结果
   */
  private static validateEdgeCondition(condition: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证type
    const validTypes = ['function', 'expression', 'script'];
    if (!condition.type || !validTypes.includes(condition.type)) {
      errors.push(`条件类型必须是以下之一: ${validTypes.join(', ')}`);
    }

    // 验证value
    if (!condition.value || condition.value.trim() === '') {
      errors.push('条件必须配置value');
    }

    // 验证language（仅script类型需要）
    if (condition.type === 'script' && !condition.language) {
      warnings.push('script类型条件建议指定language');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 查找重复项
   * @param items 项目列表
   * @returns 重复项列表
   */
  private static findDuplicates(items: (string | undefined)[]): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const item of items) {
      if (item === undefined) continue;
      
      if (seen.has(item)) {
        if (!duplicates.includes(item)) {
          duplicates.push(item);
        }
      } else {
        seen.add(item);
      }
    }

    return duplicates;
  }

  /**
   * 抛出验证错误（如果验证失败）
   * @param result 验证结果
   * @param context 错误上下文
   */
  static throwIfInvalid(result: ValidationResult, context: string): void {
    if (!result.valid) {
      throw new ValidationError(
        `${context}验证失败`,
        result.errors,
        { warnings: result.warnings }
      );
    }
  }
}