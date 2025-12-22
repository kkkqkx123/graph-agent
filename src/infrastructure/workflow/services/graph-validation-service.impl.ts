import { injectable } from 'inversify';
import {
  GraphValidationService,
  BusinessRule,
  ValidationRule as GraphValidationRule
} from '../../../domain/workflow/interfaces/graph-validation-service.interface';
import { WorkflowGraph } from '../../../domain/workflow/entities/workflow-graph';
import { Node } from '../../../domain/workflow/entities/nodes/base/node';
import { Edge } from '../../../domain/workflow/entities/edges/base/edge';
import { ID } from '../../../domain/common/value-objects/id';
import {
  ValidationResult,
  ValidationConfig,
  ValidationError,
  ValidationSeverity,
  ValidationErrorType,
  ValidationUtils,
  IValidator
} from '../../../domain/workflow/validation/validation-rules';
import {
  getPredefinedValidationRules
} from '../../../domain/workflow/validation/predefined-rules';
import { ValidationRule } from '../../../domain/workflow/validation/validation-rules';

/**
 * 图验证服务实现
 * 
 * 基础设施层实现，提供具体的图验证功能：
 * 1. 图结构验证（完整性、连接性）
 * 2. 业务规则验证（开始/结束节点规则）
 * 3. 执行约束验证
 * 4. 图有效性验证
 * 
 * 此实现重用现有的验证规则系统。
 */
@injectable()
export class GraphValidationServiceImpl implements GraphValidationService {
  private validationRules: GraphValidationRule[] = [];
  private businessRules: BusinessRule[] = [];
  private validator?: IValidator;

  constructor() {
    this.initializeValidationRules();
    this.initializeBusinessRules();
  }

  /**
   * 初始化验证规则
   */
  private initializeValidationRules(): void {
    // 转换领域验证规则为图验证规则
    const domainRules = getPredefinedValidationRules();
    this.validationRules = domainRules.map(domainRule => ({
      id: domainRule.id,
      name: domainRule.name,
      description: domainRule.description,
      validate: (graph: WorkflowGraph) => this.validateWithDomainRule(graph, domainRule),
      enabled: domainRule.enabled
    }));
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
        condition: (graph: WorkflowGraph) => {
          const startNodes = Array.from(graph.nodes.values()).filter(node => node.type.isStart());
          return startNodes.length > 0;
        },
        errorMessage: '工作流必须至少有一个开始节点',
        severity: 'error',
        suggestions: ['添加一个开始节点到工作流']
      },
      {
        id: 'end_node_required',
        name: '结束节点要求',
        description: '工作流必须包含至少一个结束节点',
        condition: (graph: WorkflowGraph) => {
          const endNodes = Array.from(graph.nodes.values()).filter(node => node.type.isEnd());
          return endNodes.length > 0;
        },
        errorMessage: '工作流必须至少有一个结束节点',
        severity: 'error',
        suggestions: ['添加一个结束节点到工作流']
      },
      {
        id: 'single_start_node',
        name: '单一开始节点',
        description: '工作流只能有一个开始节点',
        condition: (graph: WorkflowGraph) => {
          const startNodes = Array.from(graph.nodes.values()).filter(node => node.type.isStart());
          return startNodes.length <= 1;
        },
        errorMessage: '工作流只能有一个开始节点',
        severity: 'error',
        suggestions: ['确保只有一个开始节点', '合并多个开始节点']
      },
      {
        id: 'connected_graph',
        name: '连通图要求',
        description: '工作流应该是连通图（所有节点都可达）',
        condition: (graph: WorkflowGraph) => {
          // 简化实现：检查是否有孤立节点（没有连接的节点）
          const nodesWithConnections = new Set<string>();
          
          for (const edge of graph.edges.values()) {
            nodesWithConnections.add(edge.fromNodeId.toString());
            nodesWithConnections.add(edge.toNodeId.toString());
          }
          
          for (const node of graph.nodes.values()) {
            if (!nodesWithConnections.has(node.nodeId.toString())) {
              // 允许开始和结束节点孤立
              if (node.type.isStart() || node.type.isEnd()) {
                continue;
              }
              return false;
            }
          }
          
          return true;
        },
        errorMessage: '工作流应该是一个连通图',
        severity: 'warning',
        suggestions: ['确保所有节点都通过边连接', '移除孤立节点']
      },
      {
        id: 'no_cycles',
        name: '无循环要求',
        description: '工作流不应该包含循环（除非明确设计）',
        condition: (graph: WorkflowGraph) => {
          // 使用图算法服务检测循环
          // 这里简化实现，实际应该注入GraphAlgorithmService
          return true; // 暂时返回true，实际实现需要检测循环
        },
        errorMessage: '工作流包含循环',
        severity: 'warning',
        suggestions: ['检查并移除循环', '使用条件节点控制循环']
      }
    ];
  }

  /**
   * 使用领域验证规则验证图
   */
  private validateWithDomainRule(graph: WorkflowGraph, domainRule: ValidationRule): ValidationResult {
    // 将WorkflowGraph转换为验证上下文
    const context = this.createValidationContext(graph);
    
    // 执行验证
    const errors = domainRule.validate(context);
    
    // 构建验证结果
    return ValidationUtils.createResult()
      .addErrors(errors)
      .withDuration(0) // 简化实现
      .build();
  }

  /**
   * 创建验证上下文
   */
  private createValidationContext(graph: WorkflowGraph): any {
    // 将WorkflowGraph转换为验证规则系统期望的格式
    const nodes = new Map<ID, any>();
    const edges = new Map<ID, any>();
    
    // 转换节点
    for (const node of graph.nodes.values()) {
      nodes.set(node.nodeId, {
        type: node.type.toString(),
        // 添加其他节点属性
      });
    }
    
    // 转换边
    for (const edge of graph.edges.values()) {
      edges.set(edge.edgeId, {
        source: edge.fromNodeId,
        target: edge.toNodeId,
        type: edge.type?.toString() || 'default',
        // 添加其他边属性
      });
    }
    
    return {
      workflowId: graph.workflowId,
      workflowData: {
        nodes: Array.from(nodes.entries()),
        edges: Array.from(edges.entries())
      },
      nodes,
      edges,
      config: {
        enabled: true,
        level: 'strict',
        failFast: false
      },
      rules: new Map<string, ValidationRule>(),
      contextData: new Map<string, any>()
    };
  }

  /**
   * 验证图的基本结构
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphStructure(graph: WorkflowGraph): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 检查节点数量
    if (graph.getNodeCount() === 0) {
      errors.push(
        ValidationUtils.createStructureError('工作流必须包含至少一个节点')
          .withWorkflowId(graph.workflowId)
          .build()
      );
    }
    
    // 检查边连接
    for (const edge of graph.edges.values()) {
      if (!graph.hasNode(edge.fromNodeId)) {
        errors.push(
          ValidationUtils.createReferenceError(`边 ${edge.edgeId} 的源节点不存在`)
            .withWorkflowId(graph.workflowId)
            .withEdgeId(edge.edgeId)
            .build()
        );
      }
      
      if (!graph.hasNode(edge.toNodeId)) {
        errors.push(
          ValidationUtils.createReferenceError(`边 ${edge.edgeId} 的目标节点不存在`)
            .withWorkflowId(graph.workflowId)
            .withEdgeId(edge.edgeId)
            .build()
        );
      }
    }
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 验证图的完整性
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphIntegrity(graph: WorkflowGraph): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 检查所有节点是否都有有效的类型
    for (const node of graph.nodes.values()) {
      try {
        node.validate();
      } catch (error) {
        errors.push(
          ValidationUtils.createStructureError(`节点 ${node.nodeId} 验证失败: ${error}`)
            .withWorkflowId(graph.workflowId)
            .withNodeId(node.nodeId)
            .build()
        );
      }
    }
    
    // 检查所有边是否都有有效的类型
    for (const edge of graph.edges.values()) {
      try {
        edge.validate();
      } catch (error) {
        errors.push(
          ValidationUtils.createStructureError(`边 ${edge.edgeId} 验证失败: ${error}`)
            .withWorkflowId(graph.workflowId)
            .withEdgeId(edge.edgeId)
            .build()
        );
      }
    }
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 验证节点连接
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateNodeConnections(graph: WorkflowGraph): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 检查孤立节点（没有连接的节点）
    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.nodeId);
      const outgoingEdges = graph.getOutgoingEdges(node.nodeId);
      
      if (incomingEdges.length === 0 && outgoingEdges.length === 0) {
        // 允许开始和结束节点孤立
        if (!node.type.isStart() && !node.type.isEnd()) {
          errors.push(
            ValidationUtils.createStructureError(`节点 ${node.nodeId} 是孤立节点，没有连接的边`)
              .withWorkflowId(graph.workflowId)
              .withNodeId(node.nodeId)
              .withSeverity(ValidationSeverity.WARNING)
              .build()
          );
        }
      }
    }
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 验证业务规则
   * @param graph 工作流图
   * @param rules 业务规则列表
   * @returns 验证结果
   */
  validateBusinessRules(graph: WorkflowGraph, rules: BusinessRule[] = this.businessRules): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (const rule of rules) {
      if (!rule.condition(graph)) {
        const severityMap: Record<string, ValidationSeverity> = {
          'info': ValidationSeverity.INFO,
          'warning': ValidationSeverity.WARNING,
          'error': ValidationSeverity.ERROR,
          'critical': ValidationSeverity.CRITICAL
        };
        
        errors.push(
          ValidationUtils.createStructureError(rule.errorMessage)
            .withWorkflowId(graph.workflowId)
            .withSeverity(severityMap[rule.severity] || ValidationSeverity.ERROR)
            .withSuggestions(rule.suggestions || [])
            .build()
        );
      }
    }
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 验证执行约束
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateExecutionConstraints(graph: WorkflowGraph): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 检查是否有开始节点
    const startNodes = Array.from(graph.nodes.values()).filter(node => node.type.isStart());
    if (startNodes.length === 0) {
      errors.push(
        ValidationUtils.createStructureError('工作流必须至少有一个开始节点')
          .withWorkflowId(graph.workflowId)
          .build()
      );
    }
    
    // 检查是否有结束节点
    const endNodes = Array.from(graph.nodes.values()).filter(node => node.type.isEnd());
    if (endNodes.length === 0) {
      errors.push(
        ValidationUtils.createStructureError('工作流必须至少有一个结束节点')
          .withWorkflowId(graph.workflowId)
          .build()
      );
    }
    
    // 检查开始节点数量
    if (startNodes.length > 1) {
      errors.push(
        ValidationUtils.createStructureError('工作流只能有一个开始节点')
          .withWorkflowId(graph.workflowId)
          .build()
      );
    }
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 验证图的有效性（综合验证）
   * @param graph 工作流图
   * @param config 验证配置
   * @returns 验证结果
   */
  validateGraph(graph: WorkflowGraph, config?: ValidationConfig): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    
    // 执行所有验证
    const structureResult = this.validateGraphStructure(graph);
    const integrityResult = this.validateGraphIntegrity(graph);
    const connectionsResult = this.validateNodeConnections(graph);
    const constraintsResult = this.validateExecutionConstraints(graph);
    const businessRulesResult = this.validateBusinessRules(graph);
    
    // 合并所有错误
    errors.push(
      ...structureResult.errors,
      ...integrityResult.errors,
      ...connectionsResult.errors,
      ...constraintsResult.errors,
      ...businessRulesResult.errors
    );
    
    const duration = Date.now() - startTime;
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .withDuration(duration)
      .build();
  }

  /**
   * 验证节点
   * @param graph 工作流图
   * @param nodeId 节点ID
   * @param config 验证配置
   * @returns 验证结果
   */
  validateNode(graph: WorkflowGraph, nodeId: ID, config?: ValidationConfig): ValidationResult {
    const node = graph.getNode(nodeId);
    const errors: ValidationError[] = [];
    
    if (!node) {
      errors.push(
        ValidationUtils.createReferenceError(`节点 ${nodeId} 不存在`)
          .withWorkflowId(graph.workflowId)
          .withNodeId(nodeId)
          .build()
      );
      
      return ValidationUtils.createResult()
        .addErrors(errors)
        .build();
    }
    
    // 验证节点本身
    try {
      node.validate();
    } catch (error) {
      errors.push(
        ValidationUtils.createStructureError(`节点 ${nodeId} 验证失败: ${error}`)
          .withWorkflowId(graph.workflowId)
          .withNodeId(nodeId)
          .build()
      );
    }
    
    // 验证节点连接
    const incomingEdges = graph.getIncomingEdges(nodeId);
    const outgoingEdges = graph.getOutgoingEdges(nodeId);
    
    // 检查节点类型约束
    if (node.type.isStart() && incomingEdges.length > 0) {
      errors.push(
        ValidationUtils.createSemanticError(`开始节点 ${nodeId} 不应该有入边`)
          .withWorkflowId(graph.workflowId)
          .withNodeId(nodeId)
          .withSeverity(ValidationSeverity.WARNING)
          .build()
      );
    }
    
    if (node.type.isEnd() && outgoingEdges.length > 0) {
      errors.push(
        ValidationUtils.createSemanticError(`结束节点 ${nodeId} 不应该有出边`)
          .withWorkflowId(graph.workflowId)
          .withNodeId(nodeId)
          .withSeverity(ValidationSeverity.WARNING)
          .build()
      );
    }
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 验证边
   * @param graph 工作流图
   * @param edgeId 边ID
   * @param config 验证配置
   * @returns 验证结果
   */
  validateEdge(graph: WorkflowGraph, edgeId: ID, config?: ValidationConfig): ValidationResult {
    const edge = graph.getEdge(edgeId);
    const errors: ValidationError[] = [];
    
    if (!edge) {
      errors.push(
        ValidationUtils.createReferenceError(`边 ${edgeId} 不存在`)
          .withWorkflowId(graph.workflowId)
          .withEdgeId(edgeId)
          .build()
      );
      
      return ValidationUtils.createResult()
        .addErrors(errors)
        .build();
    }
    
    // 验证边本身
    try {
      edge.validate();
    } catch (error) {
      errors.push(
        ValidationUtils.createStructureError(`边 ${edgeId} 验证失败: ${error}`)
          .withWorkflowId(graph.workflowId)
          .withEdgeId(edgeId)
          .build()
      );
    }
    
    // 验证边连接
    if (!graph.hasNode(edge.fromNodeId)) {
      errors.push(
        ValidationUtils.createReferenceError(`边 ${edgeId} 的源节点不存在`)
          .withWorkflowId(graph.workflowId)
          .withEdgeId(edgeId)
          .build()
      );
    }
    
    if (!graph.hasNode(edge.toNodeId)) {
      errors.push(
        ValidationUtils.createReferenceError(`边 ${edgeId} 的目标节点不存在`)
          .withWorkflowId(graph.workflowId)
          .withEdgeId(edgeId)
          .build()
      );
    }
    
    return ValidationUtils.createResult()
      .addErrors(errors)
      .build();
  }

  /**
   * 检查图是否可执行
   * @param graph 工作流图
   * @returns 是否可执行
   */
  isExecutable(graph: WorkflowGraph): boolean {
    const validationResult = this.validateGraph(graph);
    
    // 检查是否有错误或严重错误
    const hasErrors = validationResult.errors.some(error => 
      error.severity === ValidationSeverity.ERROR || error.severity === ValidationSeverity.CRITICAL
    );
    
    return !hasErrors;
  }

  /**
   * 获取验证规则列表
   * @returns 验证规则列表
   */
  getValidationRules(): GraphValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * 添加自定义验证规则
   * @param rule 验证规则
   */
  addValidationRule(rule: GraphValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * 移除验证规则
   * @param ruleId 规则ID
   * @returns 是否成功移除
   */
  removeValidationRule(ruleId: string): boolean {
    const index = this.validationRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.validationRules.splice(index, 1);
      return true;
    }
    return false;
  }
}