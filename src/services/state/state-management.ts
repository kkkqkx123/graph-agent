import { injectable, inject } from 'inversify';
import { ID } from '../../domain/common/value-objects/id';
import { Thread } from '../../domain/threads/entities/thread';
import { Session } from '../../domain/sessions/entities/session';
import { StateHistory } from './state-history';
import { StateRecovery } from './state-recovery';

/**
 * 状态管理协调服务
 * 负责协调状态管理，提供统一的状态管理接口
 * 
 * 设计原则：
 * - 只负责状态变更历史的记录和查询
 * - 不直接创建检查点（由 CheckpointCreation 负责）
 * - 提供状态恢复的协调功能
 */
@injectable()
export class StateManagement {
  constructor(
    @inject('StateHistory') private readonly historyService: StateHistory,
    @inject('StateRecovery') private readonly recoveryService: StateRecovery
  ) {}

  /**
   * 捕获Thread状态变更
   * 只记录状态变更日志，不创建检查点
   * 
   * @param thread 线程对象
   * @param changeType 变更类型
   * @param details 变更详情
   */
  public async captureThreadStateChange(
    thread: Thread,
    changeType: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    // 只记录状态变更日志
    await this.historyService.recordOperation(thread, changeType, details || {});
  }

  /**
   * 捕获Session状态变更
   * 只记录状态变更日志，不创建检查点
   * 
   * @param session 会话对象
   * @param changeType 变更类型
   * @param details 变更详情
   */
  public async captureSessionStateChange(
    session: Session,
    changeType: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    // Session 的状态变更记录应该通过 SessionService 处理
    // 这里暂时不做任何操作，因为 Session 不应该有独立的 checkpoint
  }

  /**
   * 捕获错误状态
   * 只记录错误日志，不创建检查点
   * 
   * @param thread 线程对象
   * @param error 错误对象
   * @param context 错误上下文
   */
  public async captureErrorState(
    thread: Thread,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    // 记录错误日志
    await this.historyService.recordError(thread, error);
  }

  /**
   * 恢复Thread状态
   * 委托给 StateRecovery 服务
   * 
   * @param thread 线程对象
   * @param restoreType 恢复类型
   * @param restorePointId 恢复点ID
   * @returns 恢复后的线程对象
   */
  public async restoreThreadState(
    thread: Thread,
    restoreType: 'checkpoint' | 'auto',
    restorePointId?: ID
  ): Promise<Thread> {
    // 验证恢复条件
    const validation = await this.recoveryService.validateRecoveryConditions(
      thread.id,
      restoreType === 'checkpoint' ? restorePointId : undefined
    );

    if (!validation.canRestore) {
      throw new Error(`Cannot restore thread: ${validation.reason}`);
    }

    // 执行恢复
    let restoredThread: Thread;

    if (restoreType === 'auto') {
      // 自动选择最佳恢复点
      const bestPoint = await this.recoveryService.getBestRecoveryPoint(thread.id);
      if (!bestPoint) {
        throw new Error('No recovery point available');
      }

      restoredThread = await this.recoveryService.restoreThreadFromCheckpoint(
        thread,
        bestPoint.point.checkpointId
      );
    } else if (restoreType === 'checkpoint' && restorePointId) {
      restoredThread = await this.recoveryService.restoreThreadFromCheckpoint(
        thread,
        restorePointId
      );
    } else {
      throw new Error('Invalid restore parameters');
    }

    // 记录恢复后的状态变更
    await this.historyService.recordOperation(restoredThread, 'state_restored', {
      restoreType,
      restorePointId: restorePointId?.value,
      restoredAt: new Date().toISOString(),
    });

    return restoredThread;
  }

  /**
   * 获取Thread状态历史
   * 只返回历史记录，不返回检查点
   * 
   * @param threadId 线程ID
   * @returns 状态历史
   */
  public async getThreadStateHistory(threadId: ID): Promise<{
    history: any[];
  }> {
    const history = await this.recoveryService.getThreadRecoveryHistory(threadId);

    return {
      history: history.checkpointRestores.map(cp => cp.toDict()),
    };
  }

  /**
   * 获取Session状态历史
   * 只返回历史记录，不返回检查点
   * 
   * @param sessionId 会话ID
   * @returns 状态历史
   */
  public async getSessionStateHistory(sessionId: ID): Promise<{
    history: any[];
  }> {
    // Session 的状态历史应该通过 SessionService 聚合其 Thread 的 checkpoint
    // 这里暂时返回空数组
    return {
      history: [],
    };
  }

  /**
   * 清理过期状态数据
   * 委托给 StateHistory
   * 
   * @param retentionDays 保留天数
   * @returns 清理结果
   */
  public async cleanupExpiredStateData(retentionDays: number = 30): Promise<{
    cleanedCount: number;
  }> {
    const cleanedCount = await this.historyService.cleanupExpiredLogs(retentionDays);

    return {
      cleanedCount,
    };
  }

  /**
   * 清理多余状态数据
   * 委托给 StateRecovery
   * 
   * @param threadId 线程ID
   * @param maxCount 最大保留数量
   * @returns 清理结果
   */
  public async cleanupExcessStateData(
    threadId: ID,
    maxCount: number
  ): Promise<{
    cleanedCount: number;
  }> {
    // 获取所有检查点
    const validation = await this.recoveryService.validateRecoveryConditions(threadId);
    const checkpoints = validation.availableCheckpoints;

    if (checkpoints.length <= maxCount) {
      return { cleanedCount: 0 };
    }

    // 计算需要删除的数量
    const toDelete = checkpoints.length - maxCount;
    
    // 注意：实际的删除操作应该通过 CheckpointManagement 执行
    // 这里只返回需要删除的数量
    return {
      cleanedCount: toDelete,
    };
  }

  /**
   * 获取状态管理统计信息
   * 
   * @returns 统计信息
   */
  public async getStateManagementStatistics(): Promise<{
    history: {
      total: number;
      byType: Record<string, number>;
    };
    recovery: {
      totalRestores: number;
      byType: Record<string, number>;
    };
  }> {
    // 获取恢复历史统计
    const recoveryHistory = await this.recoveryService.getThreadRecoveryHistory(ID.generate());
    
    // 简化的统计信息
    const byType: Record<string, number> = {};
    let totalRestores = 0;

    for (const checkpoint of recoveryHistory.checkpointRestores) {
      const type = checkpoint.type.toString();
      byType[type] = (byType[type] || 0) + 1;
      totalRestores++;
    }

    return {
      history: {
        total: 0, // StateHistory 不提供统计接口
        byType: {},
      },
      recovery: {
        totalRestores,
        byType,
      },
    };
  }
}