/**
 * HumanRelay工作流服务
 * 
 * 提供HumanRelay工作流的创建、执行和管理功能
 */

import { injectable, inject } from 'inversify';
import { IWorkflowOrchestrationService, WorkflowExecutionRequest } from '../../../domain/workflow/services/workflow-orchestration-service';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { WorkflowDomainService } from '../../../domain/workflow/services/domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { HumanRelayMode } from '../../../domain/llm/value-objects/human-relay-mode';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowType } from '../../../domain/workflow/value-objects/workflow-type';
import { WorkflowConfig } from '../../../domain/workflow/value-objects/workflow-config';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * HumanRelay工作流服务
 * 
 * 负责HumanRelay工作流的业务流程编排和协调
 */
@injectable()
export class HumanRelayWorkflowService {
  constructor(
    @inject('IWorkflowOrchestrationService')
    private workflowOrchestrationService: IWorkflowOrchestrationService,
    @inject('WorkflowRepository')
    private workflowRepository: WorkflowRepository,
    @inject('WorkflowDomainService')
    private workflowDomainService: WorkflowDomainService,
    @inject('Logger')
    private logger: ILogger
  ) {}

  /**
   * 创建HumanRelay工作流
   * 
   * @param name 工作流名称
   * @param mode 操作模式
   * @param promptTemplate 提示词模板
   * @param createdBy 创建者ID
   * @returns 工作流ID
   */
  public async createHumanRelayWorkflow(
    name: string,
    mode: HumanRelayMode,
    promptTemplate?: string,
    createdBy?: ID
  ): Promise<ID> {
    try {
      this.logger.info('正在创建HumanRelay工作流', { name, mode });

      // 验证创建条件
      await this.workflowDomainService.validateWorkflowCreation(name, undefined, createdBy);

      // 创建工作流配置
      const config = WorkflowConfig.create({
        maxExecutionTime: mode === HumanRelayMode.MULTI ? 600 : 300,
        retryCount: 3,
        timeoutSeconds: mode === HumanRelayMode.MULTI ? 600 : 300,
        enableLogging: true,
        enableMetrics: true,
        enableCheckpointing: false,
        checkpointInterval: 300,
        maxConcurrentThreads: 1,
        metadata: {
          type: 'human-relay',
          mode: mode.toString(),
          promptTemplate: promptTemplate || '',
          maxHistoryLength: mode === HumanRelayMode.MULTI ? 100 : 1
        }
      });

      // 创建工作流
      const workflow = Workflow.create(
        name,
        `HumanRelay ${mode} 模式工作流`,
        WorkflowType.fromString('human-relay'),
        config,
        createdBy
      );

      // 添加标签标识工作流类型
      workflow.addTag('human-relay', createdBy);
      workflow.addTag(mode.toString(), createdBy);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('HumanRelay工作流创建成功', { 
        workflowId: savedWorkflow.workflowId.toString(),
        mode 
      });

      return savedWorkflow.workflowId;
    } catch (error) {
      this.logger.error('创建HumanRelay工作流失败', error as Error);
      throw error;
    }
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
    try {
      this.logger.info('正在执行HumanRelay工作流', { workflowId: workflowId.toString() });

      // 获取工作流
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证执行条件
      this.workflowDomainService.validateExecutionEligibility(workflow);

      // 验证工作流是否为HumanRelay类型
      if (!this.isHumanRelayWorkflow(workflow)) {
        throw new DomainError('工作流不是HumanRelay类型');
      }

      // 执行工作流
      const executionRequest: WorkflowExecutionRequest = {
        executionId: ID.generate().toString(),
        workflowId: workflowId,
        mode: 'sync' as any,
        priority: 'normal' as any,
        config: workflow.config.value as any,
        inputData,
        parameters: {}
      };
      
      const executionResult = await this.workflowOrchestrationService.execute(executionRequest);

      this.logger.info('HumanRelay工作流执行成功', { 
        workflowId: workflowId.toString(),
        executionId: executionRequest.executionId
      });

      return executionResult;
    } catch (error) {
      this.logger.error('执行HumanRelay工作流失败', error as Error);
      throw error;
    }
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
    try {
      // 获取工作流执行状态
      const executionStatus = await this.workflowOrchestrationService.getExecutionStatus(
        nodeId
      );

      return executionStatus || null;
    } catch (error) {
      this.logger.error('获取HumanRelay节点状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 创建单轮模式工作流
   * 
   * @param name 工作流名称
   * @param timeout 超时时间
   * @param promptTemplate 提示词模板
   * @param createdBy 创建者ID
   * @returns 工作流ID
   */
  public async createSingleTurnWorkflow(
    name: string,
    timeout: number = 300,
    promptTemplate?: string,
    createdBy?: ID
  ): Promise<ID> {
    return this.createHumanRelayWorkflow(name, HumanRelayMode.SINGLE, promptTemplate, createdBy);
  }

  /**
   * 创建多轮模式工作流
   * 
   * @param name 工作流名称
   * @param timeout 超时时间
   * @param maxHistoryLength 最大历史长度
   * @param promptTemplate 提示词模板
   * @param createdBy 创建者ID
   * @returns 工作流ID
   */
  public async createMultiTurnWorkflow(
    name: string,
    timeout: number = 600,
    maxHistoryLength: number = 100,
    promptTemplate?: string,
    createdBy?: ID
  ): Promise<ID> {
    try {
      // 验证创建条件
      await this.workflowDomainService.validateWorkflowCreation(name, undefined, createdBy);

      // 创建工作流配置
      const config = WorkflowConfig.create({
        maxExecutionTime: timeout,
        retryCount: 3,
        timeoutSeconds: timeout,
        enableLogging: true,
        enableMetrics: true,
        enableCheckpointing: false,
        checkpointInterval: 300,
        maxConcurrentThreads: 1,
        metadata: {
          type: 'human-relay',
          mode: HumanRelayMode.MULTI.toString(),
          promptTemplate: promptTemplate || '',
          maxHistoryLength: maxHistoryLength
        }
      });

      // 创建工作流
      const workflow = Workflow.create(
        name,
        `HumanRelay 多轮模式工作流`,
        WorkflowType.fromString('human-relay'),
        config,
        createdBy
      );

      // 添加标签标识工作流类型
      workflow.addTag('human-relay', createdBy);
      workflow.addTag(HumanRelayMode.MULTI.toString(), createdBy);

      // 保存工作流
      const savedWorkflow = await this.workflowRepository.save(workflow);

      this.logger.info('多轮模式HumanRelay工作流创建成功', { 
        workflowId: savedWorkflow.workflowId.toString()
      });

      return savedWorkflow.workflowId;
    } catch (error) {
      this.logger.error('创建多轮模式工作流失败', error as Error);
      throw error;
    }
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
    try {
      const workflows = await this.workflowRepository.findAll();

      return workflows
        .filter((workflow: Workflow) => {
          return this.isHumanRelayWorkflow(workflow);
        })
        .filter((workflow: Workflow) => {
          if (mode !== undefined) {
            return workflow.tags.includes(mode.toString());
          }
          return true;
        })
        .map((workflow: Workflow) => {
          const workflowMode = this.getWorkflowMode(workflow);

          return {
            id: workflow.workflowId.toString(),
            name: workflow.name,
            mode: workflowMode || 'unknown',
            description: workflow.description || '',
            createdAt: workflow.createdAt.getDate()
          };
        });
    } catch (error) {
      this.logger.error('获取工作流列表失败', error as Error);
      throw error;
    }
  }

  /**
   * 删除工作流
   * 
   * @param workflowId 工作流ID
   * @returns 是否成功删除
   */
  public async deleteWorkflow(workflowId: ID): Promise<boolean> {
    try {
      this.logger.info('正在删除HumanRelay工作流', { workflowId: workflowId.toString() });

      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        return false;
      }

      // 检查工作流状态是否允许删除
      if (workflow.status.isActive()) {
        throw new DomainError('无法删除活跃状态的工作流');
      }

      // 标记工作流为已删除
      workflow.markAsDeleted();
      await this.workflowRepository.save(workflow);

      this.logger.info('HumanRelay工作流删除成功', { workflowId: workflowId.toString() });

      return true;
    } catch (error) {
      this.logger.error('删除HumanRelay工作流失败', error as Error);
      throw error;
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
    try {
      // 这里应该从实际的执行历史存储中获取数据
      // 临时返回空数组
      return [];
    } catch (error) {
      this.logger.error('获取工作流执行历史失败', error as Error);
      throw error;
    }
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
      this.logger.info('正在取消工作流执行', { 
        workflowId: workflowId.toString(),
        executionId 
      });

      await this.workflowOrchestrationService.cancelExecution(executionId);

      this.logger.info('工作流执行取消成功', { 
        workflowId: workflowId.toString(),
        executionId 
      });

      return true;
    } catch (error) {
      this.logger.error('取消工作流执行失败', error as Error);
      throw error;
    }
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
    try {
      const workflows = await this.workflowRepository.findAll();
      const humanRelayWorkflows = workflows.filter((workflow: Workflow) => {
        return this.isHumanRelayWorkflow(workflow);
      });

      const singleModeCount = humanRelayWorkflows.filter((workflow: Workflow) => {
        return workflow.tags.includes(HumanRelayMode.SINGLE.toString());
      }).length;

      const multiModeCount = humanRelayWorkflows.filter((workflow: Workflow) => {
        return workflow.tags.includes(HumanRelayMode.MULTI.toString());
      }).length;

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
    } catch (error) {
      this.logger.error('获取工作流统计信息失败', error as Error);
      throw error;
    }
  }

  // 私有方法

  /**
   * 检查工作流是否为HumanRelay类型
   */
  private isHumanRelayWorkflow(workflow: Workflow): boolean {
    return workflow.tags.includes('human-relay') || 
           workflow.type.toString() === 'human-relay';
  }

  /**
   * 获取工作流模式
   */
  private getWorkflowMode(workflow: Workflow): string | null {
    if (workflow.tags.includes(HumanRelayMode.SINGLE.toString())) {
      return HumanRelayMode.SINGLE.toString();
    }
    if (workflow.tags.includes(HumanRelayMode.MULTI.toString())) {
      return HumanRelayMode.MULTI.toString();
    }
    return null;
  }

  /**
   * 验证工作流配置
   */
  private validateWorkflow(workflow: Workflow): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查是否为HumanRelay类型
    if (!this.isHumanRelayWorkflow(workflow)) {
      errors.push('工作流必须是HumanRelay类型');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}