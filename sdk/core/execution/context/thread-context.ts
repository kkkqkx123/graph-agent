/**
 * ThreadContext - Thread 执行上下文
 * 封装 Thread 执行所需的所有运行时组件
 * 提供统一的访问接口，避免直接访问 thread.contextData
 * 负责变量管理、节点执行结果管理等运行时逻辑
 * 支持图导航器用于节点导航
 */

import type { Thread } from '../../../types/thread';
import { WorkflowContext } from './workflow-context';
import { ConversationManager } from '../conversation';
import { VariableManager } from '../managers/variable-manager';
import { GraphNavigator } from '../../graph/graph-navigator';

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
   * 对话管理器
   */
  public readonly conversationManager: ConversationManager;

  /**
   * 变量管理器
   */
  private readonly variableManager: VariableManager;

  /**
   * 图导航器（可选）
   */
  private navigator?: GraphNavigator;

  /**
   * 构造函数
   * @param thread Thread 实例
   * @param workflowContext Workflow 上下文
   * @param conversationManager 对话管理器
   */
  constructor(
    thread: Thread,
    workflowContext: WorkflowContext,
    conversationManager: ConversationManager
  ) {
    this.thread = thread;
    this.workflowContext = workflowContext;
    this.conversationManager = conversationManager;
    this.variableManager = new VariableManager();
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
  getConversationManager(): ConversationManager {
    return this.conversationManager;
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
    return this.variableManager.getVariable(this, name);
  }

  /**
   * 更新已定义变量的值
   * @param name 变量名称
   * @param value 新的变量值
   */
  updateVariable(name: string, value: any): void {
    this.variableManager.updateVariable(this, name, value);
  }

  /**
   * 检查变量是否存在
   * @param name 变量名称
   * @returns 是否存在
   */
  hasVariable(name: string): boolean {
    return this.variableManager.hasVariable(this, name);
  }

  /**
   * 获取所有变量
   * @returns 所有变量值
   */
  getAllVariables(): Record<string, any> {
    return this.variableManager.getAllVariables(this);
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

  /**
   * 获取图导航器
   * @returns 图导航器实例，如果未设置则返回undefined
   */
  getNavigator(): GraphNavigator | undefined {
    return this.navigator;
  }

  /**
   * 设置图导航器
   * @param navigator 图导航器实例
   */
  setNavigator(navigator: GraphNavigator): void {
    this.navigator = navigator;
  }

  /**
   * 检查是否有图导航器
   * @returns 是否有图导航器
   */
  hasNavigator(): boolean {
    return this.navigator !== undefined;
  }
}