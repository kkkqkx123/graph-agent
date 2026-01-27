/**
 * VariableManager - 变量管理器
 * 负责Thread变量的管理，包括变量的创建、更新、删除、查询
 */

import type { Thread, ThreadVariable } from '../../../types/thread';

/**
 * VariableManager - 变量管理器
 */
export class VariableManager {
  /**
   * 为Thread对象附加变量管理方法
   * @param thread Thread实例
   */
  attachVariableMethods(thread: Thread): void {
    /**
     * 获取变量值
     * @param name 变量名称
     * @returns 变量值
     */
    thread.getVariable = function (name: string): any {
      return this.variableValues[name];
    };

    /**
     * 设置变量值
     * @param name 变量名称
     * @param value 变量值
     * @param type 变量类型
     * @param scope 变量作用域
     * @param readonly 是否只读
     */
    thread.setVariable = function (
      name: string,
      value: any,
      type: 'number' | 'string' | 'boolean' | 'array' | 'object' = typeof value as any,
      scope: 'local' | 'global' = 'local',
      readonly: boolean = false
    ): void {
      // 检查是否为只读变量
      const existingVar = this.variables.find(v => v.name === name);
      if (existingVar && existingVar.readonly) {
        throw new Error(`Variable ${name} is readonly and cannot be modified`);
      }

      // 更新variableValues
      this.variableValues[name] = value;

      // 更新variables数组
      if (existingVar) {
        existingVar.value = value;
        existingVar.type = type;
      } else {
        this.variables.push({
          name,
          value,
          type,
          scope,
          readonly
        });
      }
    };

    /**
     * 检查变量是否存在
     * @param name 变量名称
     * @returns 是否存在
     */
    thread.hasVariable = function (name: string): boolean {
      return name in this.variableValues;
    };

    /**
     * 删除变量
     * @param name 变量名称
     */
    thread.deleteVariable = function (name: string): void {
      const existingVar = this.variables.find(v => v.name === name);
      if (existingVar && existingVar.readonly) {
        throw new Error(`Variable ${name} is readonly and cannot be deleted`);
      }

      delete this.variableValues[name];
      const index = this.variables.findIndex(v => v.name === name);
      if (index !== -1) {
        this.variables.splice(index, 1);
      }
    };

    /**
     * 获取所有变量
     * @returns 所有变量的键值对
     */
    thread.getAllVariables = function (): Record<string, any> {
      return { ...this.variableValues };
    };
  }

  /**
   * 初始化Thread的变量数据结构
   * @param thread Thread实例
   */
  initializeVariables(thread: Thread): void {
    if (!thread.variables) {
      thread.variables = [];
    }
    if (!thread.variableValues) {
      thread.variableValues = {};
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