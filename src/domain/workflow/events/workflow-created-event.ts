import { DomainEvent } from '../../common/events/domain-event';
import { ID } from '../../common/value-objects/id';

/**
 * 工作流创建事件接口
 */
export interface WorkflowCreatedEventData {
  workflowId: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  graphId?: string;
  createdBy?: string;
  [key: string]: unknown;
}

/**
 * 工作流创建事件
 * 
 * 当工作流被创建时触发此事件
 */
export class WorkflowCreatedEvent extends DomainEvent {
  private readonly data: WorkflowCreatedEventData;

  /**
   * 构造函数
   * @param workflowId 工作流ID
   * @param name 工作流名称
   * @param description 工作流描述
   * @param type 工作流类型
   * @param status 工作流状态
   * @param config 工作流配置
   * @param graphId 图ID
   * @param createdBy 创建者ID
   */
  constructor(
    workflowId: ID,
    name: string,
    description?: string,
    type?: string,
    status?: string,
    config?: Record<string, unknown>,
    graphId?: ID,
    createdBy?: ID
  ) {
    super(workflowId);
    this.data = {
      workflowId: workflowId.toString(),
      name,
      description,
      type: type || 'sequential',
      status: status || 'draft',
      config: config || {},
      graphId: graphId?.toString(),
      createdBy: createdBy?.toString()
    };
  }

  /**
   * 获取事件名称
   * @returns 事件名称
   */
  public get eventName(): string {
    return 'WorkflowCreated';
  }

  /**
   * 获取事件数据
   * @returns 事件数据
   */
  public getData(): WorkflowCreatedEventData {
    return { ...this.data };
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public getWorkflowId(): string {
    return this.data.workflowId;
  }

  /**
   * 获取工作流名称
   * @returns 工作流名称
   */
  public getName(): string {
    return this.data.name;
  }

  /**
   * 获取工作流描述
   * @returns 工作流描述
   */
  public getDescription(): string | undefined {
    return this.data.description;
  }

  /**
   * 获取工作流类型
   * @returns 工作流类型
   */
  public getType(): string {
    return this.data.type;
  }

  /**
   * 获取工作流状态
   * @returns 工作流状态
   */
  public getStatus(): string {
    return this.data.status;
  }

  /**
   * 获取工作流配置
   * @returns 工作流配置
   */
  public getConfig(): Record<string, unknown> {
    return { ...this.data.config };
  }

  /**
   * 获取图ID
   * @returns 图ID
   */
  public getGraphId(): string | undefined {
    return this.data.graphId;
  }

  /**
   * 获取创建者ID
   * @returns 创建者ID
   */
  public getCreatedBy(): string | undefined {
    return this.data.createdBy;
  }
}