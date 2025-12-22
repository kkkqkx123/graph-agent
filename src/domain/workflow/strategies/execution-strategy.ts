import { ID } from '../../common/value-objects/id';
import { Node } from '../entities/nodes/base/node';
import { Edge } from '../entities/edges/base/edge';
import { ExecutionContext, ExecutionResult, ExecutionStatus } from '../execution';

/**
 * 执行步骤接口
 */
export interface ExecutionStep {
  /** 步骤ID */
  readonly stepId: string;
  /** 节点ID */
  readonly nodeId: ID;
  /** 节点 */
  readonly node: Node;
  /** 依赖节点ID列表 */
  readonly dependencies: ID[];
  /** 优先级 */
  readonly priority?: number;
  /** 执行步骤 */
  execute(context: ExecutionContext): Promise<any>;
  /** 验证步骤 */
  validate(): void;
}

/**
 * 执行策略接口
 * 
 * 定义不同的工作流执行策略，支持串行、并行、条件等执行模式
 */
export interface ExecutionStrategy {
  /**
   * 执行策略名称
   */
  readonly name: string;

  /**
   * 执行策略类型
   */
  readonly type: ExecutionStrategyType;

  /**
   * 执行策略描述
   */
  readonly description: string;

  /**
   * 执行工作流
   * @param nodes 节点映射
   * @param edges 边映射
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(
    nodes: Map<string, Node>,
    edges: Map<string, Edge>,
    context: ExecutionContext
  ): Promise<ExecutionResult>;

  /**
   * 获取执行步骤
   * @param nodes 节点映射
   * @param edges 边映射
   * @returns 执行步骤列表
   */
  getExecutionSteps(nodes: Map<string, Node>, edges: Map<string, Edge>): ExecutionStep[];

  /**
   * 暂停执行
   */
  pause(): void;

  /**
   * 恢复执行
   */
  resume(): void;

  /**
   * 取消执行
   */
  cancel(): void;

  /**
   * 验证策略配置
   */
  validate(): void;
}

/**
 * 执行策略类型枚举
 */
export enum ExecutionStrategyType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  CUSTOM = 'custom'
}

/**
 * 串行执行策略
 * 
 * 按照节点定义的顺序依次执行，适合简单的线性工作流
 */
export class SequentialExecutionStrategy implements ExecutionStrategy {
  readonly name = 'Sequential Execution';
  readonly type = ExecutionStrategyType.SEQUENTIAL;
  readonly description = '按照节点定义的顺序依次执行';

  private isPaused = false;
  private isCancelled = false;

  async execute(
    nodes: Map<string, Node>,
    edges: Map<string, Edge>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executedNodes: Record<string, any>[] = [];
    let successfulNodes = 0;
    let failedNodes = 0;
    let skippedNodes = 0;
    let retries = 0;
    let steps: ExecutionStep[] = [];

    try {
      // 获取执行步骤
      steps = this.getExecutionSteps(nodes, edges);

      // 按顺序执行每个步骤
      for (const step of steps) {
        // 检查是否暂停或取消
        if (this.isPaused) {
          await this.waitForResume();
        }

        if (this.isCancelled) {
          return {
            executionId: context.executionId,
            status: ExecutionStatus.CANCELLED,
            statistics: {
              totalTime: Date.now() - startTime,
              nodeExecutionTime: 0,
              successfulNodes,
              failedNodes,
              skippedNodes,
              retries
            }
          };
        }

        // 执行步骤
        const stepStartTime = Date.now();
        try {
          const result = await step.execute(context);
          const stepEndTime = Date.now();

          executedNodes.push({
            nodeId: step.nodeId.toString(),
            result,
            executionTime: stepEndTime - stepStartTime,
            status: 'success'
          });

          successfulNodes++;

          // 更新上下文
          context.setVariable(`node_${step.nodeId}`, result);

        } catch (error) {
          const stepEndTime = Date.now();

          executedNodes.push({
            nodeId: step.nodeId.toString(),
            error: error instanceof Error ? error.message : String(error),
            executionTime: stepEndTime - stepStartTime,
            status: 'failure'
          });

          failedNodes++;

          // 如果是关键错误，停止执行
          throw error;
        }
      }

      const endTime = Date.now();

      return {
        executionId: context.executionId,
        status: ExecutionStatus.COMPLETED,
        data: {
          executedNodes,
          summary: {
            total: steps.length,
            successful: successfulNodes,
            failed: failedNodes,
            skipped: skippedNodes
          }
        },
        statistics: {
          totalTime: endTime - startTime,
          nodeExecutionTime: endTime - startTime,
          successfulNodes,
          failedNodes,
          skippedNodes,
          retries
        }
      };

    } catch (error) {
      const endTime = Date.now();

      return {
        executionId: context.executionId,
        status: ExecutionStatus.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          executedNodes,
          summary: {
            total: steps.length,
            successful: successfulNodes,
            failed: failedNodes + 1, // 包含当前失败的节点
            skipped: skippedNodes
          }
        },
        statistics: {
          totalTime: endTime - startTime,
          nodeExecutionTime: endTime - startTime,
          successfulNodes,
          failedNodes: failedNodes + 1,
          skippedNodes,
          retries
        }
      };
    }
  }

  getExecutionSteps(nodes: Map<string, Node>, edges: Map<string, Edge>): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const visited = new Set<string>();
    const startNodes = this.findStartNodes(nodes);

    // 使用拓扑排序确定执行顺序
    const sortedNodes = this.topologicalSort(nodes, edges, startNodes);

    for (const node of sortedNodes) {
      if (!visited.has(node.nodeId.toString())) {
        steps.push(new SequentialExecutionStep(
          node.nodeId.toString(),
          node,
          this.getNodeDependencies(node, edges)
        ));
        visited.add(node.nodeId.toString());
      }
    }

    return steps;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  cancel(): void {
    this.isCancelled = true;
  }

  validate(): void {
    // 验证串行执行策略的配置
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('执行策略名称不能为空');
    }

    if (this.type !== ExecutionStrategyType.SEQUENTIAL) {
      throw new Error('执行策略类型不匹配');
    }
  }

  /**
   * 查找开始节点
   */
  private findStartNodes(nodes: Map<string, Node>): Node[] {
    const startNodes: Node[] = [];

    for (const node of nodes.values()) {
      if (node.type.isStart()) {
        startNodes.push(node);
      }
    }

    if (startNodes.length === 0) {
      throw new Error('工作流必须至少有一个开始节点');
    }

    if (startNodes.length > 1) {
      throw new Error('串行工作流只能有一个开始节点');
    }

    return startNodes;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(
    nodes: Map<string, Node>,
    edges: Map<string, Edge>,
    startNodes: Node[]
  ): Node[] {
    const sorted: Node[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: Node) => {
      const nodeId = node.nodeId.toString();

      if (visiting.has(nodeId)) {
        throw new Error('检测到循环依赖');
      }

      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);

      // 获取依赖节点
      const dependencies = this.getNodeDependencies(node, edges);
      for (const depId of dependencies) {
        const depNode = nodes.get(depId.toString());
        if (depNode) {
          visit(depNode);
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      sorted.push(node);
    };

    // 从开始节点开始遍历
    for (const startNode of startNodes) {
      visit(startNode);
    }

    // 确保所有节点都被访问到
    for (const node of nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        visit(node);
      }
    }

    return sorted;
  }

  /**
   * 获取节点依赖
   */
  private getNodeDependencies(node: Node, edges: Map<string, Edge>): ID[] {
    const dependencies: ID[] = [];

    for (const edge of edges.values()) {
      if (edge.toNodeId.equals(node.nodeId)) {
        dependencies.push(edge.fromNodeId);
      }
    }

    return dependencies;
  }

  /**
   * 等待恢复
   */
  private async waitForResume(): Promise<void> {
    while (this.isPaused && !this.isCancelled) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * 串行执行步骤实现
 */
export class SequentialExecutionStep implements ExecutionStep {
  constructor(
    public readonly stepId: string,
    public readonly node: Node,
    public readonly dependencies: ID[],
    public readonly priority: number = 0
  ) {}

  get nodeId(): ID {
    return this.node.nodeId;
  }

  async execute(context: ExecutionContext): Promise<any> {
    // 执行节点逻辑 - 获取节点属性并执行处理
    // 节点的实际执行逻辑应在应用层service中处理
    return {
      nodeId: this.node.nodeId.toString(),
      name: this.node.name,
      properties: this.node.properties,
      result: null
    };
  }

  validate(): void {
    if (!this.nodeId) {
      throw new Error('执行步骤缺少节点ID');
    }

    if (!this.node) {
      throw new Error('执行步骤缺少节点');
    }

    this.node.validate();
  }
}

/**
 * 并行执行策略
 * 
 * 允许多个节点同时执行，适合并行处理场景
 */
export class ParallelExecutionStrategy implements ExecutionStrategy {
  readonly name = 'Parallel Execution';
  readonly type = ExecutionStrategyType.PARALLEL;
  readonly description = '允许多个节点同时执行';

  private isPaused = false;
  private isCancelled = false;
  private maxConcurrency = 5;

  constructor(maxConcurrency?: number) {
    if (maxConcurrency) {
      this.maxConcurrency = maxConcurrency;
    }
  }

  async execute(
    nodes: Map<string, Node>,
    edges: Map<string, Edge>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executedNodes: Record<string, any>[] = [];
    let successfulNodes = 0;
    let failedNodes = 0;
    let skippedNodes = 0;
    let retries = 0;
    let steps: ExecutionStep[] = [];

    try {
      // 获取执行步骤
      steps = this.getExecutionSteps(nodes, edges);

      // 按优先级分组
      const priorityGroups = this.groupByPriority(steps);

      // 并行执行每个优先级组
      for (const [priority, groupSteps] of priorityGroups) {
        if (this.isCancelled) {
          break;
        }

        // 等待暂停恢复
        if (this.isPaused) {
          await this.waitForResume();
        }

        // 并行执行当前优先级组
        const results = await this.executeParallel(groupSteps, context);

        // 处理结果
        for (const result of results) {
          executedNodes.push(result);

          if (result['status'] === 'success') {
            successfulNodes++;
          } else if (result['status'] === 'failure') {
            failedNodes++;

            // 如果是关键错误，停止执行
            if (result['isCritical']) {
              throw new Error(result['error']);
            }
          } else {
            skippedNodes++;
          }
        }

        // 如果有失败的节点且不是关键错误，继续执行
        if (failedNodes > 0 && !this.shouldStopOnError(context)) {
          continue;
        }

        if (failedNodes > 0) {
          break;
        }
      }

      const endTime = Date.now();

      return {
        executionId: context.executionId,
        status: failedNodes > 0 ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
        data: {
          executedNodes,
          summary: {
            total: steps.length,
            successful: successfulNodes,
            failed: failedNodes,
            skipped: skippedNodes
          }
        },
        statistics: {
          totalTime: endTime - startTime,
          nodeExecutionTime: endTime - startTime,
          successfulNodes,
          failedNodes,
          skippedNodes,
          retries
        }
      };

    } catch (error) {
      const endTime = Date.now();

      return {
        executionId: context.executionId,
        status: ExecutionStatus.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          executedNodes,
          summary: {
            total: steps.length,
            successful: successfulNodes,
            failed: failedNodes + 1,
            skipped: skippedNodes
          }
        },
        statistics: {
          totalTime: endTime - startTime,
          nodeExecutionTime: endTime - startTime,
          successfulNodes,
          failedNodes: failedNodes + 1,
          skippedNodes,
          retries
        }
      };
    }
  }

  getExecutionSteps(nodes: Map<string, Node>, edges: Map<string, Edge>): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const visited = new Set<string>();

    // 找到所有可以并行执行的节点
    const parallelGroups = this.findParallelGroups(nodes, edges);

    for (const group of parallelGroups) {
      for (const node of group) {
        if (!visited.has(node.nodeId.toString())) {
          steps.push(new ParallelExecutionStep(
            node.nodeId.toString(),
            node,
            this.getNodeDependencies(node, edges),
            this.calculatePriority(node)
          ));
          visited.add(node.nodeId.toString());
        }
      }
    }

    return steps;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  cancel(): void {
    this.isCancelled = true;
  }

  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('执行策略名称不能为空');
    }

    if (this.type !== ExecutionStrategyType.PARALLEL) {
      throw new Error('执行策略类型不匹配');
    }

    if (this.maxConcurrency <= 0) {
      throw new Error('最大并发数必须大于0');
    }
  }

  /**
   * 查找并行组
   */
  private findParallelGroups(nodes: Map<string, Node>, edges: Map<string, Edge>): Node[][] {
    const groups: Node[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    // 计算入度
    for (const node of nodes.values()) {
      inDegree.set(node.nodeId.toString(), 0);
    }

    for (const edge of edges.values()) {
      const toNodeId = edge.toNodeId.toString();
      inDegree.set(toNodeId, (inDegree.get(toNodeId) || 0) + 1);
    }

    // 找到入度为0的节点（开始节点）
    const startNodes: Node[] = [];
    for (const node of nodes.values()) {
      if ((inDegree.get(node.nodeId.toString()) || 0) === 0) {
        startNodes.push(node);
      }
    }

    // 按层级分组
    let currentLevel = [...startNodes];

    while (currentLevel.length > 0) {
      groups.push([...currentLevel]);

      const nextLevel: Node[] = [];
      const nextLevelIds = new Set<string>();

      for (const node of currentLevel) {
        // 找到该节点的所有后继节点
        for (const edge of edges.values()) {
          if (edge.fromNodeId.equals(node.nodeId)) {
            const successorId = edge.toNodeId.toString();
            if (!visited.has(successorId) && !nextLevelIds.has(successorId)) {
              const successor = nodes.get(successorId);
              if (successor) {
                // 检查是否所有前驱节点都已访问
                const allPredecessorsVisited = this.checkAllPredecessorsVisited(
                  successor,
                  edges,
                  visited
                );

                if (allPredecessorsVisited) {
                  nextLevel.push(successor);
                  nextLevelIds.add(successorId);
                }
              }
            }
          }
        }

        visited.add(node.nodeId.toString());
      }

      currentLevel = nextLevel;
    }

    return groups;
  }

  /**
   * 按优先级分组
   */
  private groupByPriority(steps: ExecutionStep[]): Map<number, ExecutionStep[]> {
    const groups = new Map<number, ExecutionStep[]>();

    for (const step of steps) {
      const priority = step.priority || 0;
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      groups.get(priority)!.push(step);
    }

    return groups;
  }

  /**
   * 并行执行步骤组
   */
  private async executeParallel(
    steps: ExecutionStep[],
    context: ExecutionContext
  ): Promise<Record<string, any>[]> {
    const results: Record<string, any>[] = [];

    // 使用Promise.all并行执行
    const promises = steps.map(async (step) => {
      try {
        const result = await step.execute(context);
        return {
          nodeId: step.nodeId.toString(),
          result,
          status: 'success',
          isCritical: false
        };
      } catch (error) {
        return {
          nodeId: step.nodeId.toString(),
          error: error instanceof Error ? error.message : String(error),
          status: 'failure',
          isCritical: true
        };
      }
    });

    const stepResults = await Promise.all(promises);

    return stepResults;
  }

  /**
   * 计算节点优先级
   */
  private calculatePriority(node: Node): number {
    // 基于节点类型和配置计算优先级
    if (node.type.isStart()) {
      return 0;
    }

    if (node.type.isEnd()) {
      return 100;
    }

    return 50; // 默认优先级
  }

  /**
   * 检查是否应在错误时停止
   */
  private shouldStopOnError(context: ExecutionContext): boolean {
    return context.config?.errorHandling === 'fail-fast';
  }

  /**
   * 检查所有前驱节点是否已访问
   */
  private checkAllPredecessorsVisited(
    node: Node,
    edges: Map<string, Edge>,
    visited: Set<string>
  ): boolean {
    for (const edge of edges.values()) {
      if (edge.toNodeId.equals(node.nodeId)) {
        if (!visited.has(edge.fromNodeId.toString())) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 获取节点依赖
   */
  private getNodeDependencies(node: Node, edges: Map<string, Edge>): ID[] {
    const dependencies: ID[] = [];

    for (const edge of edges.values()) {
      if (edge.toNodeId.equals(node.nodeId)) {
        dependencies.push(edge.fromNodeId);
      }
    }

    return dependencies;
  }

  /**
   * 等待恢复
   */
  private async waitForResume(): Promise<void> {
    while (this.isPaused && !this.isCancelled) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * 并行执行步骤实现
 */
export class ParallelExecutionStep implements ExecutionStep {
  constructor(
    public readonly stepId: string,
    public readonly node: Node,
    public readonly dependencies: ID[],
    public readonly priority: number = 0
  ) {}

  get nodeId(): ID {
    return this.node.nodeId;
  }

  async execute(context: ExecutionContext): Promise<any> {
    // 执行节点逻辑 - 获取节点属性并执行处理
    // 节点的实际执行逻辑应在应用层service中处理
    return {
      nodeId: this.node.nodeId.toString(),
      name: this.node.name,
      properties: this.node.properties,
      result: null
    };
  }

  validate(): void {
    if (!this.nodeId) {
      throw new Error('执行步骤缺少节点ID');
    }

    if (!this.node) {
      throw new Error('执行步骤缺少节点');
    }

    this.node.validate();
  }
}

/**
 * 执行策略工厂
 */
export class ExecutionStrategyFactory {
  /**
   * 创建执行策略
   */
  static create(
    type: ExecutionStrategyType,
    options?: Record<string, any>
  ): ExecutionStrategy {
    switch (type) {
      case ExecutionStrategyType.SEQUENTIAL:
        return new SequentialExecutionStrategy();

      case ExecutionStrategyType.PARALLEL:
        return new ParallelExecutionStrategy(options?.['maxConcurrency']);

      // TODO: 实现其他执行策略
      // case ExecutionStrategyType.CONDITIONAL:
      //   return new ConditionalExecutionStrategy();

      // case ExecutionStrategyType.LOOP:
      //   return new LoopExecutionStrategy();

      // case ExecutionStrategyType.CUSTOM:
      //   return new CustomExecutionStrategy(options);

      default:
        throw new Error(`不支持执行策略类型: ${type}`);
    }
  }

  /**
   * 创建默认执行策略
   */
  static default(): ExecutionStrategy {
    return new SequentialExecutionStrategy();
  }
}