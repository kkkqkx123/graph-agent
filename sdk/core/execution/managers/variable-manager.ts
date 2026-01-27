/**
 * VariableManager - 变量管理器
 * 负责Thread变量的管理，包括变量的初始化、更新、查询
 * 变量定义来源于 WorkflowDefinition，运行时只能更新已定义的变量值
 */

import type { Thread, ThreadVariable } from '../../../types/thread';
import type { WorkflowDefinition, WorkflowVariable } from '../../../types/workflow';
import type { ThreadContext } from '../context/thread-context';

/**
 * VariableManager - 变量管理器
 */
export class VariableManager {
  /**
   * 从 WorkflowDefinition 初始化 Thread 变量
   * @param thread Thread 实例
   * @param workflow WorkflowDefinition 实例
   */
  initializeFromWorkflow(thread: Thread, workflow: WorkflowDefinition): void {
    if (!workflow.variables || workflow.variables.length === 0) {
      thread.variables = [];
      thread.variableValues = {};
      return;
    }

    // 从 WorkflowVariable 创建 ThreadVariable
    thread.variables = workflow.variables.map((v: WorkflowVariable): ThreadVariable => ({
      name: v.name,
      value: v.defaultValue,
      type: v.type,
      scope: v.scope || 'local',
      readonly: v.readonly || false,
      metadata: {
        description: v.description,
        required: v.required
      }
    }));

    // 初始化 variableValues 映射
    thread.variableValues = {};
    for (const variable of thread.variables) {
      thread.variableValues[variable.name] = variable.value;
    }
  }

  /**
   * 更新已定义变量的值
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @param value 新的变量值
   */
  updateVariable(threadContext: ThreadContext, name: string, value: any): void {
    const thread = threadContext.thread;

    // 检查变量是否已定义
    const variableDef = thread.variables.find(v => v.name === name);
    if (!variableDef) {
      throw new Error(`Variable '${name}' is not defined in workflow. Variables must be defined in WorkflowDefinition.`);
    }

    // 检查是否为只读变量
    if (variableDef.readonly) {
      throw new Error(`Variable '${name}' is readonly and cannot be modified`);
    }

    // 类型检查
    if (!this.validateType(value, variableDef.type)) {
      throw new Error(`Type mismatch for variable '${name}'. Expected ${variableDef.type}, got ${typeof value}`);
    }

    // 更新变量值
    thread.variableValues[name] = value;
    variableDef.value = value;
  }

  /**
   * 获取变量值
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(threadContext: ThreadContext, name: string): any {
    return threadContext.thread.variableValues[name];
  }

  /**
   * 检查变量是否存在
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(threadContext: ThreadContext, name: string): boolean {
    return name in threadContext.thread.variableValues;
  }

  /**
   * 获取所有变量
   * @param threadContext ThreadContext 实例
   * @returns 所有变量的键值对
   */
  getAllVariables(threadContext: ThreadContext): Record<string, any> {
    return { ...threadContext.thread.variableValues };
  }

  /**
   * 验证变量类型
   * @param value 变量值
   * @param expectedType 期望的类型
   * @returns 是否匹配
   */
  private validateType(value: any, expectedType: string): boolean {
    const actualType = typeof value;

    switch (expectedType) {
      case 'number':
        return actualType === 'number' && !isNaN(value);
      case 'string':
        return actualType === 'string';
      case 'boolean':
        return actualType === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return actualType === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * 复制变量
   * @param sourceThread 源Thread
   * @param targetThread 目标Thread
   */
  copyVariables(sourceThread: Thread, targetThread: Thread): void {
    targetThread.variables = sourceThread.variables.map((v: ThreadVariable) => ({ ...v }));
    targetThread.variableValues = { ...sourceThread.variableValues };
  }

  /**
   * 清空变量
   * @param thread Thread实例
   */
  clearVariables(thread: Thread): void {
    thread.variables = [];
    thread.variableValues = {};
  }
}