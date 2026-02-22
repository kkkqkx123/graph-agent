/**
 * ToolVisibilityCoordinator - 工具可见性协调器
 * 管理工具的运行时可见性，生成可见性声明消息
 *
 * 核心职责：
 * 1. 管理工具可见性上下文
 * 2. 生成结构化可见性声明
 * 3. 在作用域切换时触发声明更新
 * 4. 支持动态添加工具
 * 5. 避免重复声明，优化token消耗
 *
 * 设计原则：
 * - 增量式声明：通过新增消息声明当前可用工具集
 * - 显式覆盖：新的声明覆盖旧的声明，形成"有效工具快照"
 * - 双重保障：提示词声明 + 执行拦截，确保安全性
 * - 保持KV缓存：不修改历史消息，避免KV缓存失效
 * - 声明去重：避免短时间内重复声明相同工具集
 */

import type { ToolScope } from '../managers/tool-context-manager.js';
import type {
  ToolVisibilityContext,
  VisibilityDeclaration,
  VisibilityChangeType
} from '../types/tool-visibility.types.js';
import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { ToolService } from '../../services/tool-service.js';
import type { LLMMessage } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';

/**
 * ToolVisibilityCoordinator - 工具可见性协调器
 */
export class ToolVisibilityCoordinator {
  /** 工具可见性上下文映射：threadId -> ToolVisibilityContext */
  private contexts: Map<string, ToolVisibilityContext> = new Map();

  /** 工具服务 */
  private toolService: ToolService;

  /**
   * 构造函数
   * @param toolService 工具服务
   */
  constructor(toolService: ToolService) {
    this.toolService = toolService;
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
      initializedAt: now()
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
   * @param threadEntity 线程实体
   * @param newScope 新的作用域
   * @param newScopeId 新的作用域ID
   * @param availableTools 可用工具ID列表
   * @param changeType 变更类型
   */
  async updateVisibilityOnScopeChange(
    threadEntity: ThreadEntity,
    newScope: ToolScope,
    newScopeId: string,
    availableTools: string[],
    changeType: VisibilityChangeType = 'enter_scope'
  ): Promise<void> {
    const threadId = threadEntity.getThreadId();
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

    // 检查是否需要跳过重复声明
    if (this.shouldSkipDeclaration(threadId, availableTools, changeType)) {
      return;
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
        timestamp: now(),
        scope: newScope,
        scopeId: newScopeId,
        toolIds: availableTools,
        changeType
      }
    };

    threadEntity.addMessageToConversation(llmMessage);

    // 更新声明历史
    const declaration: VisibilityDeclaration = {
      timestamp: now(),
      scope: newScope,
      scopeId: newScopeId,
      toolIds: [...availableTools],
      messageIndex: threadEntity.getConversationHistory().length - 1,
      changeType
    };

    const updatedContext = this.getContext(threadId)!;
    updatedContext.declarationHistory.push(declaration);
    updatedContext.lastDeclarationIndex = declaration.messageIndex;
  }

  /**
   * 检查是否应该跳过重复声明
   * @param threadId 线程ID
   * @param availableTools 可用工具ID列表
   * @param changeType 变更类型
   * @returns 是否应该跳过
   */
  private shouldSkipDeclaration(
    threadId: string,
    availableTools: string[],
    changeType: VisibilityChangeType
  ): boolean {
    // 对于重要的变更类型（如 enter_scope, exit_scope），不跳过
    if (changeType === 'enter_scope' || changeType === 'exit_scope') {
      return false;
    }

    const context = this.getContext(threadId);
    if (!context) {
      return false;
    }

    // 检查工具集是否相同
    const currentToolSet = new Set(availableTools);
    if (this.areToolSetsEqual(context.visibleTools, currentToolSet)) {
      return true; // 工具集相同，跳过声明
    }

    return false;
  }

  /**
   * 比较两个工具集是否相同
   * @param set1 工具集1
   * @param set2 工具集2
   * @returns 是否相同
   */
  private areToolSetsEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) {
      return false;
    }
    for (const tool of set1) {
      if (!set2.has(tool)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 动态添加工具
   * 生成增量可见性声明
   * @param threadContext 线程上下文
   * @param toolIds 工具ID列表
   * @param scope 作用域
   */
  async addToolsDynamically(
    threadEntity: ThreadEntity,
    toolIds: string[],
    scope: ToolScope
  ): Promise<void> {
    const threadId = threadEntity.getThreadId();
    const context = this.getContext(threadId);

    if (!context) {
      throw new Error(`Tool visibility context not found for thread: ${threadId}`);
    }

    // 添加到可见工具集合
    toolIds.forEach(id => context.visibleTools.add(id));

    // 立即生成声明
    await this.updateVisibilityOnScopeChange(
      threadEntity,
      scope,
      context.scopeId,
      Array.from(context.visibleTools),
      'add_tools'
    );
  }

  /**
   * 刷新可见性声明
   * 用于定期刷新或消息操作后恢复
   *
   * 说明：
   * - 在消息操作（如 truncate, filter, clear）后调用此方法
   * - 确保工具可见性声明与当前消息状态一致
   * - SDK不提供默认的消息操作实现，由应用层定义
   * - 仅在工具集发生变化时才生成新的声明
   *
   * @param threadContext 线程上下文
   */
  async refreshDeclaration(threadEntity: ThreadEntity): Promise<void> {
    const threadId = threadEntity.getThreadId();
    const context = this.getContext(threadId);

    if (!context) {
      throw new Error(`Tool visibility context not found for thread: ${threadId}`);
    }

    // 检查是否需要刷新（工具集是否发生变化）
    const currentTools = Array.from(context.visibleTools);
    
    // 获取上次声明的工具集
    const lastDeclaration = context.declarationHistory.length > 0
      ? context.declarationHistory[context.declarationHistory.length - 1]
      : null;

    // 如果上次声明存在且工具集相同，则不需要刷新
    if (lastDeclaration) {
      const lastTools = lastDeclaration.toolIds;
      if (this.areToolSetsEqual(new Set(lastTools), new Set(currentTools))) {
        return; // 工具集未变化，跳过刷新
      }
    }

    // 工具集已变化，生成新的声明
    await this.updateVisibilityOnScopeChange(
      threadEntity,
      context.currentScope,
      context.scopeId,
      currentTools,
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
   * 验证声明历史完整性
   * @param threadId 线程ID
   * @param threadContext 线程上下文
   * @returns 验证结果
   */
  validateDeclarationHistory(
    threadId: string,
    threadEntity: ThreadEntity
  ): { valid: boolean; errors: string[] } {
    const context = this.getContext(threadId);
    if (!context) {
      return { valid: false, errors: ['Context not found'] };
    }

    const errors: string[] = [];
    const conversationHistory = threadEntity.getConversationHistory();

    // 检查每个声明记录
    for (let i = 0; i < context.declarationHistory.length; i++) {
      const declaration = context.declarationHistory[i]!;
      
      // 检查消息索引是否有效
      if (declaration.messageIndex < 0 ||
          declaration.messageIndex >= conversationHistory.length) {
        errors.push(`Declaration ${i}: messageIndex ${declaration.messageIndex} out of range`);
        continue;
      }

      // 检查消息是否为工具可见性声明
      const message = conversationHistory[declaration.messageIndex];
      if (!message || !message.metadata ||
          message.metadata['type'] !== 'tool_visibility_declaration') {
        errors.push(`Declaration ${i}: message at index ${declaration.messageIndex} is not a visibility declaration`);
        continue;
      }

      // 检查作用域信息是否匹配
      if (message.metadata['scope'] !== declaration.scope ||
          message.metadata['scopeId'] !== declaration.scopeId) {
        errors.push(`Declaration ${i}: scope mismatch in metadata`);
      }
    }

    // 检查是否有孤立的声明消息（在历史中但不在记录中）
    const declarationMessages = conversationHistory.filter(
      msg => msg && msg.metadata && msg.metadata['type'] === 'tool_visibility_declaration'
    );
    
    if (declarationMessages.length !== context.declarationHistory.length) {
      errors.push(`Declaration count mismatch: ${declarationMessages.length} messages vs ${context.declarationHistory.length} records`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 消息操作后更新声明历史
   * 当消息被截断、过滤或清空时调用此方法
   * @param threadId 线程ID
   * @param threadContext 线程上下文
   * @param operation 操作类型
   */
  async updateDeclarationHistoryAfterMessageOperation(
    threadId: string,
    threadEntity: ThreadEntity,
    operation: 'truncate' | 'filter' | 'clear'
  ): Promise<void> {
    const context = this.getContext(threadId);
    if (!context) {
      return;
    }

    const conversationHistory = threadEntity.getConversationHistory();

    if (operation === 'clear') {
      // 清空所有声明历史
      context.declarationHistory = [];
      context.lastDeclarationIndex = -1;
      
      // 重新生成初始声明
      await this.updateVisibilityOnScopeChange(
        threadEntity,
        context.currentScope,
        context.scopeId,
        Array.from(context.visibleTools),
        'init'
      );
      return;
    }

    if (operation === 'truncate' || operation === 'filter') {
      // 移除超出范围的声明记录
      const validDeclarations = context.declarationHistory.filter(
        decl => decl.messageIndex < conversationHistory.length
      );
      
      // 如果有声明被移除，需要重新生成最新的声明
      if (validDeclarations.length !== context.declarationHistory.length) {
        context.declarationHistory = validDeclarations;
        
        // 重新生成当前可见性声明
        await this.updateVisibilityOnScopeChange(
          threadEntity,
          context.currentScope,
          context.scopeId,
          Array.from(context.visibleTools),
          'refresh'
        );
      }
    }
  }

  /**
   * 自动修复声明历史
   * 当验证失败时调用此方法
   * @param threadId 线程ID
   * @param threadContext 线程上下文
   */
  async repairDeclarationHistory(
    threadId: string,
    threadEntity: ThreadEntity
  ): Promise<void> {
    const context = this.getContext(threadId);
    if (!context) {
      return;
    }

    const conversationHistory = threadEntity.getConversationHistory();
    
    // 1. 扫描对话历史中的所有工具可见性声明消息
    const declarationMessages: Array<{ index: number; message: LLMMessage }> = [];
    
    for (let i = 0; i < conversationHistory.length; i++) {
      const msg = conversationHistory[i];
      if (msg && msg.metadata && msg.metadata['type'] === 'tool_visibility_declaration') {
        declarationMessages.push({ index: i, message: msg });
      }
    }

    // 2. 重建声明历史
    const rebuiltHistory: VisibilityDeclaration[] = [];
    
    for (const { index, message } of declarationMessages) {
      const metadata = message.metadata;
      if (metadata) {
        rebuiltHistory.push({
          timestamp: metadata['timestamp'] || now(),
          scope: metadata['scope'] || 'THREAD',
          scopeId: metadata['scopeId'] || threadId,
          toolIds: metadata['toolIds'] || [],
          messageIndex: index,
          changeType: metadata['changeType'] || 'refresh'
        });
      }
    }

    // 3. 更新上下文
    context.declarationHistory = rebuiltHistory;
    context.lastDeclarationIndex = rebuiltHistory.length > 0
      ? rebuiltHistory[rebuiltHistory.length - 1]!.messageIndex
      : -1;

    // 4. 如果没有声明，生成初始声明
    if (rebuiltHistory.length === 0) {
      await this.updateVisibilityOnScopeChange(
        threadEntity,
        context.currentScope,
        context.scopeId,
        Array.from(context.visibleTools),
        'init'
      );
    }
  }

  /**
   * 删除可见性上下文
   * @param threadId 线程ID
   */
  deleteContext(threadId: string): void {
    this.contexts.delete(threadId);
  }

  /**
   * 清空所有可见性上下文
   */
  clearAll(): void {
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