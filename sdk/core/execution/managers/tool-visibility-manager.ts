/**
 * ToolVisibilityManager - 工具可见性管理器
 * 管理工具的可见性状态
 */

import type { ToolScope } from './tool-context-manager.js';
import type { ToolVisibilityContext } from '../types/tool-visibility.types.js';
import type { LifecycleCapable } from './lifecycle-capable.js';

/**
 * ToolVisibilityManager - 工具可见性管理器
 *
 * 职责：
 * - 管理工具的可见性状态
 * - 提供线程隔离的可见性管理
 * - 支持不同作用域的工具可见性
 * - 提供状态快照和恢复功能
 *
 * 设计原则：
 * - 有状态设计：维护可见性上下文
 * - 状态管理：提供可见性的增删改查操作
 * - 线程隔离：每个线程有独立的可见性上下文
 * - 生命周期管理：实现LifecycleCapable接口
 */
export class ToolVisibilityManager implements LifecycleCapable {
  /** 工具可见性上下文映射：threadId -> ToolVisibilityContext */
  private contexts: Map<string, ToolVisibilityContext> = new Map();

  /**
   * 初始化可见性上下文
   * @param threadId 线程ID
   * @param availableTools 可用工具ID列表
   * @param scope 作用域
   * @param scopeId 作用域ID
   */
  initializeContext(
    threadId: string,
    availableTools: string[],
    scope: ToolScope = 'THREAD',
    scopeId: string = threadId
  ): void {
    const context: ToolVisibilityContext = {
      currentScope: scope,
      scopeId,
      visibleTools: new Set(availableTools),
      declarationHistory: [],
      lastDeclarationIndex: -1,
      initializedAt: Date.now()
    };

    this.contexts.set(threadId, context);
  }

  /**
   * 获取可见性上下文
   * @param threadId 线程ID
   * @returns 工具可见性上下文，如果不存在则返回undefined
   */
  getContext(threadId: string): ToolVisibilityContext | undefined {
    return this.contexts.get(threadId);
  }

  /**
   * 获取可见工具集合
   * @param threadId 线程ID
   * @returns 可见工具集合
   */
  getVisibleTools(threadId: string): Set<string> {
    const context = this.contexts.get(threadId);
    return context ? context.visibleTools : new Set();
  }

  /**
   * 更新可见性
   * @param threadId 线程ID
   * @param newTools 新的工具ID列表
   * @param scope 作用域
   * @param scopeId 作用域ID
   */
  updateVisibility(
    threadId: string,
    newTools: string[],
    scope: ToolScope,
    scopeId: string
  ): void {
    const context = this.contexts.get(threadId);
    if (!context) {
      this.initializeContext(threadId, newTools, scope, scopeId);
      return;
    }

    context.currentScope = scope;
    context.scopeId = scopeId;
    context.visibleTools = new Set(newTools);
  }

  /**
   * 添加工具到可见性集合
   * @param threadId 线程ID
   * @param toolIds 工具ID列表
   */
  addTools(threadId: string, toolIds: string[]): void {
    const context = this.contexts.get(threadId);
    if (!context) {
      return;
    }

    toolIds.forEach(id => context.visibleTools.add(id));
  }

  /**
   * 从可见性集合中移除工具
   * @param threadId 线程ID
   * @param toolIds 工具ID列表
   */
  removeTools(threadId: string, toolIds: string[]): void {
    const context = this.contexts.get(threadId);
    if (!context) {
      return;
    }

    toolIds.forEach(id => context.visibleTools.delete(id));
  }

  /**
   * 检查工具是否可见
   * @param threadId 线程ID
   * @param toolId 工具ID
   * @returns 是否可见
   */
  isToolVisible(threadId: string, toolId: string): boolean {
    const context = this.contexts.get(threadId);
    if (!context) {
      return false;
    }
    return context.visibleTools.has(toolId);
  }

  /**
   * 删除可见性上下文
   * @param threadId 线程ID
   */
  deleteContext(threadId: string): void {
    this.contexts.delete(threadId);
  }

  /**
   * 清理资源
   * 清空所有可见性上下文
   */
  cleanup(): void {
    this.contexts.clear();
  }

  /**
   * 创建状态快照
   * @returns 状态快照
   */
  createSnapshot(): Map<string, ToolVisibilityContext> {
    const snapshot = new Map<string, ToolVisibilityContext>();
    for (const [threadId, context] of this.contexts.entries()) {
      snapshot.set(threadId, {
        ...context,
        visibleTools: new Set(context.visibleTools),
        declarationHistory: [...context.declarationHistory]
      });
    }
    return snapshot;
  }

  /**
   * 从快照恢复状态
   * @param snapshot 状态快照
   */
  restoreFromSnapshot(snapshot: Map<string, ToolVisibilityContext>): void {
    this.contexts.clear();
    for (const [threadId, context] of snapshot.entries()) {
      this.contexts.set(threadId, {
        ...context,
        visibleTools: new Set(context.visibleTools),
        declarationHistory: [...context.declarationHistory]
      });
    }
  }

  /**
   * 获取可见性上下文快照
   * @param threadId 线程ID
   * @returns 可见性上下文快照
   */
  getSnapshot(threadId: string): ToolVisibilityContext | undefined {
    const context = this.contexts.get(threadId);
    if (!context) {
      return undefined;
    }

    return {
      ...context,
      visibleTools: new Set(context.visibleTools),
      declarationHistory: [...context.declarationHistory]
    };
  }

  /**
   * 从快照恢复可见性上下文
   * @param threadId 线程ID
   * @param snapshot 可见性上下文快照
   */
  restoreSnapshot(threadId: string, snapshot: ToolVisibilityContext): void {
    this.contexts.set(threadId, {
      ...snapshot,
      visibleTools: new Set(snapshot.visibleTools),
      declarationHistory: [...snapshot.declarationHistory]
    });
  }

  /**
   * 获取所有线程ID
   * @returns 所有线程ID列表
   */
  getAllThreadIds(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * 获取上下文数量
   * @returns 上下文数量
   */
  getContextCount(): number {
    return this.contexts.size;
  }
}