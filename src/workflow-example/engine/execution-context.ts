/**
 * 执行上下文实现
 * 
 * 本文件实现了工作流执行过程中的上下文管理
 */

import {
  ExecutionContext as ExecutionContextInterface,
  NodeOutput
} from '../types/workflow-types';

/**
 * 执行上下文类
 * 管理工作流执行过程中的所有数据
 */
export class ExecutionContextImpl implements ExecutionContextInterface {
  private _workflowId: string;
  private _executionId: string;
  private _data: Map<string, any>;
  private _nodeResults: Map<string, NodeOutput>;
  private _recentEvents: Map<string, any>;
  private _startTime: number;

  constructor(workflowId: string, executionId: string) {
    this._workflowId = workflowId;
    this._executionId = executionId;
    this._data = new Map();
    this._nodeResults = new Map();
    this._recentEvents = new Map();
    this._startTime = Date.now();

    // 初始化工作流级别的变量
    this._data.set('workflow', {
      id: workflowId,
      executionId: executionId,
      startTime: this._startTime
    });
  }

  /**
   * 获取工作流ID
   */
  get workflowId(): string {
    return this._workflowId;
  }

  /**
   * 获取执行ID
   */
  get executionId(): string {
    return this._executionId;
  }

  /**
   * 获取开始时间
   */
  get startTime(): number {
    return this._startTime;
  }

  /**
   * 设置变量
   * 
   * @param path 变量路径，如 "node.result"
   * @param value 变量值
   */
  setVariable(path: string, value: any): void {
     const parts = path.split('.');
     const key = parts[0];

     if (!key) {
       return;
     }

     if (parts.length === 1) {
       // 简单键值对
       this._data.set(key, value);
     } else {
       // 嵌套路径
       const current = this._data.get(key) || {};
       const nestedValue = this.setNestedValue(current, parts.slice(1), value);
       this._data.set(key, nestedValue);
     }
   }

  /**
   * 获取变量
   * 
   * @param path 变量路径，如 "node.result"
   * @returns 变量值
   */
  getVariable(path: string): any {
     const parts = path.split('.');
     const key = parts[0];

     if (!key) {
       return undefined;
     }

     if (parts.length === 1) {
       return this._data.get(key);
     }

     const current = this._data.get(key);
     if (current === null || current === undefined) {
       return undefined;
     }

     return this.getNestedValue(current, parts.slice(1));
   }

  /**
   * 获取所有数据
   * 
   * @returns 所有数据的对象表示
   */
  getAllData(): Record<string, any> {
    const result: Record<string, any> = {};

    // 转换Map为对象
    for (const [key, value] of this._data.entries()) {
      result[key] = value;
    }

    // 添加节点结果
    result['node'] = {};
    for (const [nodeId, output] of this._nodeResults.entries()) {
      result['node'][nodeId] = {
        success: output.success,
        data: output.data,
        error: output.error
      };
    }

    return result;
  }

  /**
   * 设置节点执行结果
   * 
   * @param nodeId 节点ID
   * @param result 节点输出
   */
  setNodeResult(nodeId: string, result: NodeOutput): void {
    this._nodeResults.set(nodeId, result);

    // 同时设置到数据中，方便访问
    this.setVariable(`node.${nodeId}`, {
      success: result.success,
      data: result.data,
      error: result.error
    });
  }

  /**
   * 获取节点执行结果
   * 
   * @param nodeId 节点ID
   * @returns 节点输出
   */
  getNodeResult(nodeId: string): NodeOutput | undefined {
    return this._nodeResults.get(nodeId);
  }

  /**
   * 获取最近的事件
   * 
   * @param eventType 事件类型
   * @returns 事件数据
   */
  getRecentEvent(eventType: string): any {
    return this._recentEvents.get(eventType);
  }

  /**
   * 设置最近的事件
   * 
   * @param eventType 事件类型
   * @param event 事件数据
   */
  setRecentEvent(eventType: string, event: any): void {
    this._recentEvents.set(eventType, event);
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this._data.clear();
    this._nodeResults.clear();
    this._recentEvents.clear();
  }

  /**
   * 获取执行时长（毫秒）
   * 
   * @returns 执行时长
   */
  getExecutionDuration(): number {
    return Date.now() - this._startTime;
  }

  /**
   * 获取已执行的节点数量
   * 
   * @returns 已执行的节点数量
   */
  getExecutedNodeCount(): number {
    return this._nodeResults.size;
  }

  /**
   * 获取成功的节点数量
   * 
   * @returns 成功的节点数量
   */
  getSuccessNodeCount(): number {
    let count = 0;
    for (const result of this._nodeResults.values()) {
      if (result.success) {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取失败的节点数量
   * 
   * @returns 失败的节点数量
   */
  getFailedNodeCount(): number {
    let count = 0;
    for (const result of this._nodeResults.values()) {
      if (!result.success) {
        count++;
      }
    }
    return count;
  }

  /**
   * 设置嵌套值
   * 
   * @param obj 目标对象
   * @param path 路径数组
   * @param value 值
   * @returns 更新后的对象
   */
  private setNestedValue(obj: any, path: string[], value: any): any {
    if (path.length === 0) {
      return value;
    }

    const key = path[0];
    if (!key) {
      return obj;
    }

    const remaining = path.slice(1);

    if (obj === null || typeof obj !== 'object') {
      obj = {};
    }

    if (remaining.length === 0) {
      obj[key] = value;
    } else {
      obj[key] = this.setNestedValue(obj[key] || {}, remaining, value);
    }

    return obj;
  }

  /**
   * 获取嵌套值
   * 
   * @param obj 目标对象
   * @param path 路径数组
   * @returns 值
   */
  private getNestedValue(obj: any, path: string[]): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (path.length === 0) {
      return obj;
    }

    const key = path[0];
    if (!key) {
      return undefined;
    }

    const remaining = path.slice(1);

    if (key in obj) {
      return this.getNestedValue(obj[key], remaining);
    }

    return undefined;
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    return `ExecutionContext(workflowId=${this._workflowId}, executionId=${this._executionId}, nodes=${this._nodeResults.size})`;
  }
}

/**
 * 创建执行上下文
 * 
 * @param workflowId 工作流ID
 * @param executionId 执行ID
 * @returns 执行上下文实例
 */
export function createExecutionContext(
  workflowId: string,
  executionId: string
): ExecutionContextImpl {
  return new ExecutionContextImpl(workflowId, executionId);
}

/**
 * 生成执行ID
 * 
 * @returns 执行ID
 */
export function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}