/**
 * 图验证服务接口
 *
 * 定义工作流图验证的业务契约
 * 具体实现在基础设施层提供
 */

import { Workflow } from '../entities/workflow';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否验证通过 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 图验证服务接口
 */
export interface GraphValidationService {
  /**
   * 验证工作流图结构
   * @param workflow 工作流
   * @returns 验证结果
   */
  validateGraph(workflow: Workflow): boolean;

  /**
   * 验证工作流图结构（详细）
   * @param workflow 工作流
   * @returns 详细验证结果
   */
  validateGraphDetailed(workflow: Workflow): ValidationResult;

  /**
   * 验证节点配置
   * @param workflow 工作流
   * @returns 验证结果
   */
  validateNodes(workflow: Workflow): ValidationResult;

  /**
   * 验证边配置
   * @param workflow 工作流
   * @returns 验证结果
   */
  validateEdges(workflow: Workflow): ValidationResult;

  /**
   * 验证工作流可执行性
   * @param workflow 工作流
   * @returns 验证结果
   */
  validateExecutable(workflow: Workflow): ValidationResult;
}