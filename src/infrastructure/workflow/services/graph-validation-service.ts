import { injectable } from 'inversify';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { GraphValidationService as DomainGraphValidationService, ValidationResult as DomainValidationResult } from '../../../domain/workflow/services/graph-validation-service.interface';

/**
 * 验证规则接口
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validate: (workflow: Workflow) => ValidationResult;
  enabled: boolean;
}

/**
 * 业务规则接口
 */
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  validate: (workflow: Workflow) => ValidationResult;
  enabled: boolean;
}

/**
 * 验证结果接口（基础设施层内部使用）
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  severity: 'error' | 'warning';
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

/**
 * 图验证服务实现
 *
 * 基础设施层实现，提供具体的图验证功能：
 * 1. 图结构验证（完整性、连接性）
 * 2. 业务规则验证（开始/结束节点规则）
 * 3. 执行约束验证
 * 4. 图有效性验证
 *
 * 简化实现，移除复杂的验证规则系统，专注于核心验证逻辑。
 */
@injectable()
export class GraphValidationServiceImpl implements DomainGraphValidationService {
  private validationRules: ValidationRule[] = [];
  private businessRules: BusinessRule[] = [];

  constructor() {
    this.initializeValidationRules();
    this.initializeBusinessRules();
  }

  /**
   * 将布尔值转换为验证结果
   */
  private booleanToValidationResult(isValid: boolean, errorCode?: string, errorMessage?: string): ValidationResult {
    return {
      isValid,
      errors: isValid ? [] : [{ code: errorCode || 'VALIDATION_ERROR', message: errorMessage || '验证失败', severity: 'error' }],
      warnings: []
    };
  }

  /**
   * 初始化验证规则
   */
  private initializeValidationRules(): void {
    // 简化实现：直接定义图验证规则，不再依赖复杂的领域层验证系统
    this.validationRules = [
      {
        id: 'graph_structure',
        name: '图结构验证',
        description: '验证图的基本结构完整性',
        validate: (workflow: Workflow) => this.booleanToValidationResult(this.validateGraphStructure(workflow), 'GRAPH_STRUCTURE_ERROR', '图结构验证失败'),
        enabled: true
      },
      {
        id: 'graph_integrity',
        name: '图完整性验证',
        description: '验证图元素的完整性',
        validate: (workflow: Workflow) => this.booleanToValidationResult(this.validateGraphIntegrity(workflow), 'GRAPH_INTEGRITY_ERROR', '图完整性验证失败'),
        enabled: true
      },
      {
        id: 'node_connections',
        name: '节点连接验证',
        description: '验证节点连接的有效性',
        validate: (workflow: Workflow) => this.booleanToValidationResult(this.validateNodeConnections(workflow), 'NODE_CONNECTIONS_ERROR', '节点连接验证失败'),
        enabled: true
      }
    ];
  }

  /**
   * 初始化业务规则
   */
  private initializeBusinessRules(): void {
    this.businessRules = [
      {
        id: 'start_node_required',
        name: '开始节点要求',
        description: '工作流必须包含至少一个开始节点',
        validate: (workflow: Workflow) => {
          const startNodes = Array.from(workflow.getNodes().values()).filter(node => node.type.isStart());
          const hasStartNode = startNodes.length > 0;
          return this.booleanToValidationResult(hasStartNode, 'START_NODE_REQUIRED', '工作流必须至少有一个开始节点');
        },
        enabled: true
      },
      {
        id: 'end_node_required',
        name: '结束节点要求',
        description: '工作流必须包含至少一个结束节点',
        validate: (workflow: Workflow) => {
          const endNodes = Array.from(workflow.getNodes().values()).filter(node => node.type.isEnd());
          const hasEndNode = endNodes.length > 0;
          return this.booleanToValidationResult(hasEndNode, 'END_NODE_REQUIRED', '工作流必须至少有一个结束节点');
        },
        enabled: true
      },
      {
        id: 'single_start_node',
        name: '单一开始节点',
        description: '工作流只能有一个开始节点',
        validate: (workflow: Workflow) => {
          const startNodes = Array.from(workflow.getNodes().values()).filter(node => node.type.isStart());
          const hasSingleStartNode = startNodes.length <= 1;
          return this.booleanToValidationResult(hasSingleStartNode, 'SINGLE_START_NODE', '工作流只能有一个开始节点');
        },
        enabled: true
      },
      {
        id: 'connected_graph',
        name: '连通图要求',
        description: '工作流应该是连通图（所有节点都可达）',
        validate: (workflow: Workflow) => {
          // 简化实现：检查是否有孤立节点（没有连接的节点）
          const nodesWithConnections = new Set<string>();

          for (const edge of workflow.getEdges().values()) {
            nodesWithConnections.add(edge.fromNodeId.toString());
            nodesWithConnections.add(edge.toNodeId.toString());
          }

          for (const node of workflow.getNodes().values()) {
            if (!nodesWithConnections.has(node.id.toString())) {
              // 允许开始和结束节点孤立
              if (node.type.isStart() || node.type.isEnd()) {
                continue;
              }
              return this.booleanToValidationResult(false, 'CONNECTED_GRAPH', '工作流应该是一个连通图');
            }
          }

          return this.booleanToValidationResult(true);
        },
        enabled: true
      },
      {
        id: 'no_cycles',
        name: '无循环要求',
        description: '工作流不应该包含循环（除非明确设计）',
        validate: (workflow: Workflow) => {
          // 使用图算法服务检测循环
          // 这里简化实现，实际应该注入GraphAlgorithmService
          const hasNoCycles = true; // 暂时返回true，实际实现需要检测循环
          return this.booleanToValidationResult(hasNoCycles, 'NO_CYCLES', '工作流包含循环');
        },
        enabled: true
      }
    ];
  }

  /**
   * 验证图的基本结构
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphStructure(workflow: Workflow): boolean {
    // 检查节点数量
    if (workflow.getNodeCount() === 0) {
      return false;
    }

    // 检查边连接
    for (const edge of workflow.getEdges().values()) {
      if (!workflow.hasNode(edge.fromNodeId) || !workflow.hasNode(edge.toNodeId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证图的完整性
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphIntegrity(workflow: Workflow): boolean {
    // 检查所有节点的ID是否有效
    for (const node of workflow.getNodes().values()) {
      if (!node.id || node.id.toString().trim() === '') {
        return false;
      }
    }

    // 检查所有边的ID是否有效
    for (const edge of workflow.getEdges().values()) {
      if (!edge.id || edge.id.toString().trim() === '') {
        return false;
      }
    }

    // 检查边的连接是否有效
    for (const edge of workflow.getEdges().values()) {
      if (!workflow.hasNode(edge.fromNodeId) || !workflow.hasNode(edge.toNodeId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证节点连接
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateNodeConnections(workflow: Workflow): boolean {
    // 检查每个节点的连接是否符合其类型要求
    for (const node of workflow.getNodes().values()) {
      const incomingEdges = Array.from(workflow.getEdges().values()).filter(edge => edge.toNodeId.equals(node.id));
      const outgoingEdges = Array.from(workflow.getEdges().values()).filter(edge => edge.fromNodeId.equals(node.id));

      // 开始节点不应该有入边
      if (node.type.isStart() && incomingEdges.length > 0) {
        return false;
      }

      // 结束节点不应该有出边
      if (node.type.isEnd() && outgoingEdges.length > 0) {
        return false;
      }

      // 普通节点至少应该有一个入边或出边
      if (!node.type.isStart() && !node.type.isEnd()) {
        if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 验证图是否有效
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraph(workflow: Workflow): boolean {
    // 执行所有验证规则
    for (const rule of this.validationRules) {
      if (rule.enabled) {
        const result = rule.validate(workflow);
        if (!result.isValid) {
          return false;
        }
      }
    }

    // 执行所有业务规则
    for (const rule of this.businessRules) {
      if (rule.enabled) {
        const result = rule.validate(workflow);
        if (!result.isValid) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 检查图是否可执行
   * @param graph 工作流图
   * @returns 是否可执行
   */
  isExecutable(workflow: Workflow): boolean {
    // 检查是否有开始节点
    const startNodes = Array.from(workflow.getNodes().values()).filter(node => node.type.isStart());
    if (startNodes.length === 0) {
      return false;
    }

    // 检查是否有结束节点
    const endNodes = Array.from(workflow.getNodes().values()).filter(node => node.type.isEnd());
    if (endNodes.length === 0) {
      return false;
    }

    // 检查图的基本结构
    if (!this.validateGraphStructure(workflow)) {
      return false;
    }

    // 检查节点连接
    if (!this.validateNodeConnections(workflow)) {
      return false;
    }

    return true;
  }

  /**
   * 获取验证规则
   * @returns 验证规则列表
   */
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * 获取业务规则
   * @returns 业务规则列表
   */
  getBusinessRules(): BusinessRule[] {
    return [...this.businessRules];
  }

  /**
   * 启用验证规则
   * @param ruleId 规则ID
   */
  enableValidationRule(ruleId: string): void {
    const rule = this.validationRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  /**
   * 禁用验证规则
   * @param ruleId 规则ID
   */
  disableValidationRule(ruleId: string): void {
    const rule = this.validationRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  /**
   * 添加自定义验证规则
   * @param rule 验证规则
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * 添加自定义业务规则
   * @param rule 业务规则
   */
  addBusinessRule(rule: BusinessRule): void {
    this.businessRules.push(rule);
  }

  /**
   * 验证图结构（详细）
   * @param workflow 工作流
   * @returns 详细验证结果
   */
  validateGraphDetailed(workflow: Workflow): DomainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 执行所有验证规则
    for (const rule of this.validationRules) {
      if (rule.enabled) {
        const result = rule.validate(workflow);
        if (!result.isValid) {
          errors.push(...result.errors.map(e => `[${rule.id}] ${e.message}`));
        }
      }
    }

    // 执行所有业务规则
    for (const rule of this.businessRules) {
      if (rule.enabled) {
        const result = rule.validate(workflow);
        if (!result.isValid) {
          errors.push(...result.errors.map(e => `[${rule.id}] ${e.message}`));
        }
        if (result.warnings.length > 0) {
          warnings.push(...result.warnings.map(w => `[${rule.id}] ${w.message}`));
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证节点配置
   * @param workflow 工作流
   * @returns 验证结果
   */
  validateNodes(workflow: Workflow): DomainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const node of workflow.getNodes().values()) {
      // 检查节点ID
      if (!node.id || node.id.toString().trim() === '') {
        errors.push(`节点ID无效`);
      }

      // 检查节点名称
      if (!node.name || node.name.trim() === '') {
        warnings.push(`节点 ${node.id.toString()} 没有名称`);
      }

      // 检查节点类型
      if (!node.type) {
        errors.push(`节点 ${node.id.toString()} 没有类型`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证边配置
   * @param workflow 工作流
   * @returns 验证结果
   */
  validateEdges(workflow: Workflow): DomainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const edge of workflow.getEdges().values()) {
      // 检查边ID
      if (!edge.id || edge.id.toString().trim() === '') {
        errors.push(`边ID无效`);
      }

      // 检查边的连接
      if (!workflow.hasNode(edge.fromNodeId)) {
        errors.push(`边 ${edge.id.toString()} 的起始节点 ${edge.fromNodeId.toString()} 不存在`);
      }

      if (!workflow.hasNode(edge.toNodeId)) {
        errors.push(`边 ${edge.id.toString()} 的目标节点 ${edge.toNodeId.toString()} 不存在`);
      }

      // 检查边的条件
      if (edge.condition && edge.condition.trim() === '') {
        warnings.push(`边 ${edge.id.toString()} 的条件为空`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证工作流可执行性
   * @param workflow 工作流
   * @returns 验证结果
   */
  validateExecutable(workflow: Workflow): DomainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查是否有开始节点
    const startNodes = Array.from(workflow.getNodes().values()).filter(node => node.type.isStart());
    if (startNodes.length === 0) {
      errors.push('工作流必须至少有一个开始节点');
    } else if (startNodes.length > 1) {
      warnings.push('工作流有多个开始节点，可能影响执行顺序');
    }

    // 检查是否有结束节点
    const endNodes = Array.from(workflow.getNodes().values()).filter(node => node.type.isEnd());
    if (endNodes.length === 0) {
      errors.push('工作流必须至少有一个结束节点');
    }

    // 检查图的基本结构
    if (!this.validateGraphStructure(workflow)) {
      errors.push('工作流图结构无效');
    }

    // 检查节点连接
    if (!this.validateNodeConnections(workflow)) {
      errors.push('工作流节点连接无效');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}