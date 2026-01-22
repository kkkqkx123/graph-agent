import { NodeId } from '../../../../domain/workflow/value-objects/node/node-id';
import {
  NodeType,
  NodeContextTypeValue,
} from '../../../../domain/workflow/value-objects/node/node-type';
import {
  Node,
  NodeExecutionResult,
  NodeMetadata,
  ValidationResult,
  WorkflowExecutionContext,
} from '../../../../domain/workflow/entities/node';
import {
  MarkerNode,
  SubWorkflowConfig,
} from '../../../../domain/workflow/value-objects/node/marker-node';

/**
 * SubWorkflow节点配置接口
 */
export interface SubWorkflowNodeConfig {
  /** 引用ID（在工作流中唯一标识这个子工作流引用） */
  referenceId: string;
  /** 子工作流ID */
  workflowId: string;
  /** 版本（可选） */
  version?: string;
  /** 输入映射（可选） */
  inputMapping?: Record<string, string>;
  /** 输出映射（可选） */
  outputMapping?: Record<string, string>;
  /** 描述（可选） */
  description?: string;
}

/**
 * SubWorkflow节点
 *
 * 这是一个占位符节点，用于标记子工作流的引用位置。
 * 在工作流合并时，这个节点会被替换为子工作流的实际节点。
 *
 * 注意：
 * - 这个节点不执行任何逻辑，只是一个标记
 * - 在WorkflowMerger中，类型为'subworkflow'的节点会被过滤掉
 * - 子工作流的实际节点会通过referenceId找到并合并到父工作流中
 * - 使用MarkerNode值对象存储配置信息
 */
export class SubWorkflowNode extends Node {
  private readonly marker: MarkerNode;

  constructor(
    id: NodeId,
    config: SubWorkflowNodeConfig,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.subworkflow(NodeContextTypeValue.PASS_THROUGH),
      name || config.referenceId,
      description || config.description || `子工作流引用: ${config.workflowId}`,
      position
    );
    
    // 创建标记节点值对象
    this.marker = MarkerNode.subworkflow(id, {
      referenceId: config.referenceId,
      workflowId: config.workflowId,
      version: config.version,
      inputMapping: config.inputMapping,
      outputMapping: config.outputMapping,
    });
  }

  /**
   * 获取配置
   */
  get config(): SubWorkflowNodeConfig {
    const markerConfig = this.marker.getSubWorkflowConfig();
    return {
      referenceId: markerConfig.referenceId,
      workflowId: markerConfig.workflowId,
      version: markerConfig.version,
      inputMapping: markerConfig.inputMapping,
      outputMapping: markerConfig.outputMapping,
    };
  }

  /**
   * 获取标记节点
   */
  getMarker(): MarkerNode {
    return this.marker;
  }

  /**
   * 执行节点
   *
   * 注意：SubWorkflow节点不应该被执行，因为它只是一个占位符。
   * 在工作流合并时，这个节点会被移除，替换为子工作流的实际节点。
   * 如果这个方法被调用，说明工作流没有被正确合并。
   */
  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 存储标记信息到上下文
      // WorkflowMerger会读取这些信息并合并子工作流
      context.setVariable('marker_node', this.marker.toJSON());
      context.setVariable('subworkflow_reference_id', this.config.referenceId);
      context.setVariable('subworkflow_workflow_id', this.config.workflowId);

      // 这个节点不应该被执行
      // 如果执行到这里，说明工作流没有被正确合并
      return {
        success: false,
        error: `SubWorkflow节点不应该被执行。工作流ID: ${this.config.workflowId}，引用ID: ${this.config.referenceId}。请确保工作流已被正确合并。`,
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          referenceId: this.config.referenceId,
          workflowId: this.config.workflowId,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
        },
      };
    }
  }

  /**
   * 验证节点配置
   */
  validate(): ValidationResult {
    // 验证由MarkerNode在创建时完成
    return { valid: true, errors: [] };
  }

  /**
   * 获取节点元数据
   */
  getMetadata(): NodeMetadata {
    return {
      id: this.nodeId.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
      status: this.status.toString(),
      parameters: [
        {
          name: 'referenceId',
          type: 'string',
          required: true,
          description: '引用ID（在工作流中唯一标识这个子工作流引用）',
        },
        {
          name: 'workflowId',
          type: 'string',
          required: true,
          description: '子工作流ID',
        },
        {
          name: 'version',
          type: 'string',
          required: false,
          description: '子工作流版本（可选）',
        },
        {
          name: 'inputMapping',
          type: 'object',
          required: false,
          description: '输入映射（父工作流变量 -> 子工作流变量）',
        },
        {
          name: 'outputMapping',
          type: 'object',
          required: false,
          description: '输出映射（子工作流变量 -> 父工作流变量）',
        },
      ],
    };
  }

  /**
   * 获取输入Schema
   */
  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  /**
   * 获取输出Schema
   */
  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
    };
  }

  /**
   * 从属性创建节点（用于克隆）
   */
  protected createNodeFromProps(props: any): any {
    return new SubWorkflowNode(
      props.id,
      props.config,
      props.name,
      props.description,
      props.position
    );
  }
}