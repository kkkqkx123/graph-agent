/**
 * ToolContextManager - 工具上下文管理器
 * 专门管理工具的运行时上下文，支持不同作用域的工具管理
 *
 * 核心职责：
 * 1. 管理工具的运行时上下文（工具ID、作用域、元数据）
 * 2. 提供线程隔离的工具管理
 * 3. 支持不同作用域的工具（THREAD、WORKFLOW、GLOBAL）
 * 4. 提供原子化的工具操作
 *
 * 设计原则：
 * - 只管理工具上下文，不包含业务逻辑
 * - 线程隔离，每个线程有独立的工具上下文
 * - 支持多级作用域（THREAD、WORKFLOW、GLOBAL）
 * - 原子操作，保证工具上下文一致性
 */

import type { ID } from '@modular-agent/types';

/**
 * 工具作用域类型
 */
export type ToolScope = 'THREAD' | 'WORKFLOW' | 'GLOBAL';

/**
 * 工具元数据
 */
export interface ToolMetadata {
  /** 工具ID */
  toolId: string;
  /** 工具描述模板（可选） */
  descriptionTemplate?: string;
  /** 自定义元数据 */
  customMetadata?: Record<string, any>;
  /** 添加时间戳 */
  addedAt: number;
}

/**
 * 工具上下文结构
 */
export interface ToolContext {
  /** 线程作用域工具 */
  threadTools: Map<string, ToolMetadata>;
  /** 工作流作用域工具 */
  workflowTools: Map<string, ToolMetadata>;
  /** 全局作用域工具 */
  globalTools: Map<string, ToolMetadata>;
}

/**
 * ToolContextManager - 工具上下文管理器
 *
 * 职责：
 * - 管理工具的运行时上下文
 * - 提供线程隔离的工具管理
 * - 支持不同作用域的工具管理
 * - 提供原子化的工具操作
 *
 * 设计原则：
 * - 有状态设计：维护工具上下文
 * - 上下文管理：提供工具的增删改查操作
 * - 线程隔离：每个线程有独立的工具上下文
 * - 作用域支持：支持THREAD、WORKFLOW、GLOBAL三种作用域
 */
export class ToolContextManager {
  /** 工具上下文映射：threadId -> ToolContext */
  private contexts: Map<string, ToolContext> = new Map();

  /**
   * 获取或创建工具上下文
   */
  private getOrCreateContext(threadId: string): ToolContext {
    if (!this.contexts.has(threadId)) {
      this.contexts.set(threadId, {
        threadTools: new Map(),
        workflowTools: new Map(),
        globalTools: new Map()
      });
    }
    return this.contexts.get(threadId)!;
  }

  /**
   * 添加工具到指定作用域
   *
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param toolIds 工具ID列表
   * @param scope 工具作用域
   * @param overwrite 是否覆盖已存在的工具
   * @param descriptionTemplate 工具描述模板（可选）
   * @param customMetadata 自定义元数据（可选）
   * @returns 成功添加的工具数量
   */
  addTools(
    threadId: string,
    workflowId: ID,
    toolIds: string[],
    scope: ToolScope = 'THREAD',
    overwrite: boolean = false,
    descriptionTemplate?: string,
    customMetadata?: Record<string, any>
  ): number {
    const context = this.getOrCreateContext(threadId);
    let addedCount = 0;

    for (const toolId of toolIds) {
      const metadata: ToolMetadata = {
        toolId,
        descriptionTemplate,
        customMetadata,
        addedAt: Date.now()
      };

      let targetMap: Map<string, ToolMetadata>;

      switch (scope) {
        case 'THREAD':
          targetMap = context.threadTools;
          break;
        case 'WORKFLOW':
          targetMap = context.workflowTools;
          break;
        case 'GLOBAL':
          targetMap = context.globalTools;
          break;
      }

      // 检查是否已存在
      if (targetMap.has(toolId)) {
        if (overwrite) {
          targetMap.set(toolId, metadata);
          addedCount++;
        }
        // 如果不覆盖，跳过
      } else {
        targetMap.set(toolId, metadata);
        addedCount++;
      }
    }

    return addedCount;
  }

  /**
   * 获取指定作用域的工具集合
   *
   * @param threadId 线程ID
   * @param scope 工具作用域（可选，不指定则返回所有作用域的工具）
   * @returns 工具ID集合
   */
  getTools(threadId: string, scope?: ToolScope): Set<string> {
    const context = this.contexts.get(threadId);
    if (!context) {
      return new Set();
    }

    if (scope) {
      switch (scope) {
        case 'THREAD':
          return new Set(context.threadTools.keys());
        case 'WORKFLOW':
          return new Set(context.workflowTools.keys());
        case 'GLOBAL':
          return new Set(context.globalTools.keys());
      }
    }

    // 返回所有作用域的工具
    const allTools = new Set<string>();
    context.threadTools.forEach((_, toolId) => allTools.add(toolId));
    context.workflowTools.forEach((_, toolId) => allTools.add(toolId));
    context.globalTools.forEach((_, toolId) => allTools.add(toolId));

    return allTools;
  }

  /**
   * 获取工具元数据
   *
   * @param threadId 线程ID
   * @param toolId 工具ID
   * @param scope 工具作用域（可选，不指定则搜索所有作用域）
   * @returns 工具元数据，如果不存在则返回undefined
   */
  getToolMetadata(threadId: string, toolId: string, scope?: ToolScope): ToolMetadata | undefined {
    const context = this.contexts.get(threadId);
    if (!context) {
      return undefined;
    }

    if (scope) {
      switch (scope) {
        case 'THREAD':
          return context.threadTools.get(toolId);
        case 'WORKFLOW':
          return context.workflowTools.get(toolId);
        case 'GLOBAL':
          return context.globalTools.get(toolId);
      }
    }

    // 搜索所有作用域
    return (
      context.threadTools.get(toolId) ||
      context.workflowTools.get(toolId) ||
      context.globalTools.get(toolId)
    );
  }

  /**
   * 移除工具
   *
   * @param threadId 线程ID
   * @param toolIds 工具ID列表
   * @param scope 工具作用域（可选，不指定则从所有作用域移除）
   * @returns 成功移除的工具数量
   */
  removeTools(threadId: string, toolIds: string[], scope?: ToolScope): number {
    const context = this.contexts.get(threadId);
    if (!context) {
      return 0;
    }

    let removedCount = 0;

    if (scope) {
      let targetMap: Map<string, ToolMetadata>;
      switch (scope) {
        case 'THREAD':
          targetMap = context.threadTools;
          break;
        case 'WORKFLOW':
          targetMap = context.workflowTools;
          break;
        case 'GLOBAL':
          targetMap = context.globalTools;
          break;
      }

      for (const toolId of toolIds) {
        if (targetMap.delete(toolId)) {
          removedCount++;
        }
      }
    } else {
      // 从所有作用域移除
      for (const toolId of toolIds) {
        if (context.threadTools.delete(toolId)) {
          removedCount++;
        }
        if (context.workflowTools.delete(toolId)) {
          removedCount++;
        }
        if (context.globalTools.delete(toolId)) {
          removedCount++;
        }
      }
    }

    return removedCount;
  }

  /**
   * 清空指定作用域的工具
   *
   * @param threadId 线程ID
   * @param scope 工具作用域（可选，不指定则清空所有作用域）
   * @returns 清空的工具数量
   */
  clearTools(threadId: string, scope?: ToolScope): number {
    const context = this.contexts.get(threadId);
    if (!context) {
      return 0;
    }

    let clearedCount = 0;

    if (scope) {
      switch (scope) {
        case 'THREAD':
          clearedCount = context.threadTools.size;
          context.threadTools.clear();
          break;
        case 'WORKFLOW':
          clearedCount = context.workflowTools.size;
          context.workflowTools.clear();
          break;
        case 'GLOBAL':
          clearedCount = context.globalTools.size;
          context.globalTools.clear();
          break;
      }
    } else {
      clearedCount = context.threadTools.size + context.workflowTools.size + context.globalTools.size;
      context.threadTools.clear();
      context.workflowTools.clear();
      context.globalTools.clear();
    }

    return clearedCount;
  }

  /**
   * 检查工具是否存在
   *
   * @param threadId 线程ID
   * @param toolId 工具ID
   * @param scope 工具作用域（可选，不指定则检查所有作用域）
   * @returns 工具是否存在
   */
  hasTool(threadId: string, toolId: string, scope?: ToolScope): boolean {
    const context = this.contexts.get(threadId);
    if (!context) {
      return false;
    }

    if (scope) {
      switch (scope) {
        case 'THREAD':
          return context.threadTools.has(toolId);
        case 'WORKFLOW':
          return context.workflowTools.has(toolId);
        case 'GLOBAL':
          return context.globalTools.has(toolId);
      }
    }

    return (
      context.threadTools.has(toolId) ||
      context.workflowTools.has(toolId) ||
      context.globalTools.has(toolId)
    );
  }

  /**
   * 获取工具上下文的快照
   *
   * @param threadId 线程ID
   * @returns 工具上下文快照
   */
  getSnapshot(threadId: string): ToolContext | undefined {
    const context = this.contexts.get(threadId);
    if (!context) {
      return undefined;
    }

    return {
      threadTools: new Map(context.threadTools),
      workflowTools: new Map(context.workflowTools),
      globalTools: new Map(context.globalTools)
    };
  }

  /**
   * 从快照恢复工具上下文
   *
   * @param threadId 线程ID
   * @param snapshot 工具上下文快照
   */
  restoreSnapshot(threadId: string, snapshot: ToolContext): void {
    this.contexts.set(threadId, {
      threadTools: new Map(snapshot.threadTools),
      workflowTools: new Map(snapshot.workflowTools),
      globalTools: new Map(snapshot.globalTools)
    });
  }

  /**
   * 删除工具上下文
   *
   * @param threadId 线程ID
   */
  deleteContext(threadId: string): void {
    this.contexts.delete(threadId);
  }

  /**
   * 清空所有工具上下文
   */
  clearAll(): void {
    this.contexts.clear();
  }

  /**
   * 获取所有线程ID
   *
   * @returns 线程ID列表
   */
  getAllThreadIds(): string[] {
    return Array.from(this.contexts.keys());
  }
}