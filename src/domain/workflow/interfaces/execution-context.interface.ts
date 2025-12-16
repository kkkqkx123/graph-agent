import { Graph } from '@domain/workflow/entities/graph';
import { NodeId } from '@/domain/workflow/value-objects/node-id';
import { EdgeId } from '@/domain/workflow/value-objects/edge-id';

/**
 * 执行上下文接口
 * 
 * 定义了工作流执行过程中的上下文信息和方法，
 * 包括节点执行跟踪、变量管理、元数据管理等
 */
export interface IExecutionContext {
  /**
   * 获取工作流图
   */
  getGraph(): Graph;

  /**
   * 获取输入数据
   */
  getInput(): any;

  /**
   * 获取执行ID
   */
  getExecutionId(): string;

  /**
   * 获取开始时间
   */
  getStartTime(): number;

  /**
   * 获取已执行时间（毫秒）
   */
  getElapsedTime(): number;

  // Node execution tracking
  /**
   * 标记节点为已执行
   */
  markNodeExecuted(nodeId: NodeId): void;

  /**
   * 检查节点是否已执行
   */
  isNodeExecuted(nodeId: NodeId): boolean;

  /**
   * 获取已执行节点集合
   */
  getExecutedNodes(): Set<string>;

  /**
   * 设置节点执行结果
   */
  setNodeResult(nodeId: NodeId, result: any): void;

  /**
   * 获取节点执行结果
   */
  getNodeResult(nodeId: NodeId): any;

  /**
   * 获取所有节点执行结果
   */
  getAllNodeResults(): Map<string, any>;

  // Edge evaluation tracking
  /**
   * 设置边评估结果
   */
  setEdgeResult(edgeId: EdgeId, result: boolean): void;

  /**
   * 获取边评估结果
   */
  getEdgeResult(edgeId: EdgeId): boolean | undefined;

  /**
   * 获取所有边评估结果
   */
  getAllEdgeResults(): Map<string, boolean>;

  // Variable management
  /**
   * 设置变量
   */
  setVariable(name: string, value: any): void;

  /**
   * 获取变量
   */
  getVariable(name: string): any;

  /**
   * 检查变量是否存在
   */
  hasVariable(name: string): boolean;

  /**
   * 删除变量
   */
  deleteVariable(name: string): boolean;

  /**
   * 获取所有变量
   */
  getAllVariables(): Map<string, any>;

  // Metadata management
  /**
   * 设置元数据
   */
  setMetadata(key: string, value: any): void;

  /**
   * 获取元数据
   */
  getMetadata(key: string): any;

  /**
   * 检查元数据是否存在
   */
  hasMetadata(key: string): boolean;

  /**
   * 删除元数据
   */
  deleteMetadata(key: string): boolean;

  /**
   * 获取所有元数据
   */
  getAllMetadata(): Map<string, any>;
}