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
