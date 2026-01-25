/**
 * LoopStart Node 执行策略
 * 
 * 负责执行 LoopStart 节点，初始化循环状态
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { LoopStartNode } from '../../../../domain/workflow/entities/node/loop-start-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { FunctionRegistry } from '../functions/function-registry';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * LoopStart Node 执行策略
 */
@injectable()
export class LoopStartNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry
  ) { }

  canExecute(node: Node): boolean {
    return node instanceof LoopStartNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof LoopStartNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 LoopStartNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('LoopStartNodeStrategy 开始执行 LoopStart 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
      loopConditionFunctionId: node.loopConditionFunctionId,
      maxIterations: node.maxIterations,
    });

    try {
      // 1. 获取或初始化循环状态
      let loopState = context.getVariable('loopState');

      if (!loopState) {
        // 第一次进入循环，初始化循环状态
        loopState = {
          iteration: 0,
          loopStartNodeId: node.nodeId.toString(),
          maxIterations: node.maxIterations || 100,
          loopConditionFunctionId: node.loopConditionFunctionId,
          loopConditionConfig: node.loopConditionConfig,
          loopVariables: {},
        };

        this.logger.debug('初始化循环状态', {
          loopStartNodeId: node.nodeId.toString(),
          maxIterations: loopState.maxIterations,
        });
      }

      // 2. 增加迭代次数
      loopState.iteration++;

      // 3. 检查是否超过最大迭代次数
      if (loopState.iteration > loopState.maxIterations) {
        this.logger.warn('超过最大迭代次数限制', {
          iteration: loopState.iteration,
          maxIterations: loopState.maxIterations,
        });

        return {
          success: false,
          error: `超过最大迭代次数限制: ${loopState.maxIterations}`,
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            iteration: loopState.iteration,
            maxIterations: loopState.maxIterations,
          },
        };
      }

      // 4. 评估循环条件
      const shouldContinue = await this.evaluateLoopCondition(
        node.loopConditionFunctionId,
        node.loopConditionConfig,
        context,
        loopState
      );

      // 5. 更新循环状态到执行上下文
      context.setVariable('loopState', loopState);
      context.setVariable('currentIteration', loopState.iteration);
      context.setVariable('shouldContinueLoop', shouldContinue);

      const executionTime = Date.now() - startTime;

      this.logger.info('LoopStart 节点执行成功', {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        executionTime,
        iteration: loopState.iteration,
        shouldContinue,
      });

      return {
        success: true,
        output: {
          iteration: loopState.iteration,
          maxIterations: loopState.maxIterations,
          shouldContinue,
        },
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          iteration: loopState.iteration,
          shouldContinue,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('LoopStart 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 评估循环条件
   * @param conditionFunctionId 条件函数ID
   * @param conditionConfig 条件配置
   * @param context 执行上下文
   * @param loopState 循环状态
   * @returns 是否继续循环
   */
  private async evaluateLoopCondition(
    conditionFunctionId: string,
    conditionConfig: Record<string, any> | undefined,
    context: ExecutionContext,
    loopState: any
  ): Promise<boolean> {
    try {
      // 获取条件函数
      const conditionFunction = this.functionRegistry.getFunction(conditionFunctionId);

      if (!conditionFunction) {
        this.logger.warn('循环条件函数不存在，默认继续循环', {
          conditionFunctionId,
        });
        return true; // 默认继续循环
      }

      // 执行条件函数
      this.logger.debug('评估循环条件', {
        conditionFunctionId,
        iteration: loopState.iteration,
      });

      const conditionResult = await conditionFunction.execute(context, conditionConfig || {});

      // 解析条件结果
      const shouldContinue = this.parseConditionResult(conditionResult);

      this.logger.debug('循环条件评估结果', {
        conditionFunctionId,
        iteration: loopState.iteration,
        shouldContinue,
      });

      return shouldContinue;
    } catch (error) {
      this.logger.error('评估循环条件失败', error instanceof Error ? error : new Error(String(error)), {
        conditionFunctionId,
      });
      // 条件评估失败，默认继续循环
      return true;
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
      if (typeof result.shouldContinue === 'boolean') {
        return result.shouldContinue;
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

    // 默认返回 true（继续循环）
    this.logger.warn('无法解析循环条件结果，默认继续循环', { result });
    return true;
  }
}