import { ValueObject } from '../../../common/value-objects';
import { ID } from '../../../common/value-objects';
import { HookPoint } from './hook-point';
import { ValidationError } from '../../../../common/exceptions';

/**
 * 钩子上下文值对象属性接口
 */
export interface HookContextProps {
  workflowId?: ID;
  executionId?: string;
  nodeId?: string;
  edgeId?: string;
  variables: Map<string, any>;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  hookPoint?: HookPoint;
  eventType?: string;
  eventData?: Record<string, any>;
}

/**
 * 钩子上下文值对象
 *
 * 提供钩子执行时所需的上下文信息
 */
export class HookContext extends ValueObject<HookContextProps> {
  private nodeResults: Map<string, any> = new Map();

  constructor(props: HookContextProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证钩子上下文
   */
  public validate(): void {
    if (!this.props.variables) {
      throw new ValidationError('变量映射不能为空');
    }
  }

  /**
   * 获取工作流ID
   */
  public getWorkflowId(): ID | undefined {
    return this.props.workflowId;
  }

  /**
   * 获取执行ID
   */
  public getExecutionId(): string | undefined {
    return this.props.executionId;
  }

  /**
   * 获取节点ID
   */
  public getNodeId(): string | undefined {
    return this.props.nodeId;
  }

  /**
   * 获取边ID
   */
  public getEdgeId(): string | undefined {
    return this.props.edgeId;
  }

  /**
   * 获取钩子配置数据
   */
  public getConfig(): Record<string, any> | undefined {
    return this.props.config;
  }

  /**
   * 获取元数据
   */
  public getMetadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  /**
   * 获取钩子执行点
   */
  public getHookPoint(): HookPoint | undefined {
    return this.props.hookPoint;
  }

  /**
   * 获取触发钩子的事件类型
   */
  public getEventType(): string | undefined {
    return this.props.eventType;
  }

  /**
   * 获取事件数据
   */
  public getEventData(): Record<string, any> | undefined {
    return this.props.eventData;
  }

  /**
   * 获取变量
   */
  public getVariable(key: string): any {
    return this.props.variables.get(key);
  }

  /**
   * 设置变量
   */
  public setVariable(key: string, value: any): void {
    this.props.variables.set(key, value);
  }

  /**
   * 获取所有变量
   */
  public getAllVariables(): Record<string, any> {
    const result: Record<string, any> = {};
    this.props.variables.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 获取节点执行结果
   */
  public getNodeResult(nodeId: string): any {
    return this.nodeResults.get(nodeId);
  }

  /**
   * 设置节点执行结果
   */
  public setNodeResult(nodeId: string, result: any): void {
    this.nodeResults.set(nodeId, result);
  }

  /**
   * 创建钩子上下文值对象
   */
  public static create(props: HookContextProps): HookContext {
    return new HookContext(props);
  }

  /**
   * 创建空的钩子上下文
   */
  public static empty(): HookContext {
    return new HookContext({
      variables: new Map(),
    });
  }

  /**
   * 比较两个钩子上下文是否相等
   */
  public override equals(vo?: ValueObject<HookContextProps>): boolean {
    if (!vo) return false;
    const other = vo as HookContext;

    const workflowIdEquals =
      this.props.workflowId && other.props.workflowId
        ? this.props.workflowId.equals(other.props.workflowId)
        : this.props.workflowId === other.props.workflowId;

    return (
      workflowIdEquals &&
      this.props.executionId === other.props.executionId &&
      this.props.nodeId === other.props.nodeId &&
      this.props.edgeId === other.props.edgeId
    );
  }

  /**
   * 转换为字符串
   */
  public override toString(): string {
    return `HookContext(workflowId=${this.props.workflowId?.toString()}, executionId=${this.props.executionId}, nodeId=${this.props.nodeId})`;
  }
}