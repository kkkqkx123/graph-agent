/**
 * 交互节点配置类型定义
 */

import type { VariableScope } from '../../common';

/**
 * 用户交互节点配置
 * 定义用户交互的业务语义，不包含应用层实现细节
 */
export interface UserInteractionNodeConfig {
  /** 操作类型 */
  operationType: 'UPDATE_VARIABLES' | 'ADD_MESSAGE';
  /** 变量更新配置（当 operationType = UPDATE_VARIABLES） */
  variables?: Array<{
    /** 变量名称 */
    variableName: string;
    /** 变量更新表达式（可能包含 {{input}} 占位符） */
    expression: string;
    /** 变量作用域 */
    scope: VariableScope;
  }>;
  /** 消息配置（当 operationType = ADD_MESSAGE） */
  message?: {
    /** 消息角色（固定为 'user'） */
    role: 'user';
    /** 消息内容模板（可能包含 {{input}} 占位符） */
    contentTemplate: string;
  };
  /** 给用户的提示信息（应用层用于显示） */
  prompt: string;
  /** 交互超时时间（毫秒） */
  timeout?: number;
  /** 额外的业务信息 */
  metadata?: Record<string, any>;
}