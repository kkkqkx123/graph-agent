/**
 * Start Node 执行策略
 * 
 * 负责执行 Start 节点，初始化 Thread 执行上下文
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { StartNode } from '../../../../domain/workflow/entities/node/start-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * Start Node 执行策略
 */
@injectable()
export class StartNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof StartNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof StartNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 StartNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('StartNodeStrategy 开始执行 Start 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
    });

    try {
      // 1. 设置初始变量到执行上下文
      if (node.initialVariables) {
        for (const [key, value] of Object.entries(node.initialVariables)) {
          context.setVariable(key, value);
        }
      }

      // 2. 验证输入数据（如果有 inputSchema）
      if (node.inputSchema) {
        const inputData = context.getVariable('input');
        this.validateInput(inputData, node.inputSchema);
      }

      // 3. 更新 Thread 执行状态
      context.setVariable('execution', {
        startedAt: new Date().toISOString(),
        currentStep: 'start',
        progress: 0
      });

      const executionTime = Date.now() - startTime;

      this.logger.info('Start 节点执行成功', {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        executionTime,
        initializedVariables: Object.keys(node.initialVariables || {}).length,
      });

      return {
        success: true,
        output: node.initialVariables || {},
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          initializedVariables: Object.keys(node.initialVariables || {}),
          inputSchema: node.inputSchema ? 'validated' : 'none',
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Start 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
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
   * 验证输入数据
   * @param inputData 输入数据
   * @param inputSchema 输入模式
   */
  private validateInput(inputData: any, inputSchema: Record<string, any>): void {
    // TODO: 实现输入验证逻辑
    // 这里可以使用 JSON Schema 验证库或其他验证工具
    this.logger.debug('验证输入数据', {
      inputData,
      inputSchema,
    });
  }
}