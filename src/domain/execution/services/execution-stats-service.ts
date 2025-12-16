import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { DomainError } from '../../common/errors/domain-error';
import { ExecutionStatsRepository } from '../repositories/execution-stats-repository';

/**
 * 执行统计实体接口
 */
export interface ExecutionStatsProps {
  id: ID;
  workflowId: ID;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime?: number;
  lastExecutedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 执行统计值对象
 */
export class ExecutionStats {
  private readonly props: ExecutionStatsProps;

  constructor(props: ExecutionStatsProps) {
    this.props = Object.freeze(props);
  }

  /**
   * 创建新的执行统计
   * @param workflowId 工作流ID
   * @returns 执行统计实例
   */
  public static create(workflowId: ID): ExecutionStats {
    const now = Timestamp.now();
    const statsId = ID.generate();

    const props: ExecutionStatsProps = {
      id: statsId,
      workflowId,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: undefined,
      lastExecutedAt: undefined,
      createdAt: now,
      updatedAt: now
    };

    return new ExecutionStats(props);
  }

  /**
   * 从已有属性重建执行统计
   * @param props 执行统计属性
   * @returns 执行统计实例
   */
  public static fromProps(props: ExecutionStatsProps): ExecutionStats {
    return new ExecutionStats(props);
  }

  /**
   * 获取统计ID
   * @returns 统计ID
   */
  public get id(): ID {
    return this.props.id;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取执行次数
   * @returns 执行次数
   */
  public get executionCount(): number {
    return this.props.executionCount;
  }

  /**
   * 获取成功次数
   * @returns 成功次数
   */
  public get successCount(): number {
    return this.props.successCount;
  }

  /**
   * 获取失败次数
   * @returns 失败次数
   */
  public get failureCount(): number {
    return this.props.failureCount;
  }

  /**
   * 获取平均执行时间
   * @returns 平均执行时间（秒）
   */
  public get averageExecutionTime(): number | undefined {
    return this.props.averageExecutionTime;
  }

  /**
   * 获取最后执行时间
   * @returns 最后执行时间
   */
  public get lastExecutedAt(): Timestamp | undefined {
    return this.props.lastExecutedAt;
  }

  /**
   * 获取成功率
   * @returns 成功率（0-1）
   */
  public getSuccessRate(): number {
    if (this.props.executionCount === 0) {
      return 0;
    }
    return this.props.successCount / this.props.executionCount;
  }

  /**
   * 获取失败率
   * @returns 失败率（0-1）
   */
  public getFailureRate(): number {
    if (this.props.executionCount === 0) {
      return 0;
    }
    return this.props.failureCount / this.props.executionCount;
  }

  /**
   * 记录执行结果
   * @param success 是否成功
   * @param executionTime 执行时间（秒）
   * @returns 更新后的执行统计
   */
  public recordExecution(success: boolean, executionTime: number): ExecutionStats {
    const newExecutionCount = this.props.executionCount + 1;
    const newSuccessCount = success ? this.props.successCount + 1 : this.props.successCount;
    const newFailureCount = success ? this.props.failureCount : this.props.failureCount + 1;

    // 计算新的平均执行时间
    const currentTotalTime = (this.props.averageExecutionTime || 0) * this.props.executionCount;
    const newAverageExecutionTime = (currentTotalTime + executionTime) / newExecutionCount;

    const newProps: ExecutionStatsProps = {
      ...this.props,
      executionCount: newExecutionCount,
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      averageExecutionTime: newAverageExecutionTime,
      lastExecutedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    return new ExecutionStats(newProps);
  }

  /**
   * 验证执行统计的有效性
   */
  public validate(): void {
    if (!this.props.id) {
      throw new DomainError('执行统计ID不能为空');
    }

    if (!this.props.workflowId) {
      throw new DomainError('工作流ID不能为空');
    }

    if (this.props.executionCount < 0) {
      throw new DomainError('执行次数不能为负数');
    }

    if (this.props.successCount < 0) {
      throw new DomainError('成功次数不能为负数');
    }

    if (this.props.failureCount < 0) {
      throw new DomainError('失败次数不能为负数');
    }

    if (this.props.successCount + this.props.failureCount > this.props.executionCount) {
      throw new DomainError('成功和失败次数之和不能超过总执行次数');
    }

    if (this.props.averageExecutionTime !== undefined && this.props.averageExecutionTime < 0) {
      throw new DomainError('平均执行时间不能为负数');
    }
  }
}

/**
 * 执行统计领域服务
 */
export class ExecutionStatsDomainService {
  /**
   * 构造函数
   * @param executionStatsRepository 执行统计仓储
   */
  constructor(private readonly executionStatsRepository: ExecutionStatsRepository) {}

  /**
   * 记录工作流执行结果
   * @param workflowId 工作流ID
   * @param success 是否成功
   * @param executionTime 执行时间（秒）
   * @returns 更新后的执行统计
   */
  async recordWorkflowExecution(
    workflowId: ID,
    success: boolean,
    executionTime: number
  ): Promise<ExecutionStats> {
    // 获取或创建执行统计
    let stats = await this.executionStatsRepository.findByWorkflowId(workflowId);
    
    if (!stats) {
      stats = ExecutionStats.create(workflowId);
    }

    // 记录执行结果
    const updatedStats = stats.recordExecution(success, executionTime);
    
    // 保存统计
    return await this.executionStatsRepository.save(updatedStats);
  }

  /**
   * 获取工作流执行统计
   * @param workflowId 工作流ID
   * @returns 执行统计
   */
  async getWorkflowExecutionStats(workflowId: ID): Promise<ExecutionStats | null> {
    return await this.executionStatsRepository.findByWorkflowId(workflowId);
  }

}