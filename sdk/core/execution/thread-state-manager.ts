/**
 * Thread状态管理器
 * 负责Thread的完整生命周期状态管理
 */

import type {
  Thread,
  ThreadOptions
} from '../../types/thread';
import { ThreadStatus } from '../../types/thread';
import { IDUtils } from '../../types/common';
import { Conversation } from '../llm/conversation';

/**
 * 为Thread对象添加变量管理方法
 */
function attachVariableMethods(thread: Thread): void {
  /**
   * 获取变量值
   */
  thread.getVariable = function(name: string): any {
    return this.variableValues[name];
  };

  /**
   * 设置变量值
   */
  thread.setVariable = function(
    name: string,
    value: any,
    type: 'number' | 'string' | 'boolean' | 'array' | 'object' = typeof value as any,
    scope: 'local' | 'global' = 'local',
    readonly: boolean = false
  ): void {
    // 检查是否为只读变量
    const existingVar = this.variables.find(v => v.name === name);
    if (existingVar && existingVar.readonly) {
      throw new Error(`Variable ${name} is readonly and cannot be modified`);
    }

    // 更新variableValues
    this.variableValues[name] = value;

    // 更新variables数组
    if (existingVar) {
      existingVar.value = value;
      existingVar.type = type;
    } else {
      this.variables.push({
        name,
        value,
        type,
        scope,
        readonly
      });
    }
  };

  /**
   * 检查变量是否存在
   */
  thread.hasVariable = function(name: string): boolean {
    return name in this.variableValues;
  };

  /**
   * 删除变量
   */
  thread.deleteVariable = function(name: string): void {
    const existingVar = this.variables.find(v => v.name === name);
    if (existingVar && existingVar.readonly) {
      throw new Error(`Variable ${name} is readonly and cannot be deleted`);
    }

    delete this.variableValues[name];
    const index = this.variables.findIndex(v => v.name === name);
    if (index !== -1) {
      this.variables.splice(index, 1);
    }
  };

  /**
   * 获取所有变量
   */
  thread.getAllVariables = function(): Record<string, any> {
    return { ...this.variableValues };
  };
}

/**
 * Thread状态管理器
 */
export class ThreadStateManager {
  private threads: Map<string, Thread> = new Map();

  /**
   * 创建Thread状态
   */
  createThread(workflowId: string, workflowVersion: string, options: ThreadOptions = {}): Thread {
    const threadId = IDUtils.generate();
    const now = Date.now();

    const thread: Partial<Thread> = {
      id: threadId,
      workflowId,
      workflowVersion,
      status: ThreadStatus.CREATED,
      currentNodeId: '',
      variables: [],
      variableValues: {},
      input: options.input || {},
      output: {},
      nodeResults: [],
      startTime: now,
      errors: [],
      metadata: {
        creator: options.input?.['creator'],
        tags: options.input?.['tags']
      }
    };

    // 附加变量管理方法
    attachVariableMethods(thread as Thread);

    this.threads.set(threadId, thread as Thread);
    return thread as Thread;
  }

  /**
   * 更新Thread状态
   */
  updateThreadStatus(threadId: string, status: ThreadStatus): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    thread.status = status;

    if (status === ThreadStatus.COMPLETED ||
      status === ThreadStatus.FAILED ||
      status === ThreadStatus.CANCELLED ||
      status === ThreadStatus.TIMEOUT) {
      thread.endTime = Date.now();
    }
  }

  /**
   * 获取当前节点
   */
  getCurrentNode(threadId: string): string | null {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    return thread.currentNodeId || null;
  }

  /**
   * 设置当前节点
   */
  setCurrentNode(threadId: string, nodeId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    thread.currentNodeId = nodeId;
  }

  /**
   * 获取Thread
   */
  getThread(threadId: string): Thread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * 序列化Thread
   */
  serializeThread(threadId: string): string {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    // 将数组转换为可序列化格式
    const serializableThread = {
      ...thread,
      nodeResults: thread.nodeResults,
      variableValues: thread.variableValues
    };

    return JSON.stringify(serializableThread);
  }

  /**
   * 反序列化Thread
   */
  deserializeThread(data: string): Thread {
    const serializableThread = JSON.parse(data);

    // 将普通对象转换回Thread
    const thread: Thread = {
      ...serializableThread,
      nodeResults: serializableThread.nodeResults || [],
      variableValues: serializableThread.variableValues || {}
    };

    // 附加变量管理方法
    attachVariableMethods(thread);

    this.threads.set(thread.id, thread);
    return thread;
  }

  /**
   * 删除Thread
   */
  deleteThread(threadId: string): void {
    this.threads.delete(threadId);
  }

  /**
   * 获取所有Thread
   */
  getAllThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * 清空所有Thread
   */
  clearAll(): void {
    this.threads.clear();
  }

  /**
   * 注册Thread
   * @param thread Thread实例
   */
  registerThread(thread: Thread): void {
    this.threads.set(thread.id, thread);
  }

  /**
   * 复制Thread - 创建Thread的完全相同的副本
   * @param sourceThreadId 源线程ID
   * @returns 副本线程ID
   */
  copyThread(sourceThreadId: string): string {
    // 步骤1：验证源thread存在
    const sourceThread = this.threads.get(sourceThreadId);
    if (!sourceThread) {
      throw new Error(`Source thread not found: ${sourceThreadId}`);
    }

    // 步骤2：创建新的thread ID
    const copiedThreadId = IDUtils.generate();
    const now = Date.now();

    // 步骤3：复制基础信息
    const copiedThread: Partial<Thread> = {
      id: copiedThreadId,
      workflowId: sourceThread.workflowId,
      workflowVersion: sourceThread.workflowVersion,
      status: ThreadStatus.CREATED,
      currentNodeId: sourceThread.currentNodeId,
      variables: sourceThread.variables.map((v: any) => ({ ...v })),
      variableValues: { ...sourceThread.variableValues },
      input: { ...sourceThread.input },
      output: { ...sourceThread.output },
      nodeResults: sourceThread.nodeResults.map(h => ({ ...h })),
      startTime: now,
      endTime: undefined,
      errors: [],
      metadata: {
        ...sourceThread.metadata,
        parentThreadId: sourceThreadId
      }
    };

    // 步骤4：附加变量管理方法
    attachVariableMethods(copiedThread as Thread);

    // 步骤5：复制 Conversation 实例
    if (sourceThread.contextData?.['conversation']) {
      const sourceConversation = sourceThread.contextData['conversation'] as Conversation;
      const copiedConversation = sourceConversation.clone();
      copiedThread.contextData = {
        conversation: copiedConversation
      };
    }

    // 步骤6：复制其他 contextData（如果有）
    if (sourceThread.contextData) {
      for (const [key, value] of Object.entries(sourceThread.contextData)) {
        if (key !== 'conversation' && value !== undefined) {
          copiedThread.contextData = copiedThread.contextData || {};
          copiedThread.contextData[key] = value;
        }
      }
    }

    // 步骤7：将副本注册到状态管理器
    this.threads.set(copiedThreadId, copiedThread as Thread);

    return copiedThreadId;
  }
}