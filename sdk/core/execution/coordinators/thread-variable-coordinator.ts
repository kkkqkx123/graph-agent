/**
 * Thread 变量协调器
 * 负责协调 Thread 变量的设置和查询操作
 *
 * 核心职责：
 * 1. 协调 Thread 变量的设置
 * 2. 协调 Thread 变量的查询
 * 3. 处理变量作用域管理
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 封装 VariableManager 的复杂操作
 */

import type { ThreadContext } from '../context/thread-context';
import { VariableManager } from '../managers/variable-manager';

/**
 * Thread 变量协调器类
 *
 * 职责：
 * - 协调 Thread 变量的设置和查询操作
 * - 处理变量作用域管理
 * - 提供统一的变量访问接口
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 封装 VariableManager 的复杂操作
 */
export class ThreadVariableCoordinator {
  constructor(private variableManager: VariableManager = new VariableManager()) {}

  /**
   * 设置 Thread 变量
   *
   * @param threadContext Thread 上下文
   * @param variables 变量对象
   */
  async setVariables(threadContext: ThreadContext, variables: Record<string, any>): Promise<void> {
    // 使用 ThreadContext 的 updateVariable 方法更新已定义的变量
    for (const [name, value] of Object.entries(variables)) {
      threadContext.updateVariable(name, value);
    }
  }

  /**
   * 获取 Thread 变量
   *
   * @param threadContext Thread 上下文
   * @returns 所有变量值
   */
  getVariables(threadContext: ThreadContext): Record<string, any> {
    return threadContext.getAllVariables();
  }

  /**
   * 获取单个变量值
   *
   * @param threadContext Thread 上下文
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(threadContext: ThreadContext, name: string): any {
    return threadContext.getVariable(name);
  }

  /**
   * 检查变量是否存在
   *
   * @param threadContext Thread 上下文
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(threadContext: ThreadContext, name: string): boolean {
    return threadContext.hasVariable(name);
  }

  /**
   * 获取 VariableManager 实例
   *
   * @returns VariableManager 实例
   */
  getVariableManager(): VariableManager {
    return this.variableManager;
  }
}