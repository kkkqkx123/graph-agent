/**
 * 变量管理器
 * 负责Thread变量的管理
 */

import type { ThreadVariable } from '../../types/thread';

/**
 * 变量管理器
 */
export class VariableManager {
  private threadVariables: Map<string, Map<string, ThreadVariable>> = new Map();

  /**
   * 设置变量
   */
  setVariable(
    threadId: string,
    name: string,
    value: any,
    type: 'number' | 'string' | 'boolean' | 'array' | 'object',
    scope: 'local' | 'global' = 'local',
    readonly: boolean = false
  ): void {
    if (!this.threadVariables.has(threadId)) {
      this.threadVariables.set(threadId, new Map());
    }

    const variables = this.threadVariables.get(threadId)!;
    const existingVariable = variables.get(name);

    // 检查是否为只读变量
    if (existingVariable && existingVariable.readonly) {
      throw new Error(`Variable ${name} is readonly and cannot be modified`);
    }

    const variable: ThreadVariable = {
      name,
      value,
      type,
      scope,
      readonly,
      metadata: existingVariable?.metadata
    };

    variables.set(name, variable);
  }

  /**
   * 获取变量
   */
  getVariable(threadId: string, name: string): any {
    const variables = this.threadVariables.get(threadId);
    if (!variables) {
      return undefined;
    }

    const variable = variables.get(name);
    return variable?.value;
  }

  /**
   * 检查变量是否存在
   */
  hasVariable(threadId: string, name: string): boolean {
    const variables = this.threadVariables.get(threadId);
    if (!variables) {
      return false;
    }

    return variables.has(name);
  }

  /**
   * 删除变量
   */
  deleteVariable(threadId: string, name: string): void {
    const variables = this.threadVariables.get(threadId);
    if (!variables) {
      return;
    }

    const variable = variables.get(name);
    if (variable && variable.readonly) {
      throw new Error(`Variable ${name} is readonly and cannot be deleted`);
    }

    variables.delete(name);
  }

  /**
   * 评估表达式
   * 支持简单的数学和逻辑表达式
   */
  evaluateExpression(threadId: string, expression: string): any {
    const variables = this.threadVariables.get(threadId);
    if (!variables) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    // 创建变量上下文
    const context: Record<string, any> = {};
    for (const [name, variable] of variables.entries()) {
      context[name] = variable.value;
    }

    try {
      // 使用Function构造器安全地评估表达式
      // 只允许访问变量和基本运算
      const func = new Function('context', `
        with (context) {
          return (${expression});
        }
      `);

      return func(context);
    } catch (error) {
      throw new Error(`Failed to evaluate expression "${expression}": ${error}`);
    }
  }

  /**
   * 获取所有变量
   */
  getAllVariables(threadId: string): Record<string, any> {
    const variables = this.threadVariables.get(threadId);
    if (!variables) {
      return {};
    }

    const result: Record<string, any> = {};
    for (const [name, variable] of variables.entries()) {
      result[name] = variable.value;
    }

    return result;
  }

  /**
   * 获取所有变量定义
   */
  getAllVariableDefinitions(threadId: string): ThreadVariable[] {
    const variables = this.threadVariables.get(threadId);
    if (!variables) {
      return [];
    }

    return Array.from(variables.values());
  }

  /**
   * 清空线程的所有变量
   */
  clearVariables(threadId: string): void {
    this.threadVariables.delete(threadId);
  }

  /**
   * 复制变量（用于Fork操作）
   */
  copyVariables(sourceThreadId: string, targetThreadId: string): void {
    const sourceVariables = this.threadVariables.get(sourceThreadId);
    if (!sourceVariables) {
      return;
    }

    const targetVariables = new Map<string, ThreadVariable>();
    for (const [name, variable] of sourceVariables.entries()) {
      // 深拷贝变量值
      targetVariables.set(name, {
        ...variable,
        value: JSON.parse(JSON.stringify(variable.value))
      });
    }

    this.threadVariables.set(targetThreadId, targetVariables);
  }

  /**
   * 合并变量（用于Join操作）
   */
  mergeVariables(sourceThreadIds: string[], targetThreadId: string): void {
    const targetVariables = this.threadVariables.get(targetThreadId);
    if (!targetVariables) {
      this.threadVariables.set(targetThreadId, new Map());
    }

    const mergedVariables = this.threadVariables.get(targetThreadId)!;

    for (const sourceThreadId of sourceThreadIds) {
      const sourceVariables = this.threadVariables.get(sourceThreadId);
      if (!sourceVariables) {
        continue;
      }

      for (const [name, variable] of sourceVariables.entries()) {
        // 如果目标变量不存在或不是只读的，则合并
        const existingVariable = mergedVariables.get(name);
        if (!existingVariable || !existingVariable.readonly) {
          mergedVariables.set(name, {
            ...variable,
            value: JSON.parse(JSON.stringify(variable.value))
          });
        }
      }
    }
  }
}