import { NodeId } from '../../../domain/workflow/value-objects/node/node-id';
import { NodeType, NodeTypeValue, NodeContextTypeValue } from '../../../domain/workflow/value-objects/node/node-type';
import { Node, NodeExecutionResult, NodeMetadata, ValidationResult, WorkflowExecutionContext } from '../../../domain/workflow/entities/node';

/**
 * 开始节点
 * 工作流的入口点，负责初始化执行上下文和变量
 */
export class StartNode extends Node {
  constructor(
    id: NodeId,
    public readonly initialVariables?: Record<string, unknown>,
    public readonly initializeContext: boolean = true,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.start(NodeContextTypeValue.PASS_THROUGH),
      name || 'Start',
      description || '工作流开始节点',
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 初始化上下文变量
      if (this.initializeContext && this.initialVariables) {
        for (const [key, value] of Object.entries(this.initialVariables)) {
          context.setVariable(key, value);
        }
      }

      // 记录工作流开始时间
      context.setVariable('workflow_start_time', new Date().toISOString());
      context.setVariable('workflow_execution_id', context.getExecutionId());

      // 初始化执行统计
      context.setVariable('execution_stats', {
        totalNodes: 0,
        executedNodes: 0,
        failedNodes: 0,
        startTime: Date.now()
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: '工作流已启动',
          initializedVariables: this.initialVariables ? Object.keys(this.initialVariables) : []
        },
        executionTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          initializedVariables: this.initialVariables ? Object.keys(this.initialVariables) : []
        }
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
          nodeType: this.type.toString()
        }
      };
    }
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    if (this.initialVariables && typeof this.initialVariables !== 'object') {
      errors.push('initialVariables必须是对象类型');
    }

    if (typeof this.initializeContext !== 'boolean') {
      errors.push('initializeContext必须是布尔类型');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getMetadata(): NodeMetadata {
    return {
      id: this.nodeId.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
      status: this.status.toString(),
      parameters: [
        {
          name: 'initialVariables',
          type: 'object',
          required: false,
          description: '初始变量集合',
          defaultValue: {}
        },
        {
          name: 'initializeContext',
          type: 'boolean',
          required: false,
          description: '是否初始化上下文',
          defaultValue: true
        }
      ]
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        message: { type: 'string', description: '启动消息' },
        initializedVariables: { type: 'array', items: { type: 'string' }, description: '已初始化的变量列表' }
      }
    };
  }
}