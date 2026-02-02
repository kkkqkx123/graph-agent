/**
 * 用户交互 API
 * 提供用户交互相关的接口定义和注册机制
 */

import type { ID, VariableScope } from '../../types/common';
import type {
  UserInteractionRequest,
  UserInteractionResponse
} from '../../types/interaction';

/**
 * 用户交互上下文
 * SDK 提供给应用层的执行上下文
 */
export interface UserInteractionContext {
  /** 线程ID */
  threadId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 节点ID */
  nodeId: ID;
  /** 获取变量值 */
  getVariable(variableName: string, scope?: VariableScope): any;
  /** 设置变量值 */
  setVariable(variableName: string, value: any, scope?: VariableScope): Promise<void>;
  /** 获取所有变量 */
  getVariables(scope?: VariableScope): Record<string, any>;
  /** 超时控制 */
  timeout: number;
  /** 取消令牌 */
  cancelToken: {
    cancelled: boolean;
    cancel(): void;
  };
}

/**
 * 用户交互处理器接口
 * 应用层必须实现的接口，用于获取用户输入
 */
export interface UserInteractionHandler {
  /**
   * 处理用户交互请求
   * @param request 交互请求
   * @param context 交互上下文
   * @returns 用户输入数据
   */
  handle(request: UserInteractionRequest, context: UserInteractionContext): Promise<any>;
}

/**
 * 用户交互处理器注册表
 */
class UserInteractionHandlerRegistry {
  private handler: UserInteractionHandler | null = null;

  /**
   * 注册用户交互处理器
   * @param handler 用户交互处理器
   */
  register(handler: UserInteractionHandler): void {
    this.handler = handler;
  }

  /**
   * 获取用户交互处理器
   * @returns 用户交互处理器
   */
  get(): UserInteractionHandler | null {
    return this.handler;
  }

  /**
   * 清除用户交互处理器
   */
  clear(): void {
    this.handler = null;
  }
}

/**
 * 全局用户交互处理器注册表实例
 */
export const userInteractionHandlerRegistry = new UserInteractionHandlerRegistry();