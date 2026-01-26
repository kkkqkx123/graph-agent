/**
 * ThreadContext - Thread 执行上下文
 * 封装 Thread 执行所需的所有运行时组件
 * 提供统一的访问接口，避免直接访问 thread.contextData
 */

import type { Thread } from '../../types/thread';
import { WorkflowContext } from './workflow-context';
import { LLMExecutor } from './llm-executor';

/**
 * ThreadContext - Thread 执行上下文
 */
export class ThreadContext {
  /**
   * Thread 实例
   */
  public readonly thread: Thread;

  /**
   * Workflow 上下文
   */
  public readonly workflowContext: WorkflowContext;

  /**
   * LLM 执行器
   */
  public readonly llmExecutor: LLMExecutor;

  /**
   * 构造函数
   * @param thread Thread 实例
   * @param workflowContext Workflow 上下文
   * @param llmExecutor LLM 执行器
   */
  constructor(
    thread: Thread,
    workflowContext: WorkflowContext,
    llmExecutor: LLMExecutor
  ) {
    this.thread = thread;
    this.workflowContext = workflowContext;
    this.llmExecutor = llmExecutor;
  }

  /**
   * 获取 Thread ID
   * @returns Thread ID
   */
  getThreadId(): string {
    return this.thread.id;
  }

  /**
   * 获取 Workflow ID
   * @returns Workflow ID
   */
  getWorkflowId(): string {
    return this.thread.workflowId;
  }

  /**
   * 获取 Thread 状态
   * @returns Thread 状态
   */
  getStatus(): string {
    return this.thread.status;
  }

  /**
   * 获取当前节点 ID
   * @returns 当前节点 ID
   */
  getCurrentNodeId(): string {
    return this.thread.currentNodeId;
  }

  /**
   * 设置当前节点 ID
   * @param nodeId 节点 ID
   */
  setCurrentNodeId(nodeId: string): void {
    this.thread.currentNodeId = nodeId;
  }

  /**
   * 获取 Thread 输入
   * @returns Thread 输入
   */
  getInput(): Record<string, any> {
    return this.thread.input;
  }

  /**
   * 获取 Thread 输出
   * @returns Thread 输出
   */
  getOutput(): Record<string, any> {
    return this.thread.output;
  }

  /**
   * 设置 Thread 输出
   * @param output 输出数据
   */
  setOutput(output: Record<string, any>): void {
    this.thread.output = output;
  }

  /**
   * 获取 ConversationManager
   * @returns ConversationManager 实例
   */
  getConversationManager() {
    return this.llmExecutor.getConversationManager();
  }

  /**
   * 获取 LLMExecutor
   * @returns LLMExecutor 实例
   */
  getLLMExecutor(): LLMExecutor {
    return this.llmExecutor;
  }

  /**
   * 获取 WorkflowContext
   * @returns WorkflowContext 实例
   */
  getWorkflowContext(): WorkflowContext {
    return this.workflowContext;
  }

  /**
   * 获取 Thread 元数据
   * @returns Thread 元数据
   */
  getMetadata(): any {
    return this.thread.metadata;
  }

  /**
   * 设置 Thread 元数据
   * @param metadata 元数据
   */
  setMetadata(metadata: any): void {
    this.thread.metadata = metadata;
  }

  /**
   * 获取 Thread 变量值
   * @param name 变量名称
   * @returns 变量值
   */
  getVariable(name: string): any {
    return this.thread.getVariable(name);
  }

  /**
   * 设置 Thread 变量值
   * @param name 变量名称
   * @param value 变量值
   * @param type 变量类型
   * @param scope 变量作用域
   * @param readonly 是否只读
   */
  setVariable(
    name: string,
    value: any,
    type?: 'number' | 'string' | 'boolean' | 'array' | 'object',
    scope?: 'local' | 'global',
    readonly?: boolean
  ): void {
    this.thread.setVariable(name, value, type, scope, readonly);
  }

  /**
   * 检查变量是否存在
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(name: string): boolean {
    return this.thread.hasVariable(name);
  }

  /**
   * 删除变量
   * @param name 变量名称
   */
  deleteVariable(name: string): void {
    this.thread.deleteVariable(name);
  }

  /**
   * 获取所有变量
   * @returns 所有变量值
   */
  getAllVariables(): Record<string, any> {
    return this.thread.getAllVariables();
  }

  /**
   * 添加节点执行结果
   * @param result 节点执行结果
   */
  addNodeResult(result: any): void {
    this.thread.nodeResults.push(result);
  }

  /**
   * 获取节点执行结果
   * @returns 节点执行结果数组
   */
  getNodeResults(): any[] {
    return this.thread.nodeResults;
  }

  /**
   * 添加错误信息
   * @param error 错误信息
   */
  addError(error: any): void {
    this.thread.errors.push(error);
  }

  /**
   * 获取错误信息
   * @returns 错误信息数组
   */
  getErrors(): any[] {
    return this.thread.errors;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  getStartTime(): number {
    return this.thread.startTime;
  }

  /**
   * 获取结束时间
   * @returns 结束时间
   */
  getEndTime(): number | undefined {
    return this.thread.endTime;
  }

  /**
   * 设置结束时间
   * @param endTime 结束时间
   */
  setEndTime(endTime: number): void {
    this.thread.endTime = endTime;
  }
}