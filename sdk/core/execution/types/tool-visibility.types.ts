/**
 * 工具可见性类型定义
 * 定义工具可见性上下文和相关的数据结构
 */

import type { ToolScope } from '../managers/tool-context-manager.js';

/**
 * 可见性声明历史记录
 */
export interface VisibilityDeclaration {
  /** 时间戳 */
  timestamp: number;
  /** 作用域类型 */
  scope: ToolScope;
  /** 作用域ID（线程ID/工作流ID） */
  scopeId: string;
  /** 工具ID列表 */
  toolIds: string[];
  /** 声明消息在对话中的位置 */
  messageIndex: number;
  /** 变更类型 */
  changeType: 'init' | 'enter_scope' | 'add_tools' | 'exit_scope' | 'refresh';
}

/**
 * 工具可见性上下文
 */
export interface ToolVisibilityContext {
  /** 当前作用域 */
  currentScope: ToolScope;
  
  /** 当前作用域ID（线程ID/工作流ID） */
  scopeId: string;
  
  /** 当前可见工具集合 */
  visibleTools: Set<string>;
  
  /** 可见性声明历史 */
  declarationHistory: VisibilityDeclaration[];
  
  /** 上次声明的消息索引 */
  lastDeclarationIndex: number;
  
  /** 初始化时间戳 */
  initializedAt: number;
}

/**
 * 可见性声明策略配置
 */
export interface VisibilityDeclarationStrategy {
  /** 最小声明间隔（毫秒） */
  minDeclarationInterval: number;
  
  /** 是否批量合并声明 */
  batchDeclarations: boolean;
  
  /** 最大批量等待时间（毫秒） */
  maxBatchWaitTime: number;
  
  /** 作用域切换时强制声明 */
  forceDeclarationOnScopeChange: boolean;
  
  /** 定期刷新间隔（轮数） */
  refreshInterval?: number;
}

/**
 * 默认可见性声明策略
 */
export const defaultVisibilityDeclarationStrategy: VisibilityDeclarationStrategy = {
  minDeclarationInterval: 1000,  // 1秒内不重复声明
  batchDeclarations: true,        // 批量合并动态添加的工具
  maxBatchWaitTime: 500,         // 最多等待500ms批量
  forceDeclarationOnScopeChange: true  // 作用域切换必须声明
};

/**
 * 工具可见性变更类型
 */
export type VisibilityChangeType = 
  | 'init'           // 初始化
  | 'enter_scope'    // 进入作用域
  | 'add_tools'      // 添加工具
  | 'exit_scope'     // 退出作用域
  | 'refresh';       // 刷新声明

/**
 * 工具可见性更新请求
 */
export interface VisibilityUpdateRequest {
  /** 新的作用域 */
  scope: ToolScope;
  /** 作用域ID */
  scopeId: string;
  /** 可用工具ID列表 */
  toolIds: string[];
  /** 变更类型 */
  changeType: VisibilityChangeType;
  /** 是否强制声明（忽略时间间隔限制） */
  force?: boolean;
}