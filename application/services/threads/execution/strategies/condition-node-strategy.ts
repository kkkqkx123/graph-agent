/**
 * Condition Node 执行策略
 * 
 * 负责执行 Condition 节点，评估条件并返回分支结果
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { ConditionNode } from '../../../../domain/workflow/entities/node/condition-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { FunctionRegistry } from '../functions/function-registry';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * Condition Node 执行策略
 */
@injectable()
export class ConditionNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry
  ) { }

  canExecute(node: Node): boolean {
    return node instanceof ConditionNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof ConditionNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 ConditionNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('ConditionNodeStrategy 开始执行 Condition 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
      conditionFunctionId: node.conditionFunctionId,
    });

    try {
      // 1. 获取条件函数
      const conditionFunction = this.functionRegistry.getFunction(node.conditionFunctionId);

      if (!conditionFunction) {
        throw new Error(`条件函数不存在: ${node.conditionFunctionId}`);
      }

      // 2. 执行条件函数
      this.logger.debug('执行条件函数', {
        conditionFunctionId: node.conditionFunctionId,
      });

      const conditionResult = await conditionFunction.execute(context, node.conditionConfig || {});

      // 4. 解析条件结果
      const conditionValue = this.parseConditionResult(conditionResult);

      // 5. 将条件结果存储到执行上下文
      context.setVariable('conditionResult', {
        nodeId: node.nodeId.toString(),
        conditionFunctionId: node.conditionFunctionId,
        result: conditionValue,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;

      this.logger.info('Condition 节点执行成功', {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        executionTime,
        conditionValue,
      });

      return {
        success: true,
        output: {
          conditionResult: conditionValue,
          conditionFunctionId: node.conditionFunctionId,
        },
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          conditionFunctionId: node.conditionFunctionId,
          conditionValue,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Condition 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        conditionFunctionId: node.conditionFunctionId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          conditionFunctionId: node.conditionFunctionId,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 解析条件结果
   * @param result 条件函数的返回结果
   * @returns 解析后的布尔值
   */
  private parseConditionResult(result: any): boolean {
    // 如果结果已经是布尔值，直接返回
    if (typeof result === 'boolean') {
      return result;
    }

    // 如果结果是对象，检查是否有 value 或 result 字段
    if (typeof result === 'object' && result !== null) {
      if (typeof result.value === 'boolean') {
        return result.value;
      }
      if (typeof result.result === 'boolean') {
        return result.result;
      }
      if (typeof result.condition === 'boolean') {
        return result.condition;
      }
    }

    // 如果结果是字符串，尝试解析
    if (typeof result === 'string') {
      const lowerResult = result.toLowerCase();
      if (lowerResult === 'true' || lowerResult === 'yes' || lowerResult === '1') {
        return true;
      }
      if (lowerResult === 'false' || lowerResult === 'no' || lowerResult === '0') {
        return false;
      }
    }

    // 如果结果是数字，非零为 true
    if (typeof result === 'number') {
      return result !== 0;
    }

    // 默认返回 false
    this.logger.warn('无法解析条件结果，默认返回 false', { result });
    return false;
  }
}