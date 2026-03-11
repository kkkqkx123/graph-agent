/**
 * 任务执行器
 * 负责在独立终端中执行工作流线程
 */

import { getSDK } from '@modular-agent/sdk';
import { randomUUID } from 'crypto';
import { getLogger } from '../utils/logger.js';
import type { TerminalSession, TaskExecutionResult, TaskStatus } from './types.js';

const logger = getLogger();

/**
 * 任务执行器
 * 负责在独立终端中执行工作流线程
 */
export class TaskExecutor {
  /** 任务状态映射表 */
  private tasks: Map<string, TaskStatus> = new Map();
  /** 任务与终端的映射表 */
  private taskTerminalMap: Map<string, string> = new Map();
  /** SDK 实例 */
  private sdk: ReturnType<typeof getSDK>;

  constructor() {
    this.sdk = getSDK();
  }

  /**
   * 在独立终端中执行任务
   * @param workflowId 工作流 ID
   * @param input 输入数据
   * @param terminal 终端会话
   * @returns 任务执行结果
   */
  async executeInTerminal(
    workflowId: string,
    input: Record<string, unknown>,
    terminal: TerminalSession
  ): Promise<TaskExecutionResult> {
    const taskId = randomUUID();
    
    // 初始化任务状态
    const taskStatus: TaskStatus = {
      taskId,
      status: 'running',
      progress: 0,
      message: '任务已启动',
      lastUpdate: new Date()
    };
    this.tasks.set(taskId, taskStatus);
    this.taskTerminalMap.set(taskId, terminal.id);

    // 构建执行命令
    const command = this.buildExecutionCommand(workflowId, input, taskId);
    
    try {
      // 在终端中执行命令
      terminal.pty.write(command + '\r');

      logger.info(`任务已在终端中启动: ${taskId} (会话: ${terminal.id})`);

      return {
        taskId,
        sessionId: terminal.id,
        status: 'started',
        startTime: new Date()
      };
    } catch (error) {
      // 更新任务状态为失败
      this.updateTaskStatus(taskId, {
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      });

      logger.error(`任务启动失败: ${taskId} - ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 监控任务状态
   * @param taskId 任务 ID
   * @returns 任务状态
   */
  async monitorTask(taskId: string): Promise<TaskStatus> {
    const status = this.tasks.get(taskId);
    if (!status) {
      throw new Error(`任务不存在: ${taskId}`);
    }
    return status;
  }

  /**
   * 停止任务执行
   * @param taskId 任务 ID
   */
  async stopTask(taskId: string): Promise<void> {
    const status = this.tasks.get(taskId);
    if (!status) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(`任务已结束，无法停止: ${taskId} (状态: ${status.status})`);
    }

    // 更新任务状态
    this.updateTaskStatus(taskId, {
      status: 'cancelled',
      message: '任务已取消'
    });

    logger.info(`任务已停止: ${taskId}`);
  }

  /**
   * 更新任务状态
   * @param taskId 任务 ID
   * @param updates 状态更新
   */
  updateTaskStatus(taskId: string, updates: Partial<TaskStatus>): void {
    const status = this.tasks.get(taskId);
    if (status) {
      Object.assign(status, updates, { lastUpdate: new Date() });
      logger.debug(`任务状态已更新: ${taskId} -> ${status.status}`);
    }
  }

  /**
   * 获取所有任务
   * @returns 所有任务状态列表
   */
  getAllTasks(): TaskStatus[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取活跃任务
   * @returns 活跃任务列表
   */
  getActiveTasks(): TaskStatus[] {
    return Array.from(this.tasks.values()).filter(
      task => task.status === 'running'
    );
  }

  /**
   * 获取任务关联的终端 ID
   * @param taskId 任务 ID
   * @returns 终端会话 ID
   */
  getTerminalId(taskId: string): string | undefined {
    return this.taskTerminalMap.get(taskId);
  }

  /**
   * 清理已完成或失败的任务
   * @param maxAge 最大保留时间（毫秒）
   */
  cleanupOldTasks(maxAge: number = 3600000): void {
    const now = Date.now();
    const tasksToRemove: string[] = [];

    this.tasks.forEach((status, taskId) => {
      const age = now - status.lastUpdate.getTime();
      if (age > maxAge && 
          (status.status === 'completed' || 
           status.status === 'failed' || 
           status.status === 'cancelled')) {
        tasksToRemove.push(taskId);
      }
    });

    tasksToRemove.forEach(taskId => {
      this.tasks.delete(taskId);
      this.taskTerminalMap.delete(taskId);
    });

    if (tasksToRemove.length > 0) {
      logger.info(`已清理 ${tasksToRemove.length} 个旧任务`);
    }
  }

  /**
   * 构建执行命令
   * @param workflowId 工作流 ID
   * @param input 输入数据
   * @param taskId 任务 ID
   * @returns 执行命令字符串
   */
  private buildExecutionCommand(
    workflowId: string,
    input: Record<string, unknown>,
    taskId: string
  ): string {
    // 转义输入数据中的特殊字符
    const inputJson = JSON.stringify(input).replace(/"/g, '\\"').replace(/'/g, "\\'");
    
    // 构建命令
    let command = `modular-agent thread run ${workflowId}`;
    
    if (Object.keys(input).length > 0) {
      command += ` --input '${inputJson}'`;
    }
    
    command += ` --task-id ${taskId}`;
    
    return command;
  }

  /**
   * 标记任务为完成
   * @param taskId 任务 ID
   * @param message 完成消息
   */
  markTaskCompleted(taskId: string, message?: string): void {
    this.updateTaskStatus(taskId, {
      status: 'completed',
      progress: 100,
      message: message || '任务已完成'
    });
  }

  /**
   * 标记任务为失败
   * @param taskId 任务 ID
   * @param error 错误信息
   */
  markTaskFailed(taskId: string, error: string): void {
    this.updateTaskStatus(taskId, {
      status: 'failed',
      message: `任务失败: ${error}`
    });
  }

  /**
   * 更新任务进度
   * @param taskId 任务 ID
   * @param progress 进度百分比 (0-100)
   * @param message 进度消息
   */
  updateTaskProgress(taskId: string, progress: number, message?: string): void {
    this.updateTaskStatus(taskId, {
      progress: Math.min(100, Math.max(0, progress)),
      message: message || `任务进行中: ${progress}%`
    });
  }
}