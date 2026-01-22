import { NodeId } from '../../../../domain/workflow/value-objects/node/node-id';
import {
  NodeType,
  NodeTypeValue,
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
 * 循环策略枚举
 */
export enum LoopStrategy {
  /** 基于次数循环 */
  COUNT = 'count',
  /** 基于条件循环 */
  CONDITION = 'condition',
  /** 基于集合迭代 */
  ITERATE = 'iterate',
}

/**
 * LoopStart节点
 * 标记循环的开始，设置循环条件和策略
 */
export class LoopStartNode extends Node {
  constructor(
    id: NodeId,
    public readonly loopStrategy: LoopStrategy,
    public readonly maxIterations?: number,
    public readonly condition?: string,
    public readonly iterateVariable?: string,
    public readonly iterateCollection?: string,
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
        maxIterations: this.maxIterations || 100,
        strategy: this.loopStrategy,
        condition: this.condition,
        iterateVariable: this.iterateVariable,
        iterateCollection: this.iterateCollection,
        isActive: true,
      };

      // 存储循环状态到上下文
      context.setVariable('loop_state', loopState);
      context.setVariable('loop_iteration', 0);

      // 如果是迭代策略，初始化迭代变量
      if (this.loopStrategy === LoopStrategy.ITERATE && this.iterateCollection) {
        const collection = context.getVariable(this.iterateCollection);
        if (Array.isArray(collection)) {
          context.setVariable(this.iterateVariable!, collection[0]);
        }
      }

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
          loopStrategy: this.loopStrategy,
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

    if (!Object.values(LoopStrategy).includes(this.loopStrategy)) {
      errors.push('loopStrategy必须是有效的LoopStrategy值');
    }

    if (this.loopStrategy === LoopStrategy.COUNT && !this.maxIterations) {
      errors.push('COUNT策略需要指定maxIterations');
    }

    if (this.loopStrategy === LoopStrategy.CONDITION && !this.condition) {
      errors.push('CONDITION策略需要指定condition');
    }

    if (this.loopStrategy === LoopStrategy.ITERATE && (!this.iterateVariable || !this.iterateCollection)) {
      errors.push('ITERATE策略需要指定iterateVariable和iterateCollection');
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
          name: 'loopStrategy',
          type: 'string',
          required: true,
          description: '循环策略：count（次数）、condition（条件）、iterate（迭代）',
        },
        {
          name: 'maxIterations',
          type: 'number',
          required: false,
          description: '最大迭代次数（COUNT策略必需）',
        },
        {
          name: 'condition',
          type: 'string',
          required: false,
          description: '循环条件表达式（CONDITION策略必需）',
        },
        {
          name: 'iterateVariable',
          type: 'string',
          required: false,
          description: '迭代变量名（ITERATE策略必需）',
        },
        {
          name: 'iterateCollection',
          type: 'string',
          required: false,
          description: '迭代集合变量名（ITERATE策略必需）',
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
      props.loopStrategy,
      props.maxIterations,
      props.condition,
      props.iterateVariable,
      props.iterateCollection,
      props.name,
      props.description,
      props.position
    );
  }
}