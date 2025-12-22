/**
 * HumanRelay工作流服务
 * 
 * 提供HumanRelay工作流的创建、执行和管理功能
 */

import { injectable, inject } from 'inversify';
import { IWorkflowExecutionService } from '../../../domain/workflow/services/execution-service';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { HumanRelayNode } from '../../../domain/workflow/entities/nodes/specialized/human-relay-node';
import { ID } from '../../../domain/common/value-objects/id';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';
import { Workflow } from '../../../domain/workflow/entities/workflow';

/**
 * HumanRelay工作流服务
 */
@injectable()
export class HumanRelayWorkflowService {
  constructor(
    @inject('IWorkflowExecutionService')
    private workflowExecutionService: IWorkflowExecutionService,
    @inject('WorkflowRepository')
    private workflowRepository: WorkflowRepository
  ) { }

  /**
   * 创建HumanRelay工作流
   * 
   * @param name 工作流名称
   * @param mode 操作模式
   * @param promptTemplate 提示词模板
   * @returns 工作流ID
   */
  public async createHumanRelayWorkflow(
    name: string,
    mode: HumanRelayMode,
    promptTemplate?: string
  ): Promise<ID> {
    // 创建工作流定义
    const workflowDefinition = this.createWorkflowDefinition(name, mode, promptTemplate);

    // 保存工作流
    const workflow = await this.workflowRepository.save(workflowDefinition);

    return workflow.workflowId;
  }

  /**
   * 执行HumanRelay工作流
   * 
   * @param workflowId 工作流ID
   * @param inputData 输入数据
   * @returns 执行结果
   */
  public async executeHumanRelayWorkflow(
    workflowId: ID,
    inputData: any
  ): Promise<any> {
    // 获取工作流
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId.toString()}`);
    }

    // 验证工作流包含HumanRelay节点
    const humanRelayNodes = Array.from(workflow.nodes.values()).filter(
      (node: any) => node instanceof HumanRelayNode
    ) as HumanRelayNode[];

    if (humanRelayNodes.length === 0) {
      throw new Error('工作流中未找到HumanRelay节点');
    }

    // 执行工作流
    const executionResult = await this.workflowExecutionService.execute({
      executionId: ID.generate().toString(),
      workflowId: workflowId,
      mode: 'sync' as any,
      priority: 'normal' as any,
      config: {},
      inputData,
      parameters: {}
    });

    return executionResult;
  }

  /**
   * 获取HumanRelay节点状态
   * 
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @returns 节点状态
   */
  public async getHumanRelayNodeStatus(
    workflowId: ID,
    nodeId: string
  ): Promise<any> {
    // 获取工作流执行状态
    const executionStatus = await this.workflowExecutionService.getExecutionStatus(
      nodeId
    );

    return executionStatus || null;
  }

  /**
   * 创建单轮模式工作流
   * 
   * @param name 工作流名称
   * @param timeout 超时时间
   * @param promptTemplate 提示词模板
   * @returns 工作流ID
   */
  public async createSingleTurnWorkflow(
    name: string,
    timeout: number = 300,
    promptTemplate?: string
  ): Promise<ID> {
    return this.createHumanRelayWorkflow(name, HumanRelayMode.SINGLE, promptTemplate);
  }

  /**
   * 创建多轮模式工作流
   * 
   * @param name 工作流名称
   * @param timeout 超时时间
   * @param maxHistoryLength 最大历史长度
   * @param promptTemplate 提示词模板
   * @returns 工作流ID
   */
  public async createMultiTurnWorkflow(
    name: string,
    timeout: number = 600,
    maxHistoryLength: number = 100,
    promptTemplate?: string
  ): Promise<ID> {
    const workflowId = await this.createHumanRelayWorkflow(name, HumanRelayMode.MULTI, promptTemplate);

    // 更新多轮模式的特定配置
    const workflow = await this.workflowRepository.findById(workflowId);
    if (workflow) {
      const humanRelayNodes = Array.from(workflow.nodes.values()).filter(
        (node: any) => node instanceof HumanRelayNode
      ) as HumanRelayNode[];

      for (const node of humanRelayNodes) {
        // 更新节点配置
        const config = node.getConfig();
        config.maxHistoryLength = maxHistoryLength;
        config.timeout = timeout;
      }

      await this.workflowRepository.save(workflow);
    }

    return workflowId;
  }

  /**
   * 获取工作流列表
   * 
   * @param mode 过滤模式（可选）
   * @returns 工作流列表
   */
  public async getWorkflowList(mode?: HumanRelayMode): Promise<Array<{
    id: string;
    name: string;
    mode: string;
    description: string;
    createdAt: Date;
  }>> {
    const workflows = await this.workflowRepository.findAll();

    return workflows
      .filter((workflow: Workflow) => {
        const humanRelayNodes = Array.from(workflow.nodes.values()).filter(
          (node: any) => node instanceof HumanRelayNode
        ) as HumanRelayNode[];

        if (humanRelayNodes.length === 0) {
          return false;
        }

        if (mode !== undefined) {
          return humanRelayNodes.some(node => node.getMode() === mode);
        }

        return true;
      })
      .map((workflow: Workflow) => {
        const humanRelayNode = Array.from(workflow.nodes.values()).find(
          (node: any) => node instanceof HumanRelayNode
        ) as HumanRelayNode;

        return {
          id: workflow.workflowId.toString(),
          name: workflow.name,
          mode: humanRelayNode?.getMode() || 'unknown',
          description: workflow.description || '',
          createdAt: workflow.createdAt.getDate()
        };
      });
  }

  /**
   * 删除工作流
   * 
   * @param workflowId 工作流ID
   * @returns 是否成功删除
   */
  public async deleteWorkflow(workflowId: ID): Promise<boolean> {
    try {
      await this.workflowRepository.deleteById(workflowId);
      return true;
    } catch (error) {
      console.error('删除工作流失败:', error);
      return false;
    }
  }

  /**
   * 获取工作流执行历史
   * 
   * @param workflowId 工作流ID
   * @param limit 限制数量
   * @returns 执行历史
   */
  public async getWorkflowExecutionHistory(
    workflowId: ID,
    limit: number = 10
  ): Promise<Array<{
    executionId: string;
    status: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    input: any;
    output?: any;
    error?: string;
  }>> {
    // 这里应该从实际的执行历史存储中获取数据
    // 临时返回空数组
    return [];
  }

  /**
   * 取消正在执行的工作流
   * 
   * @param workflowId 工作流ID
   * @param executionId 执行ID
   * @returns 是否成功取消
   */
  public async cancelWorkflowExecution(
    workflowId: ID,
    executionId: string
  ): Promise<boolean> {
    try {
      await this.workflowExecutionService.cancelExecution(executionId);
      return true;
    } catch (error) {
      console.error('取消工作流执行失败:', error);
      return false;
    }
  }

  // 私有方法

  /**
   * 创建工作流定义
   */
  private createWorkflowDefinition(
    name: string,
    mode: HumanRelayMode,
    promptTemplate?: string
  ): Workflow {
    // 创建工作流定义的具体实现
    // 这里应该创建包含HumanRelay节点的完整工作流

    const inputNodeId = ID.generate();
    const humanRelayNodeId = ID.generate();
    const outputNodeId = ID.generate();

    // 创建HumanRelay节点
    const humanRelayNode = HumanRelayNode.createSingleMode(
      humanRelayNodeId,
      'HumanRelay节点',
      mode === HumanRelayMode.MULTI ? 600 : 300
    );

    // 如果有自定义模板，更新节点配置
    if (promptTemplate) {
      const config = humanRelayNode.getConfig();
      config.promptTemplate = promptTemplate;
    }

    // 创建工作流
    const workflow = Workflow.create(
      name,
      `HumanRelay ${mode} 模式工作流`,
      [humanRelayNode], // nodes
      [], // edges
      undefined, // type
      undefined, // config
      undefined, // parameterMapping
      undefined, // errorHandlingStrategy
      undefined, // executionStrategy
      undefined, // tags
      undefined, // metadata
      undefined // createdBy
    );

    return workflow;
  }

  /**
   * 验证工作流配置
   */
  private validateWorkflow(workflow: Workflow): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查是否包含HumanRelay节点
    const humanRelayNodes = Array.from(workflow.nodes.values()).filter(
      (node: any) => node instanceof HumanRelayNode
    ) as HumanRelayNode[];

    if (humanRelayNodes.length === 0) {
      errors.push('工作流必须包含至少一个HumanRelay节点');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取工作流统计信息
   */
  public async getWorkflowStatistics(): Promise<{
    totalWorkflows: number;
    singleModeWorkflows: number;
    multiModeWorkflows: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  }> {
    const workflows = await this.workflowRepository.findAll();
    const humanRelayWorkflows = workflows.filter((workflow: Workflow) => {
      return Array.from(workflow.nodes.values()).some((node: any) => node instanceof HumanRelayNode);
    });

    const singleModeCount = humanRelayWorkflows.filter((workflow: Workflow) => {
      const humanRelayNode = Array.from(workflow.nodes.values()).find((node: any) => node instanceof HumanRelayNode) as HumanRelayNode;
      return humanRelayNode?.getMode() === HumanRelayMode.SINGLE;
    }).length;

    const multiModeCount = humanRelayWorkflows.length - singleModeCount;

    // 这里应该从实际的执行统计中获取数据
    // 临时返回默认值
    return {
      totalWorkflows: humanRelayWorkflows.length,
      singleModeWorkflows: singleModeCount,
      multiModeWorkflows: multiModeCount,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };
  }
}
