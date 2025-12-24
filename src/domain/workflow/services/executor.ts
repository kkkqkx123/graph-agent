import { ID } from '../../common/value-objects/id';
import { DomainError } from '../../common/errors/domain-error';
import { WorkflowDefinition, ExecutionDefinition } from '../entities/workflow-definition';
import { WorkflowGraph } from '../entities/workflow-graph';
import { IExecutionContext, ExecutionResult, ExecutionStatus } from '../execution';
import { GraphValidationService } from '../interfaces/graph-validation-service.interface';

/**
 * Workflow执行器配置
 */
export interface WorkflowExecutorConfig {
  readonly maxExecutionTime?: number;
  readonly maxRetries?: number;
  readonly enableDebug?: boolean;
  readonly enableMetrics?: boolean;
}

/**
 * Workflow执行器
 * 
 * 负责执行逻辑：
 * 1. 执行工作流
 * 2. 管理执行策略、参数映射、错误处理
 * 3. 处理执行动作（暂停、恢复、取消等）
 */
export class WorkflowExecutor {
  private readonly workflowDefinition: WorkflowDefinition;
  private readonly workflowGraph: WorkflowGraph;
  private readonly config: WorkflowExecutorConfig;
  private readonly graphValidationService: GraphValidationService;

  /**
   * 构造函数
   * @param workflowDefinition 工作流定义
   * @param workflowGraph 工作流图
   * @param config 执行器配置
   */
  constructor(
    workflowDefinition: WorkflowDefinition,
    workflowGraph: WorkflowGraph,
    graphValidationService: GraphValidationService,
    config: WorkflowExecutorConfig = {}
  ) {
    this.workflowDefinition = workflowDefinition;
    this.workflowGraph = workflowGraph;
    this.graphValidationService = graphValidationService;
    this.config = config;

    // 验证工作流定义和图属于同一个工作流
    if (!workflowDefinition.workflowId.equals(workflowGraph.workflowId)) {
      throw new DomainError('工作流定义和图不属于同一个工作流');
    }
  }

  /**
   * 执行工作流
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async execute(context: IExecutionContext): Promise<ExecutionResult> {
    try {
      // 1. 验证执行条件
      this.validateExecutionConditions(context);

      // 2. 直接使用原始上下文（不再需要参数映射）
      const mappedContext = context;

      // 3. 执行编排策略
      const result = await this.workflowDefinition.executionStrategy.execute(
        this.workflowGraph.nodes,
        this.workflowGraph.edges,
        mappedContext
      );

      // 4. 返回执行结果
      return {
        executionId: context.executionId,
        status: 'completed' as ExecutionStatus,
        data: result,
        statistics: {
          totalTime: Date.now() - context.startTime.getMilliseconds(),
          nodeExecutionTime: 0, // 由执行策略填充
          successfulNodes: 0,   // 由执行策略填充
          failedNodes: 0,      // 由执行策略填充
          skippedNodes: 0,     // 由执行策略填充
          retries: 0           // 由执行策略填充
        }
      };
    } catch (error) {
      // 应用错误处理策略
      return await this.workflowDefinition.errorHandlingStrategy.handleError(
        error as Error,
        context,
        this.workflowDefinition.executionStrategy
      );
    }
  }

  /**
   * 获取执行定义（供执行器使用）
   * @returns 执行定义
   */
  public getExecutionDefinition(): ExecutionDefinition {
    return {
      structure: {
        nodes: this.workflowGraph.nodes,
        edges: this.workflowGraph.edges
      },
      business: {
        config: this.workflowDefinition.config,
        errorHandling: this.workflowDefinition.errorHandlingStrategy,
        execution: this.workflowDefinition.executionStrategy
      },
      metadata: {
        workflowId: this.workflowDefinition.workflowId,
        workflowType: this.workflowDefinition.type,
        workflowName: this.workflowDefinition.name,
        tags: this.workflowDefinition.tags
      }
    };
  }

  /**
   * 处理执行动作
   * @param action 执行动作
   */
  public handleExecutionAction(action: ExecutionAction): void {
    switch (action) {
      case 'pause':
        this.handlePause();
        break;
      case 'resume':
        this.handleResume();
        break;
      case 'cancel':
        this.handleCancel();
        break;
      case 'validate':
        this.handleValidate();
        break;
    }
  }

  /**
   * 获取执行步骤
   * @returns 执行步骤列表
   */
  public getExecutionSteps(): ExecutionStep[] {
    return this.workflowDefinition.executionStrategy.getExecutionSteps(
      this.workflowGraph.nodes,
      this.workflowGraph.edges
    );
  }

  /**
   * 验证执行条件
   * @param context 执行上下文
   */
  private validateExecutionConditions(context: IExecutionContext): void {
    // 验证工作流状态
    if (!this.workflowDefinition.status.canExecute()) {
      throw new DomainError(`工作流当前状态不允许执行: ${this.workflowDefinition.status}`);
    }

    // 验证工作流结构
    const structureResult = this.graphValidationService.validateGraphStructure(this.workflowGraph);
    if (!structureResult.valid) {
      throw new DomainError(`图结构验证失败: ${structureResult.errors.join(', ')}`);
    }

    // 验证执行上下文
    if (!context.executionId) {
      throw new DomainError('执行上下文缺少执行ID');
    }

    if (!context.workflowId || !context.workflowId.equals(this.workflowDefinition.workflowId)) {
      throw new DomainError('执行上下文中的工作流ID不匹配');
    }
  }


  /**
   * 处理暂停动作
   */
  private handlePause(): void {
    // 通知执行策略暂停执行
    this.workflowDefinition.executionStrategy.pause();
  }

  /**
   * 处理恢复动作
   */
  private handleResume(): void {
    // 通知执行策略恢复执行
    this.workflowDefinition.executionStrategy.resume();
  }

  /**
   * 处理取消动作
   */
  private handleCancel(): void {
    // 通知执行策略取消执行
    this.workflowDefinition.executionStrategy.cancel();
  }

  /**
   * 处理验证动作
   */
  private handleValidate(): void {
    // 执行额外的验证逻辑
    this.workflowDefinition.validate();
    const validationResult = this.graphValidationService.validateGraph(this.workflowGraph);
    if (!validationResult.valid) {
      throw new DomainError(`图验证失败: ${validationResult.errors.join(', ')}`);
    }
  }

  /**
   * 获取工作流定义
   * @returns 工作流定义
   */
  public getWorkflowDefinition(): WorkflowDefinition {
    return this.workflowDefinition;
  }

  /**
   * 获取工作流图
   * @returns 工作流图
   */
  public getWorkflowGraph(): WorkflowGraph {
    return this.workflowGraph;
  }

  /**
   * 获取执行器配置
   * @returns 执行器配置
   */
  public getConfig(): WorkflowExecutorConfig {
    return this.config;
  }
}

/**
 * 执行动作类型
 */
export type ExecutionAction = 'start' | 'pause' | 'resume' | 'cancel' | 'validate';

/**
 * 执行步骤接口
 */
export interface ExecutionStep {
  readonly stepId: string;
  readonly nodeId: ID;
  readonly node: any;
  readonly dependencies?: ID[];
  readonly priority?: number;
  
  execute(context: IExecutionContext): Promise<any>;
  validate(): void;
}