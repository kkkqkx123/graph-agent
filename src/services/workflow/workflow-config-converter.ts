/**
 * 工作流配置转换器
 *
 * 负责将配置数据转换为 Workflow 领域对象
 * 遵循单一职责原则，专注于配置转换逻辑
 */

import { injectable, inject } from 'inversify';
import {
  Workflow,
  WorkflowType,
  WorkflowStatus,
  WorkflowConfig,
  ErrorHandlingStrategy,
  ExecutionStrategy,
  NodeId,
  NodeType,
  EdgeId,
  EdgeType,
  WorkflowReference,
  NodeContextTypeValue
} from '../../domain/workflow';
import { ID } from '../../domain/common';
import { BaseService } from '../common/base-service';
import { ILogger } from '../../domain/common';
import { NodeFactory, NodeConfig } from './node-factory';

/**
 * 工作流配置数据接口
 */
export interface WorkflowConfigData {
  workflow: {
    id?: string;
    name: string;
    description?: string;
    type?: string;
    status?: string;
    config?: Record<string, any>;
    errorHandlingStrategy?: string;
    executionStrategy?: string;
    nodes: NodeConfig[];
    edges: EdgeConfig[];
    subWorkflowReferences?: SubWorkflowReferenceConfig[];
    tags?: string[];
    metadata?: Record<string, unknown>;
  };
}

/**
 * 边配置接口
 */
export interface EdgeConfig {
  from: string;
  to: string;
  type?: string;
  condition?: EdgeConditionConfig;
  weight?: number;
  properties?: Record<string, unknown>;
}

/**
 * 边条件配置接口
 */
export interface EdgeConditionConfig {
  type: 'function' | 'expression' | 'script';
  value: string;
  parameters?: Record<string, any>;
  language?: string;
}

/**
 * 子工作流引用配置接口
 */
export interface SubWorkflowReferenceConfig {
  referenceId: string;
  workflowId: string;
  version?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  description?: string;
}

/**
 * 工作流配置转换器
 */
@injectable()
export class WorkflowConfigConverter extends BaseService {
  constructor(
    @inject('NodeFactory') private readonly nodeFactory: NodeFactory,
    @inject('Logger') logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 转换配置数据为 Workflow 对象
   * @param configData 配置数据
   * @param parameters 参数值（可选）
   * @returns Workflow 实例
   */
  convert(configData: WorkflowConfigData, parameters?: Record<string, any>): Workflow {
    return this.executeBusinessOperation(
      '转换工作流配置',
      () => this.doConvert(configData, parameters),
      { workflowName: configData.workflow.name }
    );
  }

  /**
   * 执行实际的转换逻辑
   */
  private doConvert(configData: WorkflowConfigData, parameters?: Record<string, any>): Workflow {
    const workflowConfig = configData.workflow;

    // 1. 创建工作流基本实例
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

    // 3. 设置错误处理策略
    if (workflowConfig.errorHandlingStrategy) {
      const strategy = this.parseErrorHandlingStrategy(workflowConfig.errorHandlingStrategy);
      const currentConfig = workflow.config;
      const newConfig = currentConfig.updateErrorHandlingStrategy(strategy);
      workflow = workflow.updateConfig(newConfig);
    }

    // 4. 设置执行策略
    if (workflowConfig.executionStrategy) {
      const strategy = this.parseExecutionStrategy(workflowConfig.executionStrategy);
      const currentConfig = workflow.config;
      const newConfig = currentConfig.updateExecutionStrategy(strategy);
      workflow = workflow.updateConfig(newConfig);
    }

    // 5. 添加节点
    for (const nodeConfig of workflowConfig.nodes || []) {
      const node = this.nodeFactory.create(nodeConfig);
      workflow = workflow.addNode(node);
    }

    // 6. 添加边
    for (const edgeConfig of workflowConfig.edges || []) {
      const edgeId = EdgeId.fromString(`${edgeConfig.from}_${edgeConfig.to}`);
      const edgeType = EdgeType.fromString(edgeConfig.type || 'default');
      const fromNodeId = NodeId.fromString(edgeConfig.from);
      const toNodeId = NodeId.fromString(edgeConfig.to);

      const condition = this.parseEdgeCondition(edgeConfig.condition);

      workflow = workflow.addEdge(
        edgeId,
        edgeType,
        fromNodeId,
        toNodeId,
        condition,
        edgeConfig.weight,
        edgeConfig.properties
      );
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
          description: refConfig.description
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

    this.logger.debug('配置转换完成', {
      workflowId: workflow.workflowId.toString(),
      nodeCount: workflow.getNodeCount(),
      edgeCount: workflow.getEdgeCount(),
      subWorkflowRefCount: workflow.getSubWorkflowReferences().size
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
    return ErrorHandlingStrategy.fromString(strategy);
  }

  /**
   * 解析执行策略
   */
  private parseExecutionStrategy(strategy: string): ExecutionStrategy {
    return ExecutionStrategy.fromString(strategy);
  }

  /**
   * 解析边条件
   */
  private parseEdgeCondition(conditionConfig?: EdgeConditionConfig) {
    if (!conditionConfig) {
      return undefined;
    }

    return {
      type: conditionConfig.type,
      value: conditionConfig.value,
      parameters: conditionConfig.parameters,
      language: conditionConfig.language
    };
  }

  protected getServiceName(): string {
    return '工作流配置转换器';
  }
}
