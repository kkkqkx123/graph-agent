/**
 * 执行上下文
 * 提供执行时所需的上下文信息
 */

import type { Thread } from '../../types/thread';
import type { WorkflowDefinition } from '../../types/workflow';
import { WorkflowContext } from './workflow-context';
import { ThreadStateManager } from './thread-state-manager';

/**
 * 执行上下文
 * 提供工作流执行时的统一上下文接口
 */
export class ExecutionContext {
  public readonly workflowContext: WorkflowContext;
  public readonly threadStateManager: ThreadStateManager;
  public readonly threadId: string;

  constructor(
    workflow: WorkflowDefinition,
    threadId: string,
    threadStateManager: ThreadStateManager
  ) {
    this.workflowContext = new WorkflowContext(workflow);
    this.threadStateManager = threadStateManager;
    this.threadId = threadId;
  }

  /**
   * 获取 Thread
   */
  getThread(): Thread {
    const thread = this.threadStateManager.getThread(this.threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${this.threadId}`);
    }
    return thread;
  }

  /**
   * 设置变量
   * @param name 变量名称
   * @param value 变量值
   * @param type 变量类型
   * @param scope 变量作用域
   * @param readonly 是否只读
   */
  setVariable(
    name: string,
    value: any,
    type: 'number' | 'string' | 'boolean' | 'array' | 'object',
    scope: 'local' | 'global' = 'local',
    readonly: boolean = false
  ): void {
    // 直接使用Thread的setVariable方法
    const thread = this.getThread();
    thread.setVariable(name, value, type, scope, readonly);
  }

  /**
   * 获取变量
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(name: string): any {
    const thread = this.getThread();
    return thread.getVariable(name);
  }

  /**
   * 获取变量值（支持路径访问）
   * @param path 变量路径，支持嵌套访问，如 "output.data.items[0].name"
   * @returns 变量值
   */
  getVariableValue(path: string): any {
    const thread = this.getThread();
    const parts = path.split('.');
    let value: any = thread;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }

      // 处理数组索引访问，如 items[0]
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch && arrayMatch[1] && arrayMatch[2]) {
        const arrayName = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        value = value[arrayName];
        if (Array.isArray(value)) {
          value = value[index];
        }
      } else {
        value = value[part];
      }
    }

    return value;
  }

  /**
   * 检查变量是否存在
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(name: string): boolean {
    const thread = this.getThread();
    return thread.hasVariable(name);
  }

  /**
   * 删除变量
   * @param name 变量名称
   */
  deleteVariable(name: string): void {
    // 直接使用Thread的deleteVariable方法
    const thread = this.getThread();
    thread.deleteVariable(name);
  }

  /**
   * 获取所有变量
   * @returns 所有变量值
   */
  getAllVariables(): Record<string, any> {
    const thread = this.getThread();
    return thread.getAllVariables();
  }

  /**
   * 获取输入数据
   * @returns 输入数据
   */
  getInput(): Record<string, any> {
    const thread = this.getThread();
    return thread.input;
  }

  /**
   * 获取输出数据
   * @returns 输出数据
   */
  getOutput(): Record<string, any> {
    const thread = this.getThread();
    return thread.output;
  }

  /**
   * 设置输出数据
   * @param output 输出数据
   */
  setOutput(output: Record<string, any>): void {
    const thread = this.getThread();
    thread.output = output;
  }

  /**
   * 获取节点执行结果
   * @param nodeId 节点ID
   * @returns 节点执行结果
   */
  getNodeResult(nodeId: string): any {
    const thread = this.getThread();
    return thread.nodeResults.find(result => result.nodeId === nodeId);
  }

  /**
   * 获取工作流定义
   * @returns 工作流定义
   */
  getWorkflow(): WorkflowDefinition {
    return this.workflowContext.getWorkflow();
  }

  /**
   * 获取节点
   * @param nodeId 节点ID
   * @returns 节点定义
   */
  getNode(nodeId: string) {
    return this.workflowContext.getNode(nodeId);
  }

  /**
   * 获取边的出边
   * @param nodeId 节点ID
   * @returns 出边数组
   */
  getOutgoingEdges(nodeId: string) {
    return this.workflowContext.getOutgoingEdges(nodeId);
  }

  /**
   * 获取边的入边
   * @param nodeId 节点ID
   * @returns 入边数组
   */
  getIncomingEdges(nodeId: string) {
    return this.workflowContext.getIncomingEdges(nodeId);
  }
}