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
 * LoopEnd节点
 * 
 * 标记循环的结束，增加迭代计数并检查是否继续
 * 
 * 核心功能：
 * - 增加迭代计数
 * - 检查是否超过最大迭代次数
 * - 清理循环状态（如果循环结束）
 * 
 * 注意：
 * - 不负责条件判断（使用ConditionNode）
 * - 不负责数据转换（使用DataTransformNode）
 * - 不负责流程控制（使用分支节点）
 * - 退出逻辑通过ConditionNode + 分支节点实现
 */
export class LoopEndNode extends Node {
  constructor(
    id: NodeId,
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.loopEnd(NodeContextTypeValue.PASS_THROUGH),
      name || 'Loop End',
      description || '循环结束节点',
      position
    );
  }

  async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取循环状态
      const loopState = context.getVariable('loop_state');
      if (!loopState || !loopState.isActive) {
        return {
          success: true,
          output: {
            message: '循环未激活或已完成',
            shouldContinue: false,
          },
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.nodeId.toString(),
            nodeType: this.type.toString(),
          },
        };
      }

      // 增加迭代计数
      loopState.iteration++;
      context.setVariable('loop_iteration', loopState.iteration);

      // 检查是否超过最大迭代次数
      const shouldContinue = loopState.iteration < loopState.maxIterations;

      if (!shouldContinue) {
        // 循环结束，清理状态
        loopState.isActive = false;
        context.setVariable('loop_state', undefined);
        context.setVariable('loop_iteration', undefined);
      }

      return {
        success: true,
        output: {
          message: shouldContinue ? '继续循环' : '循环结束',
          shouldContinue,
          iteration: loopState.iteration,
        },
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId: this.nodeId.toString(),
          nodeType: this.type.toString(),
          iteration: loopState.iteration,
          shouldContinue,
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
    return { valid: errors.length === 0, errors };
  }

  getMetadata(): NodeMetadata {
    return {
      id: this.nodeId.toString(),
      type: this.type.toString(),
      name: this.name,
      description: this.description,
      status: this.status.toString(),
      parameters: [],
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
        shouldContinue: { type: 'boolean', description: '是否继续循环（基于最大迭代次数）' },
        iteration: { type: 'number', description: '当前迭代次数' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new LoopEndNode(
      props.id,
      props.name,
      props.description,
      props.position
    );
  }
}