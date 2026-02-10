/**
 * ThreadRegistry - ThreadContext注册表
 * 负责ThreadContext的内存存储和基本查询
 * 不负责状态转换、持久化、序列化
 *
 * 本模块导出全局单例实例，不导出类定义
 *
 * 如果需要测试隔离，使用以下模式：
 * - 创建 Mock 类实现该接口
 * - 使用 type { ThreadRegistry } 获取类型
 * - 通过依赖注入传入 Mock
 */

import { ThreadContext } from '../execution/context/thread-context';
import type { WorkflowRegistry } from './workflow-registry';

/**
 * ThreadRegistry - ThreadContext注册表
 */
class ThreadRegistry {
  private threadContexts: Map<string, ThreadContext> = new Map();
  private workflowRegistry?: WorkflowRegistry;

  /**
   * 设置WorkflowRegistry引用
   * @param workflowRegistry WorkflowRegistry实例
   */
  setWorkflowRegistry(workflowRegistry: WorkflowRegistry): void {
    this.workflowRegistry = workflowRegistry;
  }

  /**
   * 注册ThreadContext
   * @param threadContext ThreadContext实例
   */
  register(threadContext: ThreadContext): void {
    this.threadContexts.set(threadContext.getThreadId(), threadContext);

    // 更新活跃工作流状态
    if (this.workflowRegistry) {
      this.workflowRegistry.addActiveWorkflow(threadContext.getWorkflowId());
    }
  }

  /**
   * 获取ThreadContext
   * @param threadId 线程ID
   * @returns ThreadContext实例或null
   */
  get(threadId: string): ThreadContext | null {
    return this.threadContexts.get(threadId) || null;
  }

  /**
   * 删除ThreadContext
   * @param threadId 线程ID
   */
  delete(threadId: string): void {
    const threadContext = this.threadContexts.get(threadId);
    if (threadContext) {
      // 移除活跃工作流状态
      if (this.workflowRegistry) {
        this.workflowRegistry.removeActiveWorkflow(threadContext.getWorkflowId());
      }
    }
    this.threadContexts.delete(threadId);
  }

  /**
   * 获取所有ThreadContext
   * @returns ThreadContext数组
   */
  getAll(): ThreadContext[] {
    return Array.from(this.threadContexts.values());
  }

  /**
   * 清空所有ThreadContext
   */
  clear(): void {
    // 清除所有活跃工作流状态
    if (this.workflowRegistry) {
      for (const threadContext of this.threadContexts.values()) {
        this.workflowRegistry.removeActiveWorkflow(threadContext.getWorkflowId());
      }
    }
    this.threadContexts.clear();
  }

  /**
   * 检查ThreadContext是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  has(threadId: string): boolean {
    return this.threadContexts.has(threadId);
  }

  /**
   * 检查工作流是否活跃
   * @param workflowId 工作流ID
   * @returns 是否活跃
   */
  isWorkflowActive(workflowId: string): boolean {
    if (!this.workflowRegistry) {
      // 如果没有设置workflowRegistry，回退到遍历检查(仅作为防御性编程，理论上不会出现该情况)
      return this.getAll().some(threadContext =>
        threadContext.getWorkflowId() === workflowId
      );
    }
    return this.workflowRegistry.isWorkflowActive(workflowId);
  }
}

/**
 * 全局线程注册表单例
 * 用于管理所有ThreadContext实例的生命周期
 */
export const threadRegistry = new ThreadRegistry();

/**
 * 导出ThreadRegistry类供测试使用
 * 注意：生产代码应使用单例 threadRegistry，此类仅供测试使用
 */
export { ThreadRegistry };