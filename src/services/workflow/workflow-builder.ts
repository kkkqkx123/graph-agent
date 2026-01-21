/**
 * 工作流构建器
 *
 * 负责从配置数据构建 Workflow 实例
 * 遵循单一职责原则，专注于工作流构建逻辑
 */

import { injectable, inject } from 'inversify';
import {
  Workflow,
  WorkflowType,
  WorkflowStatus,
  WorkflowConfig,
  NodeId,
  EdgeId,
  EdgeType,
} from '../../domain/workflow';
import { ID } from '../../domain/common';
import { BaseService } from '../common/base-service';
import { ILogger } from '../../domain/common';
import { NodeFactory, NodeConfig } from './nodes/node-factory';
import {
  WorkflowConfigData,
  EdgeConfig,
  SubWorkflowReferenceConfig,
} from './config-parser';
import { WorkflowReference } from '../../domain/workflow/value-objects/workflow-reference';
import { ErrorHandlingStrategy } from '../../domain/workflow/value-objects/error-handling-strategy';
import { ExecutionStrategy } from '../../domain/workflow/value-objects/execution/execution-strategy';

/**
 * 工作流构建器
 */
@injectable()
export class WorkflowBuilder extends BaseService {
  constructor(
    @inject('NodeFactory') private readonly nodeFactory: NodeFactory,
    @inject('Logger') logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 从配置数据构建 Workflow 实例
   * @param configData 配置数据
   * @returns Workflow 实例
   */
  async build(configData: WorkflowConfigData): Promise<Workflow> {
    return this.executeBusinessOperation(
      '构建工作流',
      () => this.doBuild(configData),
      { workflowName: configData.workflow.name }
    );
  }

  /**
   * 执行实际的构建逻辑
   */
  private async doBuild(configData: WorkflowConfigData): Promise<Workflow> {
    const workflowConfig = configData.workflow;

    // 1. 创建工作流实例
    let workflow = Workflow.create(
      workflowConfig.name,
      workflowConfig.description,
      this.parseWorkflowType(workflowConfig.type),
      this.parseWorkflowConfig(workflowConfig.config),
      undefined // createdBy
    );

    // 2. 设置状态
    if (workflowConfig.status) {
      const status = this.parseWorkflowStatus(workflowConfig.status);
      workflow = workflow.changeStatus(status);
    }

    // 3. 设置错误处理策略（通过元数据）
    if (workflowConfig.errorHandlingStrategy) {
      const strategy = this.parseErrorHandlingStrategy(workflowConfig.errorHandlingStrategy);
      workflow = workflow.updateMetadata({ errorHandlingStrategy: strategy.toString() });
    }

    // 4. 设置执行策略（通过元数据）
    if (workflowConfig.executionStrategy) {
      const strategy = this.parseExecutionStrategy(workflowConfig.executionStrategy);
      workflow = workflow.updateMetadata({ executionStrategy: strategy.toString() });
    }

    // 5. 添加节点
    for (const nodeConfig of workflowConfig.nodes || []) {
      const node = this.nodeFactory.create(nodeConfig);
      workflow = workflow.addNode(node);
    }

    // 6. 添加边
    for (const edgeConfig of workflowConfig.edges || []) {
      workflow = this.addEdge(workflow, edgeConfig);
    }

    // 7. 添加子工作流引用
    if (workflowConfig.subWorkflowReferences) {
      for (const refConfig of workflowConfig.subWorkflowReferences) {
        const reference = WorkflowReference.create({
          referenceId: refConfig.referenceId,
          workflowId: ID.fromString(refConfig.workflowId),
          version: refConfig.version,
          inputMapping: new Map(Object.entries(refConfig.inputMapping || {})),
          outputMapping: new Map(Object.entries(refConfig.outputMapping || {})),
          description: refConfig.description,
        });

        workflow = workflow.addSubWorkflowReference(reference);
      }
    }

    // 8. 添加标签
    if (workflowConfig.tags) {
      for (const tag of workflowConfig.tags) {
        workflow = workflow.addTag(tag);
      }
    }

    // 9. 更新元数据
    if (workflowConfig.metadata) {
      workflow = workflow.updateMetadata(workflowConfig.metadata);
    }

    this.logger.debug('工作流构建完成', {
      workflowId: workflow.workflowId.toString(),
      nodeCount: workflow.getNodeCount(),
      edgeCount: workflow.getEdgeCount(),
      subWorkflowRefCount: workflow.getSubWorkflowReferences().size,
    });

    return workflow;
  }

  /**
   * 解析工作流类型
   */
  private parseWorkflowType(type?: string): WorkflowType {
    if (!type) {
      return WorkflowType.sequential();
    }
    return WorkflowType.fromString(type);
  }

  /**
   * 解析工作流状态
   */
  private parseWorkflowStatus(status: string): WorkflowStatus {
    return WorkflowStatus.fromString(status);
  }

  /**
   * 解析工作流配置
   */
  private parseWorkflowConfig(config?: Record<string, any>): WorkflowConfig {
    if (!config) {
      return WorkflowConfig.default();
    }
    return WorkflowConfig.create(config);
  }

  /**
   * 解析错误处理策略
   */
  private parseErrorHandlingStrategy(strategy: string): ErrorHandlingStrategy {
    switch (strategy) {
      case 'stop_on_error':
        return ErrorHandlingStrategy.stopOnError();
      case 'continue_on_error':
        return ErrorHandlingStrategy.continueOnError();
      case 'retry':
        return ErrorHandlingStrategy.retry(3, 1000);
      case 'skip':
        return ErrorHandlingStrategy.skip();
      default:
        return ErrorHandlingStrategy.stopOnError();
    }
  }

  /**
   * 解析执行策略
   */
  private parseExecutionStrategy(strategy: string): ExecutionStrategy {
    switch (strategy) {
      case 'sequential':
        return ExecutionStrategy.sequential();
      case 'parallel':
        return ExecutionStrategy.parallel();
      case 'conditional':
        return ExecutionStrategy.conditional('true');
      default:
        return ExecutionStrategy.sequential();
    }
  }

  /**
   * 添加边到工作流
   */
  private addEdge(workflow: Workflow, edgeConfig: EdgeConfig): Workflow {
    const edgeId = EdgeId.fromString(`${edgeConfig.from}_${edgeConfig.to}`);
    const edgeType = EdgeType.fromString(edgeConfig.type || 'default');
    const fromNodeId = NodeId.fromString(edgeConfig.from);
    const toNodeId = NodeId.fromString(edgeConfig.to);

    const condition = this.parseEdgeCondition(edgeConfig.condition);

    return workflow.addEdge(
      edgeId,
      edgeType,
      fromNodeId,
      toNodeId,
      condition,
      edgeConfig.weight,
      edgeConfig.properties
    );
  }

  /**
   * 解析边条件
   */
  private parseEdgeCondition(conditionConfig?: EdgeConfig['condition']) {
    if (!conditionConfig) {
      return undefined;
    }

    // 将配置条件转换为 EdgeCondition 格式
    // EdgeCondition 只支持 function 类型
    if (conditionConfig.type === 'function') {
      return {
        type: 'function' as const,
        functionId: conditionConfig.value,
        config: conditionConfig.parameters,
      };
    }

    // 对于 expression 和 script 类型，转换为 function 类型
    return {
      type: 'function' as const,
      functionId: conditionConfig.value,
      config: {
        ...conditionConfig.parameters,
        language: conditionConfig.language,
      },
    };
  }

  protected getServiceName(): string {
    return '工作流构建器';
  }
}