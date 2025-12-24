import { injectable } from 'inversify';
import {
  GraphValidationService,
  BusinessRule,
  ValidationRule as GraphValidationRule
} from '../../../domain/workflow/interfaces/graph-validation-service.interface';
import { WorkflowGraph } from '../../../domain/workflow/entities/workflow-graph';

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
export class GraphValidationServiceImpl implements GraphValidationService {
  private validationRules: GraphValidationRule[] = [];
  private businessRules: BusinessRule[] = [];

  constructor() {
    this.initializeValidationRules();
    this.initializeBusinessRules();
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
        validate: (graph: WorkflowGraph) => this.validateGraphStructure(graph),
        enabled: true
      },
      {
        id: 'graph_integrity',
        name: '图完整性验证',
        description: '验证图元素的完整性',
        validate: (graph: WorkflowGraph) => this.validateGraphIntegrity(graph),
        enabled: true
      },
      {
        id: 'node_connections',
        name: '节点连接验证',
        description: '验证节点连接的有效性',
        validate: (graph: WorkflowGraph) => this.validateNodeConnections(graph),
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
   * 验证图的基本结构
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphStructure(graph: WorkflowGraph): boolean {
    // 检查节点数量
    if (graph.getNodeCount() === 0) {
      return false;
    }

    // 检查边连接
    for (const edge of graph.edges.values()) {
      if (!graph.hasNode(edge.fromNodeId) || !graph.hasNode(edge.toNodeId)) {
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
  validateGraphIntegrity(graph: WorkflowGraph): boolean {
    // 检查所有节点的ID是否有效
    for (const node of graph.nodes.values()) {
      if (!node.nodeId || node.nodeId.toString().trim() === '') {
        return false;
      }
    }

    // 检查所有边的ID是否有效
    for (const edge of graph.edges.values()) {
      if (!edge.edgeId || edge.edgeId.toString().trim() === '') {
        return false;
      }
    }

    // 检查边的连接是否有效
    for (const edge of graph.edges.values()) {
      if (!graph.hasNode(edge.fromNodeId) || !graph.hasNode(edge.toNodeId)) {
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
  validateNodeConnections(graph: WorkflowGraph): boolean {
    // 检查每个节点的连接是否符合其类型要求
    for (const node of graph.nodes.values()) {
      const incomingEdges = Array.from(graph.edges.values()).filter(edge => edge.toNodeId.equals(node.nodeId));
      const outgoingEdges = Array.from(graph.edges.values()).filter(edge => edge.fromNodeId.equals(node.nodeId));

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
  validateGraph(graph: WorkflowGraph): boolean {
    // 执行所有验证规则
    for (const rule of this.validationRules) {
      if (rule.enabled && !rule.validate(graph)) {
        return false;
      }
    }

    // 执行所有业务规则
    for (const rule of this.businessRules) {
      if (!rule.condition(graph)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查图是否可执行
   * @param graph 工作流图
   * @returns 是否可执行
   */
  isExecutable(graph: WorkflowGraph): boolean {
    // 检查是否有开始节点
    const startNodes = Array.from(graph.nodes.values()).filter(node => node.type.isStart());
    if (startNodes.length === 0) {
      return false;
    }

    // 检查是否有结束节点
    const endNodes = Array.from(graph.nodes.values()).filter(node => node.type.isEnd());
    if (endNodes.length === 0) {
      return false;
    }

    // 检查图的基本结构
    if (!this.validateGraphStructure(graph)) {
      return false;
    }

    // 检查节点连接
    if (!this.validateNodeConnections(graph)) {
      return false;
    }

    return true;
  }

  /**
   * 获取验证规则
   * @returns 验证规则列表
   */
  getValidationRules(): GraphValidationRule[] {
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
  addValidationRule(rule: GraphValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * 添加自定义业务规则
   * @param rule 业务规则
   */
  addBusinessRule(rule: BusinessRule): void {
    this.businessRules.push(rule);
  }
}