/**
 * End Node 执行策略
 * 
 * 负责执行 End 节点，标记 Thread 执行完成
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { EndNode } from '../../../../domain/workflow/entities/node/end-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * End Node 执行策略
 */
@injectable()
export class EndNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof EndNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof EndNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 EndNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('EndNodeStrategy 开始执行 End 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
    });

    try {
      // 1. 执行最终动作（如通知、日志等）
      if (node.finalActions && node.finalActions.length > 0) {
        await this.executeFinalActions(node.finalActions, context);
      }

      // 2. 验证输出数据（如果有 outputSchema）
      const outputData = context.getVariable('output');
      if (node.outputSchema) {
        this.validateOutput(outputData, node.outputSchema);
      }

      // 3. 更新 Thread 执行状态为完成
      const execution = context.getVariable('execution') || {};
      context.setVariable('execution', {
        ...execution,
        completedAt: new Date().toISOString(),
        currentStep: 'end',
        progress: 100
      });

      const executionTime = Date.now() - startTime;

      this.logger.info('End 节点执行成功', {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        executionTime,
        finalActionsExecuted: node.finalActions?.length || 0,
      });

      return {
        success: true,
        output: outputData,
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          finalActionsExecuted: node.finalActions?.length || 0,
          outputSchema: node.outputSchema ? 'validated' : 'none',
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('End 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
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
   * 执行最终动作
   * @param finalActions 最终动作列表
   * @param context 执行上下文
   */
  private async executeFinalActions(
    finalActions: Array<{ readonly type: string; readonly config?: Record<string, any> }>,
    context: ExecutionContext
  ): Promise<void> {
    this.logger.debug('执行最终动作', {
      actionCount: finalActions.length,
      threadId: context.threadId,
    });

    for (const action of finalActions) {
      try {
        this.logger.debug('执行最终动作', {
          actionType: action.type,
          config: action.config,
        });

        // TODO: 根据动作类型执行不同的操作
        switch (action.type) {
          case 'log':
            this.logger.info('End 节点最终动作: log', action.config);
            break;
          case 'notify':
            // TODO: 实现通知逻辑
            this.logger.info('End 节点最终动作: notify', action.config);
            break;
          case 'cleanup':
            // TODO: 实现清理逻辑
            this.logger.info('End 节点最终动作: cleanup', action.config);
            break;
          default:
            this.logger.warn('未知的最终动作类型', { actionType: action.type });
        }
      } catch (error) {
        this.logger.error('执行最终动作失败', error instanceof Error ? error : new Error(String(error)), {
          actionType: action.type,
        });
        // 继续执行其他动作，不中断
      }
    }
  }

  /**
   * 验证输出数据
   * @param outputData 输出数据
   * @param outputSchema 输出模式
   */
  private validateOutput(outputData: any, outputSchema: Record<string, any>): void {
    // TODO: 实现输出验证逻辑
    // 这里可以使用 JSON Schema 验证库或其他验证工具
    this.logger.debug('验证输出数据', {
      outputData,
      outputSchema,
    });
  }
}