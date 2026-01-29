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
      thread.globalVariableValues = {};
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

    // 初始化 variableValues 映射（仅包含 local 变量）
    thread.variableValues = {};
    thread.globalVariableValues = {};
    
    for (const variable of thread.variables) {
      if (variable.scope === 'local') {
        thread.variableValues[variable.name] = variable.value;
      } else {
        // global 变量存储在 globalVariableValues 中
        thread.globalVariableValues[variable.name] = variable.value;
      }
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

    // 根据 scope 更新变量值
    if (variableDef.scope === 'local') {
      thread.variableValues[name] = value;
    } else {
      // global 变量更新到 globalVariableValues
      if (!thread.globalVariableValues) {
        thread.globalVariableValues = {};
      }
      thread.globalVariableValues[name] = value;
    }
    
    variableDef.value = value;
  }

  /**
   * 获取变量值
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(threadContext: ThreadContext, name: string): any {
    const thread = threadContext.thread;
    
    // 首先在 local 变量中查找
    if (name in thread.variableValues) {
      return thread.variableValues[name];
    }
    
    // 然后在 global 变量中查找
    if (thread.globalVariableValues && name in thread.globalVariableValues) {
      return thread.globalVariableValues[name];
    }
    
    return undefined;
  }

  /**
   * 检查变量是否存在
   * @param threadContext ThreadContext 实例
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(threadContext: ThreadContext, name: string): boolean {
    const thread = threadContext.thread;
    const inLocal = name in thread.variableValues;
    const inGlobal = thread.globalVariableValues ? name in thread.globalVariableValues : false;
    return inLocal || inGlobal;
  }

  /**
   * 获取所有变量
   * @param threadContext ThreadContext 实例
   * @returns 所有变量的键值对
   */
  getAllVariables(threadContext: ThreadContext): Record<string, any> {
    const thread = threadContext.thread;
    const allVariables = { ...thread.variableValues };
    
    // 合并 global 变量
    if (thread.globalVariableValues) {
      Object.assign(allVariables, thread.globalVariableValues);
    }
    
    return allVariables;
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
    
    // 仅复制 local 变量
    targetThread.variableValues = { ...sourceThread.variableValues };
    
    // global 变量使用引用（共享）
    if (sourceThread.globalVariableValues) {
      targetThread.globalVariableValues = sourceThread.globalVariableValues;
    }
  }

  /**
   * 清空变量
   * @param thread Thread实例
   */
  clearVariables(thread: Thread): void {
    thread.variables = [];
    thread.variableValues = {};
    // 不清除 global 变量，因为它们可能被其他线程共享
  }
  
  /**
   * 获取指定作用域的变量
   * @param threadContext ThreadContext 实例
   * @param scope 变量作用域
   * @returns 指定作用域的变量键值对
   */
  getVariablesByScope(threadContext: ThreadContext, scope: 'local' | 'global'): Record<string, any> {
    const thread = threadContext.thread;
    
    if (scope === 'local') {
      return { ...thread.variableValues };
    } else {
      return thread.globalVariableValues ? { ...thread.globalVariableValues } : {};
    }
  }
  
  /**
   * 初始化全局变量（用于 fork 时共享父线程的全局变量）
   * @param thread Thread 实例
   * @param parentGlobalVariables 父线程的全局变量
   */
  initializeGlobalVariables(thread: Thread, parentGlobalVariables: Record<string, any>): void {
    if (!thread.globalVariableValues) {
      thread.globalVariableValues = {};
    }
    
    // 合并父线程的全局变量
    Object.assign(thread.globalVariableValues, parentGlobalVariables);
  }
}