import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue } from '../../../domain/workflow/value-objects/node/node-type';

/**
 * 节点执行结果接口
 */
export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 节点元数据接口
 */
export interface NodeMetadata {
  id: string;
  type: string;
  name?: string;
  description?: string;
  parameters: NodeParameter[];
}

/**
 * 节点参数接口
 */
export interface NodeParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 工作流执行上下文接口
 */
export interface WorkflowExecutionContext {
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getExecutionId(): string;
  getWorkflowId(): string;
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
  getAllVariables(): Record<string, any>;
  getService<T>(serviceName: string): T;
}

/**
 * 节点抽象基类
 * 所有具体节点类型都继承此类
 */
export abstract class Node {
  protected constructor(
    public readonly id: NodeId,
    public readonly type: NodeType,
    public readonly name?: string,
    public readonly description?: string,
    public readonly position?: { x: number; y: number }
  ) {}

  /**
   * 执行节点
   * @param context 执行上下文
   * @returns 执行结果
   */
  abstract execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult>;

  /**
   * 验证节点配置
   * @returns 验证结果
   */
  abstract validate(): ValidationResult;

  /**
   * 获取节点元数据
   * @returns 节点元数据
   */
  abstract getMetadata(): NodeMetadata;

  /**
   * 获取节点类型值
   * @returns 节点类型值
   */
  getNodeTypeValue(): NodeTypeValue {
    return this.type.getValue();
  }

  /**
   * 检查节点是否可以执行
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  canExecute(context: WorkflowExecutionContext): boolean {
    const validation = this.validate();
    return validation.valid;
  }
}