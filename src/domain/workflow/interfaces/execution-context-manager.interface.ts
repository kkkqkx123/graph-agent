import { IExecutionContext } from '../execution';

/**
 * 执行上下文管理器接口
 */
export interface IExecutionContextManager {
  /**
   * 创建执行上下文
   */
  createContext(context: IExecutionContext): Promise<void>;

  /**
   * 获取执行上下文
   */
  getContext(executionId: string): Promise<IExecutionContext | undefined>;

  /**
   * 更新执行状态
   */
  updateStatus(executionId: string, status: string): Promise<void>;

  /**
   * 清理过期上下文
   */
  cleanupExpiredContexts(): Promise<void>;

  /**
   * 导出上下文
   */
  exportContext(executionId: string): Promise<IExecutionContext | undefined>;

  /**
   * 导入上下文
   */
  importContext(context: IExecutionContext): Promise<void>;
}