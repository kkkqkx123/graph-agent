/**
 * Tool Node 执行策略
 * 
 * 负责执行工具节点
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { ToolNode } from '../../../../domain/workflow/entities/node/tool-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { InteractionEngine } from '../../../interaction/interaction-engine';
import { IInteractionContext } from '../../../interaction/interaction-context';
import { ToolConfig } from '../../../../domain/interaction/value-objects/tool-config';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * Tool Node 执行策略
 */
@injectable()
export class ToolNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('InteractionEngine') private readonly interactionEngine: InteractionEngine
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof ToolNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof ToolNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 ToolNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('ToolNodeStrategy 开始执行工具节点', {
      nodeId: node.nodeId.toString(),
      toolId: node.toolId,
    });

    try {
      // 构建工具配置
      const config = new ToolConfig({
        toolId: node.toolId,
        parameters: node.parameters,
        timeout: node.timeout,
      });

      // 获取工具调用历史
      const toolCalls = context.getVariable('toolCalls') || [];

      // 调用 InteractionEngine 执行工具
      const result = await this.interactionEngine.executeTool(config, toolCalls);

      const executionTime = Date.now() - startTime;

      if (result.success) {
        // 更新执行上下文
        if (result.output !== undefined) {
          context.setVariable('output', result.output);
        }

        return {
          success: true,
          output: result.output,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            toolId: node.toolId,
          },
        };
      } else {
        return {
          success: false,
          error: result.error,
          executionTime,
          metadata: {
            nodeId: node.nodeId.toString(),
            toolId: node.toolId,
          },
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('工具节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        toolId: node.toolId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          toolId: node.toolId,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }
}