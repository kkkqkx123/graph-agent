/**
 * 执行上下文管理器接口
 *
 * 定义工作流执行上下文管理的业务契约
 * 具体实现在基础设施层提供
 */
export interface IExecutionContextManager {
  /**
   * 创建执行上下文
   * @param context 上下文数据
   */
  createContext(context: any): Promise<void>;

  /**
   * 获取执行上下文
   * @param executionId 执行ID
   * @returns 执行上下文
   */
  getContext(executionId: string): Promise<any | undefined>;

  /**
   * 更新执行状态
   * @param executionId 执行ID
   * @param status 状态
   */
  updateStatus(executionId: string, status: string): Promise<void>;

  /**
   * 清理过期上下文
   */
  cleanupExpiredContexts(): Promise<void>;

  /**
   * 导出上下文
   * @param executionId 执行ID
   * @returns 导出的上下文
   */
  exportContext(executionId: string): Promise<any | undefined>;

  /**
   * 导入上下文
   * @param context 上下文数据
   */
  importContext(context: any): Promise<void>;
}