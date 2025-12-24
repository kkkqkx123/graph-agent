import { Thread } from '../entities/thread';
import { ThreadRepository } from '../repositories/thread-repository';
import { WorkflowRepository } from '../../workflow/repositories/workflow-repository';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { DomainError } from '../../common/errors/domain-error';
import { IExecutionContext } from '../../workflow/execution/execution-context.interface';
import { ExecutionResult, ExecutionStatus } from '../../workflow/execution/types';
import { ExecutionStep } from '../../workflow/services/workflow-execution-service';

/**
 * 线程执行服务
 * 
 * 负责线程的执行逻辑，将执行相关的业务逻辑从Thread实体中分离出来
 * 专注于串行执行流程协调
 */
export class ThreadExecutionService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly workflowRepository: WorkflowRepository
  ) {}

  /**
   * 串行执行线程
   * @param thread 线程
   * @param inputData 输入数据
   * @returns 执行结果
   */
  async executeSequentially(thread: Thread, inputData: unknown): Promise<ExecutionResult> {
    try {
      // 1. 初始化执行状态
      thread.start();
      const executionContext = this.prepareExecutionEnvironment(thread, inputData);

      // 2. 验证执行条件
      this.validateExecutionConditions(thread);

      // 3. 获取工作流
      const workflow = await this.workflowRepository.findByIdOrFail(thread.workflowId);

      // 4. 获取执行步骤
      // 获取执行步骤 - 从工作流图中获取节点并转换为执行步骤
      const graph = workflow.getGraph();
      const steps = Array.from(graph.nodes.values()).map(node => ({
        stepId: node.nodeId.toString(),
        nodeId: node.nodeId,
        node: node,
        dependencies: [], // 简化实现，实际应该根据边计算依赖
        priority: 1,
        execute: async (context: IExecutionContext) => {
          // 简化的执行逻辑，实际应该根据节点类型执行不同的操作
          return { success: true, data: {} };
        },
        validate: () => {
          // 简化的验证逻辑
          if (!node || !node.nodeId) {
            throw new Error('节点验证失败');
          }
        }
      }));

      // 5. 串行执行每个步骤
      for (const step of steps) {
        await this.executeStep(thread, step, executionContext);

        // 6. 检查执行条件
        if (this.shouldPause(thread)) {
          thread.pause();
          break;
        }

        if (this.shouldTerminate(thread)) {
          thread.cancel();
          break;
        }
      }

      // 7. 完成执行
      const result = this.completeExecution(thread, executionContext);
      thread.complete();

      // 8. 保存线程状态
      await this.threadRepository.save(thread);

      return result;

    } catch (error) {
      const result = this.handleExecutionError(thread, error as Error);
      thread.fail((error as Error).message);
      await this.threadRepository.save(thread);
      return result;
    }
  }

  /**
   * 执行单个步骤
   * @param thread 线程
   * @param step 执行步骤
   * @param executionContext 执行上下文
   */
  private async executeStep(
    thread: Thread,
    step: ExecutionStep,
    executionContext: IExecutionContext
  ): Promise<void> {
    // 更新当前步骤
    const stepId = typeof step === 'string' ? step : (step as any).stepId;
    thread.updateProgress(thread.execution.progress, stepId);

    // 执行步骤
    const result = await step.execute(executionContext);

    // 记录执行历史
    executionContext.executionHistory.push({
      nodeId: ID.fromString(stepId),
      timestamp: Timestamp.now(),
      result,
      status: 'success'
    });
  }

  /**
   * 准备执行环境
   * @param thread 线程
   * @param inputData 输入数据
   * @returns 执行上下文
   */
  private prepareExecutionEnvironment(thread: Thread, inputData: unknown): IExecutionContext {
    const now = Timestamp.now();
    const executionHistory: any[] = [];
    const data: any = { input: inputData };
    const startTime = now;
    
    return {
      executionId: thread.threadId,
      workflowId: thread.workflowId,
      data,
      workflowState: {
        workflowId: thread.workflowId,
        data,
        history: [],
        metadata: thread.metadata,
        createdAt: now,
        updatedAt: now,
        getData: (key?: string) => {
          if (!key) return data;
          const keys = key.split('.');
          let value: any = data;
          for (const k of keys) {
            value = value?.[k];
          }
          return value;
        },
        setData: (key: string, value: any) => {
          // 简化实现，返回新的状态对象
          return {
            workflowId: thread.workflowId,
            data: { ...data, [key]: value },
            history: [],
            metadata: thread.metadata,
            createdAt: now,
            updatedAt: Timestamp.now(),
            getData: () => data,
            setData: () => ({} as any)
          };
        }
      },
      executionHistory,
      metadata: thread.metadata,
      startTime,
      status: 'running',
      getVariable: (path: string) => {
        const keys = path.split('.');
        let value: any = data;
        for (const key of keys) {
          value = value?.[key];
        }
        return value;
      },
      setVariable: (path: string, value: any) => {
        const keys = path.split('.');
        let current: any = data;
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (key && current[key] === undefined) {
            current[key] = {};
          }
          if (key) {
            current = current[key];
          }
        }
        const lastKey = keys[keys.length - 1];
        if (lastKey) {
          current[lastKey] = value;
        }
      },
      getAllVariables: () => data,
      getAllMetadata: () => thread.metadata,
      getInput: () => data,
      getExecutedNodes: () => executionHistory.map((h: any) => h.nodeId.toString()),
      getNodeResult: (nodeId: string) => {
        const history = executionHistory.find((h: any) => h.nodeId.toString() === nodeId);
        return history?.result;
      },
      getElapsedTime: () => {
        return Timestamp.now().getDate().getTime() - startTime.getDate().getTime();
      },
      getWorkflow: () => undefined
    };
  }

  /**
   * 验证执行条件
   * @param thread 线程
   */
  private validateExecutionConditions(thread: Thread): void {
    if (!thread.status.canExecute()) {
      throw new DomainError(`线程当前状态不允许执行: ${thread.status}`);
    }
  }

  /**
   * 检查是否应该暂停
   * @param thread 线程
   * @returns 是否应该暂停
   */
  private shouldPause(thread: Thread): boolean {
    return thread.status.isPaused();
  }

  /**
   * 检查是否应该终止
   * @param thread 线程
   * @returns 是否应该终止
   */
  private shouldTerminate(thread: Thread): boolean {
    return thread.status.isCancelled();
  }

  /**
   * 完成执行
   * @param thread 线程
   * @param executionContext 执行上下文
   * @returns 执行结果
   */
  private completeExecution(thread: Thread, executionContext: IExecutionContext): ExecutionResult {
    return {
      executionId: executionContext.executionId,
      status: ExecutionStatus.COMPLETED,
      data: executionContext.data,
      statistics: {
        totalTime: executionContext.getElapsedTime(),
        nodeExecutionTime: executionContext.getElapsedTime(),
        successfulNodes: executionContext.executionHistory.length,
        failedNodes: 0,
        skippedNodes: 0,
        retries: 0
      }
    };
  }

  /**
   * 处理执行错误
   * @param thread 线程
   * @param error 错误
   * @returns 执行结果
   */
  private handleExecutionError(thread: Thread, error: Error): ExecutionResult {
    return {
      executionId: thread.threadId,
      status: ExecutionStatus.FAILED,
      error,
      data: {},
      statistics: {
        totalTime: 0,
        nodeExecutionTime: 0,
        successfulNodes: 0,
        failedNodes: 1,
        skippedNodes: 0,
        retries: 0
      }
    };
  }

  /**
   * 暂停线程执行
   * @param thread 线程
   */
  async pauseExecution(thread: Thread): Promise<void> {
    if (!thread.status.isRunning()) {
      throw new DomainError('只能暂停运行中的线程');
    }

    thread.pause();
    await this.threadRepository.save(thread);
  }

  /**
   * 恢复线程执行
   * @param thread 线程
   */
  async resumeExecution(thread: Thread): Promise<void> {
    if (!thread.status.isPaused()) {
      throw new DomainError('只能恢复暂停状态的线程');
    }

    // 检查会话是否有其他运行中的线程
    const hasRunningThreads = await this.threadRepository.hasRunningThreads(thread.sessionId);
    if (hasRunningThreads) {
      throw new DomainError('会话已有运行中的线程，无法恢复其他线程');
    }

    thread.resume();
    await this.threadRepository.save(thread);
  }

  /**
   * 取消线程执行
   * @param thread 线程
   * @param reason 取消原因
   */
  async cancelExecution(thread: Thread, reason?: string): Promise<void> {
    if (thread.status.isTerminal()) {
      throw new DomainError('无法取消已终止状态的线程');
    }

    thread.cancel(undefined, reason);
    await this.threadRepository.save(thread);
  }
}