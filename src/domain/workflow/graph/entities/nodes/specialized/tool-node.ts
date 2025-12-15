import { Node, NodeProps, NodePosition } from '@domain/workflow/graph/entities/nodes/base/node';
import { ID } from '@domain/common/value-objects/id';
import { NodeType } from '@domain/workflow/graph/value-objects/node-type';
import { WorkflowState } from '@domain/workflow/graph/entities/workflow-state';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { Version } from '@domain/common/value-objects/version';
import { DomainError } from '@domain/common/errors/domain-error';

/**
 * 工具调用接口
 */
export interface ToolNodeToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timeout?: number;
  retryCount?: number;
}

/**
 * 工具执行结果接口
 */
export interface ToolNodeExecutionResult {
  toolName: string;
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
  startTime: Date;
  endTime: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 工具节点属性接口
 */
export interface ToolNodeProps extends NodeProps {
  timeout?: number;
  maxParallelCalls?: number;
  continueOnError?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  toolCallStrategy?: 'sequential' | 'parallel' | 'conditional';
}

/**
 * 工具节点实体
 * 
 * 表示执行工具调用的节点
 */
export class ToolNode extends Node {
  private readonly toolProps: ToolNodeProps;

  protected constructor(props: ToolNodeProps) {
    super(props);
    this.toolProps = Object.freeze(props);
  }

  /**
   * 创建工具节点
   */
  public static override create(
    graphId: ID,
    type: NodeType,
    name?: string,
    description?: string,
    position?: NodePosition,
    properties?: Record<string, unknown>,
    options?: {
      timeout?: number;
      maxParallelCalls?: number;
      continueOnError?: boolean;
      retryOnFailure?: boolean;
      maxRetries?: number;
      retryDelay?: number;
      toolCallStrategy?: 'sequential' | 'parallel' | 'conditional';
    }
  ): ToolNode {
    const now = Timestamp.now();
    const nodeId = ID.generate();

    const nodeProps: NodeProps = {
      id: nodeId,
      graphId,
      type,
      name,
      description,
      position,
      properties: properties || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const props: ToolNodeProps = {
      ...nodeProps,
      timeout: options?.timeout ?? 30,
      maxParallelCalls: options?.maxParallelCalls ?? 1,
      continueOnError: options?.continueOnError ?? true,
      retryOnFailure: options?.retryOnFailure ?? false,
      maxRetries: options?.maxRetries ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      toolCallStrategy: options?.toolCallStrategy ?? 'sequential'
    };

    return new ToolNode(props);
  }

  /**
   * 从已有属性重建工具节点
   */
  public static override fromProps(props: ToolNodeProps): ToolNode {
    return new ToolNode(props);
  }

  /**
   * 获取超时时间
   */
  public get timeout(): number {
    return this.toolProps.timeout ?? 30;
  }

  /**
   * 获取最大并行调用数
   */
  public get maxParallelCalls(): number {
    return this.toolProps.maxParallelCalls ?? 1;
  }

  /**
   * 获取遇到错误时是否继续
   */
  public get continueOnError(): boolean {
    return this.toolProps.continueOnError ?? true;
  }

  /**
   * 获取失败时是否重试
   */
  public get retryOnFailure(): boolean {
    return this.toolProps.retryOnFailure ?? false;
  }

  /**
   * 获取最大重试次数
   */
  public get maxRetries(): number {
    return this.toolProps.maxRetries ?? 3;
  }

  /**
   * 获取重试延迟
   */
  public get retryDelay(): number {
    return this.toolProps.retryDelay ?? 1000;
  }

  /**
   * 获取工具调用策略
   */
  public get toolCallStrategy(): 'sequential' | 'parallel' | 'conditional' {
    return this.toolProps.toolCallStrategy ?? 'sequential';
  }

  /**
   * 设置超时时间
   */
  public setTimeout(timeout: number): ToolNode {
    if (timeout <= 0) {
      throw new DomainError('超时时间必须大于0');
    }
    return new ToolNode({
      ...this.toolProps,
      timeout,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置最大并行调用数
   */
  public setMaxParallelCalls(maxParallelCalls: number): ToolNode {
    if (maxParallelCalls <= 0) {
      throw new DomainError('最大并行调用数必须大于0');
    }
    return new ToolNode({
      ...this.toolProps,
      maxParallelCalls,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置遇到错误时是否继续
   */
  public setContinueOnError(continueOnError: boolean): ToolNode {
    return new ToolNode({
      ...this.toolProps,
      continueOnError,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置失败时是否重试
   */
  public setRetryOnFailure(retryOnFailure: boolean): ToolNode {
    return new ToolNode({
      ...this.toolProps,
      retryOnFailure,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置最大重试次数
   */
  public setMaxRetries(maxRetries: number): ToolNode {
    if (maxRetries < 0) {
      throw new DomainError('最大重试次数不能为负数');
    }
    return new ToolNode({
      ...this.toolProps,
      maxRetries,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置重试延迟
   */
  public setRetryDelay(retryDelay: number): ToolNode {
    if (retryDelay < 0) {
      throw new DomainError('重试延迟不能为负数');
    }
    return new ToolNode({
      ...this.toolProps,
      retryDelay,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置工具调用策略
   */
  public setToolCallStrategy(strategy: 'sequential' | 'parallel' | 'conditional'): ToolNode {
    return new ToolNode({
      ...this.toolProps,
      toolCallStrategy: strategy,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 提取工具调用
   */
  public extractToolCalls(state: WorkflowState): ToolNodeToolCall[] {
    const toolCalls: ToolNodeToolCall[] = [];

    // 从最后一条消息中提取工具调用
    const messages = state.getData('messages') as any[] || [];
    if (messages.length === 0) {
      return toolCalls;
    }

    const lastMessage = messages[messages.length - 1];

    // 处理不同格式的工具调用
    if (lastMessage.tool_calls) {
      // OpenAI格式
      for (const toolCall of lastMessage.tool_calls) {
        const parsedCall = this.parseToolCall(toolCall);
        if (parsedCall) {
          toolCalls.push(parsedCall);
        }
      }
    } else if (lastMessage.toolCalls) {
      // 自定义格式
      for (const toolCall of lastMessage.toolCalls) {
        const parsedCall = this.parseToolCall(toolCall);
        if (parsedCall) {
          toolCalls.push(parsedCall);
        }
      }
    }

    return toolCalls;
  }

  /**
   * 解析工具调用
   */
  private parseToolCall(toolCall: any): ToolNodeToolCall | null {
    try {
      let name: string;
      let args: Record<string, unknown>;
      let id: string;

      if (toolCall.function) {
        // OpenAI格式
        name = toolCall.function.name;
        args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        id = toolCall.id;
      } else {
        // 自定义格式
        name = toolCall.name;
        args = toolCall.arguments || {};
        id = toolCall.id || this.generateToolCallId();
      }

      if (!name) {
        return null;
      }

      return {
        id,
        name,
        arguments: args,
        timeout: this.timeout,
        retryCount: 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 生成工具调用ID
   */
  private generateToolCallId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 执行工具调用
   */
  public async executeToolCall(
    toolCall: ToolNodeToolCall,
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<ToolNodeExecutionResult> {
    const startTime = new Date();

    try {
      const output = await this.executeWithTimeout(
        toolExecutor(toolCall.name, toolCall.arguments),
        toolCall.timeout || this.timeout
      );

      return {
        toolName: toolCall.name,
        success: true,
        output,
        executionTime: Date.now() - startTime.getTime(),
        startTime,
        endTime: new Date()
      };
    } catch (error) {
      return {
        toolName: toolCall.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime.getTime(),
        startTime,
        endTime: new Date()
      };
    }
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`工具执行超时 (${timeoutMs}ms)`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 执行工具调用（带重试）
   */
  public async executeToolCallWithRetry(
    toolCall: ToolNodeToolCall,
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<ToolNodeExecutionResult> {
    let lastResult: ToolNodeExecutionResult | null = null;
    let retryCount = 0;

    while (retryCount <= (this.maxRetries || 0)) {
      const result = await this.executeToolCall(toolCall, toolExecutor);

      if (result.success || !this.retryOnFailure) {
        return result;
      }

      lastResult = result;
      retryCount++;

      if (retryCount <= this.maxRetries) {
        // 等待重试延迟
        await this.delay(this.retryDelay * retryCount);
      }
    }

    return lastResult || {
      toolName: toolCall.name,
      success: false,
      error: '重试次数已用尽',
      executionTime: 0,
      startTime: new Date(),
      endTime: new Date()
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 执行所有工具调用
   */
  public async executeAllToolCalls(
    toolCalls: ToolNodeToolCall[],
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<ToolNodeExecutionResult[]> {
    if (this.toolCallStrategy === 'parallel') {
      return this.executeToolCallsParallel(toolCalls, toolExecutor);
    } else {
      return this.executeToolCallsSequential(toolCalls, toolExecutor);
    }
  }

  /**
   * 顺序执行工具调用
   */
  private async executeToolCallsSequential(
    toolCalls: ToolNodeToolCall[],
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<ToolNodeExecutionResult[]> {
    const results: ToolNodeExecutionResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeToolCallWithRetry(toolCall, toolExecutor);
      results.push(result);

      // 如果执行失败且不继续执行，则停止
      if (!result.success && !this.continueOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * 并行执行工具调用
   */
  private async executeToolCallsParallel(
    toolCalls: ToolNodeToolCall[],
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<ToolNodeExecutionResult[]> {
    const maxParallel = Math.min(this.maxParallelCalls, toolCalls.length);
    const results: ToolNodeExecutionResult[] = [];

    // 分批执行
    for (let i = 0; i < toolCalls.length; i += maxParallel) {
      const batch = toolCalls.slice(i, i + maxParallel);
      const batchPromises = batch.map(toolCall =>
        this.executeToolCallWithRetry(toolCall, toolExecutor)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 如果有失败且不继续执行，则停止
      const hasFailure = batchResults.some((result: ToolNodeExecutionResult) => !result.success);
      if (hasFailure && !this.continueOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * 处理工具执行结果
   */
  public processToolResults(
    results: ToolNodeExecutionResult[],
    state: WorkflowState
  ): WorkflowState {
    // 获取现有的工具结果
    const existingResults = state.getData('toolResults') as ToolNodeExecutionResult[] || [];

    // 添加新的结果
    const allResults = [...existingResults, ...results];

    // 更新状态
    return state.setData('toolResults', allResults);
  }

  /**
   * 获取工具执行统计
   */
  public getToolExecutionStats(results: ToolNodeExecutionResult[]): {
    total: number;
    successful: number;
    failed: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = total > 0 ? totalExecutionTime / total : 0;

    return {
      total,
      successful,
      failed,
      totalExecutionTime,
      averageExecutionTime
    };
  }

  /**
   * 验证工具节点
   */
  public validateToolNode(): string[] {
    const errors: string[] = [];

    if (this.timeout <= 0) {
      errors.push('超时时间必须大于0');
    }

    if (this.maxParallelCalls <= 0) {
      errors.push('最大并行调用数必须大于0');
    }

    if (this.maxRetries < 0) {
      errors.push('最大重试次数不能为负数');
    }

    if (this.retryDelay < 0) {
      errors.push('重试延迟不能为负数');
    }

    if (!['sequential', 'parallel', 'conditional'].includes(this.toolCallStrategy)) {
      errors.push('无效的工具调用策略');
    }

    return errors;
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    super.validate();

    const toolErrors = this.validateToolNode();
    if (toolErrors.length > 0) {
      throw new DomainError(`工具节点验证失败: ${toolErrors.join(', ')}`);
    }
  }
}