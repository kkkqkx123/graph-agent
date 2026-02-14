/**
 * 线程适配器
 * 封装线程相关的 SDK API 调用
 */

import { BaseAdapter } from './base-adapter';

/**
 * 线程适配器
 */
export class ThreadAdapter extends BaseAdapter {
  /**
   * 执行工作流线程
   */
  async executeThread(workflowId: string, input?: Record<string, unknown>): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      // 使用 SDK 的执行方法
      const result = await (this.sdk as any).execute(workflowId, input || {});

      this.logger.success(`线程已启动`);
      return result;
    }, '执行线程');
  }

  /**
   * 暂停线程
   */
  async pauseThread(threadId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      // 使用 SDK 的暂停方法
      await (this.sdk as any).pause(threadId);
      this.logger.success(`线程已暂停: ${threadId}`);
    }, '暂停线程');
  }

  /**
   * 恢复线程
   */
  async resumeThread(threadId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      // 使用 SDK 的恢复方法
      await (this.sdk as any).resume(threadId);
      this.logger.success(`线程已恢复: ${threadId}`);
    }, '恢复线程');
  }

  /**
   * 停止线程
   */
  async stopThread(threadId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      // 使用 SDK 的停止方法
      await (this.sdk as any).cancel(threadId);
      this.logger.success(`线程已停止: ${threadId}`);
    }, '停止线程');
  }

  /**
   * 列出所有线程
   */
  async listThreads(filter?: any): Promise<any[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.threads;
      const result = await api.getAll();
      const threads = (result as any).data || result;

      // 转换为摘要格式
      const summaries = (threads as any[]).map((thread: any) => ({
        id: thread.id,
        workflowId: thread.workflowId,
        status: thread.status,
        createdAt: thread.createdAt || new Date().toISOString(),
        updatedAt: thread.updatedAt || new Date().toISOString()
      }));

      return summaries;
    }, '列出线程');
  }

  /**
   * 获取线程详情
   */
  async getThread(threadId: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.threads;
      const result = await api.get(threadId);
      const thread = (result as any).data || result;

      if (!thread) {
        throw new Error(`线程不存在: ${threadId}`);
      }

      return thread;
    }, '获取线程详情');
  }

  /**
   * 删除线程
   */
  async deleteThread(threadId: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.threads;
      await api.delete(threadId);

      this.logger.success(`线程已删除: ${threadId}`);
    }, '删除线程');
  }
}