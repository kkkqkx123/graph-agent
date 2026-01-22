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
 * LoopEnd节点
 * 标记循环的结束，决定是否继续循环
 */
export class LoopEndNode extends Node {
  constructor(
    id: NodeId,
    public readonly breakOnCondition?: string,
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

      // 如果是迭代策略，更新迭代变量
      if (loopState.strategy === 'iterate' && loopState.iterateCollection) {
        const collection = context.getVariable(loopState.iterateCollection);
        if (Array.isArray(collection) && loopState.iteration < collection.length) {
          context.setVariable(loopState.iterateVariable, collection[loopState.iteration]);
        }
      }

      // 检查是否应该继续循环
      const shouldContinue = this.shouldContinueLoop(loopState, context);

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

  /**
   * 判断是否应该继续循环
   */
  private shouldContinueLoop(loopState: any, context: WorkflowExecutionContext): boolean {
    // 检查最大迭代次数
    if (loopState.iteration >= loopState.maxIterations) {
      return false;
    }

    // 检查break条件
    if (this.breakOnCondition) {
      const shouldBreak = this.evaluateCondition(this.breakOnCondition, context);
      if (shouldBreak) {
        return false;
      }
    }

    // 根据策略判断
    switch (loopState.strategy) {
      case 'count':
        return loopState.iteration < loopState.maxIterations;

      case 'condition':
        return this.evaluateCondition(loopState.condition, context);

      case 'iterate':
        const collection = context.getVariable(loopState.iterateCollection);
        if (!Array.isArray(collection)) {
          return false;
        }
        return loopState.iteration < collection.length;

      default:
        return false;
    }
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, context: WorkflowExecutionContext): boolean {
    try {
      // 简化的条件评估逻辑
      const variables: Record<string, unknown> = {
        iteration: context.getVariable('loop_iteration'),
      };

      // 替换变量引用
      let expression = condition;
      expression = expression.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = variables[varName];
        if (typeof value === 'string') {
          return `'${value}'`;
        }
        return String(value);
      });

      // 安全检查
      const hasUnsafeContent = /eval|function|new|delete|typeof|void|in|instanceof/.test(expression);
      if (hasUnsafeContent) {
        return false;
      }

      const func = new Function('return ' + expression);
      return Boolean(func());
    } catch {
      return false;
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
      parameters: [
        {
          name: 'breakOnCondition',
          type: 'string',
          required: false,
          description: '中断循环的条件表达式（可选）',
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
        shouldContinue: { type: 'boolean', description: '是否继续循环' },
        iteration: { type: 'number', description: '当前迭代次数' },
      },
    };
  }

  protected createNodeFromProps(props: any): any {
    return new LoopEndNode(
      props.id,
      props.breakOnCondition,
      props.name,
      props.description,
      props.position
    );
  }
}