/**
 * HumanRelay API
 * 提供人工中继相关的接口定义
 */

import type { ID, VariableScope } from '../../types/common';
import type {
  HumanRelayRequest,
  HumanRelayResponse
} from '../../types/human-relay';

/**
 * HumanRelay 上下文
 * SDK 提供给应用层的执行上下文
 */
export interface HumanRelayContext {
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
 * HumanRelay 处理器接口
 * 应用层必须实现的接口，用于处理人工输入
 */
export interface HumanRelayHandler {
  /**
   * 处理 HumanRelay 请求
   * @param request HumanRelay 请求
   * @param context HumanRelay 上下文
   * @returns HumanRelay 响应
   */
  handle(request: HumanRelayRequest, context: HumanRelayContext): Promise<HumanRelayResponse>;
}