/**
 * LoopEnd Node 执行策略
 * 
 * 负责执行 LoopEnd 节点，判断循环条件并决定是否继续循环
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { LoopEndNode } from '../../../../domain/workflow/entities/node/loop-end-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { FunctionRegistry } from '../../../workflow/functions/function-registry';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * LoopEnd Node 执行策略
 */
@injectable()
export class LoopEndNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('FunctionRegistry') private readonly functionRegistry: FunctionRegistry
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof LoopEndNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof LoopEndNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 LoopEndNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('LoopEndNodeStrategy 开始执行 LoopEnd 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
      loopStartNodeId: node.loopStartNodeId,
      breakConditionFunctionId: node.breakConditionFunctionId,
    });

    try {
      // 1. 获取循环状态
      const loopState = context.getVariable('loopState');
      
      if (!loopState) {
        this.logger.warn('循环状态不存在，可能缺少 LoopStart 节点', {
          nodeId: node.nodeId.toString(),
          threadId: context.threadId,
        });

        return {
          success: false,
          error: '循环状态不存在，可能缺少 LoopStart 节点',
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: node.nodeId.toString(),
          },
        };
      }

      // 2. 评估中断条件
      const shouldBreak = await this.evaluateBreakCondition(
        node.breakConditionFunctionId,
        node.breakConditionConfig,
        context,
        loopState
      );

      // 3. 检查是否应该中断循环
      const shouldContinueLoop = this.shouldContinueLoop(loopState, shouldBreak);

      if (shouldContinueLoop) {
        // 4. 继续循环：重置执行位置到 LoopStart
        const loopStartNodeId = node.loopStartNodeId;
        
        this.logger.debug('继续循环，重置执行位置', {
          loopStartNodeId,
          iteration: loopState.iteration,
        });

        // 注意：这里需要通过 ThreadStateManager 来重置执行位置
        // 由于我们无法直接访问 ThreadStateManager，这里通过设置特殊变量来通知执行引擎
        context.setVariable('loop_jump_to', loopStartNodeId);
        context.setVariable('loop_status', 'continuing');

        const executionTime = Date.now() - startTime;

        this.logger.info('LoopEnd 节点执行成功，继续循环', {
          nodeId: node.nodeId.toString(),
          threadId: context.threadId,
          executionTime,
          iteration: loopState.iteration,
          nextNodeId: loopStartNodeId,
        });

        return {
          success: true,
          output: {
            loopStatus: 'continuing',
            iteration: loopState.iteration,
            nextNodeId: loopStartNodeId,
          },
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            iteration: loopState.iteration,
            shouldContinue: true,
          },
        };
      } else {
        // 5. 结束循环：清理循环状态
        this.logger.debug('结束循环，清理循环状态', {
          iteration: loopState.iteration,
          totalIterations: loopState.iteration,
        });

        context.deleteVariable('loopState');
        context.deleteVariable('currentIteration');
        context.deleteVariable('shouldContinueLoop');
        context.deleteVariable('loop_jump_to');
        context.setVariable('loop_status', 'completed');

        const executionTime = Date.now() - startTime;

        this.logger.info('LoopEnd 节点执行成功，循环结束', {
          nodeId: node.nodeId.toString(),
          threadId: context.threadId,
          executionTime,
          totalIterations: loopState.iteration,
        });

        return {
          success: true,
          output: {
            loopStatus: 'completed',
            totalIterations: loopState.iteration,
          },
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            totalIterations: loopState.iteration,
            shouldContinue: false,
          },
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('LoopEnd 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
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
   * 评估中断条件
   * @param breakConditionFunctionId 中断条件函数ID
   * @param breakConditionConfig 中断条件配置
   * @param context 执行上下文
   * @param loopState 循环状态
   * @returns 是否中断循环
   */
  private async evaluateBreakCondition(
    breakConditionFunctionId: string | undefined,
    breakConditionConfig: Record<string, any> | undefined,
    context: ExecutionContext,
    loopState: any
  ): Promise<boolean> {
    // 如果没有中断条件函数，默认不中断
    if (!breakConditionFunctionId) {
      return false;
    }

    try {
      // 获取中断条件函数
      const breakFunction = this.functionRegistry.getFunction(breakConditionFunctionId);
      
      if (!breakFunction) {
        this.logger.warn('中断条件函数不存在，默认不中断', {
          breakConditionFunctionId,
        });
        return false;
      }

      // 执行中断条件函数
      this.logger.debug('评估中断条件', {
        breakConditionFunctionId,
        iteration: loopState.iteration,
      });

      const breakResult = await breakFunction.execute(context, breakConditionConfig || {});

      // 解析中断条件结果
      const shouldBreak = this.parseConditionResult(breakResult);

      this.logger.debug('中断条件评估结果', {
        breakConditionFunctionId,
        iteration: loopState.iteration,
        shouldBreak,
      });

      return shouldBreak;
    } catch (error) {
      this.logger.error('评估中断条件失败', error instanceof Error ? error : new Error(String(error)), {
        breakConditionFunctionId,
      });
      // 条件评估失败，默认不中断
      return false;
    }
  }

  /**
   * 判断是否应该继续循环
   * @param loopState 循环状态
   * @param shouldBreak 是否应该中断
   * @returns 是否继续循环
   */
  private shouldContinueLoop(loopState: any, shouldBreak: boolean): boolean {
    // 1. 检查是否应该中断
    if (shouldBreak) {
      this.logger.debug('中断条件满足，结束循环', {
        iteration: loopState.iteration,
      });
      return false;
    }

    // 2. 检查最大迭代次数
    if (loopState.iteration >= loopState.maxIterations) {
      this.logger.debug('达到最大迭代次数，结束循环', {
        iteration: loopState.iteration,
        maxIterations: loopState.maxIterations,
      });
      return false;
    }

    // 3. 检查循环条件（如果有）
    // 注意：这里无法访问 context，因为它是 shouldContinueLoop 方法的参数
    // 需要将 context 作为参数传入
    return true;

    // 4. 默认继续循环
    return true;
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
      if (typeof result.shouldBreak === 'boolean') {
        return result.shouldBreak;
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

    // 默认返回 false（不中断）
    this.logger.warn('无法解析中断条件结果，默认不中断', { result });
    return false;
  }
}