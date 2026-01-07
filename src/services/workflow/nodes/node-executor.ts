import { injectable, inject } from 'inversify';
import { Node, NodeExecutionResult } from '../../../domain/workflow/entities/node';
import { WorkflowExecutionContext } from '../../../domain/workflow/entities/node';
import { ILogger } from '../../../domain/common/types/logger-types';
import { SubgraphNode } from './subgraph/subgraph-node';
import { Thread } from '../../../domain/threads/entities/thread';
import { TYPES } from '../../../di/service-keys';
import { ThreadExecution } from '../../threads/thread-execution';
import { NodeType } from '../../../domain/workflow/value-objects/node/node-type';

/**
 * 节点执行器接口
 *
 * 定义了节点执行的标准契约，包括执行、验证和类型支持
 */
export interface INodeExecutor {
  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(node: Node, context: any): Promise<any>;

  /**
   * 验证节点是否可以执行
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  canExecute(node: Node, context: any): Promise<boolean>;

  /**
   * 获取执行器支持的节点类型
   * @returns 支持的节点类型列表
   */
  getSupportedNodeTypes(): string[];
}

/**
 * 节点执行选项接口
 */
export interface NodeExecutionOptions {
  /** 执行超时时间（毫秒），默认30000 */
  timeout?: number;
  /** 最大重试次数，默认0 */
  maxRetries?: number;
  /** 重试延迟（毫秒），默认1000 */
  retryDelay?: number;
  /** 是否启用详细日志，默认false */
  verboseLogging?: boolean;
}

/**
 * 节点执行器
 * 直接执行节点实例，无需通过函数注册表
 * 支持超时、重试和错误处理
 */
@injectable()
export class NodeExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject(TYPES.ThreadExecutionService) private readonly threadExecutionService: ThreadExecutionService
  ) {}

  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    node: Node,
    context: WorkflowExecutionContext,
    options: NodeExecutionOptions = {}
  ): Promise<NodeExecutionResult> {
    const { timeout = 30000, maxRetries = 0, retryDelay = 1000, verboseLogging = false } = options;

    this.logger.debug('开始执行节点', {
      nodeId: node.nodeId.toString(),
      nodeType: node.type.toString(),
      nodeName: node.name,
      timeout,
      maxRetries,
    });

    try {
      // 验证节点配置
      const validation = node.validate();
      if (!validation.valid) {
        this.logger.warn('节点配置验证失败', {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          errors: validation.errors,
        });

        return {
          success: false,
          error: `节点配置验证失败: ${validation.errors.join(', ')}`,
          metadata: {
            nodeId: node.nodeId.toString(),
            nodeType: node.type.toString(),
            validationErrors: validation.errors,
          },
        };
      }

      // 识别节点类型并执行
      let result: NodeExecutionResult;
      
      if (node.type.isSubworkflow()) {
        // 子工作流节点，从上下文获取 SubgraphNode 配置并调用 ThreadService 执行
        result = await this.executeSubgraphNode(node, context, options);
      } else {
        // 普通节点，正常执行
        result = await this.executeWithRetryAndTimeout(
          () => node.execute(context),
          timeout,
          maxRetries,
          retryDelay,
          node.nodeId.toString(),
          node.type.toString()
        );
      }

      if (verboseLogging) {
        this.logger.info('节点执行完成', {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          success: result.success,
          executionTime: result.executionTime,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString(),
        errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 执行子工作流节点
   * @param node 子工作流节点（Node 类型，但类型为 subworkflow）
   * @param context 执行上下文
   * @param options 执行选项
   * @returns 执行结果
   */
  private async executeSubgraphNode(
    node: Node,
    context: WorkflowExecutionContext,
    options: NodeExecutionOptions
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('开始执行子工作流节点', {
        nodeId: node.nodeId.toString(),
      });

      // 1. 从上下文获取 SubgraphNode 配置
      const subgraphNode = context.getService<SubgraphNode>('SubgraphNode');
      if (!subgraphNode) {
        throw new Error('SubgraphNode 配置不可用');
      }

      // 2. 获取父 Thread
      const parentThread = context.getService<Thread>('Thread');
      if (!parentThread) {
        throw new Error('Thread 服务不可用');
      }

      // 3. 调用 Thread 层的子工作流执行能力
      const subWorkflowResult = await this.threadExecutionService.executeSubWorkflow(
        parentThread,
        subgraphNode.getReferenceId(),
        subgraphNode.getConfig(),
        context
      );

      const executionTime = Date.now() - startTime;

      return {
        success: subWorkflowResult.status === 'completed',
        output: {
          message: '子工作流执行完成',
          referenceId: subgraphNode.getReferenceId(),
          outputs: subWorkflowResult.output,
          subWorkflowResult: subWorkflowResult,
        },
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          referenceId: subgraphNode.getReferenceId(),
          subWorkflowExecutionId: subWorkflowResult.threadId.toString(),
          status: subWorkflowResult.status,
        },
      };
      
    } catch (error) {
      return this.handleSubgraphExecutionError(node, error, startTime, context);
    }
  }

  /**
   * 处理子工作流节点执行错误
   * @param node 子工作流节点
   * @param error 错误对象
   * @param startTime 开始时间
   * @param context 执行上下文
   * @returns 执行结果
   */
  private handleSubgraphExecutionError(
    node: Node,
    error: any,
    startTime: number,
    context: WorkflowExecutionContext
  ): NodeExecutionResult {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.logger.error('子工作流节点执行失败', error instanceof Error ? error : new Error(String(error)), {
      nodeId: node.nodeId.toString(),
    });

    // 从上下文获取 SubgraphNode 配置
    const subgraphNode = context.getService<SubgraphNode>('SubgraphNode');
    if (!subgraphNode) {
      throw error;
    }

    // 根据配置决定错误处理策略
    const config = subgraphNode.getConfig();
    const errorHandling = config.errorHandling || { strategy: 'propagate' as const };

    switch (errorHandling.strategy) {
      case 'propagate':
        throw error;

      case 'catch':
        return {
          success: false,
          error: errorMessage,
          output: errorHandling.fallbackValue,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            nodeType: node.type.toString(),
            referenceId: subgraphNode.getReferenceId(),
            errorStrategy: 'catch',
          },
        };

      case 'ignore':
        return {
          success: true,
          output: errorHandling.fallbackValue,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            nodeType: node.type.toString(),
            referenceId: subgraphNode.getReferenceId(),
            errorStrategy: 'ignore',
          },
        };
    }
  }

  /**
   * 验证节点是否可以执行
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  async canExecute(node: Node, context: WorkflowExecutionContext): Promise<boolean> {
    return node.canExecute();
  }

  /**
   * 获取执行器支持的节点类型
   * @returns 支持的节点类型列表
   */
  getSupportedNodeTypes(): string[] {
    return ['llm', 'tool', 'condition', 'task', 'data-transform', 'subworkflow'];
  }

  /**
   * 批量执行节点
   * @param nodes 节点列表
   * @param context 执行上下文
   * @param options 执行选项
   * @returns 执行结果列表
   */
  async executeBatch(
    nodes: Node[],
    context: WorkflowExecutionContext,
    options: NodeExecutionOptions = {}
  ): Promise<NodeExecutionResult[]> {
    const results: NodeExecutionResult[] = [];

    for (const node of nodes) {
      const result = await this.execute(node, context, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 执行带超时和重试的操作
   * @param fn 要执行的函数
   * @param timeoutMs 超时时间（毫秒）
   * @param maxRetries 最大重试次数
   * @param retryDelayMs 重试延迟（毫秒）
   * @param nodeId 节点ID（用于日志）
   * @param nodeType 节点类型（用于日志）
   * @returns 执行结果
   */
  private async executeWithRetryAndTimeout<T extends NodeExecutionResult>(
    fn: () => Promise<T>,
    timeoutMs: number,
    maxRetries: number,
    retryDelayMs: number,
    nodeId: string,
    nodeType: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 带超时执行
        const result = await this.executeWithTimeout<T>(
          fn(),
          timeoutMs,
          `节点 ${nodeId} 执行超时（${timeoutMs}ms）`
        );

        // 如果成功，返回结果
        if (result.success) {
          return result;
        }

        // 如果执行失败但不是超时错误，记录错误并准备重试
        if (attempt < maxRetries) {
          this.logger.warn(`节点执行失败，准备重试 (${attempt + 1}/${maxRetries})`, {
            nodeId,
            nodeType,
            error: result.error,
          });
          await this.sleep(retryDelayMs * (attempt + 1)); // 指数退避
        } else {
          // 最后一次尝试失败，返回结果
          return result;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          this.logger.warn(`节点执行异常，准备重试 (${attempt + 1}/${maxRetries})`, {
            nodeId,
            nodeType,
            error: lastError.message,
          });
          await this.sleep(retryDelayMs * (attempt + 1)); // 指数退避
        } else {
          // 最后一次尝试失败，抛出异常
          throw lastError;
        }
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw lastError || new Error('节点执行失败');
  }

  /**
   * 执行带超时的操作
   * @param promise 要执行的 Promise
   * @param timeoutMs 超时时间（毫秒）
   * @param timeoutMessage 超时消息
   * @returns 执行结果
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 延迟执行
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
