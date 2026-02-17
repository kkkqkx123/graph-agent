/**
 * ToolVisibilityCoordinator - 工具可见性协调器
 * 管理工具的运行时可见性，生成可见性声明消息
 *
 * 核心职责：
 * 1. 管理工具可见性上下文
 * 2. 生成结构化可见性声明
 * 3. 在作用域切换时触发声明更新
 * 4. 支持动态添加工具
 *
 * 设计原则：
 * - 增量式声明：通过新增消息声明当前可用工具集
 * - 显式覆盖：新的声明覆盖旧的声明，形成"有效工具快照"
 * - 双重保障：提示词声明 + 执行拦截，确保安全性
 * - 保持KV缓存：不修改历史消息，避免KV缓存失效
 */

import type { ToolScope } from '../managers/tool-context-manager.js';
import type {
  ToolVisibilityContext,
  VisibilityDeclaration,
  VisibilityDeclarationStrategy,
  VisibilityChangeType,
  VisibilityUpdateRequest
} from '../types/tool-visibility.types.js';
import { defaultVisibilityDeclarationStrategy } from '../types/tool-visibility.types.js';
import type { ThreadContext } from '../context/thread-context.js';
import type { ToolService } from '../../services/tool-service.js';
import type { LLMMessage } from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';

/**
 * ToolVisibilityCoordinator - 工具可见性协调器
 */
export class ToolVisibilityCoordinator {
  /** 工具可见性上下文映射：threadId -> ToolVisibilityContext */
  private contexts: Map<string, ToolVisibilityContext> = new Map();
  
  /** 工具服务 */
  private toolService: ToolService;
  
  /** 声明策略 */
  private strategy: VisibilityDeclarationStrategy;
  
  /** 批量声明定时器 */
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  
  /** 批量声明队列 */
  private batchQueues: Map<string, VisibilityUpdateRequest[]> = new Map();

  /**
   * 构造函数
   * @param toolService 工具服务
   * @param strategy 声明策略
   */
  constructor(
    toolService: ToolService,
    strategy: VisibilityDeclarationStrategy = { ...defaultVisibilityDeclarationStrategy }
  ) {
    this.toolService = toolService;
    this.strategy = strategy;
  }

  /**
   * 初始化可见性上下文
   * @param threadId 线程ID
   * @param initialTools 初始工具ID列表
   * @param scope 初始作用域
   * @param scopeId 作用域ID
   * @returns 工具可见性上下文
   */
  initializeContext(
    threadId: string,
    initialTools: string[],
    scope: ToolScope = 'THREAD',
    scopeId: string = threadId
  ): ToolVisibilityContext {
    const context: ToolVisibilityContext = {
      currentScope: scope,
      scopeId,
      visibleTools: new Set(initialTools),
      declarationHistory: [],
      lastDeclarationIndex: -1,
      initializedAt: Date.now()
    };

    this.contexts.set(threadId, context);
    return context;
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
   * 作用域切换时更新可见性
   * 生成并添加新的可见性声明消息
   * @param threadContext 线程上下文
   * @param newScope 新的作用域
   * @param newScopeId 新的作用域ID
   * @param availableTools 可用工具ID列表
   * @param changeType 变更类型
   */
  async updateVisibilityOnScopeChange(
    threadContext: ThreadContext,
    newScope: ToolScope,
    newScopeId: string,
    availableTools: string[],
    changeType: VisibilityChangeType = 'enter_scope'
  ): Promise<void> {
    const threadId = threadContext.getThreadId();
    const context = this.getContext(threadId);

    if (!context) {
      // 如果上下文不存在，先初始化
      this.initializeContext(threadId, availableTools, newScope, newScopeId);
    } else {
      // 更新上下文
      context.currentScope = newScope;
      context.scopeId = newScopeId;
      context.visibleTools = new Set(availableTools);
    }

    // 生成声明消息
    const message = this.buildVisibilityDeclarationMessage(
      newScope,
      newScopeId,
      availableTools,
      changeType
    );

    // 添加到对话历史
    const llmMessage: LLMMessage = {
      role: 'system',
      content: message,
      metadata: {
        type: 'tool_visibility_declaration',
        timestamp: Date.now(),
        scope: newScope,
        scopeId: newScopeId,
        toolIds: availableTools,
        changeType
      }
    };

    threadContext.addMessageToConversation(llmMessage);

    // 更新声明历史
    const declaration: VisibilityDeclaration = {
      timestamp: Date.now(),
      scope: newScope,
      scopeId: newScopeId,
      toolIds: [...availableTools],
      messageIndex: threadContext.getConversationHistory().length - 1,
      changeType
    };

    const updatedContext = this.getContext(threadId)!;
    updatedContext.declarationHistory.push(declaration);
    updatedContext.lastDeclarationIndex = declaration.messageIndex;
  }

  /**
   * 动态添加工具
   * 生成增量可见性声明
   * @param threadContext 线程上下文
   * @param toolIds 工具ID列表
   * @param scope 作用域
   */
  async addToolsDynamically(
    threadContext: ThreadContext,
    toolIds: string[],
    scope: ToolScope
  ): Promise<void> {
    const threadId = threadContext.getThreadId();
    const context = this.getContext(threadId);

    if (!context) {
      throw new Error(`Tool visibility context not found for thread: ${threadId}`);
    }

    // 添加到可见工具集合
    toolIds.forEach(id => context.visibleTools.add(id));

    // 如果启用批量声明，则加入队列
    if (this.strategy.batchDeclarations && !this.strategy.forceDeclarationOnScopeChange) {
      await this.enqueueBatchDeclaration(threadContext, toolIds, scope);
    } else {
      // 立即生成声明
      await this.updateVisibilityOnScopeChange(
        threadContext,
        scope,
        context.scopeId,
        Array.from(context.visibleTools),
        'add_tools'
      );
    }
  }

  /**
   * 刷新可见性声明
   * 用于定期刷新或上下文压缩后恢复
   * @param threadContext 线程上下文
   */
  async refreshDeclaration(threadContext: ThreadContext): Promise<void> {
    const threadId = threadContext.getThreadId();
    const context = this.getContext(threadId);

    if (!context) {
      throw new Error(`Tool visibility context not found for thread: ${threadId}`);
    }

    await this.updateVisibilityOnScopeChange(
      threadContext,
      context.currentScope,
      context.scopeId,
      Array.from(context.visibleTools),
      'refresh'
    );
  }

  /**
   * 构建可见性声明消息内容
   * @param scope 作用域
   * @param scopeId 作用域ID
   * @param toolIds 工具ID列表
   * @param changeType 变更类型
   * @returns 声明消息内容
   */
  buildVisibilityDeclarationMessage(
    scope: ToolScope,
    scopeId: string,
    toolIds: string[],
    changeType: VisibilityChangeType
  ): string {
    const timestamp = new Date().toISOString();
    const changeTypeText = this.getChangeTypeText(changeType);

    // 构建工具描述表格
    const toolDescriptions = toolIds
      .map(id => {
        const tool = this.toolService.getTool(id);
        if (!tool) return null;
        return `| ${tool.name} | ${id} | ${tool.description} |`;
      })
      .filter(Boolean)
      .join('\n');

    const message = `## 工具可见性声明

**生效时间**：${timestamp}
**当前作用域**：${scope}(${scopeId})
**变更类型**：${changeTypeText}

### 当前可用工具清单

| 工具名称 | 工具ID | 说明 |
|----------|--------|------|
${toolDescriptions || '无可用工具'}

### 重要提示

1. **仅可使用上述清单中的工具**，其他工具调用将被拒绝
2. 工具参数必须符合schema定义
3. 如需更多工具，请完成当前任务后退出当前作用域
`;

    return message;
  }

  /**
   * 获取当前有效工具集（用于执行拦截）
   * @param threadId 线程ID
   * @returns 当前可见工具集合
   */
  getEffectiveVisibleTools(threadId: string): Set<string> {
    const context = this.getContext(threadId);
    if (!context) {
      return new Set();
    }
    return new Set(context.visibleTools);
  }

  /**
   * 检查工具是否在当前可见性上下文中
   * @param threadId 线程ID
   * @param toolId 工具ID
   * @returns 是否可见
   */
  isToolVisible(threadId: string, toolId: string): boolean {
    const visibleTools = this.getEffectiveVisibleTools(threadId);
    return visibleTools.has(toolId);
  }

  /**
   * 获取变更类型文本
   * @param changeType 变更类型
   * @returns 变更类型文本
   */
  private getChangeTypeText(changeType: VisibilityChangeType): string {
    const typeMap: Record<VisibilityChangeType, string> = {
      init: '初始化',
      enter_scope: '进入作用域',
      add_tools: '新增工具',
      exit_scope: '退出作用域',
      refresh: '刷新声明'
    };
    return typeMap[changeType] || changeType;
  }

  /**
   * 将批量声明加入队列
   * @param threadContext 线程上下文
   * @param toolIds 工具ID列表
   * @param scope 作用域
   */
  private async enqueueBatchDeclaration(
    threadContext: ThreadContext,
    toolIds: string[],
    scope: ToolScope
  ): Promise<void> {
    const threadId = threadContext.getThreadId();
    const context = this.getContext(threadId)!;

    // 创建更新请求
    const request: VisibilityUpdateRequest = {
      scope,
      scopeId: context.scopeId,
      toolIds,
      changeType: 'add_tools'
    };

    // 加入队列
    if (!this.batchQueues.has(threadId)) {
      this.batchQueues.set(threadId, []);
    }
    this.batchQueues.get(threadId)!.push(request);

    // 如果已有定时器，则不重复创建
    if (this.batchTimers.has(threadId)) {
      return;
    }

    // 创建定时器
    const timer = setTimeout(async () => {
      await this.processBatchDeclaration(threadContext);
    }, this.strategy.maxBatchWaitTime);

    this.batchTimers.set(threadId, timer);
  }

  /**
   * 处理批量声明
   * @param threadContext 线程上下文
   */
  private async processBatchDeclaration(threadContext: ThreadContext): Promise<void> {
    const threadId = threadContext.getThreadId();
    const context = this.getContext(threadId);

    if (!context) {
      return;
    }

    // 清除定时器
    const timer = this.batchTimers.get(threadId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(threadId);
    }

    // 获取队列中的所有请求
    const queue = this.batchQueues.get(threadId) || [];
    this.batchQueues.delete(threadId);

    if (queue.length === 0) {
      return;
    }

    // 合并所有工具ID
    const allToolIds = new Set<string>();
    queue.forEach(req => {
      req.toolIds.forEach(id => allToolIds.add(id));
    });

    // 生成声明
    await this.updateVisibilityOnScopeChange(
      threadContext,
      context.currentScope,
      context.scopeId,
      Array.from(allToolIds),
      'add_tools'
    );
  }

  /**
   * 删除可见性上下文
   * @param threadId 线程ID
   */
  deleteContext(threadId: string): void {
    // 清除批量定时器
    const timer = this.batchTimers.get(threadId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(threadId);
    }

    // 清除批量队列
    this.batchQueues.delete(threadId);

    // 删除上下文
    this.contexts.delete(threadId);
  }

  /**
   * 清空所有可见性上下文
   */
  clearAll(): void {
    // 清除所有定时器
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    this.batchQueues.clear();
    this.contexts.clear();
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
}