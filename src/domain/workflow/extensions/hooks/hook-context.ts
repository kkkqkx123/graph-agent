import { ID } from '../../../common/value-objects/id';
import { HookPoint } from '../../value-objects/hook-point';
import { WorkflowState } from '../../state/workflow-state';

/**
 * 钩子上下文接口
 * 
 * 包含钩子执行时需要的所有上下文信息
 */
export interface HookContext {
  /**
   * 钩子点
   */
  hookPoint: HookPoint;

  /**
   * 图ID
   */
  workflowId?: ID;

  /**
   * 节点ID
   */
  nodeId?: string;

  /**
   * 边ID
   */
  edgeId?: string;

  /**
   * 当前状态
   */
  state?: WorkflowState;

  /**
   * 配置信息
   */
  config?: Record<string, unknown>;

  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;

  /**
   * 错误信息
   */
  error?: Error;

  /**
   * 时间戳
   */
  timestamp: Date;

  /**
   * 执行ID
   */
  executionId?: string;

  /**
   * 线程ID
   */
  threadId?: string;

  /**
   * 会话ID
   */
  sessionId?: string;

  /**
   * 用户ID
   */
  userId?: ID;
}

/**
 * 钩子上下文构建器
 * 
 * 用于构建钩子上下文
 */
export class HookContextBuilder {
  private context: Partial<HookContext> = {};

  /**
   * 设置钩子点
   */
  public setHookPoint(hookPoint: HookPoint): HookContextBuilder {
    this.context.hookPoint = hookPoint;
    return this;
  }

  /**
   * 设置图ID
   */
  public setWorkflowId(workflowId: ID): HookContextBuilder {
    this.context.workflowId = workflowId;
    return this;
  }

  /**
   * 设置节点ID
   */
  public setNodeId(nodeId: string): HookContextBuilder {
    this.context.nodeId = nodeId;
    return this;
  }

  /**
   * 设置边ID
   */
  public setEdgeId(edgeId: string): HookContextBuilder {
    this.context.edgeId = edgeId;
    return this;
  }

  /**
   * 设置状态
   */
  public setState(state: WorkflowState): HookContextBuilder {
    this.context.state = state;
    return this;
  }

  /**
   * 设置配置
   */
  public setConfig(config: Record<string, unknown>): HookContextBuilder {
    this.context.config = config;
    return this;
  }

  /**
   * 设置元数据
   */
  public setMetadata(metadata: Record<string, unknown>): HookContextBuilder {
    this.context.metadata = metadata;
    return this;
  }

  /**
   * 设置错误
   */
  public setError(error: Error): HookContextBuilder {
    this.context.error = error;
    return this;
  }

  /**
   * 设置时间戳
   */
  public setTimestamp(timestamp: Date): HookContextBuilder {
    this.context.timestamp = timestamp;
    return this;
  }

  /**
   * 设置执行ID
   */
  public setExecutionId(executionId: string): HookContextBuilder {
    this.context.executionId = executionId;
    return this;
  }

  /**
   * 设置线程ID
   */
  public setThreadId(threadId: string): HookContextBuilder {
    this.context.threadId = threadId;
    return this;
  }

  /**
   * 设置会话ID
   */
  public setSessionId(sessionId: string): HookContextBuilder {
    this.context.sessionId = sessionId;
    return this;
  }

  /**
   * 设置用户ID
   */
  public setUserId(userId: ID): HookContextBuilder {
    this.context.userId = userId;
    return this;
  }

  /**
   * 添加元数据
   */
  public addMetadata(key: string, value: unknown): HookContextBuilder {
    if (!this.context.metadata) {
      this.context.metadata = {};
    }
    this.context.metadata[key] = value;
    return this;
  }

  /**
   * 构建钩子上下文
   */
  public build(): HookContext {
    // 设置默认时间戳
    if (!this.context.timestamp) {
      this.context.timestamp = new Date();
    }

    // 验证必需字段
    if (!this.context.hookPoint) {
      throw new Error('钩子点不能为空');
    }

    return this.context as HookContext;
  }

  /**
   * 从现有上下文创建构建器
   */
  public static from(context: Partial<HookContext>): HookContextBuilder {
    const builder = new HookContextBuilder();
    builder.context = { ...context };
    return builder;
  }

  /**
   * 创建新的钩子上下文
   */
  public static create(hookPoint: HookPoint): HookContextBuilder {
    return new HookContextBuilder().setHookPoint(hookPoint);
  }
}

/**
 * 钩子上下文工具类
 * 
 * 提供钩子上下文的实用方法
 */
export class HookContextUtils {
  /**
   * 创建执行前钩子上下文
   */
  public static createBeforeExecuteContext(
    workflowId: ID,
    nodeId?: string,
    state?: WorkflowState,
    config?: Record<string, unknown>
  ): HookContext {
    const builder = HookContextBuilder
      .create(HookPoint.BEFORE_EXECUTE)
      .setWorkflowId(workflowId);

    if (nodeId) builder.setNodeId(nodeId);
    if (state) builder.setState(state);
    if (config) builder.setConfig(config);

    return builder.build();
  }

  /**
   * 创建执行后钩子上下文
   */
  public static createAfterExecuteContext(
    workflowId: ID,
    nodeId?: string,
    state?: WorkflowState,
    config?: Record<string, unknown>,
    result?: any
  ): HookContext {
    const builder = HookContextBuilder
      .create(HookPoint.AFTER_EXECUTE)
      .setWorkflowId(workflowId);

    if (nodeId) builder.setNodeId(nodeId);
    if (state) builder.setState(state);
    if (config) builder.setConfig(config);
    if (result) builder.addMetadata('result', result);

    return builder.build();
  }

  /**
   * 创建错误钩子上下文
   */
  public static createErrorContext(
    workflowId: ID,
    error: Error,
    nodeId?: string,
    edgeId?: string,
    state?: WorkflowState,
    config?: Record<string, unknown>
  ): HookContext {
    const builder = HookContextBuilder
      .create(HookPoint.ON_ERROR)
      .setWorkflowId(workflowId)
      .setError(error);

    if (nodeId) builder.setNodeId(nodeId);
    if (edgeId) builder.setEdgeId(edgeId);
    if (state) builder.setState(state);
    if (config) builder.setConfig(config);

    return builder.build();
  }

  /**
   * 创建节点执行前钩子上下文
   */
  public static createBeforeNodeExecuteContext(
    workflowId: ID,
    nodeId: string,
    state?: WorkflowState,
    config?: Record<string, unknown>
  ): HookContext {
    const builder = HookContextBuilder
      .create(HookPoint.BEFORE_NODE_EXECUTE)
      .setWorkflowId(workflowId)
      .setNodeId(nodeId);

    if (state) builder.setState(state);
    if (config) builder.setConfig(config);

    return builder.build();
  }

  /**
   * 创建节点执行后钩子上下文
   */
  public static createAfterNodeExecuteContext(
    workflowId: ID,
    nodeId: string,
    state?: WorkflowState,
    config?: Record<string, unknown>,
    result?: any
  ): HookContext {
    const builder = HookContextBuilder
      .create(HookPoint.AFTER_NODE_EXECUTE)
      .setWorkflowId(workflowId)
      .setNodeId(nodeId);

    if (state) builder.setState(state);
    if (config) builder.setConfig(config);
    if (result) builder.addMetadata('result', result);

    return builder.build();
  }

  /**
   * 克隆钩子上下文
   */
  public static clone(context: HookContext): HookContext {
    return HookContextBuilder
      .from(context)
      .setTimestamp(new Date())
      .build();
  }

  /**
   * 检查上下文是否有效
   */
  public static isValid(context: HookContext): boolean {
    return !!(
      context &&
      context.hookPoint &&
      Object.values(HookPoint).includes(context.hookPoint)
    );
  }

  /**
   * 获取上下文摘要
   */
  public static getSummary(context: HookContext): Record<string, unknown> {
    return {
      hookPoint: context.hookPoint,
      workflowId: context.workflowId?.toString(),
      nodeId: context.nodeId,
      edgeId: context.edgeId,
      hasState: !!context.state,
      hasConfig: !!context.config,
      hasMetadata: !!context.metadata,
      hasError: !!context.error,
      timestamp: context.timestamp.toISOString(),
      executionId: context.executionId,
      threadId: context.threadId,
      sessionId: context.sessionId,
      userId: context.userId?.toString()
    };
  }
}