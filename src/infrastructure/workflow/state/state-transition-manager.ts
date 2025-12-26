import { ID } from '@domain/common/value-objects/id';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { NodeId } from '@domain/workflow/value-objects/node-id';
import { EdgeValueObject } from '@domain/workflow/value-objects/edge-value-object';
import { ExecutionState } from '@domain/workflow/entities/execution-state';
import { NodeExecutionState } from '@domain/workflow/entities/node-execution-state';
import { PromptContext } from '@domain/workflow/value-objects/prompt-context';
import { ExecutionStatus } from '@domain/workflow/value-objects/execution-status';
import { NodeRouter } from '../routing/node-router';
import { RouteDecision, NodeExecutionResult } from '@domain/workflow/entities';

/**
 * 状态转换配置接口
 */
export interface StateTransitionConfig {
  /** 是否更新上下文 */
  updateContext?: boolean;
  /** 是否传播提示词 */
  propagatePrompt?: boolean;
  /** 是否合并节点结果 */
  mergeNodeResult?: boolean;
  /** 自定义变量映射 */
  variableMapping?: Map<string, string>;
}

/**
 * 状态转换结果接口
 */
export interface StateTransitionResult {
  /** 是否成功 */
  success: boolean;
  /** 转换前的状态 */
  previousState: ExecutionState;
  /** 转换后的状态 */
  newState: ExecutionState;
  /** 路由决策 */
  routeDecision: RouteDecision;
  /** 错误信息 */
  error?: string;
  /** 转换元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 状态转换管理器
 *
 * 负责管理节点执行后的状态转换，包括更新节点状态、上下文和工作流状态
 */
export class StateTransitionManager {
  private nodeRouter: NodeRouter;

  /**
   * 构造函数
   * @param nodeRouter 节点路由器
   */
  constructor(nodeRouter?: NodeRouter) {
    this.nodeRouter = nodeRouter || new NodeRouter();
  }

  /**
   * 执行状态转换
   * @param nodeId 节点ID
   * @param result 节点执行结果
   * @param executionState 执行状态
   * @param workflow 工作流
   * @param config 转换配置
   * @returns 转换结果
   */
  public async transition(
    nodeId: NodeId,
    result: unknown,
    executionState: ExecutionState,
    workflow: any,
    config: StateTransitionConfig = {}
  ): Promise<StateTransitionResult> {
    const previousState = executionState;

    try {
      // 1. 更新节点状态
      await this.updateNodeState(nodeId, result, executionState);

      // 2. 创建节点执行结果
      const nodeState = executionState.getNodeState(nodeId);
      const nodeResult: NodeExecutionResult = {
        status: nodeState?.status || (result instanceof Error ? { isFailed: () => true, isSuccess: () => false } as any : { isFailed: () => false, isSuccess: () => true } as any),
        result: result instanceof Error ? undefined : result,
        error: result instanceof Error ? result : undefined,
        executionTime: nodeState?.duration || 0,
        metadata: {}
      };

      // 3. 使用新的route接口进行路由决策
      const routeDecision = await this.nodeRouter.route(
        nodeId,
        nodeResult,
        executionState,
        workflow
      );

      // 4. 更新工作流状态
      await this.updateWorkflowState(executionState, routeDecision);

      // 5. 应用状态更新
      if (routeDecision.stateUpdates) {
        for (const [key, value] of Object.entries(routeDecision.stateUpdates)) {
          executionState.setVariable(key, value);
        }
      }

      // 6. 更新上下文（如果配置）
      if (config.updateContext !== false) {
        await this.updateContext(nodeId, result, executionState, config);
      }

      // 7. 传播提示词（如果配置）
      if (config.propagatePrompt !== false) {
        await this.propagatePrompt(nodeId, result, executionState);
      }

      // 8. 合并节点结果（如果配置）
      if (config.mergeNodeResult !== false) {
        await this.mergeNodeResult(nodeId, result, executionState);
      }

      // 9. 设置当前节点
      if (routeDecision.nextNodeIds.length > 0) {
        const nextNodeId = routeDecision.nextNodeIds[0];
        if (nextNodeId) {
          executionState.workflowState.setCurrentNode(nextNodeId);
        }
      }

      return {
        success: true,
        previousState,
        newState: executionState,
        routeDecision,
        metadata: {
          nodeId: nodeId.toString(),
          nextNodeCount: routeDecision.nextNodeIds.length,
          satisfiedEdgesCount: routeDecision.satisfiedEdges.length
        }
      };
    } catch (error) {
      return {
        success: false,
        previousState,
        newState: executionState,
        routeDecision: {
          nextNodeIds: [],
          satisfiedEdges: [],
          unsatisfiedEdges: [],
          stateUpdates: {},
          metadata: { reason: 'transition_failed' }
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 更新节点状态
   * @param nodeId 节点ID
   * @param result 执行结果
   * @param executionState 执行状态
   */
  private async updateNodeState(
    nodeId: NodeId,
    result: unknown,
    executionState: ExecutionState
  ): Promise<void> {
    const nodeState = executionState.getNodeState(nodeId);

    if (!nodeState) {
      throw new Error(`节点状态不存在: ${nodeId.toString()}`);
    }

    // 根据结果类型更新节点状态
    if (result instanceof Error) {
      nodeState.fail(result);
    } else {
      nodeState.complete(result);
    }

    executionState.updateNodeState(nodeState);
  }

  /**
   * 更新工作流状态
   * @param executionState 执行状态
   * @param routeDecision 路由决策
   */
  private async updateWorkflowState(
    executionState: ExecutionState,
    routeDecision: RouteDecision
  ): Promise<void> {
    const workflowState = executionState.workflowState;

    // 如果没有下一个节点，标记工作流完成
    if (routeDecision.nextNodeIds.length === 0) {
      workflowState.complete();
    }
  }

  /**
   * 更新上下文
   * @param nodeId 节点ID
   * @param result 执行结果
   * @param executionState 执行状态
   * @param config 转换配置
   */
  private async updateContext(
    nodeId: NodeId,
    result: unknown,
    executionState: ExecutionState,
    config: StateTransitionConfig
  ): Promise<void> {
    // 应用变量映射
    if (config.variableMapping) {
      for (const [targetKey, sourcePath] of config.variableMapping.entries()) {
        const value = this.getNestedValue(result, sourcePath);
        if (value !== undefined) {
          executionState.setVariable(targetKey, value);
        }
      }
    }

    // 添加节点结果到上下文
    executionState.setVariable(`${nodeId.toString()}.result`, result);
  }

  /**
   * 传播提示词
   * @param nodeId 节点ID
   * @param result 执行结果
   * @param executionState 执行状态
   */
  private async propagatePrompt(
    nodeId: NodeId,
    result: unknown,
    executionState: ExecutionState
  ): Promise<void> {
    // 如果结果包含提示词响应，添加到历史记录
    if (result && typeof result === 'object') {
      const resultObj = result as Record<string, unknown>;

      if (resultObj['prompt'] && resultObj['response']) {
        const promptContext = executionState.promptContext;
        const newPromptContext = promptContext.addHistoryEntry({
          nodeId: nodeId.toString(),
          prompt: String(resultObj['prompt']),
          response: resultObj['response'] ? String(resultObj['response']) : undefined,
          timestamp: new Date(),
          metadata: resultObj['metadata'] as Record<string, unknown>
        });
        executionState.updatePromptContext(newPromptContext);
      }
    }
  }

  /**
   * 合并节点结果
   * @param nodeId 节点ID
   * @param result 执行结果
   * @param executionState 执行状态
   */
  private async mergeNodeResult(
    nodeId: NodeId,
    result: unknown,
    executionState: ExecutionState
  ): Promise<void> {
    // 将节点结果添加到执行历史
    const executionStep = {
      stepId: ID.generate().toString(),
      nodeId,
      name: `节点执行: ${nodeId.toString()}`,
      startTime: Timestamp.now(),
      status: result instanceof Error ? ExecutionStatus.failed() : ExecutionStatus.completed(),
      input: executionState.getVariable(`${nodeId.toString()}.input`),
      output: result,
      error: result instanceof Error ? result : undefined
    };

    executionState.addExecutionStep(executionStep);
  }

  /**
   * 获取嵌套值
   * @param obj 对象
   * @param path 路径
   * @returns 值
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 批量状态转换
   * @param transitions 转换数组
   * @param executionState 执行状态
   * @param workflow 工作流
   * @param config 转换配置
   * @returns 转换结果数组
   */
  public async transitionBatch(
    transitions: Array<{ nodeId: NodeId; result: unknown }>,
    executionState: ExecutionState,
    workflow: any,
    config: StateTransitionConfig = {}
  ): Promise<StateTransitionResult[]> {
    const results: StateTransitionResult[] = [];

    for (const transition of transitions) {
      const result = await this.transition(
        transition.nodeId,
        transition.result,
        executionState,
        workflow,
        config
      );
      results.push(result);

      // 如果转换失败，停止后续转换
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * 获取节点路由器
   * @returns 节点路由器
   */
  public getNodeRouter(): NodeRouter {
    return this.nodeRouter;
  }

  /**
   * 设置节点路由器
   * @param nodeRouter 节点路由器
   */
  public setNodeRouter(nodeRouter: NodeRouter): void {
    this.nodeRouter = nodeRouter;
  }
}