import { Session } from '../../domain/sessions/entities/session';
import { Thread } from '../../domain/threads/entities/thread';
import { ForkStrategy } from '../../domain/sessions/value-objects/operations/fork/fork-strategy';
import { ForkOptions, ForkContext } from '../../domain/sessions/value-objects/operations/fork/fork-context';
import { NodeId } from '../../domain/workflow/value-objects';
import { ID, Timestamp, Version } from '../../domain/common/value-objects';
import { ThreadStatus as ThreadStatusVO, ThreadExecution } from '../../domain/threads/value-objects';

/**
 * 线程Fork服务
 * 
 * 职责：处理线程fork的复杂业务逻辑
 */
export class ThreadForkService {
  /**
   * Fork线程
   * @param session 会话实例
   * @param parentThreadId 父线程ID
   * @param forkPoint Fork点节点ID
   * @param forkStrategy Fork策略
   * @param forkOptions Fork选项
   * @returns 新创建的线程
   */
  public forkThread(
    session: Session,
    parentThreadId: string,
    forkPoint: NodeId,
    forkStrategy: ForkStrategy,
    forkOptions: ForkOptions
  ): Thread {
    if (session.isDeleted()) {
      throw new Error('无法在已删除的会话中fork线程');
    }

    if (!session.status.canOperate()) {
      throw new Error('无法在非活跃状态的会话中fork线程');
    }

    const parentThread = session.getThread(parentThreadId);
    if (!parentThread) {
      throw new Error('父线程不存在');
    }

    // 检查线程数量限制
    const maxThreads = session.config.getMaxThreads?.() || 10;
    if (session.threadCount >= maxThreads) {
      throw new Error(`会话线程数量已达上限 (${maxThreads})`);
    }

    // 创建 Fork 上下文
    const execution = parentThread.execution;
    const variableSnapshot = new Map(execution.context.variables);
    const nodeStateSnapshot = new Map();
    
    for (const [nodeId, nodeExecution] of execution.nodeExecutions.entries()) {
      nodeStateSnapshot.set(nodeId, nodeExecution.createSnapshot());
    }

    const forkContext = ForkContext.create(
      parentThread.threadId,
      forkPoint,
      variableSnapshot,
      nodeStateSnapshot,
      execution.context.promptContext,
      forkOptions
    );

    // 计算上下文保留计划
    const retentionPlan = forkStrategy.calculateContextRetention(parentThread, forkPoint);
    
    // 应用节点状态处理策略
    const processedNodeStates = forkStrategy.applyNodeStateHandling(
      forkContext.nodeStateSnapshot
    );

    // 使用 fromProps 创建新线程，避免 PromptContext 问题
    const now = Timestamp.now();
    const newThreadId = ID.generate();
    const newThreadStatus = ThreadStatusVO.pending();
    
    // 创建线程执行值对象（使用父线程的执行上下文）
    const newExecution = ThreadExecution.create(newThreadId, execution.context);
    
    const newThreadProps = {
      id: newThreadId,
      sessionId: session.sessionId,
      workflowId: parentThread.workflowId,
      status: newThreadStatus,
      priority: parentThread.priority,
      title: `${parentThread.title || 'Thread'} (Fork)`,
      description: `Forked from ${parentThreadId}`,
      metadata: {
        ...parentThread.metadata,
        forkContext: forkContext.forkId.toString(),
        parentThreadId: parentThreadId
      },
      definition: parentThread.definition,
      execution: newExecution,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };
    
    const newThread = Thread.fromProps(newThreadProps);

    // 根据 Fork 策略设置新线程的执行上下文
    // 这里需要根据 retentionPlan 和 processedNodeStates 来设置新线程的状态
    // 具体实现可能需要访问 Thread 的内部方法或通过应用层服务来完成

    // 添加新线程到会话
    session.addThread(newThread);

    return newThread;
  }

  /**
   * 检查是否可以fork线程
   * @param session 会话实例
   * @param parentThreadId 父线程ID
   * @returns 是否可以fork
   */
  public canForkThread(session: Session, parentThreadId: string): boolean {
    if (session.isDeleted()) {
      return false;
    }

    if (!session.status.canOperate()) {
      return false;
    }

    const parentThread = session.getThread(parentThreadId);
    if (!parentThread) {
      return false;
    }

    // 检查线程数量限制
    const maxThreads = session.config.getMaxThreads?.() || 10;
    if (session.threadCount >= maxThreads) {
      return false;
    }

    return true;
  }

  /**
   * 获取可用的fork策略
   * @param session 会话实例
   * @param parentThreadId 父线程ID
   * @returns 可用的fork策略列表
   */
  public getAvailableForkStrategies(session: Session, parentThreadId: string): ForkStrategy[] {
    const parentThread = session.getThread(parentThreadId);
    if (!parentThread) {
      return [];
    }

    // 根据父线程的状态和配置返回可用的fork策略
    const strategies: ForkStrategy[] = [];
    
    // 这里可以根据业务规则添加不同的fork策略
    // 例如：完整复制、部分复制、仅变量复制等
    
    return strategies;
  }
}