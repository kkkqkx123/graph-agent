import { WorkflowGraph } from '../entities/workflow-graph';
import { Node } from '../entities/nodes/base/node';
import { Edge } from '../entities/edges/base/edge';
import { ID } from '../../common/value-objects/id';
import { ValidationResult, ValidationConfig } from '../validation/validation-rules';

/**
 * 图验证服务接口
 * 
 * 提供图结构验证功能，专注于业务规则验证：
 * 1. 图结构验证（完整性、连接性）
 * 2. 业务规则验证（开始/结束节点规则）
 * 3. 执行约束验证
 * 4. 图有效性验证
 * 
 * 此接口定义图验证的契约，具体实现在基础设施层提供。
 */
export interface GraphValidationService {
  /**
   * 验证图的基本结构
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphStructure(graph: WorkflowGraph): ValidationResult;

  /**
   * 验证图的完整性
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphIntegrity(graph: WorkflowGraph): ValidationResult;

  /**
   * 验证节点连接
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateNodeConnections(graph: WorkflowGraph): ValidationResult;

  /**
   * 验证业务规则
   * @param graph 工作流图
   * @param rules 业务规则列表
   * @returns 验证结果
   */
  validateBusinessRules(graph: WorkflowGraph, rules: BusinessRule[]): ValidationResult;

  /**
   * 验证执行约束
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateExecutionConstraints(graph: WorkflowGraph): ValidationResult;

  /**
   * 验证图的有效性（综合验证）
   * @param graph 工作流图
   * @param config 验证配置
   * @returns 验证结果
   */
  validateGraph(graph: WorkflowGraph, config?: ValidationConfig): ValidationResult;

  /**
   * 验证节点
   * @param graph 工作流图
   * @param nodeId 节点ID
   * @param config 验证配置
   * @returns 验证结果
   */
  validateNode(graph: WorkflowGraph, nodeId: ID, config?: ValidationConfig): ValidationResult;

  /**
   * 验证边
   * @param graph 工作流图
   * @param edgeId 边ID
   * @param config 验证配置
   * @returns 验证结果
   */
  validateEdge(graph: WorkflowGraph, edgeId: ID, config?: ValidationConfig): ValidationResult;

  /**
   * 检查图是否可执行
   * @param graph 工作流图
   * @returns 是否可执行
   */
  isExecutable(graph: WorkflowGraph): boolean;

  /**
   * 获取验证规则列表
   * @returns 验证规则列表
   */
  getValidationRules(): ValidationRule[];

  /**
   * 添加自定义验证规则
   * @param rule 验证规则
   */
  addValidationRule(rule: ValidationRule): void;

  /**
   * 移除验证规则
   * @param ruleId 规则ID
   * @returns 是否成功移除
   */
  removeValidationRule(ruleId: string): boolean;
}

/**
 * 业务规则接口
 */
export interface BusinessRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 规则条件 */
  condition: (graph: WorkflowGraph) => boolean;
  /** 错误消息 */
  errorMessage: string;
  /** 严重程度 */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** 修复建议 */
  suggestions?: string[];
}

/**
 * 验证规则接口（简化版）
 */
export interface ValidationRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 验证函数 */
  validate: (graph: WorkflowGraph) => ValidationResult;
  /** 是否启用 */
  enabled: boolean;
}