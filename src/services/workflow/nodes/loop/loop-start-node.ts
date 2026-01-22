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

/**
 * LoopStart节点
 * 
 * 标记循环的开始，初始化循环状态
 * 
 * 核心功能：
 * - 初始化循环状态（迭代次数、最大迭代次数、激活状态）
 * - 存储循环状态到上下文
 * 
 * 注意：
 * - 不负责条件判断（使用ConditionNode）
 * - 不负责数据转换（使用DataTransformNode）
 * - 不负责流程控制（使用分支节点）
 */
export class LoopStartNode extends Node {
  constructor(
    id: NodeId,
    public readonly maxIterations: number = 100,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.loopStart(NodeContextTypeValue.PASS_THROUGH),
      name || 'Loop Start',
      description || '循环开始节点',
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 初始化循环状态
      const loopState = {
        iteration: 0,
        maxIterations: this.maxIterations,
        isActive: true,
      };

      // 存储循环状态到上下文
      context.setVariable('loop_state', loopState);
      context.setVariable('loop_iteration', 0);

      return {
        success: true,
        output: {
          message: '循环已初始化',
          loopState,
        },
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          maxIterations: this.maxIterations,
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

  validate(): ValidationResult {
    const errors: string[] = [];

    if (typeof this.maxIterations !== 'number' || this.maxIterations <= 0) {
      errors.push('maxIterations必须是正数');
    }

    return {
      valid: errors.length === 0,
      errors,
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
          name: 'maxIterations',
          type: 'number',
          required: false,
          description: '最大迭代次数（默认100）',
          defaultValue: 100,
        },
      ],
    };
  }

  getInputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  getOutputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        message: { type: 'string', description: '执行消息' },
        loopState: { type: 'object', description: '循环状态' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new LoopStartNode(
      props.id,
      props.maxIterations,
      props.name,
      props.description,
      props.position
    );
  }
}