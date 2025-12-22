import { ThreadExecutor } from '../../threads/entities/thread-executor';
import { ExecutionResult, ExecutionStatus } from '../../workflow/execution';
import { IResourceAllocation } from './resource-scheduler';

/**
 * 队列状态接口
 */
export interface IQueueStatus {
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
}

/**
 * 执行协调器接口
 */
export interface IExecutionCoordinator {
  /**
   * 并行执行
   */
  executeParallel(
    threads: ThreadExecutor[],
    resources: IResourceAllocation
  ): Promise<ExecutionResult[]>;

  /**
   * 获取队列状态
   */
  getQueueStatus(): IQueueStatus;

  /**
   * 验证
   */
  validate(): void;
}

/**
 * 执行协调器实现类
 */
export class ExecutionCoordinatorImpl implements IExecutionCoordinator {
  private queueStatus: IQueueStatus;

  private constructor() {
    this.queueStatus = {
      pendingTasks: 0,
      runningTasks: 0,
      completedTasks: 0,
      failedTasks: 0
    };
  }

  /**
   * 创建执行协调器
   */
  public static create(): IExecutionCoordinator {
    return new ExecutionCoordinatorImpl();
  }

  public async executeParallel(
    threads: ThreadExecutor[],
    resources: IResourceAllocation
  ): Promise<ExecutionResult[]> {
    // 更新队列状态
    this.queueStatus.pendingTasks += threads.length;

    const results: ExecutionResult[] = [];

    // 并行执行所有线程
    for (const thread of threads) {
      try {
        this.queueStatus.runningTasks++;
        this.queueStatus.pendingTasks--;

        // 执行线程
        const result = await thread.executeSequentially({});

        results.push(result);

        if (result.status === ExecutionStatus.COMPLETED) {
          this.queueStatus.completedTasks++;
        } else if (result.status === ExecutionStatus.FAILED) {
          this.queueStatus.failedTasks++;
        }

        this.queueStatus.runningTasks--;
      } catch (error) {
        this.queueStatus.runningTasks--;
        this.queueStatus.failedTasks++;

        // 创建失败的执行结果
        results.push({
          executionId: thread.executionContext.executionId,
          status: ExecutionStatus.FAILED,
          error: error instanceof Error ? error : new Error(String(error)),
          data: {},
          statistics: {
            totalTime: 0,
            nodeExecutionTime: 0,
            successfulNodes: 0,
            failedNodes: 1,
            skippedNodes: 0,
            retries: 0
          }
        });
      }
    }

    return results;
  }

  public getQueueStatus(): IQueueStatus {
    return { ...this.queueStatus };
  }

  public validate(): void {
    if (this.queueStatus.pendingTasks < 0) {
      throw new Error('Pending tasks cannot be negative');
    }
    // 其他验证...
  }
}