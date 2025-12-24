import { Workflow, NodeData, EdgeData } from '../entities/workflow';
import { ID } from '../../common/value-objects/id';

/**
 * 验证错误类型
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误ID */
  id: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  severity: ValidationSeverity;
  /** 错误位置 */
  location?: string;
  /** 修复建议 */
  suggestions?: string[];
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationError[];
  /** 信息列表 */
  info: ValidationError[];
}

/**
 * 业务规则
 */
export interface BusinessRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 验证条件 */
  condition: (workflow: Workflow) => boolean;
  /** 错误消息 */
  errorMessage: string;
  /** 严重程度 */
  severity: ValidationSeverity;
  /** 修复建议 */
  suggestions?: string[];
}

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 验证函数 */
  validate: (workflow: Workflow) => boolean;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 图验证服务接口
 * 
 * 提供图结构验证功能，专注于业务规则验证：
 * 1. 图结构验证（完整性、连接性）
 * 2. 业务规则验证（开始/结束节点规则）
 * 3. 执行约束验证
 * 4. 图有效性验证
 * 
 * 简化接口，移除复杂的验证规则系统依赖。
 */
export interface GraphValidationService {
  /**
   * 验证图的基本结构
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphStructure(workflow: Workflow): boolean;

  /**
   * 验证图的完整性
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraphIntegrity(workflow: Workflow): boolean;

  /**
   * 验证节点连接
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateNodeConnections(workflow: Workflow): boolean;

  /**
   * 验证图的有效性（综合验证）
   * @param graph 工作流图
   * @returns 验证结果
   */
  validateGraph(workflow: Workflow): boolean;

  /**
   * 检查图是否可执行
   * @param graph 工作流图
   * @returns 是否可执行
   */
  isExecutable(workflow: Workflow): boolean;

  /**
   * 获取验证规则
   * @returns 验证规则列表
   */
  getValidationRules(): ValidationRule[];

  /**
   * 获取业务规则
   * @returns 业务规则列表
   */
  getBusinessRules(): BusinessRule[];

  /**
   * 启用验证规则
   * @param ruleId 规则ID
   */
  enableValidationRule(ruleId: string): void;

  /**
   * 禁用验证规则
   * @param ruleId 规则ID
   */
  disableValidationRule(ruleId: string): void;

  /**
   * 添加自定义验证规则
   * @param rule 验证规则
   */
  addValidationRule(rule: ValidationRule): void;

  /**
   * 添加自定义业务规则
   * @param rule 业务规则
   */
  addBusinessRule(rule: BusinessRule): void;
}