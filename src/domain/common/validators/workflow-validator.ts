import { Workflow } from '../../workflow/entities/workflow';
import { WorkflowStatus } from '../../workflow/value-objects/workflow-status';
import { DomainValidator, ValidationResultBuilder, ValidationResult } from './domain-validator';
import { ID } from '../value-objects/id';

/**
 * 工作流验证器
 * 
 * 专门处理工作流相关的验证逻辑
 */
export class WorkflowValidator extends DomainValidator<Workflow> {
  validate(workflow: Workflow): ValidationResult {
    const builder = new ValidationResultBuilder();

    // 验证基本字段
    this.validateRequired(workflow.workflowId, '工作流ID', builder);
    this.validateRequired(workflow.name, '工作流名称', builder);
    this.validateRequired(workflow.status, '工作流状态', builder);

    // 验证工作流名称
    this.validateWorkflowName(workflow.name, builder);

    // 验证工作流状态
    this.validateWorkflowStatus(workflow, builder);

    // 验证工作流结构
    this.validateWorkflowStructure(workflow, builder);

    // 验证工作流配置
    this.validateWorkflowConfig(workflow, builder);

    return builder.build();
  }

  /**
   * 验证工作流名称
   */
  private validateWorkflowName(name: string, builder: ValidationResultBuilder): void {
    this.validateStringLength(name, '工作流名称', 1, 100, builder);
    
    // 验证名称格式（只允许字母、数字、中文、下划线、连字符）
    const nameRegex = /^[\w\u4e00-\u9fa5\-]+$/;
    this.validateRegex(name, '工作流名称', nameRegex, '工作流名称只能包含字母、数字、中文、下划线和连字符', builder);
  }

  /**
   * 验证工作流状态
   */
  private validateWorkflowStatus(workflow: Workflow, builder: ValidationResultBuilder): void {
    const status = workflow.status;
    
    // 检查状态转换是否合法
    if (status.isDeleted() && workflow.nodes.size > 0) {
      builder.addWarning('已删除的工作流仍包含节点，建议清理');
    }

    // 检查活跃工作流的完整性
    if (status.isActive()) {
      if (workflow.nodes.size === 0) {
        builder.addError('活跃工作流必须包含至少一个节点');
      }
      
      if (workflow.edges.size === 0 && workflow.nodes.size > 1) {
        builder.addWarning('多节点工作流建议添加边来连接节点');
      }
    }
  }

  /**
   * 验证工作流结构
   */
  private validateWorkflowStructure(workflow: Workflow, builder: ValidationResultBuilder): void {
    const nodes = workflow.nodes;
    const edges = workflow.edges;

    // 验证节点
    for (const [nodeId, node] of nodes) {
      const nodeIdObj = ID.fromString(nodeId);
      if (!nodeIdObj.equals(node.nodeId)) {
        builder.addError(`节点ID不匹配: ${nodeId} vs ${node.nodeId}`);
      }

      if (!node.workflowId.equals(workflow.workflowId)) {
        builder.addError(`节点 ${nodeId} 不属于当前工作流`);
      }
    }

    // 验证边
    for (const [edgeId, edge] of edges) {
      const edgeIdObj = ID.fromString(edgeId);
      if (!edgeIdObj.equals(edge.edgeId)) {
        builder.addError(`边ID不匹配: ${edgeId} vs ${edge.edgeId}`);
      }

      if (!edge.workflowId.equals(workflow.workflowId)) {
        builder.addError(`边 ${edgeId} 不属于当前工作流`);
      }

      // 验证边的源节点和目标节点是否存在
      if (!nodes.has(edge.fromNodeId.toString())) {
        builder.addError(`边 ${edgeId} 的源节点 ${edge.fromNodeId} 不存在`);
      }

      if (!nodes.has(edge.toNodeId.toString())) {
        builder.addError(`边 ${edgeId} 的目标节点 ${edge.toNodeId} 不存在`);
      }
    }

    // 检查孤立节点（没有连接的边）
    const connectedNodeIds = new Set<string>();
    for (const edge of edges.values()) {
      connectedNodeIds.add(edge.fromNodeId.toString());
      connectedNodeIds.add(edge.toNodeId.toString());
    }

    for (const nodeId of nodes.keys()) {
      if (!connectedNodeIds.has(nodeId) && nodes.size > 1) {
        builder.addWarning(`节点 ${nodeId} 是孤立节点，没有连接任何边`);
      }
    }
  }

  /**
   * 验证工作流配置
   */
  private validateWorkflowConfig(workflow: Workflow, builder: ValidationResultBuilder): void {
    if (!workflow.config) {
      builder.addWarning('工作流缺少配置信息');
      return;
    }

    // 验证执行策略
    if (!workflow.executionStrategy) {
      builder.addError('工作流缺少执行策略');
    }

    // 验证错误处理策略
    if (!workflow.errorHandlingStrategy) {
      builder.addWarning('工作流缺少错误处理策略');
    }
  }

  /**
   * 验证工作流是否可以执行
   */
  validateForExecution(workflow: Workflow): ValidationResult {
    const builder = new ValidationResultBuilder();

    // 基本验证
    const basicResult = this.validate(workflow);
    builder.merge(basicResult);

    // 检查状态是否允许执行
    if (!workflow.status.canExecute()) {
      builder.addError(`工作流状态 ${workflow.status} 不允许执行`);
    }

    // 检查是否有节点
    if (workflow.nodes.size === 0) {
      builder.addError('工作流没有节点，无法执行');
    }

    // 检查是否有执行策略
    if (!workflow.executionStrategy) {
      builder.addError('工作流缺少执行策略，无法执行');
    }

    return builder.build();
  }

  /**
   * 验证工作流是否可以编辑
   */
  validateForEditing(workflow: Workflow): ValidationResult {
    const builder = new ValidationResultBuilder();

    // 基本验证
    const basicResult = this.validate(workflow);
    builder.merge(basicResult);

    // 检查状态是否允许编辑
    if (!workflow.status.canEdit()) {
      builder.addError(`工作流状态 ${workflow.status} 不允许编辑`);
    }

    return builder.build();
  }

  /**
   * 验证工作流是否可以删除
   */
  validateForDeletion(workflow: Workflow): ValidationResult {
    const builder = new ValidationResultBuilder();

    // 基本验证
    const basicResult = this.validate(workflow);
    builder.merge(basicResult);

    // 检查是否已经删除
    if (workflow.isDeleted()) {
      builder.addWarning('工作流已经被删除');
    }

    // 检查是否有正在运行的执行
    if (workflow.status.isActive()) {
      builder.addWarning('工作流正在活跃状态，删除可能影响正在运行的执行');
    }

    return builder.build();
  }
}